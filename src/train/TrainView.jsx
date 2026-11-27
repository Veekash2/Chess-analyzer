// Notation & blindfold trainer: learn to read and write chess notation from both sides of the
// board, visualise moves without a board, and play a full game blindfold against a bot.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { useCustomPieces } from '../BoardPicker'
import { useWidth } from '../insights/Visuals'
import { COURSES } from '../openings/courses'
import { chooseBotMove, makeBot } from '../play/bots'
import { getBotEngine } from '../review/engine'
import { speak, spokenSan, voiceSupported } from '../review/voice'
import { SQUARES, distractors, getBest, isLight, loadPositions, parseTyped, pick, pieceLabel, randomSquare, saveBest, shuffle } from './notation'

const MODES = [
  ['learn', 'How notation works'], ['find', 'Find the square'], ['name', 'Name the square'], ['play', 'Play the move'],
  ['write', 'Name the move'], ['visual', 'Visualise'], ['blind', 'Blindfold game'],
]
const SPRINT = 60

/* ------------------------------------------------------------------ shared pieces */
function SidePicker({ side, setSide }) {
  return (
    <div className="tabs chips small-chips" role="radiogroup" aria-label="Board side">
      {[['w', 'White side'], ['b', 'Black side'], ['random', 'Both (random)']].map(([k, l]) => (
        <button key={k} role="radio" aria-checked={side === k} className={side === k ? 'tab active' : 'tab'} onClick={() => setSide(k)}>{l}</button>
      ))}
    </div>
  )
}
const orient = (side) => (side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : side)

function Board({ fen = 'start', orientation = 'w', onSquare, onDrop, styles = {}, arrows = [], coords = true, pieceMode = 'show', draggable = false, isDraggable }) {
  const customPieces = useCustomPieces()
  const [wrap, W] = useWidth(480)
  const size = Math.max(260, Math.min(W, 520))
  return (
    <div className={`train-board pieces-${pieceMode}`} ref={wrap}>
      <div className="board-wrap" style={{ width: size, height: size }}>
        <Chessboard
          id="train-board" position={fen} boardWidth={size} boardOrientation={orientation === 'w' ? 'white' : 'black'}
          showBoardNotation={coords} arePiecesDraggable={draggable} isDraggablePiece={isDraggable}
          onSquareClick={onSquare} onPieceClick={(p, sq) => onSquare?.(sq)} onPieceDrop={onDrop} autoPromoteToQueen
          customSquareStyles={styles} customArrows={arrows} customPieces={customPieces}
          customDarkSquareStyle={{ backgroundColor: 'var(--rb-dark)', backgroundImage: 'var(--rb-dark-img, none)' }}
          customLightSquareStyle={{ backgroundColor: 'var(--rb-light)', backgroundImage: 'var(--rb-light-img, none)' }}
          animationDuration={180}
        />
      </div>
    </div>
  )
}

function useSprint(id, running) {
  const [left, setLeft] = useState(SPRINT)
  const end = useRef(0)
  useEffect(() => {
    if (!running) return
    end.current = Date.now() + SPRINT * 1000
    setLeft(SPRINT)
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((end.current - Date.now()) / 1000))), 200)
    return () => clearInterval(t)
  }, [running, id])
  return left
}

/* ------------------------------------------------------------------ 0. how it works */
function Learn() {
  return (
    <div className="train-learn">
      <p>Every square has a name: a <strong>file</strong> letter (a-h, left to right from White's side) and a <strong>rank</strong> number (1-8, from White's side). White's queen starts on <strong>d1</strong>, Black's on <strong>d8</strong>. From Black's side the board is upside down: a1 is at the top right.</p>
      <table className="notation-ref">
        <tbody>
          <tr><td><b>K Q R B N</b></td><td>King, Queen, Rook, Bishop, kNight. Pawns have no letter.</td></tr>
          <tr><td><b>Nf3</b></td><td>Knight moves to f3.</td></tr>
          <tr><td><b>e4</b></td><td>A pawn moves to e4.</td></tr>
          <tr><td><b>x</b> - Bxc6, exd5</td><td>Captures. A pawn capture names the file it came from: exd5 = the e-pawn takes on d5.</td></tr>
          <tr><td><b>+</b> / <b>#</b></td><td>Check / checkmate.</td></tr>
          <tr><td><b>O-O</b> / <b>O-O-O</b></td><td>Castle kingside (short) / queenside (long).</td></tr>
          <tr><td><b>e8=Q</b></td><td>Pawn promotes to a queen.</td></tr>
          <tr><td><b>Nbd2</b>, <b>R1e2</b></td><td>Two of the same piece could go there: add the file (b) or rank (1) it came from.</td></tr>
          <tr><td><b>1. e4 e5 2. Nf3</b></td><td>Move numbers: White's move, then Black's. "1...e5" means Black's first move.</td></tr>
        </tbody>
      </table>
      <p className="small muted">Tip: the light square is always on your right in the bottom corner ("light on right"). The h1 corner is light, a1 is dark - from either side.</p>
    </div>
  )
}

