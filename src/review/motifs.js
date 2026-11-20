// Tactical motif detection for move explanations - forks, pins, skewers, discovered
// attacks, double checks, threats, trapped pieces, back-rank mates and material swings.
// Pure functions on FEN + chess.js, no engine needed.
import { Chess } from 'chess.js'

export const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }
export const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }
const other = (c) => (c === 'w' ? 'b' : 'w')
const FILES = 'abcdefgh'
const sq = (f, r) => FILES[f] + (r + 1)
const DIRS = { b: [[1, 1], [1, -1], [-1, 1], [-1, -1]], r: [[1, 0], [-1, 0], [0, 1], [0, -1]] }
DIRS.q = [...DIRS.b, ...DIRS.r]

/** Same position with the other side to move ("what would I threaten if they passed?"). */
function nullMove(fen) {
  const p = fen.split(' ')
  p[1] = p[1] === 'w' ? 'b' : 'w'
  p[3] = '-'
  try { return new Chess(p.join(' ')) } catch { return null }
}

export function material(fen, color) {
  let t = 0
  for (const ch of fen.split(' ')[0]) {
    const low = ch.toLowerCase()
    if (!'pnbrq'.includes(low)) continue
    t += ((ch !== low) === (color === 'w') ? 1 : -1) * VAL[low]
  }
  return t
}

/** Pieces of `victim` colour attacked by the piece on `from` (works whichever side is to move). */
function targetsFrom(fen, from, attackerColor) {
  const c = new Chess(fen)
  const view = c.turn() === attackerColor ? c : nullMove(fen)
  if (!view) return []
  const out = []
  for (const mv of view.moves({ square: from, verbose: true })) if (mv.captured) out.push({ square: mv.to, type: mv.captured })
  // a king in check is "attacked" too, though no move captures it
  const k = kingSquare(c, other(attackerColor))
  if (k && c.attackers(k, attackerColor).includes(from)) out.push({ square: k, type: 'k' })
  return out
}

function kingSquare(c, color) {
  for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square
  return null
}

const defended = (c, square, color) => c.attackers(square, color).length > 0

/** Lines (pins and skewers) from `color`'s sliding pieces. */
function rays(fen, color) {
  const c = new Chess(fen)
  const out = []
  for (const row of c.board()) {
    for (const p of row) {
      if (!p || p.color !== color || !'brq'.includes(p.type)) continue
      const f0 = FILES.indexOf(p.square[0]), r0 = +p.square[1] - 1
      for (const [df, dr] of DIRS[p.type]) {
        const hits = []
        let f = f0 + df, r = r0 + dr
        while (f >= 0 && f < 8 && r >= 0 && r < 8 && hits.length < 2) {
          const q = c.get(sq(f, r))
          if (q) hits.push({ ...q, square: sq(f, r) })
          f += df; r += dr
        }
        if (hits.length === 2 && hits[0].color !== color && hits[1].color !== color) {
          const [front, back] = hits
          if (back.type === 'k' || VAL[back.type] > VAL[front.type]) out.push({ kind: 'pin', by: p, front, back })
          else if (front.type === 'k' || (VAL[front.type] > VAL[back.type] && VAL[back.type] >= 3)) out.push({ kind: 'skewer', by: p, front, back })
        }
      }
    }
  }
  return out
}
const rayKey = (x) => `${x.kind}:${x.by.square}:${x.front.square}:${x.back.square}`

/**
 * Motifs created by one move. `fenBefore` + a move ({from,to,promotion} or SAN).
 * Returns [{ kind, text, value }] described from the mover's point of view.
 */
