// Practice bots: original characters named after the old chaturanga pieces, each a
// deliberately weakened Stockfish with its own style and a few lines of chat.
import { Chess } from 'chess.js'

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

// Strength per rating step: engine depth, chance of a random "human" blunder, and how far
// (in centipawns) below the best move the bot is still happy to play.
const STRENGTH = {
  250: [1, 0.45, 500], 400: [2, 0.32, 350], 550: [3, 0.24, 280], 700: [4, 0.18, 230], 850: [5, 0.13, 180],
  1000: [6, 0.09, 140], 1100: [6, 0.07, 120], 1250: [7, 0.05, 100], 1400: [8, 0.04, 80], 1600: [9, 0.025, 55],
  1800: [10, 0.015, 40], 2000: [11, 0.008, 25], 2200: [13, 0.004, 15], 2500: [15, 0.001, 6], 3000: [18, 0, 0],
}
function strengthFor(r) {
  const keys = Object.keys(STRENGTH).map(Number).sort((a, b) => a - b)
  if (r <= keys[0]) return STRENGTH[keys[0]]
  if (r >= keys.at(-1)) return STRENGTH[keys.at(-1)]
  const hi = keys.find((k) => k >= r), lo = keys[keys.indexOf(hi) - 1]
  const t = (r - lo) / (hi - lo), a = STRENGTH[lo], b = STRENGTH[hi]
  return [Math.round(a[0] + t * (b[0] - a[0])), a[1] + t * (b[1] - a[1]), Math.round(a[2] + t * (b[2] - a[2]))]
}
const bot = (b) => {
  const [depth, blunder, margin] = strengthFor(b.rating)
  return { depth, blunder, margin, ...b }
}
/** Build a bot object at a given rating (used for friend bots). */
export const makeBot = bot

export const LEVELS = [
  { name: 'Beginner', max: 850 },
  { name: 'Intermediate', max: 1400 },
  { name: 'Advanced', max: 2000 },
  { name: 'Master', max: 9999 },
]

