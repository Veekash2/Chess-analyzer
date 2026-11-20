// Remembers the Chess.com usernames you loaded, newest first (saved in this browser).
const KEY = 'smc-recent-users'
const MAX = 6

export function getRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string').slice(0, MAX) : []
  } catch {
    return []
  }
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* storage blocked: just don't remember */ }
  return list
}

/** Moves `name` to the front (case-insensitive de-duplication). */
export function pushRecent(name) {
  const n = name.trim()
  if (!n) return getRecent()
  return save([n, ...getRecent().filter((x) => x.toLowerCase() !== n.toLowerCase())].slice(0, MAX))
}

export function removeRecent(name) {
  return save(getRecent().filter((x) => x.toLowerCase() !== name.toLowerCase()))
}
