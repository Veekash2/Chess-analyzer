// Helpers for the notation and blindfold trainers.
import { Chess } from 'chess.js'

export const FILES = 'abcdefgh'
export const SQUARES = [...FILES].flatMap((f) => [1, 2, 3, 4, 5, 6, 7, 8].map((r) => f + r))
export const randomSquare = (not) => { let s; do s = SQUARES[Math.floor(Math.random() * 64)]; while (s === not); return s }
export const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
export const pick = (a) => a[Math.floor(Math.random() * a.length)]

export const PIECE_NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }
export const pieceLabel = (p) => (p ? `${p.color === 'w' ? 'White' : 'Black'} ${PIECE_NAME[p.type]}` : 'Empty')

/** Light or dark square. a1 is dark. */
export const isLight = (sq) => (FILES.indexOf(sq[0]) + +sq[1]) % 2 === 1

/** Realistic positions: random puzzle positions (fetched once), or random openings as a fallback. */
let posPromise = null
export function loadPositions() {
  if (!posPromise) {
    posPromise = fetch(`${import.meta.env.BASE_URL}puzzles.json`).then((r) => r.json()).then((rows) => rows.map((r) => r[1])).catch(() => [])
  }
  return posPromise
}

/**
 * Wrong-but-plausible notation for a move: wrong piece letter, missing/extra "x", wrong
 * square, missing check sign, wrong castling side, missing disambiguation.
 */
export function distractors(fen, mv) {
  const out = new Set()
  const san = mv.san
  const sq = mv.to
  const letters = ['N', 'B', 'R', 'Q', 'K']
  const core = san.replace(/[+#]/g, '')
  const tail = san.slice(core.length)
  if (san.startsWith('O-O')) {
    out.add(san.startsWith('O-O-O') ? 'O-O' : 'O-O-O'); out.add('Kg1'); out.add(mv.color === 'w' ? 'Ke1g1' : 'Ke8g8')
  }
  if (mv.piece !== 'p' && !san.startsWith('O')) {
    out.add(san.replace(/^[NBRQK]/, pick(letters.filter((l) => l !== san[0]))))
    out.add(mv.captured ? san.replace('x', '') : san.replace(/^([NBRQK][a-h1-8]?)/, '$1x'))
    out.add(`${san[0]}${pick(FILES)}${sq[1]}${tail}`)
  } else if (mv.piece === 'p') {
    if (mv.captured) { out.add(`${sq}${tail}`); out.add(`P${mv.from[0]}x${sq}${tail}`); out.add(`${mv.from}x${sq}`) } else { out.add(`P${sq}${tail}`); out.add(`${mv.from}-${sq}`); out.add(`${sq[0]}${+sq[1] + (mv.color === 'w' ? 1 : -1)}`) }
    if (mv.promotion) out.add(san.replace(/=[QRBN]/, '=N'))
  }
  if (tail) out.add(core)
  else if (!san.startsWith('O')) out.add(`${core}+`)
  // a real other legal move as a distractor too
  const others = new Chess(fen).moves().filter((m) => m !== san)
  if (others.length) out.add(pick(others))
  out.delete(san)
  return shuffle([...out].filter((x) => x && x.length >= 2)).slice(0, 3)
}

/**
 * Turn what the player typed into a legal move: accepts proper SAN ("Nf3", "exd5", "O-O"),
 * relaxed SAN ("nf3", "Nf3+", "0-0", "e8Q") and coordinates ("e2e4", "e2-e4").
 */
export function parseTyped(fen, text) {
  let t = text.trim().replace(/0/g, 'O').replace(/[!?]/g, '')
  if (/^o-o(-o)?$/i.test(t)) t = t.toUpperCase() // "o-o" -> "O-O"
  if (/^[ACDEFGH][1-8x]/.test(t)) t = t[0].toLowerCase() + t.slice(1) // "E4" -> "e4" (B stays a bishop)
  if (!t) return null
  const g = () => new Chess(fen)
  const tryMove = (m) => { try { return g().move(m) } catch { return null } }
  const coord = t.toLowerCase().replace(/[-x\s]/g, '').match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/)
  if (coord) return tryMove({ from: coord[1], to: coord[2], promotion: coord[3] || 'q' })
  const variants = [t, t.replace(/[+#]/g, ''), t.replace(/([a-h][18])([QRBN])$/i, (_, a, b) => `${a}=${b.toUpperCase()}`)]
  if (/^[nrqk]/.test(t)) variants.push(t[0].toUpperCase() + t.slice(1)) // "nf3" -> "Nf3" ("b..." stays a pawn move)
  if (/^b[a-h]?x?[a-h][1-8]/.test(t) && !/^b[a-h]?x?[a-h][1-8]/.test(t.replace(/^b/, ''))) variants.push('B' + t.slice(1))
  if (/^b[1-8]?x?[a-h][1-8]/i.test(t)) variants.push('B' + t.slice(1))
  for (const v of variants) { const m = tryMove(v); if (m) return m }
  return null
}

export const BEST_KEY = 'smc-notation-best'
export function getBest() { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}') } catch { return {} } }
export function saveBest(id, score) {
  const b = getBest()
  if (!(score > (b[id] || 0))) return false
  b[id] = score
  try { localStorage.setItem(BEST_KEY, JSON.stringify(b)) } catch { /* private mode */ }
  return true
}