export const BOTS = [
  bot({
    id: 'pyaada', name: 'Pyaada', rating: 250, color: '#e67e22', style: 'random',
    tagline: 'Six years old. Just learned how the pieces move.',
    look: { skin: 'wheat', hair: 'short', head: 'cap', headColor: '#e74c3c', shirt: '#f1c40f', mood: 'grin' },
    chat: {
      hello: ['Namaste! Go easy on me, I just learned this game!', 'Hi! Which way does the horse move again?'],
      takes: ['Ooh, a free piece!', 'Mine now!'], lost: ['Hey, I needed that!', 'Oops...'],
      check: ['Check! Did I do that right?'], winning: ['Am I... winning?'], losing: ['This is hard!'],
      win: ['I won?! Wait till I tell my friends!'], loss: ['Well played! I will practise more.'], draw: ['A draw! That counts as half a win, right?'],
    },
  }),
  bot({
    id: 'chhotu', name: 'Chhotu', rating: 400, color: '#16a085', style: 'random',
    tagline: 'Plays between cricket matches. Loves moving the queen early.',
    look: { skin: 'brown', hair: 'spiky', shirt: '#2980b9', mood: 'grin' },
    chat: {
      hello: ['Quick game before cricket?', 'My queen is going on an adventure today!'],
      takes: ['Six! Out of the park!', 'Got it!'], lost: ['Arre! Not fair!', 'Who left that there?'],
      check: ['Check! Howzat?'], winning: ['I am batting well today!'], losing: ['Rain delay, please...'],
      win: ['Man of the match!'], loss: ['Good game, captain.'], draw: ['Match drawn. Rematch tomorrow!'],
    },
  }),
  bot({
    id: 'meera', name: 'Meera', rating: 550, color: '#9b59b6', style: 'pawns',
    tagline: 'School chess club. Pushes her pawns with big hopes.',
    look: { skin: 'tan', hair: 'braid', bindi: true, shirt: '#8e44ad', earrings: true, mood: 'smile' },
    chat: {
      hello: ['Hi! My coach says pawns are the soul of chess.', 'Ready when you are!'],
      takes: ['Thank you!', 'Nice, a piece for me.'], lost: ['Oh no, my piece!', 'I did not see that.'],
      check: ['Check!'], winning: ['My pawns are marching!'], losing: ['Hmm, I need a plan...'],
      win: ['Yay! I am telling my coach!'], loss: ['You played really well!'], draw: ['A draw - not bad!'],
    },
  }),
  bot({
    id: 'ghoda', name: 'Ghoda', rating: 700, color: '#2f6f4f', style: 'knights',
    tagline: 'Rides horses on weekends. Jumps his knights into your camp.',
    look: { skin: 'tan', hair: 'short', head: 'headband', headColor: '#27ae60', shirt: '#2f6f4f', mood: 'grin' },
    chat: {
      hello: ['Hup hup! My knights are ready to jump.', 'Watch out for forks - I love them!'],
      takes: ['Jumped right in!', 'Gotcha!'], lost: ['Hmph, I did not see that.', 'Nice shot.'],
      check: ['Check! Neigh-ce, right?'], winning: ['My horses are galloping now!'], losing: ['Time to regroup the stable...'],
      win: ['The knights win the day!'], loss: ['You out-jumped me. Good game!'], draw: ['A draw. My knights need a rest anyway.'],
    },
  }),
  bot({
    id: 'dadi', name: 'Dadi', rating: 850, color: '#c0392b', style: 'solid',
    tagline: 'Grandma who plays every evening with chai. Never rushes.',
    look: { skin: 'wheat', hair: 'bun', age: 2, glasses: true, bindi: true, shirt: '#c0392b', earrings: true, mood: 'calm' },
    chat: {
      hello: ['Come, beta, sit. Have some chai and let us play.', 'Slowly, slowly. Chess is not a race.'],
      takes: ['I will keep this safe for you.', 'Thank you, beta.'], lost: ['Arre, my eyes are getting old.', 'Clever child.'],
      check: ['Check, beta.'], winning: ['Dadi still has some tricks.'], losing: ['You are getting too good for me.'],
      win: ['Now finish your homework.'], loss: ['So proud of you!'], draw: ['A draw. Everyone is happy.'],
    },
  }),
  bot({
    id: 'haathi', name: 'Haathi', rating: 1000, color: '#5b6b7a', style: 'solid',
    tagline: 'Big, calm and solid - like an elephant.',
    look: { skin: 'brown', hair: 'short', beard: 'full', shirt: '#5b6b7a', mood: 'calm' },
    chat: {
      hello: ['An elephant never forgets... a weak square.', 'Let us play a calm, solid game.'],
      takes: ['Thank you.', 'Slowly, slowly.'], lost: ['A fair trade... I hope.', 'Hmm, careful now.'],
      check: ['Check.'], winning: ['The elephant keeps walking forward.'], losing: ['I will dig in and defend.'],
      win: ['Slow and steady wins.'], loss: ['You played well. Good game.'], draw: ['A peaceful draw.'],
    },
  }),
  bot({
    id: 'bunty', name: 'Bunty', rating: 1100, color: '#d35400', style: 'trader',
    tagline: 'Shopkeeper. Loves a good trade - piece for piece.',
    look: { skin: 'tan', hair: 'short', moustache: true, shirt: '#e67e22', age: 1, mood: 'grin' },
    chat: {
      hello: ['Welcome, welcome! Today everything is on exchange.', 'Best prices in town - a piece for a piece!'],
      takes: ['Good deal for me!', 'Sold!'], lost: ['Fair trade, fair trade.', 'Ah, you drive a hard bargain.'],
      check: ['Check - pay up!'], winning: ['Business is good today.'], losing: ['Hmm, this is a loss-making deal.'],
      win: ['Come again tomorrow!'], loss: ['You out-bargained me. Respect.'], draw: ['Break-even. Not bad.'],
    },
  }),
  bot({
    id: 'priya', name: 'Priya', rating: 1250, color: '#e84393', style: 'aggressive',
    tagline: 'College champion. Goes straight for your king.',
    look: { skin: 'wheat', hair: 'long', hairColor: '#1a1a1a', shirt: '#e84393', earrings: true, mood: 'grin' },
    chat: {
      hello: ['I hope you castled early.', 'Let us make this exciting!'],
      takes: ['Thanks!', 'That one was loose.'], lost: ['Fine, it was a sacrifice.', 'Bold!'],
      check: ['Check! Feel the heat?', 'Check!'], winning: ['The attack is on!'], losing: ['I still have tricks left.'],
      win: ['Attack wins games!'], loss: ['Okay, you defended well.'], draw: ['A draw? I wanted more!'],
    },
  }),
  bot({
    id: 'mantri', name: 'Mantri', rating: 1400, color: '#a3245c', style: 'aggressive',
    tagline: 'A sly minister who always attacks the king.',
    look: { skin: 'tan', hair: 'short', glasses: true, tilak: true, moustache: true, shirt: '#a3245c', age: 1, mood: 'stern' },
    chat: {
      hello: ['A minister must protect the crown - by attacking yours.', 'I hope your king likes fresh air.'],
      takes: ['Another one falls.', 'Attack, attack, attack!'], lost: ['A small sacrifice for the attack.', 'Bold of you.'],
      check: ['Check! Run, little king.', 'Check! Feeling the pressure?'], winning: ['The attack is coming through.'], losing: ['Even ministers have bad days.'],
      win: ['The crown is mine!'], loss: ['You survived my attack. Impressive.'], draw: ['A draw? I wanted blood!'],
    },
  }),
  bot({
    id: 'iyer', name: 'Prof. Iyer', rating: 1600, color: '#34495e', style: 'positional',
    tagline: 'Maths professor. Every move has a reason.',
    look: { skin: 'brown', hair: 'bald', age: 2, glasses: true, beard: 'stubble', shirt: '#34495e', mood: 'calm' },
    chat: {
      hello: ['Let us see if your moves are logical.', 'Chess is just geometry with feelings.'],
      takes: ['As calculated.', 'Q.E.D.'], lost: ['An interesting variable.', 'Hmm, I must recheck my working.'],
      check: ['Check.'], winning: ['The proof is nearly complete.'], losing: ['There is an error in my reasoning.'],
      win: ['Study the endgame - it is where the marks are.'], loss: ['Excellent work. Full marks.'], draw: ['Equal. Balanced, as all things should be.'],
    },
  }),
  bot({
    id: 'raja', name: 'Raja', rating: 1800, color: '#b8892f', style: 'positional',
    tagline: 'A wise king who squeezes every small advantage.',
    look: { skin: 'tan', head: 'turban', headColor: '#d4a017', moustache: true, shirt: '#7a1f3d', mood: 'calm' },
    chat: {
      hello: ['Welcome to my court. Show me your best chess.', 'Patience is the weapon of kings.'],
      takes: ['As planned.', 'Every pawn counts.'], lost: ['A worthy move.', 'You are no beginner.'],
      check: ['Check.'], winning: ['The squeeze has begun.'], losing: ['You have my attention now.'],
      win: ['The kingdom stands. Well fought.'], loss: ['You have beaten a king. Remarkable.'], draw: ['An honourable draw.'],
    },
  }),
  bot({
    id: 'rani', name: 'Rani', rating: 2000, color: '#6c3483', style: 'aggressive',
    tagline: 'The warrior queen. Sharp, fearless, tactical.',
    look: { skin: 'wheat', hair: 'long', head: 'tiara', bindi: true, earrings: true, shirt: '#6c3483', mood: 'stern' },
    chat: {
      hello: ['A queen does not wait to be attacked.', 'Draw your sword.'],
      takes: ['Yours was weak.', 'Taken.'], lost: ['A fair blow.', 'You fight well.'],
      check: ['Check. Kneel.'], winning: ['Your defences are crumbling.'], losing: ['A queen never surrenders.'],
      win: ['Victory belongs to the bold.'], loss: ['You have earned a place in my army.'], draw: ['We fight again another day.'],
    },
  }),
  bot({
    id: 'maharaja', name: 'Maharaja', rating: 2200, color: '#7a1f3d', style: 'positional',
    tagline: 'Master strength. Few mistakes, no mercy.',
    look: { skin: 'tan', head: 'turban', headColor: '#c0392b', beard: 'full', age: 1, shirt: '#4a1024', mood: 'stern' },
    chat: {
      hello: ['You seek a challenge? Very well.', 'Let us see what you have learned.'],
      takes: ['Inevitable.'], lost: ['Interesting.'], check: ['Check.'], winning: ['The end is near.'], losing: ['Hm. Well played so far.'],
      win: ['A good effort. Study and return.'], loss: ['Extraordinary. You have earned my respect.'], draw: ['A draw against a Maharaja is no small thing.'],
    },
  }),
  bot({
    id: 'guru', name: 'Guru', rating: 2500, color: '#1e8449', style: 'positional',
    tagline: 'Grandmaster teacher. Sees ten moves ahead.',
    look: { skin: 'brown', hair: 'bald', age: 2, beard: 'long', tilak: true, shirt: '#f39c12', mood: 'calm' },
    chat: {
      hello: ['Breathe. See the whole board.', 'Every game is a lesson. Shall we begin?'],
      takes: ['Mm.'], lost: ['Good. You are learning.'], check: ['Check.'], winning: ['Look carefully - what did you miss?'], losing: ['The student surprises the teacher.'],
      win: ['Go back over this game. The lesson is in move twenty.'], loss: ['The student has become the teacher.'], draw: ['Balance. A fine result.'],
    },
  }),
  bot({
    id: 'chaturanga', name: 'Chaturanga', rating: 3000, color: '#111827', style: 'best',
    tagline: 'The spirit of the original game. Full engine strength.',
    look: { skin: 'deep', hair: 'bald', head: 'crown', shirt: '#111827', glow: true, mood: 'stern' },
    chat: {
      hello: ['I have played for fifteen centuries. Your move.'], takes: ['...'], lost: ['...'], check: ['Check.'],
      winning: ['Resistance is admirable.'], losing: ['Impossible...'], win: ['As it has always been.'], loss: ['You... have done the impossible.'], draw: ['Balance is restored.'],
    },
  }),
]


