// Builds src/lessons/lessons.json from scripts/lessonSource.mjs:
// - checks every example position is legal,
// - checks every accepted answer with Stockfish (drops answers that throw away the win/draw),
// - fills "puzzles" steps with real puzzles of that theme from public/puzzles.json.
// Run: node scripts/build-lessons.mjs
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Chess } from 'chess.js'
import { COURSES } from './lessonSource.mjs'

const eng = spawn(process.execPath, ['node_modules/stockfish/src/stockfish-17.1-lite-single-03e3232.js'])
let buf = '', waiter = null
eng.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); waiter?.(l) } })
const send = (s) => eng.stdin.write(s + '\n')
function evaluate(fen, depth = 18) {
  return new Promise((res) => {
    let last = null
    waiter = (l) => {
      if (l.startsWith('info') && l.includes(' score ') && !/bound/.test(l)) {
        const m = l.match(/score mate (-?\d+)/), c = l.match(/score cp (-?\d+)/)
        last = m ? (+m[1] > 0 ? 10000 - +m[1] : -10000 - +m[1]) : +c[1]
      } else if (l.startsWith('bestmove')) { waiter = null; res({ cp: last ?? 0, best: l.split(' ')[1] }) }
    }
    send(`position fen ${fen}`); send(`go depth ${depth}`)
  })
}
send('uci'); send('setoption name Hash value 64')

const puzzles = JSON.parse(readFileSync('public/puzzles.json', 'utf8')).map(([id, fen, moves, rating, themes]) => ({ id, fen, moves: moves.split(' '), rating, themes: themes.split(' ') }))
const used = new Set()
let problems = 0

for (const course of COURSES) {
  for (const lesson of course.lessons) {
    const out = []
    for (const s of lesson.steps) {
      if (s.t === 'text') {
        if (s.fen) { try { new Chess(s.fen) } catch (e) { console.log('BAD FEN', lesson.id, s.title, e.message); problems++; continue } }
        out.push(s)
      } else if (s.t === 'move') {
        const g0 = new Chess(s.fen)
        const base = await evaluate(s.fen)
        const keep = []
        for (const u of s.accept) {
          const g = new Chess(s.fen)
          let mv
          try { mv = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }) } catch { console.log('ILLEGAL', lesson.id, u); problems++; continue }
          const after = g.isCheckmate() ? 10000 : g.isDraw() ? 0 : -(await evaluate(g.fen())).cp
          const ok = g.isCheckmate() || (base.cp >= 300 ? after >= 300 : Math.abs(base.cp) < 100 ? after >= -100 : after >= base.cp - 60)
          console.log(ok ? '  ok ' : '  DROP', lesson.id, mv.san, 'base', base.cp, 'after', after, 'engine best', base.best)
          if (ok) keep.push(u)
        }
        if (!keep.length) { console.log('NO VALID ANSWER', lesson.id, s.prompt); problems++; continue }
        out.push({ ...s, accept: keep, side: g0.turn() })
      } else if (s.t === 'puzzles') {
        const pool = puzzles.filter((p) => p.themes.includes(s.theme) && p.rating <= s.maxRating && p.rating >= (s.minRating || 0) && !used.has(p.id)).sort((a, b) => a.rating - b.rating)
        const step = Math.max(1, Math.floor(pool.length / s.n))
        const chosen = pool.filter((_, i) => i % step === 0).slice(0, s.n)
        if (chosen.length < s.n) console.log('few puzzles', lesson.id, s.theme, chosen.length)
        for (const p of chosen) { used.add(p.id); out.push({ t: 'puzzle', fen: p.fen, moves: p.moves, rating: p.rating, theme: s.theme, src: p.id }) }
      }
    }
    lesson.steps = out
  }
}
eng.kill()
mkdirSync('src/lessons', { recursive: true })
writeFileSync('src/lessons/lessons.json', JSON.stringify(COURSES))
const counts = COURSES.map((c) => `${c.title}: ${c.lessons.length} lessons, ${c.lessons.reduce((a, l) => a + l.steps.filter((s) => s.t !== 'text').length, 0)} challenges`)
console.log(counts.join('\n'), '\nproblems:', problems)
