// Opening practice, like Chess.com's: pick an opening, LEARN the moves with arrows and
// explanations, then PRACTISE them from memory while the opponent varies its replies.
// Remembering them: DAILY REVIEW (spaced repetition), KEY IDEAS cards, and WHERE YOU LEFT THE BOOK
// in your own games.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { COURSES, COMMON_NOTES, getProgress, markLine, mastered } from './courses'
import { IDEAS } from './ideas'
import { boxLabel, dueLines, getSrs, srsDueNow, srsKey, srsLearned, srsRecord, srsStats, whenText } from './srs'
import { findLeaks, moveLabel } from './bookLeaks'
import { useWidth } from '../insights/Visuals'
import { useCustomPieces } from '../BoardPicker'
import { IconBulb, IconFlip, IconRetry, IconStar } from '../review/icons'

const GREEN = 'rgba(80,160,60,0.9)'

/* ------------------------------------------------------------------ key ideas */
function Ideas({ id, compact }) {
  const it = IDEAS[id]
  if (!it) return null
  return (
    <dl className={`ideas ${compact ? 'compact' : ''}`}>
      <dt>Set-up</dt><dd>{it.setup}</dd>
      <dt>Plan</dt><dd>{it.plan}</dd>
      <dt>Pawn break</dt><dd>{it.break}</dd>
      <dt>Watch out</dt><dd>{it.watch}</dd>
    </dl>
  )
}

/* ------------------------------------------------------------------ daily review card */
function DailyReview({ onStart }) {
  const st = srsStats(COURSES)
  return (
    <section className="card review-due">
      <div className="due-head">
        <div>
          <h3>Daily review</h3>
          <p className="small muted">
            Lines come back just before you'd forget them: tomorrow, then in 3 days, a week, a month. Get one wrong and it comes back in 10 minutes.
          </p>
        </div>
        <div className="due-count" aria-label={`${st.due} lines due`}><strong>{st.due}</strong><span className="small muted">due now</span></div>
      </div>
      {st.tracked === 0 ? (
        <p className="small">Learn or practise any line below and it gets scheduled here automatically.</p>
      ) : (
        <p className="small muted">{st.tracked} line{st.tracked === 1 ? '' : 's'} in your review · {st.learned} strong{st.due === 0 && st.next ? ` · next one due ${whenText(st.next)}` : ''}</p>
      )}
      <button className="big-green slim" disabled={!st.due} onClick={onStart}>{st.due ? `Review ${st.due} line${st.due === 1 ? '' : 's'}` : 'Nothing due - well done!'}</button>
    </section>
  )
}

