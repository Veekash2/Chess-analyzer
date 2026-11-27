// Per-player game report: what went wrong, what went right, what to study, and a
// rough "played like" rating. Built only from the engine review of this one game.
import { hangs, winPct } from './reviewCore.js'

const LI = 'https://lichess.org/training/' // free Lichess puzzle themes
const moveLabel = (m) => `${Math.ceil(m.ply / 2)}${m.color === 'w' ? '.' : '...'} ${m.san}`
const forMover = (s, color) => (s.mate != null ? { mate: color === 'w' ? s.mate : -s.mate } : { cp: color === 'w' ? s.cp : -s.cp })

/**
 * "Played like" rating from average centipawn loss, fitted on real Chess.com games
 * (both players' known ratings). One game is noisy, so a range is shown.
 *   rating = A + B * ln(acpl + 10)
 */
// Fitted on 142 player-games with known Chess.com ratings (617-3465): 60 of SINGH2KING's
// games across 2021-2026 plus 15 games of a 3000+ player, analysed at depth 12.
// Typical error for ONE game is large (mean absolute error ~550): a single game mostly
// tells "club level" from "expert level", not 900 from 1300.
export const RATING_MODEL = { A: 6262, B: -1107, err: 550, min: 400, max: 2800 }

/**
 * This game's PERFORMANCE, anchored on the player's real rating.
 * Recalibrated on 668 player-games (ratings ~400-3400, blitz/rapid, Stockfish depth 16 - the
 * site's default) with scripts/calib-*.mjs. Finding: one game's accuracy only weakly reflects
 * strength (the best single-game formula is still off by ~590 on average, and wildly
 * overrates low-rated players). So we treat the game as noisy evidence and combine it with
 * the player's actual rating: raw = w . features;  raw ~ N(c + d*R, s^2);  prior R ~ N(rating, tau^2).
 */
export const PERF_MODEL = { w: [5099.341, -946.993, -12.847, -6.896, 1379.955], c: 1189.1, d: 0.35, s: 418.2, tau: 250 }

export function estimatePerformance(mine, rating, model = PERF_MODEL) {
  const scored = mine.filter((m) => m.cls !== 'book' && m.cls !== 'forced')
  if (scored.length < 10) return null
  const n = scored.length
  const cnt = (k) => mine.filter((m) => m.cls === k).length
  const f = [
    1,
    Math.log(scored.reduce((a, m) => a + Math.min(m.cpLoss, 300), 0) / n + 10),
    Math.log((scored.reduce((a, m) => a + m.loss, 0) / n) * 100 + 1),
    (cnt('blunder') + 0.5 * cnt('mistake') + 0.5 * cnt('miss')) / n,
    (cnt('best') + cnt('great') + cnt('brilliant')) / n,
  ]
  const raw = f.reduce((a, x, i) => a + x * model.w[i], 0)
  const known = rating > 0
  const R0 = known ? rating : 1500
  const tau = known ? model.tau : 700 // no rating in the PGN: lean on the game itself, with a wide range
  const mL = (raw - model.c) / model.d, vL = (model.s / model.d) ** 2
  const v = 1 / (1 / tau ** 2 + 1 / vL)
  const m = v * (R0 / tau ** 2 + mL / vL)
  const sd = Math.sqrt(v)
  const r25 = (x) => Math.round(Math.max(model.min || 100, Math.min(3300, x)) / 25) * 25
  return { rating: r25(m), low: r25(m - sd), high: r25(m + sd), known, diff: known ? Math.round(m - rating) : null }
}

export function estimateRating(acpl, moves, model = RATING_MODEL) {
  if (moves < 10) return null
  const est = model.A + model.B * Math.log(acpl + 10)
  const clamp = (v) => Math.round(Math.max(model.min, Math.min(model.max, v)) / 25) * 25
  // fewer moves = less evidence = wider range
  const spread = model.err * Math.min(1.4, Math.sqrt(30 / Math.max(10, moves)))
  return { rating: clamp(est), low: clamp(est - spread), high: clamp(est + spread) }
}

