// Game Review core: engine evaluation -> move classifications, accuracy, phases, coach text.
// Engine-agnostic: pass an `evaluate(fen, depth)` that resolves to
//   { lines: [{ cp?, mate?, pv: [uci...] }, ...] }  (scores from the side to move, best first)
import { Chess } from 'chess.js'

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }

export const CLASSES = {
  brilliant: { label: 'Brilliant', icon: '!!', color: '#1fb5a8' },
  great: { label: 'Great', icon: '!', color: '#5b8bd6' },
  best: { label: 'Best', icon: '★', color: '#7fae3c' },
  excellent: { label: 'Excellent', icon: '✓', color: '#86b84e' },
  good: { label: 'Good', icon: '✓', color: '#8f9e7c' },
  book: { label: 'Book', icon: 'B', color: '#a88763' },
  forced: { label: 'Forced', icon: '→', color: '#8a8984' },
  inaccuracy: { label: 'Inaccuracy', icon: '?!', color: '#e3b23c' },
  mistake: { label: 'Mistake', icon: '?', color: '#e8833a' },
  miss: { label: 'Miss', icon: '✗', color: '#e0605a' },
  blunder: { label: 'Blunder', icon: '??', color: '#d63a3a' },
}
export const COUNT_ORDER = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder']

const posKey = (fen) => fen.split(' ').slice(0, 4).join(' ')

/** Win chance (0-100) for the side the score belongs to. Same curve Lichess publishes. */
export function winPct(score) {
  if (score.mate != null) return score.mate > 0 ? 100 : score.mate < 0 ? 0 : 50
  const cp = Math.max(-1000, Math.min(1000, score.cp))
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}
/** Per-move accuracy from the drop in win chance (Lichess formula). */
const moveAccuracy = (drop) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, drop)) - 3.1669))

