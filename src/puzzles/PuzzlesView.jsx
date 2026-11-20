import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { ANALYSE_TIPS, THEMES } from './puzzleBuilder'
import { winPct } from '../review/reviewCore'
import { getEngine } from '../review/engine'
import { useWidth, Chips } from '../insights/Visuals'
import { IconArrowRight, IconBulb, IconRetry, IconStar } from '../review/icons'

const STATUS = { new: 'New', solved: 'Solved', failed: 'Failed', retried: 'Solved with help' }
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const tcLabel = (tc) => {
  if (!tc) return ''
  if (tc.includes('/')) return 'daily'
  const [b, inc] = tc.split('+').map(Number)
  return `${Math.round(b / 60)}|${inc || 0}`
}

/* ------------------------------------------------------------------ list */
function PuzzleList({ store, filter, setFilter, status, setStatus, list, onSolve, onReview }) {
  const total = store.puzzles.length
  const tried = store.puzzles.filter((p) => p.attempts > 0)
  const solved = store.puzzles.filter((p) => p.status === 'solved').length
  const themes = [...new Set(store.puzzles.map((p) => p.theme))]
  const next = list.find((p) => p.status === 'new' || p.status === 'failed') || list[0]
  return (
    <>
      <section className="tiles">
        <div className="tile"><strong>{total}</strong><span>puzzles in your list</span></div>
        <div className="tile"><strong>{tried.length ? `${Math.round((100 * solved) / tried.length)}%` : '-'}</strong><span>solved first try</span></div>
        <div className="tile"><strong>{store.streak}</strong><span>current streak</span></div>
        <div className="tile"><strong>{store.bestStreak}</strong><span>best streak</span></div>
      </section>
      <section className="card">
        <h3>My puzzles</h3>
        {!total ? (
          <div className="empty-puzzles">
            <p>Your list is empty. Puzzles come from your own mistakes:</p>
            <ol className="small">
              <li>Open <strong>Game Review</strong> and analyse one of your games.</li>
              <li>In the <strong>Game report</strong>, pick the mistakes you want to practise.</li>
              <li>Press <strong>Add puzzles to my list</strong>, then solve them here.</li>
            </ol>
          </div>
        ) : (
          <>
            <div className="puzzle-filters">
              <Chips label="Theme" value={filter} onChange={setFilter} options={[['all', 'All themes'], ...themes.map((t) => [t, THEMES[t].label])]} />
              <Chips label="Status" value={status} onChange={setStatus} options={[['todo', 'To do'], ['failed', 'Failed'], ['solved', 'Solved'], ['all', 'All']]} />
            </div>
            {next && <button className="big-green solve-next" onClick={() => onSolve(next.id)}><IconStar size={22} /> {list.some((p) => p.attempts) ? 'Continue solving' : 'Start solving'} ({list.length})</button>}
            <ul className="puzzle-list">
              {list.map((p) => {
                const t = THEMES[p.theme]
                return (
                  <li key={p.id}>
                    <span className="theme-badge big" title={t.label}>{t.icon}</span>
                    <div className="pl-main">
                      <strong>{t.label}{p.mateIn ? ` · mate in ${p.mateIn}` : ''}</strong>
                      <span className="small">vs {p.opp}{p.oppRating ? ` (${p.oppRating})` : ''} · {fmtDate(p.date)} · {tcLabel(p.timeControl)} · move {p.moveNo}</span>
                      <span className="muted small">You played {p.playedSan} ({p.playedLabel.toLowerCase()})</span>
                    </div>
                    <span className={`status-pill s-${p.status}`}>{STATUS[p.status]}{p.attempts ? ` · ${p.attempts}×` : ''}</span>
                    <div className="pl-actions">
                      <button onClick={() => onSolve(p.id)}>Solve</button>
                      {store.games[p.gameKey]?.pgn && <button className="secondary" onClick={() => onReview(store.games[p.gameKey].pgn)}>Game</button>}
                      <button className="secondary icon-only" onClick={() => store.remove(p.id)} title="Remove from list" aria-label="Remove from list">×</button>
                    </div>
                  </li>
                )
              })}
            </ul>
            {!list.length && <p className="muted small">No puzzles match these filters.</p>}
          </>
        )}
      </section>
    </>
  )
}

