import { analyzeGame } from './analyzeGame'

// Receives [{ url, pgn, color, timeControl }] and posts back one record per game.
self.onmessage = (e) => {
  const games = e.data
  const records = {}
  for (let i = 0; i < games.length; i++) {
    const g = games[i]
    try {
      records[g.url] = analyzeGame(g)
    } catch {
      records[g.url] = null
    }
    if (i % 100 === 0 || i === games.length - 1) self.postMessage({ type: 'progress', done: i + 1, total: games.length })
  }
  self.postMessage({ type: 'done', records })
}
