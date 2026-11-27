// Turns per-game rows (+ replay records) into the numbers the Insights tab shows.
import { visualsData } from './visualsData.js'

import { personality } from './personality'

export function score(list) {
  const w = list.filter((r) => r.outcome === 'win').length
  const d = list.filter((r) => r.outcome === 'draw').length
  const n = list.length
  return { n, w, d, l: n - w - d, pct: n ? Math.round((100 * (w + d / 2)) / n) : 0 }
}

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)

function bucket(rows, defs, pick) {
  return defs.map(([label, test]) => ({ label, ...score(rows.filter((r) => test(pick(r)))) }))
}

function groupBy(rows, key, min = 1) {
  const m = new Map()
  for (const r of rows) {
    const k = key(r)
    if (k == null) continue
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(r)
  }
  return [...m.entries()]
    .map(([label, rs]) => ({ label, ...score(rs), acc: avg(rs.map((r) => r.accuracy).filter((a) => a != null)) }))
    .filter((g) => g.n >= min)
    .sort((a, b) => b.n - a.n)
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PIECES = [['p', 'Pawn'], ['n', 'Knight'], ['b', 'Bishop'], ['r', 'Rook'], ['q', 'Queen'], ['k', 'King']]

/**
 * Chess.com stores each player's rating AFTER the game. Rebuild pre-game ratings:
 * mine = my rating after my previous game in that pool; the opponent's moves by
 * roughly the opposite of my change (Elo is close to zero-sum).
 * Run this on the FULL history before cutting it down to "last N games",
 * so the first game of the window still knows the game before it.
 */
export function addPreGameRatings(rows) {
  const asc = [...rows].sort((a, b) => a.end - b.end)
  const lastRating = {}
  const out = new Map()
  for (const r of asc) {
    const key = `${r.rules}|${r.timeClass}|${r.rated}`
    const pre = lastRating[key] ?? r.myRating
    const change = r.myRating - pre
    out.set(r.url, { ...r, myPre: pre, oppPre: r.oppRating + change })
    lastRating[key] = r.myRating
  }
  return rows.map((r) => out.get(r.url))
}

export function aggregate(allRows, records) {
  const needsPre = allRows.some((r) => r.myPre === undefined)
  const rows = (needsPre ? addPreGameRatings(allRows) : allRows)
    .map((r) => ({ ...r, rec: records?.[r.url] || null }))
    .sort((a, b) => a.end - b.end)
  // move-level stats only for standard chess that replayed cleanly
  const withRec = rows.filter((r) => r.rec && r.rec.plies > 0 && r.rules === 'chess')
  const total = score(rows)

  // ---- streaks & sessions
  let best = { win: 0, loss: 0 }
  let run = { type: null, len: 0 }
  for (const r of rows) {
    if (r.outcome === run.type) run.len++
    else run = { type: r.outcome, len: 1 }
    if (run.type === 'win') best.win = Math.max(best.win, run.len)
    if (run.type === 'loss') best.loss = Math.max(best.loss, run.len)
  }
  const afterWin = [], afterLoss = []
  let sessionIdx = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], prev = rows[i - 1]
    const gapMin = prev ? (r.end - prev.end) / 60000 : Infinity
    sessionIdx = gapMin > 30 ? 1 : sessionIdx + 1
    r.sessionGame = sessionIdx
    if (prev && gapMin <= 30) {
      if (prev.outcome === 'win') afterWin.push(r)
      if (prev.outcome === 'loss') afterLoss.push(r)
    }
  }

  // ---- rating history, one point per day per time class
  const ratingSeries = {}
  for (const r of rows) {
    if (!r.rated || !r.myRating || r.rules !== 'chess') continue
    const day = r.end.toISOString().slice(0, 10)
    const s = (ratingSeries[r.timeClass] ||= new Map())
    s.set(day, r.myRating)
  }
  const rating = Object.entries(ratingSeries).map(([tc, m]) => {
    const pts = [...m.entries()].map(([d, v]) => ({ t: new Date(d).getTime(), v }))
    return { tc, pts, now: pts.at(-1)?.v, peak: Math.max(...pts.map((p) => p.v)) }
  }).sort((a, b) => b.pts.length - a.pts.length)

  // ---- results breakdowns
  const byDiff = bucket(rows, [
    ['Opponent 200+ lower', (d) => d <= -200], ['100-199 lower', (d) => d > -200 && d <= -100],
    ['25-99 lower', (d) => d > -100 && d <= -25], ['Within 25', (d) => d > -25 && d < 25],
    ['25-99 higher', (d) => d >= 25 && d < 100], ['100-199 higher', (d) => d >= 100 && d < 200],
    ['Opponent 200+ higher', (d) => d >= 200],
  ], (r) => r.oppPre - r.myPre)
  const byLength = bucket(withRec, [
    ['1-20 moves', (m) => m <= 20], ['21-30', (m) => m > 20 && m <= 30], ['31-40', (m) => m > 30 && m <= 40],
    ['41-60', (m) => m > 40 && m <= 60], ['61+ moves', (m) => m > 60],
  ], (r) => Math.ceil(r.rec.plies / 2))
  const byPhase = ['opening', 'middlegame', 'endgame'].map((p) => ({ label: p, ...score(withRec.filter((r) => r.rec.endPhase === p)) }))
  const byHour = Array.from({ length: 24 }, (_, h) => ({ label: String(h), ...score(rows.filter((r) => r.end.getHours() === h)) }))
  const byWeekday = WEEKDAYS.map((label, i) => ({ label, ...score(rows.filter((r) => (r.end.getDay() + 6) % 7 === i)) }))
  const bySession = bucket(rows, [['1st game', (n) => n === 1], ['2nd-3rd', (n) => n >= 2 && n <= 3], ['4th-6th', (n) => n >= 4 && n <= 6], ['7th-10th', (n) => n >= 7 && n <= 10], ['11th+', (n) => n > 10]], (r) => r.sessionGame)

  // ---- openings
  const white = withRec.filter((r) => r.color === 'white')
  const black = withRec.filter((r) => r.color === 'black')
  const openings = {
    whiteFirst: groupBy(white, (r) => (r.rec.firstMoves[0] ? `1.${r.rec.firstMoves[0]}` : null)).slice(0, 6),
    vsE4: groupBy(black.filter((r) => r.rec.firstMoves[0] === 'e4'), (r) => (r.rec.firstMoves[1] ? `1...${r.rec.firstMoves[1]}` : null)).slice(0, 6),
    vsD4: groupBy(black.filter((r) => r.rec.firstMoves[0] === 'd4'), (r) => (r.rec.firstMoves[1] ? `1...${r.rec.firstMoves[1]}` : null)).slice(0, 6),
    whiteNamed: groupBy(rows.filter((r) => r.color === 'white'), (r) => r.opening, 3).slice(0, 10),
    blackNamed: groupBy(rows.filter((r) => r.color === 'black'), (r) => r.opening, 3).slice(0, 10),
  }
  const minN = 10
  const ranked = [...openings.whiteNamed, ...openings.blackNamed].filter((o) => o.n >= minN)
  openings.best = [...ranked].sort((a, b) => b.pct - a.pct)[0] || null
  openings.worst = [...ranked].sort((a, b) => a.pct - b.pct)[0] || null

  // ---- moves & pieces
  const pieceMoves = {}, captures = {}
  for (const [k] of PIECES) { pieceMoves[k] = 0; captures[k] = 0 }
  for (const r of withRec) for (const [k] of PIECES) { pieceMoves[k] += r.rec.pieceMoves[k]; captures[k] += r.rec.captures[k] }
  const totalMoves = Object.values(pieceMoves).reduce((a, b) => a + b, 0) || 1
  const totalCaps = Object.values(captures).reduce((a, b) => a + b, 0) || 1
  const pieces = PIECES.map(([k, label]) => ({ label, moves: pieceMoves[k], movePct: (100 * pieceMoves[k]) / totalMoves, caps: captures[k], capPct: (100 * captures[k]) / totalCaps }))
  const castling = [['Short (O-O)', 'short'], ['Long (O-O-O)', 'long'], ['Never castled', null]].map(([label, c]) => ({ label, ...score(withRec.filter((r) => r.rec.castle === c)) }))
  const moves = {
    avgCastleMove: avg(withRec.filter((r) => r.rec.castleMove).map((r) => r.rec.castleMove)),
    checksPerGame: avg(withRec.map((r) => r.rec.checks)),
    capturesPerGame: avg(withRec.map((r) => Object.values(r.rec.captures).reduce((a, b) => a + b, 0))),
    avgLength: avg(withRec.map((r) => Math.ceil(r.rec.plies / 2))),
    promos: withRec.reduce((a, r) => a + r.rec.promos, 0),
    underpromos: withRec.reduce((a, r) => a + r.rec.underpromos, 0),
    earlyQueen: score(withRec.filter((r) => r.rec.earlyQueen)),
    noEarlyQueen: score(withRec.filter((r) => !r.rec.earlyQueen)),
  }

  // ---- advantage handling
  const ahead = withRec.filter((r) => r.rec.maxLead >= 3)
  const behind = withRec.filter((r) => r.rec.maxDeficit >= 3)
  const advantage = {
    ahead: score(ahead), behind: score(behind),
    conversion: ahead.length ? Math.round((100 * ahead.filter((r) => r.outcome === 'win').length) / ahead.length) : null,
    comebackRate: behind.length ? Math.round((100 * behind.filter((r) => r.outcome !== 'loss').length) / behind.length) : null,
  }

  // ---- time management (clocked games only)
  const timed = withRec.filter((r) => r.rec.time)
  const time = ['bullet', 'blitz', 'rapid'].map((tc) => {
    const g = timed.filter((r) => r.timeClass === tc)
    if (!g.length) return null
    const lostOnTime = rows.filter((r) => r.timeClass === tc && r.outcome === 'loss' && r.how === 'timeout').length
    const wonOnTime = rows.filter((r) => r.timeClass === tc && r.outcome === 'win' && r.how === 'timeout').length
    const trouble = g.filter((r) => r.rec.time.troubleMoves >= 3)
    return {
      tc, n: g.length,
      opening: avg(g.map((r) => r.rec.time.avgOpening).filter((x) => x != null)),
      middlegame: avg(g.map((r) => r.rec.time.avgMiddlegame).filter((x) => x != null)),
      late: avg(g.map((r) => r.rec.time.avgLate).filter((x) => x != null)),
      leftWin: avg(g.filter((r) => r.outcome === 'win').map((r) => r.rec.time.clockLeftPct).filter((x) => x != null)),
      leftLoss: avg(g.filter((r) => r.outcome === 'loss').map((r) => r.rec.time.clockLeftPct).filter((x) => x != null)),
      lostOnTime, wonOnTime,
      lostOnTimePct: Math.round((100 * lostOnTime) / g.length),
      trouble: score(trouble), calm: score(g.filter((r) => r.rec.time.troubleMoves < 3)),
    }
  }).filter(Boolean)

  // ---- best games
  const wins = rows.filter((r) => r.outcome === 'win')
  const bestGames = {
    accuracy: wins.filter((r) => r.accuracy != null).sort((a, b) => b.accuracy - a.accuracy).slice(0, 5),
    upsets: wins.filter((r) => r.rated && r.rules === 'chess').sort((a, b) => (b.oppPre - b.myPre) - (a.oppPre - a.myPre)).slice(0, 5),
    fastestMates: wins.filter((r) => r.how === 'checkmated' && r.rec && r.rec.plies > 0 && r.rules === 'chess').sort((a, b) => a.rec.plies - b.rec.plies).slice(0, 5),
    comebacks: wins.filter((r) => r.rec && r.rules === 'chess' && r.rec.maxDeficit >= 3 && r.how !== 'timeout' && r.how !== 'abandoned').sort((a, b) => b.rec.maxDeficit - a.rec.maxDeficit).slice(0, 5),
  }

  const accs = rows.map((r) => r.accuracy).filter((a) => a != null)
  return {
    total, n: rows.length, analysed: withRec.length,
    avgOpp: avg(rows.map((r) => r.oppPre).filter(Boolean)),
    accuracy: avg(accs), accuracyN: accs.length,
    accuracyWin: avg(rows.filter((r) => r.outcome === 'win' && r.accuracy != null).map((r) => r.accuracy)),
    accuracyLoss: avg(rows.filter((r) => r.outcome === 'loss' && r.accuracy != null).map((r) => r.accuracy)),
    streaks: best, afterWin: score(afterWin), afterLoss: score(afterLoss),
    rating, byDiff, byLength, byPhase, byHour, byWeekday, bySession,
    openings, pieces, castling, moves, advantage, time, bestGames,
    first: rows[0]?.end, last: rows.at(-1)?.end,
    vis: visualsData(rows, withRec),
    personality: personality(rows),
  }
}
