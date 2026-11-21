// Lessons, like Chess.com's: courses by level, each lesson a short explanation with example
// boards followed by challenges (your own positions checked by Stockfish, plus real puzzles).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import COURSES from './lessons.json'
import { useCustomPieces } from '../BoardPicker'
import { useWidth } from '../insights/Visuals'
import { IconArrowRight, IconBulb, IconRetry } from '../review/icons'

const KEY = 'smc-lessons-v1'
const readProgress = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }
const lessonKey = (c, l) => `${c.id}/${l.id}`
const challenges = (lesson) => lesson.steps.map((s, i) => [s, i]).filter(([s]) => s.t !== 'text').map(([, i]) => i)
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const GREEN = 'rgba(80,160,60,0.9)'
const playUci = (fen, u) => { const g = new Chess(fen); const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); return { fen: g.fen(), m } }

/* ------------------------------------------------------------------ board for one step */
function StepBoard({ step, fallbackFen, onSolved, setStatus }) {
  const customPieces = useCustomPieces()
  const [wrap, W] = useWidth(480)
  const size = Math.max(260, Math.min(W, 560))
  const isPuzzle = step.t === 'puzzle'
  const isChallenge = step.t === 'move' || isPuzzle
  const startFen = step.fen || fallbackFen || START
  const me = isPuzzle ? (new Chess(step.fen).turn() === 'w' ? 'b' : 'w') : new Chess(startFen).turn()
  const [fen, setFen] = useState(startFen)
  const [ply, setPly] = useState(0) // puzzles: index of the next move to play
  const [phase, setPhase] = useState('play') // intro | play | reply | done
  const [marks, setMarks] = useState({})
  const [arrows, setArrows] = useState([])
  const [wrong, setWrong] = useState(0)
  const [sel, setSel] = useState(null)
  const timers = useRef([])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    timers.current.forEach(clearTimeout); timers.current = []
    setFen(startFen); setWrong(0); setSel(null); setMarks({}); setArrows([])
    if (step.t === 'text') {
      setArrows((step.arrows || []).map(([a, b]) => [a, b, 'rgba(255,170,0,0.85)']))
      setMarks(Object.fromEntries((step.squares || []).map((q) => [q, { background: 'rgba(255,170,0,0.35)' }])))
      setPhase('done')
    } else if (isPuzzle) {
      setPhase('intro'); setPly(0)
      setStatus({ kind: 'info', text: 'Watch the opponent\'s move...' })
      later(() => { const r = playUci(step.fen, step.moves[0]); setFen(r.fen); setMarks(hl(r.m, '#ffffff')); setPly(1); setPhase('play'); setStatus({ kind: 'info', text: `Your move - find the best move for ${me === 'w' ? 'White' : 'Black'}.` }) }, 600)
    } else {
      setPhase('play'); setStatus({ kind: 'info', text: step.prompt })
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const hl = (m, c) => ({ [m.from]: { background: `${c}66` }, [m.to]: { background: `${c}aa` } })
  const expected = step.t === 'move' ? step.accept : isPuzzle ? [step.moves[ply]] : []

  const tryMove = (from, to) => {
    setSel(null)
    if (!isChallenge || phase !== 'play') return false
    const g = new Chess(fen)
    let mv
    const want = expected.find((u) => u.slice(0, 4) === from + to)
    try { mv = g.move({ from, to, promotion: want?.[4] || 'q' }) } catch { return false }
    const uci = mv.from + mv.to + (mv.promotion || '')
    if (expected.includes(uci) || g.isCheckmate()) {
      setFen(g.fen()); setMarks(hl(mv, '#7fae3c')); setArrows([])
      const reply = isPuzzle ? step.moves[ply + 1] : null
      if (!reply || g.isCheckmate()) {
        setPhase('done'); onSolved()
        setStatus({ kind: 'good', text: step.t === 'move' ? `${mv.san} - correct! ${step.explain || ''}` : g.isCheckmate() ? `${mv.san} - checkmate! Solved.` : `${mv.san} - solved!` })
        return true
      }
      setPhase('reply'); setStatus({ kind: 'good', text: `${mv.san} - good! Keep going...` })
      later(() => { const r = playUci(g.fen(), reply); setFen(r.fen); setMarks(hl(r.m, '#ffffff')); setPly(ply + 2); setPhase('play') }, 500)
      return true
    }
    const n = wrong + 1
    setWrong(n)
    setFen(g.fen()); setMarks(hl(mv, '#d63a3a'))
    setStatus({ kind: 'bad', text: `${mv.san} isn't it.${n >= 2 ? ' Here\'s a hint - follow the arrow.' : ' Try again.'}` })
    later(() => {
      setFen(fen); setMarks({})
      if (n >= 2) { const u = expected[0]; setArrows([[u.slice(0, 2), u.slice(2, 4), GREEN]]) }
    }, 800)
    return true
  }

  const targets = useMemo(() => (sel && phase === 'play' && isChallenge ? new Chess(fen).moves({ square: sel, verbose: true }) : []), [sel, fen, phase, isChallenge])
  const lastTap = useRef({ sq: null, t: 0 })
  const tap = (sq) => {
    const now = performance.now()
    if (lastTap.current.sq === sq && now - lastTap.current.t < 250) return
    lastTap.current = { sq, t: now }
    if (!isChallenge || phase !== 'play') return
    if (sel && targets.some((t) => t.to === sq)) { tryMove(sel, sq); return }
    const p = new Chess(fen).get(sq)
    setSel(p && p.color === me && sq !== sel ? sq : null)
  }
  const styles = { ...marks }
  if (sel) styles[sel] = { background: 'rgba(255,214,102,0.6)' }
  for (const t of targets) styles[t.to] = t.captured ? { background: 'radial-gradient(circle, transparent 58%, rgba(20,20,20,0.35) 60%)' } : { background: 'radial-gradient(circle, rgba(20,20,20,0.32) 22%, transparent 24%)' }

  return (
    <div className="solver-board" ref={wrap}>
      <div className="board-wrap" style={{ width: size, height: size }}>
        <Chessboard
          id="lesson-board" position={fen} boardWidth={size}
          boardOrientation={me === 'w' ? 'white' : 'black'}
          arePiecesDraggable={isChallenge && phase === 'play'}
          isDraggablePiece={({ piece }) => piece[0] === me}
          onPieceDrop={tryMove} autoPromoteToQueen
          onSquareClick={tap} onPieceClick={(p, sq) => tap(sq)}
          onPieceDragBegin={(p, sq) => { if (isChallenge && phase === 'play' && p[0] === me) setSel(sq) }} onPieceDragEnd={() => setSel(null)}
          customSquareStyles={styles} customArrows={arrows}
          customPieces={customPieces}
          customDarkSquareStyle={{ backgroundColor: 'var(--rb-dark)', backgroundImage: 'var(--rb-dark-img, none)' }}
          customLightSquareStyle={{ backgroundColor: 'var(--rb-light)', backgroundImage: 'var(--rb-light-img, none)' }}
          animationDuration={200}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ one lesson */
function LessonPlayer({ course, lesson, progress, save, onBack, onNextLesson }) {
  const [i, setI] = useState(0)
  const [status, setStatus] = useState(null)
  const [round, setRound] = useState(0)
  const key = lessonKey(course, lesson)
  const solved = progress[key]?.steps || {}
  const step = lesson.steps[i]
  const chall = challenges(lesson)
  const allDone = chall.every((j) => solved[j])
  // a text step without its own board shows the next challenge's position
  const fallback = useMemo(() => lesson.steps.slice(i + 1).find((s) => s.fen)?.fen, [lesson, i])
  useEffect(() => { setStatus(null) }, [i])

  const markSolved = () => {
    const steps = { ...solved, [i]: true }
    save({ ...progress, [key]: { steps, done: chall.every((j) => steps[j]) } })
  }
  const last = i === lesson.steps.length - 1
  const isChallenge = step.t !== 'text'

  return (
    <div className="solver-layout lesson-play">
      <StepBoard key={`${i}-${round}`} step={step} fallbackFen={fallback} onSolved={markSolved} setStatus={setStatus} />
      <div className="solver-side card">
        <div className="lesson-head">
          <button className="link-btn" onClick={onBack}>← {course.title}</button>
          <strong>{lesson.title}</strong>
          <div className="lesson-dots" aria-label={`Step ${i + 1} of ${lesson.steps.length}`}>
            {lesson.steps.map((s, j) => (
              <button key={j} className={`dot ${j === i ? 'on' : ''} ${s.t === 'text' ? 'text' : solved[j] ? 'solved' : 'todo'}`} onClick={() => setI(j)} aria-label={`Step ${j + 1}${s.t === 'text' ? '' : solved[j] ? ', solved' : ', challenge'}`} />
            ))}
          </div>
        </div>
        {step.t === 'text' ? (
          <div className="lesson-text">
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </div>
        ) : (
          <div className="lesson-text">
            <h3>{step.t === 'move' ? 'Your turn' : `Practice puzzle${step.rating ? ` · ${step.rating}` : ''}`}</h3>
            {step.t === 'move' && <p>{step.prompt}</p>}
            {status && <div className={`solver-msg ${status.kind === 'good' ? 'good' : status.kind === 'bad' ? 'bad' : ''}`} role="status">{status.text}</div>}
            {solved[i] && !status?.kind?.startsWith('good') && <p className="small muted">✓ You've solved this one before.</p>}
          </div>
        )}
        {last && allDone && <div className="solver-msg good">Lesson complete! 🎉</div>}
        <div className="solver-actions">
          {i > 0 && <button className="secondary" onClick={() => setI(i - 1)}>Back</button>}
          {isChallenge && <button className="secondary" onClick={() => setRound((r) => r + 1)}><IconRetry /> Retry</button>}
          {!last ? (
            <button className="next-btn" onClick={() => setI(i + 1)}>{isChallenge && !solved[i] ? 'Skip' : 'Next'} <IconArrowRight /></button>
          ) : (
            <button className="next-btn" onClick={onNextLesson}>{allDone ? 'Next lesson' : 'Finish'} <IconArrowRight /></button>
          )}
        </div>
        {isChallenge && <p className="small muted"><IconBulb /> Two wrong tries and a hint arrow appears.</p>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ page */
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
export default function LessonsView() {
  const [progress, setProgress] = useState(readProgress)
  const save = (p) => { setProgress(p); try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* private mode */ } }
  const [courseId, setCourseId] = useState(null)
  const [lessonId, setLessonId] = useState(null)
  const course = COURSES.find((c) => c.id === courseId)
  const lesson = course?.lessons.find((l) => l.id === lessonId)
  const doneIn = (c) => c.lessons.filter((l) => progress[lessonKey(c, l)]?.done).length

  if (course && lesson) {
    const idx = course.lessons.indexOf(lesson)
    return (
      <LessonPlayer key={lesson.id} course={course} lesson={lesson} progress={progress} save={save}
        onBack={() => setLessonId(null)}
        onNextLesson={() => { const n = course.lessons[idx + 1]; if (n) setLessonId(n.id); else setLessonId(null) }} />
    )
  }
  if (course) {
    return (
      <section className="card lessons-course">
        <button className="link-btn" onClick={() => setCourseId(null)}>← All lessons</button>
        <div className="course-hero"><span className="lesson-icon" aria-hidden="true">{course.icon}</span><div><h3>{course.title}</h3><p className="small muted">{course.level} · {course.blurb}</p></div></div>
        <ol className="lesson-list">
          {course.lessons.map((l, n) => {
            const k = lessonKey(course, l)
            const ch = challenges(l)
            const got = ch.filter((j) => progress[k]?.steps?.[j]).length
            return (
              <li key={l.id}>
                <button className={`drill-item ${progress[k]?.done ? 'done' : ''}`} onClick={() => setLessonId(l.id)}>
                  <span className="drill-check" aria-hidden="true">{progress[k]?.done ? '✓' : n + 1}</span>
                  <span className="drill-name"><strong>{l.title}</strong><span className="small muted">{ch.length} challenge{ch.length === 1 ? '' : 's'}{got && !progress[k]?.done ? ` · ${got} solved` : ''}</span></span>
                  <span className="small muted">{progress[k]?.done ? 'Done' : got ? 'Continue' : 'Start'}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>
    )
  }
  const total = COURSES.reduce((a, c) => a + c.lessons.length, 0)
  const done = COURSES.reduce((a, c) => a + doneIn(c), 0)
  return (
    <div className="lessons-home">
      <section className="card">
        <h3>Lessons</h3>
        <p className="small muted">Short lessons with examples and challenges. Your own positions are checked by Stockfish; practice puzzles come from the Lichess puzzle database. {done}/{total} lessons completed.</p>
      </section>
      {LEVELS.map((lvl) => {
        const list = COURSES.filter((c) => c.level === lvl)
        if (!list.length) return null
        return (
          <section key={lvl} className="card">
            <h3>{lvl}</h3>
            <div className="course-grid">
              {list.map((c) => {
                const d = doneIn(c)
                return (
                  <button key={c.id} className="lesson-course" onClick={() => setCourseId(c.id)}>
                    <span className="lesson-icon" aria-hidden="true">{c.icon}</span>
                    <strong>{c.title}</strong>
                    <span className="small muted">{c.blurb}</span>
                    <span className="theme-bar"><span style={{ width: `${(100 * d) / c.lessons.length}%` }} /></span>
                    <span className="small muted">{d}/{c.lessons.length} lessons</span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
