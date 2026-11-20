// Practice bots: original characters named after the old chaturanga pieces, each a
// deliberately weakened Stockfish with its own style and a few lines of chat.
import { Chess } from 'chess.js'

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

export const BOTS = [
  {
    id: 'pyaada', name: 'Pyaada', rating: 400, glyph: '♟', color: '#8a6d3b', style: 'random',
    tagline: 'Just learned how the pieces move.',
    depth: 2, blunder: 0.32, margin: 350,
    chat: {
      hello: ['Namaste! Go easy on me, I just learned this game!', 'Hi! Which way does the horse move again?'],
      takes: ['Ooh, a free piece!', 'Mine now!'], lost: ['Hey, I needed that!', 'Oops...'],
      check: ['Check! Did I do that right?'], winning: ['Am I... winning?'], losing: ['This is hard!'],
      win: ['I won?! Wait till I tell my friends!'], loss: ['Well played! I will practise more.'], draw: ['A draw! That counts as half a win, right?'],
    },
  },
  {
    id: 'ghoda', name: 'Ghoda', rating: 800, glyph: '♞', color: '#2f6f4f', style: 'knights',
    tagline: 'Loves jumping knights into your camp.',
    depth: 4, blunder: 0.16, margin: 220,
    chat: {
      hello: ['Hup hup! My knights are ready to jump.', 'Watch out for forks - I love them!'],
      takes: ['Jumped right in!', 'Gotcha!'], lost: ['Hmph, I did not see that.', 'Nice shot.'],
      check: ['Check! Neigh-ce, right?'], winning: ['My horses are galloping now!'], losing: ['Time to regroup the stable...'],
      win: ['The knights win the day!'], loss: ['You out-jumped me. Good game!'], draw: ['A draw. My knights need a rest anyway.'],
    },
  },
  {
    id: 'haathi', name: 'Haathi', rating: 1100, glyph: '♜', color: '#5b6b7a', style: 'solid',
    tagline: 'Slow and steady, like an elephant.',
    depth: 6, blunder: 0.08, margin: 130,
    chat: {
      hello: ['An elephant never forgets... a weak square.', 'Let us play a calm, solid game.'],
      takes: ['Thank you.', 'Slowly, slowly.'], lost: ['A fair trade... I hope.', 'Hmm, careful now.'],
      check: ['Check.'], winning: ['The elephant keeps walking forward.'], losing: ['I will dig in and defend.'],
      win: ['Slow and steady wins.'], loss: ['You played well. Good game.'], draw: ['A peaceful draw.'],
    },
  },
  {
    id: 'mantri', name: 'Mantri', rating: 1400, glyph: '♛', color: '#a3245c', style: 'aggressive',
    tagline: 'The minister who always attacks the king.',
    depth: 8, blunder: 0.04, margin: 80,
    chat: {
      hello: ['A minister must protect the crown - by attacking yours.', 'I hope your king likes fresh air.'],
      takes: ['Another one falls.', 'Attack, attack, attack!'], lost: ['A small sacrifice for the attack.', 'Bold of you.'],
      check: ['Check! Run, little king.', 'Check! Feeling the pressure?'], winning: ['The attack is coming through.'], losing: ['Even ministers have bad days.'],
      win: ['The crown is mine!'], loss: ['You survived my attack. Impressive.'], draw: ['A draw? I wanted blood!'],
    },
  },
  {
    id: 'raja', name: 'Raja', rating: 1800, glyph: '♚', color: '#b8892f', style: 'positional',
    tagline: 'A wise king who squeezes every advantage.',
    depth: 10, blunder: 0.015, margin: 40,
    chat: {
      hello: ['Welcome to my court. Show me your best chess.', 'Patience is the weapon of kings.'],
      takes: ['As planned.', 'Every pawn counts.'], lost: ['A worthy move.', 'You are no beginner.'],
      check: ['Check.'], winning: ['The squeeze has begun.'], losing: ['You have my attention now.'],
      win: ['The kingdom stands. Well fought.'], loss: ['You have beaten a king. Remarkable.'], draw: ['An honourable draw.'],
    },
  },
  {
    id: 'maharaja', name: 'Maharaja', rating: 2200, glyph: '♔', color: '#7a1f3d', style: 'positional',
    tagline: 'Master strength. Few mistakes, no mercy.',
    depth: 13, blunder: 0.004, margin: 15,
    chat: {
      hello: ['You seek a challenge? Very well.', 'Let us see what you have learned.'],
      takes: ['Inevitable.'], lost: ['Interesting.'], check: ['Check.'], winning: ['The end is near.'], losing: ['Hm. Well played so far.'],
      win: ['A good effort. Study and return.'], loss: ['Extraordinary. You have earned my respect.'], draw: ['A draw against a Maharaja is no small thing.'],
    },
  },
  {
    id: 'chaturanga', name: 'Chaturanga', rating: 3000, glyph: '♚', color: '#111827', style: 'best',
    tagline: 'The spirit of the original game. Full engine strength.',
    depth: 18, blunder: 0, margin: 0,
    chat: {
      hello: ['I have played for fifteen centuries. Your move.'], takes: ['...'], lost: ['...'], check: ['Check.'],
      winning: ['Resistance is admirable.'], losing: ['Impossible...'], win: ['As it has always been.'], loss: ['You... have done the impossible.'], draw: ['Balance is restored.'],
    },
  },
]