/* ------------------------------------------------------------------ solver */
function Solver({ puzzle, store, onNext, onBack, onReview, position: [idx, count] }) {
  const [wrap, W] = useWidth(480)
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 900)
  useEffect(() => { const on = () => setVh(window.innerHeight); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [])
  // fit the column, and on wide screens the window height too (room for the banner)
  const size = Math.max(260, Math.min(W, 560, W > 640 ? vh - 120 : Infinity))
  const [fen, setFen] = useState(puzzle.fen)
  const [step, setStep] = useState(0) // index into puzzle.solution (always the solver's turn)
  const [state, setState] = useState('solving') // solving | checking | wrong | good | solved | revealed
  const [msg, setMsg] = useState('')
  const [mistakes, setMistakes] = useState(0)
  const [help, setHelp] = useState(false)
  const [squares, setSquares] = useState({})
  const [arrows, setArrows] = useState([])
  const recorded = useRef(false)
  const game = store.games[puzzle.gameKey]
  const side = puzzle.color === 'w' ? 'White' : 'Black'

  const reset = useCallback(() => {
    setFen(puzzle.fen); setStep(0); setState('solving'); setMsg(''); setMistakes(0); setHelp(false); setSquares({}); setArrows([]); setSel(null); recorded.current = false
  }, [puzzle.id]) // eslint-disable-line react-hooks/exhaustive-deps -- saving an attempt updates the puzzle object; only reset for a different puzzle
  useEffect(reset, [reset])

  const finish = (ok, firstTry) => {
    if (recorded.current) return
    recorded.current = true
    store.record(puzzle.id, { solved: ok, firstTry })
  }

  const applyUci = (f, u) => {
    const c = new Chess(f)
    const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
    return { fen: c.fen(), m }
  }

  // tap-to-move: the selected piece and the squares it can go to
  const [sel, setSel] = useState(null)
  const targets = useMemo(() => {
    if (!sel || state !== 'solving') return []
    try { return new Chess(fen).moves({ square: sel, verbose: true }) } catch { return [] }
  }, [sel, fen, state])
  const moveDots = useMemo(() => {
    if (!sel || !targets.length) return {}
    const st = { [sel]: { background: 'rgba(255, 214, 102, 0.55)' } }
    for (const t of targets) {
      st[t.to] = t.captured
        ? { background: 'radial-gradient(circle, transparent 58%, rgba(20, 20, 20, 0.35) 60%)' }
        : { background: 'radial-gradient(circle, rgba(20, 20, 20, 0.32) 22%, transparent 24%)' }
    }
    return st
  }, [sel, targets])
  const lastClick = useRef({ sq: null, t: 0 })
  const onSquareClick = (square) => {
    if (state !== 'solving') return
    // the board can report one tap as both a piece click and a square click
    const now = performance.now()
    if (lastClick.current.sq === square && now - lastClick.current.t < 250) return
    lastClick.current = { sq: square, t: now }
    if (sel && targets.some((t) => t.to === square)) { const from = sel; setSel(null); onDrop(from, square); return }
    const p = new Chess(fen).get(square)
    setSel(p && p.color === puzzle.color && square !== sel ? square : null)
  }

  const onDrop = (from, to) => {
    setSel(null)
    if (state !== 'solving') return false
    const c = new Chess(fen)
    let mv
    const want = puzzle.solution[step]
    try { mv = c.move({ from, to, promotion: want && want.slice(0, 4) === from + to && want[4] ? want[4] : 'q' }) } catch { return false }
    const uci = mv.from + mv.to + (mv.promotion || '')
    const after = c.fen()
    const hl = (color) => ({ [mv.from]: { background: `${color}55` }, [mv.to]: { background: `${color}aa` } })

    const success = (text) => {
      setFen(after); setSquares(hl('#7fae3c')); setArrows([])
      const reply = puzzle.solution[step + 1]
      if (reply && puzzle.solution[step + 2]) {
        setState('good'); setMsg(text || 'Best move! Keep going.')
        setTimeout(() => {
          const r = applyUci(after, reply)
          setFen(r.fen); setSquares({ [r.m.from]: { background: '#ffffff33' }, [r.m.to]: { background: '#ffffff55' } })
          setStep(step + 2); setState('solving'); setMsg('')
        }, 650)
      } else {
        setState('solved'); setMsg(text || 'Puzzle solved!')
        finish(true, mistakes === 0 && !help)
      }
    }
    const wrong = (text) => {
      setFen(after); setSquares(hl('#d63a3a')); setState('wrong'); setMsg(text || 'Incorrect - try again.')
      setMistakes((n) => n + 1)
      setTimeout(() => { setFen((f) => (f === after ? fen : f)); setSquares({}); setState((s) => (s === 'wrong' ? 'solving' : s)) }, 900)
    }

    if (uci === want) { success(); return true }
    if (c.isCheckmate()) { setFen(after); setSquares(hl('#7fae3c')); setState('solved'); setMsg('Checkmate! Puzzle solved.'); finish(true, mistakes === 0 && !help); return true }
    // other moves: on the first move, accept anything the engine rates almost as good
    if (step === 0 && puzzle.theme !== 'mate') {
      setFen(after); setSquares(hl('#ffffff')); setState('checking'); setMsg('Checking your move...')
      ;(async () => {
        const engine = await getEngine()
        const ev = await engine.evaluate(after, 14)
        const top = ev.lines[0] || { cp: 0 }
        const mine = top.mate != null ? { mate: -top.mate } : { cp: -top.cp }
        const loss = Math.max(0, puzzle.wBest - winPct(mine)) / 100
        if (loss <= 0.02) { setSquares(hl('#7fae3c')); setState('solved'); setMsg(`${mv.san} also works! The engine's top move was ${puzzle.bestSan}.`); finish(true, mistakes === 0 && !help) }
        else { setFen(fen); wrong(`${mv.san} isn't it - try again.`) }
      })()
      return true
    }
    wrong()
    return true
  }

  const hint = () => {
    const u = puzzle.solution[step]
    if (!u) return
    setHelp(true)
    setSquares({ [u.slice(0, 2)]: { background: '#e3b23caa', boxShadow: 'inset 0 0 0 3px #e3b23c' } })
  }
  const reveal = async () => {
    setHelp(true); setState('revealed'); finish(false, false)
    let f = fen
    for (let i = step; i < puzzle.solution.length; i++) {
      const u = puzzle.solution[i]
      setArrows([[u.slice(0, 2), u.slice(2, 4), i % 2 === step % 2 ? 'rgba(80,160,60,0.9)' : 'rgba(200,80,60,0.85)']])
      await new Promise((r) => setTimeout(r, 650))
      const r = applyUci(f, u)
      f = r.fen
      setFen(f); setSquares({ [r.m.from]: { background: '#e3b23c55' }, [r.m.to]: { background: '#e3b23caa' } })
      await new Promise((r2) => setTimeout(r2, 350))
    }
    setArrows([]); setMsg(`Solution: ${puzzle.bestLine.join(' ')}`)
  }

  const t = THEMES[puzzle.theme]
  const banner = state === 'solved' ? { cls: 'ok', text: 'Puzzle solved!' }
    : state === 'wrong' ? { cls: 'bad', text: 'Incorrect' }
    : state === 'revealed' ? { cls: 'help', text: 'Solution shown' }
    : { cls: puzzle.color === 'w' ? 'white' : 'black', text: `${side} to move` }
  return (
    <div className="solver">
      <div className="solver-top">
        <button className="secondary" onClick={onBack}>← My puzzles</button>
        <span className="muted small">Puzzle {idx + 1} of {count} · streak {store.streak}</span>
      </div>
      <div className="solver-layout">
        <div className="solver-board" ref={wrap}>
          <div className={`turn-banner ${banner.cls}`}>{banner.text}</div>
          <div className="board-wrap" style={{ width: size, height: size }}>
            <Chessboard
              id="puzzle-board" position={fen} boardWidth={size}
              boardOrientation={puzzle.color === 'w' ? 'white' : 'black'}
              arePiecesDraggable={state === 'solving'}
              isDraggablePiece={({ piece }) => piece[0] === puzzle.color}
              onPieceDrop={onDrop} autoPromoteToQueen
              onSquareClick={onSquareClick}
              onPieceClick={(piece, square) => onSquareClick(square)}
              onPieceDragBegin={(piece, square) => { if (state === 'solving' && piece[0] === puzzle.color) setSel(square) }}
              onPieceDragEnd={() => setSel(null)}
              customSquareStyles={{ ...squares, ...moveDots }} customArrows={arrows}
              customDarkSquareStyle={{ backgroundColor: 'var(--rb-dark)' }} customLightSquareStyle={{ backgroundColor: 'var(--rb-light)' }}
              animationDuration={200}
            />
          </div>
        </div>
        <div className="solver-side card">
          <div className="puzzle-theme"><span className="theme-badge big">{t.icon}</span><div><strong>{t.label}{puzzle.mateIn ? ` - mate in ${puzzle.mateIn}` : ''}</strong><span className="muted small">{t.blurb}</span></div></div>
          <div className={`solver-msg ${state}`}>
            {state === 'solving' && !msg && <>Find the best move for <strong>{side}</strong>.</>}
            {msg}
          </div>
          <div className="puzzle-story">
            <h5>What happened in your game</h5>
            <p className="small">
              You played <strong>{puzzle.playedSan}</strong> here - {/^[aeiou]/i.test(puzzle.playedLabel) ? 'an' : 'a'} {puzzle.playedLabel.toLowerCase()}.{' '}
              {puzzle.wrongText || (puzzle.playedLine?.length > 1 ? `The game went ${puzzle.playedLine.join(' ')}, and your position got worse.` : 'It made your position worse.')}
            </p>
            {(state === 'solved' || state === 'revealed') ? (
              <>
                <h5>Why {puzzle.bestSan} is the answer</h5>
                <p className="small">
                  {puzzle.betterText || `${puzzle.bestSan} is the engine's choice: ${puzzle.bestLine.join(' ')}.`}{' '}
                  Compare that with your {puzzle.playedSan}: {puzzle.wrongText ? 'instead of keeping control, it handed your opponent the chance described above.' : 'it gave your opponent an easier game.'}
                </p>
                <p className="small muted">Engine line: {(puzzle.bestLineFull || puzzle.bestLine).join(' ')}</p>
              </>
            ) : (
              <>
                <h5>How to work it out</h5>
                <ol className="small tips-list">{(ANALYSE_TIPS[puzzle.theme] || ANALYSE_TIPS.best).map((t) => <li key={t}>{t}</li>)}</ol>
              </>
            )}
          </div>
          <div className="from-game">
            <span className="muted small">From your game</span>
            <strong>vs {puzzle.opp}{puzzle.oppRating ? ` (${puzzle.oppRating})` : ''}</strong>
            <span className="small">{fmtDate(puzzle.date)} · {tcLabel(puzzle.timeControl)}{game?.result ? ` · result ${game.result}` : ''}</span>
            <span className="small">Move {puzzle.moveNo}: you played <strong>{puzzle.playedSan}</strong> - a {puzzle.playedLabel.toLowerCase()}.</span>
            <div className="from-links">
              {puzzle.url && <a href={puzzle.url} target="_blank" rel="noreferrer">View on Chess.com ↗</a>}
              {game?.pgn && <button className="link-btn" onClick={() => onReview(game.pgn)}>Review this game</button>}
            </div>
          </div>
          <div className="solver-actions">
            {(state === 'solving' || state === 'wrong') && <>
              <button className="secondary" onClick={hint}><IconBulb /> Hint</button>
              <button className="secondary" onClick={reveal}><IconStar size={18} /> Solution</button>
            </>}
            {(state === 'solved' || state === 'revealed') && <button className="secondary" onClick={reset}><IconRetry /> Retry</button>}
            <button className="next-btn" onClick={onNext}>{state === 'solved' || state === 'revealed' ? 'Next puzzle' : 'Skip'} <IconArrowRight /></button>
          </div>
          {puzzle.attempts > 0 && <p className="muted small">Tried {puzzle.attempts}× · solved first try {puzzle.solvedCount}×</p>}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ page */
export default function PuzzlesView({ store, onReview }) {
  const [filter, setFilter] = useState('all')
  const [status, setStatus] = useState('todo')
  const [current, setCurrent] = useState(null)
  const list = useMemo(() => store.puzzles
    .filter((p) => filter === 'all' || p.theme === filter)
    .filter((p) => status === 'all' || (status === 'todo' ? p.status === 'new' || p.status === 'failed' || p.status === 'retried' : status === 'failed' ? p.status === 'failed' : p.status === 'solved'))
    .sort((a, b) => (a.status === 'new') - (b.status === 'new') || b.added - a.added), [store.puzzles, filter, status])

  // keep a stable queue while solving, even as statuses change
  const [queue, setQueue] = useState([])
  const start = (id) => {
    const q = list.map((p) => p.id)
    setQueue(q.includes(id) ? q : [id, ...q])
    setCurrent(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const puzzle = store.puzzles.find((p) => p.id === current)
  if (puzzle) {
    const i = queue.indexOf(puzzle.id)
    const next = () => { const n = queue[i + 1]; if (n && store.puzzles.some((p) => p.id === n)) setCurrent(n); else setCurrent(null) }
    return <Solver key={puzzle.id} puzzle={puzzle} store={store} position={[Math.max(0, i), queue.length]} onNext={next} onBack={() => setCurrent(null)} onReview={onReview} />
  }
  return <PuzzleList store={store} filter={filter} setFilter={setFilter} status={status} setStatus={setStatus} list={list} onSolve={start} onReview={onReview} />
}
