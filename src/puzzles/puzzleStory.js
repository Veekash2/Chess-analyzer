// Explains a puzzle when it is opened: why the move you played went wrong, and why the
// solution works - using a quick engine look plus the tactic detector. Works for puzzles
// saved before explanations existed too (it only needs the position and both moves).
import { Chess } from 'chess.js'
import { getEngine } from '../review/engine'
import { fmtEval, winPct } from '../review/reviewCore'
import { explainMove } from '../review/explain'
import { NAME, VAL, moveMotifs, lineSwing, describeMaterial, threats } from '../review/motifs'

const flip = (s) => (s.mate != null ? { mate: -s.mate } : { cp: -s.cp })
const cpOf = (s) => (s.mate != null ? (s.mate > 0 ? 1000 : -1000) : Math.max(-1000, Math.min(1000, s.cp)))
const toSan = (fen, uciLine, max = 6) => {
  const c = new Chess(fen)
  const out = []
  for (const u of uciLine.slice(0, max)) {
    try { out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san) } catch { break }
  }
  return out
}
const pct = (s) => `${Math.round(winPct(s))}%`
const evalWords = (s) => {
  const w = winPct(s)
  if (s.mate != null) return s.mate > 0 ? 'a forced mate for you' : 'a forced mate against you'
  if (w >= 85) return 'winning'
  if (w >= 65) return 'clearly better'
  if (w >= 55) return 'slightly better'
  if (w > 45) return 'about equal'
  if (w > 35) return 'slightly worse'
  if (w > 15) return 'clearly worse'
  return 'losing'
}

/** First-level hint: the idea, without giving the move away. */
export function ideaHint(fen, uci) {
  const c = new Chess(fen)
  let mv
  try { mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }) } catch { return 'Look for the most forcing move.' }
  const m = moveMotifs(fen, mv.san)
  const kinds = new Set(m.map((x) => x.kind))
  if (kinds.has('mate')) return 'There is a checkmate here - start with checks.'
  if (kinds.has('fork')) return 'Look for one move that attacks two things at once.'
  if (kinds.has('pin')) return 'Can you pin one of your opponent\'s pieces?'
  if (kinds.has('skewer')) return 'Look for a skewer: attack a big piece with something behind it.'
  if (kinds.has('discovered') || kinds.has('doublecheck')) return 'Move one piece to uncover an attack by another.'
  if (kinds.has('trap')) return 'One of your opponent\'s pieces can be trapped.'
  if (m.some((x) => x.kind === 'threat' && x.text.includes('#'))) return 'Find a move that threatens checkmate.'
  if (mv.captured) return `Something can be taken - look for loose pieces (your ${NAME[mv.piece]} is involved).`
  if (mv.san.includes('+')) return 'Start with a check.'
  if (m.some((x) => x.kind === 'threat')) return 'Find a move that creates a strong threat.'
  return `Look at your ${NAME[mv.piece]} - it has the key move.`
}

