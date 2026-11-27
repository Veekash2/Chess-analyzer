// Plays bots on real positions and checks with a deeper Stockfish that none of their moves is a
// blunder (loses more than SAFE_MARGIN + a little search noise vs the best move).
// Run: node scripts/test-bot-blunders.mjs [positions]
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { Chess } from 'chess.js'
import { createUciClient } from '../src/review/uci.js'
import { chooseBotMove, makeBot } from '../src/play/bots.js'

const N = +(process.argv[2] || 20)
function engine(multiPv) {
  const proc = spawn(process.execPath, ['node_modules/stockfish/src/stockfish-17.1-lite-single-03e3232.js'])
  const c = createUciClient((l) => proc.stdin.write(l + '\n'))
  let buf = ''
  proc.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l) c.onLine(l) } })
  return { c, proc, ready: c.init({ multiPv, hash: 32 }) }
}
const bot = engine(5), judge = engine(1)
await bot.ready; await judge.ready
const cp = (l) => (l.mate != null ? (l.mate > 0 ? 10000 - l.mate : -10000 - l.mate) : l.cp)

const fens = JSON.parse(readFileSync('public/puzzles.json', 'utf8')).map((r) => {
  const g = new Chess(r[1]); const u = r[2].split(' ')[0]; g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); return g.fen()
}).filter((_, i) => i % 97 === 0).slice(0, N)

const bots = [
  makeBot({ id: 't250', name: 'Weakest', rating: 250, chat: {} }),
  makeBot({ id: 't1200', name: 'Club', rating: 1200, chat: {} }),
  makeBot({ id: 'tfriend', name: 'Friend', rating: 900, chat: {}, bookByColor: { w: [['e4', 'e5', 'Qh5', 'Nc6', 'Qxf7+']], b: [['e4', 'f6', 'd4', 'g5']] } }),
]
let worst = 0, total = 0, bad = 0
for (const b of bots) {
  for (const fen of fens) {
    const mv = await chooseBotMove(bot.c, fen, b, null, {})
    const best = cp((await judge.c.evaluate(fen, 16)).lines[0])
    const after = new Chess(fen); after.move({ from: mv.from, to: mv.to, promotion: mv.promotion })
    const got = after.isCheckmate() ? 10000 : after.isDraw() ? 0 : -cp((await judge.c.evaluate(after.fen(), 16)).lines[0])
    const loss = best - got
    total++; worst = Math.max(worst, loss)
    if (loss > 150) { bad++; console.log(`BLUNDER? ${b.name} ${mv.san} loses ${loss} in ${fen}`) }
  }
  console.log(b.name, 'done')
}
// the friend's bad book lines: 3.Qh5 then 4...Qxf7+?? isn't sound; 1...f6 2.d4 g5?? allows Qh5#
for (const [hist, color] of [[['e4', 'e5', 'Qh5', 'Nc6'], 'w'], [['e4', 'f6', 'd4'], 'b']]) {
  const g = new Chess(); hist.forEach((m) => g.move(m))
  const mv = await chooseBotMove(bot.c, g.fen(), bots[2], hist, {})
  console.log(`friend book after ${hist.join(' ')}: plays ${mv.san} (book says ${color === 'w' ? 'Qxf7+' : 'g5'})`)
}
bot.proc.kill(); judge.proc.kill()
console.log(`moves checked ${total}, worst loss ${worst}cp, blunders (>150cp) ${bad}`)
