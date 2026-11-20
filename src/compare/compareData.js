// Turns several players' stats + recent games into a side-by-side comparison.
import { toRow } from '../chessApi.js'
import { addPreGameRatings, score } from '../insights/aggregate.js'

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
  return { per, ratingSeries, pool, h2h }
}

function mostPlayedPool(rowsBy) {
  const c = {}
  for (const rows of rowsBy) for (const r of rows) if (r.rated) c[r.timeClass] = (c[r.timeClass] || 0) + 1
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || 'blitz'
}
