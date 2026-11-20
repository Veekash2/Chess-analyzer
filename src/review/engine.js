// Stockfish 17.1 (lite, single-threaded WebAssembly) running in a Web Worker.
// Files live in /public/engine so the worker can find its .wasm next to it.
import { createUciClient } from './uci.js'

const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-17.1-lite-single-03e3232.js`
let enginePromise = null

export function getEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const worker = new Worker(ENGINE_URL)
      const client = createUciClient((line) => worker.postMessage(line))
      worker.onmessage = (e) => String(e.data).split('\n').forEach((l) => l && client.onLine(l.trim()))
      worker.onerror = (e) => console.error('engine error', e.message)
      await client.init({ multiPv: 2, hash: 32 })
      return client
    })()
  }
  return enginePromise
}

let bookPromise = null
export function getOpeningBook() {
  bookPromise ||= import('../data/openings.json').then((m) => m.default)
  return bookPromise
}
