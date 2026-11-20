// Describes a chess position in plain words - who has more material, how safe each king is,
// what is being threatened, passed pawns, piece activity - so puzzle explanations can say
// WHY a position is good or bad instead of quoting engine numbers.
import { Chess } from 'chess.js'
import { NAME, VAL, threats, describeMaterial } from '../review/motifs'

const other = (c) => (c === 'w' ? 'b' : 'w')
const FILES = 'abcdefgh'

function nullMove(fen) {
  const p = fen.split(' ')
  p[1] = p[1] === 'w' ? 'b' : 'w'
  p[3] = '-'
  try { return new Chess(p.join(' ')) } catch { return null }
}

function pieces(c, color) {
  const out = []
  for (const row of c.board()) for (const p of row) if (p && p.color === color) out.push(p)
  return out
}

function mobility(fen, color) {
  const c = new Chess(fen)
  const v = c.turn() === color ? c : nullMove(fen)
  return v ? v.moves().length : 0
}

function kingInfo(c, color) {
  const king = pieces(c, color).find((p) => p.type === 'k')
  if (!king) return null
  const f = FILES.indexOf(king.square[0]), r = +king.square[1] - 1
  const dir = color === 'w' ? 1 : -1
  // pawn shield: own pawns on the three files in front of the king, one or two ranks up
  let shield = 0
  for (const df of [-1, 0, 1]) {
    for (const dr of [1, 2]) {
      const ff = f + df, rr = r + dir * dr
      if (ff < 0 || ff > 7 || rr < 0 || rr > 7) continue
      const p = c.get(FILES[ff] + (rr + 1))
      if (p && p.type === 'p' && p.color === color) { shield++; break }
    }
  }
  // enemy pieces bearing on the squares around the king
  const attackers = new Set()
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    const ff = f + df, rr = r + dr
    if (ff < 0 || ff > 7 || rr < 0 || rr > 7) continue
    for (const a of c.attackers(FILES[ff] + (rr + 1), other(color))) if (c.get(a).type !== 'p') attackers.add(a)
  }
  const castled = (color === 'w' ? r === 0 : r === 7) && (f >= 6 || f <= 2)
  const centre = f >= 3 && f <= 4
  return { square: king.square, shield, attackers: attackers.size, castled, centre }
}

function passedPawns(c, color) {
  const mine = pieces(c, color).filter((p) => p.type === 'p')
  const theirs = pieces(c, other(color)).filter((p) => p.type === 'p')
  const dir = color === 'w' ? 1 : -1
  return mine.filter((p) => {
    const f = FILES.indexOf(p.square[0]), r = +p.square[1]
    return !theirs.some((q) => Math.abs(FILES.indexOf(q.square[0]) - f) <= 1 && (+q.square[1] - r) * dir > 0)
  }).map((p) => ({ ...p, advanced: color === 'w' ? +p.square[1] >= 5 : +p.square[1] <= 4 }))
}

function loosePieces(c, color) {
  return pieces(c, color).filter((p) => p.type !== 'k' && p.type !== 'p'
    && c.attackers(p.square, other(color)).length && !c.attackers(p.square, color).length)
}

/** Numbers about a position from `color`'s side. */
export function features(fen, color) {
  const c = new Chess(fen)
  const mat = (col) => pieces(c, col).reduce((s, p) => s + (p.type === 'k' ? 0 : VAL[p.type]), 0)
  const count = (col, t) => pieces(c, col).filter((p) => p.type === t).length
  const undeveloped = (col) => pieces(c, col).filter((p) => 'nb'.includes(p.type) && p.square[1] === (col === 'w' ? '1' : '8')).length
  return {
    material: mat(color) - mat(other(color)),
    counts: { mine: Object.fromEntries('qrbnp'.split('').map((t) => [t, count(color, t)])), theirs: Object.fromEntries('qrbnp'.split('').map((t) => [t, count(other(color), t)])) },
    myKing: kingInfo(c, color), theirKing: kingInfo(c, other(color)),
    threatsOnMe: threats(fen, other(color)), myThreats: threats(fen, color),
    myLoose: loosePieces(c, color), theirLoose: loosePieces(c, other(color)),
    myPassed: passedPawns(c, color), theirPassed: passedPawns(c, other(color)),
    myMobility: mobility(fen, color), theirMobility: mobility(fen, other(color)),
    myUndeveloped: undeveloped(color), theirUndeveloped: undeveloped(other(color)),
    inCheck: c.isCheck() && c.turn() === color,
  }
}