// ---- Fan-made "style" bots inspired by chess streamers and footballers who play.
// Ratings are approximate public online ratings; openings follow lines each is known for
// playing or teaching; chat lines are made up for fun (not real quotes).
export const CELEB_GROUP = 'Streamers & celebrities'
export const CELEBS = [
  bot({
    id: 'kane', name: 'Harry Kane', rating: 1200, color: '#dc052d', style: 'solid', group: CELEB_GROUP,
    tagline: 'England & Bayern striker. Says he is about 1200 in 10-minute games and plays to switch off.',
    look: { skin: 'light', hair: 'short', hairColor: '#8a6a4a', shirt: '#dc052d', mood: 'smile' },
    book: [
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O'],
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Be7', 'O-O', 'O-O'],
      ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'],
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    ],
    chat: {
      hello: ['Right, quick game before training.', 'Chess helps me switch off. Let us play.'],
      takes: ['Back of the net!', 'Clinical.'], lost: ['Should have tracked back there.', 'Fair play.'],
      check: ['Check - shot on target!'], winning: ['We are in control of this one.'], losing: ['Still time for a comeback.'],
      win: ['Three points!'], loss: ['Good game - you deserved that.'], draw: ['A point each. We go again.'],
    },
  }),
  bot({
    id: 'olise', name: 'Michael Olise', rating: 1400, color: '#9e0b2b', style: 'prophylactic', group: CELEB_GROUP,
    tagline: 'Bayern winger and keen player. Quiet, patient, tries to read your plan before you play it.',
    look: { skin: 'deep', hair: 'short', hairColor: '#111', beard: 'stubble', shirt: '#dc052d', mood: 'calm' },
    book: [
      ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O'],
      ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'],
      ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
    ],
    chat: {
      hello: ['...', 'Let us see your plan.'],
      takes: ['Saw it coming.', 'Mm.'], lost: ['Nice.', 'Okay.'],
      check: ['Check.'], winning: ['Patience.'], losing: ['Still a long game.'],
      win: ['Good game.'], loss: ['Well played. Rematch?'], draw: ['Fair result.'],
    },
  }),
  bot({
    id: 'botez', name: 'Alexandra Botez', rating: 2000, color: '#c2185b', style: 'aggressive', botezGambit: true, group: CELEB_GROUP,
    tagline: 'Streamer and WFM. Sharp and fun - and yes, the Botez Gambit might happen.',
    look: { skin: 'light', hair: 'long', hairColor: '#3b2414', earrings: true, shirt: '#c2185b', mood: 'grin' },
    book: [
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5'],
      ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5'],
      ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3', 'Nc6'],
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'],
    ],
    chat: {
      hello: ['Hiii chat! Okay, let us go.', 'Please do not make me Botez Gambit today.'],
      takes: ['Yoink!', 'Thank you very much!'], lost: ['Okay that was a good move.', 'Wait, what?'],
      check: ['Check! Spicy.'], winning: ['Chat, I think I am winning!'], losing: ['This is not looking great...'],
      win: ['GG! Chat, did you see that?'], loss: ['GG, you played really well.'], draw: ['Draw! I will take it.'],
      botez: ['Botez Gambit! ...I meant to do that.', 'Oh no. Not again. The Botez Gambit strikes.'],
    },
  }),
  bot({
    id: 'gotham', name: 'GothamChess', rating: 2300, color: '#1f2a44', style: 'aggressive', group: CELEB_GROUP,
    tagline: 'International Master and the biggest chess YouTuber. London, Vienna and the Caro-Kann.',
    look: { skin: 'light', hair: 'short', hairColor: '#2b1d14', beard: 'stubble', shirt: '#1f2a44', mood: 'grin' },
    book: [
      ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bg3'],
      ['d4', 'Nf6', 'Bf4', 'd5', 'e3', 'c5', 'c3', 'Nc6', 'Nd2', 'e6', 'Ngf3'],
      ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Nf3', 'Be7', 'd4'],
      ['e4', 'e5', 'Nc3', 'Nc6', 'Bc4', 'Nf6', 'd3'],
      ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5'],
      ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6'],
      ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'Bd3', 'Nc6', 'c3', 'Nf6'],
      ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4'],
    ],
    chat: {
      hello: ['Welcome back to another bot battle!', 'Alright, let us see what you have got.'],
      takes: ['And it is just free!', 'He takes!'], lost: ['The rook! ...wait, that was MY rook.', 'Okay, I did not see that.'],
      check: ['Check! The king has to move!'], winning: ['This is looking really, really good.'], losing: ['Hold on, hold on, hold on...'],
      win: ['And that is checkmate. Get out of here!'], loss: ['That was a crushing game. Well played.'], draw: ['A draw. Not what we wanted, but we take those.'],
    },
  }),
  bot({
    id: 'rosen', name: 'Eric Rosen', rating: 2400, color: '#2e7d32', style: 'traps', group: CELEB_GROUP,
    tagline: 'IM and the king of traps. Stafford Gambit, London, and "oh no, my queen".',
    look: { skin: 'light', hair: 'short', hairColor: '#6b4a2b', shirt: '#2e7d32', mood: 'smile' },
    book: [
      ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5', 'Be2', 'h5'],
      ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'Nc3', 'Bc5', 'h3', 'Bxf2+'],
      ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nf3', 'Nxe4'],
      ['e4', 'e5', 'Nf3', 'Nf6', 'Nc3', 'Nc6'],
      ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nd2', 'c5', 'c3', 'Nc6', 'Ngf3', 'Bd6', 'Bg3'],
      ['d4', 'Nf6', 'Bf4', 'g6', 'Nf3', 'Bg7', 'e3', 'O-O', 'Be2', 'd6', 'h3'],
      ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nf6'],
    ],
    chat: {
      hello: ['Hi everyone! Let us have a fun game.', 'Hello! Hopefully nothing tricky happens today...'],
      takes: ['Oh, thank you!', 'I will take that.'], lost: ['Oh no, my queen!', 'Oh no... oh no.'],
      check: ['Check!'], winning: ['Things are going rather well.'], losing: ['Hmm, I need a trick here.'],
      win: ['That was a fun one. Thanks for the game!'], loss: ['Very well played!'], draw: ['A draw - fair enough.'],
      bait: ['Oh no, my queen!', 'Oh no, my rook... or is it?', 'Hmm, is that piece just hanging?'],
    },
  }),
  bot({
    id: 'magnus', name: 'Magnus Carlsen', rating: 2850, color: '#0b3d91', style: 'grinder', group: CELEB_GROUP,
    tagline: 'Five-time world champion. Plays anything, then grinds tiny edges into wins.',
    look: { skin: 'light', hair: 'short', hairColor: '#7a5a3a', shirt: '#0b3d91', mood: 'calm' },
    book: [
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'Re1', 'Nd6'],
      ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6'],
      ['Nf3', 'd5', 'g3', 'Nf6', 'Bg2', 'c6', 'O-O'],
      ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'd5', 'Nc3', 'Be7'],
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3'],
      ['c4', 'e5', 'g3', 'Nf6', 'Bg2', 'd5'],
    ],
    chat: {
      hello: ['Let us play.', 'Okay.'],
      takes: ['Mm.'], lost: ['Hm.'], check: ['Check.'], winning: ['It is just a better endgame.'], losing: ['Interesting.'],
      win: ['Good game.'], loss: ['Well played. Very well played.'], draw: ['Draw.'],
    },
  }),
  bot({
    id: 'hikaru', name: 'Hikaru', rating: 3000, color: '#5b2a86', style: 'speed', fast: true, group: CELEB_GROUP,
    tagline: 'Speed chess legend and streamer. Moves instantly - and might even play the Bongcloud.',
    look: { skin: 'wheat', hair: 'short', hairColor: '#111', shirt: '#5b2a86', mood: 'grin' },
    book: [
      ['e4', 'e5', 'Ke2'],
      ['e4', 'e5', 'Nf3', 'Ke7'],
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'd3'],
      ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5'],
      ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'],
      ['Nf3', 'd5', 'g3', 'c5', 'Bg2', 'Nc6'],
      ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
      ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5'],
    ],
    chat: {
      hello: ['Let us go, chat! Speedrun.', 'Okay, I am just going to play fast.'],
      takes: ['And it is just winning.', 'Takes takes takes.'], lost: ['Ah, I just blundered. Whatever.', 'Okay, okay.'],
      check: ['Check. Easy game.'], winning: ['This is completely winning, chat.'], losing: ['Wait, what? What is this?'],
      win: ['Easy. Next.'], loss: ['GG. That was actually really well played.'], draw: ['Draw. Okay.'],
      bongcloud: ['Bongcloud!', 'King to e2. Yes, really.'],
    },
  }),
]

