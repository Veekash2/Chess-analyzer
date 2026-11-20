import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCustomPieces } from '../BoardPicker'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { BOTS, CELEBS, CELEB_GROUP, ALL_BOTS, LEVELS, chooseBotMove, getBeaten, markBeaten, materialFor, pick } from './bots'
import { getBotEngine, getOpeningBook } from '../review/engine'
import { lineFor } from './chatLines'
import Portrait from './Portrait'
import { useWidth } from '../insights/Visuals'
import { IconBulb, IconFlip, IconRetry, IconStar } from '../review/icons'

const sideName = (c) => (c === 'w' ? 'White' : 'Black')

// Time controls like Chess.com: minutes + increment (seconds added after every move).
export const TIME_CONTROLS = [
  { group: 'Bullet', icon: '⚡', items: [[1, 0], [1, 1], [2, 1]] },
  { group: 'Blitz', icon: '🔥', items: [[3, 0], [3, 2], [5, 0]] },
  { group: 'Rapid', icon: '⏱', items: [[10, 0], [15, 10], [30, 0]] },
]
const tcLabel = (tc) => (tc ? (tc[1] ? `${tc[0]} | ${tc[1]}` : `${tc[0]} min`) : 'No clock')
const TC_KEY = 'smc-bot-tc'
function savedTc() {
  try { const v = JSON.parse(localStorage.getItem(TC_KEY) || 'null'); return v === null || Array.isArray(v) ? v : null } catch { return null }
}

