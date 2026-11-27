// Friend bots: a bot built from a friend's real games. It plays THEIR openings (move by move,
// as often as they actually play them), then Stockfish at their rating, and talks after every
// move - about your move and its own - like a coach bot.
import { makeBot, pick } from './bots'
import { sanMoves } from '../openings/bookLeaks'

const KEY = 'smc-friend-bots'
const PLIES = 20
export const friendId = (name) => `friend:${name.toLowerCase()}`

export function getFriendBots() {
  try { return Object.values(JSON.parse(localStorage.getItem(KEY) || '{}')) } catch { return [] }
}
export function deleteFriendBot(id) {
  try { const all = JSON.parse(localStorage.getItem(KEY) || '{}'); delete all[id]; localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* ignore */ }
}

/** Build and save a friend bot from their games (rows from their side, as toRow gives them). */
export function saveFriendBot(name, rows, avatar) {
  const games = rows.filter((r) => r.rules === 'chess' && r.pgn).sort((a, b) => b.end - a.end).slice(0, 600)
  const lines = { w: [], b: [] }
  for (const r of games) {
    const moves = sanMoves(r.pgn, PLIES)
    if (moves.length < 2) continue
    lines[r.color === 'white' ? 'w' : 'b'].push({ m: moves, s: r.outcome === 'win' ? 1 : r.outcome === 'draw' ? 0.5 : 0 })
  }
  // rating: their current rating in the time control they play most (blitz/rapid preferred)
  const byTc = {}
  for (const r of games) if (r.myRating) (byTc[r.timeClass] ||= []).push(r)
  const tc = ['blitz', 'rapid', 'bullet', 'daily'].filter((t) => byTc[t]).sort((a, b) => byTc[b].length - byTc[a].length)[0]
  const rating = tc ? byTc[tc][0].myRating : 1200
  const fam = {}
  for (const r of games) { const f = (r.opening || '').split(' ').slice(0, 3).join(' '); if (f) fam[f] = (fam[f] || 0) + 1 }
  const fav = Object.entries(fam).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f]) => f)
  const score = games.length ? Math.round((100 * games.reduce((a, r) => a + (r.outcome === 'win' ? 1 : r.outcome === 'draw' ? 0.5 : 0), 0)) / games.length) : 50
  const sharp = games.filter((r) => /Gambit|Attack|Sicilian|Scandinavian|Vienna|Kings Gambit|Stafford|Danish|Fried/i.test(r.opening)).length / Math.max(1, games.length)
  const saved = { id: friendId(name), name, avatar: avatar || null, rating, tc, games: games.length, score, fav, style: sharp > 0.45 ? 'aggressive' : 'positional', lines, built: Date.now() }
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    all[saved.id] = saved
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* storage full: keep going without saving */ }
  return saved
}

const HUES = ['#c0392b', '#2471a3', '#1e8449', '#b9770e', '#7d3c98', '#117a65', '#a04000', '#2e4053']
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** Turn a saved friend bot into a playable bot object. */
export function friendToBot(f) {
  const h = hash(f.name)
  return makeBot({
    id: f.id, name: f.name, rating: f.rating, friend: f, style: f.style, color: HUES[h % HUES.length], avatar: f.avatar,
    tagline: `Built from ${f.games} of ${f.name}'s games - plays their openings and talks you through it.`,
    look: { skin: ['light', 'medium', 'tan', 'brown', 'dark'][h % 5], hair: ['short', 'long', 'curly', 'bald', 'bun'][(h >> 3) % 5], hairColor: ['#2b1d14', '#6b4a2b', '#c9a15b', '#111'][(h >> 6) % 4], shirt: HUES[(h >> 2) % HUES.length], mood: 'smile' },
    bookByColor: { w: f.lines.w.map((l) => l.m), b: f.lines.b.map((l) => l.m) },
    chat: {
      hello: [`Hi! I'm ${f.name}'s bot - I play their real openings from ${f.games} games. Let's see if you can beat me.`],
      win: [`Gotcha! That's how ${f.name} wins.`, 'Good game - that one was mine.'],
      loss: [`Well played - you've got ${f.name}'s number!`, 'You beat me. Rematch?'],
      draw: ['A draw - fair result.'],
    },
  })
}