/* ------------------------------------------------------------------ where you left the book */
function BookLeaks({ rows, username, onDrill }) {
  const [showAll, setShowAll] = useState(false)
  const games = useMemo(() => (rows || []).filter((r) => r.pgn && r.rules === 'chess'), [rows])
  const res = useMemo(() => (games.length ? findLeaks(games, COURSES) : null), [games])
  if (!games.length) {
    return (
      <section className="card leaks">
        <h3>Where you left the book</h3>
        <p className="small muted">Load your Chess.com games (username box at the top) and this shows the exact moves where your real games go off the lines you're learning - so you drill those first.</p>
      </section>
    )
  }
  const list = showAll ? res.leaks : res.leaks.slice(0, 6)
  const courseStats = Object.entries(res.courses).sort((a, b) => b[1].games - a[1].games)
  return (
    <section className="card leaks">
      <h3>Where you left the book</h3>
      <p className="small muted">
        {res.matched ? `${res.matched} of ${username ? `${username}'s` : 'your'} ${games.length} games follow one of these courses.` : `None of your ${games.length} games follow these courses yet - pick one below and start playing it.`}
        {res.leaks.length > 0 && ' Here is where YOU went off the line first (your opponent going off-book isn\'t counted):'}
      </p>
      {list.length > 0 && (
        <ol className="leak-list">
          {list.map((l) => (
            <li key={`${l.course.id}-${l.ply}-${l.expected.join()}`}>
              <div className="leak-main">
                <strong>{l.course.name}</strong>
                <span className="small">On move {moveLabel(l.ply)} you played <b className="bad-move">{l.playedTop[0]}</b>{l.playedTop.length > 1 ? ` (or ${l.playedTop.slice(1, 3).join(', ')})` : ''}; the book move is <b className="good-move">{l.expected.join(' or ')}</b>.</span>
                <span className="small muted">{l.count} game{l.count === 1 ? '' : 's'}{l.losses ? `, ${l.losses} lost` : ''}{l.last ? ` · last ${l.last.toLocaleDateString()}` : ''}</span>
              </div>
              <button className="secondary slim" onClick={() => onDrill(l)}>Drill it</button>
            </li>
          ))}
        </ol>
      )}
      {res.leaks.length > 6 && <button className="link-btn" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer' : `Show all ${res.leaks.length}`}</button>}
      {courseStats.length > 0 && (
        <div className="leak-courses small muted">
          {courseStats.map(([id, s]) => {
            const c = COURSES.find((x) => x.id === id)
            return <span key={id} className="leak-chip">{c.name}: {s.games} game{s.games === 1 ? '' : 's'}, you left first in {s.youLeft}</span>
          })}
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ course list */
function CourseList({ onOpen }) {
  const progress = getProgress()
  const srs = getSrs()
  const now = Date.now()
  const [openIdeas, setOpenIdeas] = useState(null)
  return (
    <div className="openings-list">
      {[['w', 'Openings for White'], ['b', 'Openings for Black']].map(([side, title]) => (
        <section key={side} className="card">
          <h3>{title}</h3>
          <div className="course-grid">
            {COURSES.filter((c) => c.side === side).sort((a, b) => (b.full ? 2 : b.yours ? 1 : 0) - (a.full ? 2 : a.yours ? 1 : 0)).map((c) => {
              const done = mastered(progress, c)
              const due = c.lines.filter((l) => srs[srsKey(c.id, l.name)]?.due <= now).length
              return (
                <div key={c.id} className={`course-card ${c.yours || c.full ? 'yours' : ''}`}>
                  {c.full ? <span className="yours-tag full-tag">Full course · {c.lines.length} lines</span> : c.yours && <span className="yours-tag">From your games</span>}
                  <div className="course-head">
                    <strong>{c.name}</strong>
                    {due > 0 && <span className="due-badge" title="Lines due for review">{due} due</span>}
                    <span className={`lvl lvl-${c.level.toLowerCase()}`}>{c.level}</span>
                  </div>
                  <p className="small muted">{c.blurb}</p>
                  <div className="course-progress" aria-label={`${done} of ${c.lines.length} lines practised`}>
                    <span style={{ width: `${(done / c.lines.length) * 100}%` }} />
                  </div>
                  <span className="small muted">{done}/{c.lines.length} lines mastered</span>
                  {IDEAS[c.id] && (
                    <button className="link-btn ideas-toggle" aria-expanded={openIdeas === c.id} onClick={() => setOpenIdeas(openIdeas === c.id ? null : c.id)}>
                      <IconBulb /> {openIdeas === c.id ? 'Hide key ideas' : 'Key ideas'}
                    </button>
                  )}
                  {openIdeas === c.id && <Ideas id={c.id} compact />}
                  <div className="course-btns">
                    <button className="secondary" onClick={() => onOpen({ course: c, mode: 'learn' })}>Learn</button>
                    <button className="big-green slim" onClick={() => onOpen({ course: c, mode: 'practice' })}>Practice</button>
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
// mode: 'learn' (arrows), 'practice' (from memory, any line), 'review' (one scheduled line, from memory)
// focus: practise just this line (from "Drill it"); leak: what you played in your games
function Trainer({ course, mode: startMode, lineIdx: startLine = 0, focus = null, leak = null, review = null, onBack, onPlayOut }) {
  const me = course.side
  const customPieces = useCustomPieces()
  const [wrap, W] = useWidth(520)
  const size = Math.max(260, Math.min(W, 560))
  const [mode, setMode] = useState(startMode)
  const [lineIdx, setLineIdx] = useState(startLine) // learn mode walks the lines in order
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
  const drill = mode !== 'learn' // playing from memory

  // lines still consistent with the game so far
  const pool = mode === 'learn' || mode === 'review' ? [course.lines[lineIdx]] : focus != null ? [course.lines[focus]] : course.lines
  const matching = pool.filter((l) => l.moves.length > history.length && history.every((m, i) => l.moves[i] === m))
  const expected = [...new Set(matching.map((l) => l.moves[history.length]))]
  const lineName = matching[0]?.name || done?.name || ''

  // restart a line
  useEffect(() => {
    setHistory([]); setMistakes(0); setHintLevel(0); setDone(null); setLastMove(null); setSel(null)
    const l = course.lines[lineIdx]
    setMsg({
      kind: 'info',
      text: mode === 'learn' ? `Learn: ${l.name}. Follow the green arrows.`
        : mode === 'review' ? `Review: ${l.name}. Play it from memory.`
          : leak ? `In your games you went wrong on move ${moveLabel(leak.ply)}: you played ${leak.playedTop[0]}, the book move is ${leak.expected.join(' or ')}. Play the line from memory.`
            : focus != null ? `Practice: ${course.lines[focus].name}, from memory.`
              : `Practice: play ${course.name} from memory. The opponent will mix up its replies.`,
    })
  }, [mode, lineIdx, round, course]) // eslint-disable-line react-hooks/exhaustive-deps

  // finished? (no line continues from here)
  useEffect(() => {
    if (done || !history.length) return
    const cont = pool.some((l) => l.moves.length > history.length && history.every((m, i) => l.moves[i] === m))
    if (cont) return
    const line = pool.find((l) => history.every((m, i) => l.moves[i] === m)) || pool[0]
    const clean = drill && mistakes === 0
    let next = null
    if (drill) { markLine(course.id, line.name, clean); next = srsRecord(course.id, line.name, clean) } else srsLearned(course.id, line.name)
    setDone({ name: line.name, clean })
    const when = next ? ` Next review ${whenText(next.due)} (${boxLabel(next.box).toLowerCase()}).` : ''
    setMsg({ kind: 'good', text: clean ? `Perfect! You played the whole line from memory.${when}` : mode === 'learn' ? 'Line complete! It will come up in your daily review - or try it in Practice now.' : `Line complete with ${mistakes} mistake${mistakes === 1 ? '' : 's'}. It will come back soon so it sticks.${when}` })
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
    setHintLevel((h) => Math.max(h, drill && mistakes >= 1 ? 2 : 1))
    const why = drill && mistakes >= 1 && IDEAS[course.id] ? ` Remember the plan: ${IDEAS[course.id].plan}` : ''
    setMsg({ kind: 'bad', text: `${mv.san} is a real move, but it is not the book move here. Try again${mistakes >= 1 ? ' - follow the hint' : ''}.${why}` })
    return false
  }

  // hint: learn mode always shows the arrow; practice hints get stronger each press
  const target = expected.length ? new Chess(fen).move(expected[0]) : null
  const showArrow = target && turn === me && !done && (mode === 'learn' || hintLevel >= 2)
  const showPiece = target && turn === me && !done && drill && hintLevel === 1

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
        <button className="secondary" onClick={onBack}>← {review ? 'Stop review' : 'All openings'}</button>
        {review ? (
          <span className="review-pos small"><strong>Daily review</strong> · line {review.pos + 1} of {review.total}</span>
        ) : (
          <div className="tabs chips small-chips" role="radiogroup" aria-label="Mode">
            {[['learn', 'Learn'], ['practice', 'Practice']].map(([k, label]) => (
              <button key={k} role="radio" aria-checked={mode === k} className={mode === k ? 'tab active' : 'tab'} onClick={() => setMode(k)}>{label}</button>
            ))}
          </div>
        )}
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
          {IDEAS[course.id] && (
            <details className="ideas-box" open={mode === 'learn' && history.length < 2}>
              <summary><IconBulb /> Key ideas</summary>
              <Ideas id={course.id} />
            </details>
          )}
          <div className="bot-moves">
            {rows.length ? rows.map(([a, b], i) => (
              <div key={i} className="mv-row"><span className="mv-no">{i + 1}.</span><span className="mv">{a}</span><span className="mv">{b || ''}</span></div>
            )) : <p className="muted small">{me === 'w' ? 'You move first.' : 'Waiting for White\'s first move...'}</p>}
          </div>
          {!done ? (
            <div className="solver-actions">
              {drill && <button className="secondary" onClick={() => setHintLevel((h) => Math.min(2, h + 1))} disabled={turn !== me}><IconBulb /> {hintLevel === 0 ? 'Hint' : 'Show move'}</button>}
              <button className="secondary" onClick={() => setRound((r) => r + 1)}><IconRetry /> Restart line</button>
            </div>
          ) : review ? (
            <div className="solver-actions end">
              <button className="big-green" onClick={review.onNext}><IconStar size={20} /> {review.pos + 1 < review.total ? 'Next line' : 'Finish review'}</button>
              <button className="secondary" onClick={() => onPlayOut({ moves: history, color: me, opening: `${course.name} (${done.name})` })}>Play it out vs bot</button>
            </div>
          ) : (
            <div className="solver-actions end">
              <button className="big-green" onClick={nextLine}><IconStar size={20} /> {focus != null ? 'Again' : 'Next line'}</button>
              <button className="secondary" onClick={() => setRound((r) => r + 1)}>Try again</button>
              <button className="secondary" onClick={() => onPlayOut({ moves: history, color: me, opening: `${course.name} (${done.name})` })}>Play it out vs bot</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ page */
export default function OpeningsView({ onPlayOut, rows, username }) {
  const [open, setOpen] = useState(null) // { course, mode, lineIdx?, focus?, leak? }
  const [session, setSession] = useState(null) // daily review: { queue: [{course, lineIdx}], pos }
  const [, refresh] = useState(0)
  const home = () => { setOpen(null); setSession(null); refresh((n) => n + 1); window.scrollTo({ top: 0 }) }

  if (session) {
    const item = session.queue[session.pos]
    return (
      <Trainer key={`review-${session.pos}`} course={item.course} mode="review" lineIdx={item.lineIdx} onBack={home} onPlayOut={onPlayOut}
        review={{ pos: session.pos, total: session.queue.length, onNext: () => (session.pos + 1 < session.queue.length ? setSession({ ...session, pos: session.pos + 1 }) : home()) }} />
    )
  }
  if (open) {
    return <Trainer key={`${open.course.id}-${open.mode}-${open.focus ?? ''}`} {...open} onBack={home} onPlayOut={onPlayOut} />
  }
  return (
    <>
      <div className="openings-dash">
        <DailyReview onStart={() => { const q = dueLines(COURSES); if (q.length) setSession({ queue: q, pos: 0 }) }} />
        <BookLeaks rows={rows} username={username} onDrill={(l) => {
          srsDueNow(l.course.id, l.course.lines[l.lineIdx].name)
          setOpen({ course: l.course, mode: 'practice', focus: l.lineIdx, lineIdx: l.lineIdx, leak: l })
        }} />
      </div>
      <CourseList onOpen={setOpen} />
    </>
  )
}
