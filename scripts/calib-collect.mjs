// Collects rated standard games across the rating range for calibrating the "played like"
// estimate. Uses the public Chess.com API (one request at a time, as they ask).
// Run: node scripts/calib-collect.mjs <out.json> <seedUser>
import { writeFileSync } from 'node:fs'

const [, , OUT, SEED] = process.argv
const UA = { 'User-Agent': 'chess-review-calibration/1.0' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function get(url) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: UA })
    if (r.ok) return r.json()
    if (r.status === 404) return null
    await sleep(2000 * (i + 1))
  }
  return null
}
async function recentGames(user, months = 2) {
  const a = await get(`https://api.chess.com/pub/player/${user.toLowerCase()}/games/archives`)
  const out = []
  for (const url of (a?.archives || []).slice(-months)) { const m = await get(url); out.push(...(m?.games || [])); await sleep(250) }
  return out
}
const ok = (g) => g.rules === 'chess' && g.rated && ['blitz', 'rapid'].includes(g.time_class) && g.pgn && (g.pgn.match(/\d+\.\s/g) || []).length >= 20

const pool = new Map()
const add = (g) => { if (ok(g)) pool.set(g.url, g) }
const seed = await recentGames(SEED, 6)
seed.forEach(add)
// opponents at the low and high ends of the seed's games -> their games cover those ranges
const opps = new Map()
for (const g of seed) for (const side of ['white', 'black']) { const p = g[side]; if (p.username.toLowerCase() !== SEED.toLowerCase()) opps.set(p.username, p.rating) }
const byRating = [...opps.entries()].sort((a, b) => a[1] - b[1])
const pickUsers = [...byRating.slice(0, 6), ...byRating.slice(-6)].map(([u]) => u)
// strong public accounts for the top of the range
const strong = ['danielnaroditsky', 'gothamchess', 'alexandrabotez', 'annacramling', 'hikaru']
for (const u of [...pickUsers, ...strong]) { (await recentGames(u, 1)).forEach(add); console.log('fetched', u, pool.size) }

// stratify by the average rating of the two players
const bands = {}
for (const g of pool.values()) {
  const avg = (g.white.rating + g.black.rating) / 2
  const b = Math.floor(avg / 200) * 200
  ;(bands[b] ||= []).push(g)
}
const chosen = []
for (const [b, list] of Object.entries(bands).sort((x, y) => x[0] - y[0])) {
  const take = list.sort(() => Math.random() - 0.5).slice(0, 26)
  chosen.push(...take)
  console.log('band', b, list.length, '->', take.length)
}
writeFileSync(OUT, JSON.stringify(chosen.map((g) => ({ pgn: g.pgn, w: g.white.rating, b: g.black.rating, tc: g.time_class }))))
console.log('games', chosen.length)