export const ALL_BOTS = [...BOTS, ...CELEBS]

export const pick = (list) => list[Math.floor(Math.random() * list.length)]

/** Score a line from the side to move, in centipawns (mates as big numbers). */
const cpOf = (l) => (l.mate != null ? (l.mate > 0 ? 100000 - l.mate * 100 : -100000 - l.mate * 100) : l.cp)

/**
 * Chooses the bot's move. The engine gives its top few lines; weaker bots pick from a wider
 * band of "good enough" moves, sometimes make an outright blunder, and favour their style.
 */
/** Next move from the bot's opening book, if the game so far matches one of its lines. */
function bookMove(bot, history, turn) {
  const book = bot.bookByColor ? bot.bookByColor[turn] : bot.book
  if (!book || !history) return null
  const lines = book.filter((l) => l.length > history.length && history.every((m, i) => l[i] === m))
  if (!lines.length) return null
  const san = pick(lines)[history.length]
  try { return replay(history, san) } catch { return null }
}
function replay(history, san) {
  const c = new Chess()
  for (const m of history) c.move(m)
  return c.move(san)
}

/** Would this move leave one of the mover's pieces looking "free"? (attacked and undefended,
 * or attacked by something cheaper) - the bait in a trap. */
function baitPiece(fenAfter, mover) {
  const c = new Chess(fenAfter)
  const opp = mover === 'w' ? 'b' : 'w'
  let best = null
  for (const row of c.board()) for (const p of row) {
    if (!p || p.color !== mover || p.type === 'k' || p.type === 'p') continue
    const att = c.attackers(p.square, opp)
    if (!att.length) continue
    const cheapest = Math.min(...att.map((sq) => VAL[c.get(sq).type]))
    if (!c.attackers(p.square, mover).length || cheapest < VAL[p.type]) if (!best || VAL[p.type] > VAL[best.type]) best = p
  }
  return best
}