/** Engine-backed explanation of one puzzle. */
export async function buildStory(puzzle) {
  const engine = await getEngine()
  const you = puzzle.color
  const c = new Chess(puzzle.fen)
  const played = c.move(puzzle.playedSan)
  const fenAfter = c.fen()

  const [before, after] = [await engine.evaluate(puzzle.fen, 12), await engine.evaluate(fenAfter, 12)]
  // engine scores are for the side to move: before = you, after = opponent
  const sBest = before.lines[0] ? (before.lines[0].mate != null ? { mate: before.lines[0].mate } : { cp: before.lines[0].cp }) : { cp: 0 }
  const sAfterOpp = after.lines[0] ? (after.lines[0].mate != null ? { mate: after.lines[0].mate } : { cp: after.lines[0].cp }) : { cp: 0 }
  const sAfter = flip(sAfterOpp)
  const replyLine = toSan(fenAfter, after.lines[0]?.pv || [], 6)
  const bestLine = toSan(puzzle.fen, before.lines[0]?.pv || puzzle.solution, 6)
  const bestSan = bestLine[0] || puzzle.bestSan
  const white = (s) => (you === 'w' ? s : flip(s))

  const ex = explainMove({
    cls: puzzle.playedCls, color: you, san: played.san, fenBefore: puzzle.fen, fenAfter,
    replyLine, bestSan, bestLine, evalAfter: white(sAfter), cpLoss: Math.max(0, cpOf(sBest) - cpOf(sAfter)),
    captured: played.captured, to: played.to,
  }) || {}

  // --- why your move went wrong
  // evaluations from YOUR side (+ = good for you), so Black's puzzles read naturally too
  const evalLine = `Before ${played.san} you were ${evalWords(sBest)} (${fmtEval(sBest)} for you, ${pct(sBest)} winning chances). After it you are ${evalWords(sAfter)} (${fmtEval(sAfter)}, ${pct(sAfter)}).`
  let wrong = ex.wrong
  // concrete reasons when no tactic is involved
  const reasons = []
  if (replyLine.length) {
    const r = new Chess(fenAfter)
    let reply = null
    try { reply = r.move(replyLine[0]) } catch { /* ignore */ }
    const opp = you === 'w' ? 'b' : 'w'
    if (reply) {
      if (played.san.includes('+') && reply.piece === 'k') reasons.push(`${played.san} is a check that gains nothing: the king simply steps to ${reply.to}, and your ${NAME[played.piece]} on ${played.to} is left ${played.to.match(/[ah]/) || /[18]/.test(played.to) ? 'on the edge, out of play' : 'without a follow-up'}`)
      // is the piece you moved now loose?
      const mine = r.get(played.to)
      if (mine && mine.color === you && VAL[mine.type] >= 3) {
        const att = r.attackers(played.to, opp)
        const def = r.attackers(played.to, you)
        if (att.length && !def.length) reasons.push(`your ${NAME[mine.type]} on ${played.to} is attacked and has no defender`)
      }
      // what does your opponent threaten after their reply?
      const t = threats(r.fen(), opp)
      if (t.mate) reasons.push(`your opponent now threatens ${t.mate}`)
      else if (t.win) reasons.push(`your opponent now threatens to win your ${NAME[t.win.type]} on ${t.win.square} with ${t.win.san}`)
      if (reply.captured && VAL[reply.captured] >= 3 && !wrong) reasons.push(`${reply.san} wins your ${NAME[reply.captured]}`)
    }
  }
  if (!wrong && reasons.length) wrong = `${reasons.map((x, i) => (i === 0 ? x[0].toUpperCase() + x.slice(1) : x)).join('; ')}. The engine's main line: ${replyLine.slice(0, 4).join(' ')}.`
  else if (wrong && reasons.length) wrong += ` Also, ${reasons[0]}.`
  if (!wrong && replyLine.length) {
    const swing = lineSwing(fenAfter, replyLine, you)
    wrong = `The best answer is ${replyLine.slice(0, 4).join(' ')}${swing <= -1 ? `, and you end up ${describeMaterial(swing)} down` : ' and your opponent takes over the initiative'}.`
  }
  // what your move gave up: did it walk away from a threat, or ignore one?
  const missed = moveMotifs(puzzle.fen, bestSan).find((m) => ['fork', 'pin', 'skewer', 'discovered', 'mate', 'trap', 'threat'].includes(m.kind))

  // --- why the solution works, move by move
  const steps = []
  let fen = puzzle.fen
  const line = puzzle.solution.length > 1 ? toSan(puzzle.fen, puzzle.solution, 7) : bestLine.slice(0, 3)
  for (let i = 0; i < line.length; i++) {
    const motifs = moveMotifs(fen, line[i])
    const top = motifs.find((m) => m.kind !== 'capture') || motifs[0]
    const mine = i % 2 === 0
    steps.push({ san: line[i], mine, note: top?.text || (mine ? '' : 'the best defence') })
    try { const t = new Chess(fen); t.move(line[i]); fen = t.fen() } catch { break }
  }
  const sentences = steps.map((st, i) => {
    if (i === 0) return `${st.san}${st.note ? ` ${st.note}` : ''}`
    if (!st.mine) return `after ${st.san}${st.note && st.note !== 'the best defence' ? ` (which ${st.note})` : ''}`
    return `${st.san}${st.note ? ` ${st.note}` : ''}`
  })
  const gain = lineSwing(puzzle.fen, line, you)
  let why = sentences.length ? `${sentences.join(', ')}.` : ''
  if (gain >= 1) why += ` In the end you win ${describeMaterial(gain)}.`
  why += ` With best play you stay ${evalWords(sBest)} (${fmtEval(sBest)} for you) instead of ${evalWords(sAfter)} after your ${played.san}.`
  const compare = `Your ${played.san} let the advantage slip by ${Math.max(0, Math.round(winPct(sBest) - winPct(sAfter)))} percentage points of winning chances${missed ? `, and missed that ${bestSan} ${missed.text}` : ''}.`

  return { evalLine, wrong, better: ex.better, why, compare, steps, bestLine, replyLine, playedSan: played.san }
}
