// Checks opening courses: every move legal and written as chess.js writes it, every move you
// play has a note, and Stockfish doesn't think any of your moves is a real error.
// Run: node scripts/check-courses.mjs [courseId...]
import { spawn } from 'node:child_process'
import { Chess } from 'chess.js'
import { VIENNA_FULL, SCANDI_FULL } from '../src/openings/deepCourses.js'

const courses = [VIENNA_FULL, SCANDI_FULL].filter((c) => process.argv.length <= 2 || process.argv.includes(c.id))
const eng = spawn(process.execPath, ['node_modules/stockfish/src/stockfish-17.1-lite-single-03e3232.js'])
let buf = '', waiter = null
eng.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); waiter?.(l) } })
const send = (s) => eng.stdin.write(s + '\n')
const evaluate = (fen, depth = 14) => new Promise((res) => {
  let last = 0
  waiter = (l) => {
    if (l.startsWith('info') && l.includes(' score ') && !/bound/.test(l)) {
      const m = l.match(/score mate (-?\d+)/), c = l.match(/score cp (-?\d+)/)
      last = m ? (+m[1] > 0 ? 10000 : -10000) : +c[1]
    } else if (l.startsWith('bestmove')) { waiter = null; res({ cp: last, best: l.split(' ')[1] }) }
  }
  send(`position fen ${fen}`); send(`go depth ${depth}`)
})
send('uci'); send('setoption name Hash value 64')
const COMMON = ['e4', 'd4', 'Nf3', 'Nc3', 'O-O']
const seen = new Map()
let problems = 0
for (const c of courses) {
  for (const l of c.lines) {
    const g = new Chess()
    for (let i = 0; i < l.moves.length; i++) {
      const m = l.moves[i]
      const mine = (i % 2 === 0) === (c.side === 'w')
      const fen = g.fen()
      let mv
      try { mv = g.move(m) } catch { console.log('ILLEGAL', c.id, l.name, i, m); problems++; break }
      if (mv.san !== m) { console.log('SAN', c.id, l.name, m, '->', mv.san); problems++ }
      if (!mine) continue
      if (!c.notes[m] && !COMMON.includes(m)) { console.log('NO NOTE', c.id, m); problems++ }
      const key = fen + m
      if (seen.has(key)) continue
      const before = await evaluate(fen)
      const after = -(await evaluate(g.fen())).cp
      const loss = before.cp - after
      seen.set(key, loss)
      if (loss > 80) { console.log(`WEAK ${c.id} | ${l.name} | move ${Math.floor(i / 2) + 1} ${m}: loses ${loss}cp (engine prefers ${before.best}, eval before ${before.cp})`); problems++ }
    }
  }
}
eng.kill()
console.log('problems', problems)