const PIECE = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }
const matching = (lines, hist) => lines.filter((l) => l.m.length > hist.length - 1 && hist.every((m, i) => l.m[i] === m))
const pct = (a, b) => Math.round((100 * a) / Math.max(1, b))
const scoreOf = (ls) => (ls.length ? Math.round((100 * ls.reduce((a, l) => a + l.s, 0)) / ls.length) : null)

/**
 * What the friend bot says after a move. `byBot` = the bot just moved. `info` holds the
 * evaluation event for your last move and whether the bot's move came from its book.
 */
export function friendSay(bot, { history, mv, byBot, botColor, evalEvent, lastEval, fromBook }) {
  const f = bot.friend
  const lines = f.lines[botColor]
  const san = mv.san
  if (!byBot) {
    // your move: compare with what people actually play against them
    const prev = matching(lines, history.slice(0, -1))
    const now = matching(lines, history)
    if (history.length <= PLIES && prev.length >= 2) {
      if (!now.length) return pick([`${san}? Nobody has played that against me - you've taken me out of my book!`, `Ooh, ${san}. That's new to me. Now I actually have to think.`])
      const share = pct(now.length, prev.length)
      const sc = scoreOf(now)
      if (share >= 50) return pick([`${san} - the usual move. ${share}% of my opponents play it, and I score ${sc}% from here.`, `${san}, as expected. I've seen this ${now.length} times (I score ${sc}%).`])
      return pick([`${san}! Only ${share}% of my opponents try that - ${now.length} game${now.length === 1 ? '' : 's'}. I score ${sc}% after it.`, `Interesting, ${san}. I've faced that ${now.length} time${now.length === 1 ? '' : 's'}.`])
    }
    if (mv.captured) return pick([`You take my ${PIECE[mv.captured]} on ${mv.to}... let me see.`, `${san}. Hmm, I need to recapture or find something better.`])
    if (san.includes('+')) return pick(['Check! Okay, where does my king go...', `${san} - you're pushing me around.`])
    return pick(['Let me think about that one.', 'Hmm, interesting move.', `I've played ${f.games} games - I've seen positions like this before.`, 'Okay. My turn.', 'Nice and calm. Let me find a plan.'])
  }
  // the bot's own move: first react to your last move, then explain its own
  let react = ''
  if (evalEvent === 'userBlunder') react = pick(['Thanks for that! ', 'That was a mistake - I\'m taking advantage. ', 'Oops for you! '])
  else if (evalEvent === 'goodMove') react = pick(['Good move, you\'ve got me worried. ', 'Strong! ', 'Nice one. '])
  else if (lastEval != null && lastEval > 300) react = pick(['I like my position. ', 'Things are going my way. ', ''])
  else if (lastEval != null && lastEval < -300) react = pick(['You\'re making this hard for me. ', 'I\'m in trouble here. ', ''])
  let own
  if (fromBook) own = `I'm playing ${san} - my usual move here (${fromBook.n} of ${fromBook.total} games).`
  else if (mv.captured) own = `${san}, taking your ${PIECE[mv.captured]}.`
  else if (san.startsWith('O-O')) own = `${san} - castling to keep my king safe.`
  else if (san.includes('+')) own = `${san}, check!`
  else own = pick([`${san}.`, `I'll go ${san}.`, `${san} - let's see how you handle that.`, f.fav[0] && history.length < 30 ? `${san}. You know I love the ${f.fav[0]}.` : `${san}.`])
  return (react + own).trim()
}

/** Book move for a friend bot, plus how often they played it (for the chat). */
export function friendBookInfo(bot, history, turn) {
  const lines = bot.friend?.lines?.[turn]
  if (!lines) return null
  const now = matching(lines, history).filter((l) => l.m.length > history.length)
  return now.length ? now : null
}
