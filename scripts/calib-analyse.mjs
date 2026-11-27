// Analyses calibration games exactly like the site's Game Review (same code, same engine, same
// depth) and writes per-player features. Run in shards:
//   node scripts/calib-analyse.mjs <games.json> <out.json> <shard> <shards> [depth]
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createUciClient } from '../src/review/uci.js'
import { parsePgnText, reviewGame } from '../src/review/reviewCore.js'

const [, , IN, OUT, SHARD, SHARDS, DEPTH = '16'] = process.argv
const games = JSON.parse(readFileSync(IN, 'utf8')).filter((_, i) => i % +SHARDS === +SHARD)
const openings = JSON.parse(readFileSync('src/data/openings.json', 'utf8'))

const proc = spawn(process.execPath, ['node_modules/stockfish/src/stockfish-17.1-lite-single-03e3232.js'])
const client = createUciClient((l) => proc.stdin.write(l + '\n'))
let buf = ''
proc.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l) client.onLine(l) } })
await client.init({ multiPv: 2, hash: 32 })

const out = []
for (const g of games) {
  try {
    const parsed = parsePgnText(g.pgn)[0]
    if (!parsed) continue
    const res = await reviewGame(parsed, (fen, d) => client.evaluate(fen, d), { depth: +DEPTH, openings })
    for (const c of ['w', 'b']) {
      const ms = res.moves.filter((m) => m.color === c)
      const scored = ms.filter((m) => m.cls !== 'book' && m.cls !== 'forced')
      if (scored.length < 8) continue
      const cnt = (k) => ms.filter((m) => m.cls === k).length
      out.push({
        rating: c === 'w' ? g.w : g.b, opp: c === 'w' ? g.b : g.w, tc: g.tc, moves: scored.length,
        acpl: scored.reduce((a, m) => a + m.cpLoss, 0) / scored.length,
        acplCap: scored.reduce((a, m) => a + Math.min(m.cpLoss, 300), 0) / scored.length,
        wloss: scored.reduce((a, m) => a + m.loss, 0) / scored.length, // win% lost per move (0-1)
        accuracy: res.summary[c].accuracy,
        blunders: cnt('blunder'), mistakes: cnt('mistake'), misses: cnt('miss'), inacc: cnt('inaccuracy'),
        best: cnt('best') + cnt('great') + cnt('brilliant'),
      })
    }
  } catch (e) { console.error('skip', e.message) }
  process.stdout.write('.')
}
proc.kill()
writeFileSync(OUT, JSON.stringify(out))
console.log('\nshard', SHARD, 'players', out.length)
