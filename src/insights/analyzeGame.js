import { Chess } from 'chess.js'

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const START_NON_PAWN = 31 // 2N + 2B + 2R + Q per side
const PIECE_IDX = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 }
const MAX_CURVE = 80 // moves kept for the per-move curves

// 'e4' -> 0..63 with a1 = 0, h8 = 63
const sqIndex = (sq) => (sq.charCodeAt(0) - 97) + (sq.charCodeAt(1) - 49) * 8

function parseClock(c) {
  const m = c.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/)
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : null
}

/** Splits Chess.com PGN movetext into SAN moves and the clock left after each ply. */
export function parseMovetext(pgn) {
  // drop the header lines; clock comments like {[%clk 0:02:59]} also contain brackets
  const body = pgn.split(/\r?\n/).filter((l) => !/^\s*\[[A-Za-z]/.test(l)).join(' ')
  const sans = []
  const clocks = []
  const re = /\{([^}]*)\}|(\d+\.(?:\.\.)?)|(1-0|0-1|1\/2-1\/2|\*)|([^\s{}]+)/g
  let m
  while ((m = re.exec(body))) {
    if (m[1] !== undefined) {
      const clk = m[1].match(/%clk\s+([\d:.]+)/)
      if (clk && sans.length) clocks[sans.length - 1] = parseClock(clk[1])
    } else if (m[4]) {
      sans.push(m[4])
    }
  }
  return { sans, clocks }
}

function baseTime(tc) {
  if (!tc || tc.includes('/')) return null // daily games: no clock analysis
  const [base, inc] = tc.split('+').map(Number)
  return { base, inc: inc || 0 }
}

/**
 * Replays one game and extracts everything the Insights tab needs.
 * Pure function: runs in the Web Worker and in Node tests.
 */
export function analyzeGame({ pgn, color, timeControl }) {
  const me = color === 'white' ? 'w' : 'b'
  const { sans, clocks } = parseMovetext(pgn)
  const chess = new Chess()
  const out = {
    plies: 0,
    myMoves: 0,
    castle: null,
    castleMove: null,
    pieceMoves: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    captures: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    checks: 0,
    promos: 0,
    underpromos: 0,
    earlyQueen: false,
    firstMoves: sans.slice(0, 2),
    endPhase: 'opening',
    maxDeficit: 0, // worst material deficit held for 4+ plies
    maxLead: 0, // best material lead held for 4+ plies
    finalDiff: 0,
    time: null,
    dest: [], // pieceIdx * 64 + square for every move I made
    matCurve: [], // my material minus theirs after each full move
    clockCurve: [], // share of my starting clock left after each of my moves
  }
  let diff = 0 // my material minus opponent's
  const nonPawn = { w: START_NON_PAWN, b: START_NON_PAWN }
  const window = []
  for (const san of sans) {
    let mv
    try {
      mv = chess.move(san)
    } catch {
      break // corrupt or variant move text - keep what we have
    }
    const mine = mv.color === me
    const ply = out.plies
    if (mv.captured) {
      const v = VAL[mv.captured]
      diff += mine ? v : -v
      if (mv.captured !== 'p') nonPawn[mv.color === 'w' ? 'b' : 'w'] -= v
    }
    if (mv.promotion) {
      const v = VAL[mv.promotion] - 1
      diff += mine ? v : -v
      nonPawn[mv.color] += VAL[mv.promotion]
    }
    if (mine) {
      out.myMoves++
      out.pieceMoves[mv.piece]++
      if (mv.captured) out.captures[mv.piece]++
      if (mv.san.includes('+') || mv.san.includes('#')) out.checks++
      if (mv.promotion) {
        out.promos++
        if (mv.promotion !== 'q') out.underpromos++
      }
      if (!out.castle && (mv.san.startsWith('O-O'))) {
        out.castle = mv.san.startsWith('O-O-O') ? 'long' : 'short'
        out.castleMove = Math.floor(ply / 2) + 1
      }
      if (mv.piece === 'q' && ply < 12) out.earlyQueen = true
      if (!mv.san.startsWith('O-O')) out.dest.push(PIECE_IDX[mv.piece] * 64 + sqIndex(mv.to))
      else out.dest.push(PIECE_IDX.k * 64 + sqIndex(mv.to))
    }
    if (mv.color === 'b' && out.matCurve.length < MAX_CURVE) out.matCurve.push(diff)
    out.plies++
    window.push(diff)
    if (window.length > 4) window.shift()
    if (window.length === 4) {
      out.maxLead = Math.max(out.maxLead, Math.min(...window))
      out.maxDeficit = Math.max(out.maxDeficit, -Math.max(...window))
    }
  }
  out.finalDiff = diff
  const totalNonPawn = nonPawn.w + nonPawn.b
  out.endPhase = totalNonPawn <= 26 ? 'endgame' : out.plies <= 24 ? 'opening' : 'middlegame'

  // Clock analysis: seconds spent per own move, by stage of the game
  const tc = baseTime(timeControl)
  if (tc && clocks.length) {
    const myStart = me === 'w' ? 0 : 1
    const spent = { opening: [], middlegame: [], late: [] }
    let prev = tc.base
    let troubleMoves = 0
    let lastClock = null
    for (let i = myStart; i < out.plies; i += 2) {
      const c = clocks[i]
      if (c == null) continue
      const used = Math.max(0, prev + tc.inc - c)
      const moveNo = Math.floor(i / 2) + 1
      ;(moveNo <= 10 ? spent.opening : moveNo <= 30 ? spent.middlegame : spent.late).push(used)
      if (c < tc.base * 0.1) troubleMoves++
      if (out.clockCurve.length < MAX_CURVE) out.clockCurve.push(Math.round((1000 * c) / tc.base) / 1000)
      prev = c
      lastClock = c
    }
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
    out.time = {
      base: tc.base,
      avgOpening: avg(spent.opening),
      avgMiddlegame: avg(spent.middlegame),
      avgLate: avg(spent.late),
      troubleMoves,
      clockLeft: lastClock,
      clockLeftPct: lastClock != null ? lastClock / tc.base : null,
    }
  }
  return out
}
