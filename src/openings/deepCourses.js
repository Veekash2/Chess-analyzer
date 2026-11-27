// Full repertoire courses for the two openings that suit you best: the Vienna (White) and the
// Scandinavian (Black). Lines are grouped in chapters ("Chapter: line"); every line was checked
// for legality and every move you play was checked with Stockfish (scripts/check-courses.mjs).
const L = (name, moves) => ({ name, moves: moves.split(' ') })

export const VIENNA_FULL = {
  id: 'vienna', name: 'Vienna Game - full course', side: 'w', level: 'Intermediate', full: true,
  blurb: 'A complete attacking repertoire after 1.e4 e5: 2.Nc3 and the Vienna Gambit, with answers to every main Black reply and the traps that win games.',
  lines: [
    // Chapter 1: Vienna Gambit, 2...Nf6 3.f4 d5 (main line)
    L('Gambit 3...d5: main line 6.Qe2', 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 Qe2 Nxc3 dxc3 c5 Bf4 Nc6 O-O-O'),
    L('Gambit 3...d5: 5...Be7 6.d4 set-up', 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3 f5 exf6 Bxf6 O-O'),
    L('Gambit 3...d5: 5...Bg4', 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Bg4 Qe2 Nxc3 dxc3 Nc6 Bf4 Be7 O-O-O'),
    L('Gambit 3...d5: 5...Nc6', 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Nc6 Bb5 Bc5 d4 Bb4 O-O'),
    L('Gambit 3...d5: 4...Ng4?! hits e5', 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Ng4 d4 Nc6 Nf3 Bb4 exd5'),
    // Chapter 2: Vienna Gambit, other 3rd moves
    L('Gambit 3...exf4: push e5', 'e4 e5 Nc3 Nf6 f4 exf4 e5 Ng8 Nf3 d6 d4 dxe5 Qe2 Be7 dxe5'),
    L('Gambit 3...exf4 4...Qe7', 'e4 e5 Nc3 Nf6 f4 exf4 e5 Qe7 Qe2 Ng8 Nf3 g5 Nd5'),
    L('Gambit 3...d6', 'e4 e5 Nc3 Nf6 f4 d6 Nf3 Nc6 Bc4 Be7 d3 O-O O-O'),
    L('Gambit 3...d6 4...exf4', 'e4 e5 Nc3 Nf6 f4 d6 Nf3 exf4 d4 Be7 Bxf4 O-O Bd3'),
    // Chapter 3: Black avoids ...Nf6
    L('2...Nc6: Bc4 and f4', 'e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 f4 d6 Nf3 O-O f5'),
    L('2...Nc6 3...Bc5: Qg4 trick', 'e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 g6 Qf3 Nf6 Nge2'),
    L('2...Bc5: Nf3 and d4', 'e4 e5 Nc3 Bc5 Nf3 d6 d4 exd4 Nxd4 Nf6 Bg5 h6 Bh4'),
    L('2...d6: f4 again', 'e4 e5 Nc3 d6 f4 Nf6 Nf3 Nc6 Bb5 Bd7 d3'),
    L('2...Bb4: develop and castle', 'e4 e5 Nc3 Bb4 Nf3 d6 d4 exd4 Nxd4 Nf6 Bd3 O-O O-O'),
  ],
  notes: {
    Nc3: 'Develop and keep the f-pawn free - the Vienna idea is f2-f4 next.',
    f4: 'Strike at e5 and open the f-file towards Black\'s king.',
    fxe5: 'Take the pawn and gain space - the e5 pawn cramps Black\'s pieces.',
    Nf3: 'Develop, protect e5 and get ready to castle.',
    Qe2: 'Pin the e4 knight to the e-file - Black has to deal with it now.',
    dxc3: 'Recapture towards the centre: open d-file for your rook after long castling.',
    Bf4: 'Protect e5 and develop - next you castle long.',
    'O-O-O': 'Castle long: rook straight onto the open d-file.',
    d4: 'Build a big pawn centre behind e5.',
    Bd3: 'Challenge the e4 knight and aim at h7.',
    exf6: 'Take en passant to open the f-file for your rook.',
    'O-O': 'Castle - your rook lands on the half-open f-file.',
    Bb5: 'Pin the c6 knight and keep pressure on e5... and the e4 knight loses its support.',
    e5: 'Push on - the f6 knight has to go back to g8.',
    dxe5: 'Recapture: big centre and Black\'s pieces are passive.',
    Bc4: 'Aim the bishop at f7, the weakest square.',
    d3: 'Solid: support e4 before the f4 break.',
    Bxf4: 'Win the gambit pawn back with a developed bishop.',
    f5: 'Gain kingside space and shut in Black\'s c8 bishop.',
    Qg4: 'Hit g7 - Black\'s bishop left the kingside. Watch Black\'s reply.',
    Qf3: 'Pressure f7 together with the c4 bishop.',
    Nge2: 'Develop and support f4 or d4 next.',
    Nxd4: 'Recapture with a centralised knight.',
    Bg5: 'Pin the knight on f6.',
    Bh4: 'Keep the pin.',
    Nd5: 'Jump in with tempo: the knight hits the queen and the c7 pawn.',
    exd5: 'Grab the d5 pawn - Black\'s pieces are too far away to win it back.',
  },
}

export const SCANDI_FULL = {
  id: 'scandi', name: 'Scandinavian Defence - full course', side: 'b', level: 'Intermediate', full: true,
  blurb: 'A complete answer to 1.e4: hit the centre with 1...d5, recapture with the queen and develop fast - with answers to every main White set-up.',
  lines: [
    // Chapter 1: 3.Nc3 Qa5 main lines
    L('3...Qa5: main line Bc4', 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Qe2 Bb4 O-O-O Nbd7'),
    L('3...Qa5: 5.Bd2 and Nd5 trick', 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Bd2 c6 Bc4 Bf5 Nd5 Qd8 Nxf6+ exf6'),
    L('3...Qa5: 6.Ne5', 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Ne5 Be6 Bc4 Bxc4 Nxc4 Qd8'),
    L('3...Qa5: 6.Bd2 Bf5', 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bd2 Bf5 Bc4 e6 Qe2 Bb4'),
    L('3...Qa5: early Bc4', 'e4 d5 exd5 Qxd5 Nc3 Qa5 Bc4 Nf6 Nf3 c6 O-O Bg4 h3 Bh5'),
    L('3...Qa5: Nf3 and d3', 'e4 d5 exd5 Qxd5 Nc3 Qa5 Nf3 Nf6 d3 Bg4 Be2 Nc6 O-O e6'),
    // Chapter 2: 3.Nc3 Qd6 - a second system
    L('3...Qd6: 6.g3', 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 Bg4 Bg2 Nc6 O-O O-O-O'),
    L('3...Qd6: 6.Bc4', 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 Bc4 b5 Bb3 e6 O-O Bb7'),
    // Chapter 3: White avoids 3.Nc3
    L('3.Nf3: pin with Bg4', 'e4 d5 exd5 Qxd5 Nf3 Bg4 Be2 Nc6 d4 O-O-O Be3 e5'),
    L('3.d4: Nf6 and Bg4', 'e4 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6 O-O Nc6 c4 Qd7'),
    // Chapter 4: White doesn't take on d5
    L('2.e5 Advance', 'e4 d5 e5 Bf5 d4 e6 Bd3 Bxd3 Qxd3 c5 c3 Nc6 Nf3 Qb6'),
    L('2.Nc3 d4', 'e4 d5 Nc3 d4 Nce2 e5 Ng3 Be6 Nf3 Nd7'),
    L('2.d3: trade queens', 'e4 d5 d3 dxe4 dxe4 Qxd1+ Kxd1 Nf6 Bd3 e5 Nf3 Nc6'),
  ],
  notes: {
    d5: 'Hit e4 at once - the Scandinavian.',
    Qxd5: 'Recapture with the queen: your pawn structure stays healthy.',
    Qa5: 'The queen is safe on a5 and pins the c3 knight to the king along the diagonal after d4 - Bd2 ideas.',
    Nf6: 'Develop and control e4.',
    c6: 'Give the queen a retreat to d8/c7 and support d5 - the Caro-Kann-like structure.',
    Bf5: 'Develop the light-squared bishop BEFORE ...e6.',
    e6: 'Solid pawn chain; the f8 bishop can come out.',
    Bb4: 'Pin the knight and add pressure on c3.',
    Nbd7: 'Develop and prepare ...Nb6 or ...Nd5.',
    Qd8: 'Retreat in time - the knight on d5 was hitting your queen.',
    exf6: 'Recapture towards the centre; your bishop gets the d6 square.',
    Be6: 'Offer to swap White\'s active c4 bishop.',
    Bxc4: 'Remove White\'s strongest piece.',
    Bg4: 'Pin the f3 knight against the queen.',
    Bh5: 'Keep the pin.',
    Nc6: 'Develop and add pressure on d4.',
    'O-O-O': 'Castle long: your rook is on the d-file at once.',
    Qd6: 'A modern queen square: central and hard to attack.',
    a6: 'Keep White\'s knight out of b5 and prepare ...b5.',
    b5: 'Gain queenside space and hit the c4 bishop.',
    Bb7: 'Long diagonal pressure on e4/f3.',
    e5: 'Take the centre with a pawn.',
    Qd7: 'Keep the queen safe and connected with your pieces.',
    c5: 'Attack d4 - the key break against a pawn on e5.',
    Qb6: 'Pressure d4 and b2.',
    d4: 'Gain space and kick the knight.',
    Nd7: 'Flexible development, supporting e5.',
    dxe4: 'Take the pawn - after the queen trade White can\'t castle.',
    'Qxd1+': 'Trade queens: White\'s king loses the right to castle.',
    Bxd3: 'Swap off White\'s best bishop - your light squares are safe.',
  },
}

/** Key ideas for the two full courses (shown on the course card and in the trainer). */
export const DEEP_IDEAS = {
  vienna: {
    setup: '2.Nc3 then f2-f4 (the Vienna Gambit). Knight f3, Qe2 or d4, castle (long after Qe2/Bf4, short after Bd3).',
    plan: 'Take on e5 to gain space, chase the e4 knight, open the f-file and attack the kingside.',
    break: 'f2-f4, then d2-d4 (or Qe2 and long castling).',
    watch: 'After 3...d5 4.fxe5 Nxe4 the knight on e4 is strong - challenge it with Qe2 or Bd3. Against ...Bc5 don\'t play f4 too early: the bishop eyes g1.',
  },
  scandi: {
    setup: '1...d5, ...Qxd5, ...Qa5 (or ...Qd6), ...Nf6, ...c6, ...Bf5 or ...Bg4, ...e6, then castle.',
    plan: 'Fast, simple development with a solid Caro-Kann-like structure; your queen is safe on a5/d6/d8.',
    break: '...c6-c5 or ...e6-e5 to hit White\'s centre once you\'re developed.',
    watch: 'With the queen on a5, watch for Bd2 + Nd5 or Nb5 tricks hitting it - keep ...c6 in. Develop the c8 bishop before ...e6.',
  },
}
