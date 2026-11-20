const BASE = 'https://api.chess.com/pub/player'

const DRAW_CODES = new Set([
  'agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient',
])

async function getJson(url, signal, attempt = 0) {
  const res = await fetch(url, { signal })
  if (res.status === 429 && attempt < 4) {
    // Chess.com rate limit: back off and retry
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
    return getJson(url, signal, attempt + 1)
  }
  if (res.status === 404) {
    const err = new Error('not-found')
    err.status = 404
    throw err
  }
  if (!res.ok) throw new Error(`Chess.com returned ${res.status} for ${url}`)
  return res.json()
}

export async function fetchProfile(username, signal) {
  const u = encodeURIComponent(username.trim().toLowerCase())
  const [profile, stats] = await Promise.all([
    getJson(`${BASE}/${u}`, signal),
    getJson(`${BASE}/${u}/stats`, signal).catch(() => null),
  ])
  return { profile, stats }
}

/**
 * Downloads every monthly archive one after another (Chess.com asks API
 * clients to make requests serially) and reports progress after each month.
 */
export async function fetchAllGames(username, { signal, onProgress, months } = {}) {
  const u = encodeURIComponent(username.trim().toLowerCase())
  let { archives } = await getJson(`${BASE}/${u}/games/archives`, signal)
  if (months) {
    // only archives from the last N calendar months (archive URLs end in /YYYY/MM)
    const now = new Date()
    const cutoff = now.getFullYear() * 12 + now.getMonth() + 1 - months
    archives = archives.filter((a) => {
      const [, y, m] = a.match(/(\d{4})\/(\d{2})$/) || []
      return y && +y * 12 + +m > cutoff
    })
  }
  const games = []
  for (let i = 0; i < archives.length; i++) {
    const { games: month } = await getJson(archives[i], signal)
    games.push(...month)
    onProgress?.({ done: i + 1, total: archives.length, games: games.length, month: archives[i].slice(-7) })
  }
  return games
}

export function openingName(game) {
  const url = game.eco
  if (!url || !url.includes('/openings/')) return 'Unknown'
  const slug = decodeURIComponent(url.split('/openings/')[1])
  const words = []
  for (const w of slug.split('-')) {
    if (/^\d/.test(w)) break // the move list starts, e.g. "3...Nf6"
    words.push(w)
  }
  return words.join(' ') || 'Unknown'
}

/** Normalises one Chess.com game into the shape the UI uses. */
export function toRow(game, username) {
  const me = username.trim().toLowerCase()
  const isWhite = game.white.username.toLowerCase() === me
  const mine = isWhite ? game.white : game.black
  const opp = isWhite ? game.black : game.white
  const outcome = mine.result === 'win' ? 'win' : DRAW_CODES.has(mine.result) ? 'draw' : 'loss'
  const how = outcome === 'win' ? opp.result : mine.result
  return {
    url: game.url,
    pgn: game.pgn || '',
    end: new Date(game.end_time * 1000),
    timeClass: game.time_class,
    timeControl: game.time_control,
    rated: game.rated,
    rules: game.rules,
    color: isWhite ? 'white' : 'black',
    myRating: mine.rating,
    opponent: opp.username,
    oppRating: opp.rating,
    outcome,
    how,
    opening: openingName(game),
    accuracy: game.accuracies ? game.accuracies[isWhite ? 'white' : 'black'] : null,
  }
}