export function moveMotifs(fenBefore, move) {
  const c = new Chess(fenBefore)
  let mv
  try { mv = typeof move === 'string' ? c.move(move) : c.move(move) } catch { return [] }
  const me = mv.color, them = other(me)
  const after = c.fen()
  const piece = mv.promotion || mv.piece
  const out = []
  const add = (kind, text, value = 0) => out.push({ kind, text, value })

  if (c.isCheckmate()) {
    const k = kingSquare(c, them)
    const backRank = (them === 'w' && k[1] === '1') || (them === 'b' && k[1] === '8')
    add('mate', backRank && 'rq'.includes(piece) ? 'back-rank checkmate' : 'checkmate', 1000)
    return out
  }
  if (mv.captured) add('capture', `takes the ${NAME[mv.captured]}`, VAL[mv.captured])
  if (mv.promotion) add('promote', `promotes to a ${NAME[mv.promotion]}`, VAL[mv.promotion] - 1)

  // checks: double / discovered
  if (c.isCheck()) {
    const k = kingSquare(c, them)
    const checkers = c.attackers(k, me)
    if (checkers.length >= 2) add('doublecheck', 'double check - the king must move', 6)
    else if (!checkers.includes(mv.to)) add('discovered', `discovered check from the ${NAME[c.get(checkers[0]).type]}`, 5)
  }

  // fork: the moved piece attacks two or more valuable or undefended targets
  const targets = targetsFrom(after, mv.to, me).filter((t) => t.type !== 'p')
    .filter((t) => t.type === 'k' || VAL[t.type] > VAL[piece] || !defended(c, t.square, them))
  // ...and it isn't simply lost itself (attacked by something cheaper, or attacked and undefended)
  const hitters = c.attackers(mv.to, them).filter((s) => !(c.get(s).type === 'k' && defended(c, mv.to, me)))
  const forkerSafe = !hitters.length || (defended(c, mv.to, me) && Math.min(...hitters.map((s) => VAL[c.get(s).type])) >= VAL[piece])
  if (targets.length >= 2 && forkerSafe) {
    const names = targets.sort((a, b) => VAL[b.type] - VAL[a.type]).slice(0, 3).map((t) => `${NAME[t.type]} on ${t.square}`)
    add('fork', `${NAME[piece]} fork of the ${names.join(' and the ')}`, 6)
  }

  // new pins / skewers
  const before = new Set(rays(fenBefore, me).map(rayKey))
  for (const r of rays(after, me)) {
    if (before.has(rayKey(r))) continue
    if (r.front.type === 'p') continue // pinning or skewering a pawn is rarely worth mentioning
    if (r.kind === 'pin') add('pin', `pins the ${NAME[r.front.type]} on ${r.front.square} to the ${NAME[r.back.type]}`, r.back.type === 'k' ? 5 : 4)
    else add('skewer', `skewers the ${NAME[r.front.type]} and the ${NAME[r.back.type]} on ${r.back.square}`, 5)
  }

  // discovered attack: another piece's line opens onto a big target
  if (!out.some((o) => o.kind === 'discovered')) {
    const prev = new Chess(fenBefore)
    for (const row of c.board()) for (const p of row) {
      if (!p || p.color !== me || p.square === mv.to || !'brq'.includes(p.type)) continue
      const now = targetsFrom(after, p.square, me).filter((t) => 'qr'.includes(t.type))
      const was = new Set(prev.get(p.square) ? targetsFrom(fenBefore, p.square, me).map((t) => t.square) : [])
      const fresh = now.find((t) => !was.has(t.square))
      if (fresh) { add('discovered', `discovered attack on the ${NAME[fresh.type]} by the ${NAME[p.type]}`, 4); break }
    }
  }

  // threats if the opponent did nothing
  const t = threats(after, me)
  if (t.mate) add('threat', `threatens ${t.mate}`, 8)
  else if (t.win && !out.some((o) => o.kind === 'fork')) add('threat', `threatens to win the ${NAME[t.win.type]} on ${t.win.square}`, VAL[t.win.type] / 2)

  // trapped piece: an enemy piece attacked with nowhere safe to go
  const trapped = trappedPiece(after, them)
  if (trapped) add('trap', `traps the ${NAME[trapped.type]} on ${trapped.square}`, VAL[trapped.type])

  return out.sort((a, b) => b.value - a.value)
}

/** What `color` threatens in this position (mate in one, or winning material). */
export function threats(fen, color) {
  const c = nullMove(fen)
  if (!c || c.turn() !== color) return {}
  // can't "pass" out of check
  if (new Chess(fen).isCheck()) return {}
  let win = null
  for (const mv of c.moves({ verbose: true })) {
    const t = new Chess(c.fen())
    t.move(mv.san)
    if (t.isCheckmate()) return { mate: mv.san }
    if (mv.captured && VAL[mv.captured] >= 3) {
      const safe = !t.attackers(mv.to, other(color)).length
      if (safe || VAL[mv.captured] > VAL[mv.piece]) if (!win || VAL[mv.captured] > VAL[win.type]) win = { type: mv.captured, square: mv.to, san: mv.san }
    }
  }
  return { win }
}

function trappedPiece(fen, color) {
  const c = new Chess(fen)
  for (const row of c.board()) for (const p of row) {
    if (!p || p.color !== color || !'nbrq'.includes(p.type)) continue
    const att = c.attackers(p.square, other(color))
    if (!att.length) continue
    const cheapest = Math.min(...att.map((s) => VAL[c.get(s).type]))
    if (cheapest >= VAL[p.type] && defended(c, p.square, color)) continue
    const view = c.turn() === color ? c : nullMove(fen)
    if (!view) continue
    const escapes = view.moves({ square: p.square, verbose: true }).filter((m) => {
      const t = new Chess(view.fen()); t.move(m.san)
      const a2 = t.attackers(m.to, other(color))
      return !a2.length || (m.captured && VAL[m.captured] >= VAL[p.type])
    })
    if (!escapes.length && VAL[p.type] >= 3) return p
  }
  return null
}

/** Material change for `color` along a SAN line from `fen`. Measured only after the
 *  opponent has replied (so exchanges have settled), using the last such point. */
export function lineSwing(fen, sanLine, color, maxPlies = 6) {
  const start = material(fen, color)
  const c = new Chess(fen)
  let settled = null
  for (let i = 0; i < Math.min(sanLine.length, maxPlies); i++) {
    try { c.move(sanLine[i]) } catch { break }
    if (c.turn() === color) settled = material(c.fen(), color) - start
  }
  return settled ?? material(c.fen(), color) - start
}

export function describeMaterial(n) {
  const a = Math.abs(n)
  if (a >= 9) return 'the queen'
  if (a >= 5) return 'a rook'
  if (a >= 3) return 'a piece'
  if (a >= 2) return "two pawns' worth of material"
  if (a >= 1) return 'a pawn'
  return null
}