function materialSentence(f) {
  const d = f.material
  const { mine, theirs } = f.counts
  // a piece-for-piece imbalance worth naming, e.g. "your rook against their bishop and pawn"
  const diffTypes = 'qrbn'.split('').filter((t) => mine[t] !== theirs[t])
  if (d === 0 && !diffTypes.length) return 'Material is level'
  if (d === 0) return 'Material is level, but the pieces are different'
  return `You are ${describeMaterial(d)} ${d > 0 ? 'up' : 'down'}`
}

/** 2-4 short sentences explaining why a position is good or bad for `color`. */
export function describePosition(fen, color) {
  const f = features(fen, color)
  const out = []
  out.push(materialSentence(f))
  const k = f.myKing, tk = f.theirKing
  if (k && (k.attackers >= 2 && k.shield <= 1)) out.push('your king is exposed - its pawn cover is gone and enemy pieces are aiming at it')
  else if (k && k.centre && !k.castled && f.myUndeveloped === 0 && k.attackers >= 1) out.push('your king is still in the middle of the board, where it can be attacked')
  else if (k && k.attackers >= 3) out.push('several enemy pieces are pointing at your king')
  if (tk && tk.attackers >= 2 && tk.shield <= 1) out.push("your opponent's king is the one in danger")
  if (f.threatsOnMe.mate) out.push('your opponent is threatening checkmate')
  else if (f.threatsOnMe.win) out.push(`your opponent is threatening to win your ${NAME[f.threatsOnMe.win.type]}`)
  if (f.myLoose.length) out.push(`your ${NAME[f.myLoose[0].type]} is attacked and has no defender`)
  if (f.theirLoose.length) out.push(`their ${NAME[f.theirLoose[0].type]} is loose - attacked and undefended`)
  const tp = f.theirPassed.find((p) => p.advanced), mp = f.myPassed.find((p) => p.advanced)
  if (tp) out.push('your opponent has an advanced passed pawn heading for promotion')
  if (mp) out.push('you have an advanced passed pawn that could promote')
  if (f.myMobility && f.theirMobility) {
    const ratio = f.myMobility / f.theirMobility
    if (ratio < 0.65) out.push('your pieces are cramped, with far fewer useful moves than your opponent\'s')
    else if (ratio > 1.5) out.push('your pieces are more active than your opponent\'s')
  }
  if (f.myUndeveloped >= 2 && f.theirUndeveloped === 0) out.push('you still have pieces at home that have not joined the game')
  return { sentences: out, features: f }
}

/** What changed for `color` between two positions, in words (most important first). */
export function describeChange(before, after) {
  const out = []
  const mat = after.material - before.material
  if (mat <= -1) out.push(`you lose ${describeMaterial(mat)}`)
  if (after.threatsOnMe.mate && !before.threatsOnMe.mate) out.push('your opponent now threatens checkmate')
  else if (after.threatsOnMe.win && !(before.threatsOnMe.win && before.threatsOnMe.win.type === after.threatsOnMe.win.type)) out.push(`your opponent now threatens to win your ${NAME[after.threatsOnMe.win.type]}`)
  const bk = before.myKing, ak = after.myKing
  if (bk && ak && (ak.attackers - bk.attackers >= 2 || (ak.shield < bk.shield && ak.attackers >= 2))) out.push('your king becomes much more exposed')
  const newLoose = after.myLoose.find((p) => !before.myLoose.some((q) => q.square === p.square))
  if (newLoose) out.push(`your ${NAME[newLoose.type]} is left hanging`)
  if (after.theirPassed.some((p) => p.advanced) && !before.theirPassed.some((p) => p.advanced)) out.push('your opponent gets a dangerous passed pawn')
  if (before.myMobility && after.myMobility / before.myMobility < 0.7) out.push('your pieces lose activity')
  if (before.theirLoose.length && !after.theirLoose.length) out.push(`their loose ${NAME[before.theirLoose[0].type]} gets back to safety`)
  return out
}

/** Joins clauses into one readable sentence. */
export function sentence(parts) {
  const p = parts.filter(Boolean)
  if (!p.length) return ''
  const text = p.length === 1 ? p[0] : `${p.slice(0, -1).join(', ')} and ${p.at(-1)}`
  return text[0].toUpperCase() + text.slice(1) + '.'
}
