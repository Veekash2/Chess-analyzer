// Builds src/puzzles/drills.json: hand-written classic drills plus drills taken from the
// Lichess puzzle sample, each checked with Stockfish so the goal is actually achievable.
// Run: node scripts/build-drills.mjs
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { Chess } from 'chess.js'

const SF = 'node_modules/stockfish/src/stockfish-17.1-lite-single-03e3232.js'
const eng = spawn(process.execPath, [SF])
let buf = '', waiter = null
eng.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); waiter?.(l) } })
const send = (s) => eng.stdin.write(s + '\n')
/** score for the side to move: { cp } or { mate } */
function evaluate(fen, depth = 16) {
  return new Promise((res) => {
    let last = null
    waiter = (l) => {
      if (l.startsWith('info') && l.includes(' score ') && !/bound/.test(l)) {
        const m = l.match(/score mate (-?\d+)/), c = l.match(/score cp (-?\d+)/)
        last = m ? { mate: +m[1] } : { cp: +c[1] }
      } else if (l.startsWith('bestmove')) { waiter = null; res(last || { cp: 0 }) }
    }
    send(`position fen ${fen}`); send(`go depth ${depth}`)
  })
}
const cpOf = (s) => (s.mate != null ? (s.mate > 0 ? 10000 : -10000) : s.cp)

// goal: mate | promote | win (reach +target or mate) | hold (don't lose for `moves` moves)
const D = (cat, name, fen, goal, desc, extra = {}) => ({ cat, name, fen, goal, desc, ...extra })
const HAND = [
  // Endgame fundamentals
  D('fund', 'Queen checkmate', '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', 'mate', 'Push the king to the edge with your queen a knight\'s move away, bring your king up, then mate. Don\'t stalemate!', { moves: 12 }),
  D('fund', 'Rook checkmate', '8/8/8/4k3/8/8/8/4K2R w - - 0 1', 'mate', 'Use the rook to cut the king off, shrink the box, and use your king to take away squares.', { moves: 20 }),
  D('fund', 'Two rooks: the ladder', '8/8/8/4k3/8/8/8/R3K2R w - - 0 1', 'mate', 'The rooks take turns checking and cutting off a rank - walk the king to the edge like a ladder.', { moves: 10 }),
  D('fund', 'Two bishops checkmate', '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1', 'mate', 'Bishops side by side make a wall. Drive the king to a corner with king support.', { moves: 30, known: true }),
  D('fund', 'King in front of the pawn', '4k3/8/3K4/3P4/8/8/8/8 w - - 0 1', 'promote', 'King on the 6th in front of its pawn always wins (except a rook pawn). Keep the opposition.'),
  D('fund', 'Rule of the square', '8/8/8/8/k7/8/5P2/6K1 w - - 0 1', 'promote', 'Can the king catch the pawn? Count the square - then just run.'),
  D('fund', 'Pawn breakthrough', '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1', 'promote', 'Three pawns against three: one of yours can break through with a sacrifice. Find b6!', { known: true }),
  D('fund', 'Queen vs pawn on the 7th', '8/8/8/8/8/2K5/6pk/1Q6 w - - 0 1', 'mate', 'Check, then pin or force the king in front of its own pawn, and bring your king closer each time.', { moves: 25 }),
  D('fund', 'The Lucena position', '3K4/3P2k1/8/8/8/8/2r5/4R3 w - - 0 1', 'promote', 'Build a bridge: Rook to the 4th rank, then walk your king out and block the checks with the rook.'),
  // Endgame practice
  D('endp', 'Philidor defence', '4k3/8/8/3PK3/8/8/7R/r7 b - - 0 1', 'hold', 'Rook to your 3rd rank (...Ra6) to stop the king, and when the pawn advances, check from behind.', { moves: 25 }),
  D('endp', 'The wrong bishop', '7k/8/6K1/7P/8/8/8/5B2 b - - 0 1', 'hold', 'The bishop can\'t control h8 - stay in the corner and it\'s a draw. Watch out for stalemate tricks on your side? No - just don\'t leave!', { moves: 20 }),
  D('endp', 'Take the opposition', '8/4k3/8/3K4/4P3/8/8/8 b - - 0 1', 'hold', 'Face the king with one square between you. Keep the opposition and the pawn can\'t queen.', { moves: 20 }),
  D('endp', 'Rook vs bishop', '8/8/4kb2/8/8/4K3/8/7R b - - 0 1', 'hold', 'Usually a draw. Keep your king near the centre or in the corner of the OPPOSITE colour to your bishop.', { moves: 25 }),
  D('endp', 'Rook vs knight', '8/8/4kn2/8/8/4K3/8/7R b - - 0 1', 'hold', 'Keep the knight close to your king - a lone knight far away gets trapped.', { moves: 25 }),
  // Attacking
  D('att', 'Greek gift sacrifice', 'r1bq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 0 1', 'win', 'Bxh7+! then Ng5+ and Qh5 - the classic sacrifice against a castled king.', { moves: 12, target: 300 }),
  D('att', 'Smothered mate', '5r1k/6pp/8/6N1/2Q5/8/8/6K1 w - - 0 1', 'mate', 'Knight check, double check, queen sacrifice on g8, then the knight mates. Philidor\'s legacy.', { moves: 6 }),
  // Imbalances
  D('imb', 'Queen vs rook', '8/8/3k4/8/8/3r4/8/Q3K3 w - - 0 1', 'win', 'Push the king back, then win the rook with a fork or a skewer.', { moves: 30, target: 800 }),
  D('imb', 'Rook vs minor + pawns', '6k1/5pp1/7p/8/8/2b5/5PPP/3R2K1 w - - 0 1', 'win', 'You\'re the exchange up. Activate the rook, use the back rank and go after the pawns.', { moves: 25, target: 200 }),
  D('imb', 'Two pieces vs rook', '6k1/5ppp/8/8/8/2N2B2/5PPP/2r3K1 w - - 0 1', 'hold', 'Two minor pieces vs a rook: coordinate them and don\'t let the rook pick off a loose piece.', { moves: 20 }),
  D('imb', 'Queen vs two rooks', '3rr1k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1', 'hold', 'Two rooks are strong when they work together - keep checking and look for forks.', { moves: 20 }),
  D('imb', 'Extra exchange', '8/5pk1/6p1/8/8/1b4P1/5PK1/3R4 w - - 0 1', 'win', 'Rook against bishop with pawns: use your king, attack pawns the bishop can\'t protect.', { moves: 25, target: 200 }),
  D('imb', 'Piece vs three pawns', '8/5k2/8/1n6/8/1PPP4/5K2/8 b - - 0 1', 'hold', 'The knight must blockade the pawns while your king comes over. Don\'t let them roll.', { moves: 20 }),
  D('imb', 'Two rooks vs queen', '6k1/5pp1/7p/8/8/8/1q3PPP/3RR1K1 w - - 0 1', 'hold', 'Double your rooks, protect each other and your back rank - the queen can\'t do it alone.', { moves: 20 }),
  D('def', 'Survive the Fried Liver', 'r1bq1b1r/ppp3pp/2n1k3/3np3/2B5/2N2Q2/PPPP1PPP/R1B1K2R b KQ - 4 8', 'hold', 'Your king is on e6! Defend d5 with ...Ncb4 or ...Ne7 and bring your king to safety.', { moves: 10, band: true }),
]

