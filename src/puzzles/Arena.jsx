// Chess.com-style puzzle modes built on a sample of the Lichess puzzle database (CC0):
// rated PUZZLES (your puzzle rating goes up and down), PUZZLE RUSH (3 min / 5 min / survival),
// a DAILY PUZZLE, and practice by THEME.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { useCustomPieces } from '../BoardPicker'
import { useWidth } from '../insights/Visuals'
import { IconArrowRight, IconBulb, IconRetry, IconStar } from '../review/icons'

/* ------------------------------------------------------------------ data */
let dataPromise = null
export function loadPuzzleSet() {
  if (!dataPromise) {
    dataPromise = fetch(`${import.meta.env.BASE_URL}puzzles.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((rows) => rows.map(([id, fen, moves, rating, themes]) => ({ id, fen, moves: moves.split(' '), rating, themes: themes ? themes.split(' ') : [] })))
      .catch((e) => { dataPromise = null; throw e })
  }
  return dataPromise
}
function usePuzzleSet() {
  const [set, setSet] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => { let live = true; loadPuzzleSet().then((s) => live && setSet(s), (e) => live && setErr(e.message)); return () => { live = false } }, [])
  return [set, err]
}

export const THEME_LABELS = {
  mateIn1: 'Mate in 1', mateIn2: 'Mate in 2', mateIn3: 'Mate in 3', fork: 'Fork', pin: 'Pin', skewer: 'Skewer',
  discoveredAttack: 'Discovered attack', hangingPiece: 'Hanging piece', sacrifice: 'Sacrifice', backRankMate: 'Back-rank mate',
  deflection: 'Deflection', attraction: 'Attraction', trappedPiece: 'Trapped piece', promotion: 'Promotion',
  advancedPawn: 'Advanced pawn', defensiveMove: 'Defensive move', quietMove: 'Quiet move', kingsideAttack: 'Kingside attack',
  exposedKing: 'Exposed king', doubleCheck: 'Double check', smotheredMate: 'Smothered mate', zugzwang: 'Zugzwang',
  interference: 'Interference', clearance: 'Clearance', xRayAttack: 'X-ray', intermezzo: 'In-between move',
  capturingDefender: 'Remove the defender', endgame: 'Endgame', middlegame: 'Middlegame', opening: 'Opening',
  rookEndgame: 'Rook endgame', pawnEndgame: 'Pawn endgame', queenEndgame: 'Queen endgame', bishopEndgame: 'Bishop endgame',
  knightEndgame: 'Knight endgame', equality: 'Hold the draw', short: 'Short (2 moves)', long: 'Long (3 moves)', veryLong: 'Very long',
}
const SHOWN_THEMES = ['mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'discoveredAttack', 'hangingPiece', 'sacrifice', 'backRankMate',
  'deflection', 'attraction', 'trappedPiece', 'capturingDefender', 'intermezzo', 'promotion', 'advancedPawn', 'defensiveMove', 'quietMove',
  'kingsideAttack', 'exposedKing', 'doubleCheck', 'smotheredMate', 'zugzwang', 'opening', 'middlegame', 'endgame', 'rookEndgame', 'pawnEndgame', 'queenEndgame']

/* ------------------------------------------------------------------ your puzzle stats */
const KEY = 'smc-arena-v1'
const today = () => new Date().toISOString().slice(0, 10)
function readStats() {
  const base = { rating: 1200, played: 0, solved: 0, history: [], seen: [], rush: { 3: 0, 5: 0, survival: 0 }, daily: {}, dailyStreak: 0, themeStats: {} }
  try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return base }
}
function useStats() {
  const [s, setS] = useState(readStats)
  const update = useCallback((fn) => setS((prev) => { const next = fn(prev); try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ } return next }), [])
  return [s, update]
}
/** Elo-style update: beat a hard puzzle and you gain more; miss an easy one and you lose more. */
export function rateChange(rating, puzzleRating, ok, played) {
  const k = played < 20 ? 40 : played < 100 ? 24 : 16
  const exp = 1 / (1 + 10 ** ((puzzleRating - rating) / 400))
  return Math.round(k * ((ok ? 1 : 0) - exp))
}
const remember = (seen, id) => [id, ...seen.filter((x) => x !== id)].slice(0, 800)

/** A puzzle near the target rating that you haven't seen recently. */
function pick(set, target, seen, filter) {
  const recent = new Set(seen)
  for (const w of [75, 150, 300, 600, 3000]) {
    const pool = set.filter((p) => Math.abs(p.rating - target) <= w && !recent.has(p.id) && (!filter || filter(p)))
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)]
  }
  const any = set.filter((p) => !filter || filter(p))
  return any[Math.floor(Math.random() * any.length)] || set[0]
}

/* ------------------------------------------------------------------ the board */
// Lichess format: the FEN is BEFORE the opponent's move; moves[0] is their move, then you
// play moves[1], they reply moves[2] and so on. Any move that gives checkmate is accepted.
function PuzzleBoard({ puzzle, onDone, rush = false, compact = false, header, extra }) {
  const customPieces = useCustomPieces()
  const [wrap, W] = useWidth(480)
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 900)
  useEffect(() => { const on = () => setVh(window.innerHeight); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [])
  const size = Math.max(260, Math.min(W, 560, W > 640 ? vh - 140 : Infinity))
  const me = new Chess(puzzle.fen).turn() === 'w' ? 'b' : 'w' // you move after their first move
  const [fen, setFen] = useState(puzzle.fen)
  const [step, setStep] = useState(0) // index into moves of the next move to be played
  const [state, setState] = useState('intro') // intro | solving | wrong | solved | failed
  const [msg, setMsg] = useState('')
  const [squares, setSquares] = useState({})
  const [arrows, setArrows] = useState([])
  const [hint, setHint] = useState(0)
  const [sel, setSel] = useState(null)
  const failedOnce = useRef(false)
  const timers = useRef([])
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const play = (f, uci) => {
    const c = new Chess(f)
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return { fen: c.fen(), m }
  }
  const mark = (m, color) => ({ [m.from]: { background: `${color}66` }, [m.to]: { background: `${color}aa` } })

  // start: show the position, then play the opponent's move
  useEffect(() => {
    setFen(puzzle.fen); setStep(0); setState('intro'); setMsg(''); setSquares({}); setArrows([]); setHint(0); setSel(null); failedOnce.current = false
    later(() => {
      const r = play(puzzle.fen, puzzle.moves[0])
      setFen(r.fen); setSquares(mark(r.m, '#ffffff')); setStep(1); setState('solving')
    }, rush ? 350 : 600)
  }, [puzzle.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (ok) => { setState(ok ? 'solved' : 'failed'); onDone?.(ok && !failedOnce.current, { usedHint: hint > 0 }) }

  const tryMove = (from, to) => {
    setSel(null)
    if (state !== 'solving') return false
    const want = puzzle.moves[step]
    const c = new Chess(fen)
    let mv
    try { mv = c.move({ from, to, promotion: want && want.slice(0, 4) === from + to && want[4] ? want[4] : 'q' }) } catch { return false }
    const uci = mv.from + mv.to + (mv.promotion || '')
    if (uci === want || c.isCheckmate()) {
      setFen(c.fen()); setSquares(mark(mv, '#7fae3c')); setArrows([]); setHint(0)
      const reply = puzzle.moves[step + 1]
      if (!reply || c.isCheckmate()) { setMsg(c.isCheckmate() ? 'Checkmate! Puzzle solved.' : 'Puzzle solved!'); finish(true); return true }
      setMsg('Best move! Keep going...')
      setState('reply')
      later(() => {
        const r = play(c.fen(), reply)
        setFen(r.fen); setSquares(mark(r.m, '#ffffff')); setStep(step + 2); setState('solving')
      }, rush ? 250 : 450)
      return true
    }
    // wrong
    failedOnce.current = true
    if (rush) { setFen(c.fen()); setSquares(mark(mv, '#d63a3a')); setMsg(`${mv.san} is not it.`); finish(false); return true }
    setFen(c.fen()); setSquares(mark(mv, '#d63a3a')); setState('wrong'); setMsg(`${mv.san} is not the best move.`)
    if (!compact) onDone?.(false, { firstFail: true })
    later(() => { setFen(new Chess(fen).fen()); setSquares({}); setState('solving'); setMsg('Try again.') }, 900)
    return true
  }

  const showHint = () => {
    const want = puzzle.moves[step]
    if (!want) return
    if (hint === 0) { setSquares({ [want.slice(0, 2)]: { background: 'rgba(80,160,60,0.55)' } }); setHint(1) } else { setArrows([[want.slice(0, 2), want.slice(2, 4), 'rgba(80,160,60,0.9)']]); setHint(2) }
    failedOnce.current = true
  }
  const showSolution = () => {
    failedOnce.current = true
    let f = fen, i = step
    const runOne = () => {
      if (i >= puzzle.moves.length) { setState('failed'); setMsg('That was the solution.'); onDone?.(false, { revealed: true }); return }
      const r = play(f, puzzle.moves[i])
      f = r.fen; i++
      setFen(f); setSquares(mark(r.m, i % 2 === 0 ? '#7fae3c' : '#ffffff'))
      later(runOne, 650)
    }
    setState('reply'); runOne()
  }

  const targets = useMemo(() => (sel && state === 'solving' ? new Chess(fen).moves({ square: sel, verbose: true }) : []), [sel, fen, state])
  const lastTap = useRef({ sq: null, t: 0 })
  const tap = (sq) => {
    const now = performance.now()
    if (lastTap.current.sq === sq && now - lastTap.current.t < 250) return
    lastTap.current = { sq, t: now }
    if (state !== 'solving') return
    if (sel && targets.some((t) => t.to === sq)) { tryMove(sel, sq); return }
    const p = new Chess(fen).get(sq)
    setSel(p && p.color === me && sq !== sel ? sq : null)
  }
  const dots = {}
  if (sel) dots[sel] = { background: 'rgba(255,214,102,0.6)' }
  for (const t of targets) dots[t.to] = t.captured ? { background: 'radial-gradient(circle, transparent 58%, rgba(20,20,20,0.35) 60%)' } : { background: 'radial-gradient(circle, rgba(20,20,20,0.32) 22%, transparent 24%)' }

  const done = state === 'solved' || state === 'failed'
  return (
    <div className="solver-layout arena-board">
      <div className="solver-board" ref={wrap}>
        <div className="board-wrap" style={{ width: size, height: size }}>
          <Chessboard
            id={`arena-${puzzle.id}`} position={fen} boardWidth={size}
            boardOrientation={me === 'w' ? 'white' : 'black'}
            arePiecesDraggable={state === 'solving'}
            isDraggablePiece={({ piece }) => piece[0] === me}
            onPieceDrop={tryMove} autoPromoteToQueen
            onSquareClick={tap} onPieceClick={(p, sq) => tap(sq)}
            onPieceDragBegin={(p, sq) => { if (state === 'solving' && p[0] === me) setSel(sq) }} onPieceDragEnd={() => setSel(null)}
            customSquareStyles={{ ...squares, ...dots }} customArrows={arrows}
            customPieces={customPieces}
            customDarkSquareStyle={{ backgroundColor: 'var(--rb-dark)', backgroundImage: 'var(--rb-dark-img, none)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--rb-light)', backgroundImage: 'var(--rb-light-img, none)' }}
            animationDuration={rush ? 120 : 200}
          />
        </div>
      </div>
      <div className="solver-side card">
        {header}
        <div className={`solver-msg ${state === 'solved' ? 'good' : state === 'failed' || state === 'wrong' ? 'bad' : ''}`} role="status">
          {state === 'intro' ? 'Watch your opponent\'s move...' : msg || <>Find the best move for <strong>{me === 'w' ? 'White' : 'Black'}</strong>.</>}
        </div>
        {extra?.(done, { showHint, showSolution, state, hint })}
      </div>
    </div>
  )
}

const themeText = (p) => p.themes.filter((t) => SHOWN_THEMES.includes(t) && !['opening', 'middlegame', 'endgame'].includes(t)).map((t) => THEME_LABELS[t]).slice(0, 3).join(' · ')

/* ------------------------------------------------------------------ rated puzzles */
function Rated({ set, stats, update, filter, title, rated = true, onExit }) {
  const [p, setP] = useState(() => pick(set, stats.rating, stats.seen, filter))
  const [res, setRes] = useState(null) // { ok, delta }
  const [round, setRound] = useState(0) // Retry remounts the board
  const counted = useRef(false)
  useEffect(() => { counted.current = false; setRes(null) }, [p.id])
  const next = () => setP(pick(set, stats.rating, stats.seen, filter))
  const onDone = (ok, info = {}) => {
    if (counted.current) return
    if (!ok && !info.firstFail && !info.revealed && info.usedHint === undefined) return
    counted.current = true
    const delta = rated ? rateChange(stats.rating, p.rating, ok, stats.played) : 0
    setRes({ ok, delta })
    update((s) => {
      const ts = { ...s.themeStats }
      for (const t of p.themes) { const e = ts[t] || [0, 0]; ts[t] = [e[0] + (ok ? 1 : 0), e[1] + 1] }
      return {
        ...s, rating: Math.max(100, s.rating + delta), played: s.played + 1, solved: s.solved + (ok ? 1 : 0),
        history: rated ? [...s.history, s.rating + delta].slice(-100) : s.history, seen: remember(s.seen, p.id), themeStats: ts,
      }
    })
  }
  return (
    <PuzzleBoard key={`${p.id}-${round}`} puzzle={p} onDone={onDone}
      header={(
        <div className="arena-head">
          <div>
            <strong>{title}</strong>
            <span className="small muted">{res ? `Puzzle rating ${p.rating}` : 'Puzzle rating hidden until you finish'}{res && themeText(p) ? ` · ${themeText(p)}` : ''}</span>
          </div>
          {rated && <div className="arena-rating" title="Your puzzle rating"><span className="small muted">Rating</span><strong>{stats.rating}</strong>
            {res && <span className={res.delta >= 0 ? 'up' : 'down'}>{res.delta >= 0 ? '+' : ''}{res.delta}</span>}</div>}
        </div>
      )}
      extra={(done, { showHint, showSolution, state, hint }) => (
        <>
          {res && !res.ok && <p className="small muted">You can still finish it for practice - it already counted as a miss.</p>}
          <div className="solver-actions">
            {!done && <>
              <button className="secondary" onClick={showHint} disabled={state !== 'solving'}><IconBulb /> {hint ? 'Show move' : 'Hint'}</button>
              <button className="secondary" onClick={showSolution} disabled={state !== 'solving'}><IconStar size={18} /> Solution</button>
            </>}
            {done && <button className="secondary" onClick={() => setRound((r) => r + 1)}><IconRetry /> Retry</button>}
            <button className="next-btn" onClick={next}>{done ? 'Next puzzle' : 'Skip'} <IconArrowRight /></button>
          </div>
          {onExit && <button className="link-btn" onClick={onExit}>← All themes</button>}
          {rated && stats.history.length > 1 && <Spark values={stats.history} />}
          <p className="small muted">{stats.played} played · {stats.played ? Math.round((100 * stats.solved) / stats.played) : 0}% solved</p>
        </>
      )}
    />
  )
}

function Spark({ values }) {
  const w = 240, h = 44
  const min = Math.min(...values), max = Math.max(...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 4 - ((v - min) / Math.max(1, max - min)) * (h - 8)}`).join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label={`Rating trend, last ${values.length} puzzles: ${values[0]} to ${values[values.length - 1]}`}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

/* ------------------------------------------------------------------ puzzle rush */
const RUSH_MODES = [['3', '3 minutes', 180], ['5', '5 minutes', 300], ['survival', 'Survival', 0]]
function Rush({ set, stats, update }) {
  const [mode, setMode] = useState(null)
  const [run, setRun] = useState(null) // { i, score, strikes, list, end, p }
  const [, tick] = useState(0)
  const seen = useRef(new Set())
  const nextPuzzle = (i) => {
    const target = 500 + i * 55 + (i > 20 ? (i - 20) * 40 : 0) // starts easy, ramps up
    const p = pick(set, target, [...seen.current], (q) => q.moves.length <= 8)
    seen.current.add(p.id)
    return p
  }
  const start = (m) => {
    seen.current = new Set()
    const secs = RUSH_MODES.find((x) => x[0] === m)[2]
    setMode(m)
    setRun({ i: 0, k: 0, score: 0, strikes: 0, list: [], end: secs ? Date.now() + secs * 1000 : null, p: nextPuzzle(0), over: false })
  }
  useEffect(() => {
    if (!run || run.over || !run.end) return
    const t = setInterval(() => { if (Date.now() >= run.end) setRun((r) => ({ ...r, over: true })); tick((n) => n + 1) }, 200)
    return () => clearInterval(t)
  }, [run?.end, run?.over]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!run?.over) return
    update((s) => ({ ...s, rush: { ...s.rush, [mode]: Math.max(s.rush[mode] || 0, run.score) } }))
  }, [run?.over]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!run) {
    return (
      <section className="card rush-start">
        <h3>Puzzle Rush</h3>
        <p className="muted">Solve as many as you can. Puzzles start easy and get harder. Three wrong answers and you're out.</p>
        <div className="rush-modes">
          {RUSH_MODES.map(([k, label]) => (
            <button key={k} className="rush-mode" onClick={() => start(k)}>
              <strong>{label}</strong>
              <span className="small muted">{k === 'survival' ? 'No clock - 3 strikes' : 'Beat the clock - 3 strikes'}</span>
              <span className="small">Best: <b>{stats.rush[k] || 0}</b></span>
            </button>
          ))}
        </div>
      </section>
    )
  }
  if (run.over) {
    const best = stats.rush[mode] || 0
    return (
      <section className="card rush-over">
        <h3>Puzzle Rush - {RUSH_MODES.find((x) => x[0] === mode)[1]}</h3>
        <div className="rush-score"><strong>{run.score}</strong><span className="muted">{run.score >= best ? 'New personal best!' : `Best: ${best}`}</span></div>
        <ol className="rush-list">
          {run.list.map((x, i) => <li key={i} className={x.ok ? 'ok' : 'bad'}><span>{x.ok ? '✓' : '✗'}</span> {x.rating}</li>)}
        </ol>
        <div className="solver-actions end">
          <button className="big-green" onClick={() => start(mode)}>Play again</button>
          <button className="secondary" onClick={() => setRun(null)}>Change mode</button>
        </div>
      </section>
    )
  }
  const left = run.end ? Math.max(0, run.end - Date.now()) : null
  const onDone = (ok) => {
    setRun((r) => {
      if (r.over) return r
      const strikes = r.strikes + (ok ? 0 : 1)
      const list = [...r.list, { ok, rating: r.p.rating }]
      const over = strikes >= 3
      return { ...r, score: r.score + (ok ? 1 : 0), strikes, list, over, i: r.i + 1 }
    })
    setTimeout(() => setRun((r) => (r.over ? r : { ...r, p: nextPuzzle(r.i), k: r.k + 1 })), ok ? 250 : 700)
  }
  return (
    <PuzzleBoard key={`${run.p.id}-${run.k}`} puzzle={run.p} rush onDone={onDone}
      header={(
        <div className="rush-bar">
          <div className="rush-score small-score"><strong>{run.score}</strong><span className="small muted">solved</span></div>
          {left != null && <div className={`clock ${left < 20000 ? 'low' : ''}`}>{Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}</div>}
          <div className="strikes" aria-label={`${run.strikes} of 3 strikes`}>{[0, 1, 2].map((i) => <span key={i} className={i < run.strikes ? 'x on' : 'x'}>✗</span>)}</div>
        </div>
      )}
      extra={() => (
        <>
          <div className="rush-trail">{run.list.slice(-12).map((x, i) => <span key={i} className={x.ok ? 'ok' : 'bad'}>{x.ok ? '✓' : '✗'}</span>)}</div>
          <button className="link-btn" onClick={() => setRun((r) => ({ ...r, over: true }))}>End run</button>
        </>
      )}
    />
  )
}