/**
 * Chooses the bot's move. `history` (SAN list) lets bots follow their opening book;
 * `state` is a per-game object for one-off tricks (the Botez Gambit). The returned move
 * may carry `say` - something the bot wants to say about it.
 */
export async function chooseBotMove(engine, fen, bot, history = null, state = {}) {
  const c = new Chess(fen)
  state.lastEval = null
  const legal = c.moves({ verbose: true })
  if (legal.length === 1) return legal[0]
  const fromBook = bookMove(bot, history, c.turn())
  state.fromBook = null
  if (fromBook && bot.bookByColor) {
    const lines = bot.bookByColor[c.turn()].filter((l) => l.length > history.length && history.every((m, i) => l[i] === m))
    state.fromBook = { n: lines.filter((l) => l[history.length] === fromBook.san).length, total: lines.length }
  }
  if (fromBook) {
    if (fromBook.piece === 'k' && !fromBook.san.startsWith('O') && bot.chat.bongcloud) fromBook.say = pick(bot.chat.bongcloud)
    return fromBook
  }
  // the Botez Gambit: once a game, in the middlegame, leave the queen where it can be taken
  if (bot.botezGambit && !state.botezDone && history && history.length > 14 && Math.random() < 0.05) {
    const hang = legal.filter((m) => m.piece === 'q' && !m.captured).find((m) => {
      const a = new Chess(fen); a.move(m)
      return a.attackers(m.to, c.turn() === 'w' ? 'b' : 'w').length && !a.isCheck()
    })
    if (hang) { state.botezDone = true; hang.say = pick(bot.chat.botez); return hang }
  }
  if (bot.blunder && Math.random() < bot.blunder) {
    // a "human" blunder: a random legal move that isn't instantly suicidal for very low bots
    const m = pick(legal)
    return m
  }
  const { lines } = await engine.evaluate(fen, bot.depth)
  const valid = lines.filter((l) => l.pv?.length)
  if (!valid.length) return pick(legal)
  const best = cpOf(valid[0])
  state.lastEval = Math.max(-2000, Math.min(2000, best)) // from the bot's side, before its move
  // a forced mate is never thrown away by the stronger bots
  if (valid[0].mate > 0 && bot.rating >= 1000) return toMove(c, valid[0].pv[0])
  const pool = valid.filter((l) => best - cpOf(l) <= bot.margin)
  const weighted = pool.map((l) => {
    const m = toMove(new Chess(fen), l.pv[0])
    let w = 1 + Math.max(0, bot.margin - (best - cpOf(l))) / Math.max(1, bot.margin) // better moves likelier
    if (bot.style === 'aggressive' && m && (m.san.includes('+') || m.captured)) w *= 2.2
    if (bot.style === 'knights' && m && m.piece === 'n') w *= 2
    if (bot.style === 'solid' && m && !m.captured && !m.san.includes('+')) w *= 1.4
    if (bot.style === 'pawns' && m && m.piece === 'p') w *= 2
    if (bot.style === 'trader' && m && m.captured && m.captured !== 'p') w *= 2.5
    if (bot.style === 'positional' && l === valid[0]) w *= 2.5
    if ((bot.style === 'grinder' || bot.style === 'speed') && l === valid[0]) w *= 6
    if (bot.style === 'grinder' && m && m.captured && m.captured !== 'p') w *= 1.6 // happy to trade into a better endgame
    if (bot.style === 'prophylactic' && m && !m.captured && !m.san.includes('+') && l.pv.length > 1) w *= 1.5
    if (bot.style === 'traps' && m) {
      const after = new Chess(fen)
      after.move({ from: m.from, to: m.to, promotion: m.promotion })
      const bait = baitPiece(after.fen(), m.color)
      if (bait) { w *= 4; m.bait = bait }
    }
    if (bot.style === 'best' && l === valid[0]) w *= 1000
    return { m, w }
  }).filter((x) => x.m)
  const total = weighted.reduce((s, x) => s + x.w, 0)
  let r = Math.random() * total
  for (const x of weighted) {
    r -= x.w
    if (r <= 0) {
      if (x.m.bait && bot.chat.bait) x.m.say = pick(bot.chat.bait)
      return x.m
    }
  }
  return weighted[0]?.m || pick(legal)
}

function toMove(c, uci) {
  try { return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }) } catch { return null }
}

/** Material balance from `color`'s side (for chat reactions). */
export function materialFor(fen, color) {
  let t = 0
  for (const ch of fen.split(' ')[0]) {
    const low = ch.toLowerCase()
    if (VAL[low] == null) continue
    t += ((ch !== low) === (color === 'w') ? 1 : -1) * VAL[low]
  }
  return t
}

// ---- which bots you have beaten (saved in this browser)
const KEY = 'smc-bots-beaten'
export function getBeaten() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
export function markBeaten(id) {
  const b = getBeaten()
  b[id] = (b[id] || 0) + 1
  try { localStorage.setItem(KEY, JSON.stringify(b)) } catch { /* ignore */ }
  return b
}
