// Drills, like Chess.com's: play a set position out against Stockfish and reach a goal -
// checkmate, promote, win (reach a winning evaluation) or hold (don't lose it).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import DRILLS from './drills.json'
import { getBotEngine } from '../review/engine'
import { useCustomPieces } from '../BoardPicker'
import { useWidth } from '../insights/Visuals'
import { IconArrowRight, IconBulb, IconRetry } from '../review/icons'

export const DRILL_CATS = [
  ['att', 'Attacking', 'Go for the king: forced mates and sacrifices.'],
  ['def', 'Defending', 'Find the only defence - one careless move loses.'],
  ['fund', 'Endgame Fundamentals', 'The basic mates and pawn endings everyone must know.'],
  ['endp', 'Endgame Practice', 'Convert winning endgames and hold the draws.'],
  ['imb', 'Imbalances', 'Queen vs rook, rook vs minor piece and other uneven fights.'],
]
const KEY = 'smc-drills-v1'
const readProgress = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }
const saveProgress = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* private mode */ } }

const ENGINE_DEPTH = 13
const fmt = (cp) => (Math.abs(cp) >= 9000 ? (cp > 0 ? 'mate' : 'getting mated') : `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(1)}`)
const cpOf = (line) => (!line ? 0 : line.mate != null ? (line.mate > 0 ? 10000 - line.mate : -10000 - line.mate) : line.cp)

/** Win drills must improve on where they start: at least +2.5 better than the start. */
const winTarget = (d) => Math.max(d.target || 500, (d.startEval ?? 0) + 250)

export function goalText(d) {
  const n = d.moves ? ` in ${d.moves} moves` : ''
  return d.goal === 'mate' ? `Checkmate${n}` : d.goal === 'promote' ? 'Promote a pawn' : d.goal === 'win' ? `Win: reach +${(winTarget(d) / 100).toFixed(1)} or win all their pieces${n}` : `Hold for ${d.moves || 20} moves`
}
/** The evaluation (your side) below which a hold / win drill counts as failed. */
const holdLine = (d) => Math.max(-150, Math.min((d.startEval ?? 0) - 250, 100))

