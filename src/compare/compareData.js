// Turns several players' stats + recent games into a side-by-side comparison.
import { toRow } from '../chessApi.js'
import { addPreGameRatings, score } from '../insights/aggregate.js'
import { parseMovetext } from '../insights/analyzeGame.js'

export const POOLS = [
  ['chess_bullet', 'Bullet'], ['chess_blitz', 'Blitz'], ['chess_rapid', 'Rapid'], ['chess_daily', 'Daily'],
]

/** Ratings + lifetime records straight from the /stats endpoint (no game download needed). */
export function quickCompare(players) {
  const ratingRows = POOLS.map(([k, label]) => {
    const cells = players.map((p) => {
      const s = p.stats?.[k]
      if (!s) return null
      const rec = s.record || {}
      const n = (rec.win || 0) + (rec.loss || 0) + (rec.draw || 0)
      return {
        now: s.last?.rating ?? null, best: s.best?.rating ?? null, bestDate: s.best?.date, bestGame: s.best?.game,
        n, w: rec.win || 0, l: rec.loss || 0, d: rec.draw || 0,
        pct: n ? Math.round((100 * ((rec.win || 0) + (rec.draw || 0) / 2)) / n) : null,
      }
    })
    const top = Math.max(...cells.map((c) => c?.now ?? -1))
    return { key: k, label, cells, leader: top > 0 ? cells.findIndex((c) => c?.now === top) : -1 }
  })
  const extra = [
    { key: 'tactics', label: 'Puzzles (highest)', cells: players.map((p) => p.stats?.tactics?.highest?.rating ?? null) },
    { key: 'rush', label: 'Puzzle Rush (best)', cells: players.map((p) => p.stats?.puzzle_rush?.best?.score ?? null) },
  ].map((r) => {
    const top = Math.max(...r.cells.map((c) => c ?? -1))
    return { ...r, leader: top > 0 ? r.cells.findIndex((c) => c === top) : -1 }
  })
  const totals = players.map((p) => {
    let w = 0, l = 0, d = 0
    for (const [k] of POOLS) { const r = p.stats?.[k]?.record; if (r) { w += r.win || 0; l += r.loss || 0; d += r.draw || 0 } }
    const n = w + l + d
    return { n, w, l, d, pct: n ? Math.round((100 * (w + d / 2)) / n) : null }
  })
  return { ratingRows, extra, totals }
}

function topBy(rows, key) {
  const m = new Map()
  for (const r of rows) { const k = key(r); if (!k || k === 'Unknown') continue; m.set(k, [...(m.get(k) || []), r]) }
  const best = [...m.entries()].sort((a, b) => b[1].length - a[1].length)[0]
  return best ? { name: best[0], ...score(best[1]) } : null
}

/** Per-player stats from their recent games, plus head-to-head between the players. */
export function deepCompare(players, gamesByPlayer, tc) {
  const rowsBy = players.map((p, i) => {
    const raw = gamesByPlayer[i] || []
    const rows = addPreGameRatings(raw.map((g) => toRow(g, p.username))).sort((a, b) => a.end - b.end)
    return tc === 'all' ? rows : rows.filter((r) => r.timeClass === tc)
  })

  const per = rowsBy.map((rows) => {
    const s = score(rows)
    const accs = rows.map((r) => r.accuracy).filter((a) => a != null)
    let best = 0, run = 0
    for (const r of rows) { run = r.outcome === 'win' ? run + 1 : 0; best = Math.max(best, run) }
    let current = 0
    for (let i = rows.length - 1; i >= 0 && rows[i].outcome === 'win'; i--) current++
    const rated = rows.filter((r) => r.rated && r.oppPre)
    const avgOpp = rated.length ? Math.round(rated.reduce((a, r) => a + r.oppPre, 0) / rated.length) : null
    const upsets = rows.filter((r) => r.outcome === 'win' && r.rated).sort((a, b) => (b.oppPre - b.myPre) - (a.oppPre - a.myPre))
    const mates = rows.filter((r) => r.outcome === 'win' && r.how === 'checkmated').length
    const timeLosses = rows.filter((r) => r.outcome === 'loss' && r.how === 'timeout').length
    return {
      ...s,
      accuracy: accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : null, accN: accs.length,
      avgOpp, longestStreak: best, currentStreak: current,
      white: score(rows.filter((r) => r.color === 'white')), black: score(rows.filter((r) => r.color === 'black')),
      openingWhite: topBy(rows.filter((r) => r.color === 'white'), (r) => r.opening),
      openingBlack: topBy(rows.filter((r) => r.color === 'black'), (r) => r.opening),
      bestWin: upsets[0] || null,
      matePct: s.w ? Math.round((100 * mates) / s.w) : null,
      timeoutLossPct: s.l ? Math.round((100 * timeLosses) / s.l) : null,
      form: rows.slice(-20).map((r) => ({ outcome: r.outcome, url: r.url, opp: r.opponent, end: r.end })),
      first: rows[0]?.end, last: rows.at(-1)?.end,
    }
  })

  // rating over time (one point per day) for the chosen pool
  const pool = tc === 'all' ? mostPlayedPool(rowsBy) : tc
  const ratingSeries = rowsBy.map((rows) => {
    const byDay = new Map()
    for (const r of rows) if (r.rated && r.rules === 'chess' && r.timeClass === pool) byDay.set(r.end.toISOString().slice(0, 10), r.myRating)
    return [...byDay.entries()].map(([d, v]) => ({ x: new Date(d).getTime(), y: v }))
  })

  // head-to-head from each pair's games (taken from the first player's downloaded games)
  const h2h = []
  for (let a = 0; a < players.length; a++) {
    for (let b = a + 1; b < players.length; b++) {
      const name = players[b].username.toLowerCase()
      let games = rowsBy[a].filter((r) => r.opponent.toLowerCase() === name)
      // fall back to B's games if A had none in the window
      if (!games.length) {
        const nameA = players[a].username.toLowerCase()
        games = rowsBy[b].filter((r) => r.opponent.toLowerCase() === nameA)
          .map((r) => ({ ...r, outcome: r.outcome === 'win' ? 'loss' : r.outcome === 'loss' ? 'win' : 'draw' }))
      }
      h2h.push({ a, b, ...score(games), last: games.at(-1) || null })
    }
  }
  return { per, ratingSeries, pool, h2h, rowsBy }
}