/* ------------------------------------------------------------------ daily puzzle */
function Daily({ set, stats, update }) {
  const d = today()
  const p = useMemo(() => {
    const pool = set.filter((q) => q.rating >= 1400 && q.rating <= 2100 && q.moves.length >= 4)
    let h = 0
    for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return pool[h % pool.length]
  }, [set, d])
  const done = stats.daily[d]
  const onDone = (ok) => {
    if (stats.daily[d] != null) return
    update((s) => {
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const streak = ok ? (s.daily[y] ? s.dailyStreak + 1 : 1) : 0
      return { ...s, daily: { ...s.daily, [d]: ok ? 1 : 0 }, dailyStreak: streak }
    })
  }
  return (
    <PuzzleBoard key={p.id} puzzle={p} onDone={(ok, info = {}) => { if (ok || info.firstFail || info.revealed) onDone(ok) }}
      header={(
        <div className="arena-head">
          <div><strong>Daily puzzle</strong><span className="small muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · rating {p.rating}</span></div>
          <div className="arena-rating"><span className="small muted">Streak</span><strong>{stats.dailyStreak}🔥</strong></div>
        </div>
      )}
      extra={(fin, { showHint, showSolution, state, hint }) => (
        <>
          {done != null && <p className="small">{done ? 'Solved today - come back tomorrow for a new one.' : 'Missed today - your streak restarts tomorrow.'}</p>}
          {!fin && <div className="solver-actions">
            <button className="secondary" onClick={showHint} disabled={state !== 'solving'}><IconBulb /> {hint ? 'Show move' : 'Hint'}</button>
            <button className="secondary" onClick={showSolution} disabled={state !== 'solving'}><IconStar size={18} /> Solution</button>
          </div>}
        </>
      )}
    />
  )
}