/* ------------------------------------------------------------------ 1. find the square */
function FindSquare({ side, coords }) {
  const [running, setRunning] = useState(false)
  const [round, setRound] = useState(0)
  const left = useSprint(round, running)
  const [target, setTarget] = useState(randomSquare())
  const [o, setO] = useState(orient(side))
  const [score, setScore] = useState(0)
  const [miss, setMiss] = useState(0)
  const [flash, setFlash] = useState({})
  const [best, setBest] = useState(() => getBest()[`find-${side}`] || 0)
  const over = running && left === 0
  useEffect(() => { if (over) { if (saveBest(`find-${side}`, score)) setBest(score); setRunning(false) } }, [over]) // eslint-disable-line react-hooks/exhaustive-deps
  const next = (prev) => { setTarget(randomSquare(prev)); setO(orient(side)) }
  const click = (sq) => {
    if (!running) return
    if (sq === target) { setScore((s) => s + 1); setFlash({ [sq]: { background: 'rgba(80,160,60,.7)' } }) }
    else { setMiss((m) => m + 1); setFlash({ [sq]: { background: 'rgba(214,58,58,.6)' }, [target]: { background: 'rgba(80,160,60,.7)' } }) }
    setTimeout(() => setFlash({}), sq === target ? 200 : 700)
    next(target)
  }
  return (
    <div className="train-layout">
      <Board fen="8/8/8/8/8/8/8/8 w - - 0 1" orientation={o} onSquare={click} styles={flash} coords={coords} />
      <div className="card train-side">
        {running ? (
          <>
            <div className="train-target">Click <strong>{target}</strong></div>
            <p className="small muted">You're looking from {o === 'w' ? 'White' : 'Black'}'s side.</p>
            <div className="train-stats"><span>⏱ {left}s</span><span>✓ {score}</span><span>✗ {miss}</span></div>
          </>
        ) : (
          <>
            <h3>Find the square</h3>
            <p className="small">A square name appears - click it as fast as you can. 60 seconds.{score || miss ? ` Last run: ${score} right, ${miss} wrong.` : ''}</p>
            <p className="small muted">Best ({side === 'random' ? 'both sides' : side === 'w' ? 'White side' : 'Black side'}): {best}</p>
            <button className="big-green" onClick={() => { setScore(0); setMiss(0); next(); setRunning(true); setRound((r) => r + 1) }}>Start</button>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 2. name the square */
function NameSquare({ side, coords }) {
  const [running, setRunning] = useState(false)
  const [round, setRound] = useState(0)
  const left = useSprint(round, running)
  const [target, setTarget] = useState(randomSquare())
  const [o, setO] = useState(orient(side))
  const [score, setScore] = useState(0)
  const [miss, setMiss] = useState(0)
  const [msg, setMsg] = useState('')
  const [best, setBest] = useState(() => getBest()[`name-${side}`] || 0)
  const options = useMemo(() => {
    const near = SQUARES.filter((s) => s !== target && (s[0] === target[0] || s[1] === target[1]))
    return shuffle([target, ...shuffle(near).slice(0, 3)])
  }, [target])
  const over = running && left === 0
  useEffect(() => { if (over) { if (saveBest(`name-${side}`, score)) setBest(score); setRunning(false) } }, [over]) // eslint-disable-line react-hooks/exhaustive-deps
  const answer = (sq) => {
    if (sq === target) { setScore((s) => s + 1); setMsg('') } else { setMiss((m) => m + 1); setMsg(`That was ${target}.`) }
    setTarget(randomSquare(target)); setO(orient(side))
  }
  return (
    <div className="train-layout">
      <Board fen="8/8/8/8/8/8/8/8 w - - 0 1" orientation={o} styles={running ? { [target]: { background: 'rgba(255,170,0,.8)' } } : {}} coords={coords} />
      <div className="card train-side">
        {running ? (
          <>
            <div className="train-target">Which square is lit?</div>
            <div className="train-options">{options.map((s) => <button key={s} className="secondary" onClick={() => answer(s)}>{s}</button>)}</div>
            {msg && <p className="small bad-move">{msg}</p>}
            <div className="train-stats"><span>⏱ {left}s</span><span>✓ {score}</span><span>✗ {miss}</span></div>
          </>
        ) : (
          <>
            <h3>Name the square</h3>
            <p className="small">A square lights up - pick its name. Try it with coordinates off for a real test.{score || miss ? ` Last run: ${score} right, ${miss} wrong.` : ''}</p>
            <p className="small muted">Best: {best}</p>
            <button className="big-green" onClick={() => { setScore(0); setMiss(0); setMsg(''); setRunning(true); setRound((r) => r + 1) }}>Start</button>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 3/4. read and write moves */
/** A random interesting legal move in a real position, for side `color`. */
async function moveQuestion(color) {
  const fens = await loadPositions()
  for (let i = 0; i < 50; i++) {
    const fen = fens.length ? pick(fens) : new Chess().fen()
    const g = new Chess(fen)
    if (g.turn() !== color || g.isGameOver()) continue
    const moves = g.moves({ verbose: true })
    const interesting = moves.filter((m) => m.captured || m.san.includes('+') || m.san.startsWith('O') || m.promotion || /^[NBRQ][a-h1-8]x?[a-h][1-8]/.test(m.san))
    const mv = pick(interesting.length && Math.random() < 0.7 ? interesting : moves)
    return { fen, mv }
  }
  const g = new Chess()
  return { fen: g.fen(), mv: pick(g.moves({ verbose: true })) }
}

function PlayMove({ side, coords }) {
  const [q, setQ] = useState(null)
  const [o, setO] = useState('w')
  const [score, setScore] = useState({ ok: 0, n: 0 })
  const [msg, setMsg] = useState(null)
  const [arrows, setArrows] = useState([])
  const [sel, setSel] = useState(null)
  const next = async () => { const c = orient(side); setO(c); setMsg(null); setArrows([]); setSel(null); setQ(await moveQuestion(c)) }
  useEffect(() => { next() }, [side]) // eslint-disable-line react-hooks/exhaustive-deps
  const attempt = (from, to) => {
    if (!q || msg) return false
    const g = new Chess(q.fen)
    let mv
    try { mv = g.move({ from, to, promotion: q.mv.promotion || 'q' }) } catch { return false }
    const ok = mv.san === q.mv.san
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), n: s.n + 1 }))
    setMsg(ok ? { good: true, text: `Correct - ${q.mv.san}.` } : { good: false, text: `You played ${mv.san}. ${q.mv.san} means ${spokenSan(q.mv.san)}: ${q.mv.from} to ${q.mv.to}.` })
    if (!ok) setArrows([[q.mv.from, q.mv.to, 'rgba(80,160,60,.9)']])
    setTimeout(next, ok ? 700 : 2600)
    return ok
  }
  const tap = (sq) => {
    if (!q || msg) return
    const p = new Chess(q.fen).get(sq)
    if (sel && sel !== sq && !(p && p.color === o)) { attempt(sel, sq); setSel(null); return }
    setSel(p && p.color === o ? sq : null)
  }
  return (
    <div className="train-layout">
      <Board fen={q?.fen || 'start'} orientation={o} coords={coords} draggable={!msg} isDraggable={({ piece }) => piece[0] === o}
        onDrop={(f, t) => attempt(f, t)} onSquare={tap} arrows={arrows} styles={sel ? { [sel]: { background: 'rgba(255,214,102,.6)' } } : {}} />
      <div className="card train-side">
        <h3>Play the move</h3>
        <p className="small">Read the notation and play that move on the board ({o === 'w' ? 'White' : 'Black'} to move).</p>
        {q && <div className="train-target big">{q.mv.san}</div>}
        {msg && <div className={`solver-msg ${msg.good ? 'good' : 'bad'}`}>{msg.text}</div>}
        <div className="train-stats"><span>✓ {score.ok} / {score.n}</span></div>
        <button className="link-btn" onClick={next}>Skip</button>
      </div>
    </div>
  )
}

function NameMove({ side, coords }) {
  const [q, setQ] = useState(null)
  const [o, setO] = useState('w')
  const [shown, setShown] = useState(false)
  const [msg, setMsg] = useState(null)
  const [score, setScore] = useState({ ok: 0, n: 0 })
  const next = async () => {
    const c = orient(side); setO(c); setMsg(null); setShown(false)
    const nq = await moveQuestion(c)
    setQ({ ...nq, options: shuffle([nq.mv.san, ...distractors(nq.fen, nq.mv)]) })
    setTimeout(() => setShown(true), 700)
  }
  useEffect(() => { next() }, [side]) // eslint-disable-line react-hooks/exhaustive-deps
  const after = q ? (() => { const g = new Chess(q.fen); g.move(q.mv.san); return g.fen() })() : 'start'
  const answer = (s) => {
    if (msg) return
    const ok = s === q.mv.san
    setScore((x) => ({ ok: x.ok + (ok ? 1 : 0), n: x.n + 1 }))
    setMsg(ok ? { good: true, text: `Correct: ${q.mv.san}.` } : { good: false, text: `It's ${q.mv.san} - ${spokenSan(q.mv.san)}.` })
    setTimeout(next, ok ? 800 : 2400)
  }
  return (
    <div className="train-layout">
      <Board fen={shown ? after : q?.fen || 'start'} orientation={o} coords={coords}
        styles={shown && q ? { [q.mv.from]: { background: 'rgba(227,178,60,.45)' }, [q.mv.to]: { background: 'rgba(227,178,60,.75)' } } : {}} />
      <div className="card train-side">
        <h3>Name the move</h3>
        <p className="small">Watch the move ({o === 'w' ? 'White' : 'Black'} plays it), then pick how it's written.</p>
        {q && shown && <div className="train-options">{q.options.map((s) => <button key={s} className="secondary" onClick={() => answer(s)}>{s}</button>)}</div>}
        {msg && <div className={`solver-msg ${msg.good ? 'good' : 'bad'}`}>{msg.text}</div>}
        <div className="train-stats"><span>✓ {score.ok} / {score.n}</span></div>
        {shown && !msg && <button className="link-btn" onClick={() => setShown(false) || setTimeout(() => setShown(true), 600)}>Replay the move</button>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 5. visualise */
const LEVELS = [[4, 'Easy - 2 moves each'], [6, 'Medium - 3 moves'], [10, 'Hard - 5 moves'], [16, 'Expert - 8 moves']]
function Visualise({ side }) {
  const [plies, setPlies] = useState(6)
  const [q, setQ] = useState(null)
  const [msg, setMsg] = useState(null)
  const [streak, setStreak] = useState(0)
  const make = () => {
    const lines = COURSES.flatMap((c) => c.lines.map((l) => l.moves)).filter((m) => m.length >= plies)
    const moves = pick(lines).slice(0, plies)
    const g = new Chess()
    for (const m of moves) g.move(m)
    // ask about a square that changed during the sequence (or is near the action)
    const touched = [...new Set(g.history({ verbose: true }).flatMap((m) => [m.from, m.to]))]
    const sq = pick(touched)
    const right = pieceLabel(g.get(sq))
    const pool = [...new Set(['Empty', ...SQUARES.map((s) => pieceLabel(g.get(s)))])].filter((x) => x !== right)
    setQ({ moves, fen: g.fen(), sq, right, options: shuffle([right, ...shuffle(pool).slice(0, 3)]) })
    setMsg(null)
  }
  useEffect(() => { make() }, [plies]) // eslint-disable-line react-hooks/exhaustive-deps
  const answer = (a) => {
    if (msg) return
    const ok = a === q.right
    setStreak((s) => (ok ? s + 1 : 0))
    setMsg({ good: ok, text: ok ? `Correct - ${q.right} on ${q.sq}.` : `${q.sq} has: ${q.right}.` })
  }
  const o = side === 'random' ? 'w' : side
  return (
    <div className="train-layout">
      {msg ? <Board fen={q.fen} orientation={o} styles={{ [q.sq]: { background: 'rgba(255,170,0,.6)' } }} /> : (
        <div className="blind-board-off card"><span className="muted">No board - picture it in your head.</span></div>
      )}
      <div className="card train-side">
        <h3>Visualise</h3>
        <div className="tabs chips small-chips">{LEVELS.map(([p, l]) => <button key={p} className={plies === p ? 'tab active' : 'tab'} onClick={() => setPlies(p)}>{l}</button>)}</div>
        <p className="small">From the starting position:</p>
        {q && <p className="visual-moves">{q.moves.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m} ` : `${m} `))}</p>}
        {q && <div className="train-target">What is on <strong>{q.sq}</strong>?</div>}
        {q && <div className="train-options">{q.options.map((s) => <button key={s} className="secondary" onClick={() => answer(s)}>{s}</button>)}</div>}
        {msg && <div className={`solver-msg ${msg.good ? 'good' : 'bad'}`}>{msg.text}</div>}
        <div className="train-stats"><span>🔥 streak {streak}</span></div>
        {msg && <button className="big-green slim" onClick={make}>Next</button>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 6. blindfold game */
const VIS = [['ghost', 'Faded pieces'], ['hidden', 'Hidden pieces'], ['none', 'No board']]
function Blindfold({ side }) {
  const [setup, setSetup] = useState({ rating: 800, vis: 'hidden', voice: voiceSupported, peeks: 3 })
  const [game, setGame] = useState(null) // { me, fen, history, over, peeks }
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [peek, setPeek] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [sel, setSel] = useState(null)
  const bot = useMemo(() => makeBot({ id: 'blind', name: 'Blindfold bot', rating: setup.rating, chat: {} }), [setup.rating])
  const start = () => {
    const me = side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : side
    setGame({ me, fen: new Chess().fen(), history: [], over: null, peeks: setup.peeks }); setMsg(''); setText('')
  }
  const status = (g) => g.isCheckmate() ? (g.turn() === game.me ? 'Checkmate - the bot wins.' : 'Checkmate - you win!') : g.isDraw() ? 'Draw.' : null
  // bot's move
  useEffect(() => {
    if (!game || game.over) return
    const g = new Chess(game.fen)
    if (g.turn() === game.me) return
    let live = true
    setThinking(true)
    ;(async () => {
      const engine = await getBotEngine()
      const mv = await chooseBotMove(engine, game.fen, bot, game.history, {})
      if (!live) return
      const g2 = new Chess(game.fen)
      const played = g2.move({ from: mv.from, to: mv.to, promotion: mv.promotion })
      setThinking(false)
      if (setup.voice) speak(spokenSan(played.san))
      setGame((s) => ({ ...s, fen: g2.fen(), history: [...s.history, played.san], over: status(g2), last: played }))
    })()
    return () => { live = false }
  }, [game?.fen]) // eslint-disable-line react-hooks/exhaustive-deps
  const doMove = (mv) => {
    if (!mv) { setMsg('Not a legal move here - check the notation (e.g. Nf3, exd5, O-O, e2e4).'); return }
    const g = new Chess(game.fen)
    g.move(mv.san)
    setMsg(''); setText(''); setSel(null)
    setGame((s) => ({ ...s, fen: g.fen(), history: [...s.history, mv.san], over: status(g), last: mv }))
  }
  const submit = (e) => { e.preventDefault(); if (!game || game.over || thinking) return; doMove(parseTyped(game.fen, text)) }
  const tap = (sq) => {
    if (!game || game.over || thinking || new Chess(game.fen).turn() !== game.me) return
    if (!sel) { setSel(sq); return }
    if (sel === sq) { setSel(null); return }
    const g = new Chess(game.fen)
    let mv = null
    try { mv = g.move({ from: sel, to: sq, promotion: 'q' }) } catch { mv = null }
    if (mv) doMove(mv); else { setSel(sq); setMsg('') }
  }
  const doPeek = () => { if (!game.peeks) return; setGame((s) => ({ ...s, peeks: s.peeks - 1 })); setPeek(true); setTimeout(() => setPeek(false), 3000) }

  if (!game) {
    return (
      <div className="card train-setup">
        <h3>Blindfold game</h3>
        <p className="small">Play a full game against a bot without seeing the pieces. Type your moves in notation (or tap the squares), and the bot reads its moves out loud. A great way to learn notation and board vision together.</p>
        <h5>Bot strength</h5>
        <div className="tabs chips small-chips">{[[400, 'Beginner 400'], [800, 'Casual 800'], [1200, 'Club 1200'], [1600, 'Strong 1600']].map(([r, l]) => <button key={r} className={setup.rating === r ? 'tab active' : 'tab'} onClick={() => setSetup({ ...setup, rating: r })}>{l}</button>)}</div>
        <h5>How blind?</h5>
        <div className="tabs chips small-chips">{VIS.map(([k, l]) => <button key={k} className={setup.vis === k ? 'tab active' : 'tab'} onClick={() => setSetup({ ...setup, vis: k })}>{l}</button>)}</div>
        <h5>Peeks</h5>
        <div className="tabs chips small-chips">{[0, 3, 10].map((n) => <button key={n} className={setup.peeks === n ? 'tab active' : 'tab'} onClick={() => setSetup({ ...setup, peeks: n })}>{n === 0 ? 'None' : n}</button>)}</div>
        {voiceSupported && <label className="check small"><input type="checkbox" checked={setup.voice} onChange={(e) => setSetup({ ...setup, voice: e.target.checked })} /> Read the bot's moves out loud</label>}
        <button className="big-green" onClick={start}>Start blindfold game</button>
      </div>
    )
  }
  const g = new Chess(game.fen)
  const myTurn = g.turn() === game.me && !game.over
  const rows = []
  for (let i = 0; i < game.history.length; i += 2) rows.push([game.history[i], game.history[i + 1]])
  const mode = peek ? 'show' : setup.vis
  return (
    <div className="train-layout">
      {mode === 'none' ? (
        <div className="blind-board-off card"><span className="muted">No board. Last move: <strong>{game.last?.san || '-'}</strong></span></div>
      ) : (
        <Board fen={game.fen} orientation={game.me} pieceMode={mode} onSquare={tap}
          styles={{ ...(game.last ? { [game.last.from]: { background: 'rgba(227,178,60,.35)' }, [game.last.to]: { background: 'rgba(227,178,60,.6)' } } : {}), ...(sel ? { [sel]: { background: 'rgba(255,214,102,.7)' } } : {}) }} />
      )}
      <div className="card train-side">
        <h3>Blindfold game</h3>
        <p className="small muted">You play {game.me === 'w' ? 'White' : 'Black'} vs the {setup.rating} bot.</p>
        {game.over ? <div className="solver-msg good">{game.over}</div> : <div className="train-target">{thinking ? 'Bot is thinking...' : myTurn ? 'Your move' : ''}{game.last && !myTurn ? '' : game.last ? <span className="small muted"> - bot played <strong>{game.last.san}</strong></span> : null}</div>}
        <form className="blind-input" onSubmit={submit}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={myTurn ? 'Type a move, e.g. Nf3' : ''} disabled={!myTurn} aria-label="Your move in notation" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          <button className="big-green slim" type="submit" disabled={!myTurn}>Move</button>
        </form>
        {msg && <p className="small bad-move">{msg}</p>}
        <div className="bot-moves blind-moves">{rows.length ? rows.map(([a, b], i) => <div key={i} className="mv-row"><span className="mv-no">{i + 1}.</span><span className="mv">{a}</span><span className="mv">{b || ''}</span></div>) : <p className="small muted">{game.me === 'w' ? 'You move first.' : 'Waiting for White...'}</p>}</div>
        <div className="solver-actions">
          {mode !== 'show' || peek ? <button className="secondary" onClick={doPeek} disabled={!game.peeks || peek}>👁 Peek ({game.peeks})</button> : null}
          <button className="secondary" onClick={() => setGame(null)}>New game</button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ page */
export default function TrainView() {
  const [mode, setMode] = useState('learn')
  const [side, setSide] = useState('w')
  const [coords, setCoords] = useState(true)
  return (
    <div className="train">
      <section className="card">
        <h3>Notation &amp; blindfold trainer</h3>
        <p className="small muted">Learn to read and write chess notation from both sides of the board, picture moves without a board, then play blindfold.</p>
        <div className="tabs chips train-modes" role="tablist">{MODES.map(([k, l]) => <button key={k} role="tab" aria-selected={mode === k} className={mode === k ? 'tab active' : 'tab'} onClick={() => setMode(k)}>{l}</button>)}</div>
        {mode !== 'learn' && (
          <div className="train-opts">
            <SidePicker side={side} setSide={setSide} />
            {['find', 'name', 'play', 'write'].includes(mode) && <label className="check small"><input type="checkbox" checked={coords} onChange={(e) => setCoords(e.target.checked)} /> Show coordinates</label>}
          </div>
        )}
      </section>
      {mode === 'learn' && <section className="card"><Learn /></section>}
      {mode === 'find' && <FindSquare key={side} side={side} coords={coords} />}
      {mode === 'name' && <NameSquare key={side} side={side} coords={coords} />}
      {mode === 'play' && <PlayMove side={side} coords={coords} />}
      {mode === 'write' && <NameMove side={side} coords={coords} />}
      {mode === 'visual' && <Visualise side={side} />}
      {mode === 'blind' && <Blindfold key={side} side={side} />}
      <p className="small muted">{isLight('h1') ? 'Remember: h1 and a8 are light squares, a1 and h8 are dark.' : ''}</p>
    </div>
  )
}
