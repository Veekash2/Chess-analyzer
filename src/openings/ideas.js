// "Key ideas" for each course: if you remember the plan, you can work out a move you forgot.
// setup = where your pieces go, plan = what you're aiming for, break = the pawn move that opens
// the game for you, watch = the trap or danger to remember.

import { YOUR_IDEAS } from './yourCourses'
import { DEEP_IDEAS } from './deepCourses'

export const IDEAS = {
  ...YOUR_IDEAS,
  // ------------------------------------------------------------------ White
  italian: {
    setup: 'Knight f3, bishop c4 (aiming at f7), pawns c3 + d3, castle short, rook to e1.',
    plan: 'Slow build-up: play Nbd2-f1-g3 and h3, then expand with d4 or a kingside attack.',
    break: 'd3-d4, prepared by c3, to grab the centre once you are castled.',
    watch: 'Two Knights, 4.Ng5 d5 5.exd5: if Black takes back ...Nxd5, d4 or the Fried Liver (Nxf7) punishes it. Against ...Na5, Bb5+ keeps the extra pawn.',
  },
  ruy: {
    setup: 'Bishop b5 pinning the c6 knight, castle, Re1, c3 + h3, bishop drops back to b3/c2.',
    plan: 'Build d4 with c3 and h3 (stopping ...Bg4), then reroute the queen knight Nbd2-f1-g3.',
    break: 'd2-d4 supported by c3, keeping the e4 pawn strong.',
    watch: 'The Noah\'s Ark trap: after ...a6, ...b5 and ...c5-c4, your b3 bishop can get trapped. Keep a retreat to c2.',
  },
  london: {
    setup: 'd4, Bf4 early, then e3, c3, Bd3, Nf3, Nbd2 and castle. Same set-up against almost anything.',
    plan: 'Put a knight on e5 and attack on the kingside (Qf3/Qh5, g4-g5), or play for the e3-e4 break.',
    break: 'e3-e4 in the centre, or c3-c4 against ...c5 set-ups.',
    watch: 'Black\'s ...Qb6 hits b2: answer with Qb3 or Qc1, don\'t let the b-pawn fall. Against ...Nh5 keep the bishop with Bg3/Be5.',
  },
  qgd: {
    setup: 'd4 and c4, knights to c3 and f3, bishop to g5 pinning the f6 knight, e3 and Bd3.',
    plan: 'Pressure d5 and the queenside: the minority attack (b4-b5) against Black\'s c6/d5 pawns is the classic plan.',
    break: 'b2-b4-b5 (minority attack), or e3-e4 in the centre.',
    watch: 'Against the Accepted, don\'t try to keep a pawn with b3 - just play e3 and Bxc4 and take it back.',
  },
  vienna: {
    setup: 'Nc3 instead of Nf3, then f4 (the gambit) or Bc4. Aggressive, kingside-focused.',
    plan: 'Use the f-file: f4, fxe5 and Nf3, castle and attack f7/the kingside.',
    break: 'f2-f4, the whole point of Nc3 first.',
    watch: 'If Black plays ...Bc5, f4 is too risky (the bishop eyes your king) - develop with Bc4 or Nf3 first.',
  },
  scotch: {
    setup: 'Open the centre at once with d4, take back with the knight on d4, develop fast.',
    plan: 'Use your extra central space; in the Nf6 main line, Nxc6 and e5 kick the f6 knight and gain time.',
    break: 'd2-d4 on move 3 - the centre opens straight away.',
    watch: 'After ...Bc5 your d4 knight is attacked twice: Be3 or Nxc6 then Qf3/Be3. Don\'t leave it hanging.',
  },
  ponziani: {
    setup: 'Nf3 then c3 to prepare d4, a surprise weapon. Queen often comes to a4 or d4.',
    plan: 'Build a big pawn centre with c3 + d4 and push d5 to kick the c6 knight.',
    break: 'c2-c3 then d2-d4.',
    watch: 'Black\'s best reply is ...d5 or ...Nf6 hitting e4. Know the Jaenisch line - don\'t lose the e4 pawn for nothing.',
  },
  english: {
    setup: 'c4, Nc3, g3 and Bg2: a reversed Sicilian, playing on the light squares.',
    plan: 'Pressure d5 and the long diagonal; expand on the queenside with Rb1, b4-b5.',
    break: 'b2-b4 queenside expansion, or d2-d4 to transpose into d4 openings.',
    watch: 'Against ...e5 and ...d5, Black gets a big centre - hit it with Bg2, Nf3 and d3/d4, don\'t let it roll.',
  },
  kingsgambit: {
    setup: 'f4 offers a pawn to open the f-file and pull Black\'s e-pawn away from the centre.',
    plan: 'Fast development, take the centre with d4, attack f7 and use the open f-file.',
    break: 'f2-f4 on move 2, then d2-d4.',
    watch: 'After ...exf4 Nf3 g5, h4 breaks Black\'s pawn chain. Watch ...Qh4+ if you play Bc4 first without Nf3.',
  },
  evans: {
    setup: 'Italian set-up plus b4: a pawn sacrifice to win time for c3 and d4.',
    plan: 'Gain tempi on the bishop, build c3 + d4, castle and attack f7 and the black king.',
    break: 'b2-b4, then c3 and d4.',
    watch: 'If Black declines with ...Bb6, play a4 to gain space - don\'t keep giving pawns.',
  },
  catalan: {
    setup: 'd4, c4, then g3 and Bg2: the bishop on the long diagonal x-rays the queenside.',
    plan: 'Even if Black takes on c4, you win it back (Qc2/Qa4) and press on the long diagonal.',
    break: 'e2-e4 later, or simply pressure with Qc2, Rd1 and the Bg2.',
    watch: 'In the Open Catalan, don\'t rush to win c4 - development first; Qa4+ or Qc2 picks it up.',
  },
  // ------------------------------------------------------------------ Black
  sicilian: {
    setup: '...c5, ...d6, ...Nf6, ...a6 (the Najdorf move), then ...e5 or ...e6.',
    plan: 'Counter-attack on the queenside with ...b5 and the half-open c-file; fight for d5.',
    break: '...d6-d5 at the right moment, or ...b5-b4 on the queenside.',
    watch: 'The d5 square: if White gets a knight there for free, you\'re worse. ...Be6 and ...Nbd7 keep it covered.',
  },
  dragon: {
    setup: '...c5, ...d6, ...g6 and ...Bg7: the dragon bishop on the long diagonal.',
    plan: 'Race on the queenside: ...Rc8, ...Ne5-c4, exchange sacrifice on c3, open lines at White\'s king.',
    break: '...b5 pawn storm, and ...d5 in the centre if allowed.',
    watch: 'In the Yugoslav Attack, White plays Bh6 to swap your dragon bishop and h4-h5. Be fast - every tempo counts.',
  },
  caro: {
    setup: '...c6 and ...d5, light-squared bishop out to f5 BEFORE ...e6.',
    plan: 'Solid structure, then hit White\'s centre with ...c5 (Advance) or ...Nd7/...Ngf6 (Classical).',
    break: '...c6-c5 against the Advance; ...e5 or ...c5 in the Classical.',
    watch: 'Against the Advance, don\'t play ...e6 before ...Bf5 - you\'d lock your bishop in.',
  },
  french: {
    setup: '...e6 and ...d5. Accept a locked centre and attack its base.',
    plan: 'Attack the d4/e5 chain with ...c5, ...Nc6 and ...Qb6; later ...f6.',
    break: '...c7-c5 (always), and ...f7-f6.',
    watch: 'Your light-squared bishop on c8 is the "bad" piece - plan ...b6 and ...Ba6, or ...Bd7-e8-h5.',
  },
  scandi: {
    setup: '...d5 at once, recapture with the queen, then ...Qa5 (or ...Qd6), ...Nf6, ...Bf5, ...c6, ...e6.',
    plan: 'Easy development with a solid Caro-like structure; your queen is safe on a5/d6.',
    break: '...c6-c5 or ...e6-e5 later.',
    watch: 'Watch for White\'s Bd2 and Nd5 tricks hitting your queen on a5, and Nb5 against ...Qd6.',
  },
  kid: {
    setup: '...Nf6, ...g6, ...Bg7, ...d6 and castle. Let White take the centre, then hit back.',
    plan: 'Close the centre, then storm the kingside: ...Ne8/...Nd7, ...f5, ...f4, ...g5.',
    break: '...e7-e5, then ...f7-f5.',
    watch: 'While you attack on the kingside, White races with c5 on the queenside - be quicker.',
  },
  stafford: {
    setup: 'A gambit: after Nxe5 you play ...Nc6!? giving a pawn for fast development and traps.',
    plan: 'Open lines with ...dxc6, bishops to c5 and d6, and go after f2 and White\'s king with ...h5-Ng4.',
    break: '...h7-h5 and ...Ng4.',
    watch: 'It\'s a trap opening: against careful defence (d3, Be2, Nc3) it\'s just a pawn down. Know the main traps cold.',
  },
  petrov: {
    setup: '...Nf6 mirrors White: counter-attack e4 instead of defending e5.',
    plan: 'Solid and symmetrical: develop, castle and equalise. Great for avoiding opening theory fights.',
    break: '...d6-d5 in the centre, ...c5 against d4.',
    watch: 'After Nxe5, NEVER take back with ...Nxe4 at once - Qe2 wins. Play ...d6 first, then ...Nxe4.',
  },
  pirc: {
    setup: '...d6, ...Nf6, ...g6, ...Bg7, castle. Let White build a centre, then attack it.',
    plan: 'Hit the centre with ...c5 or ...e5; in the Austrian Attack use ...Na6-c7 or ...c5.',
    break: '...c7-c5 or ...e7-e5.',
    watch: 'Against the Austrian Attack (f4) and the 150 Attack (Be3, Qd2, Bh6) White attacks fast - don\'t waste moves.',
  },
  alekhine: {
    setup: '...Nf6 tempts the e-pawn forward; the knight retreats to d5/b6.',
    plan: 'Let White over-extend, then attack the advanced pawns with ...d6, ...Bg4 and ...c5.',
    break: '...d7-d6 and ...c7-c5.',
    watch: 'In the Four Pawns Attack White gets a huge centre - you must hit it straight away or get crushed.',
  },
  nimzo: {
    setup: '...Nf6, ...e6, ...Bb4 pinning the c3 knight to control e4.',
    plan: 'Fight for e4; often give the bishop for the knight to double White\'s c-pawns.',
    break: '...c7-c5 or ...d7-d5.',
    watch: 'Against 4.Qc2 White avoids doubled pawns - castle and play ...d5 or ...c5 quickly.',
  },
  grunfeld: {
    setup: '...Nf6, ...g6 and ...d5: let White take the centre with e4, then attack it with pieces.',
    plan: 'Bg7 hits d4, then ...c5, ...Nc6, ...Qa5 or ...Bg4 put maximum pressure on White\'s centre.',
    break: '...c7-c5 straight away.',
    watch: 'In the Exchange, the d4 pawn is the target - if White over-protects it, switch to the queenside c-file.',
  },
  dutch: {
    setup: '...f5 grabs e4; Leningrad set-up with ...Nf6, ...g6, ...Bg7, ...d6 and castle.',
    plan: 'Kingside play with ...Qe8-h5, ...e5 and ...f4.',
    break: '...e7-e5 (prepared by ...Qe8 or ...Nc6).',
    watch: 'The Staunton Gambit (e4) hits f5 early - know your line. Your king is a bit airy after ...f5.',
  },
  qgdblack: {
    setup: '...d5 and ...e6, ...Nf6, ...Be7 and castle: solid, classical defence.',
    plan: 'Free your game with ...c5 or ...e5, then develop the c8 bishop (often ...b6 and ...Bb7).',
    break: '...c7-c5 or ...e6-e5.',
    watch: 'The c8 bishop is easily shut in - plan its development (...b6 + ...Bb7, or ...dxc4 then ...b5 + ...Bb7).',
  },
}

// the full courses come with fuller key ideas
Object.assign(IDEAS, DEEP_IDEAS)
