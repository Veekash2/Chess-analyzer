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

// A second engine just for the practice bots (wider MultiPV, so weaker bots can pick
// "good enough" moves), kept separate so a review and a bot game never block each other.
let botPromise = null
export function getBotEngine() {
  if (!botPromise) {
    botPromise = (async () => {
      const worker = new Worker(ENGINE_URL)
      const client = createUciClient((line) => worker.postMessage(line))
      worker.onmessage = (e) => String(e.data).split('\n').forEach((l) => l && client.onLine(l.trim()))
      await client.init({ multiPv: 5, hash: 16 })
      return client
    })()
  }
  return botPromise
}