function openingSlug(name) {
  if (!name) return null
  const family = name.replace(/^[A-E]\d\d /, '').split(':')[0].trim()
  return family.replace(/['’.]/g, '').replace(/\s+/g, '_')
}

/** Builds the report for one colour ('w' or 'b'). */
export function playerReport(result, color, { headers = {}, rating = 0 } = {}) {
  const all = result.moves
  const mine = all.filter((m) => m.color === color)
  const side = result.summary[color]
  const weaknesses = []
  const strengths = []
  const learn = new Map()
  const addLearn = (key, title, why, links) => { if (!learn.has(key)) learn.set(key, { title, why, links }) }

  // 1. pieces left hanging
  const hung = mine.filter((m) => ['mistake', 'blunder', 'miss'].includes(m.cls)).map((m) => ({ m, h: hangs(m) })).filter((x) => x.h && x.h.piece !== 'pawn')
  if (hung.length) {
    weaknesses.push({ key: 'hung', title: `Left material hanging (${hung.length}×)`, detail: hung.slice(0, 3).map((x) => `${moveLabel(x.m)} let ${x.h.by} win your ${x.h.piece}`).join('; '), plies: hung.map((x) => x.m.ply) })
    addLearn('hung', 'Blunder check before every move', 'Before you move, ask: "What does this leave undefended, and what can my opponent capture or check?"', [{ label: 'Hanging piece puzzles', url: `${LI}hangingPiece` }])
  }

  // 2. checkmates missed / allowed
  const missedMate = mine.filter((m) => {
    const b = forMover(m.sBest, color), a = forMover(m.sAfter, color)
    return b.mate != null && b.mate > 0 && !(a.mate != null && a.mate > 0) && !m.isMate
  })
  if (missedMate.length) {
    const n = Math.min(...missedMate.map((m) => forMover(m.sBest, color).mate))
    weaknesses.push({ key: 'missedMate', title: 'Missed a forced checkmate', detail: `${moveLabel(missedMate[0])}: you had mate in ${n} with ${missedMate[0].bestSan}.`, plies: missedMate.map((m) => m.ply) })
    addLearn('mate', 'Checkmate patterns', 'Spotting forced mates turns good positions into wins. Drill short mating patterns until they are automatic.', [
      { label: 'Mate in 1', url: `${LI}mateIn1` }, { label: 'Mate in 2', url: `${LI}mateIn2` }, { label: 'Mate in 3', url: `${LI}mateIn3` }])
  }
  const allowedMate = mine.filter((m) => {
    const b = forMover(m.sBest, color), a = forMover(m.sAfter, color)
    return a.mate != null && a.mate < 0 && !(b.mate != null && b.mate < 0)
  })
  if (allowedMate.length) {
    weaknesses.push({ key: 'allowedMate', title: 'Walked into a mating attack', detail: `${moveLabel(allowedMate[0])} allowed a forced mate. ${allowedMate[0].bestSan ? `${allowedMate[0].bestSan} would have held.` : ''}`, plies: allowedMate.map((m) => m.ply) })
    addLearn('defence', 'Defending your king', 'Look for your opponent\'s checks and threats first, especially on the back rank and around your castled king.', [
      { label: 'Defensive moves', url: `${LI}defensiveMove` }, { label: 'Back-rank mates', url: `${LI}backRankMate` }])
  }

  // 3. tactical chances missed after the opponent erred
  const misses = mine.filter((m) => m.cls === 'miss')
  if (misses.length) {
    weaknesses.push({ key: 'miss', title: `Missed chances to punish mistakes (${misses.length}×)`, detail: misses.slice(0, 3).map((m) => `${moveLabel(m)} (better: ${m.bestSan})`).join(', '), plies: misses.map((m) => m.ply) })
    addLearn('tactics', 'Tactics: forks, pins and skewers', 'When your opponent slips, there is usually a tactic. Check every capture and check for both sides.', [
      { label: 'Forks', url: `${LI}fork` }, { label: 'Pins', url: `${LI}pin` }, { label: 'Skewers', url: `${LI}skewer` }])
  }

  // 4. let a winning position slip
  const peak = Math.max(...mine.map((m) => m.wAfter))
  const lastW = mine.at(-1)?.wAfter ?? 50
  const gameResult = headers.Result
  const won = (gameResult === '1-0' && color === 'w') || (gameResult === '0-1' && color === 'b')
  if (peak >= 80 && !won) {
    const at = mine.find((m) => m.wAfter >= 80)
    weaknesses.push({ key: 'slip', title: 'Let a winning position slip', detail: `You were clearly winning by ${moveLabel(at)} (${Math.round(peak)}% winning chances) but didn't convert.`, plies: [at.ply] })
    addLearn('convert', 'Converting a winning position', 'When ahead: trade pieces (not pawns), remove your opponent\'s counterplay, and don\'t rush.', [
      { label: 'Advantage puzzles', url: `${LI}advantage` }, { label: 'Crushing puzzles', url: `${LI}crushing` }])
  }

  // 5. weakest phase
  const phases = Object.entries(side.phases).filter(([p, v]) => v != null && all.filter((m) => m.phase === p && m.color === color).length >= 3)
  if (phases.length >= 2) {
    const [worst, wv] = phases.sort((a, b) => a[1] - b[1])[0]
    const [bestP, bv] = phases.sort((a, b) => b[1] - a[1])[0]
    if (wv < 75 && bv - wv >= 8) {
      weaknesses.push({ key: `phase-${worst}`, title: `Weakest phase: the ${worst}`, detail: `Accuracy ${wv.toFixed(0)} in the ${worst}, vs ${bv.toFixed(0)} in the ${bestP}.`, plies: [] })
      if (worst === 'endgame') addLearn('endgame', 'Endgame technique', 'Activate your king, push passed pawns, and learn the basic rook endgames.', [{ label: 'Endgame puzzles', url: `${LI}endgame` }, { label: 'Lichess practice: endgames', url: 'https://lichess.org/practice' }])
      if (worst === 'middlegame') addLearn('middlegame', 'Middlegame plans and tactics', 'Find a plan (attack the king, target a weak pawn, improve your worst piece) and calculate captures and checks.', [{ label: 'Middlegame puzzles', url: `${LI}middlegame` }])
      if (worst === 'opening') addLearn('openingPhase', 'Opening principles', 'Control the centre, develop knights and bishops, castle early, and avoid moving the same piece twice.', [{ label: 'Opening puzzles', url: `${LI}opening` }])
    }
    if (bv >= 88) strengths.push({ title: `Strong ${bestP}`, detail: `Accuracy ${bv.toFixed(0)} in the ${bestP}.` })
  }

  // 6. opening trouble in the first 10 moves
  const earlyErrors = mine.filter((m) => m.ply <= 20 && ['inaccuracy', 'mistake', 'blunder'].includes(m.cls))
  if (earlyErrors.length >= 2 || earlyErrors.some((m) => m.cls !== 'inaccuracy')) {
    weaknesses.push({ key: 'opening', title: 'Shaky opening', detail: `${earlyErrors.length} inaccurate move${earlyErrors.length === 1 ? '' : 's'} in the first 10 moves: ${earlyErrors.slice(0, 3).map(moveLabel).join(', ')}.`, plies: earlyErrors.map((m) => m.ply) })
    const slug = openingSlug(result.openingName)
    addLearn('opening', result.openingName ? `Study the ${result.openingName.replace(/^[A-E]\d\d /, '').split(':')[0]}` : 'Learn your opening', 'Learn the main ideas and the first 6-8 moves of the opening you played, so you reach the middlegame comfortably.',
      [...(slug ? [{ label: 'Opening explorer & ideas', url: `https://lichess.org/opening/${slug}` }] : []), { label: 'Opening puzzles', url: `${LI}opening` }])
  }

  // 7. king safety: never castled in a long game
  const castled = mine.some((m) => m.isCastle)
  if (!castled && mine.length >= 20 && mine.filter((m) => m.phase !== 'endgame').length >= 12) {
    weaknesses.push({ key: 'king', title: 'Never castled', detail: 'Your king stayed in the centre while the position was still full of pieces.', plies: [] })
    addLearn('king', 'King safety', 'Castle in the first 10 moves in most openings, and keep the pawns in front of your castled king.', [{ label: 'Kingside attack puzzles (see the danger)', url: `${LI}kingsideAttack` }])
  }

  // 8. clock trouble
  const base = parseInt((headers.TimeControl || '').split('+')[0], 10)
  if (base > 0) {
    const low = mine.filter((m) => m.clock != null && m.clock < base * 0.1)
    const lostOnTime = /time/i.test(headers.Termination || '') && !won && gameResult !== '1/2-1/2'
    const errorsInTrouble = low.filter((m) => ['mistake', 'blunder', 'miss'].includes(m.cls))
    if (lostOnTime || low.length >= 5 || errorsInTrouble.length) {
      weaknesses.push({ key: 'time', title: lostOnTime ? 'Lost on time' : 'Time trouble', detail: `${low.length} moves played with under 10% of your clock${errorsInTrouble.length ? `, including ${errorsInTrouble.length} serious error${errorsInTrouble.length > 1 ? 's' : ''}` : ''}.`, plies: errorsInTrouble.map((m) => m.ply) })
      addLearn('time', 'Clock management', 'Play the opening quickly with moves you know, save time for critical moments, and try games with increment (e.g. 3|2 or 10|5).', [])
    }
  }

  // 9. too many blunders overall
  if (side.counts.blunder >= 2 && !hung.length && !allowedMate.length) {
    weaknesses.push({ key: 'blunders', title: `${side.counts.blunder} blunders`, detail: mine.filter((m) => m.cls === 'blunder').slice(0, 3).map(moveLabel).join(', '), plies: mine.filter((m) => m.cls === 'blunder').map((m) => m.ply) })
    addLearn('hung', 'Blunder check before every move', 'Ask "what are all my opponent\'s checks, captures and threats?" before you commit.', [{ label: 'Hanging piece puzzles', url: `${LI}hangingPiece` }])
  }

  // strengths
  if (side.counts.brilliant) strengths.push({ title: `${side.counts.brilliant} brilliant move${side.counts.brilliant > 1 ? 's' : ''}`, detail: 'A sound sacrifice - well spotted.' })
  if (side.counts.great) strengths.push({ title: `${side.counts.great} great move${side.counts.great > 1 ? 's' : ''}`, detail: 'Found the only move that kept the position together.' })
  if (side.accuracy >= 85) strengths.push({ title: 'Accurate play', detail: `${side.accuracy.toFixed(1)} accuracy over the game.` })
  if (!side.counts.blunder && !side.counts.mistake && mine.length >= 15) strengths.push({ title: 'No mistakes or blunders', detail: 'Clean, solid game.' })
  const low = Math.min(...mine.map((m) => m.wAfter))
  if (low <= 25 && (won || gameResult === '1/2-1/2')) strengths.push({ title: 'Fought back', detail: `You were down to ${Math.round(low)}% winning chances and still ${won ? 'won' : 'drew'}.` })
  if (won && peak >= 80) strengths.push({ title: 'Converted the advantage', detail: 'Once you were winning, you brought it home.' })
  const mated = mine.find((m) => m.isMate)
  if (mated) strengths.push({ title: 'Delivered checkmate', detail: moveLabel(mated) })

  return {
    weaknesses: weaknesses.slice(0, 6),
    strengths: strengths.slice(0, 5),
    learn: [...learn.values()].slice(0, 5),
    estimate: estimatePerformance(mine, rating),
    acpl: side.acpl,
  }
}

export { winPct }
