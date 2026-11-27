import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCustomPieces } from '../BoardPicker'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { IconArrowRight, IconBulb, IconClose, IconFirst, IconFlip, IconLast, IconNext, IconPause, IconPlay, IconPrev, IconRetry, IconSpeaker, IconMute, IconStar } from './icons'
import { ACCENTS, STYLES, accentOf, coachScript, englishVoices, genderOf, loadVoiceSettings, onVoicesChanged, saveVoiceSettings, speak, stopSpeaking, voiceLabel, voiceSupported } from './voice'
import { CLASSES, COUNT_ORDER, fmtEval, parsePgnText, reviewGame, winPct } from './reviewCore'
import { getEngine, getOpeningBook } from './engine'
import { useWidth } from '../insights/Visuals'
import { playerReport } from './coachReport'
import { moveMotifs } from './motifs'
import { THEMES, buildPuzzles, gameMeta } from '../puzzles/puzzleBuilder'
import { StorageWarning } from '../puzzles/PuzzlesView'

/* ------------------------------------------------------------------ per-player game report */
function GameReport({ result, players, headers, pgn, onSeek, puzzles, onOpenPuzzles }) {
  const [side, setSide] = useState(players.b.you ? 'b' : 'w')
  const p = players[side]
  const actual = parseInt(p.rating, 10)
  const report = useMemo(() => playerReport(result, side, { headers, rating: actual > 0 ? actual : 0 }), [result, side, headers, actual])
  const est = report.estimate
  return (
    <div className="game-report">
      <h4>Game report</h4>
      <div className="tabs chips small-chips report-tabs" role="tablist" aria-label="Player">
        {['w', 'b'].map((c) => (
          <button key={c} role="tab" aria-selected={side === c} className={side === c ? 'tab active' : 'tab'} onClick={() => setSide(c)}>
            <i className={`piece ${c === 'w' ? 'white' : 'black'}`} /> {players[c].name}{players[c].you ? ' (you)' : ''}
          </button>
        ))}
      </div>

      {est && (
        <div className="est-card">
          <div>
            <span className="muted small">This game's performance</span>
            <strong>~{est.rating}</strong>
            <span className="muted small">likely {est.low}-{est.high}</span>
          </div>
          {est.known ? (
            <div>
              <span className="muted small">Actual rating</span>
              <strong>{actual}</strong>
              <span className={`small ${est.diff >= 50 ? 'up' : est.diff <= -50 ? 'down' : 'muted'}`}>
                {est.diff >= 50 ? `played above their usual level (+${est.diff})` : est.diff <= -50 ? `played below their usual level (${est.diff})` : 'played at their usual level'}
              </span>
            </div>
          ) : <div><span className="muted small">Actual rating</span><strong>?</strong><span className="muted small">not in this PGN - range is wide</span></div>}
          <p className="muted small est-note">Starts from the player's real rating and moves it only as far as this game's evidence justifies (blunder rate, lost winning chances, best moves). Tested on 668 rated games from 400 to 3400: one game alone can't tell 1200 from 1600 - accuracy-only estimates overrated low-rated players by 500+ points.</p>
        </div>
      )}

      <h5>Weaknesses in this game</h5>
      {report.weaknesses.length ? (
        <ul className="rep-list weak">
          {report.weaknesses.map((w) => (
            <li key={w.key}>
              <div><strong>{w.title}</strong>{w.detail && <span className="muted small"> - {w.detail}</span>}</div>
              {w.plies?.length > 0 && <button className="link-btn small" onClick={() => onSeek(w.plies[0])}>Show move</button>}
            </li>
          ))}
        </ul>
      ) : <p className="muted small">No clear weaknesses - a clean game.</p>}

      {report.strengths.length > 0 && (
        <>
          <h5>What went well</h5>
          <ul className="rep-list good">
            {report.strengths.map((st) => <li key={st.title}><div><strong>{st.title}</strong><span className="muted small"> - {st.detail}</span></div></li>)}
          </ul>
        </>
      )}

      {report.learn.length > 0 && (
        <>
          <h5>What to learn next</h5>
          <div className="learn-cards">
            {report.learn.map((l) => (
              <div key={l.title} className="learn-card">
                <strong>{l.title}</strong>
                <p className="small">{l.why}</p>
                {l.links.length > 0 && (
                  <div className="learn-links">
                    {l.links.map((k) => <a key={k.url} href={k.url} target="_blank" rel="noreferrer">{k.label} ↗</a>)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="muted small">Practice links open free puzzle sets on Lichess.</p>
        </>
      )}
      {puzzles && <AddPuzzles key={side} result={result} headers={headers} pgn={pgn} color={side} puzzles={puzzles} onOpenPuzzles={onOpenPuzzles} />}
    </div>
  )
}

/* ------------------------------------------------------------------ turn mistakes into puzzles */
function AddPuzzles({ result, headers, pgn, color, puzzles, onOpenPuzzles }) {
  const [withInacc, setWithInacc] = useState(false)
  const cands = useMemo(() => buildPuzzles(result, headers, pgn, color, { includeInaccuracies: withInacc }), [result, headers, pgn, color, withInacc])
  const have = new Set(puzzles.puzzles.map((p) => p.id))
  const [picked, setPicked] = useState(() => new Set())
  // tick every new candidate by default
  useEffect(() => { setPicked(new Set(cands.filter((c) => !have.has(c.id)).map((c) => c.id))) }, [cands]) // eslint-disable-line react-hooks/exhaustive-deps
  const wanted = cands.filter((c) => picked.has(c.id) && !have.has(c.id))
  const room = puzzles.room ?? Infinity
  const toAdd = wanted.slice(0, room) // never go over the list limit
  const added = cands.filter((c) => have.has(c.id)).length
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  if (!cands.length && !withInacc) {
    return (
      <div className="add-puzzles">
        <h5>Practice puzzles</h5>
        <p className="muted small">No mistakes, misses or blunders for this player - nothing to practise from this game.</p>
        <label className="small check"><input type="checkbox" checked={withInacc} onChange={(e) => setWithInacc(e.target.checked)} /> Include inaccuracies</label>
      </div>
    )
  }
  return (
    <div className="add-puzzles">
      <h5>Turn your mistakes into puzzles</h5>
      <p className="muted small">Each puzzle is the position before your move. Your task: find the move you missed. Puzzles keep a link to this game.</p>
      <StorageWarning compact />
      <p className={`small ${room === 0 ? 'storage-full' : room < wanted.length ? 'storage-low' : 'muted'}`}>
        {room === 0 ? `Your puzzle list is full (${puzzles.max}). Remove some in the Puzzles tab to add more.`
          : room < wanted.length ? `Only ${room} slot${room === 1 ? '' : 's'} left (limit ${puzzles.max}) - the first ${room} selected will be added.`
          : `${room} of ${puzzles.max} slots free.`}
      </p>
      <ul className="cand-list">
        {cands.map((c) => {
          const t = THEMES[c.theme]
          const isIn = have.has(c.id)
          return (
            <li key={c.id} className={isIn ? 'in' : ''}>
              <label>
                <input type="checkbox" disabled={isIn} checked={isIn || picked.has(c.id)} onChange={() => toggle(c.id)} />
                <span className="theme-badge" title={t.label}>{t.icon}</span>
                <span><strong>Move {c.moveNo}</strong> - you played {c.playedSan} <span className="muted">({c.playedLabel.toLowerCase()})</span><br /><span className="muted small">{t.label}{c.mateIn ? ` · mate in ${c.mateIn}` : ''}{isIn ? ' · already in your list' : ''}</span></span>
              </label>
            </li>
          )
        })}
      </ul>
      <label className="small check"><input type="checkbox" checked={withInacc} onChange={(e) => setWithInacc(e.target.checked)} /> Include inaccuracies</label>
      <div className="add-actions">
        <button className="big-green" disabled={!toAdd.length} onClick={() => puzzles.add(toAdd, gameMeta(headers, pgn, color))}>
          {toAdd.length ? `Add ${toAdd.length} puzzle${toAdd.length > 1 ? 's' : ''} to my list` : room === 0 ? `List full (${puzzles.max})` : added ? 'All added ✓' : 'Select puzzles'}
        </button>
        {added > 0 && onOpenPuzzles && <button className="secondary" onClick={onOpenPuzzles}>Open my puzzles ({puzzles.puzzles.length})</button>}
      </div>
    </div>
  )
}

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

const MIN_PHASE_MOVES = 2
const phaseMoves = (moves, phase, color) => moves.filter((m) => m.phase === phase && m.color === color).length
/** A phase is graded only when BOTH players made at least 2 moves in it - fair to compare. */
const gradable = (moves, phase) => phaseMoves(moves, phase, 'w') >= MIN_PHASE_MOVES && phaseMoves(moves, phase, 'b') >= MIN_PHASE_MOVES

/** One line explaining where the phases began, or why a phase has no grade. */
function phaseNote(moves) {
  const moveNo = (m) => Math.ceil(m.ply / 2)
  const firstEnd = moves.find((m) => m.phase === 'endgame')
  const firstMid = moves.find((m) => m.phase === 'middlegame')
  const lastMove = moves.at(-1)
  const mid = firstMid ? `Middlegame began at move ${moveNo(firstMid)}. ` : ''
  if (firstEnd && !gradable(moves, 'endgame')) {
    const n = moves.filter((m) => m.phase === 'endgame').length
    return `${mid}The endgame began at move ${moveNo(firstEnd)}, but the game ended ${n === 1 ? 'one move' : `${n} moves`} later - too few to grade either player fairly.`
  }
  if (firstEnd) return `${mid}Endgame began at move ${moveNo(firstEnd)}.`
  return `No endgame: the game finished at move ${moveNo(lastMove)} with plenty of pieces still on the board. (An endgame starts when 6 or fewer pieces are left, not counting kings and pawns.)`
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
/**
 * The moves that changed the game most: biggest swing in winning chances, seen from the
 * reviewer's side. Returns up to `max` moments in game order.
 */
export function turningPoints(result, reviewer, max = 5) {
  const wp = result.evals.map((e) => { const t = e.lines[0]; return winPct(t.mate != null ? { mate: t.mate } : { cp: t.cp }) })
  const mine = (w) => Math.round(reviewer === 'w' ? w : 100 - w)
  return result.moves
    .map((m) => ({ m, before: mine(wp[m.ply - 1]), after: mine(wp[m.ply]) }))
    .map((x) => ({ ...x, swing: x.after - x.before }))
    .filter((x) => Math.abs(x.swing) >= 10 && !['book', 'forced'].includes(x.m.cls))
    .sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing))
    .slice(0, max)
    .sort((a, b) => a.m.ply - b.m.ply)
    .map((x, i) => ({ ...x, n: i + 1 }))
}

/** One sentence per turning point - your moves get the better move; the opponent's only your reply. */
function momentText({ m, before, after, swing }, result, reviewer) {
  const label = CLASSES[m.cls].label.toLowerCase()
  const chances = `${before}% → ${after}%`
  if (m.color === reviewer) {
    if (swing < 0) return `You played ${m.san} (${label}). Your winning chances fell ${chances}.${m.bestSan && m.bestSan !== m.san ? ` ${m.bestSan} was better.` : ''}`
    return `${m.san} (${label}) - your winning chances rose ${chances}.`
  }
  if (swing > 0) {
    const next = result.moves[m.ply]
    const best = m.replyLine?.[0]
    let you = ''
    if (next && best) you = next.san === best ? ` You found the best reply, ${next.san} ✓` : ` You played ${next.san} - the best reply was ${best}.`
    return `Your opponent's ${label} ${m.san} gave you a chance: ${chances}.${you}`
  }
  return `Your opponent's ${m.san} put you under pressure: ${chances}.`
}


/**
 * The coach's verdict in plain words: what went wrong for YOU this game and the move that
 * cost it (or, after a win, your key moment).
 */
export function gameVerdict(result, players, reviewer) {
  const mine = result.moves.filter((m) => m.color === reviewer)
  const res = (players.result || '').split(' ')[0]
  const outcome = res === '1-0' ? (reviewer === 'w' ? 'win' : 'loss') : res === '0-1' ? (reviewer === 'b' ? 'win' : 'loss') : res === '1/2-1/2' ? 'draw' : null
  const count = (c) => mine.filter((m) => m.cls === c).length
  const blunders = count('blunder'), mistakes = count('mistake'), misses = count('miss'), inacc = count('inaccuracy')
  const tps = turningPoints(result, reviewer, 8)
  const worst = tps.filter((x) => x.m.color === reviewer && x.swing < 0).sort((a, b) => a.swing - b.swing)[0]
  const best = tps.filter((x) => x.swing > 0).sort((a, b) => b.swing - a.swing)[0]
  const moveNo = (m) => `${Math.ceil(m.ply / 2)}${m.color === 'w' ? '.' : '...'}${m.san}`
  const acc = result.summary[reviewer]?.accuracy
  const oppAcc = result.summary[reviewer === 'w' ? 'b' : 'w']?.accuracy

  // the main problem, most important first
  const weak = mine.filter((m) => ['mistake', 'blunder', 'miss'].includes(m.cls))
  const byPhase = { opening: 0, middlegame: 0, endgame: 0 }
  for (const m of weak) byPhase[m.phase] = (byPhase[m.phase] || 0) + 1
  const phase = Object.entries(byPhase).sort((a, b) => b[1] - a[1])[0]
  let problem
  if (!weak.length && !inacc) problem = 'You played a clean game - no real errors.'
  else if (misses >= 2) problem = `Missed chances: ${misses} times your opponent went wrong and you didn't punish it. Look for checks, captures and threats after every opponent mistake.`
  else if (blunders >= 2) problem = `Blunders: ${blunders} moves gave away a lot. Before you move, check what your move leaves undefended.`
  else if (weak.length && phase[1] >= Math.max(2, weak.length * 0.6)) problem = `Your errors came in the ${phase[0]} (${phase[1]} of ${weak.length}).${phase[0] === 'opening' ? ' Study your opening lines - the Openings tab has courses.' : phase[0] === 'endgame' ? ' Endgame technique cost you - try the Endgame lessons and drills.' : ' Slow down in complicated middlegames and check your opponent\'s threats.'}`
  else if (blunders === 1 && weak.length === 1) problem = 'One big slip in an otherwise solid game.'
  else if (acc != null && oppAcc != null && oppAcc - acc >= 10) problem = `You were outplayed: ${acc.toFixed(0)} accuracy against ${oppAcc.toFixed(0)}. ${mistakes + blunders} mistakes and blunders added up.`
  else problem = `${mistakes + blunders + misses} mistakes and ${inacc} inaccuracies - small errors added up.`

  let costly = null
  if (worst && outcome !== 'win') {
    costly = `The move that cost the game: ${moveNo(worst.m)} - your winning chances fell from ${worst.before}% to ${worst.after}%.${worst.m.bestSan && worst.m.bestSan !== worst.m.san ? ` ${worst.m.bestSan} was the move.` : ''}`
  } else if (worst && worst.swing <= -20) {
    costly = `Your worst moment: ${moveNo(worst.m)} (chances ${worst.before}% → ${worst.after}%) - you still won, but ${worst.m.bestSan || 'a better move'} was stronger.`
  }
  let highlight = null
  if (best && best.m.color !== reviewer) {
    const next = result.moves[best.m.ply]
    highlight = next && best.m.replyLine?.[0] === next.san
      ? `Key moment: after your opponent's ${moveNo(best.m)} you found ${next.san} and took over.`
      : `Key moment: your opponent's ${moveNo(best.m)} gave you a big chance (${best.before}% → ${best.after}%).`
  } else if (best) highlight = `Key moment: ${moveNo(best.m)} swung the game your way (${best.before}% → ${best.after}%).`
  const opener = outcome === 'win' ? 'Well played - you won.' : outcome === 'loss' ? 'Tough one.' : outcome === 'draw' ? 'A draw.' : 'Here\'s how your game went.'
  return { outcome, opener, problem, costly, highlight: outcome === 'win' || !costly ? highlight : null, worstPly: worst?.m.ply, bestPly: best?.m.ply }
}

function VerdictBubble({ result, players, reviewer, onSeek }) {
  const v = gameVerdict(result, players, reviewer)
  return (
    <div className="coach verdict">
      <div className="coach-avatar" aria-hidden="true">♞</div>
      <div className="coach-bubble speech">
        <p><strong>{v.opener}</strong> {v.problem}</p>
        {v.costly && <p><button className="link-btn verdict-link" onClick={() => onSeek(v.worstPly)}>{v.costly}</button></p>}
        {v.highlight && <p><button className="link-btn verdict-link" onClick={() => onSeek(v.bestPly)}>{v.highlight}</button></p>}
      </div>
    </div>
  )
}

function TurningPoints({ result, reviewer, onSeek }) {
  const tps = turningPoints(result, reviewer)
  if (!tps.length) return <p className="muted small">No big swings - a steady game from start to finish.</p>
  return (
    <ol className="turning-points">
      {tps.map((x) => (
        <li key={x.m.ply}>
          <button className="tp" onClick={() => onSeek(x.m.ply)}>
            <span className="tp-n">{x.n}</span>
            <span className="tp-main">
              <span className="tp-move"><ClassIcon cls={x.m.cls} size={18} /> <strong>{Math.ceil(x.m.ply / 2)}{x.m.color === 'w' ? '.' : '...'} {x.m.san}</strong>
                <span className={`tp-swing ${x.swing >= 0 ? 'up' : 'down'}`}>{x.swing >= 0 ? '+' : ''}{x.swing}%</span>
                <span className="muted small">{x.m.color === reviewer ? 'your move' : 'opponent'}</span>
              </span>
              <span className="small">{momentText(x, result, reviewer)}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}

function EvalGraph({ result, ply, onSeek, reviewer = 'w' }) {
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
        {turningPoints(result, reviewer).map((x) => (
          <g key={`tp${x.m.ply}`} className="eg-tp">
            <circle cx={pts[x.m.ply][0]} cy={Math.min(H - 8, Math.max(8, pts[x.m.ply][1]))} r="7" />
            <text x={pts[x.m.ply][0]} y={Math.min(H - 8, Math.max(8, pts[x.m.ply][1])) + 3.5} textAnchor="middle">{x.n}</text>
          </g>
        ))}
        <line x1={pts[ply][0]} x2={pts[ply][0]} y1="0" y2={H} className="eg-cursor" />
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ board + eval bar */
function BoardArea({ result, ply, flipped, setFlipped, showBest, players, retry }) {
  const customPieces = useCustomPieces()
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
            customPieces={customPieces} customDarkSquareStyle={{ backgroundColor: 'var(--rb-dark)', backgroundImage: 'var(--rb-dark-img, none)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--rb-light)', backgroundImage: 'var(--rb-light-img, none)' }}
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
function Summary({ result, players, headers, pgn, puzzles, onOpenPuzzles, onStart, onSeek, retryCount, onRetryAll, reviewer = 'w' }) {
  const { w, b } = result.summary
  const res = players.result
  return (
    <div className="rv-summary">
      <VerdictBubble result={result} players={players} reviewer={reviewer} onSeek={onSeek} />
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
      <h4>Key moments - the moves that changed the game</h4>
      <TurningPoints result={result} reviewer={reviewer} onSeek={onSeek} />
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
              {phaseMoves(result.moves, p, 'w') + phaseMoves(result.moves, p, 'b') === 0 ? (
                <td colSpan={2} className="center muted small">Not reached</td>
              ) : !gradable(result.moves, p) ? (
                <td colSpan={2} className="center muted small">Too short to grade</td>
              ) : [w, b].map((s, i) => (
                <td key={i} className="center">
                  {s.phases[p] != null ? <span className="phase-cell"><ClassIcon cls={phaseClass(s.phases[p])} size={20} /><span className="muted small">{s.phases[p].toFixed(0)}</span></span> : <span className="muted">-</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small phase-note">{phaseNote(result.moves)}</p>
      <GameReport result={result} players={players} headers={headers} pgn={pgn} onSeek={onSeek} puzzles={puzzles} onOpenPuzzles={onOpenPuzzles} />
      <p className="muted small">Accuracy and labels are this app's own approximation of Chess.com's system (their exact formula isn't public), so expect differences of a few points.</p>
    </div>
  )
}

const WEAK = ['inaccuracy', 'mistake', 'miss', 'blunder']
const ARTICLE = { inaccuracy: 'an inaccuracy', mistake: 'a mistake', miss: 'a miss', blunder: 'a blunder' }
/**
 * What to say about the OPPONENT's move: what they played and how good it was, then only
 * YOUR best reply - never what they should have played instead.
 */
export function opponentView(mv, oppName = 'Your opponent') {
  const who = oppName && oppName !== '?' ? oppName : 'Your opponent' // PGNs without names use "?"
  const reply = mv.replyLine?.[0]
  if (mv.cls === 'book') return `${who} played a book move.`
  if (WEAK.includes(mv.cls)) {
    const chance = reply ? ` Your best reply is ${reply}${mv.replyLine.length > 1 ? ` (${mv.replyLine.slice(0, 3).join(' ')})` : ''} - this is your chance to punish it.` : ''
    return `${who} played ${mv.san}, ${ARTICLE[mv.cls]}.${chance}`
  }
  const quality = { brilliant: 'a brilliant move', great: 'a great move', best: 'the best move', excellent: 'an excellent move', good: 'a good move', forced: 'the only move' }[mv.cls] || 'a move'
  return `${who} played ${mv.san}, ${quality}.${reply ? ` Your best reply is ${reply}.` : ''}`
}

function Coach({ mv, showBest, setShowBest, onNext, onRetry, onExplain, mine = true, oppName }) {
  if (!mine) {
    return (
      <div className="coach">
        <div className="coach-avatar" aria-hidden="true">♞</div>
        <div className="coach-bubble">
          <div className="coach-head">
            <ClassIcon cls={mv.cls} size={20} />
            <strong>{mv.san} {VERDICT[mv.cls]}</strong>
            <span className={`eval-chip ${mv.evalAfter.mate != null || mv.evalAfter.cp >= 0 ? 'pos' : 'neg'}`}>{fmtEval(mv.evalAfter)}</span>
          </div>
          <p>{opponentView(mv, oppName)}</p>
          <p className="muted small">Opponent's move - the review only explains your own moves.</p>
        </div>
        <div className="coach-actions">
          <button className="next-btn" onClick={onNext}>Next <IconArrowRight /></button>
        </div>
      </div>
    )
  }
  return (
    <div className="coach">
      <div className="coach-avatar" aria-hidden="true">♞</div>
      <div className="coach-bubble">
        <div className="coach-head">
          <ClassIcon cls={mv.cls} size={20} />
          <strong>{mv.san} {VERDICT[mv.cls]}</strong>
          <span className={`eval-chip ${mv.evalAfter.mate != null || mv.evalAfter.cp >= 0 ? 'pos' : 'neg'}`}>{fmtEval(mv.evalAfter)}</span>
        </div>
        <p>{mv.explain?.text || mv.text}</p>
        {mv.explain && mv.cls !== 'best' && mv.text && !mv.explain.text.includes(mv.text.slice(0, 20)) && ['brilliant', 'great'].includes(mv.cls) && <p className="small muted">{mv.text}</p>}
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
        {onExplain && <button className="secondary" onClick={onExplain} title="Step through the moves that explain this"><IconBulb /> Explain</button>}
        {onRetry && <button className="secondary" onClick={onRetry} title="Try to find a better move"><IconRetry /> Retry</button>}
        <button className="next-btn" onClick={onNext}>Next <IconArrowRight /></button>
      </div>
    </div>
  )
}

function MoveList({ result, ply, onSeek }) {
  const ref = useRef(null)
  useEffect(() => {
    // scroll only the list box (scrollIntoView would also scroll the page down to the list on phones)
    const box = ref.current
    const el = box?.querySelector('.mv.on')
    if (!el) return
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
    if (top < box.scrollTop) box.scrollTop = top
    else if (top + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + el.offsetHeight - box.clientHeight
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

/* ------------------------------------------------------------------ explain: step through a line */
const sideName = (fen) => (fen.split(' ')[1] === 'w' ? 'White' : 'Black')

/** Positions + captions for a SAN line from `fen`. */
export function buildSteps(fen, line) {
  const steps = []
  let cur = fen
  for (const san of line) {
    const c = new Chess(cur)
    let mv
    try { mv = c.move(san) } catch { break }
    const motifs = moveMotifs(cur, san)
    const top = motifs.find((m) => !['capture'].includes(m.kind)) || motifs[0]
    steps.push({ san: mv.san, from: mv.from, to: mv.to, fenBefore: cur, fenAfter: c.fen(), who: sideName(cur), no: +cur.split(' ')[5], note: top?.text || '' })
    cur = c.fen()
  }
  return steps
}

function ExplainPanel({ ex, setEx, mv, onExit }) {
  const steps = ex.steps
  const cur = steps[ex.step - 1]
  const next = steps[ex.step]
  const tabs = [['wrong', 'What went wrong'], ['better', 'Better was']].filter(([k]) => ex.lines[k]?.length)
  return (
    <div className="explain-panel">
      <div className="retry-head">
        <span className="retry-badge"><IconBulb /> Explain</span>
        <button className="icon-btn" onClick={onExit} aria-label="Close explanation" title="Close"><IconClose /></button>
      </div>
      {tabs.length > 1 && (
        <div className="tabs chips small-chips" role="tablist">
          {tabs.map(([k, label]) => <button key={k} role="tab" aria-selected={ex.tab === k} className={ex.tab === k ? 'tab active' : 'tab'} onClick={() => setEx({ ...ex, tab: k, step: 0, steps: ex.lines[k] })}>{label}</button>)}
        </div>
      )}
      <div className="coach-bubble">
        <p className="small">{ex.tab === 'wrong' ? (mv.explain?.wrong || mv.text) : (mv.explain?.better || `The engine prefers ${mv.bestSan}.`)}</p>
      </div>
      <ol className="ex-steps">
        {steps.map((st, i) => (
          <li key={i} className={i === ex.step - 1 ? 'on' : i < ex.step ? 'done' : ''}>
            <button onClick={() => setEx({ ...ex, step: i + 1 })}>
              <span className="ex-san">{st.who === 'White' ? `${st.no}.` : i === 0 ? `${st.no}...` : ''} {st.san}</span>
              {st.note && <span className="muted small"> - {st.note}</span>}
            </button>
          </li>
        ))}
      </ol>
      <p className="small ex-now">{ex.step === 0 ? `Start position. ${next ? `${next.who} plays ${next.san}${next.note ? ` - ${next.note}` : ''}.` : ''}` : `${cur.who} played ${cur.san}${cur.note ? `: ${cur.note}` : ''}.`}</p>
      <div className="coach-actions">
        <button className="secondary" disabled={ex.step === 0} onClick={() => setEx({ ...ex, step: ex.step - 1 })}><IconPrev /> Back</button>
        <button className="next-btn" disabled={ex.step >= steps.length} onClick={() => setEx({ ...ex, step: ex.step + 1 })}>Next move <IconArrowRight /></button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ main view */
export default function ReviewView({ initialPgn, username, rows, puzzles, onOpenPuzzles }) {
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
  // ---- spoken coach
  const [voice, setVoiceState] = useState(loadVoiceSettings)
  const setVoice = (v) => { setVoiceState(v); saveVoiceSettings(v) }
  const [allVoices, setAllVoices] = useState(() => englishVoices())
  useEffect(() => onVoicesChanged(() => setAllVoices(englishVoices())), [])
  const voices = englishVoices(voice.gender, voice.accent).filter((v) => allVoices.includes(v))
  const hasGender = (g) => allVoices.some((v) => genderOf(v) === g)
  const hasAccent = (a) => a === 'any' || allVoices.some((v) => accentOf(v) === a)
  useEffect(() => () => stopSpeaking(), [])
  const speechRef = useRef(Promise.resolve())
  const [retry, setRetry] = useState(null) // { ply, queue, fen, status, ... }
  const [ex, setEx] = useState(null) // explain mode: { ply, tab, lines, steps, step }
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
  const seek = useCallback((p) => { setRetry(null); setEx(null); setPly(Math.max(0, Math.min(last, p))) }, [last])
  const openExplain = (m) => {
    const bad = ['inaccuracy', 'mistake', 'miss', 'blunder'].includes(m.cls)
    const lines = {
      wrong: buildSteps(m.fenBefore, [m.san, ...m.replyLine].slice(0, 6)),
      better: m.bestSan && m.bestSan !== m.san ? buildSteps(m.fenBefore, m.bestLine.slice(0, 6)) : [],
    }
    const tab = bad ? 'wrong' : 'wrong'
    setShowBest(false); setPlaying(false)
    setEx({ ply: m.ply, tab, lines, steps: lines[tab], step: 0 })
  }
  // board override while explaining: position at the current step, arrow for the next move
  const exBoard = ex && (() => {
    const st = ex.steps
    const fen = ex.step === 0 ? st[0]?.fenBefore : st[ex.step - 1].fenAfter
    const nxt = st[ex.step]
    const last = st[ex.step - 1]
    return {
      ply: ex.ply, fen, draggable: false,
      arrows: nxt ? [[nxt.from, nxt.to, ex.tab === 'better' ? 'rgba(80,160,60,0.9)' : 'rgba(230,140,40,0.9)']] : [],
      squareStyles: last ? { [last.from]: { background: '#ffffff33' }, [last.to]: { background: '#e3b23c88' } } : {},
    }
  })()

  // ---- Retry mode: replay the position before a weak move and let the user find a better one
  const youColor = players?.w.you ? 'w' : players?.b.you ? 'b' : null
  // whose review this is: your username, or (pasted PGN) the side at the bottom of the board
  const reviewer = youColor || (flipped ? 'b' : 'w')
  const retryList = useMemo(() => (result ? result.moves.filter((m) => ['mistake', 'miss', 'blunder'].includes(m.cls) && m.bestUci && m.color === reviewer).map((m) => m.ply) : []), [result, reviewer]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // read the coach's comment aloud for each move
  useEffect(() => {
    if (!voice.on || status !== 'done' || retry || ex) { speechRef.current = Promise.resolve(); return }
    const m = ply > 0 ? result?.moves[ply - 1] : null
    if (!m) { stopSpeaking(); speechRef.current = Promise.resolve(); return }
    const youKnown = players && (players.w?.you || players.b?.you)
    const mineMove = m.color === (youKnown ? (players.w.you ? 'w' : 'b') : (flipped ? 'b' : 'w'))
    const line = coachScript(m, { opponent: !mineMove, style: voice.style, reason: mineMove ? null : opponentView(m, players?.[m.color]?.name) })
    speechRef.current = speak(line.text, { ...voice, pitch: line.pitch, rate: voice.rate * line.rate })
  }, [ply, voice.on, status, retry, ex]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playing) return
    if (ply >= last) { setPlaying(false); return }
    // with the voice on, wait until the coach has finished talking before the next move
    let live = true
    const wait = voice.on ? Promise.all([speechRef.current, new Promise((r) => setTimeout(r, 700))]) : new Promise((r) => setTimeout(r, 900))
    wait.then(() => { if (live) setPly((p) => p + 1) })
    return () => { live = false }
  }, [playing, ply, last, voice.on])

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
            <BoardArea result={result} ply={ply} flipped={flipped} setFlipped={setFlipped} showBest={showBest && mv?.color === reviewer} players={players}
              retry={(retry && { ...retry, draggable: retry.status === 'thinking', onDrop: onRetryDrop }) || exBoard} />
            <div className="review-controls" role="toolbar" aria-label="Move navigation">
              <button className="nav-btn" onClick={() => seek(0)} disabled={!retry && ply === 0} title="Start of game (Home)" aria-label="Start of game"><IconFirst /></button>
              <button className="nav-btn" onClick={() => seek(ply - 1)} disabled={!retry && ply === 0} title="Previous move (←)" aria-label="Previous move"><IconPrev /></button>
              <button className="nav-btn play" onClick={() => { setRetry(null); setPlaying(!playing) }} title={playing ? 'Pause' : 'Play through the game'} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <IconPause /> : <IconPlay />}</button>
              <button className="nav-btn" onClick={() => seek(ply + 1)} disabled={!retry && ply === last} title="Next move (→)" aria-label="Next move"><IconNext /></button>
              <button className="nav-btn" onClick={() => seek(last)} disabled={!retry && ply === last} title="End of game (End)" aria-label="End of game"><IconLast /></button>
              {voiceSupported && (
                <button className={`nav-btn ${voice.on ? 'voice-on' : ''}`} aria-pressed={voice.on}
                  title={voice.on ? 'Voice coach on - tap to mute' : 'Turn on the voice coach (reads the explanations out loud)'}
                  aria-label={voice.on ? 'Mute voice coach' : 'Turn on voice coach'}
                  onClick={() => { if (voice.on) { stopSpeaking(); setVoice({ ...voice, on: false }) } else { setVoice({ ...voice, on: true }); if (ply === 0) speak('Voice coach on. Press next to hear each move.', voice) } }}>
                  {voice.on ? <IconSpeaker /> : <IconMute />}
                </button>
              )}
            </div>
          </div>
          <div className="review-right card">
            <h3 className="rv-title">Game Review</h3>
            {voiceSupported && (
              <div className="voice-row" role="group" aria-label="Voice coach">
                <span className="voice-title small"><IconSpeaker /> Voice coach</span>
                <div className="tabs chips small-chips" role="radiogroup" aria-label="Voice coach on or off">
                  {[[true, 'On'], [false, 'Off']].map(([on, label]) => (
                    <button key={label} role="radio" aria-checked={voice.on === on} className={voice.on === on ? 'tab active' : 'tab'}
                      onClick={() => {
                        if (on === voice.on) return
                        if (!on) { stopSpeaking(); setVoice({ ...voice, on: false }); return }
                        setVoice({ ...voice, on: true })
                        if (ply === 0) speak("Hi! I'm your coach. Press next and I'll talk you through each move.", voice)
                      }}>{label}</button>
                  ))}
                </div>
                {voice.on && (
                  <div className="tabs chips small-chips" role="radiogroup" aria-label="Voice type">
                    {[['female', 'Female'], ['male', 'Male']].map(([g, label]) => (
                      <button key={g} role="radio" aria-checked={voice.gender === g} className={voice.gender === g ? 'tab active' : 'tab'}
                        disabled={allVoices.length > 0 && !hasGender(g)} title={allVoices.length > 0 && !hasGender(g) ? `This device has no ${g} English voice` : `${label} voice`}
                        onClick={() => { const v = { ...voice, gender: g, voice: '' }; setVoice(v); speak(g === 'female' ? "Hi, I'll be your coach today." : "Hey, I'll be your coach today.", v) }}>{label}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {voice.on && (
              <div className="voice-row">
                <label className="small muted">Accent
                  <select value={voice.accent} onChange={(e) => {
                    const v = { ...voice, accent: e.target.value, voice: '' }; setVoice(v)
                    speak(v.accent === 'IN' ? 'Namaste! Let us look at your game together.' : "Hi! Let's look at your game together.", v)
                  }}>
                    {ACCENTS.map(([a, label]) => <option key={a} value={a} disabled={allVoices.length > 0 && !hasAccent(a)}>{label}{allVoices.length > 0 && !hasAccent(a) ? ' (not on this device)' : ''}</option>)}
                  </select>
                </label>
                <label className="small muted">Style
                  <select value={voice.style} onChange={(e) => {
                    const v = { ...voice, style: e.target.value }; setVoice(v)
                    speak({ hype: "Let's go, chat! Time to review this game!", calm: 'Let us calmly go through the game.', coach: "Right, let's go through your game." }[v.style], { ...v, rate: v.rate * (v.style === 'hype' ? 1.12 : v.style === 'calm' ? 0.9 : 1) })
                  }}>
                    {STYLES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </label>
              </div>
            )}
            {voice.on && voices.length > 0 && (
              <div className="voice-row">
                <label className="small muted">Voice
                  <select value={voices.some((v) => v.name === voice.voice) ? voice.voice : voices[0].name}
                    onChange={(e) => { const v = { ...voice, voice: e.target.value }; setVoice(v); speak("Hi! I'll talk you through your game.", v) }}>
                    {voices.map((v) => <option key={v.name} value={v.name}>{voiceLabel(v)}</option>)}
                  </select>
                </label>
                <label className="small muted">Speed
                  <select value={voice.rate} onChange={(e) => setVoice({ ...voice, rate: +e.target.value })}>
                    {[[0.85, 'Slow'], [1, 'Normal'], [1.15, 'Fast'], [1.35, 'Faster']].map(([r, l]) => <option key={r} value={r}>{l}</option>)}
                  </select>
                </label>
              </div>
            )}
            {ex && mv ? (
              <ExplainPanel ex={ex} setEx={setEx} mv={mv} onExit={() => setEx(null)} />
            ) : retry && retryMove ? (
              <RetryPanel retry={retry} mv={retryMove} remaining={retry.queue.length}
                onHint={retryHint} onSolution={retrySolution} onNextRetry={retryNext}
                onExit={() => { setRetry(null) }} />
            ) : ply === 0 || !mv ? (
              <Summary result={result} players={players} headers={game.headers} pgn={game.pgn} puzzles={puzzles} onOpenPuzzles={onOpenPuzzles} onStart={() => seek(1)} onSeek={seek}
                retryCount={retryList.length} onRetryAll={() => startRetry(retryList[0], retryList.slice(1))} reviewer={reviewer} />
            ) : (
              <>
                <Coach mv={mv} showBest={showBest} setShowBest={setShowBest} onNext={() => seek(ply + 1)}
                  mine={mv.color === reviewer} oppName={players?.[mv.color]?.name}
                  onExplain={!['book', 'forced'].includes(mv.cls) && (mv.replyLine.length || mv.bestLine.length) ? () => openExplain(mv) : null}
                  onRetry={['inaccuracy', 'mistake', 'miss', 'blunder'].includes(mv.cls) && mv.bestUci ? () => startRetry(mv.ply) : null} />
                <MoveList result={result} ply={ply} onSeek={seek} />
                <button className="link-btn" onClick={() => seek(0)}>← Back to summary</button>
              </>
            )}
            <EvalGraph result={result} ply={ply} onSeek={seek} reviewer={reviewer} />
          </div>
        </div>
      )}
    </div>
  )
}
