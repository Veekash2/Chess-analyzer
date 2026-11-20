// Your puzzle list, saved in this browser (localStorage). Each puzzle is a position from
// one of your own games where you went wrong; the solution is the engine's best line.
import { useCallback, useEffect, useState } from 'react'

const KEY = 'smc-puzzles-v1'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    const data = raw ? JSON.parse(raw) : null
    return data && Array.isArray(data.puzzles) ? data : { puzzles: [], games: {}, streak: 0, bestStreak: 0 }
  } catch {
    return { puzzles: [], games: {}, streak: 0, bestStreak: 0 }
  }
}

function write(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* storage full or blocked: keep in memory */ }
}

export function usePuzzleStore() {
  const [data, setData] = useState(read)
  useEffect(() => { write(data) }, [data])
  // keep several open tabs in sync
  useEffect(() => {
    const on = (e) => { if (e.key === KEY) setData(read()) }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [])

  const add = useCallback((puzzles, game) => {
    setData((d) => {
      const have = new Set(d.puzzles.map((p) => p.id))
      const fresh = puzzles.filter((p) => !have.has(p.id))
      if (!fresh.length) return d
      return { ...d, puzzles: [...d.puzzles, ...fresh], games: game ? { ...d.games, [game.key]: game } : d.games }
    })
  }, [])

  const remove = useCallback((id) => {
    setData((d) => {
      const puzzles = d.puzzles.filter((p) => p.id !== id)
      const used = new Set(puzzles.map((p) => p.gameKey))
      const games = Object.fromEntries(Object.entries(d.games).filter(([k]) => used.has(k)))
      return { ...d, puzzles, games }
    })
  }, [])

  /** Records an attempt. firstTry = solved without any wrong move, hint or solution. */
  const record = useCallback((id, { solved, firstTry }) => {
    setData((d) => {
      const streak = firstTry ? d.streak + 1 : 0
      return {
        ...d,
        streak,
        bestStreak: Math.max(d.bestStreak, streak),
        puzzles: d.puzzles.map((p) => (p.id !== id ? p : {
          ...p,
          attempts: (p.attempts || 0) + 1,
          solvedCount: (p.solvedCount || 0) + (firstTry ? 1 : 0),
          status: firstTry ? 'solved' : solved ? 'retried' : 'failed',
          lastTried: Date.now(),
        })),
      }
    })
  }, [])

  const clear = useCallback(() => setData({ puzzles: [], games: {}, streak: 0, bestStreak: 0 }), [])

  return { ...data, add, remove, record, clear }
}