function mostPlayedPool(rowsBy) {
  const c = {}
  for (const rows of rowsBy) for (const r of rows) if (r.rated) c[r.timeClass] = (c[r.timeClass] || 0) + 1
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || 'blitz'
}


/* ------------------------------------------------------------------ matchup preview */
const firstMoves = (r) => {
  if (!r._fm) r._fm = r.pgn ? parseMovetext(r.pgn).sans.slice(0, 2) : []
  return r._fm
}
function topShare(list, key) {
  const m = new Map()
  for (const x of list) { const k = key(x); if (!k) continue; m.set(k, (m.get(k) || 0) + 1) }
  const [k, n] = [...m.entries()].sort((a, b) => b[1] - a[1])[0] || []
  return k ? { key: k, n, pct: Math.round((100 * n) / list.length), of: list.length } : null
}
const endShare = (rows, outcome, hows) => {
  const g = rows.filter((r) => r.outcome === outcome)
  return g.length ? g.filter((r) => hows.includes(r.how)).length / g.length : 0
}

/** One colour's likely opening: the White player's habits meet the Black player's replies. */
function openingFor(whiteRows, blackRows) {
  const asW = whiteRows.filter((r) => r.color === 'white')
  const asB = blackRows.filter((r) => r.color === 'black')
  const m1 = topShare(asW, (r) => firstMoves(r)[0])
  if (!m1) return null
  const vs = asB.filter((r) => firstMoves(r)[0] === m1.key)
  const reply = topShare(vs, (r) => firstMoves(r)[1])
  // most likely named opening: the line both players reach most often after those two moves
  let named = null
  if (reply) {
    const wLines = asW.filter((r) => firstMoves(r)[0] === m1.key && firstMoves(r)[1] === reply.key)
    const bLines = vs.filter((r) => firstMoves(r)[1] === reply.key)
    const count = new Map()
    for (const r of wLines) count.set(r.opening, (count.get(r.opening) || 0) + 1)
    for (const r of bLines) count.set(r.opening, (count.get(r.opening) || 0) + 1)
    const best = [...count.entries()].filter(([k]) => k && k !== 'Unknown').sort((a, b) => b[1] - a[1])[0]
    if (best) {
      const wScore = score(wLines.filter((r) => r.opening === best[0]))
      const bScore = score(bLines.filter((r) => r.opening === best[0]))
      named = { name: best[0], white: wScore, black: bScore }
    }
  }
  return { first: m1, reply, sampleReply: vs.length, named }
}

/**
 * "If these two played": expected score from current ratings (Elo), likely openings
 * from each player's habits, and how the game would probably go.
 */
