// "Where you left the book": compare your real games with the course lines and find the exact
// moves where YOU stepped off the line you're learning (not your opponent).

const clean = (san) => san.replace(/[+#!?]/g, '')

/** First `max` SAN moves of a PGN, without chess.js (fast enough for thousands of games). */
export function sanMoves(pgn, max = 30) {
  const body = pgn
    .replace(/\{[^}]*\}/g, ' ') // comments first: Chess.com clocks look like {[%clk 0:03:00]}
    .replace(/^\s*\[[^\]]*\]\s*$/gm, ' ') // header tags
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\$\d+/g, ' ')
  const out = []
  for (let t of body.split(/\s+/)) {
    if (!t) continue
    t = t.replace(/^\d+\.(\.\.)?/, '')
    if (!t || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)) continue
    out.push(clean(t))
    if (out.length >= max) break
  }
  return out
}

/** Longest shared start of all lines in a course - a game must reach it to count as "this opening". */
function courseRoot(course) {
  const ls = course.lines.map((l) => l.moves.map(clean))
  let n = 0
  while (ls.every((m) => m[n] && m[n] === ls[0][n])) n++
  return n
}

/**
 * rows: [{ pgn, color: 'white'|'black', end: Date, outcome }]
 * Returns { leaks: [...], courses: { [id]: { games, completed, youLeft, theyLeft } }, matched }
 */
export function findLeaks(rows, courses, limit = 3000) {
  const prepared = courses.map((c) => ({ c, root: courseRoot(c), lines: c.lines.map((l) => l.moves.map(clean)) }))
  const leaks = new Map()
  const stats = {}
  let matched = 0
  for (const r of rows.slice(0, limit)) {
    if (!r.pgn || (r.rules && r.rules !== 'chess')) continue
    const side = r.color === 'white' ? 'w' : 'b'
    const moves = sanMoves(r.pgn, 30)
    if (moves.length < 2) continue
    // best course for this game: the one whose lines it follows the furthest
    let best = null
    for (const p of prepared) {
      if (p.c.side !== side) continue
      let k = 0
      for (const lm of p.lines) {
        let j = 0
        while (j < lm.length && j < moves.length && lm[j] === moves[j]) j++
        k = Math.max(k, j)
      }
      if (k >= Math.max(p.root, 2) && (!best || k > best.k)) best = { p, k } // at least 2 moves in, so one shared first move isn't "this opening"
    }
    if (!best) continue
    matched++
    const { p, k } = best
    const st = (stats[p.c.id] ||= { games: 0, completed: 0, youLeft: 0, theyLeft: 0 })
    st.games++
    const cont = p.lines.map((lm, i) => ({ lm, i })).filter(({ lm }) => lm.length > k && moves.slice(0, k).every((m, j) => lm[j] === m))
    if (!cont.length || k >= moves.length) { st.completed++; continue }
    const mover = k % 2 === 0 ? 'w' : 'b'
    if (mover !== side) { st.theyLeft++; continue }
    st.youLeft++
    const expected = [...new Set(cont.map(({ lm }) => lm[k]))]
    const key = `${p.c.id}|${k}|${expected.join('/')}`
    const e = leaks.get(key) || { course: p.c, lineIdx: cont[0].i, ply: k, expected, played: {}, count: 0, losses: 0, last: null, line: moves.slice(0, k) }
    e.count++
    e.played[moves[k]] = (e.played[moves[k]] || 0) + 1
    if (r.outcome === 'loss') e.losses++
    if (!e.last || r.end > e.last) e.last = r.end
    leaks.set(key, e)
  }
  const list = [...leaks.values()].map((e) => ({
    ...e,
    moveNo: Math.floor(e.ply / 2) + 1,
    playedTop: Object.entries(e.played).sort((a, b) => b[1] - a[1]).map(([m]) => m),
  })).sort((a, b) => b.count - a.count || b.losses - a.losses)
  return { leaks: list, courses: stats, matched }
}

/** "5" (White's 5th move) or "5..." (Black's 5th move). */
export const moveLabel = (ply) => `${Math.floor(ply / 2) + 1}${ply % 2 ? '...' : ''}`
