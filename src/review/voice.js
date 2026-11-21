// Spoken coach for Game Review, using the browser's built-in speech (free, works offline on most devices).
// Picks the most natural-sounding English voice the device has: Edge's neural "Natural" voices,
// Google's voices on Chrome/Android, Apple's Enhanced/Premium/Siri voices on iPhone and Mac.

const KEY = 'smc-voice'
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
export const voiceSupported = !!synth

export function loadVoiceSettings() {
  const base = { on: false, gender: 'female', voice: '', rate: 1 }
  try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return base }
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

// Voice names across Windows/Edge, Chrome/Android and Apple, sorted by how they sound.
const FEMALE = /\b(female|woman|sonia|libby|maisie|abbi|bella|hollie|olivia|leah|aria|jenny|ava|emma|michelle|ana|amber|ashley|cora|elizabeth|jane|nancy|sara|natasha|annette|carly|freya|elsie|tina|clara|emily|hazel|susan|zira|samantha|karen|moira|tessa|serena|fiona|victoria|allison|kate|martha|zoe|catherine|heera|neerja|isabella|joanna|kendra|kimberly|salli|ivy|nicole|raveena|veena|siri female|stephanie|flo|sandy|shelley|grandma|kathy|aditi|kajal|ruth|matilda|lisa|karla)\b/i
const MALE = /\b(male|man|ryan|thomas|alfie|elliot|ethan|noah|oliver|luke|guy|andrew|brian|christopher|eric|roger|steffan|william|davis|jason|tony|connor|liam|mitchell|ken|duncan|george|david|mark|daniel|arthur|alex|fred|aaron|evan|tom|lee|rishi|prabhat|gordon|james|joey|justin|matthew|russell|stephen|siri male|reed|rocko|eddy|grandpa|ralph|albert|junior|nathan|oskar)\b/i
export function genderOf(v) {
  const n = v.name.replace(/^(Microsoft|Google|Apple)\s+/i, '')
  if (/\bfemale\b/i.test(n) || (FEMALE.test(n) && !/\bmale\b/i.test(n))) return 'female'
  if (MALE.test(n)) return 'male'
  if (/^Google (US|UK) English$/i.test(v.name)) return 'female' // Chrome's unnamed default voices
  return 'unknown'
}

export function englishVoices(gender) {
  if (!synth) return []
  const all = synth.getVoices().filter((v) => /^en[-_]/i.test(v.lang) || v.lang === 'en').sort((a, b) => score(b) - score(a))
  if (!gender || gender === 'any') return all
  const g = all.filter((v) => genderOf(v) === gender)
  return g.length ? g : all // device has no voice of that kind - fall back to whatever it has
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
export function speak(text, { voice, rate = 1, gender, pitch = 1 } = {}) {
  if (!synth || !text) return Promise.resolve()
  const my = ++token
  synth.cancel()
  const parts = text.match(/[^.!?]+[.!?]*/g) || [text]
  const list = englishVoices(gender)
  const v = list.find((x) => x.name === voice) || list[0]
  return new Promise((resolve) => {
    let i = 0
    const next = () => {
      if (my !== token || i >= parts.length) { resolve(); return }
      const u = new SpeechSynthesisUtterance(parts[i++].trim())
      if (v) { u.voice = v; u.lang = v.lang }
      u.rate = rate * 0.96 // a touch slower than default sounds calmer, more like a person explaining
      u.pitch = pitch
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

/* ------------------------------------------------------------------ coach script */
// Turns the written review into what a friendly human coach would SAY: short reaction first,
// then the reason, with engine move lists and brackets removed (nobody reads those out loud).

const say = (list, seed) => list[seed % list.length]
const cap = (t) => (/^[a-h][1-8]\b/.test(t) ? t : t.charAt(0).toUpperCase() + t.slice(1))

const REACT = {
  brilliant: [['Wow! {m}!', "That's brilliant."], ['Oh, beautiful.', '{m}! A brilliant move.'], ['{m}!', 'What a move. That is brilliant.']],
  great: [['{m}! Great move.'], ['Nice find.', '{m} is a great move.'], ['{m}.', "That's the only good move here, and you found it."]],
  best: [['{m}.', "That's the best move."], ['Nice.', '{m}, exactly what the engine wanted.'], ['{m}.', 'Perfect, the top engine move.'], ['Good stuff.', '{m} is best.']],
  excellent: [['{m}.', 'Very good move.'], ['{m}.', 'Excellent, almost as good as the best move.'], ['Good, {m}.', 'That keeps everything under control.']],
  good: [['{m}.', "That's fine."], ['{m}.', 'A decent move, though there was a little better.'], ['{m}.', 'OK, a reasonable choice.']],
  book: [['{m}.', 'Still in the opening book.'], ['{m}, a book move.'], ['{m}.', 'Standard theory so far.']],
  forced: [['{m}.', 'This was the only move.'], ['{m}, forced.']],
  inaccuracy: [['Hmm, {m}.', "That's a bit of an inaccuracy."], ['{m}.', 'Not quite the best, a small inaccuracy.'], ['{m}.', 'Slightly imprecise here.']],
  mistake: [['Ooh, {m}.', "That's a mistake."], ['{m}.', 'Careful, this one is a mistake.'], ['Hmm.', '{m} is a mistake.']],
  miss: [['{m}.', 'Ah, you missed a chance here.'], ['Oh, {m}.', 'There was something much better.'], ['{m}.', 'That lets the opportunity slip.']],
  blunder: [['Oh no.', '{m} is a blunder.'], ['Ouch!', '{m}. That one is a blunder.'], ['{m}?', "Oh dear, that's a blunder."]],
}
const PITCH = { brilliant: 1.08, great: 1.05, blunder: 0.96, mistake: 0.98 }
const BORING = /^(a standard opening move|book move|standard theory)\.?$/i

/** What to say for one reviewed move. Returns { text, pitch }. */
export function coachScript(m, { opponent } = {}) {
  const seed = (m.ply * 7 + m.san.length) // same line each time you revisit a move, varied across moves
  const spoken = spokenSan(m.san)
  const react = say(REACT[m.cls] || [['{m}.']], seed).map((t) => t.replace('{m}', spoken))
  if (opponent && !['brilliant', 'great', 'blunder', 'mistake', 'miss'].includes(m.cls)) react[0] = react[0].replace(/^(Nice|Good stuff|Good)[.,]?\s*/, '')
  let reason = String(m.explain?.text || m.text || '')
    .replace(/\s*\([^)]*\)/g, '') // "(Qe2 Bf5 Re3 O-O)" engine lines
    .replace(/Engine line:.*$/i, '')
  // drop the reason if it only repeats the reaction ("Nf3 is best.")
  reason = reason.split(/(?<=[.!?])\s+/).filter((t) => t && !BORING.test(t.trim()) && !new RegExp(`^${m.san.replace(/[+#=]/g, '\\$&')} (is|was) (a |an |the )?(${m.cls}|best|book)`, 'i').test(t.trim())).join(' ')
  reason = speakable(reason).split(/(?<=[.!?])\s+/).map(cap).join(' ')
  const text = [...react, reason].filter(Boolean).join(' ').replace(/\s+([.,!?])/g, '$1')
  return { text: text.replace(/(^|[.!?]\s+)([a-z])(?![1-8])/g, (_, a, b) => a + b.toUpperCase()), pitch: PITCH[m.cls] || 1 }
}
