// Your chess personality, using the 16 types from Chess.com's ChessPersonality quiz
// (chesspersonality.com). The quiz asks four either/or questions; here each one is
// measured from your real games instead:
//   intuition  <-> calculation : how much clock you use per move, and how much bullet you play
//   attacking  <-> positional  : sharp vs quiet openings, checks, mating wins, quick wins
//   calm       <-> emotional   : how your results change right after a loss, losses on time
//   playful    <-> studious    : how many different openings you play, and how offbeat they are
// Type names, famous players and opening suggestions follow the quiz; descriptions are our own.

export const TYPES = [
  { id: 'jester', name: 'Jester', high: ['calculation', 'attacking', 'calm', 'playful'], player: 'Anish Giri', also: ['Richard Rapport', 'Daniil Dubov'], openings: ['Evans Gambit', 'Stafford Gambit'], courses: ['evans', 'stafford', 'ponziani'], icon: '🃏',
    blurb: 'Treats chess as fun, but calculates the tricks carefully - traps, swindles and cheeky ideas that make opponents think.' },
  { id: 'machine', name: 'Machine', high: ['calculation', 'attacking', 'calm', 'studious'], player: 'Gukesh D', also: ['Wesley So', 'Hou Yifan'], openings: ["Queen's Gambit", 'Caro-Kann'], courses: ['qgd', 'caro', 'qgdblack'], icon: '🤖',
    blurb: 'Relentless and precise: keeps the pressure on, attacks patiently and pounces on every inaccuracy.' },
  { id: 'madscientist', name: 'Mad Scientist', high: ['calculation', 'attacking', 'emotional', 'playful'], player: 'Anna Cramling', also: ['Baadur Jobava', 'Simon Williams'], openings: ["Larsen's Opening", 'Modern Defence'], courses: ['flankb', 'pirc', 'english'], icon: '🧪',
    blurb: 'Always brewing something dangerous - unusual set-ups and sharp, well-calculated attacks that opponents underestimate.' },
  { id: 'magician', name: 'Magician', high: ['calculation', 'attacking', 'emotional', 'studious'], player: 'Alireza Firouzja', also: ['Mikhail Tal', 'Shakhriyar Mamedyarov'], openings: ['Italian Game', "King's Indian Defence"], courses: ['italian', 'kid', 'evans'], icon: '🪄',
    blurb: 'Sets the board on fire with combinations and long tactical sequences - brilliant when inspired, streaky when not.' },
  { id: 'inventor', name: 'Inventor', high: ['calculation', 'positional', 'calm', 'playful'], player: 'Levy Rozman (GothamChess)', also: ['Aron Nimzowitsch', 'Bent Larsen'], openings: ['Réti Opening', 'Philidor Defence'], courses: ['english', 'philidorw', 'alekhine'], icon: '💡',
    blurb: 'Finds original paths: good calculation plus positional understanding, turning quiet positions into creative ones.' },
  { id: 'technician', name: 'Technician', high: ['calculation', 'positional', 'calm', 'studious'], player: 'Ding Liren', also: ['José Raúl Capablanca', 'Akiba Rubinstein'], openings: ['Four Knights Game', 'Slav Defence'], courses: ['fourknightsb', 'qgd', 'ruy'], icon: '🛠️',
    blurb: 'Squeezes the most out of every position and rarely lets a winning game slip - accurate, prepared and patient.' },
  { id: 'grappler', name: 'Grappler', high: ['calculation', 'positional', 'emotional', 'playful'], player: 'Hikaru Nakamura', also: ['Sergey Karjakin', 'Ulf Andersson'], openings: ['Exchange Slav', 'Berlin Defence'], courses: ['catalan', 'petrov', 'ruy'], icon: '🤼',
    blurb: 'Positional control with showmanship: smothers the opponent\'s ideas and grinds out the win.' },
  { id: 'mastermind', name: 'Mastermind', high: ['calculation', 'positional', 'emotional', 'studious'], player: 'Fabiano Caruana', also: ['Bobby Fischer', 'Maxime Vachier-Lagrave'], openings: ['English Attack (Najdorf)', 'Benoni Defence'], courses: ['sicilian', 'grunfeld', 'qgd'], icon: '🧠',
    blurb: 'Always a step ahead: deep calculation and preparation, methodical but intense at the board.' },
  { id: 'swindler', name: 'Swindler', high: ['intuition', 'attacking', 'calm', 'playful'], player: 'The Botez sisters', also: ['Frank Marshall', 'Emanuel Lasker'], openings: ["King's Indian Attack", 'Benko Gambit'], courses: ['stafford', 'kingsgambit', 'ponziani'], icon: '🎭',
    blurb: 'Loves a messy game - keeps setting problems and turns lost positions into draws or wins.' },
  { id: 'assassin', name: 'Assassin', high: ['intuition', 'attacking', 'calm', 'studious'], player: 'Garry Kasparov', also: ['Alexander Alekhine', 'Veselin Topalov'], openings: ['Caro-Kann Fantasy Variation', 'Sicilian Dragon'], courses: ['dragon', 'sicilian', 'carow'], icon: '🗡️',
    blurb: 'A cool, relentless attacker: once the hunt for the king starts, the opponent rarely gets away.' },
  { id: 'caveman', name: 'Caveman', high: ['intuition', 'attacking', 'emotional', 'playful'], player: 'Ian Nepomniachtchi', also: ['Rudolf Spielmann', 'Alexei Shirov'], openings: ['Scotch Game', 'French Defence'], courses: ['scotch', 'vienna', 'french'], icon: '🪨',
    blurb: 'Raw attacking power on instinct - unstoppable when on a roll, but tilts after a bad loss.' },
  { id: 'romantic', name: 'Romantic', high: ['intuition', 'attacking', 'emotional', 'studious'], player: 'Paul Morphy', also: ['Adolf Anderssen', 'Rashid Nezhmetdinov'], openings: ["King's Gambit", 'Scandinavian Defence'], courses: ['vienna', 'scandi', 'kingsgambit'], icon: '🌹',
    blurb: 'Full of attacking ideas found by feel rather than long calculation - gambits, open lines and surprising blows, in the spirit of the classic masters.' },
  { id: 'anaconda', name: 'Anaconda', high: ['intuition', 'positional', 'calm', 'playful'], player: 'Magnus Carlsen', also: ['Anatoly Karpov', 'Tigran Petrosian'], openings: ['London System', 'Semi-Tarrasch Defence'], courses: ['london', 'qgdblack', 'caro'], icon: '🐍',
    blurb: 'Loves control: slowly squeezes the opponent, often winning long endgames.' },
  { id: 'professor', name: 'Professor', high: ['intuition', 'positional', 'calm', 'studious'], player: 'Viswanathan Anand', also: ['Mikhail Botvinnik', 'Vladimir Kramnik'], openings: ['Ruy Lopez', 'Sicilian Najdorf'], courses: ['ruy', 'sicilian', 'qgd'], icon: '🎓',
    blurb: 'Knows the patterns and culture of chess and lets experience guide the moves - principled and well-studied.' },
  { id: 'wildcard', name: 'Wildcard', high: ['intuition', 'positional', 'emotional', 'playful'], player: 'Eric Hansen', also: ['Levon Aronian', 'Vassily Ivanchuk'], openings: ['Nakhmanson Gambit', 'Albin Countergambit'], courses: ['ponziani', 'alekhine', 'dutch'], icon: '🎲',
    blurb: 'Can play any style depending on the mood - intuitive and hard to predict.' },
  { id: 'artist', name: 'Artist', high: ['intuition', 'positional', 'emotional', 'studious'], player: 'Judit Polgár', also: ['David Bronstein', 'Alexander Morozevich'], openings: ['Trompowsky Attack', 'Budapest Gambit'], courses: ['catalan', 'dutch', 'nimzo'], icon: '🎨',
    blurb: 'Plays for harmony and beauty, trusting intuition to find the moves the position needs.' },
]

