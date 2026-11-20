// Turns engine lines + tactical motifs into plain-English move explanations.
import { describeMaterial, lineSwing, moveMotifs } from './motifs.js'

const BAD = ['inaccuracy', 'mistake', 'blunder', 'miss']
const GOOD = ['best', 'excellent', 'good', 'great', 'brilliant']
// motifs worth talking about (plain captures/threats only when nothing better exists)
const STRONG = ['mate', 'fork', 'pin', 'skewer', 'discovered', 'doublecheck', 'trap', 'promote']

function phrase(m) {
  if (!m) return ''
  if (m.kind === 'fork') return `a ${m.text}`
  if (m.kind === 'mate') return m.text
  if (m.kind === 'doublecheck' || m.kind === 'discovered') return m.text
  return `which ${m.text}`
}
function pick(motifs) {
  return motifs.find((m) => STRONG.includes(m.kind)) || motifs.find((m) => m.kind === 'threat') || motifs.find((m) => m.kind === 'capture') || null
}

/**
 * Builds { text, wrong, better } for one reviewed move.
 *  wrong  - what the opponent can do now (for weak moves)
 *  better - what the engine's move would have done
 */
export function explainMove(mv, prev = null) {
  if (mv.cls === 'book' || mv.cls === 'forced') return null
  const you = mv.color
  const played = moveMotifs(mv.fenBefore, mv.san)
  const parts = []
  let wrong = null, better = null

  if (BAD.includes(mv.cls)) {
    const reply = mv.replyLine[0]
    const replyMotifs = reply ? moveMotifs(mv.fenAfter, reply) : []
    const swing = lineSwing(mv.fenBefore, [mv.san, ...mv.replyLine], you)
    const bestSwing = mv.bestLine.length ? lineSwing(mv.fenBefore, mv.bestLine, you) : swing
    // material this move gives away compared with the engine's move - only trusted when it
    // agrees with the engine's evaluation (a short line can stop halfway through a trade)
    const evalCost = (mv.cpLoss || 0) / 100
    const rawCost = bestSwing - swing
    const cost = rawCost <= evalCost + 1.5 ? rawCost : 0
    const recapture = reply && mv.captured && replyMotifs.some((m) => m.kind === 'capture') && reply.includes(mv.to)
    const r = pick(recapture ? replyMotifs.filter((m) => m.kind !== 'capture') : replyMotifs)
    const matedLine = replyMotifs.some((m) => m.kind === 'mate') || (mv.evalAfter.mate != null && ((you === 'w' && mv.evalAfter.mate < 0) || (you === 'b' && mv.evalAfter.mate > 0)))
    if (matedLine) {
      wrong = `It allows a forced checkmate: ${mv.replyLine.slice(0, 5).join(' ')}.`
    } else if (reply && r) {
      wrong = `It lets your opponent play ${reply}, ${phrase(r)}${cost >= 1 ? ` - this costs you ${describeMaterial(cost)}` : ''}.`
    } else if (reply && cost >= 1) {
      wrong = `After ${mv.replyLine.slice(0, 3).join(' ')} it costs you ${describeMaterial(cost)} compared with the best move.`
    } else if (reply) {
      wrong = `Your opponent can answer ${reply} and your position gets harder${mv.replyLine.length > 1 ? ` (${mv.replyLine.slice(0, 4).join(' ')})` : ''}.`
    }
    if (mv.cls === 'miss') wrong = `Your opponent had just made a mistake, and this lets them off the hook. ${wrong || ''}`.trim()

    if (mv.bestSan && mv.bestSan !== mv.san) {
      const bestMotifs = moveMotifs(mv.fenBefore, mv.bestSan)
      const b = pick(bestMotifs)
      const gain = bestSwing <= evalCost + 1.5 ? bestSwing : 0 // real material the better move wins (not just 'avoids losing')
      const bits = []
      if (b) bits.push(b.kind === 'fork' ? `it is ${phrase(b)}` : b.kind === 'mate' ? `it is ${b.text}` : `it ${b.text}`)
      if (gain >= 1 && !(b && b.kind === 'capture' && gain <= 1)) bits.push(`${bits.length ? '' : 'it '}wins ${describeMaterial(gain)}`)
      else if (!bits.length && cost >= 1) bits.push(`it keeps the material`)
      better = `${mv.bestSan} was better${bits.length ? `: ${bits.join(' and ')}` : ''}.`
      if (!bits.length && mv.bestLine.length > 1) better = `${mv.bestSan} was better, e.g. ${mv.bestLine.slice(0, 5).join(' ')}.`
    }
    if (played.some((m) => m.kind === 'capture') && !wrong?.includes('takes')) {
      // nothing extra - capture is already implied by the SAN
    }
    parts.push(wrong, better)
  } else if (GOOD.includes(mv.cls)) {
    const strong = played.filter((m) => STRONG.includes(m.kind) || m.kind === 'threat').slice(0, 2)
    const gain = prev ? lineSwing(prev.fenBefore, [prev.san, mv.san, ...mv.replyLine], you, 7) : lineSwing(mv.fenBefore, [mv.san, ...mv.replyLine], you)
    if (strong.length) {
      const desc = strong.map((m) => (m.kind === 'fork' ? `sets up ${phrase(m)}` : m.kind === 'doublecheck' || m.kind === 'discovered' ? `gives a ${m.text}` : m.kind === 'mate' ? `delivers ${m.text}` : m.text)).join(' and ')
      parts.push(`${mv.san} ${desc}${gain >= 2 ? `, winning ${describeMaterial(gain)}` : ''}.`)
    } else if (gain >= 2) {
      parts.push(`${mv.san} wins ${describeMaterial(gain)} by force: ${[mv.san, ...mv.replyLine].slice(0, 5).join(' ')}.`)
    }
    if (mv.cls !== 'best' && mv.cls !== 'brilliant' && mv.cls !== 'great' && mv.bestSan && mv.bestSan !== mv.san) {
      const b = pick(moveMotifs(mv.fenBefore, mv.bestSan))
      if (b && STRONG.includes(b.kind)) better = `${mv.bestSan} was even stronger: it ${b.kind === 'fork' ? `is ${phrase(b)}` : b.text}.`
      if (better) parts.push(better)
    }
  }
  const text = parts.filter(Boolean).join(' ')
  return text ? { text, wrong, better } : null
}