/* ------------------------------------------------------------------ play one drill */
function DrillBoard({ drill, onBack, onNext, onFinish }) {
  const customPieces = useCustomPieces()
  const [wrap, W] = useWidth(480)
  const size = Math.max(260, Math.min(W, 560))
  const me = drill.fen.split(' ')[1]
  const [round, setRound] = useState(0)
  const [fen, setFen] = useState(drill.fen)
  const [history, setHistory] = useState([])
  const [state, setState] = useState('play') // play | thinking | won | lost
  const [msg, setMsg] = useState('')
  const [lastMove, setLastMove] = useState(null)
  const [arrow, setArrow] = useState(null)
  const [hints, setHints] = useState(0)
  const [evalNow, setEvalNow] = useState(drill.startEval ?? null)
  const [sel, setSel] = useState(null)
  const live = useRef(0)
  const myMoves = Math.ceil(history.length / 2)

  useEffect(() => {
    live.current++
    setFen(drill.fen); setHistory([]); setState('play'); setMsg(''); setLastMove(null); setArrow(null); setHints(0); setEvalNow(drill.startEval ?? null); setSel(null)
  }, [drill.id, round])

  const end = (ok, text, moves) => {
    setState(ok ? 'won' : 'lost'); setMsg(text)
    onFinish(drill, ok, moves, hints)
  }

  /** After your move: check the goal, then let the engine reply and check again. */
  const afterMine = async (g, mv, moves) => {
    const token = live.current
    if (g.isCheckmate()) return end(true, 'Checkmate! Drill complete.', moves)
    const them = me === 'w' ? 'b' : 'w'
    if (drill.goal === 'win' && !g.board().flat().some((p) => p && p.color === them && p.type !== 'k' && p.type !== 'p')) return end(true, 'You won all their pieces - drill complete!', moves)
    if (g.isDraw()) return drill.goal === 'hold' ? end(true, 'Draw - you held it!', moves) : end(false, g.isStalemate() ? 'Stalemate - that\'s only a draw. Leave the king a square!' : 'Draw - the win slipped away.', moves)
    setState('thinking')
    const engine = await getBotEngine()
    const { lines } = await engine.evaluate(g.fen(), ENGINE_DEPTH)
    if (token !== live.current) return
    const mine = -cpOf(lines[0]) // engine reports for its own side
    setEvalNow(mine)
    if (mv.promotion && drill.goal === 'promote') return mine >= 300 ? end(true, `Promoted! ${fmt(mine)} - drill complete.`, moves) : end(false, 'You promoted, but the new queen is lost or the position isn\'t winning.', moves)
    if (drill.goal === 'win' && mine >= winTarget(drill)) return end(true, `Winning position reached (${fmt(mine)}). Drill complete!`, moves)
    if (drill.goal === 'hold' && mine < holdLine(drill)) return end(false, `That move lets the opponent in (${fmt(mine)}). Try again.`, moves)
    if ((drill.goal === 'win' || drill.goal === 'mate' || drill.goal === 'promote') && mine < Math.min(100, (drill.startEval ?? 300) - 300)) return end(false, `The advantage is gone (${fmt(mine)}). Try again.`, moves)
    if (drill.goal === 'hold' && moves >= (drill.moves || 20)) return end(true, `You held for ${moves} moves - drill complete!`, moves)
    if (drill.moves && drill.goal !== 'hold' && moves >= drill.moves) return end(false, `Out of moves (${drill.moves}). Try a faster plan.`, moves)
    // engine replies with its best move
    const best = lines[0]?.pv?.[0]
    if (!best) return
    const reply = g.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] })
    setFen(g.fen()); setLastMove({ from: reply.from, to: reply.to }); setHistory((h) => [...h, reply.san])
    if (g.isCheckmate()) return end(false, 'You got checkmated.', moves)
    if (g.isDraw()) return drill.goal === 'hold' ? end(true, 'Draw - you held it!', moves) : end(false, 'Draw - the win slipped away.', moves)
    setState('play')
  }

  const tryMove = (from, to) => {
    setSel(null)
    if (state !== 'play' || new Chess(fen).turn() !== me) return false
    const g = new Chess(fen)
    let mv
    try { mv = g.move({ from, to, promotion: 'q' }) } catch { return false }
    setFen(g.fen()); setLastMove({ from, to }); setArrow(null)
    const moves = myMoves + 1
    setHistory((h) => [...h, mv.san])
    afterMine(g, mv, moves)
    return true
  }

  const hint = async () => {
    if (state !== 'play') return
    const engine = await getBotEngine()
    const { lines } = await engine.evaluate(fen, 14)
    const b = lines[0]?.pv?.[0]
    if (b) { setArrow([b.slice(0, 2), b.slice(2, 4), 'rgba(80,160,60,0.9)']); setHints((h) => h + 1) }
  }

  const targets = useMemo(() => (sel && state === 'play' ? new Chess(fen).moves({ square: sel, verbose: true }) : []), [sel, fen, state])
  const lastTap = useRef({ sq: null, t: 0 })
  const tap = (sq) => {
    const now = performance.now()
    if (lastTap.current.sq === sq && now - lastTap.current.t < 250) return
    lastTap.current = { sq, t: now }
    if (state !== 'play') return
    if (sel && targets.some((t) => t.to === sq)) { tryMove(sel, sq); return }
    const p = new Chess(fen).get(sq)
    setSel(p && p.color === me && sq !== sel ? sq : null)
  }
  const styles = {}
  if (lastMove) { styles[lastMove.from] = { background: 'rgba(227,178,60,0.35)' }; styles[lastMove.to] = { background: 'rgba(227,178,60,0.55)' } }
  if (sel) styles[sel] = { background: 'rgba(255,214,102,0.6)' }
  for (const t of targets) styles[t.to] = t.captured ? { background: 'radial-gradient(circle, transparent 58%, rgba(20,20,20,0.35) 60%)' } : { background: 'radial-gradient(circle, rgba(20,20,20,0.32) 22%, transparent 24%)' }

  const rows = []
  const offset = me === 'b' ? 1 : 0 // black to move: first row starts with "..."
  const h = [...Array(offset).fill('...'), ...history]
  for (let i = 0; i < h.length; i += 2) rows.push([h[i], h[i + 1]])
  const startNo = +drill.fen.split(' ')[5] || 1
  const done = state === 'won' || state === 'lost'

  return (
    <div className="solver-layout drill-play">
      <div className="solver-board" ref={wrap}>
        <div className="board-wrap" style={{ width: size, height: size }}>
          <Chessboard
            id={`drill-${drill.id}`} position={fen} boardWidth={size}
            boardOrientation={me === 'w' ? 'white' : 'black'}
            arePiecesDraggable={state === 'play'}
            isDraggablePiece={({ piece }) => piece[0] === me}
            onPieceDrop={tryMove} autoPromoteToQueen
            onSquareClick={tap} onPieceClick={(p, sq) => tap(sq)}
            onPieceDragBegin={(p, sq) => { if (state === 'play' && p[0] === me) setSel(sq) }} onPieceDragEnd={() => setSel(null)}
            customSquareStyles={styles} customArrows={arrow ? [arrow] : []}
            customPieces={customPieces}
            customDarkSquareStyle={{ backgroundColor: 'var(--rb-dark)', backgroundImage: 'var(--rb-dark-img, none)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--rb-light)', backgroundImage: 'var(--rb-light-img, none)' }}
            animationDuration={200}
          />
        </div>
      </div>
      <div className="solver-side card">
        <div className="arena-head">
          <div><strong>{drill.name}</strong><span className="small muted">{DRILL_CATS.find((c) => c[0] === drill.cat)?.[1]} · you play {me === 'w' ? 'White' : 'Black'}</span></div>
          <div className="arena-rating"><span className="small muted">Moves</span><strong>{myMoves}{drill.moves ? <span className="small muted">/{drill.moves}</span> : null}</strong></div>
        </div>
        <div className="drill-goal"><span className="small muted">Goal</span><strong>{goalText(drill)}</strong></div>
        <p className="small">{drill.desc}</p>
        <div className={`solver-msg ${state === 'won' ? 'good' : state === 'lost' ? 'bad' : ''}`} role="status">
          {state === 'thinking' ? 'Engine is thinking...' : msg || (state === 'play' ? 'Your move.' : '')}
        </div>
        {done && evalNow != null && <p className="small muted">Engine evaluation for you: {fmt(evalNow)}</p>}
        <div className="bot-moves drill-moves">
          {rows.length ? rows.map(([a, b], i) => (
            <div key={i} className="mv-row"><span className="mv-no">{startNo + i}.</span><span className="mv">{a}</span><span className="mv">{b || ''}</span></div>
          )) : <p className="muted small">The engine will defend with its best moves.</p>}
        </div>
        <div className="solver-actions">
          {!done && <button className="secondary" onClick={hint} disabled={state !== 'play'}><IconBulb /> Hint</button>}
          <button className="secondary" onClick={() => setRound((r) => r + 1)}><IconRetry /> {done ? 'Try again' : 'Restart'}</button>
          {done && <button className="next-btn" onClick={onNext}>Next drill <IconArrowRight /></button>}
        </div>
        {hints > 0 && !done && <p className="small muted">Hints used: {hints}</p>}
        <button className="link-btn" onClick={onBack}>← All drills</button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ menu */
export default function Drills() {
  const [cat, setCat] = useState(null)
  const [drill, setDrill] = useState(null)
  const [progress, setProgress] = useState(readProgress)
  const onFinish = (d, ok, moves, hints) => {
    setProgress((p) => {
      const e = p[d.id] || { tries: 0, done: false, best: null }
      const n = { ...p, [d.id]: { tries: e.tries + 1, done: e.done || ok, best: ok && !hints ? Math.min(e.best ?? Infinity, moves) : e.best } }
      saveProgress(n)
      return n
    })
  }
  if (drill) {
    const list = DRILLS.filter((d) => d.cat === drill.cat)
    const i = list.findIndex((d) => d.id === drill.id)
    return <DrillBoard key={drill.id} drill={drill} onFinish={onFinish} onBack={() => setDrill(null)} onNext={() => setDrill(list[(i + 1) % list.length])} />
  }
  if (cat) {
    const c = DRILL_CATS.find((x) => x[0] === cat)
    const list = DRILLS.filter((d) => d.cat === cat)
    const done = list.filter((d) => progress[d.id]?.done).length
    return (
      <section className="card drills-cat">
        <button className="link-btn" onClick={() => setCat(null)}>← Drills</button>
        <h3>{c[1]}</h3>
        <p className="small muted">{c[2]} {done}/{list.length} completed.</p>
        <div className="drill-list">
          {list.map((d) => {
            const pr = progress[d.id]
            return (
              <button key={d.id} className={`drill-item ${pr?.done ? 'done' : ''}`} onClick={() => setDrill(d)}>
                <span className="drill-check" aria-hidden="true">{pr?.done ? '✓' : ''}</span>
                <span className="drill-name"><strong>{d.name}</strong><span className="small muted">{goalText(d)}{d.rating ? ` · ${d.rating}` : ''}</span></span>
                <span className="small muted">{pr?.best ? `best ${pr.best} moves` : pr?.tries ? `${pr.tries} tries` : ''}</span>
              </button>
            )
          })}
        </div>
      </section>
    )
  }
  const total = DRILLS.length
  const doneAll = DRILLS.filter((d) => progress[d.id]?.done).length
  return (
    <section className="card drills-home">
      <h3>Drills</h3>
      <p className="small muted">Play key positions out against Stockfish until you reach the goal. {doneAll}/{total} completed.</p>
      <div className="drill-cats">
        {DRILL_CATS.map(([k, label, blurb]) => {
          const list = DRILLS.filter((d) => d.cat === k)
          const d = list.filter((x) => progress[x.id]?.done).length
          return (
            <button key={k} className="drill-cat" onClick={() => setCat(k)}>
              <strong>{label}</strong>
              <span className="small muted">{blurb}</span>
              <span className="theme-bar"><span style={{ width: `${(100 * d) / list.length}%` }} /></span>
              <span className="small muted">{d}/{list.length}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