const SHARP = /Gambit|Attack|Vienna|Scandinavian|Sicilian|Stafford|Fried Liver|Dragon|Kings Indian|King's Indian|Grand Prix|Alekhine|Pirc|Modern|Latvian|Elephant|Englund|Danish|Evans|Ponziani|Center Game|Fishing Pole|Halloween|Traxler|Two Knights|Scotch|Dutch|Benko|Albin|Budapest|Benoni|Grunfeld/i
const SOLID = /London|Caro|Slav|Queens Gambit Declined|Queen's Gambit Declined|Berlin|Petrov|English|Reti|Catalan|Colle|Philidor|French|Four Knights|Giuoco Pianissimo|Nimzo-Indian|Queens Indian|Bogo|Semi-Tarrasch|Torre|Exchange|Ruy Lopez|Closed/i
const OFFBEAT = /Bongcloud|Stafford|Englund|Grob|Elephant|Latvian|Damiano|Owen|Nimzowitsch Defense|Van t Kruijs|Van't Kruijs|Larsen|Kings Fianchetto|Mieses Opening|Polish|Amar|Barnes|Ware|Saragossa|Clemenz|Irregular|Kings Pawn Opening|Queens Pawn Opening|Center Game|Ponziani|Halloween|Jerome|Hippopotamus|St George|Borg|Fishing Pole|Wayward|Napoleon/i