/* ------------------------------------------------------------------ themes */
function Themes({ set, stats, update }) {
  const [theme, setTheme] = useState(null)
  const counts = useMemo(() => {
    const c = {}
    for (const p of set) for (const t of p.themes) c[t] = (c[t] || 0) + 1
    return c
  }, [set])
  if (theme) {
    return <Rated key={theme} set={set} stats={stats} update={update} rated={false} title={THEME_LABELS[theme] || theme} filter={(p) => p.themes.includes(theme)} onExit={() => setTheme(null)} />
  }
  return (
    <section className="card">
      <h3>Practise by theme</h3>
      <p className="small muted">Unrated practice. Puzzles are picked near your rating ({stats.rating}). The bar shows how often you solve each theme.</p>
      <div className="theme-grid">
        {SHOWN_THEMES.filter((t) => counts[t] >= 8).map((t) => {
          const [ok, n] = stats.themeStats[t] || [0, 0]
          return (
            <button key={t} className="theme-tile" onClick={() => setTheme(t)}>
              <strong>{THEME_LABELS[t]}</strong>
              <span className="small muted">{counts[t]} puzzles{n ? ` · ${Math.round((100 * ok) / n)}% of ${n}` : ''}</span>
              <span className="theme-bar"><span style={{ width: n ? `${(100 * ok) / n}%` : 0 }} /></span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ hub */
export const ARENA_TABS = [['rated', 'Puzzles'], ['rush', 'Puzzle Rush'], ['daily', 'Daily'], ['themes', 'Themes']]
export default function Arena({ tab }) {
  const [set, err] = usePuzzleSet()
  const [stats, update] = useStats()
  if (err) return <section className="card"><p className="error">Couldn't load the puzzles ({err}). Check your connection and reload.</p></section>
  if (!set) return <div className="card page-loading muted">Loading puzzles...</div>
  if (tab === 'rush') return <Rush set={set} stats={stats} update={update} />
  if (tab === 'daily') return <Daily set={set} stats={stats} update={update} />
  if (tab === 'themes') return <Themes set={set} stats={stats} update={update} />
  return <Rated set={set} stats={stats} update={update} title="Rated puzzle" />
}