/** 4:05, 0:42 - and tenths (0:08.3) once under 20 seconds, like Chess.com. */
export function fmtClock(ms) {
  const t = Math.max(0, ms)
  if (t < 20000) return `0:${String(Math.floor(t / 1000)).padStart(2, '0')}.${Math.floor((t % 1000) / 100)}`
  const s = Math.ceil(t / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
const pgnClock = (ms) => {
  const t = Math.max(0, ms) / 1000
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}

/** Can this side still checkmate? (lone king, or king + one minor piece, cannot) */
function canMate(g, color) {
  const mine = g.board().flat().filter((p) => p && p.color === color && p.type !== 'k')
  return !(mine.length === 0 || (mine.length === 1 && 'nb'.includes(mine[0].type)))
}

function Clock({ ms, active, low }) {
  return <span className={`clock ${active ? 'on' : ''} ${low ? 'low' : ''}`} role="timer" aria-label={`${fmtClock(ms)} left`}>{fmtClock(ms)}</span>
}

function BotAvatar({ bot, size = 48 }) {
  return <Portrait look={bot.look} bg={bot.color} size={size} title={`${bot.name} portrait`} />
}

/* ------------------------------------------------------------------ choose a bot */
function BotPicker({ onStart, start }) {
  const [botId, setBotId] = useState(() => { try { return localStorage.getItem('smc-bot-last') || 'haathi' } catch { return 'haathi' } })
  const [color, setColor] = useState('w')
  const [assist, setAssist] = useState(true)
  const [tc, setTc] = useState(savedTc)
  const chooseTc = (v) => { setTc(v); try { localStorage.setItem(TC_KEY, JSON.stringify(v)) } catch { /* ignore */ } }
  const beaten = getBeaten()
  const bot = ALL_BOTS.find((b) => b.id === botId) || BOTS[5]
  const choose = (id) => { setBotId(id); try { localStorage.setItem('smc-bot-last', id) } catch { /* ignore */ } }
  return (
    <div className="bot-picker">
      <section className="card">
        <h3>Play a bot</h3>
        <p className="muted small">Pick an opponent. Each bot is Stockfish running in your browser, tuned to play like a person at that level - with its own style and a few things to say.</p>
        {LEVELS.map((lv, li) => {
          const list = BOTS.filter((b) => b.rating <= lv.max && (li === 0 || b.rating > LEVELS[li - 1].max))
          return (
            <div key={lv.name} className="bot-level">
              <h5>{lv.name} <span className="muted small">{list[0].rating}-{list.at(-1).rating}</span></h5>
              <div className="bot-grid">
                {list.map((b) => (
                  <button key={b.id} className={`bot-card ${b.id === botId ? 'on' : ''}`} onClick={() => choose(b.id)} aria-pressed={b.id === botId}>
                    <BotAvatar bot={b} size={56} />
                    <span className="bot-name">{b.name}{beaten[b.id] ? <span className="beaten" title={`Beaten ${beaten[b.id]}x`}>★</span> : null}</span>
                    <span className="bot-rating">{b.rating}</span>
                    <span className="bot-tag small">{b.tagline}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        <div className="bot-level celeb-level">
          <h5>{CELEB_GROUP}</h5>
          <p className="muted small">Fan-made style bots: Stockfish set to each player's approximate rating, playing openings they are known for, with a few of their trademark habits. Not affiliated with them, and the chat lines are made up.</p>
          <div className="bot-grid">
            {CELEBS.map((b) => (
              <button key={b.id} className={`bot-card ${b.id === botId ? 'on' : ''}`} onClick={() => choose(b.id)} aria-pressed={b.id === botId}>
                <BotAvatar bot={b} size={56} />
                <span className="bot-name">{b.name}{beaten[b.id] ? <span className="beaten" title={`Beaten ${beaten[b.id]}x`}>★</span> : null}</span>
                <span className="bot-rating">{b.rating}</span>
                <span className="bot-tag small">{b.tagline}</span>
              </button>
            ))}
          </div>
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
        {start && <p className="start-banner small">Continuing from your <strong>{start.opening}</strong> position as {start.color === 'w' ? 'White' : 'Black'}.</p>}
        {!start && <h5>I play as</h5>}
        {!start && <div className="tabs chips small-chips" role="radiogroup" aria-label="Your colour">
          {[['w', 'White'], ['random', 'Random'], ['b', 'Black']].map(([k, label]) => (
            <button key={k} role="radio" aria-checked={color === k} className={color === k ? 'tab active' : 'tab'} onClick={() => setColor(k)}>{label}</button>
          ))}
        </div>}
        <h5>Time control</h5>
        <div className="tc-picker">
          {TIME_CONTROLS.map((g) => (
            <div key={g.group} className="tc-group">
              <span className="tc-head small muted"><span aria-hidden="true">{g.icon}</span> {g.group}</span>
              <div className="tc-row">
                {g.items.map((t) => {
                  const on = tc && tc[0] === t[0] && tc[1] === t[1]
                  return <button key={t.join('+')} className={`tc-btn ${on ? 'on' : ''}`} aria-pressed={!!on} onClick={() => chooseTc(t)}>{tcLabel(t)}</button>
                })}
              </div>
            </div>
          ))}
          <button className={`tc-btn wide ${tc ? '' : 'on'}`} aria-pressed={!tc} onClick={() => chooseTc(null)}>No clock - take your time</button>
        </div>
        <label className="check small"><input type="checkbox" checked={assist} onChange={(e) => setAssist(e.target.checked)} /> Allow hints and takebacks</label>
        <button className="big-green" onClick={() => onStart({ bot, color: start ? start.color : color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color, assist, tc, startMoves: start?.moves })}>
          <IconStar size={22} /> Play {bot.name}{tc ? ` · ${tcLabel(tc)}` : ''}
        </button>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ the game */
function Game({ setup, onExit, onReview }) {
  const customPieces = useCustomPieces()
  const { bot, color: me, assist, tc } = setup
  const botColor = me === 'w' ? 'b' : 'w'
  const [wrap, W] = useWidth(520)
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 900)
  useEffect(() => { const on = () => setVh(window.innerHeight); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [])
  const size = Math.max(260, Math.min(W, 600, W > 640 ? vh - 190 : Infinity))

  const gameRef = useRef(null)
  if (!gameRef.current) { const g = new Chess(); for (const m of setup.startMoves || []) g.move(m); gameRef.current = g }
  const [fen, setFen] = useState(gameRef.current.fen())
  const [history, setHistory] = useState(() => gameRef.current.history())
  const [thinking, setThinking] = useState(false)
  const [say, setSay] = useState(() => lineFor(bot, 'hello'))
  const [result, setResult] = useState(null) // { text, winner: 'me'|'bot'|'draw', reason }
  const [flipped, setFlipped] = useState(me === 'b')
  const [sel, setSel] = useState(null)
  const [hint, setHint] = useState(null) // uci
  const [lastMove, setLastMove] = useState(null)
  const [helpUsed, setHelpUsed] = useState(false)
  const reqRef = useRef(0)
  const trick = useRef({}) // per-game state for one-off bot tricks
  // ---- chat memory
  const bookRef = useRef(null)
  const chat = useRef({ family: null, lastPly: -9, prevEval: null, saidLow: false })
  useEffect(() => { getOpeningBook().then((b) => { bookRef.current = b }) }, [])
  const speak = (event, vars) => {
    const t = lineFor(bot, event, vars)
    if (t) { setSay(t); chat.current.lastPly = gameRef.current.history().length }
    return !!t
  }
  const quietFor = () => gameRef.current.history().length - chat.current.lastPly
  /** Opening name if this move reached a new named opening family. */
  const openingNow = () => {
    const g = gameRef.current
    const n = g.history().length
    if (!bookRef.current || n < 3 || n > 20) return null
    const name = bookRef.current[g.fen().split(' ').slice(0, 4).join(' ')]
    if (!name) return null
    const fam = name.replace(/^[A-E]\d\d /, '').split(':')[0].trim()
    if (!fam || fam === chat.current.family || /Pawn Game|Pawn Opening$/.test(fam)) return null
    chat.current.family = fam
    return fam
  }

  // ---- clocks: remaining ms per side; `since` = when the side to move started thinking
  const clk = useRef({ w: tc ? tc[0] * 60000 : 0, b: tc ? tc[0] * 60000 : 0, since: null })
  const clkHist = useRef([]) // remaining time after each move, for [%clk] in the PGN
  const [, setTick] = useState(0)
  const live = (c) => {
    const k = clk.current
    return k[c] - (k.since != null && gameRef.current.turn() === c ? performance.now() - k.since : 0)
  }
  /** Stop the running clock, charging the side to move for the time used. */
  const stopClock = () => {
    const k = clk.current
    if (tc && k.since != null) { const c = gameRef.current.turn(); k[c] = Math.max(0, live(c)); k.since = null }
  }
  /** Called right after `mover` moved: charge their time, add the increment, start the other clock. */
  const punch = (mover) => {
    if (!tc) return
    const k = clk.current
    const now = performance.now()
    const started = k.since != null
    if (started) k[mover] = Math.max(0, k[mover] - (now - k.since))
    if (started) k[mover] += tc[1] * 1000 // no increment for White's very first move
    clkHist.current.push(k[mover])
    k.since = now // clocks start once White has moved
  }

  const game = gameRef.current
  const myTurn = !result && game.turn() === me && !thinking

  const finishIfOver = useCallback(() => {
    const g = gameRef.current
    if (!g.isGameOver()) return false
    stopClock()
    let r
    if (g.isCheckmate()) {
      const winner = g.turn() === me ? 'bot' : 'me'
      r = { winner, text: winner === 'me' ? 'You won!' : `${bot.name} won`, reason: 'by checkmate' }
    } else {
      const why = g.isStalemate() ? 'stalemate' : g.isThreefoldRepetition() ? 'repetition' : g.isInsufficientMaterial() ? 'insufficient material' : '50-move rule'
      r = { winner: 'draw', text: 'Draw', reason: `by ${why}` }
    }
    setResult(r)
    setSay(lineFor(bot, r.winner === 'me' ? 'loss' : r.winner === 'bot' ? 'win' : 'draw'))
    if (r.winner === 'me') markBeaten(bot.id)
    return true
  }, [bot, me])

  // tick the clock display and catch a flag fall
  useEffect(() => {
    if (!tc || result) return
    const iv = setInterval(() => {
      const k = clk.current
      if (k.since == null) return
      const c = gameRef.current.turn()
      if (live(c) <= 0) {
        reqRef.current++
        k[c] = 0; k.since = null
        setThinking(false)
        if (!canMate(gameRef.current, c === 'w' ? 'b' : 'w')) {
          setResult({ winner: 'draw', text: 'Draw', reason: 'timeout vs insufficient material' })
          setSay(lineFor(bot, 'draw'))
        } else if (c === me) {
          setResult({ winner: 'bot', text: `${bot.name} won`, reason: 'on time' })
          setSay(lineFor(bot, 'win'))
        } else {
          setResult({ winner: 'me', text: 'You won!', reason: 'on time' })
          setSay(pick(['My flag fell! Too slow...', ...bot.chat.loss]))
          markBeaten(bot.id)
        }
      }
      if (c === me && !chat.current.saidLow && live(me) < 15000 && live(me) > 0) { chat.current.saidLow = true; speak('lowTime') }
      setTick((t) => t + 1)
    }, 100)
    return () => clearInterval(iv)
  }, [tc, result]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Decide what (if anything) the bot says after a move - most interesting thing first. */
  const react = (mv, byBot, evalEvent) => {
    const g = gameRef.current
    const opening = openingNow()
    if (byBot) {
      if (evalEvent && speak(evalEvent)) return
      if (opening && speak('myOpening', { opening })) return
      if (g.isCheck() && Math.random() < 0.6 && speak('check')) return
      if (mv.captured === 'q' && !g.board().flat().some((p) => p && p.type === 'q') && speak('queenTrade')) return
      if (quietFor() < 2) return
      if (mv.captured && Math.random() < 0.5 && speak('takes')) return
    } else {
      if (mv.promotion && speak('promote')) return
      if (mv.flags.includes('k') || mv.flags.includes('q')) { if (Math.random() < 0.7 && speak('castle')) return }
      if (mv.captured === 'q' && !g.board().flat().some((p) => p && p.type === 'q') && speak('queenTrade')) return
      if (opening && speak('opening', { opening })) return
      if (quietFor() < 2) return
      if (mv.captured && Math.random() < 0.5 && speak('lost')) return
    }
    if (quietFor() < 4) return
    const bal = materialFor(g.fen(), botColor)
    if (bal >= 4 && Math.random() < 0.25) speak('winning')
    else if (bal <= -4 && Math.random() < 0.25) speak('losing')
  }

  // say something if you think for a long time
  useEffect(() => {
    if (!myTurn || result) return
    const wait = tc ? Math.min(30000, Math.max(10000, live(me) * 0.2)) : 25000
    const t = setTimeout(() => speak('idle'), wait)
    return () => clearTimeout(t)
  }, [fen, myTurn, result]) // eslint-disable-line react-hooks/exhaustive-deps


  // bot's turn
  useEffect(() => {
    if (result || game.turn() !== botColor) return
    const id = ++reqRef.current
    setThinking(true)
    ;(async () => {
      const engine = await getBotEngine()
      const started = performance.now()
      const left = tc ? live(botColor) : Infinity
      // in time trouble the bot calculates less, like a person would
      const depth = left < 5000 ? Math.min(bot.depth, 3) : left < 15000 ? Math.min(bot.depth, 6) : bot.depth
      const mv = await chooseBotMove(engine, game.fen(), depth === bot.depth ? bot : { ...bot, depth }, game.history(), trick.current)
      // a human-ish pause, scaled to the clock: quick in bullet, more thought in rapid
      const target = bot.fast ? 120 + Math.random() * 250
        : !tc ? 450 + Math.random() * 700
        : clkHist.current.length < 4 ? 300 + Math.random() * 500 // opening moves come fast
          : left < 5000 ? 80
            : Math.min(Math.max(left / 45 + tc[1] * 500, 250), 6000) * (0.5 + Math.random())
      const wait = Math.max(0, target - (performance.now() - started))
      await new Promise((r) => setTimeout(r, wait))
      if (id !== reqRef.current) return // a takeback or new game happened meanwhile
      const played = game.move({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' })
      punch(botColor)
      setFen(game.fen()); setHistory(game.history()); setLastMove({ from: played.from, to: played.to })
      setThinking(false)
      // did your last move change the evaluation a lot? (bot's view, before and after your move)
      const ev = trick.current.lastEval
      let evalEvent = null
      if (ev != null && chat.current.prevEval != null && bot.depth >= 3) {
        const d = ev - chat.current.prevEval
        if (d >= 220 && ev > -150) evalEvent = 'userBlunder'
        else if (d <= -160) evalEvent = 'goodMove'
      }
      if (ev != null) chat.current.prevEval = ev
      if (!finishIfOver()) { if (mv.say) { setSay(mv.say); chat.current.lastPly = game.history().length } else react(played, true, evalEvent) }
    })()
  }, [fen, result]) // eslint-disable-line react-hooks/exhaustive-deps

  const playMove = (from, to) => {
    if (!myTurn) return false
    let mv
    try { mv = game.move({ from, to, promotion: 'q' }) } catch { return false }
    punch(me)
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
    stopClock()
    const n = game.turn() === me && history.length >= 2 ? 2 : game.turn() !== me ? 1 : 0
    for (let i = 0; i < n; i++) game.undo()
    clkHist.current = clkHist.current.slice(0, game.history().length)
    if (tc && game.history().length) clk.current.since = performance.now()
    setResult(null); setFen(game.fen()); setHistory(game.history()); setLastMove(null); setHint(null); setSel(null); setThinking(false)
    setSay(pick(['Changed your mind?', 'Take your time.', 'A second chance - use it well.']))
  }
  const resign = () => {
    if (result) return
    reqRef.current++
    stopClock()
    setThinking(false)
    setResult({ winner: 'bot', text: `${bot.name} won`, reason: 'by resignation' })
    setSay(lineFor(bot, 'win'))
  }

  const pgn = () => {
    const g = new Chess()
    history.forEach((m, i) => {
      g.move(m)
      if (tc && clkHist.current[i] != null) g.setComment(`[%clk ${pgnClock(clkHist.current[i])}]`)
    })
    const res = result ? (result.winner === 'draw' ? '1/2-1/2' : (result.winner === 'me') === (me === 'w') ? '1-0' : '0-1') : '*'
    g.header('Event', 'Singh Master Chess vs bot', 'Site', 'Singh Master Chess', 'Date', new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      'White', me === 'w' ? 'You' : `${bot.name} (bot)`, 'Black', me === 'b' ? 'You' : `${bot.name} (bot)`,
      'WhiteElo', me === 'w' ? '?' : String(bot.rating), 'BlackElo', me === 'b' ? '?' : String(bot.rating), 'Result', res,
      'Termination', result ? `${result.text} ${result.reason}` : '',
      'TimeControl', tc ? `${tc[0] * 60}${tc[1] ? `+${tc[1]}` : ''}` : '-')
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
        <span className="muted small">You play {sideName(me)} · {tcLabel(tc)}{helpUsed ? ' · assisted' : ''}</span>
      </div>
      <div className="solver-layout">
        <div className="solver-board" ref={wrap}>
          <div className="bot-bar">
            <BotAvatar bot={bot} size={40} />
            <div className="bot-bar-text">
              <strong>{bot.name} <span className="muted">({bot.rating})</span></strong>
              <span className="bot-speech">{thinking ? `${bot.name} is thinking...` : say}</span>
            </div>
            {tc && <Clock ms={live(botColor)} active={!result && clk.current.since != null && game.turn() === botColor} low={live(botColor) < Math.min(20000, tc[0] * 6000)} />}
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
              customPieces={customPieces} customDarkSquareStyle={{ backgroundColor: 'var(--rb-dark)', backgroundImage: 'var(--rb-dark-img, none)' }} customLightSquareStyle={{ backgroundColor: 'var(--rb-light)', backgroundImage: 'var(--rb-light-img, none)' }}
              animationDuration={200}
            />
          </div>
          <div className="player-bar"><i className={`piece ${me === 'w' ? 'white' : 'black'}`} /><strong>You</strong><span className="you-tag">you</span>
            <span className="player-extra">{tc && <Clock ms={live(me)} active={!result && clk.current.since != null && game.turn() === me} low={live(me) < Math.min(20000, tc[0] * 6000)} />}<button className="icon-btn" onClick={() => setFlipped(!flipped)} title="Flip board" aria-label="Flip board"><IconFlip /></button></span>
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
            <div className="solver-actions end">
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

export default function PlayView({ onReview, start }) {
  const [setup, setSetup] = useState(null)
  const [round, setRound] = useState(0)
  useEffect(() => { if (start) setSetup(null) }, [start])
  if (!setup) return <BotPicker start={start} onStart={(s) => { setSetup(s); setRound((r) => r + 1) }} />
  return (
    <Game key={round} setup={setup} onReview={onReview}
      onExit={(opts) => {
        if (opts?.rematch) { setSetup({ ...setup, color: setup.startMoves ? setup.color : setup.color === 'w' ? 'b' : 'w' }); setRound((r) => r + 1) }
        else setSetup(null)
      }} />
  )
}
