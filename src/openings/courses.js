// Opening courses for the trainer. Each course has a few main lines (SAN moves from the
// start); when you practise, the opponent picks among the lines that still match the game,
// so you meet different variations. `notes` explain the idea behind YOUR moves.

// notes for moves that appear in many openings
export const COMMON_NOTES = {
  e4: 'Grab the centre and open lines for your queen and bishop.',
  d4: 'Claim the centre with the queen pawn.',
  Nf3: 'Develop toward the centre and control e5 and d4.',
  Nc3: 'Develop and add control of the centre.',
  'O-O': 'Castle - king safe, rook in the game.',
}

import { MORE_COURSES } from './moreCourses'
import { YOUR_COURSES } from './yourCourses'

const L = (name, moves) => ({ name, moves: moves.split(' ') })

export const COURSES = [
  // ------------------------------------------------------------------ White
  {
    id: 'italian', name: 'Italian Game', side: 'w', level: 'Beginner',
    blurb: 'Quick development, bishop aimed at f7 and a safe king. The classic first opening.',
    lines: [
      L('Giuoco Piano', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O'),
      L('Two Knights, quiet', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3'),
      L('Two Knights, Ng5 attack', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2'),
    ],
    notes: {
      e4: 'Grab the centre and open lines for your queen and light-squared bishop.',
      Nf3: 'Develop with tempo - the knight attacks the e5 pawn.',
      Bc4: 'The bishop points at f7, the weakest square around Black\'s king.',
      c3: 'Prepares d4 later to build a big pawn centre.',
      d3: 'Solid: supports e4 and opens the dark-squared bishop.',
      'O-O': 'King safety first - your rook joins the game too.',
      Re1: 'The rook backs up the e4 pawn and the centre.',
      Ng5: 'Double attack on f7 together with the bishop - Black must react.',
      exd5: 'Win a pawn back and keep pressure on f7.',
      'Bb5+': 'Check, keeping the bishop active and the extra pawn.',
      dxc6: 'Take the pawn - you will be a pawn up.',
      Be2: 'Retreat safely; you keep the extra pawn.',
    },
  },
  {
    id: 'ruy', name: 'Ruy Lopez', side: 'w', level: 'Intermediate',
    blurb: 'Pressure on the knight that defends e5. Rich, strategic and played at every level.',
    lines: [
      L('Closed Ruy Lopez', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3'),
      L('Berlin Defence', 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 Re1 Nd6 Nxe5 Be7 Bf1 Nxe5 Rxe5 O-O d4'),
      L('Exchange Variation', 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4'),
    ],
    notes: {
      Bb5: 'Attack the knight that defends e5 - a slow but lasting pressure.',
      Ba4: 'Keep the pin; don\'t give up the bishop for free.',
      'O-O': 'Castle early - the e4 pawn is indirectly defended.',
      Re1: 'Defend e4 and prepare to win back material on the e-file.',
      Bb3: 'The bishop stays on the a2-g8 diagonal, eyeing f7.',
      c3: 'Prepare d4 and give the bishop a retreat on c2.',
      h3: 'Stop ...Bg4 pinning your knight before you play d4.',
      Nxe5: 'Win back the pawn.',
      Bf1: 'Tuck the bishop back - it guards your king and the e-file is yours.',
      Rxe5: 'Recapture; your rook is active in the centre.',
      d4: 'Take the centre with a pawn.',
      Bxc6: 'Give up the bishop to damage Black\'s pawns - you aim for a better endgame.',
    },
  },
  {
    id: 'london', name: 'London System', side: 'w', level: 'Beginner',
    blurb: 'The same setup against almost anything: d4, Bf4, e3, c3. Easy to learn, solid to play.',
    lines: [
      L('Against ...d5 and ...c5', 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3'),
      L('Against the King\'s Indian setup', 'd4 Nf6 Bf4 g6 Nf3 Bg7 e3 O-O Be2 d6 h3'),
      L('Against early ...c5', 'd4 d5 Bf4 c5 e3 Nc6 c3 Nf6 Nd2 e6 Ngf3'),
    ],
    notes: {
      d4: 'Claim the centre with the queen\'s pawn.',
      Bf4: 'Develop the bishop BEFORE e3 so it isn\'t locked in.',
      e3: 'Support d4 and open the light-squared bishop.',
      Nf3: 'Natural development, controlling e5.',
      c3: 'The pyramid: c3-d4-e3 makes your centre rock solid.',
      Nbd2: 'Develop while keeping c3 for the pawn and supporting e4 later.',
      Nd2: 'Develop while keeping c3 for the pawn.',
      Ngf3: 'Finish developing your knights.',
      Bg3: 'Keep the bishop when it is challenged - trading would help Black.',
      Bd3: 'The bishop points at Black\'s king side.',
      Be2: 'Modest but safe; you castle next.',
      h3: 'Make a bolt-hole for the bishop and stop ...Ng4 / ...Bg4.',
    },
  },
  {
    id: 'qgd', name: 'Queen\'s Gambit', side: 'w', level: 'Intermediate',
    blurb: 'Offer the c-pawn to win the centre. One of the oldest and most respected openings.',
    lines: [
      L('Declined', 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4'),
      L('Accepted', 'd4 d5 c4 dxc4 e3 Nf6 Bxc4 e6 Nf3 c5 O-O'),
      L('Slav Defence', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4'),
    ],
    notes: {
      c4: 'The gambit: you offer a pawn to pull Black\'s d-pawn away from the centre.',
      Nc3: 'Pile up on d5.',
      Bg5: 'Pin the knight that defends d5.',
      e3: 'Open the bishop and prepare to win back c4 if it is taken.',
      Nf3: 'Develop and control e5.',
      Bh4: 'Keep the pin.',
      Bxc4: 'Win the pawn back with a well-placed bishop.',
      'O-O': 'King safe, development done.',
      a4: 'Stop ...b5, which would let Black keep the extra pawn.',
    },
  },
  {
    id: 'vienna', name: 'Vienna Game', side: 'w', level: 'Intermediate',
    blurb: 'Nc3 first, then a quick f4 - an aggressive 1.e4 e5 weapon that sets lots of traps.',
    lines: [
      L('Vienna Gambit', 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3'),
      L('Against ...Nc6', 'e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 f4 d6 Nf3'),
      L('Against ...Bc5', 'e4 e5 Nc3 Bc5 Nf3 d6 d4 exd4 Nxd4 Nf6 Bg5'),
    ],
    notes: {
      Nc3: 'Develop and keep the f-pawn free to advance.',
      f4: 'Strike at e5 - open the f-file for an attack.',
      fxe5: 'Gain space; Black\'s knight gets chased.',
      Nf3: 'Develop and support the e5 pawn.',
      d4: 'Big centre.',
      Bd3: 'Challenge the strong knight on e4 and aim at h7.',
      Bc4: 'Point the bishop at f7.',
      d3: 'Solid, supports e4 before f4.',
      Nxd4: 'Recapture with a centralised knight.',
      Bg5: 'Pin the knight.',
    },
  },
  {
    id: 'scotch', name: 'Scotch Game', side: 'w', level: 'Intermediate',
    blurb: 'Open the centre straight away with d4 - clear plans and active pieces.',
    lines: [
      L('Main line ...Nf6', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4'),
      L('Classical ...Bc5', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4'),
    ],
    notes: {
      d4: 'Open the centre immediately.',
      Nxd4: 'Recapture - your knight is strong in the middle.',
      Nxc6: 'Trade and damage Black\'s pawn structure.',
      e5: 'Kick the knight and gain space.',
      Qe2: 'Pin the e-pawn and protect e5.',
      c4: 'Chase the knight away from its great square.',
      Be3: 'Defend the knight on d4.',
      c3: 'Reinforce d4.',
      Bc4: 'Develop actively.',
    },
  },

  // ------------------------------------------------------------------ Black
  {
    id: 'sicilian', name: 'Sicilian Najdorf', side: 'b', level: 'Advanced',
    blurb: 'The most popular reply to 1.e4. Unbalanced and ambitious - you play to win.',
    lines: [
      L('English Attack', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7'),
      L('6.Bg5 main line', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7'),
      L('Moscow Variation', 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 O-O Nc6 c3 Nf6'),
      L('Alapin', 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6'),
    ],
    notes: {
      c5: 'Fight for d4 from the side - the position becomes unbalanced from move one.',
      d6: 'Control e5 and open your light-squared bishop.',
      cxd4: 'Trade a side pawn for White\'s centre pawn.',
      Nf6: 'Develop and hit the e4 pawn.',
      a6: 'The Najdorf move: keeps knights and bishops off b5 and prepares ...e5 or ...b5.',
      e5: 'Kick the knight and claim the d4 square.',
      'Be6': 'Develop and control d5.',
      Be7: 'Prepare to castle.',
      e6: 'Solid, keeps d5 under control.',
      Qc7: 'Connect your pieces and watch e5.',
      Bd7: 'Block the check and offer a trade.',
      Qxd7: 'Recapture and develop.',
      Nc6: 'Develop toward the centre.',
      Nd5: 'Centralised knight, hard to dislodge.',
    },
  },
  {
    id: 'caro', name: 'Caro-Kann Defence', side: 'b', level: 'Beginner',
    blurb: '...c6 and ...d5: a rock-solid answer to 1.e4 where your light bishop gets out first.',
    lines: [
      L('Advance Variation', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6'),
      L('Classical', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7'),
      L('Exchange Variation', 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4'),
    ],
    notes: {
      c6: 'Prepare ...d5 with a pawn behind it.',
      d5: 'Challenge White\'s centre straight away.',
      Bf5: 'Get the light-squared bishop out BEFORE ...e6 locks it in.',
      e6: 'Solid pawn chain; your bishop is already outside.',
      c5: 'Hit the base of White\'s pawn chain.',
      Nc6: 'Pile up on d4.',
      dxe4: 'Trade off White\'s centre pawn.',
      Bg6: 'Keep the bishop when it is attacked.',
      h6: 'Give the bishop a safe home on h7.',
      Nd7: 'Prepare ...Ngf6 without allowing doubled pawns.',
      Bh7: 'The bishop is safe and still aims at White\'s queenside.',
      cxd5: 'Recapture toward the centre.',
      Nf6: 'Develop and defend.',
      Bg4: 'Pin the knight and pressure d4.',
    },
  },
  {
    id: 'french', name: 'French Defence', side: 'b', level: 'Intermediate',
    blurb: '...e6 and ...d5: a solid wall, then counter-attack White\'s pawn chain.',
    lines: [
      L('Advance Variation', 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4'),
      L('Winawer', 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7'),
      L('Exchange Variation', 'e4 e6 d4 d5 exd5 exd5 Bd3 Bd6 Nf3 Nf6 O-O O-O'),
    ],
    notes: {
      e6: 'Prepare ...d5 with a solid pawn behind it.',
      d5: 'Challenge e4.',
      c5: 'Attack the base of White\'s pawn chain.',
      Nc6: 'Pressure d4.',
      Qb6: 'Pile up on d4 and b2.',
      c4: 'Gain queenside space and fix White\'s pawns.',
      Bb4: 'Pin the knight that defends e4.',
      'Bxc3+': 'Give the bishop to wreck White\'s pawns.',
      Ne7: 'The knight heads for f5 or c6 without blocking your f-pawn.',
      exd5: 'Symmetrical, but easy to play.',
      Bd6: 'Mirror White\'s development.',
      Nf6: 'Develop.',
      'O-O': 'Castle.',
    },
  },
  {
    id: 'scandi', name: 'Scandinavian Defence', side: 'b', level: 'Beginner',
    blurb: '1...d5! Hit e4 immediately - simple plans and easy development.',
    lines: [
      L('Main line ...Qa5', 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6'),
      L('Modern ...Qd6', 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6'),
      L('If White pushes e5', 'e4 d5 e5 Bf5 d4 e6 Nf3 c5'),
    ],
    notes: {
      d5: 'Attack e4 straight away.',
      Qxd5: 'Recapture - the queen comes out early, but it can\'t easily be trapped.',
      Qa5: 'A safe square that pins the c3 knight.',
      Qd6: 'Modern square - safe and flexible.',
      Nf6: 'Develop.',
      Bf5: 'Bishop out before ...e6.',
      e6: 'Solid pawn wall.',
      c6: 'Gives the queen a retreat and controls d5.',
      a6: 'Keep White\'s pieces off b5.',
      c5: 'Hit White\'s centre.',
    },
  },
  {
    id: 'kid', name: 'King\'s Indian Defence', side: 'b', level: 'Advanced',
    blurb: 'Let White build a centre, then attack it - and later White\'s king.',
    lines: [
      L('Classical', 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7'),
      L('Sämisch', 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 Nh5'),
      L('Against the London', 'd4 Nf6 Nf3 g6 Bf4 Bg7 e3 O-O Be2 d6 h3'),
    ],
    notes: {
      Nf6: 'Develop and stop e4 for now.',
      g6: 'Prepare the fianchetto.',
      Bg7: 'The bishop rakes the long diagonal.',
      d6: 'Control e5 and prepare ...e5.',
      'O-O': 'Castle early.',
      e5: 'Strike at White\'s centre.',
      Nc6: 'Pressure d4.',
      Ne7: 'Reroute the knight toward f5 or g6 to support ...f5.',
      Nh5: 'Prepare ...f5 to attack.',
    },
  },
  {
    id: 'stafford', name: 'Stafford Gambit', side: 'b', level: 'Beginner',
    blurb: 'A cheeky pawn sacrifice full of traps against 2.Nf3. Great fun in blitz.',
    lines: [
      L('Main trap line', 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5'),
      L('White plays Nc3', 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 Nc3 Bc5 Be2 Qd4 O-O Ng4'),
      L('White pushes e5', 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5 Ne4 d3 Bc5'),
    ],
    notes: {
      e5: 'Mirror White in the centre.',
      Nf6: 'Petrov-style: counter-attack e4 instead of defending e5.',
      Nc6: 'The gambit! You offer a pawn for fast development.',
      dxc6: 'Recapture toward the centre - your bishop and queen open up.',
      Bc5: 'Aim at f2, the weak point near White\'s king.',
      h5: 'Stop Bg5 and prepare ...Ng4 tricks.',
      Qd4: 'Double attack on f2 with the bishop.',
      Ng4: 'Join the attack on f2 and h2.',
      Ne4: 'Centralised knight with threats on f2.',
    },
  },
]

COURSES.push(...MORE_COURSES, ...YOUR_COURSES)

// ---- progress (which lines you have practised without mistakes), kept in this browser
const KEY = 'smc-openings-v1'
export function getProgress() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
export function markLine(courseId, lineName, clean) {
  const p = getProgress()
  const c = (p[courseId] ||= {})
  const prev = c[lineName] || { tries: 0, clean: 0 }
  c[lineName] = { tries: prev.tries + 1, clean: prev.clean + (clean ? 1 : 0) }
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ }
  return p
}
export const mastered = (p, course) => course.lines.filter((l) => p[course.id]?.[l.name]?.clean > 0).length
