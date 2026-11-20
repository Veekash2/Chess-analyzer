// Tiny UCI client shared by the browser engine and Node tests.
// `send(line)` writes to the engine; call `onLine(line)` for every line it prints.

export function createUciClient(send) {
  let pending = null
  let readyResolve = null
  const queue = []

  function onLine(line) {
    if (line === 'readyok' && readyResolve) { readyResolve(); readyResolve = null; return }
    if (!pending) return
    if (line.startsWith('info') && line.includes(' pv ') && line.includes(' score ')) {
      const depth = +line.match(/ depth (\d+)/)[1]
      const mpv = +(line.match(/ multipv (\d+)/)?.[1] || 1)
      const mate = line.match(/ score mate (-?\d+)/)
      const cp = line.match(/ score cp (-?\d+)/)
      if (/ (upperbound|lowerbound)/.test(line)) return
      const pv = line.split(' pv ')[1].trim().split(/\s+/)
      pending.lines[mpv - 1] = { depth, ...(mate ? { mate: +mate[1] } : { cp: +cp[1] }), pv }
    } else if (line.startsWith('bestmove')) {
      const p = pending
      pending = null
      p.resolve({ lines: p.lines.filter(Boolean), best: line.split(' ')[1] })
      next()
    }
  }

  function next() {
    if (pending || !queue.length) return
    pending = queue.shift()
    send(`position fen ${pending.fen}`)
    send(`go depth ${pending.depth}`)
  }

  return {
    onLine,
    async init({ multiPv = 2, hash = 32 } = {}) {
      send('uci')
      send(`setoption name MultiPV value ${multiPv}`)
      send(`setoption name Hash value ${hash}`)
      await new Promise((r) => { readyResolve = r; send('isready') })
    },
    evaluate(fen, depth) {
      return new Promise((resolve) => { queue.push({ fen, depth, lines: [], resolve }); next() })
    },
    newGame() { send('ucinewgame') },
  }
}
