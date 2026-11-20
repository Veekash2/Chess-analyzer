// Opening practice, like Chess.com's: pick an opening, LEARN the moves with arrows and
// explanations, then PRACTISE them from memory while the opponent varies its replies.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { COURSES, COMMON_NOTES, getProgress, markLine, mastered } from './courses'
import { useWidth } from '../insights/Visuals'
import { useCustomPieces } from '../BoardPicker'
import { IconBulb, IconFlip, IconRetry, IconStar } from '../review/icons'

const GREEN = 'rgba(80,160,60,0.9)'

/* ------------------------------------------------------------------ course list */
function CourseList({ onOpen }) {
  const progress = getProgress()
  return (
    <div className="openings-list">
      {[['w', 'Openings for White'], ['b', 'Openings for Black']].map(([side, title]) => (
        <section key={side} className="card">
          <h3>{title}</h3>
          <div className="course-grid">
            {COURSES.filter((c) => c.side === side).map((c) => {
              const done = mastered(progress, c)
              return (
                <div key={c.id} className="course-card">
                  <div className="course-head">
                    <strong>{c.name}</strong>
                    <span className={`lvl lvl-${c.level.toLowerCase()}`}>{c.level}</span>
                  </div>
                  <p className="small muted">{c.blurb}</p>
                  <div className="course-progress" aria-label={`${done} of ${c.lines.length} lines practised`}>
                    <span style={{ width: `${(done / c.lines.length) * 100}%` }} />
                  </div>
                  <span className="small muted">{done}/{c.lines.length} lines mastered</span>
                  <div className="course-btns">
                    <button className="secondary" onClick={() => onOpen(c, 'learn')}>Learn</button>
                    <button className="big-green slim" onClick={() => onOpen(c, 'practice')}>Practice</button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ trainer */
function Trainer({ course, mode: startMode, onBack, onPlayOut }) {
  const me = course.side
  const customPieces = useCustomPieces()
  const [wrap, W] = useWidth(520)
  const size = Math.max(260, Math.min(W, 560))
  const [mode, setMode] = useState(startMode)
  const [lineIdx, setLineIdx] = useState(0) // learn mode walks the lines in order
  const [history, setHistory] = useState([])
  const [msg, setMsg] = useState(null) // { kind: 'good'|'bad'|'info', text }
  const [mistakes, setMistakes] = useState(0)
  const [hintLevel, setHintLevel] = useState(0)
  const [done, setDone] = useState(null) // finished line
  const [flipped, setFlipped] = useState(me === 'b')
  const [sel, setSel] = useState(null)
  const [lastMove, setLastMove] = useState(null)
  const [round, setRound] = useState(0)
  const fen = useMemo(() => { const g = new Chess(); for (const m of history) g.move(m); return g.fen() }, [history])
  const turn = fen.split(' ')[1]

  // lines still consistent with the game so far
  const pool = mode === 'learn' ? [course.lines[lineIdx]] : course.lines
  const matching = pool.filter((l) => l.moves.length > history.length && history.every((m, i) => l.moves[i] === m))
  const expected = [...new Set(matching.map((l) => l.moves[history.length]))]
  const lineName = matching[0]?.name || done?.name || ''

  // restart a line
  useEffect(() => {
    setHistory([]); setMistakes(0); setHintLevel(0); setDone(null); setLastMove(null); setSel(null)
    setMsg({ kind: 'info', text: mode === 'learn' ? `Learn: ${course.lines[lineIdx].name}. Follow the green arrows.` : `Practice: play ${course.name} from memory. The opponent will mix up its replies.` })
  }, [mode, lineIdx, round, course]) // eslint-disable-line react-hooks/exhaustive-deps

  // finished? (no line continues from here)
  useEffect(() => {
    if (done || !history.length) return
    const cont = pool.some((l) => l.moves.length > history.length && history.every((m, i) => l.moves[i] === m))
    if (cont) return
    const line = pool.find((l) => history.every((m, i) => l.moves[i] === m)) || pool[0]
    const clean = mode === 'practice' && mistakes === 0
    if (mode === 'practice') markLine(course.id, line.name, clean)
    setDone({ name: line.name, clean })
    setMsg({ kind: 'good', text: clean ? 'Perfect! You played the whole line from memory.' : mode === 'learn' ? 'Line complete! Now try it in Practice mode.' : `Line complete with ${mistakes} mistake${mistakes === 1 ? '' : 's'}. Try it again to master it.` })
  }, [history]) // eslint-disable-line react-hooks/exhaustive-deps

  // opponent's reply from the book
  useEffect(() => {
    if (done || turn === me || !expected.length) return
    const t = setTimeout(() => {
      const san = expected[Math.floor(Math.random() * expected.length)]
      const g = new Chess(fen)
      const mv = g.move(san)
      setLastMove({ from: mv.from, to: mv.to })
      setHistory((h) => [...h, san])
    }, history.length ? 550 : 350)
    return () => clearTimeout(t)
  }, [fen, done]) // eslint-disable-line react-hooks/exhaustive-deps

  const noteFor = (san) => course.notes[san] || COMMON_NOTES[san] || null

  const tryMove = (from, to) => {
    if (done || turn !== me) return false
    const g = new Chess(fen)
    let mv
    try { mv = g.move({ from, to, promotion: 'q' }) } catch { return false }
    setSel(null)
    if (expected.includes(mv.san)) {
      const note = noteFor(mv.san)
      setMsg({ kind: 'good', text: `${mv.san} - correct!${note ? ` ${note}` : ''}` })
      setLastMove({ from, to })
      setHintLevel(0)
      setHistory((h) => [...h, mv.san])
      return true
    }
    setMistakes((m) => m + 1)
    setHintLevel((h) => Math.max(h, mode === 'practice' && mistakes >= 1 ? 2 : 1))
    setMsg({ kind: 'bad', text: `${mv.san} is a real move, but it is not the book move here. Try again${mistakes >= 1 ? ' - follow the hint' : ''}.` })
    return false
  }

  // hint: learn mode always shows the arrow; practice hints get stronger each press
  const target = expected.length ? new Chess(fen).move(expected[0]) : null
  const showArrow = target && turn === me && !done && (mode === 'learn' || hintLevel >= 2)
  const showPiece = target && turn === me && !done && mode === 'practice' && hintLevel === 1

  const targets = useMemo(() => (sel && turn === me && !done ? new Chess(fen).moves({ square: sel, verbose: true }) : []), [sel, fen, turn, me, done])
  const lastTap = useRef({ sq: null, t: 0 })
  const tap = (sq) => {
    const now = performance.now()
    if (lastTap.current.sq === sq && now - lastTap.current.t < 250) return
    lastTap.current = { sq, t: now }
    if (done || turn !== me) return
    if (sel && targets.some((t) => t.to === sq)) { tryMove(sel, sq); return }
    const p = new Chess(fen).get(sq)
    setSel(p && p.color === me && sq !== sel ? sq : null)
  }

  const styles = {}
  if (lastMove) { styles[lastMove.from] = { background: 'rgba(227,178,60,0.35)' }; styles[lastMove.to] = { background: 'rgba(227,178,60,0.55)' } }
  if (showPiece) styles[target.from] = { background: 'rgba(80,160,60,0.55)' }
  if (sel) styles[sel] = { background: 'rgba(255,214,102,0.6)' }
  for (const t of targets) styles[t.to] = t.captured ? { background: 'radial-gradient(circle, transparent 58%, rgba(20,20,20,0.35) 60%)' } : { background: 'radial-gradient(circle, rgba(20,20,20,0.32) 22%, transparent 24%)' }

  const rows = []
  for (let i = 0; i < history.length; i += 2) rows.push([history[i], history[i + 1]])
  const nextLine = () => { if (mode === 'learn') setLineIdx((i) => (i + 1) % course.lines.length); setRound((r) => r + 1) }

  return (
    <div className="bot-game opening-trainer">
      <div className="solver-top">
        <button className="secondary" onClick={onBack}>← All openings</button>
        <div className="tabs chips small-chips" role="radiogroup" aria-label="Mode">
          {[['learn', 'Learn'], ['practice', 'Practice']].map(([k, label]) => (
            <button key={k} role="radio" aria-checked={mode === k} className={mode === k ? 'tab active' : 'tab'} onClick={() => setMode(k)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="solver-layout">
        <div className="solver-board" ref={wrap}>
          <div className="board-wrap" style={{ width: size, height: size }}>
            <Chessboard
              id="opening-board" position={fen} boardWidth={size}
              boardOrientation={flipped ? 'black' : 'white'}
              arePiecesDraggable={!done && turn === me}
              isDraggablePiece={({ piece }) => piece[0] === me}
              onPieceDrop={(f, t) => tryMove(f, t)} autoPromoteToQueen
              onSquareClick={tap} onPieceClick={(p, sq) => tap(sq)}
              onPieceDragBegin={(p, sq) => { if (p[0] === me) setSel(sq) }} onPieceDragEnd={() => setSel(null)}
              customSquareStyles={styles}
              customArrows={showArrow ? [[target.from, target.to, GREEN]] : []}
              customPieces={customPieces}
              customDarkSquareStyle={{ backgroundColor: 'var(--rb-dark)', backgroundImage: 'var(--rb-dark-img, none)' }}
              customLightSquareStyle={{ backgroundColor: 'var(--rb-light)', backgroundImage: 'var(--rb-light-img, none)' }}
              animationDuration={200}
            />
          </div>
          <div className="player-bar"><strong>{course.name}</strong><span className="muted small">{lineName}</span>
            <span className="player-extra"><button className="icon-btn" onClick={() => setFlipped(!flipped)} title="Flip board" aria-label="Flip board"><IconFlip /></button></span>
          </div>
        </div>

        <div className="solver-side card">
          <div className="course-title">
            <strong>{course.name}</strong>
            <span className="small muted">You play {me === 'w' ? 'White' : 'Black'} · {mode === 'learn' ? `Line ${lineIdx + 1} of ${course.lines.length}` : `${mistakes} mistake${mistakes === 1 ? '' : 's'}`}</span>
          </div>
          {msg && <div className={`solver-msg ${msg.kind === 'good' ? 'good' : msg.kind === 'bad' ? 'bad' : ''}`} role="status">{msg.text}</div>}
          {!done && turn === me && mode === 'learn' && target && (
            <p className="small opening-why"><strong>Next: {target.san}.</strong> {noteFor(target.san) || 'Follow the arrow.'}</p>
          )}
          <div className="bot-moves">
            {rows.length ? rows.map(([a, b], i) => (
              <div key={i} className="mv-row"><span className="mv-no">{i + 1}.</span><span className="mv">{a}</span><span className="mv">{b || ''}</span></div>
            )) : <p className="muted small">{me === 'w' ? 'You move first.' : 'Waiting for White\'s first move...'}</p>}
          </div>
          {!done ? (
            <div className="solver-actions">
              {mode === 'practice' && <button className="secondary" onClick={() => setHintLevel((h) => Math.min(2, h + 1))} disabled={turn !== me}><IconBulb /> {hintLevel === 0 ? 'Hint' : 'Show move'}</button>}
              <button className="secondary" onClick={() => setRound((r) => r + 1)}><IconRetry /> Restart line</button>
            </div>
          ) : (
            <div className="solver-actions end">
              <button className="big-green" onClick={nextLine}><IconStar size={20} /> Next line</button>
              <button className="secondary" onClick={() => setRound((r) => r + 1)}>Try again</button>
              <button className="secondary" onClick={() => onPlayOut({ moves: history, color: me, opening: `${course.name} (${done.name})` })}>Play it out vs bot</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OpeningsView({ onPlayOut }) {
  const [open, setOpen] = useState(null) // { course, mode }
  if (!open) return <CourseList onOpen={(course, mode) => setOpen({ course, mode })} />
  return <Trainer key={open.course.id + open.mode} course={open.course} mode={open.mode} onBack={() => setOpen(null)} onPlayOut={onPlayOut} />
}
