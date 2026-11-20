import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { BOTS, chooseBotMove, getBeaten, markBeaten, materialFor, pick } from './bots'
import { getBotEngine } from '../review/engine'
import { useWidth } from '../insights/Visuals'
import { IconBulb, IconFlip, IconRetry, IconStar } from '../review/icons'

const sideName = (c) => (c === 'w' ? 'White' : 'Black')

function BotAvatar({ bot, size = 48 }) {
  return <span className="bot-avatar" style={{ '--bc': bot.color, width: size, height: size, fontSize: size * 0.58 }} aria-hidden="true">{bot.glyph}</span>
}

/* ------------------------------------------------------------------ choose a bot */
function BotPicker({ onStart }) {
  const [botId, setBotId] = useState(BOTS[2].id)
  const [color, setColor] = useState('w')
  const [assist, setAssist] = useState(true)
  const beaten = getBeaten()
  const bot = BOTS.find((b) => b.id === botId)
  return (
    <div className="bot-picker">
      <section className="card">
        <h3>Play a bot</h3>
        <p className="muted small">Pick an opponent. Each bot is Stockfish running in your browser, tuned to play like a person at that level - with its own style and a few things to say.</p>
        <div className="bot-grid">
          {BOTS.map((b) => (
            <button key={b.id} className={`bot-card ${b.id === botId ? 'on' : ''}`} onClick={() => setBotId(b.id)} aria-pressed={b.id === botId}>
              <BotAvatar bot={b} />
              <span className="bot-name">{b.name}{beaten[b.id] ? <span className="beaten" title={`Beaten ${beaten[b.id]}x`}>★</span> : null}</span>
              <span className="bot-rating">{b.rating}</span>
              <span className="bot-tag small">{b.tagline}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="card bot-setup">
        <div className="bot-chosen">
          <BotAvatar bot={bot} size={64} />
          <div>
            <strong>{bot.name} <span className="muted">({bot.rating})</span></strong>
            <p className="small muted">"{bot.chat.hello[0]}"</p>
          </div>
        </div>
        <h5>I play as</h5>
        <div className="tabs chips small-chips" role="radiogroup" aria-label="Your colour">
          {[['w', 'White'], ['random', 'Random'], ['b', 'Black']].map(([k, label]) => (
            <button key={k} role="radio" aria-checked={color === k} className={color === k ? 'tab active' : 'tab'} onClick={() => setColor(k)}>{label}</button>
          ))}
        </div>
        <label className="check small"><input type="checkbox" checked={assist} onChange={(e) => setAssist(e.target.checked)} /> Allow hints and takebacks</label>
        <button className="big-green" onClick={() => onStart({ bot, color: color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color, assist })}>
          <IconStar size={22} /> Play {bot.name}
        </button>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ the game */
function Game({ setup, onExit, onReview }) {
  const { bot, color: me, assist } = setup
  const botColor = me === 'w' ? 'b' : 'w'
  const [wrap, W] = useWidth(520)
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 900)
  useEffect(() => { const on = () => setVh(window.innerHeight); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [])
  const size = Math.max(260, Math.min(W, 600, W > 640 ? vh - 190 : Infinity))

  const gameRef = useRef(new Chess())
  const [fen, setFen] = useState(gameRef.current.fen())
  const [history, setHistory] = useState([])
  const [thinking, setThinking] = useState(false)
  const [say, setSay] = useState(pick(bot.chat.hello))
  const [result, setResult] = useState(null) // { text, winner: 'me'|'bot'|'draw', reason }
  const [flipped, setFlipped] = useState(me === 'b')
  const [sel, setSel] = useState(null)
  const [hint, setHint] = useState(null) // uci
  const [lastMove, setLastMove] = useState(null)
  const [helpUsed, setHelpUsed] = useState(false)
  const reqRef = useRef(0)

  const game = gameRef.current
  const myTurn = !result && game.turn() === me && !thinking

  const finishIfOver = useCallback(() => {
    const g = gameRef.current
    if (!g.isGameOver()) return false
    let r
    if (g.isCheckmate()) {
      const winner = g.turn() === me ? 'bot' : 'me'
      r = { winner, text: winner === 'me' ? 'You won!' : `${bot.name} won`, reason: 'by checkmate' }
    } else {
      const why = g.isStalemate() ? 'stalemate' : g.isThreefoldRepetition() ? 'repetition' : g.isInsufficientMaterial() ? 'insufficient material' : '50-move rule'
      r = { winner: 'draw', text: 'Draw', reason: `by ${why}` }
    }
    setResult(r)
    setSay(pick(bot.chat[r.winner === 'me' ? 'loss' : r.winner === 'bot' ? 'win' : 'draw']))
    if (r.winner === 'me') markBeaten(bot.id)
    return true
  }, [bot, me])

  const react = (mv, byBot) => {
    const g = gameRef.current
    if (g.isCheck() && byBot && Math.random() < 0.6) return setSay(pick(bot.chat.check))
    if (mv.captured && Math.random() < 0.5) return setSay(pick(byBot ? bot.chat.takes : bot.chat.lost))
    const bal = materialFor(g.fen(), botColor)
    if (bal >= 4 && Math.random() < 0.15) setSay(pick(bot.chat.winning))
    else if (bal <= -4 && Math.random() < 0.15) setSay(pick(bot.chat.losing))
  }

  // bot's turn
  useEffect(() => {
    if (result || game.turn() !== botColor) return
    const id = ++reqRef.current
    setThinking(true)
    ;(async () => {
      const engine = await getBotEngine()
      const started = performance.now()
      const mv = await chooseBotMove(engine, game.fen(), bot)
      // a short, human-ish pause
      const wait = Math.max(0, 450 + Math.random() * 700 - (performance.now() - started))
      await new Promise((r) => setTimeout(r, wait))
      if (id !== reqRef.current) return // a takeback or new game happened meanwhile
      const played = game.move({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' })
      setFen(game.fen()); setHistory(game.history()); setLastMove({ from: played.from, to: played.to })
      setThinking(false)
      if (!finishIfOver()) react(played, true)
    })()
  }, [fen, result]) // eslint-disable-line react-hooks/exhaustive-deps

  const playMove = (from, to) => {
    if (!myTurn) return false
    let mv
    try { mv = game.move({ from, to, promotion: 'q' }) } catch { return false }
    setFen(game.fen()); setHistory(game.history()); setLastMove({ from, to }); setSel(null); setHint(null)
    if (!finishIfOver()) react(mv, false)
    return true
  }

  // tap-to-move with legal-move dots
  const targets = useMemo(() => (sel && myTurn ? new Chess(fen).moves({ square: sel, verbose: true }) : []), [sel, fen, myTurn])
  const onSquareClick = (sq) => {
    if (!myTurn) return
    if (sel && targets.some((t) => t.to === sq)) { playMove(sel, sq); return }
    const p = new Chess(fen).get(sq)
    setSel(p && p.color === me && sq !== sel ? sq : null)
  }
  const lastTap = useRef({ sq: null, t: 0 })
  const tap = (sq) => {
    const now = performance.now()
    if (lastTap.current.sq === sq && now - lastTap.current.t < 250) return
    lastTap.current = { sq, t: now }
    onSquareClick(sq)
  }

  const askHint = async () => {
    if (!myTurn) return
    setHelpUsed(true)
    const engine = await getBotEngine()
    const { lines } = await engine.evaluate(game.fen(), 12)
    if (lines[0]?.pv?.[0]) setHint(lines[0].pv[0])
  }
  const takeback = () => {
    if (thinking || history.length === 0) return
    reqRef.current++
    setHelpUsed(true)
    // undo the bot's reply and your move (or just yours if the bot hasn't replied)
    if (game.turn() === me && history.length >= 2) { game.undo(); game.undo() } else if (game.turn() !== me) game.undo()
    setResult(null); setFen(game.fen()); setHistory(game.history()); setLastMove(null); setHint(null); setSel(null); setThinking(false)
    setSay(pick(['Changed your mind?', 'Take your time.', 'A second chance - use it well.']))
  }
  const resign = () => {
    if (result) return
    reqRef.current++
    setThinking(false)
    setResult({ winner: 'bot', text: `${bot.name} won`, reason: 'by resignation' })
    setSay(pick(bot.chat.win))
  }

  const pgn = () => {
    const g = new Chess()
    for (const m of history) g.move(m)
    const res = result ? (result.winner === 'draw' ? '1/2-1/2' : (result.winner === 'me') === (me === 'w') ? '1-0' : '0-1') : '*'
    g.header('Event', 'Singh Master Chess vs bot', 'Site', 'Singh Master Chess', 'Date', new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      'White', me === 'w' ? 'You' : `${bot.name} (bot)`, 'Black', me === 'b' ? 'You' : `${bot.name} (bot)`,
      'WhiteElo', me === 'w' ? '?' : String(bot.rating), 'BlackElo', me === 'b' ? '?' : String(bot.rating), 'Result', res,
      'Termination', result ? `${result.text} ${result.reason}` : '')
    return g.pgn()
  }

  const styles = {}
  if (lastMove) { styles[lastMove.from] = { background: 'rgba(227,178,60,0.35)' }; styles[lastMove.to] = { background: 'rgba(227,178,60,0.55)' } }
  if (game.isCheck()) {
    const k = game.board().flat().find((p) => p && p.type === 'k' && p.color === game.turn())
    if (k) styles[k.square] = { background: 'radial-gradient(circle, rgba(220,40,40,0.85) 0%, rgba(220,40,40,0.35) 45%, transparent 70%)' }
  }
  if (sel) styles[sel] = { background: 'rgba(255,214,102,0.6)' }
  for (const t of targets) styles[t.to] = t.captured ? { background: 'radial-gradient(circle, transparent 58%, rgba(20,20,20,0.35) 60%)' } : { background: 'radial-gradient(circle, rgba(20,20,20,0.32) 22%, transparent 24%)' }

  const moveRows = []
  for (let i = 0; i < history.length; i += 2) moveRows.push([history[i], history[i + 1]])

  return (
    <div className="bot-game">
      <div className="solver-top">
        <button className="secondary" onClick={onExit}>← Choose a bot</button>
        <span className="muted small">You play {sideName(me)}{helpUsed ? ' · assisted' : ''}</span>
      </div>
      <div className="solver-layout">
        <div className="solver-board" ref={wrap}>
          <div className="bot-bar">
            <BotAvatar bot={bot} size={40} />
            <div className="bot-bar-text">
              <strong>{bot.name} <span className="muted">({bot.rating})</span></strong>
              <span className="bot-speech">{thinking ? `${bot.name} is thinking...` : say}</span>
            </div>
          </div>
          <div className="board-wrap" style={{ width: size, height: size }}>
            <Chessboard
              id="bot-board" position={fen} boardWidth={size}
              boardOrientation={flipped ? 'black' : 'white'}
              arePiecesDraggable={myTurn}
              isDraggablePiece={({ piece }) => piece[0] === me}
              onPieceDrop={(from, to) => playMove(from, to)} autoPromoteToQueen
              onSquareClick={tap} onPieceClick={(p, sq) => tap(sq)}
              onPieceDragBegin={(p, sq) => { if (myTurn && p[0] === me) setSel(sq) }} onPieceDragEnd={() => setSel(null)}
              customSquareStyles={styles}
              customArrows={hint ? [[hint.slice(0, 2), hint.slice(2, 4), 'rgba(80,160,60,0.9)']] : []}
              customDarkSquareStyle={{ backgroundColor: 'var(--rb-dark)' }} customLightSquareStyle={{ backgroundColor: 'var(--rb-light)' }}
              animationDuration={200}
            />
          </div>
          <div className="player-bar"><i className={`piece ${me === 'w' ? 'white' : 'black'}`} /><strong>You</strong><span className="you-tag">you</span>
            <span className="player-extra"><button className="icon-btn" onClick={() => setFlipped(!flipped)} title="Flip board" aria-label="Flip board"><IconFlip /></button></span>
          </div>
        </div>

        <div className="solver-side card">
          {result ? (
            <div className={`game-over ${result.winner}`}>
              <strong>{result.text}</strong>
              <span>{result.reason}</span>
            </div>
          ) : (
            <div className={`solver-msg ${myTurn ? '' : 'good'}`}>{myTurn ? `Your move${game.isCheck() ? ' - you are in check!' : ''}` : `${bot.name} to move`}</div>
          )}
          <div className="bot-moves">
            {moveRows.length ? moveRows.map(([a, b], i) => (
              <div key={i} className="mv-row"><span className="mv-no">{i + 1}.</span><span className="mv">{a}</span><span className="mv">{b || ''}</span></div>
            )) : <p className="muted small">Moves will appear here.</p>}
          </div>
          {!result ? (
            <div className="solver-actions">
              {assist && <button className="secondary" onClick={askHint} disabled={!myTurn}><IconBulb /> Hint</button>}
              {assist && <button className="secondary" onClick={takeback} disabled={thinking || !history.length}><IconRetry /> Takeback</button>}
              <button className="secondary" onClick={() => { if (window.confirm('Resign this game?')) resign() }}>Resign</button>
            </div>
          ) : (
            <div className="solver-actions">
              <button className="big-green" onClick={() => onReview(pgn())}><IconStar size={20} /> Game Review</button>
              <button className="secondary" onClick={() => onExit({ rematch: true })}>Rematch</button>
              <button className="secondary" onClick={() => onExit()}>New bot</button>
            </div>
          )}
          {history.length > 0 && !result && <button className="link-btn small" onClick={() => navigator.clipboard?.writeText(pgn())}>Copy PGN</button>}
        </div>
      </div>
    </div>
  )
}

export default function PlayView({ onReview }) {
  const [setup, setSetup] = useState(null)
  const [round, setRound] = useState(0)
  if (!setup) return <BotPicker onStart={(s) => { setSetup(s); setRound((r) => r + 1) }} />
  return (
    <Game key={round} setup={setup} onReview={onReview}
      onExit={(opts) => {
        if (opts?.rematch) { setSetup({ ...setup, color: setup.color === 'w' ? 'b' : 'w' }); setRound((r) => r + 1) }
        else setSetup(null)
      }} />
  )
}