const puzzles = JSON.parse(readFileSync('public/puzzles.json', 'utf8')).map(([id, fen, moves, rating, themes]) => ({ id, fen, moves: moves.split(' '), rating, themes: themes.split(' ') }))
const after = (p) => { const g = new Chess(p.fen); const u = p.moves[0]; g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); return g.fen() }
const pickN = (list, n) => list.sort((a, b) => a.rating - b.rating).filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / n)) === 0).slice(0, n)

const FROM_PUZZLES = [
  ...pickN(puzzles.filter((p) => p.themes.some((t) => /mateIn[345]/.test(t)) && p.rating < 2200), 14)
    .map((p) => D('att', `Mate in ${p.themes.find((t) => /mateIn/.test(t)).replace('mateIn', '')}`, after(p), 'mate', 'There\'s a forced mate - checks, captures and threats first. The engine defends with its best moves.', { moves: 8, rating: p.rating, src: p.id })),
  ...pickN(puzzles.filter((p) => p.themes.includes('kingsideAttack') && p.themes.includes('crushing') && !p.themes.some((t) => /mateIn/.test(t))), 8)
    .map((p, i) => D('att', `King attack ${i + 1}`, after(p), 'win', 'Break open the king. Reach a winning position (+5) before the engine regroups.', { moves: 10, target: 500, rating: p.rating, src: p.id })),
  ...pickN(puzzles.filter((p) => p.themes.includes('defensiveMove')), 60)
    .map((p) => D('def', 'Defend', after(p), 'hold', 'There\'s a threat against you. Find the only defence - one careless move and it\'s lost.', { moves: 8, rating: p.rating, src: p.id, band: true })),
  ...pickN(puzzles.filter((p) => p.themes.includes('endgame') && (p.themes.includes('promotion') || p.themes.includes('advancedPawn')) && p.themes.includes('crushing')), 10)
    .map((p, i) => D('endp', `Push the pawn ${i + 1}`, after(p), 'promote', 'Get a pawn to the last rank - and keep it.', { rating: p.rating, src: p.id })),
  ...pickN(puzzles.filter((p) => p.themes.includes('endgame') && p.themes.includes('crushing') && !p.themes.includes('promotion')), 10)
    .map((p, i) => D('endp', `Convert ${i + 1}`, after(p), 'win', 'You\'re winning - make it count. Reach +5 without letting the engine back in.', { moves: 15, target: 500, rating: p.rating, src: p.id })),
]

send('uci'); send('setoption name Hash value 64')
const out = []
for (const d of [...HAND, ...FROM_PUZZLES]) {
  const g = new Chess(d.fen)
  if (g.isGameOver()) { console.log('SKIP game over', d.name); continue }
  const s = await evaluate(d.fen, d.goal === 'hold' ? 18 : 16)
  const cp = cpOf(s)
  let ok = d.goal === 'hold' ? cp >= -120 : d.goal === 'win' ? cp >= Math.min(d.target || 500, 200) : cp >= 300
  if (d.band && cp > (d.src ? 400 : 150)) ok = false // a defending drill shouldn't start out comfortably winning
  if (d.known) ok = true // textbook wins the engine underrates at this depth
  if (ok && d.src && d.cat === 'def' && out.filter((x) => x.cat === 'def' && x.src).length >= 12) ok = false
  console.log(ok ? 'OK  ' : 'DROP', d.cat, d.name, JSON.stringify(s))
  if (ok) out.push({ ...d, id: `${d.cat}-${out.length}`, startEval: cp })
}
eng.kill()
const count = {}
for (const d of out) { if (!d.src) continue; const k = d.cat + d.name; count[k] = (count[k] || 0) + 1; d.name = `${d.name} #${count[k]}` }
writeFileSync('src/puzzles/drills.json', JSON.stringify(out))
console.log('kept', out.length, 'by category', out.reduce((a, d) => ({ ...a, [d.cat]: (a[d.cat] || 0) + 1 }), {}))
