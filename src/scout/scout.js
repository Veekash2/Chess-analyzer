// Scouting a friend or opponent from their public Chess.com games: what they play, where
// they're weak, and the positions where they keep going wrong.
import { Chess } from 'chess.js'
import { sanMoves } from '../openings/bookLeaks'

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
const pts = (r) => (r.outcome === 'win' ? 1 : r.outcome === 'draw' ? 0.5 : 0)
const score = (list) => (list.length ? Math.round((100 * list.reduce((a, r) => a + pts(r), 0)) / list.length) : null)
export const family = (name) => (name || 'Unknown').split(/ (Defense|Defence|Opening|Game|Attack|Gambit|System|Variation)\b/)[0].trim()

/** Which of our courses prepares you against an opening they play (side = the side THEY play). */
const COURSE_FOR = {
  b: [[/Scandinavian/i, 'scandiw'], [/Caro/i, 'carow'], [/Sicilian/i, 'grandprix'], [/French/i, 'frenchw'], [/Philidor|Pirc|Modern|Owen/i, 'philidorw'],
    [/Petrov/i, 'vienna'], [/Alekhine/i, 'scandiw'], [/Kings Pawn|Two Knights|Italian|Giuoco/i, 'italian'], [/Queens Gambit|Slav/i, 'qgd'], [/Kings Indian|Grunfeld|Nimzo|Indian/i, 'london'], [/Dutch/i, 'london']],
  w: [[/London|Colle|Queens Pawn|Kings Fianchetto|Van t Kruijs|Larsen|Nimzowitsch Larsen|Bird|Reti|Zukertort|Torre|Jobava/i, 'flankb'], [/Vienna|Bishops Opening/i, 'bishopsb'],
    [/Four Knights|Three Knights/i, 'fourknightsb'], [/Center Game|Danish|Kings Gambit/i, 'centerb'], [/Italian|Giuoco|Two Knights|Ruy Lopez|Scotch|Ponziani|Kings Pawn/i, 'petrov'],
    [/Queens Gambit|Catalan/i, 'qgdblack'], [/English/i, 'kid']],
}
export function courseFor(name, side) {
  return COURSE_FOR[side].find(([re]) => re.test(name))?.[1] || null
}