const flip = (s) => (s.mate != null ? { mate: -s.mate } : { cp: -s.cp })
export function fmtEval(s) {
  if (!s) return ''
  if (s.mated) return '#'
  if (s.mate != null) return s.mate === 0 ? '#' : `${s.mate > 0 ? '' : '-'}M${Math.abs(s.mate)}`
  const v = s.cp / 100
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}`
}

/** Splits text that may contain several PGNs and parses each one. */
export function parsePgnText(text) {
  const chunks = text.replace(/\r/g, '').split(/\n\s*\n(?=\[)/).map((c) => c.trim()).filter(Boolean)
  const games = []
  for (const chunk of chunks) {
    const c = new Chess()
    try {
      c.loadPgn(chunk)
    } catch {
      continue
    }
    const headers = c.getHeaders ? c.getHeaders() : c.header()
    const verbose = c.history({ verbose: true })
    if (!verbose.length) continue
    games.push({ headers, moves: verbose, pgn: chunk })
  }
  return games
}

function pvToSan(fen, pv, max = 8) {
  const c = new Chess(fen)
  const out = []
  for (const uci of pv.slice(0, max)) {
    try {
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      out.push(m.san)
    } catch {
      break
    }
  }
  return out
}

const material = (fen, color) => {
  let t = 0
  for (const ch of fen.split(' ')[0]) {
    const low = ch.toLowerCase()
    if (VAL[low] == null) continue
    const white = ch !== low
    t += (white === (color === 'w') ? 1 : -1) * VAL[low]
  }
  return t
}

/** A real sacrifice: after the move and the engine's best play, the mover is still down 2+ points. */
function sacrificeInLine(fenBefore, move, replyUci) {
  const start = material(fenBefore, move.color)
  const c = new Chess(move.after)
  const after = []
  for (let i = 0; i < Math.min(replyUci.length, 8); i++) {
    const u = replyUci[i]
    try { c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }) } catch { break }
    // only look after the mover's own moves, so normal trades have finished
    if (i % 2 === 1) after.push(material(c.fen(), move.color) - start)
  }
  if (!after.length) return false
  return Math.max(...after) <= -2
}

/** Squares of `color`'s pieces (knight or bigger) that the opponent can take for less than they are worth. */
function hangingSquares(fen, color) {
  const c = new Chess(fen)
  const them = color === 'w' ? 'b' : 'w'
  const out = []
  for (const row of c.board()) {
    for (const sq of row) {
      if (!sq || sq.color !== color || VAL[sq.type] < 3) continue
      const defended = c.attackers(sq.square, color).length > 0
      // a king can only take an undefended piece
      const attackers = c.attackers(sq.square, them).filter((a) => !(defended && c.get(a).type === 'k'))
      if (!attackers.length) continue
      const cheapest = Math.min(...attackers.map((a) => VAL[c.get(a).type] || 0))
      if (!defended || cheapest < VAL[sq.type]) out.push({ square: sq.square, type: sq.type })
    }
  }
  return out
}

const uciMove = (fen, u) => {
  try { return new Chess(fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }) } catch { return null }
}

/**
 * Was this move a real sacrifice (not a trade, not something already lost)?
 *  - accepted: the move puts a piece en prise, the engine's best reply takes it,
 *    and after the best line the mover is still 2+ points down;
 *  - offered: the move newly leaves a rook or queen hanging to a smaller piece and
 *    the engine's best reply declines it (because taking it loses).
 */
function sacrificeKind(move, replyUci) {
  if (move.piece === 'k' || move.san.includes('+')) return null
  const before = new Set(hangingSquares(move.before, move.color).map((h) => h.square))
  const fresh = hangingSquares(move.after, move.color).filter((h) => !before.has(h.square) || h.square === move.to)
  if (!fresh.length) return null
  const freshSquares = new Set(fresh.map((h) => h.square))
  const reply = replyUci[0] ? uciMove(move.after, replyUci[0]) : null
  const gained = move.captured ? VAL[move.captured] : 0

  if (reply?.captured && freshSquares.has(reply.to) && VAL[reply.captured] >= 3 && sacrificeInLine(move.before, move, replyUci)) {
    return { kind: 'accepted', piece: reply.captured }
  }
  const big = fresh.filter((h) => VAL[h.type] >= 5 && VAL[h.type] - gained >= 2).sort((a, b) => VAL[b.type] - VAL[a.type])[0]
  if (big && !(reply && reply.to === big.square)) return { kind: 'offered', piece: big.type }
  return null
}

/** Runs the engine over every position, reporting progress, then classifies the game. */
export async function reviewGame(game, evaluate, { depth = 14, onProgress, signal, openings } = {}) {
  const fens = [game.moves[0].before, ...game.moves.map((m) => m.after)]
  const evals = []
  for (let i = 0; i < fens.length; i++) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
    const c = new Chess(fens[i])
    let lines
    const white = c.turn() === 'w'
    if (c.isCheckmate()) {
      // already White's point of view: the side NOT to move has delivered mate
      evals.push({ lines: [{ mate: white ? -1 : 1, mated: true, pv: [] }], turn: c.turn() })
    } else {
      if (c.isDraw() || c.isStalemate()) lines = [{ cp: 0, pv: [] }]
      else lines = (await evaluate(fens[i], depth)).lines
      // engine scores are from the side to move; store White's point of view
      evals.push({
        lines: lines.map((l) => {
          const s = l.mate != null ? { mate: l.mate } : { cp: l.cp }
          return { ...(white ? s : flip(s)), pv: l.pv }
        }),
        turn: c.turn(),
      })
    }
    onProgress?.({ done: i + 1, total: fens.length })
  }
  return classifyGame(game, fens, evals, openings)
}

function scoreFor(ev, color) {
  const top = ev.lines[0]
  const s = top.mate != null ? { mate: top.mate } : { cp: top.cp }
  return color === 'w' ? s : flip(s)
}

/**
 * Game phase, using the same rule of thumb as Lichess: the endgame starts once
 * 6 or fewer pieces are left (queens, rooks, bishops, knights - not kings or pawns),
 * or when the queens are off and each side has at most a rook and a minor piece.
 */
export function phaseOf(fen, ply, book) {
  const board = fen.split(' ')[0]
  let pieces = 0, queens = 0
  const side = { w: 0, b: 0 }
  for (const ch of board) {
    const t = ch.toLowerCase()
    if (!'nbrq'.includes(t)) continue
    pieces++
    if (t === 'q') queens++
    side[ch === t ? 'b' : 'w'] += VAL[t]
  }
  if (pieces <= 6 || (queens === 0 && side.w <= 8 && side.b <= 8)) return 'endgame'
  if (book || ply < 20) return 'opening'
  return 'middlegame'
}

export function classifyGame(game, fens, evals, openings = globalThis.__openingBook || {}) {
  openings = openings || {}
  const moves = []
  let inBook = true
  let openingName = ''
  for (let i = 0; i < game.moves.length; i++) {
    const m = game.moves[i]
    const color = m.color
    const before = evals[i], after = evals[i + 1]
    const best = before.lines[0]
    const sBest = scoreFor(before, color)
    const sAfter = scoreFor(after, color)
    const wBest = winPct(sBest)
    const wAfter = winPct(sAfter)
    const loss = Math.max(0, wBest - wAfter) / 100
    const uci = m.from + m.to + (m.promotion || '')
    const bestUci = best.pv?.[0]
    const isBest = bestUci ? bestUci === uci : loss < 0.001
    const legal = new Chess(m.before).moves().length

    const key = posKey(m.after)
    const bookHit = i < 30 && key in openings && (inBook || i < 16)
    if (bookHit && openings[key]) openingName = openings[key]
    if (!bookHit && i >= 16) inBook = false

    let cls
    if (bookHit) cls = 'book'
    else if (legal === 1) cls = 'forced'
    else if (isBest) cls = 'best'
    else if (loss <= 0.02) cls = 'excellent'
    else if (loss <= 0.05) cls = 'good'
    else if (loss <= 0.1) cls = 'inaccuracy'
    else if (loss <= 0.2) cls = 'mistake'
    else cls = 'blunder'

    // Miss: the opponent just erred and this move lets them off the hook
    const prev = moves[i - 1]
    if (prev && ['mistake', 'blunder', 'miss'].includes(prev.cls) && ['mistake', 'blunder'].includes(cls)) {
      const baseline = 100 - prev.wBest // my winning chances before the opponent's error
      if (wAfter >= baseline - 5) cls = 'miss'
    }

    // Great: the best move when every other move is clearly worse
    const second = before.lines[1]
    const punishing = m.captured && prev && ['mistake', 'blunder', 'miss'].includes(prev.cls)
    if (cls === 'best' && second && !bookHit && !punishing) {
      const sSecond = color === 'w' ? second : flip(second)
      const gap = wBest - winPct(sSecond.mate != null ? { mate: sSecond.mate } : { cp: sSecond.cp })
      if (gap >= 15 && wBest > 20 && wBest < 92) cls = 'great'
    }
    // Brilliant: a sound sacrifice - the best (or near-best) move, not played from an already
    // crushing position, and you are not worse after it
    let sacrifice = null
    if (['best', 'great', 'excellent'].includes(cls) && loss <= 0.02 && wBest < 95 && wAfter >= 45) {
      sacrifice = sacrificeKind(m, after.lines[0]?.pv || [])
      if (sacrifice) cls = 'brilliant'
    }

    const accuracy = cls === 'book' || cls === 'forced' ? 100 : moveAccuracy(wBest - wAfter)
    moves.push({
      ply: i + 1, san: m.san, color, from: m.from, to: m.to, uci, cls,
      fenBefore: m.before, fenAfter: m.after,
      evalAfter: after.lines[0], evalBefore: best,
      wBest, wAfter, loss, accuracy,
      bestSan: bestUci ? pvToSan(m.before, [bestUci], 1)[0] : null,
      bestUci, bestLine: bestUci ? pvToSan(m.before, best.pv) : [],
      replyLine: after.lines[0]?.pv ? pvToSan(m.after, after.lines[0].pv, 6) : [],
      phase: phaseOf(m.before, i, bookHit),
      captured: m.captured, piece: m.piece, isCheck: m.san.includes('+'), isMate: m.san.includes('#'),
      isCastle: m.san.startsWith('O-O'), promotion: m.promotion, sacrifice,
    })
  }
  for (const mv of moves) mv.text = coachText(mv, moves, openingName)
  return { moves, fens, evals, summary: summarize(moves), openingName }
}

function gameAccuracy(list) {
  if (!list.length) return null
  const a = list.map((m) => m.accuracy)
  // Average of the plain mean and the harmonic mean: one big error drags the score down,
  // without letting a single move wipe it out. Closest of the formulas tried to Chess.com's
  // own numbers on six reviewed games (about 9 points apart on average).
  const mean = a.reduce((x, y) => x + y, 0) / a.length
  const harmonic = a.length / a.reduce((x, y) => x + 1 / Math.max(1, y), 0)
  return (mean + harmonic) / 2
}

function summarize(moves) {
  const side = (c) => {
    const ms = moves.filter((m) => m.color === c)
    const counts = Object.fromEntries(COUNT_ORDER.map((k) => [k, ms.filter((m) => m.cls === k).length]))
    const phases = {}
    for (const p of ['opening', 'middlegame', 'endgame']) {
      const pm = ms.filter((m) => m.phase === p)
      phases[p] = pm.length ? gameAccuracy(pm) : null
    }
    return { accuracy: gameAccuracy(ms), counts, phases, moves: ms.length }
  }
  const keyMoments = moves.filter((m) => ['brilliant', 'great', 'mistake', 'miss', 'blunder'].includes(m.cls))
  return { w: side('w'), b: side('b'), keyMoments }
}

/* ---------------------------------------------------------------- coach text */

function hangs(mv) {
  // What does the opponent's best reply take?
  if (!mv.replyLine.length) return null
  const c = new Chess(mv.fenAfter)
  try {
    const r = c.move(mv.replyLine[0])
    if (r.captured) return { piece: NAMES[r.captured], square: r.to, by: r.san }
  } catch { /* ignore */ }
  return null
}

function motif(mv) {
  if (mv.isMate) return 'Checkmate!'
  if (mv.promotion) return `Promotes to a ${NAMES[mv.promotion]}.`
  if (mv.isCastle) return 'Castling tucks the king away and connects the rooks.'
  if (mv.captured) return `Wins back material by taking the ${NAMES[mv.captured]}.`
  if (mv.isCheck) return 'A check that keeps the initiative.'
  if (mv.phase === 'opening' && 'nb'.includes(mv.piece)) return `Develops the ${NAMES[mv.piece]} toward the centre.`
  if (mv.phase === 'opening' && mv.piece === 'p' && 'de'.includes(mv.to[0])) return 'Grabs space in the centre.'
  return ''
}

function coachText(mv, moves, openingName) {
  const best = mv.bestSan
  const bestLine = mv.bestLine.slice(0, 5).join(' ')
  const evalTxt = fmtEval(mv.evalAfter)
  const mateAgainst = mv.evalAfter.mate != null && ((mv.color === 'w' && mv.evalAfter.mate < 0) || (mv.color === 'b' && mv.evalAfter.mate > 0))
  const hung = hangs(mv)
  switch (mv.cls) {
    case 'book':
      return openingName ? `${openingName.replace(/^[A-E]\d\d /, '')}. A standard opening move.` : 'A standard opening move.'
    case 'forced':
      return 'The only legal move.'
    case 'brilliant':
      return mv.sacrifice?.kind === 'offered'
        ? `Brilliant! You leave your ${NAMES[mv.sacrifice.piece]} hanging - but taking it would cost your opponent the game. The engine's top choice.`
        : `A brilliant sacrifice! Giving up the ${NAMES[mv.sacrifice?.piece || mv.piece]} looks risky, but the engine says it is the strongest continuation.`
    case 'great':
      return 'A great find - the only move that keeps your position on track. Every alternative was clearly worse.'
    case 'best':
      return `The engine's top choice. ${motif(mv)}`.trim()
    case 'excellent':
      return `Very close to the best move. ${motif(mv)} ${best ? `The engine slightly preferred ${best}.` : ''}`.trim()
    case 'good':
      return `A reasonable move, but ${best} was more precise.`
    case 'inaccuracy':
      return `Not the most accurate. ${best} was better${bestLine ? ` (${bestLine})` : ''}.`
    case 'miss':
      return `Your opponent's last move was an error, and ${best} would have punished it. Now the chance has gone.`
    case 'mistake':
      if (hung) return `This lets your opponent win a ${hung.piece} with ${hung.by}. ${best} was the move.`
      return `This makes your position harder. ${best} was stronger${bestLine ? `: ${bestLine}` : ''}.`
    case 'blunder':
      if (mateAgainst) return `This walks into a forced checkmate (${evalTxt}). ${best} was needed.`
      if (hung) return `This hangs your ${hung.piece} on ${hung.square} - your opponent can play ${hung.by}. ${best} was the move.`
      return `A serious error that swings the game. ${best} was much better${bestLine ? `: ${bestLine}` : ''}.`
    default:
      return ''
  }
}
