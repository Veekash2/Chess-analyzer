// Spaced repetition for opening lines (the idea behind Chessable's MoveTrainer / Anki):
// each line sits in a "box". Play it cleanly and it moves up a box and comes back later;
// make a mistake and it drops to box 1 and comes back in 10 minutes.

const KEY = 'smc-openings-srs-v1'
const DAY = 24 * 60 * 60 * 1000
// days until the next review after a clean run, by box reached
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30, 60, 120]

export const srsKey = (courseId, lineName) => `${courseId}|${lineName}`

export function getSrs() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode */ }
}

/** Record a practice / review run of a line. */
export function srsRecord(courseId, lineName, clean, now = Date.now()) {
  const s = getSrs()
  const k = srsKey(courseId, lineName)
  const prev = s[k] || { box: 0, reps: 0, lapses: 0 }
  if (clean) {
    const box = Math.min(INTERVAL_DAYS.length - 1, prev.box + 1)
    s[k] = { ...prev, box, reps: prev.reps + 1, due: now + INTERVAL_DAYS[box] * DAY, last: now }
  } else {
    s[k] = { ...prev, box: 1, reps: prev.reps + 1, lapses: prev.lapses + 1, due: now + 10 * 60 * 1000, last: now }
  }
  save(s)
  return s[k]
}

/** A line you've just learned: first review in 4 hours (unless it's already scheduled). */
export function srsLearned(courseId, lineName, now = Date.now()) {
  const s = getSrs()
  const k = srsKey(courseId, lineName)
  if (s[k]) return
  s[k] = { box: 0, reps: 0, lapses: 0, due: now + 4 * 60 * 60 * 1000, last: now }
  save(s)
}

/** Put a line up for review right now (e.g. you went wrong in it in a real game). */
export function srsDueNow(courseId, lineName, now = Date.now()) {
  const s = getSrs()
  const k = srsKey(courseId, lineName)
  s[k] = { box: 1, reps: 0, lapses: 0, ...(s[k] || {}), due: now - 1 }
  save(s)
}

/** Lines due now, oldest first, mapped to { course, lineIdx }. */
export function dueLines(courses, now = Date.now()) {
  const s = getSrs()
  const out = []
  for (const c of courses) {
    c.lines.forEach((l, i) => {
      const e = s[srsKey(c.id, l.name)]
      if (e && e.due <= now) out.push({ course: c, lineIdx: i, entry: e })
    })
  }
  return out.sort((a, b) => a.entry.due - b.entry.due)
}

export function srsStats(courses, now = Date.now()) {
  const s = getSrs()
  let tracked = 0, due = 0, learned = 0, next = Infinity
  for (const c of courses) {
    for (const l of c.lines) {
      const e = s[srsKey(c.id, l.name)]
      if (!e) continue
      tracked++
      if (e.box >= 4) learned++
      if (e.due <= now) due++
      else next = Math.min(next, e.due)
    }
  }
  return { tracked, due, learned, next: next === Infinity ? null : next }
}

/** "in 3 hours", "tomorrow", "in 5 days" */
export function whenText(t, now = Date.now()) {
  const ms = t - now
  if (ms <= 0) return 'now'
  const h = ms / 3600000
  if (h < 1) return `in ${Math.max(1, Math.round(ms / 60000))} min`
  if (h < 20) return `in ${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'}`
  const d = Math.round(h / 24)
  return d <= 1 ? 'tomorrow' : `in ${d} days`
}

export const boxLabel = (box) => ['New', 'Learning', 'Learning', 'Getting there', 'Strong', 'Strong', 'Mastered', 'Mastered'][box] || 'New'