/** rows: the friend's games from THEIR side (toRow(game, friend)). */
export function scout(rows, me) {
  const games = rows.filter((r) => r.rules === 'chess' && r.pgn).sort((a, b) => a.end - b.end)
  const asW = games.filter((r) => r.color === 'white')
  const asB = games.filter((r) => r.color === 'black')
  const moves = new Map(games.map((r) => [r, sanMoves(r.pgn, 24)]))

  // ---- openings by family, per colour
  const fams = (list, side) => {
    const m = {}
    for (const r of list) { const f = family(r.opening); (m[f] ||= []).push(r) }
    return Object.entries(m).map(([name, l]) => ({ name, n: l.length, score: score(l), course: courseFor(name, side) })).filter((x) => x.n >= 3 && x.name !== 'Unknown').sort((a, b) => b.n - a.n)
  }
  const openings = { w: fams(asW, 'w'), b: fams(asB, 'b') }

  // ---- first moves as White, replies as Black
  const dist = (list, ply, filter) => {
    const m = {}
    for (const r of list) { const mv = moves.get(r); if (!mv[ply] || (filter && !filter(mv))) continue; (m[mv[ply]] ||= []).push(r) }
    const total = Object.values(m).reduce((a, l) => a + l.length, 0)
    return Object.entries(m).map(([move, l]) => ({ move, n: l.length, share: Math.round((100 * l.length) / Math.max(1, total)), score: score(l) })).sort((a, b) => b.n - a.n).slice(0, 4)
  }
  const firstMoves = dist(asW, 0)
  const vsE4 = dist(asB, 1, (mv) => mv[0] === 'e4')
  const vsD4 = dist(asB, 1, (mv) => mv[0] === 'd4')

  // ---- problem positions: a move THEY chose often, after which they score badly
  const nodes = new Map()
  for (const r of games) {
    const mv = moves.get(r)
    const side = r.color === 'white' ? 0 : 1
    for (let k = side; k < Math.min(mv.length, 16); k += 2) {
      const key = mv.slice(0, k + 1).join(' ')
      const e = nodes.get(key) || { line: mv.slice(0, k + 1), color: r.color, list: [] }
      e.list.push(r)
      nodes.set(key, e)
    }
  }
  const overall = score(games) ?? 50
  const cands = [...nodes.values()]
    .map((e) => ({ ...e, n: e.list.length, score: score(e.list) }))
    .filter((e) => e.n >= 5 && e.score <= Math.min(42, overall - 8))
    .map((e) => ({ ...e, weight: e.n * (overall - e.score) }))
    .sort((a, b) => b.weight - a.weight)
  const problems = []
  for (const c of cands) {
    if (problems.some((p) => c.line.join(' ').startsWith(p.line.join(' ')) || p.line.join(' ').startsWith(c.line.join(' ')))) continue
    try { const g = new Chess(); for (const s of c.line) g.move(s); c.fen = g.fen() } catch { continue }
    problems.push({ line: c.line, color: c.color, n: c.n, score: c.score, fen: c.fen, opening: family(c.list[0].opening) })
    if (problems.length >= 5) break
  }

  // ---- habits and weaknesses
  const losses = games.filter((r) => r.outcome === 'loss')
  const len = (r) => Math.ceil(moves.get(r).length / 2)
  // full game length in moves: the last move number in the move text (headers and comments removed)
  const lenCache = new Map()
  const allLen = (r) => {
    if (!lenCache.has(r)) {
      const body = r.pgn.replace(/^\s*\[[^\]]*\]\s*$/gm, '').replace(/\{[^}]*\}/g, '')
      let n = 0
      for (const m of body.matchAll(/(\d+)\.+/g)) n = Math.max(n, +m[1])
      lenCache.set(r, n || len(r))
    }
    return lenCache.get(r)
  }
  const timeoutLossShare = losses.length ? losses.filter((r) => r.how === 'timeout').length / losses.length : 0
  const quickLossShare = losses.length ? losses.filter((r) => allLen(r) <= 25).length / losses.length : 0
  const long = games.filter((r) => allLen(r) >= 45)
  const afterW = [], afterL = []
  for (let i = 1; i < games.length; i++) {
    if (games[i].end - games[i - 1].end > 3600e3) continue
    if (games[i - 1].outcome === 'win') afterW.push(games[i]); else if (games[i - 1].outcome === 'loss') afterL.push(games[i])
  }
  const stronger = games.filter((r) => r.oppRating && r.myRating && r.oppRating - r.myRating >= 75)
  const byTc = ['bullet', 'blitz', 'rapid', 'daily'].map((tc) => ({ tc, list: games.filter((r) => r.timeClass === tc) })).filter((x) => x.list.length >= 15).map((x) => ({ tc: x.tc, n: x.list.length, score: score(x.list) }))
  const vsMe = me ? games.filter((r) => r.opponent?.toLowerCase() === me.toLowerCase()) : []

  const weaknesses = []
  const add = (title, text, tip, sev) => weaknesses.push({ title, text, tip, sev })
  const wS = score(asW), bS = score(asB)
  if (asW.length >= 15 && asB.length >= 15 && Math.abs(wS - bS) >= 6) {
    const weakSide = wS < bS ? 'White' : 'Black'
    add(`Weaker with ${weakSide}`, `${score(weakSide === 'White' ? asW : asB)}% as ${weakSide} vs ${score(weakSide === 'White' ? asB : asW)}% as ${weakSide === 'White' ? 'Black' : 'White'}.`, `Their ${weakSide} openings are the place to prepare.`, Math.abs(wS - bS))
  }
  for (const o of [...openings.w.map((x) => ({ ...x, side: 'White' })), ...openings.b.map((x) => ({ ...x, side: 'Black' }))]) {
    if (o.n >= 8 && o.score <= Math.min(45, overall - 6)) add(`Struggles in the ${o.name} (as ${o.side})`, `${o.score}% in ${o.n} games.`, o.side === 'Black' ? `Steer for it as White.` : `Allow it as Black - they don't handle it well.`, (overall - o.score) * Math.sqrt(o.n) / 3)
  }
  if (timeoutLossShare >= 0.25 && losses.length >= 10) add('Loses on time', `${Math.round(100 * timeoutLossShare)}% of their losses are on the clock.`, 'Keep the position complicated and play quickly - make them use their clock.', 100 * timeoutLossShare / 2)
  if (quickLossShare >= 0.3 && losses.length >= 10) add('Collapses early', `${Math.round(100 * quickLossShare)}% of their losses are over in 25 moves or fewer.`, 'Play sharp, attacking openings and go for early tactics.', 100 * quickLossShare / 2)
  if (long.length >= 15 && score(long) <= Math.min(45, overall - 6)) add('Weak in long games / endgames', `${score(long)}% in games of 45+ moves (overall ${overall}%).`, 'Trade pieces when you\'re level and grind it out in the endgame.', overall - score(long))
  if (afterW.length >= 15 && afterL.length >= 15 && score(afterW) - score(afterL) >= 8) add('Tilts after a loss', `${score(afterL)}% straight after a loss, ${score(afterW)}% after a win.`, 'After you beat them, offer a rematch right away.', score(afterW) - score(afterL))
  if (stronger.length >= 15 && score(stronger) <= 35) add('Struggles against stronger players', `${score(stronger)}% vs opponents rated 75+ above them.`, 'Play solidly and confidently - they tend to crack under pressure.', 40 - score(stronger))
  const worstTc = byTc.length >= 2 ? [...byTc].sort((a, b) => a.score - b.score)[0] : null
  if (worstTc && byTc.some((x) => x.score - worstTc.score >= 8)) add(`Weakest at ${worstTc.tc}`, `${worstTc.score}% at ${worstTc.tc} (${worstTc.n} games).`, `Challenge them to ${worstTc.tc}.`, 10)
  weaknesses.sort((a, b) => b.sev - a.sev)

  const ratingNow = (tc) => [...games].reverse().find((r) => r.timeClass === tc)?.myRating
  return {
    n: games.length, overall, white: { n: asW.length, score: wS }, black: { n: asB.length, score: bS },
    ratings: Object.fromEntries(['bullet', 'blitz', 'rapid', 'daily'].map((tc) => [tc, ratingNow(tc)]).filter(([, v]) => v)),
    openings, firstMoves, vsE4, vsD4, problems, weaknesses: weaknesses.slice(0, 6),
    vsMe: vsMe.length ? { n: vsMe.length, theirScore: score(vsMe) } : null,
    avgLength: Math.round(avg(games.map(allLen)) || 0),
  }
}