export const pick = (list) => list[Math.floor(Math.random() * list.length)]

/** Score a line from the side to move, in centipawns (mates as big numbers). */
const cpOf = (l) => (l.mate != null ? (l.mate > 0 ? 100000 - l.mate * 100 : -100000 - l.mate * 100) : l.cp)

/**
 * Chooses the bot's move. The engine gives its top few lines; weaker bots pick from a wider
 * band of "good enough" moves, sometimes make an outright blunder, and favour their style.
 */
export async function chooseBotMove(engine, fen, bot) {
  const c = new Chess(fen)
  const legal = c.moves({ verbose: true })
  if (legal.length === 1) return legal[0]
  if (bot.blunder && Math.random() < bot.blunder) {
    // a "human" blunder: a random legal move that isn't instantly suicidal for very low bots
    const m = pick(legal)
    return m
  }
  const { lines } = await engine.evaluate(fen, bot.depth)
  const valid = lines.filter((l) => l.pv?.length)
  if (!valid.length) return pick(legal)
  const best = cpOf(valid[0])
  // a forced mate is never thrown away by the stronger bots
  if (valid[0].mate > 0 && bot.rating >= 1100) return toMove(c, valid[0].pv[0])
  const pool = valid.filter((l) => best - cpOf(l) <= bot.margin)
  const weighted = pool.map((l) => {
    const m = toMove(new Chess(fen), l.pv[0])
    let w = 1 + Math.max(0, bot.margin - (best - cpOf(l))) / Math.max(1, bot.margin) // better moves likelier
    if (bot.style === 'aggressive' && m && (m.san.includes('+') || m.captured)) w *= 2.2
    if (bot.style === 'knights' && m && m.piece === 'n') w *= 2
    if (bot.style === 'solid' && m && !m.captured && !m.san.includes('+')) w *= 1.4
    if (bot.style === 'positional' && l === valid[0]) w *= 2.5
    if (bot.style === 'best' && l === valid[0]) w *= 1000
    return { m, w }
  }).filter((x) => x.m)
  const total = weighted.reduce((s, x) => s + x.w, 0)
  let r = Math.random() * total
  for (const x of weighted) { r -= x.w; if (r <= 0) return x.m }
  return weighted[0]?.m || pick(legal)
}

function toMove(c, uci) {
  try { return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }) } catch { return null }
}

/** Material balance from `color`'s side (for chat reactions). */
export function materialFor(fen, color) {
  let t = 0
  for (const ch of fen.split(' ')[0]) {
    const low = ch.toLowerCase()
    if (VAL[low] == null) continue
    t += ((ch !== low) === (color === 'w') ? 1 : -1) * VAL[low]
  }
  return t
}

// ---- which bots you have beaten (saved in this browser)
const KEY = 'smc-bots-beaten'
export function getBeaten() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
export function markBeaten(id) {
  const b = getBeaten()
  b[id] = (b[id] || 0) + 1
  try { localStorage.setItem(KEY, JSON.stringify(b)) } catch { /* ignore */ }
  return b
}
