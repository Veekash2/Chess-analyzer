// Data for the richer Insights visuals. `rows` are oldest-first and carry `rec`.
import { score } from './aggregate.js'

const DAY = 86400000
const PIECES = ['p', 'n', 'b', 'r', 'q', 'k']
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function curve(games, pick, maxX = 60, minN = 10) {
  const sum = new Array(maxX + 1).fill(0)
  const cnt = new Array(maxX + 1).fill(0)
  for (const g of games) {
    const arr = pick(g)
    if (!arr) continue
    for (let i = 0; i < Math.min(arr.length, maxX); i++) {
      sum[i + 1] += arr[i]
      cnt[i + 1]++
    }
  }
  const pts = []
  for (let x = 1; x <= maxX; x++) if (cnt[x] >= minN) pts.push({ x, y: sum[x] / cnt[x], n: cnt[x] })
  return pts
}

export function visualsData(rows, withRec) {
  // ---- form guide: the last 100 results
  const form = rows.slice(-100).map((r) => ({ outcome: r.outcome, url: r.url, opp: r.opponent, end: r.end, tc: r.timeClass }))

  // ---- rolling score, to show form going up and down. The window grows with the
  // number of games (20 for a few hundred, up to 100 for thousands) so the line
  // shows real trends instead of noise, and it is thinned to ~400 points.
  const rolling = []
  const N = Math.max(20, Math.min(100, Math.round(rows.length / 50 / 10) * 10))
  const every = Math.max(1, Math.ceil(rows.length / 400))
  if (rows.length >= N) {
    let pts = 0
    const val = (r) => (r.outcome === 'win' ? 1 : r.outcome === 'draw' ? 0.5 : 0)
    for (let i = 0; i < rows.length; i++) {
      pts += val(rows[i])
      if (i >= N) pts -= val(rows[i - N])
      if (i >= N - 1 && ((i - N + 1) % every === 0 || i === rows.length - 1)) rolling.push({ x: i + 1, y: (100 * pts) / N, t: rows[i].end.getTime() })
    }
    rolling.window = N
  }

  // ---- activity calendar: up to the last 53 weeks of the selection
  const byDay = new Map()
  for (const r of rows) {
    const k = dayKey(r.end)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k).push(r)
  }
  let calendar = null
  if (rows.length) {
    const last = new Date(rows.at(-1).end); last.setHours(0, 0, 0, 0)
    const firstGame = new Date(rows[0].end); firstGame.setHours(0, 0, 0, 0)
    let start = new Date(Math.max(firstGame.getTime(), last.getTime() - 370 * DAY))
    start = new Date(start.getTime() - ((start.getDay() + 6) % 7) * DAY) // back to Monday
    const days = []
    for (let t = start.getTime(); t <= last.getTime(); t += DAY) {
      const d = new Date(t)
      const list = byDay.get(dayKey(d)) || []
      days.push({ t, ...score(list) })
    }
    calendar = { days, max: Math.max(1, ...days.map((d) => d.n)), activeDays: days.filter((d) => d.n).length }
  }

  // ---- weekday x hour grid
  const hourWeek = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => []))
  for (const r of rows) hourWeek[(r.end.getDay() + 6) % 7][r.end.getHours()].push(r)
  const hw = hourWeek.map((row) => row.map((list) => score(list)))

  // ---- where your pieces go, from your side of the board
  const boards = { white: {}, black: {} }
  for (const side of ['white', 'black']) for (const p of ['all', ...PIECES]) boards[side][p] = new Array(64).fill(0)
  for (const r of withRec) {
    const b = boards[r.color]
    for (const code of r.rec.dest || []) {
      const p = PIECES[Math.floor(code / 64)]
      const sq = code % 64
      b[p][sq]++
      b.all[sq]++
    }
  }

  // ---- average material balance by move number
  const wins = withRec.filter((r) => r.outcome === 'win')
  const losses = withRec.filter((r) => r.outcome === 'loss')
  const draws = withRec.filter((r) => r.outcome === 'draw')
  const material = {
    win: curve(wins, (g) => g.rec.matCurve),
    loss: curve(losses, (g) => g.rec.matCurve),
    draw: curve(draws, (g) => g.rec.matCurve),
  }

  // ---- clock left by move number, per time control
  const clock = ['bullet', 'blitz', 'rapid'].map((tc) => {
    const g = withRec.filter((r) => r.timeClass === tc && r.rec.clockCurve?.length)
    return {
      tc, n: g.length,
      win: curve(g.filter((r) => r.outcome === 'win'), (x) => x.rec.clockCurve.map((v) => v * 100)),
      loss: curve(g.filter((r) => r.outcome === 'loss'), (x) => x.rec.clockCurve.map((v) => v * 100)),
    }
  }).filter((c) => c.win.length || c.loss.length)

  // ---- actual vs Elo-expected score by rating gap (pre-game ratings)
  const expected = []
  for (let lo = -400; lo < 400; lo += 50) {
    const list = rows.filter((r) => r.rated && r.oppPre != null && r.oppPre - r.myPre >= lo && r.oppPre - r.myPre < lo + 50)
    if (list.length < 15) continue
    const mid = lo + 25
    expected.push({ x: mid, actual: score(list).pct, expected: 100 / (1 + 10 ** (mid / 400)), n: list.length })
  }

  // ---- accuracy distribution of reviewed games, split by result
  const accBins = Array.from({ length: 10 }, (_, i) => ({ label: `${i * 10}-${i * 10 + 9}`, win: 0, draw: 0, loss: 0 }))
  for (const r of rows) {
    if (r.accuracy == null) continue
    const b = accBins[Math.min(9, Math.floor(r.accuracy / 10))]
    b[r.outcome]++
  }
  accBins[9].label = '90-100'

  // ---- how games ended
  const endings = {}
  for (const r of rows) {
    const k = `${r.outcome}|${r.how}`
    endings[k] = (endings[k] || 0) + 1
  }

  return { form, rolling, rollingWindow: rolling.window || 20, calendar, hw, boards, material, clock, expected, accBins, endings }
}
