// Explains a puzzle when it is opened: why the move you played went wrong, and why the
// solution works - using a quick engine look plus the tactic detector. Works for puzzles
// saved before explanations existed too (it only needs the position and both moves).
import { Chess } from 'chess.js'
import { getEngine } from '../review/engine'
import { fmtEval, winPct } from '../review/reviewCore'
import { explainMove } from '../review/explain'
import { NAME, moveMotifs, lineSwing, describeMaterial } from '../review/motifs'
import { describeChange, describePosition, features, sentence } from './positionTalk'

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

  // ----------------------------------------------------------------- the story, in words
  // Fewer numbers and squares: describe the board, then what the move changed.
  const plain = (t) => (t || '').replace(/ (on|to) [a-h][1-8]/g, '').replace(/\s+/g, ' ').trim()
  // "Qf5+ queen fork of..." -> "Qf5+ is a queen fork of..."; verbs ("traps", "pins") stay as they are
  const says = (san, note) => (/^(knight|bishop|rook|queen|king|pawn) fork|^double check|^discovered|^checkmate|^back-rank/.test(note) ? `${san} is a ${note}` : `${san} ${note}`)
  const opp = you === 'w' ? 'b' : 'w'

  // 1. the position before your move
  const pre = describePosition(puzzle.fen, you)
  const situation = `${sentence(pre.sentences.slice(0, 3))} Overall you were ${evalWords(sBest)} here.`

  // 2. what your move changed (after your opponent's best reply)
  let reply = null
  let fenReply = fenAfter
  if (replyLine.length) {
    const r = new Chess(fenAfter)
    try { reply = r.move(replyLine[0]); fenReply = r.fen() } catch { /* ignore */ }
  }
  const changes = describeChange(pre.features, features(fenReply, you))
  const reasons = []
  if (reply && played.san.includes('+') && reply.piece === 'k') reasons.push(`your check doesn't achieve anything - the king just steps aside and your ${NAME[played.piece]} is left ${/[ah]/.test(played.to[0]) || /[18]/.test(played.to[1]) ? 'stranded on the edge' : 'with nothing to do'}`)
  const tactic = ex.wrong && /fork|pin|skewer|discovered|checkmate|traps|double check/.test(ex.wrong) ? plain(ex.wrong) : null
  // material lost further down the engine's line
  const cost = lineSwing(puzzle.fen, [played.san, ...replyLine], you) - lineSwing(puzzle.fen, bestLine, you)
  if (cost <= -1 && !changes.some((x) => x.startsWith('you lose'))) reasons.push(`a few moves later you lose ${describeMaterial(cost)}`)
  const happened = [...reasons, ...changes].slice(0, 3)
  let wrong = ''
  if (tactic) wrong = tactic + (happened.length ? ` ${sentence(happened)}` : '')
  else if (happened.length) wrong = `After ${played.san}, ${sentence(happened).replace(/^./, (ch) => ch.toLowerCase())}`
  else wrong = `${played.san} doesn't lose anything straight away, but it wastes time: your opponent gets to improve their position while your pieces stay where they were.`
  const verdict = evalWords(sAfter) === evalWords(sBest)
    ? `It isn't a disaster, but it gives away part of your edge.`
    : `It takes you from ${evalWords(sBest)} to ${evalWords(sAfter)}.`
  wrong = `${wrong} ${verdict}`

  // 3. why the solution works, move by move
  const steps = []
  let fen = puzzle.fen
  const line = puzzle.solution.length > 1 ? toSan(puzzle.fen, puzzle.solution, 7) : bestLine.slice(0, 3)
  for (let i = 0; i < line.length; i++) {
    const motifs = moveMotifs(fen, line[i])
    const top = motifs.find((m) => m.kind !== 'capture') || motifs[0]
    const mine = i % 2 === 0
    steps.push({ san: line[i], mine, note: plain(top?.text) || (mine ? '' : 'the best defence') })
    try { const t = new Chess(fen); t.move(line[i]); fen = t.fen() } catch { break }
  }
  const key = steps[0]
  const gain = lineSwing(puzzle.fen, line, you)
  const endState = describeChange(pre.features, features(fen, you)).filter((x) => !x.startsWith('you lose'))
  const good = []
  if (key?.note) good.push(says(key.san, key.note))
  else good.push(`${key?.san || bestSan} is the strongest move here`)
  if (steps.length > 2) good.push(`your opponent's best answer is ${steps[1].san}, and then ${steps[2].note ? says(steps[2].san, steps[2].note) : steps[2].san}`)
  if (gain >= 1) good.push(`you come out ${describeMaterial(gain)} ahead`)
  const theirSide = features(fen, you)
  if (theirSide.theirLoose.length) good.push(`their ${NAME[theirSide.theirLoose[0].type]} is left hanging`)
  let why = sentence(good)
  if (!gain && !endState.length) why += ` It keeps the position under control and leaves you ${evalWords(sBest)}.`
  // 4. your move vs the solution
  const missed = moveMotifs(puzzle.fen, bestSan).find((m) => ['fork', 'pin', 'skewer', 'discovered', 'mate', 'trap', 'threat'].includes(m.kind))
  const compare = missed
    ? `The difference: ${says(bestSan, plain(missed.text))}, while your ${played.san} let your opponent off the hook.`
    : `The difference: ${bestSan} keeps your pieces working together, while your ${played.san} hands your opponent the easier game.`
  const evalLine = situation

  return { evalLine, wrong, better: ex.better, why, compare, steps, bestLine, replyLine, playedSan: played.san }
}