const clamp = (x) => Math.max(0, Math.min(1, x))
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
const pct = (x) => `${Math.round(100 * x)}%`
const family = (name) => (name || 'Unknown').split(/ (Defense|Defence|Opening|Game|Attack|Gambit|System)\b/)[0].trim()

/**
 * rows: sorted oldest->newest, each with { opening, outcome, how, timeClass, end, rec }.
 * Returns { type, matches: [{type, pct}], dims: {...}, openings }
 */
export function personality(rows) {
  const games = rows.filter((r) => r.rules === 'chess' || r.rules == null)
  if (games.length < 30) return null
  const wins = games.filter((r) => r.outcome === 'win')
  const losses = games.filter((r) => r.outcome === 'loss')
  const withRec = games.filter((r) => r.rec && r.rec.myMoves > 0)

  // ---- intuition (0) <-> calculation (1)
  const ratios = withRec.filter((r) => r.rec.time?.avgMiddlegame != null && r.rec.time.base >= 60).map((r) => r.rec.time.avgMiddlegame / (r.rec.time.base / 40))
  const timeRatio = avg(ratios)
  const bullet = games.filter((r) => r.timeClass === 'bullet').length / games.length
  const blitz = games.filter((r) => r.timeClass === 'blitz').length / games.length
  const slowShare = 1 - bullet - blitz
  const calcTime = timeRatio != null ? clamp((timeRatio - 0.55) / 0.9) : 0.5
  const calcTc = clamp(slowShare + blitz * 0.4)
  const calc = 0.6 * calcTime + 0.4 * calcTc

  // ---- positional (0) <-> attacking (1)
  let sharp = 0, solid = 0
  for (const r of games) { if (SHARP.test(r.opening)) sharp++; else if (SOLID.test(r.opening)) solid++ }
  const sharpShare = sharp + solid ? sharp / (sharp + solid) : 0.5
  const checksPerMove = avg(withRec.map((r) => r.rec.checks / r.rec.myMoves)) ?? 0.05
  const mateWins = wins.length ? wins.filter((r) => r.how === 'checkmated').length / wins.length : 0
  const quickWins = wins.filter((r) => r.rec).length ? wins.filter((r) => r.rec && r.rec.myMoves <= 30).length / wins.filter((r) => r.rec).length : 0
  const att = avg([clamp((sharpShare - 0.25) / 0.6), clamp((checksPerMove - 0.035) / 0.05), clamp(mateWins / 0.45), clamp((quickWins - 0.2) / 0.5)])

  // ---- calm (0) <-> emotional (1)
  const afterW = [], afterL = []
  for (let i = 1; i < games.length; i++) {
    const prev = games[i - 1], r = games[i]
    if (r.end - prev.end > 60 * 60 * 1000) continue // only back-to-back games
    const s = r.outcome === 'win' ? 1 : r.outcome === 'draw' ? 0.5 : 0
    if (prev.outcome === 'win') afterW.push(s)
    if (prev.outcome === 'loss') afterL.push(s)
  }
  const tilt = afterW.length >= 20 && afterL.length >= 20 ? 100 * (avg(afterW) - avg(afterL)) : 0
  const timeoutLosses = losses.length ? losses.filter((r) => r.how === 'timeout' || r.how === 'abandoned').length / losses.length : 0
  let streak = 0, maxLossStreak = 0
  for (const r of games) { streak = r.outcome === 'loss' ? streak + 1 : 0; maxLossStreak = Math.max(maxLossStreak, streak) }
  const emo = 0.6 * clamp((tilt + 1) / 9) + 0.25 * clamp(timeoutLosses / 0.35) + 0.15 * clamp((maxLossStreak - 5) / 8)

  // ---- studious (0) <-> playful (1)
  const recent = games.slice(-1000)
  const fam = {}
  for (const r of recent) { const f = family(r.opening); fam[f] = (fam[f] || 0) + 1 }
  const H = -Object.values(fam).reduce((a, n) => a + (n / recent.length) * Math.log(n / recent.length), 0)
  const effective = Math.exp(H)
  const offbeat = recent.filter((r) => OFFBEAT.test(r.opening)).length / recent.length
  const play = avg([clamp((effective - 5) / 15), clamp(offbeat / 0.3)])

  const dims = {
    calc: { value: calc, left: 'Intuition', right: 'Calculation', evidence: [
      timeRatio != null ? `In the middlegame you use ${timeRatio.toFixed(2)}x an even share of your clock per move (1.0 = base time spread over 40 moves).` : null,
      `${pct(bullet)} bullet, ${pct(blitz)} blitz, ${pct(slowShare)} rapid/daily.`,
    ].filter(Boolean) },
    att: { value: att, left: 'Positional', right: 'Attacking', evidence: [
      `${pct(sharpShare)} of your games with a known style are in sharp openings (gambits, Vienna, Scandinavian, Sicilian...).`,
      `You give check on ${pct(checksPerMove)} of your moves; ${pct(mateWins)} of your wins end in checkmate; ${pct(quickWins)} take 30 moves or fewer.`,
    ] },
    emo: { value: emo, left: 'Calm', right: 'Emotional', evidence: [
      afterW.length >= 20 && afterL.length >= 20 ? `Straight after a win you score ${pct(avg(afterW))}; straight after a loss ${pct(avg(afterL))}.` : 'Not enough back-to-back games to measure tilt.',
      `${pct(timeoutLosses)} of your losses are on time; longest losing streak ${maxLossStreak}.`,
    ] },
    play: { value: play, left: 'Studious', right: 'Playful', evidence: [
      `Your last ${recent.length} games use about ${Math.round(effective)} different openings regularly.`,
      `${pct(offbeat)} of them are offbeat or trick openings.`,
    ] },
  }
  const high = [calc >= 0.5 ? 'calculation' : 'intuition', att >= 0.5 ? 'attacking' : 'positional', emo >= 0.5 ? 'emotional' : 'calm', play >= 0.5 ? 'playful' : 'studious']
  const target = (t) => [t.high.includes('calculation') ? 1 : 0, t.high.includes('attacking') ? 1 : 0, t.high.includes('emotional') ? 1 : 0, t.high.includes('playful') ? 1 : 0]
  const me = [calc, att, emo, play]
  const matches = TYPES.map((t) => ({ type: t, pct: Math.round(100 * avg(target(t).map((v, i) => 1 - Math.abs(v - me[i])))) })).sort((a, b) => b.pct - a.pct)
  const type = TYPES.find((t) => t.high.every((h) => high.includes(h)))

  // your own openings: best-scoring families with enough games
  const byFam = {}
  for (const r of games) {
    const f = family(r.opening)
    const e = (byFam[f] ||= { name: f, n: 0, pts: 0, sharp: SHARP.test(r.opening) })
    e.n++; e.pts += r.outcome === 'win' ? 1 : r.outcome === 'draw' ? 0.5 : 0
  }
  const openings = Object.values(byFam).filter((e) => e.n >= 25 && e.name !== 'Unknown').map((e) => ({ ...e, score: Math.round((100 * e.pts) / e.n) })).sort((a, b) => b.score - a.score)
  return { type, matches: matches.slice(0, 4), dims, openings, n: games.length }
}
