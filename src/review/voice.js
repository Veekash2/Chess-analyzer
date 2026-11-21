// Spoken coach for Game Review, using the browser's built-in speech (free, works offline on most devices).
// Picks the most natural-sounding English voice the device has: Edge's neural "Natural" voices,
// Google's voices on Chrome/Android, Apple's Enhanced/Premium/Siri voices on iPhone and Mac.

const KEY = 'smc-voice'
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
export const voiceSupported = !!synth

export function loadVoiceSettings() {
  try { return { on: false, voice: '', rate: 1, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { on: false, voice: '', rate: 1 } }
}
export function saveVoiceSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode */ }
}

/** Higher = nicer. Neural/natural voices first, robotic ones (eSpeak, old SAPI "Desktop") last. */
function score(v) {
  const n = v.name
  let s = 0
  if (/natural|neural/i.test(n)) s += 100
  if (/premium|enhanced|siri/i.test(n)) s += 80
  if (/^Google/i.test(n)) s += 60
  if (/online/i.test(n)) s += 20
  if (/Samantha|Daniel|Karen|Moira|Serena|Tessa|Arthur|Martha|Ava|Evan|Zoe/i.test(n)) s += 30
  if (/espeak|desktop|compact|novelty|zarvox|whisper|bad news|bells|boing|bubbles|cellos|jester|organ|trinoids|albert|fred|junior|ralph|superstar|wobble/i.test(n)) s -= 80
  if (/^en-(GB|ZA|AU|IE)/i.test(v.lang)) s += 8 // English accents that suit a chess coach
  else if (/^en-US/i.test(v.lang)) s += 6
  if (v.localService === false) s += 5 // cloud voices are usually the smoother ones
  return s
}

export function englishVoices() {
  if (!synth) return []
  return synth.getVoices().filter((v) => /^en[-_]/i.test(v.lang) || v.lang === 'en').sort((a, b) => score(b) - score(a))
}

/** Calls back whenever the voice list (re)loads - Chrome fills it in asynchronously. */
export function onVoicesChanged(cb) {
  if (!synth) return () => {}
  synth.addEventListener('voiceschanged', cb)
  return () => synth.removeEventListener('voiceschanged', cb)
}

/** Short, friendly label: "Sonia (UK)" instead of "Microsoft Sonia Online (Natural) - English (United Kingdom)". */
export function voiceLabel(v) {
  const name = v.name.replace(/^(Microsoft|Google|Apple)\s+/i, '').replace(/\s*\(.*$/, '').replace(/\s+-\s+.*$/, '').replace(/\s+Online$/i, '').trim()
  const region = { 'en-GB': 'UK', 'en-US': 'US', 'en-ZA': 'South Africa', 'en-AU': 'Australia', 'en-IN': 'India', 'en-IE': 'Ireland', 'en-CA': 'Canada', 'en-NZ': 'NZ' }[v.lang.replace('_', '-')] || v.lang
  const nice = score(v) >= 60 ? ' ★' : ''
  return `${name || v.name} (${region})${nice}`
}

const PIECE = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' }
/** "Nxe5+" -> "Knight takes e5, check" so the voice doesn't spell out notation. */
export function spokenSan(san) {
  if (/^O-O-O/.test(san)) return `castles queenside${san.includes('#') ? ', checkmate' : san.includes('+') ? ', check' : ''}`
  if (/^O-O/.test(san)) return `castles${san.includes('#') ? ', checkmate' : san.includes('+') ? ', check' : ''}`
  const m = san.match(/^([KQRBN])?([a-h]?[1-8]?)(x)?([a-h][1-8])(=([QRBN]))?([+#])?/)
  if (!m) return san
  const [, piece, from, takes, to, , promo, chk] = m
  let s = piece ? PIECE[piece] : (takes ? `${from} pawn` : '')
  if (piece && from) s += ` ${from}`
  s += takes ? ` takes ${to}` : ` ${to}`
  if (promo) s += `, promotes to ${PIECE[promo]}`
  if (chk === '#') s += ', checkmate'
  else if (chk === '+') s += ', check'
  return s.trim()
}

/** Make coach text read naturally: notation -> words, symbols -> words. */
export function speakable(text) {
  return String(text || '')
    .replace(/\b(O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)(?=[\s,.;:!?)]|$)/g, (t) => (/[a-h][1-8]|O-O/.test(t) ? spokenSan(t) : t))
    .replace(/\b(\d+)\.\.\./g, 'move $1, ')
    .replace(/([+-])(\d+\.\d+)/g, (_, sign, n) => `${sign === '-' ? 'minus ' : 'plus '}${n}`)
    .replace(/[★✓✗]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

let token = 0
/** Speak text; resolves when finished (or interrupted). Splits into sentences - Chrome cuts off long utterances. */
export function speak(text, { voice, rate = 1 } = {}) {
  if (!synth || !text) return Promise.resolve()
  const my = ++token
  synth.cancel()
  const parts = text.match(/[^.!?]+[.!?]*/g) || [text]
  const v = englishVoices().find((x) => x.name === voice) || englishVoices()[0]
  return new Promise((resolve) => {
    let i = 0
    const next = () => {
      if (my !== token || i >= parts.length) { resolve(); return }
      const u = new SpeechSynthesisUtterance(parts[i++].trim())
      if (v) { u.voice = v; u.lang = v.lang }
      u.rate = rate
      u.pitch = 1
      u.onend = next
      u.onerror = () => resolve()
      synth.speak(u)
    }
    next()
  })
}

export function stopSpeaking() {
  token++
  synth?.cancel()
}
