import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { IconArrowRight, IconBulb, IconClose, IconFirst, IconFlip, IconLast, IconNext, IconPause, IconPlay, IconPrev, IconRetry, IconStar } from './icons'
import { CLASSES, COUNT_ORDER, fmtEval, parsePgnText, reviewGame, winPct } from './reviewCore'
import { getEngine, getOpeningBook } from './engine'
import { useWidth } from '../insights/Visuals'

const DEPTHS = [[12, 'Fast'], [16, 'Standard'], [20, 'Deep']]
const VERDICT = {
  brilliant: 'is brilliant', great: 'is a great move', best: 'is best', excellent: 'is excellent', good: 'is good',
  book: 'is a book move', forced: 'is forced', inaccuracy: 'is an inaccuracy', mistake: 'is a mistake', miss: 'is a miss', blunder: 'is a blunder',
}
const NOTABLE = new Set(['brilliant', 'great', 'best', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder', 'forced'])
const GRAPH_DOTS = new Set(['brilliant', 'great', 'mistake', 'miss', 'blunder'])
const cache = new Map() // pgn+depth -> result, kept while the page is open

export function ClassIcon({ cls, size = 18 }) {
  const c = CLASSES[cls]
  if (!c) return null
  return (
    <span className="cls-icon" style={{ background: c.color, width: size, height: size, fontSize: size * 0.55 }} title={c.label} aria-label={c.label}>
      {c.icon}
    </span>
  )
}

function phaseClass(acc) {
  if (acc == null) return null
  if (acc >= 90) return 'best'
  if (acc >= 80) return 'excellent'
  if (acc >= 70) return 'good'
  if (acc >= 60) return 'inaccuracy'
  if (acc >= 45) return 'mistake'
  return 'blunder'
}

/* ------------------------------------------------------------------ input screen */
function PgnInput({ onLoad, rows, onPickRow }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const fileRef = useRef(null)

  const load = (t) => {
    const games = parsePgnText(t)
    if (!games.length) { setError('No valid game found. Paste a full PGN (moves like "1. e4 e5 2. Nf3 ...").'); return }
    setError('')
    onLoad(games)
  }
  const readFile = async (file) => {
    if (!file) return
    const t = await file.text()
    setText(t)
    load(t)
  }
  return (
    <div className="review-input">
      <section className="card">
        <h3>Review a game</h3>
        <p className="muted small">Paste a PGN, upload a .pgn file, or pick one of your games. Analysis runs on your device with Stockfish 17.1 - nothing is uploaded anywhere.</p>
        <div
          className={`drop ${drag ? 'over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); readFile(e.dataTransfer.files[0]) }}
        >
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={'[Event "Live Chess"]\n...\n1. e4 e5 2. Nf3 Nc6 3. Bc4 ...'} rows={8} spellCheck={false} aria-label="PGN text" />
          <div className="drop-actions">
            <button onClick={() => load(text)} disabled={!text.trim()}>Analyse game</button>
            <button className="secondary" onClick={() => fileRef.current?.click()}>Upload .pgn file</button>
            <input ref={fileRef} type="file" accept=".pgn,.txt,application/x-chess-pgn,text/plain" hidden onChange={(e) => readFile(e.target.files[0])} />
            <span className="muted small hide-sm">or drop a file here</span>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </section>
      {rows?.length > 0 && (
        <section className="card">
          <h3>Or pick one of your recent games</h3>
          <ul className="pick-list">
            {rows.slice(0, 30).map((r) => (
              <li key={r.url}>
                <button className="pick" onClick={() => onPickRow(r)}>
                  <span className={`pill ${r.outcome}`}>{r.outcome}</span>
                  <span className="pick-opp"><i className={`piece ${r.color}`} /> vs {r.opponent} <span className="muted">({r.oppRating})</span></span>
                  <span className="muted small pick-meta">{r.end.toLocaleDateString()} · {r.timeClass}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ eval graph */
function EvalGraph({ result, ply, onSeek }) {
  const [wrap, W] = useWidth(400)
  const H = 74
  const n = result.evals.length
  const pts = result.evals.map((e, i) => {
    const top = e.lines[0]
    const w = winPct(top.mate != null ? { mate: top.mate } : { cp: top.cp })
    return [(i / Math.max(1, n - 1)) * W, H - (w / 100) * H]
  })
  const area = `M0,${H} ` + pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ` L${W},${H} Z`
  const seek = (e) => {
    const box = e.currentTarget.getBoundingClientRect()
    onSeek(Math.round(((e.clientX - box.left) / box.width) * (n - 1)))
  }
  return (
    <div className="eval-graph" ref={wrap}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} onClick={seek} role="img" aria-label="Evaluation over the game; click to jump">
        <rect width={W} height={H} className="eg-bg" />
        <path d={area} className="eg-white" />
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="eg-mid" />
        {result.moves.map((m) => GRAPH_DOTS.has(m.cls) && (
          <circle key={m.ply} cx={pts[m.ply][0]} cy={pts[m.ply][1]} r="3.5" fill={CLASSES[m.cls].color} stroke="#111" strokeWidth="1" />
        ))}
        <line x1={pts[ply][0]} x2={pts[ply][0]} y1="0" y2={H} className="eg-cursor" />
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ board + eval bar */
function BoardArea({ result, ply, flipped, setFlipped, showBest, players, retry }) {
  const [wrap, W] = useWidth(480)
  const barW = W < 420 ? 14 : 22
  // fit the width, and on wide screens also the window height (room for player bars + controls)
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 900)
  useEffect(() => { const on = () => setVh(window.innerHeight); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [])
  const size = Math.max(240, Math.min(W - barW - 6, 640, W > 640 ? vh - 150 : Infinity))
  const fen = retry ? retry.fen : ply === 0 ? result.fens[0] : result.moves[ply - 1].fenAfter
  const mv = !retry && ply > 0 ? result.moves[ply - 1] : null
  const next = result.moves[ply] // the move about to be played, for "best move" arrow before it
  const top = result.evals[retry ? retry.ply - 1 : ply].lines[0]
  const score = top.mate != null ? { mate: top.mate, mated: top.mated } : { cp: top.cp }
  const whiteShare = winPct(score)
  const orientation = flipped ? 'black' : 'white'

  const squareStyles = { ...(retry?.squareStyles || {}) }
  if (mv) {
    const c = CLASSES[mv.cls].color
    squareStyles[mv.from] = { background: `${c}66` }
    squareStyles[mv.to] = { background: `${c}99` }
  }
  const arrows = [...(retry?.arrows || [])]
  if (!retry && showBest && mv && mv.bestUci && mv.bestUci !== mv.uci && !['book', 'forced'].includes(mv.cls)) {
    arrows.push([mv.bestUci.slice(0, 2), mv.bestUci.slice(2, 4), 'rgba(80,160,60,0.85)'])
  } else if (showBest && ply === 0 && next?.bestUci) {
    arrows.push([next.bestUci.slice(0, 2), next.bestUci.slice(2, 4), 'rgba(80,160,60,0.85)'])
  }
  // badge position on the destination square
  let badge = null
  const badgeSq = retry ? retry.badgeSquare : mv?.to
  const badgeCls = retry ? retry.badgeCls : mv?.cls
  if (badgeSq && badgeCls) {
    const f = badgeSq.charCodeAt(0) - 97, r = +badgeSq[1] - 1
    const col = flipped ? 7 - f : f, row = flipped ? r : 7 - r
    const sq = size / 8
    badge = { left: (col + 1) * sq - sq * 0.28, top: row * sq - sq * 0.12, size: Math.max(16, sq * 0.38) }
  }
  const evalLabel = fmtEval(score).replace('+', '')
  const topPlayer = flipped ? players.w : players.b
  const bottomPlayer = flipped ? players.b : players.w
  return (
    <div className="board-area" ref={wrap}>
      <PlayerBar p={topPlayer} extra={
        <button className="icon-btn" onClick={() => setFlipped(!flipped)} title="Flip board" aria-label="Flip board"><IconFlip /></button>
      } />
      <div className="board-row">
        <div className="eval-bar" style={{ width: barW, height: size }} aria-label={`Evaluation ${evalLabel}`}>
          <div className="eval-white" style={{ height: `${whiteShare}%`, [flipped ? 'top' : 'bottom']: 0 }} />
          <span className={`eval-num ${whiteShare >= 50 !== flipped ? 'bottom' : 'top'}`}>{evalLabel}</span>
        </div>
        <div className="board-wrap" style={{ width: size, height: size }}>
          <Chessboard
            id="review-board"
            position={fen}
            boardWidth={size}
            boardOrientation={orientation}
            arePiecesDraggable={!!retry?.draggable}
            isDraggablePiece={({ piece }) => !!retry?.draggable && piece[0] === retry.color}
            onPieceDrop={(from, to, piece) => (retry?.onDrop ? retry.onDrop(from, to, piece) : false)}
            autoPromoteToQueen
            customArrows={arrows}
            customSquareStyles={squareStyles}
            customDarkSquareStyle={{ backgroundColor: 'var(--rb-dark)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--rb-light)' }}
            animationDuration={180}
          />
          {badge && (
            <span className="board-badge" style={{ left: badge.left, top: badge.top }}>
              <ClassIcon cls={badgeCls} size={badge.size} />
            </span>
          )}
        </div>
      </div>
      <PlayerBar p={bottomPlayer} />
    </div>
  )
}

function PlayerBar({ p, extra }) {
  return (
    <div className="player-bar">
      <i className={`piece ${p.color}`} />
      <strong>{p.name}</strong>
      {p.rating && <span className="muted">({p.rating})</span>}
      {p.you && <span className="you-tag">you</span>}
      {extra && <span className="player-extra">{extra}</span>}
    </div>
  )
}

/* ------------------------------------------------------------------ side panel */
function Summary({ result, players, onStart, onSeek, retryCount, onRetryAll }) {
  const { w, b, keyMoments } = result.summary
  const res = players.result
  return (
    <div className="rv-summary">
      {result.openingName && <p className="rv-opening"><span className="cls-icon" style={{ background: CLASSES.book.color }}>B</span>{result.openingName}</p>}
      <div className="acc-row">
        {[['w', w], ['b', b]].map(([c, s]) => (
          <div key={c} className="acc-card">
            <span className="muted small">{players[c].name}</span>
            <strong>{s.accuracy != null ? s.accuracy.toFixed(1) : '-'}</strong>
            <span className="muted small">accuracy</span>
          </div>
        ))}
      </div>
      {res && <p className="muted small center">Result: {res}</p>}
      <button className="big-green" onClick={onStart}><IconStar size={24} /> Start Review</button>
      {retryCount > 0 && (
        <button className="secondary retry-all" onClick={onRetryAll}><IconRetry /> Retry your mistakes ({retryCount})</button>
      )}
      <table className="count-table">
        <thead><tr><th /><th className="num">{players.w.name}</th><th /><th className="num">{players.b.name}</th></tr></thead>
        <tbody>
          {COUNT_ORDER.map((k) => (
            <tr key={k}>
              <td>{CLASSES[k].label}</td>
              <td className="num" style={{ color: CLASSES[k].color }}>{w.counts[k]}</td>
              <td className="center"><ClassIcon cls={k} size={20} /></td>
              <td className="num" style={{ color: CLASSES[k].color }}>{b.counts[k]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>Game phases</h4>
      <table className="count-table">
        <tbody>
          {['opening', 'middlegame', 'endgame'].map((p) => (
            <tr key={p}>
              <td>{p[0].toUpperCase() + p.slice(1)}</td>
              {[w, b].map((s, i) => (
                <td key={i} className="center">
                  {s.phases[p] != null ? <span className="phase-cell"><ClassIcon cls={phaseClass(s.phases[p])} size={20} /><span className="muted small">{s.phases[p].toFixed(0)}</span></span> : <span className="muted">-</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {keyMoments.length > 0 && (
        <>
          <h4>Key moments</h4>
          <ul className="key-moments">
            {keyMoments.slice(0, 12).map((m) => (
              <li key={m.ply}>
                <button className="km" onClick={() => onSeek(m.ply)}>
                  <ClassIcon cls={m.cls} size={18} />
                  <span>{Math.ceil(m.ply / 2)}{m.color === 'w' ? '.' : '...'} {m.san}</span>
                  <span className="muted small">{CLASSES[m.cls].label}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted small">Accuracy and labels are this app's own approximation of Chess.com's system (their exact formula isn't public), so expect differences of a few points.</p>
    </div>
  )
}

function Coach({ mv, showBest, setShowBest, onNext, onRetry }) {
  return (
    <div className="coach">
      <div className="coach-avatar" aria-hidden="true">♞</div>
      <div className="coach-bubble">
        <div className="coach-head">
          <ClassIcon cls={mv.cls} size={20} />
          <strong>{mv.san} {VERDICT[mv.cls]}</strong>
          <span className={`eval-chip ${mv.evalAfter.mate != null || mv.evalAfter.cp >= 0 ? 'pos' : 'neg'}`}>{fmtEval(mv.evalAfter)}</span>
        </div>
        <p>{mv.text}</p>
        {mv.bestLine.length > 0 && !['book', 'forced'].includes(mv.cls) && (
          <p className="muted small engine-line">Engine line: {mv.bestLine.slice(0, 6).join(' ')}</p>
        )}
      </div>
      <div className={`coach-actions ${onRetry ? 'three' : ''}`}>
        {!['best', 'book', 'forced', 'brilliant', 'great'].includes(mv.cls) && (
          <button className={`secondary ${showBest ? 'on' : ''}`} onClick={() => setShowBest(!showBest)} title="Show the engine's best move">
            <IconStar size={18} /> {showBest ? 'Hide best' : 'Best'}
          </button>
        )}
        {onRetry && <button className="secondary" onClick={onRetry} title="Try to find a better move"><IconRetry /> Retry</button>}
        <button className="next-btn" onClick={onNext}>Next <IconArrowRight /></button>
      </div>
    </div>
  )
}

function MoveList({ result, ply, onSeek }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current?.querySelector('.mv.on')
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [ply])
  const rows = []
  for (let i = 0; i < result.moves.length; i += 2) rows.push([result.moves[i], result.moves[i + 1]])
  const cell = (m) => m && (
    <button className={`mv ${m.ply === ply ? 'on' : ''} cls-${m.cls}`} onClick={() => onSeek(m.ply)}>
      {NOTABLE.has(m.cls) && <ClassIcon cls={m.cls} size={16} />}
      <span>{m.san}</span>
    </button>
  )
  return (
    <div className="move-list" ref={ref}>
      {rows.map(([a, b], i) => (
        <div className="mv-row" key={i}>
          <span className="mv-no">{i + 1}.</span>
          {cell(a)}
          {cell(b) || <span />}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ retry panel */
function RetryPanel({ retry, mv, onHint, onSolution, onNextRetry, onExit, remaining }) {
  const color = mv.color === 'w' ? 'White' : 'Black'
  let head, body
  if (retry.status === 'thinking') { head = `Find a better move for ${color}`; body = `You played ${mv.san} here (${CLASSES[mv.cls].label.toLowerCase()}). Drag a piece to try again.` }
  if (retry.status === 'checking') { head = 'Checking...'; body = 'The engine is looking at your move.' }
  if (retry.status === 'wrong') { head = `${retry.san} isn't it`; body = retry.message || 'Try another move.' }
  if (retry.status === 'correct') { head = `${retry.san} is ${retry.exact ? 'the best move!' : 'also good!'}`; body = retry.exact ? 'Well found.' : `That works too. The engine's top move was ${mv.bestSan}.` }
  if (retry.status === 'revealed') { head = `The best move was ${mv.bestSan}`; body = mv.bestLine.length ? `Engine line: ${mv.bestLine.slice(0, 6).join(' ')}` : '' }
  const done = retry.status === 'correct' || retry.status === 'revealed'
  return (
    <div className="retry-panel">
      <div className="retry-head">
        <span className="retry-badge"><IconRetry /> Retry</span>
        <button className="icon-btn" onClick={onExit} aria-label="Exit retry" title="Exit retry"><IconClose /></button>
      </div>
      <div className={`coach-bubble retry-${retry.status}`}>
        <div className="coach-head">
          {retry.status === 'correct' && <ClassIcon cls={retry.exact ? 'best' : 'excellent'} size={20} />}
          {retry.status === 'wrong' && <ClassIcon cls="mistake" size={20} />}
          <strong>{head}</strong>
        </div>
        {body && <p>{body}</p>}
      </div>
      <div className="coach-actions three">
        {!done && <button className="secondary" onClick={onHint}><IconBulb /> Hint</button>}
        {!done && <button className="secondary" onClick={onSolution}><IconStar size={18} /> Solution</button>}
        <button className="next-btn" onClick={onNextRetry}>{remaining > 0 ? <>Next mistake <IconArrowRight /></> : done ? 'Done' : <>Skip <IconArrowRight /></>}</button>
      </div>
      {remaining > 0 && <p className="muted small center">{remaining} more to retry</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ main view */
export default function ReviewView({ initialPgn, username, rows }) {
  const [games, setGames] = useState(null)
  const [gameIdx, setGameIdx] = useState(0)
  const [depth, setDepth] = useState(16)
  const [status, setStatus] = useState('input') // input | analysing | done | error
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [ply, setPly] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [showBest, setShowBest] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [retry, setRetry] = useState(null) // { ply, queue, fen, status, ... }
  const abortRef = useRef(null)

  const game = games?.[gameIdx]
  const players = useMemo(() => {
    if (!game) return null
    const h = game.headers
    const me = username?.toLowerCase()
    return {
      w: { name: h.White || 'White', rating: h.WhiteElo, color: 'white', you: me && h.White?.toLowerCase() === me },
      b: { name: h.Black || 'Black', rating: h.BlackElo, color: 'black', you: me && h.Black?.toLowerCase() === me },
      result: h.Result && h.Result !== '*' ? `${h.Result}${h.Termination ? ` - ${h.Termination}` : ''}` : '',
    }
  }, [game, username])

  const analyse = useCallback(async (g, d) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const key = `${d}|${g.pgn}`
    setPly(0); setShowBest(false); setPlaying(false)
    if (cache.has(key)) { setResult(cache.get(key)); setStatus('done'); return }
    setStatus('analysing'); setProgress({ done: 0, total: g.moves.length + 1 }); setResult(null); setError('')
    try {
      const [engine, openings] = await Promise.all([getEngine(), getOpeningBook()])
      engine.newGame()
      const res = await reviewGame(g, (fen, dd) => engine.evaluate(fen, dd), { depth: d, onProgress: setProgress, signal: ctrl.signal, openings })
      cache.set(key, res)
      setResult(res)
      setStatus('done')
    } catch (e) {
      if (e.name === 'AbortError') return
      setError(e.message || String(e)); setStatus('error')
    }
  }, [])

  const loadGames = useCallback((gs) => {
    setGames(gs); setGameIdx(0)
    const me = username?.toLowerCase()
    setFlipped(!!me && gs[0].headers.Black?.toLowerCase() === me)
    analyse(gs[0], depth)
  }, [analyse, depth, username])

  // opened from a "Review" button elsewhere on the site
  useEffect(() => {
    if (!initialPgn) return
    const gs = parsePgnText(initialPgn)
    if (gs.length) loadGames(gs)
  }, [initialPgn]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => abortRef.current?.abort(), [])

  const last = result ? result.moves.length : 0
  const seek = useCallback((p) => { setRetry(null); setPly(Math.max(0, Math.min(last, p))) }, [last])

  // ---- Retry mode: replay the position before a weak move and let the user find a better one
  const youColor = players?.w.you ? 'w' : players?.b.you ? 'b' : null
  const retryList = useMemo(() => (result ? result.moves.filter((m) => ['mistake', 'miss', 'blunder'].includes(m.cls) && m.bestUci && (!youColor || m.color === youColor)).map((m) => m.ply) : []), [result, youColor]) // eslint-disable-line react-hooks/exhaustive-deps

  const startRetry = useCallback((p, queue = []) => {
    const m = result.moves[p - 1]
    setPlaying(false); setShowBest(false)
    setPly(p)
    setFlipped(m.color === 'b')
    setRetry({ ply: p, queue, fen: m.fenBefore, status: 'thinking', color: m.color })
  }, [result])

  const retryMove = result && retry ? result.moves[retry.ply - 1] : null
  const onRetryDrop = useCallback((from, to) => {
    if (!retry || !retryMove || retry.status === 'checking' || retry.status === 'correct' || retry.status === 'revealed') return false
    const c = new Chess(retryMove.fenBefore)
    let mv
    try { mv = c.move({ from, to, promotion: 'q' }) } catch { return false }
    const uci = mv.from + mv.to + (mv.promotion || '')
    const fenAfter = c.fen()
    const mark = (status, extra) => setRetry((r) => r && ({ ...r, ...extra, status, san: mv.san, fen: fenAfter, badgeSquare: mv.to,
      squareStyles: { [mv.from]: { background: '#ffffff33' }, [mv.to]: { background: status === 'correct' ? '#7fae3c88' : status === 'wrong' ? '#d63a3a77' : '#ffffff44' } } }))
    if (uci === retryMove.bestUci) { mark('correct', { exact: true, badgeCls: 'best' }); return true }
    if (uci === retryMove.uci) {
      mark('wrong', { badgeCls: retryMove.cls, message: 'That is the move you played in the game. Look for something stronger.' })
      setTimeout(() => setRetry((r) => r && r.status === 'wrong' ? { ...r, status: 'thinking', fen: retryMove.fenBefore, squareStyles: {}, badgeSquare: null } : r), 1400)
      return true
    }
    mark('checking', { badgeCls: null })
    ;(async () => {
      const engine = await getEngine()
      const ev = await engine.evaluate(fenAfter, 14)
      const top = ev.lines[0] || { cp: 0 }
      // engine score is for the opponent (side to move) - flip to the mover
      const forMover = top.mate != null ? { mate: -top.mate } : { cp: -top.cp }
      const loss = Math.max(0, retryMove.wBest - winPct(forMover)) / 100
      if (loss <= 0.02) mark('correct', { exact: false, badgeCls: 'excellent' })
      else {
        mark('wrong', { badgeCls: loss > 0.2 ? 'blunder' : loss > 0.1 ? 'mistake' : 'inaccuracy', message: `That ${loss > 0.1 ? 'loses too much' : "isn't quite best"} (${fmtEval(top.mate != null ? { mate: retryMove.color === 'w' ? -top.mate : top.mate } : { cp: retryMove.color === 'w' ? -top.cp : top.cp })}). Try again.` })
        setTimeout(() => setRetry((r) => r && r.status === 'wrong' ? { ...r, status: 'thinking', fen: retryMove.fenBefore, squareStyles: {}, badgeSquare: null } : r), 1600)
      }
    })()
    return true
  }, [retry, retryMove])

  const retryHint = () => retryMove && setRetry((r) => ({ ...r, squareStyles: { [retryMove.bestUci.slice(0, 2)]: { background: '#e3b23caa', boxShadow: 'inset 0 0 0 3px #e3b23c' } } }))
  const retrySolution = () => retryMove && setRetry((r) => ({ ...r, status: 'revealed', fen: retryMove.fenBefore, badgeSquare: null,
    arrows: [[retryMove.bestUci.slice(0, 2), retryMove.bestUci.slice(2, 4), 'rgba(80,160,60,0.9)']], squareStyles: {} }))
  const retryNext = () => {
    if (!retry) return
    const [nextPly, ...rest] = retry.queue
    if (nextPly) startRetry(nextPly, rest)
    else { setRetry(null); setFlipped(youColor === 'b') }
  }

  // keyboard: left/right arrows, Home/End
  useEffect(() => {
    if (status !== 'done' || retry) return
    const onKey = (e) => {
      if (/input|textarea/i.test(e.target.tagName)) return
      if (e.key === 'ArrowRight') { seek(ply + 1); e.preventDefault() }
      if (e.key === 'ArrowLeft') { seek(ply - 1); e.preventDefault() }
      if (e.key === 'Home') seek(0)
      if (e.key === 'End') seek(last)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [status, ply, last, seek, retry])

  useEffect(() => {
    if (!playing) return
    if (ply >= last) { setPlaying(false); return }
    const t = setTimeout(() => setPly((p) => p + 1), 900)
    return () => clearTimeout(t)
  }, [playing, ply, last])

  if (!games || status === 'input') {
    return <PgnInput onLoad={loadGames} rows={rows} onPickRow={(r) => loadGames(parsePgnText(r.pgn))} />
  }

  const mv = ply > 0 ? result?.moves[ply - 1] : null
  return (
    <div className="review">
      <div className="review-top">
        <button className="secondary" onClick={() => { abortRef.current?.abort(); setGames(null); setStatus('input'); setResult(null) }}>← Another game</button>
        {games.length > 1 && (
          <select value={gameIdx} onChange={(e) => { const i = +e.target.value; setGameIdx(i); analyse(games[i], depth) }} aria-label="Game in this PGN">
            {games.map((g, i) => <option key={i} value={i}>{i + 1}. {g.headers.White} vs {g.headers.Black}</option>)}
          </select>
        )}
        <div className="tabs chips small-chips" role="tablist" aria-label="Analysis depth">
          {DEPTHS.map(([d, label]) => (
            <button key={d} role="tab" aria-selected={depth === d} className={depth === d ? 'tab active' : 'tab'}
              onClick={() => { setDepth(d); analyse(game, d) }} title={`Engine depth ${d}`}>{label}</button>
          ))}
        </div>
      </div>

      {status === 'analysing' && (
        <section className="card">
          <p>Analysing with Stockfish 17.1 (depth {depth}) - position {progress?.done ?? 0} of {progress?.total ?? '?'}</p>
          <div className="progress"><span style={{ width: progress ? `${(100 * progress.done) / progress.total}%` : '2%' }} /></div>
          <p className="muted small">Runs entirely in your browser. A 40-move game takes roughly 15-60 seconds depending on depth and your device.</p>
        </section>
      )}
      {status === 'error' && <section className="card"><p className="error">Analysis failed: {error}</p></section>}

      {status === 'done' && result && (
        <div className="review-layout">
          <div className="review-left">
            <BoardArea result={result} ply={ply} flipped={flipped} setFlipped={setFlipped} showBest={showBest} players={players}
              retry={retry && { ...retry, draggable: retry.status === 'thinking', onDrop: onRetryDrop }} />
            <div className="review-controls" role="toolbar" aria-label="Move navigation">
              <button className="nav-btn" onClick={() => seek(0)} disabled={!retry && ply === 0} title="Start of game (Home)" aria-label="Start of game"><IconFirst /></button>
              <button className="nav-btn" onClick={() => seek(ply - 1)} disabled={!retry && ply === 0} title="Previous move (←)" aria-label="Previous move"><IconPrev /></button>
              <button className="nav-btn play" onClick={() => { setRetry(null); setPlaying(!playing) }} title={playing ? 'Pause' : 'Play through the game'} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <IconPause /> : <IconPlay />}</button>
              <button className="nav-btn" onClick={() => seek(ply + 1)} disabled={!retry && ply === last} title="Next move (→)" aria-label="Next move"><IconNext /></button>
              <button className="nav-btn" onClick={() => seek(last)} disabled={!retry && ply === last} title="End of game (End)" aria-label="End of game"><IconLast /></button>
            </div>
          </div>
          <div className="review-right card">
            <h3 className="rv-title">Game Review</h3>
            {retry && retryMove ? (
              <RetryPanel retry={retry} mv={retryMove} remaining={retry.queue.length}
                onHint={retryHint} onSolution={retrySolution} onNextRetry={retryNext}
                onExit={() => { setRetry(null) }} />
            ) : ply === 0 || !mv ? (
              <Summary result={result} players={players} onStart={() => seek(1)} onSeek={seek}
                retryCount={retryList.length} onRetryAll={() => startRetry(retryList[0], retryList.slice(1))} />
            ) : (
              <>
                <Coach mv={mv} showBest={showBest} setShowBest={setShowBest} onNext={() => seek(ply + 1)}
                  onRetry={['inaccuracy', 'mistake', 'miss', 'blunder'].includes(mv.cls) && mv.bestUci ? () => startRetry(mv.ply) : null} />
                <MoveList result={result} ply={ply} onSeek={seek} />
                <button className="link-btn" onClick={() => seek(0)}>← Back to summary</button>
              </>
            )}
            <EvalGraph result={result} ply={ply} onSeek={seek} />
          </div>
        </div>
      )}
    </div>
  )
}