export function matchup(players, data, a, b) {
  const { rowsBy, per, pool, h2h } = data
  const A = rowsBy[a], B = rowsBy[b]
  const ra = players[a].stats?.[`chess_${pool}`]?.last?.rating
  const rb = players[b].stats?.[`chess_${pool}`]?.last?.rating
  let expect = null
  if (ra && rb) {
    const e = 1 / (1 + 10 ** ((rb - ra) / 400))
    // draw chance: the two players' average draw rate in this pool
    const dr = (score(A).d / Math.max(1, A.length) + score(B).d / Math.max(1, B.length)) / 2
    const draw = Math.min(0.3, dr)
    const win = Math.max(0, Math.min(1 - draw, e - draw / 2))
    expect = { ra, rb, e, win, draw, loss: Math.max(0, 1 - win - draw), diff: ra - rb }
  }
  const pa = per[a], pb = per[b]
  const avgLen = (rows) => {
    const n = rows.filter((r) => r.pgn).slice(-150)
    if (!n.length) return null
    return n.reduce((s, r) => s + Math.ceil(parseMovetext(r.pgn).sans.length / 2), 0) / n.length
  }
  const lenA = avgLen(A), lenB = avgLen(B)

  // how games involving these two usually finish
  const endings = [
    ['checkmate', (endShare(A, 'win', ['checkmated']) + endShare(B, 'win', ['checkmated']) + endShare(A, 'loss', ['checkmated']) + endShare(B, 'loss', ['checkmated'])) / 4],
    ['resignation', (endShare(A, 'win', ['resigned']) + endShare(B, 'win', ['resigned']) + endShare(A, 'loss', ['resigned']) + endShare(B, 'loss', ['resigned'])) / 4],
    ['time', (endShare(A, 'win', ['timeout']) + endShare(B, 'win', ['timeout']) + endShare(A, 'loss', ['timeout']) + endShare(B, 'loss', ['timeout'])) / 4],
  ].sort((x, y) => y[1] - x[1])

  // edges: concrete, data-backed differences between the two
  const edges = []
  const nameA = players[a].username, nameB = players[b].username
  const add = (who, text, size) => edges.push({ who, text, size })
  if (expect && Math.abs(expect.diff) >= 25) add(expect.diff > 0 ? a : b, `${expect.diff > 0 ? nameA : nameB} is ${Math.abs(expect.diff)} points higher rated in ${pool}`, Math.abs(expect.diff) / 10)
  if (pa.white.n >= 10 && pb.black.n >= 10 && Math.abs(pa.white.pct - pb.black.pct) >= 5) add(pa.white.pct > pb.black.pct ? a : b, `When ${nameA} has White: ${nameA} scores ${pa.white.pct}% with White, ${nameB} ${pb.black.pct}% with Black`, Math.abs(pa.white.pct - pb.black.pct))
  if (pb.white.n >= 10 && pa.black.n >= 10 && Math.abs(pb.white.pct - pa.black.pct) >= 5) add(pb.white.pct > pa.black.pct ? b : a, `When ${nameB} has White: ${nameB} scores ${pb.white.pct}% with White, ${nameA} ${pa.black.pct}% with Black`, Math.abs(pb.white.pct - pa.black.pct))
  if (pa.timeoutLossPct != null && pb.timeoutLossPct != null && pa.l >= 10 && pb.l >= 10 && Math.abs(pa.timeoutLossPct - pb.timeoutLossPct) >= 4) add(pa.timeoutLossPct < pb.timeoutLossPct ? a : b, `Clock: ${nameA} loses ${pa.timeoutLossPct}% of losses on time, ${nameB} ${pb.timeoutLossPct}% - a long, tense game favours ${pa.timeoutLossPct < pb.timeoutLossPct ? nameA : nameB}`, Math.abs(pa.timeoutLossPct - pb.timeoutLossPct))
  if (pa.matePct != null && pb.matePct != null && pa.w >= 10 && pb.w >= 10 && Math.abs(pa.matePct - pb.matePct) >= 8) add(pa.matePct > pb.matePct ? a : b, `Attacking: ${pa.matePct > pb.matePct ? nameA : nameB} finishes ${Math.max(pa.matePct, pb.matePct)}% of wins with checkmate (vs ${Math.min(pa.matePct, pb.matePct)}%)`, Math.abs(pa.matePct - pb.matePct) / 2)
  if (pa.accuracy != null && pb.accuracy != null && pa.accN >= 5 && pb.accN >= 5 && Math.abs(pa.accuracy - pb.accuracy) >= 3) add(pa.accuracy > pb.accuracy ? a : b, `Accuracy: ${nameA} ${pa.accuracy.toFixed(1)} vs ${nameB} ${pb.accuracy.toFixed(1)} in reviewed games`, Math.abs(pa.accuracy - pb.accuracy) * 2)
  if (pa.n >= 20 && pb.n >= 20 && Math.abs(pa.pct - pb.pct) >= 5) add(pa.pct > pb.pct ? a : b, `Form: ${nameA} scored ${pa.pct}% recently, ${nameB} ${pb.pct}%`, Math.abs(pa.pct - pb.pct))
  edges.sort((x, y) => y.size - x.size)

  const pair = h2h.find((h) => (h.a === a && h.b === b) || (h.a === b && h.b === a))
  const h2hFromA = pair && pair.n ? (pair.a === a ? pair : { ...pair, w: pair.l, l: pair.w }) : null

  return {
    pool, expect, h2h: h2hFromA,
    aWhite: openingFor(A, B), bWhite: openingFor(B, A),
    length: lenA && lenB ? Math.round((lenA + lenB) / 2) : null,
    likelyEnd: endings[0][1] > 0 ? endings[0] : null, endings,
    edges: edges.slice(0, 5),
  }
}
