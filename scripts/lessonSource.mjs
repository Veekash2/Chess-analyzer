// Lesson content. Step types:
//   text    - explanation, optional example board (fen + arrows + squares)
//   move    - "find the move": any move in `accept` (each checked by Stockfish in build-lessons.mjs)
//   puzzles - filled in by the build with real puzzles of that theme (Lichess, CC0)
// Arrows/squares use square names; fen side to move is the player for challenges.
const T = (title, body, fen, extra = {}) => ({ t: 'text', title, body, fen, ...extra })
const M = (prompt, fen, accept, explain, extra = {}) => ({ t: 'move', prompt, fen, accept, explain, ...extra })
const P = (theme, n = 3, maxRating = 1600, minRating = 0) => ({ t: 'puzzles', theme, n, maxRating, minRating })

export const COURSES = [
  {
    id: 'opening', title: 'Opening Principles', level: 'Beginner', icon: '♙',
    blurb: 'The four rules that make every opening easier: centre, development, king safety, and patience with the queen.',
    lessons: [
      {
        id: 'centre', title: 'Control the centre',
        steps: [
          T('Why the centre?', 'The four centre squares (d4, e4, d5, e5) are the most important on the board. Pieces in the centre reach more squares, and pawns there take space away from your opponent. That is why 1.e4 and 1.d4 are the most popular first moves.', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { squares: ['d4', 'e4', 'd5', 'e5'], arrows: [['e2', 'e4'], ['d2', 'd4']] }),
          M('Play a pawn move that grabs the centre.', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ['e2e4', 'd2d4'], 'A centre pawn opens lines for your queen and bishops and claims space.'),
          M('White took the centre. As Black, fight for it too.', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', ['e7e5', 'c7c5', 'e7e6', 'c7c6', 'd7d5'], 'Each of these contests the centre straight away (or prepares ...d5).'),
        ],
      },
      {
        id: 'develop', title: 'Develop your pieces',
        steps: [
          T('Knights and bishops first', 'Get your knights and bishops off the back rank quickly, aiming at the centre. Knights usually go to f3/c3 (f6/c6 for Black). Try not to move the same piece twice in the opening - every move should bring a new piece into play.', 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', { arrows: [['b1', 'c3'], ['d2', 'd3']] }),
          M('Develop a knight and attack Black\'s e5 pawn.', 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', ['g1f3'], 'Nf3 develops with a threat - Black has to spend a move defending e5.'),
          M('Your e5 pawn is attacked. Defend it while developing a piece.', 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', ['b8c6'], '...Nc6 defends e5 and develops - two jobs in one move.'),
          M('Develop your light-squared bishop to an active square.', 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', ['f1c4', 'f1b5'], 'Bc4 aims at f7; Bb5 pressures the knight that defends e5. Both are top openings (Italian and Ruy Lopez).'),
        ],
      },
      {
        id: 'castle', title: 'Castle early',
        steps: [
          T('King safety', 'A king in the centre is a target once the position opens. Castling tucks it behind pawns and brings a rook towards the centre - usually within the first 10 moves. Clear the pieces between king and rook first.', 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5', { arrows: [['e1', 'g1']] }),
          M('Your pieces are out. Make your king safe.', 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5', ['e1g1'], 'Castled: king safe, rook ready for the e- or f-file.'),
          M('Same idea in the Ruy Lopez: castle.', 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', ['e1g1'], 'Castling first is the main line - e4 can wait, because ...Nxe4 runs into Re1 later.'),
        ],
      },
      {
        id: 'queen', title: 'Don\'t rush your queen out',
        steps: [
          T('The early queen', 'Bringing the queen out early can set up quick threats (like Scholar\'s mate on f7), but she becomes a target: your opponent develops pieces WITH tempo by attacking her. Defend calmly and develop.', 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2', { arrows: [['h5', 'f7'], ['h5', 'e5']] }),
          M('White threatens Qxf7 checkmate. Stop it!', 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', ['g7g6', 'd8e7', 'd8f6'], '...g6 blocks the queen and kicks her away next move. Never miss a mate threat on f7!'),
          M('The queen is back, still eyeing f7. Block it with a developing move.', 'r1bqkbnr/pppp1p1p/2n3p1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 1 4', ['g8f6'], '...Nf6 develops and shuts the queen off from f7.'),
          M('Black brought the queen out early. Develop and attack it.', 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', ['b1c3'], 'Nc3 develops with tempo - the queen must move again.'),
        ],
      },
    ],
  },
  {
    id: 'mates', title: 'Checkmate Patterns', level: 'Beginner', icon: '♚',
    blurb: 'Recognise the classic mating nets so you spot them in your own games.',
    lessons: [
      {
        id: 'backrank', title: 'Back-rank mate',
        steps: [
          T('Trapped by its own pawns', 'A castled king behind three unmoved pawns has no escape square. A rook or queen landing on the back rank is mate. Defence: give your king "luft" (h6/h3) or keep a rook on the back rank.', '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', { arrows: [['d1', 'd8']] }),
          M('Deliver the back-rank mate.', '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', ['d1d8'], 'Rd8# - the king is boxed in by its own pawns.'),
          P('backRankMate', 3, 1400),
        ],
      },
      {
        id: 'smothered', title: 'Smothered mate',
        steps: [
          T('Suffocated by its own pieces', 'A knight checks a king that is completely surrounded by its own pieces - no square to run to, and a knight check can\'t be blocked. Often set up with a queen sacrifice on g8 forcing ...Rxg8.', '6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1', { squares: ['h8', 'f7'] }),
          P('smotheredMate', 3, 1700),
        ],
      },
      {
        id: 'anastasia', title: 'Anastasia\'s & Arabian mates',
        steps: [
          T('Anastasia\'s mate', 'A knight on e7 covers g8 and g6; a rook or queen checks down the h-file. The king is trapped by its own g-pawn.', '8/4N1pk/8/8/8/8/8/6KR b - - 0 1', { arrows: [['h1', 'h7']], squares: ['e7'] }),
          T('Arabian mate', 'Rook and knight: the rook checks on h7, protected by the knight on f6, which also covers g8. One of the oldest known mates.', '7k/7R/5N2/8/8/8/8/6K1 b - - 0 1', { squares: ['h7', 'f6'] }),
          P('anastasiaMate', 2, 1600),
          P('arabianMate', 2, 1600),
        ],
      },
      {
        id: 'matein2', title: 'Mate in 2',
        steps: [
          T('Checks, captures, threats', 'For a mate in two, look at every check first - especially sacrifices. Ask: after this check, where can the king go, and can I mate it there?', null),
          P('mateIn2', 4, 1300),
        ],
      },
    ],
  },
  {
    id: 'tactics', title: 'Tactics Toolkit', level: 'Intermediate', icon: '♞',
    blurb: 'Forks, pins, skewers, discoveries and the tricks that win material.',
    lessons: [
      {
        id: 'fork', title: 'The fork',
        steps: [
          T('One piece, two targets', 'A fork attacks two pieces at once - your opponent can only save one. Knights are the best forkers because their attack can\'t be blocked. Look for undefended pieces and the king.', '3q3k/6pp/8/4N3/8/8/5PPP/6K1 w - - 0 1', { arrows: [['e5', 'f7'], ['f7', 'h8'], ['f7', 'd8']] }),
          M('Fork the king and queen.', '3q3k/6pp/8/4N3/8/8/5PPP/6K1 w - - 0 1', ['e5f7'], 'Nf7+ checks the king and attacks the queen on d8. Next move Nxd8 wins the queen.'),
          P('fork', 3, 1400),
        ],
      },
      {
        id: 'pin', title: 'The pin',
        steps: [
          T('Can\'t move without losing more', 'A pinned piece can\'t move because a more valuable piece (or the king) is behind it. Against the king the pin is absolute - the piece can\'t legally move. Attack a pinned piece again: it can\'t run away.', '4k3/3n4/8/1B6/8/8/8/4K3 b - - 0 1', { arrows: [['b5', 'e8']], squares: ['d7'] }),
          P('pin', 3, 1600),
        ],
      },
      {
        id: 'skewer', title: 'The skewer',
        steps: [
          T('A pin in reverse', 'A skewer attacks a valuable piece that has to move, exposing a piece behind it. Typical: check the king, then take the queen or rook behind it.', '4q3/8/8/4k3/8/8/8/R6K w - - 0 1', { arrows: [['a1', 'e1'], ['e1', 'e8']] }),
          M('Skewer the king and queen.', '4q3/8/8/4k3/8/8/8/R6K w - - 0 1', ['a1e1'], 'Re1+ - the king must step aside and the queen on e8 falls.'),
          P('skewer', 3, 1500),
        ],
      },
      {
        id: 'discovered', title: 'Discovered attacks',
        steps: [
          T('Move one piece, attack with another', 'When a piece moves out of the way, the piece behind it attacks. If the moving piece makes a threat too - best of all a check - the opponent can\'t deal with both.', '3qk3/5ppp/8/8/8/3B4/5PPP/3RK3 w - - 0 1', { arrows: [['d3', 'b5'], ['d1', 'd8']] }),
          M('Uncover the rook with check.', '3qk3/5ppp/8/8/8/3B4/5PPP/3RK3 w - - 0 1', ['d3b5'], 'Bb5+ checks the king AND uncovers the rook on the queen. Rxd8 next.'),
          P('discoveredAttack', 3, 1500),
        ],
      },
      {
        id: 'defender', title: 'Remove the defender',
        steps: [
          T('Take away the guard', 'If a piece or square is defended only once, capture or chase away the defender - then what it was guarding falls. Ask "what is this piece doing?" before you trade.', null),
          P('capturingDefender', 3, 1900),
          P('deflection', 2, 1500),
        ],
      },
      {
        id: 'hanging', title: 'Free pieces & trapped pieces',
        steps: [
          T('Count attackers and defenders', 'Before every move, check: is anything of mine undefended? Is anything of theirs? Pieces with no escape squares (often a bishop or knight on the edge) can be trapped and won.', null),
          P('hangingPiece', 3, 1300),
          P('trappedPiece', 2, 1900),
        ],
      },
    ],
  },
  {
    id: 'endgames', title: 'Endgame Essentials', level: 'Intermediate', icon: '♔',
    blurb: 'Opposition, the square, Lucena and Philidor - the endgames that decide close games.',
    lessons: [
      {
        id: 'opposition', title: 'The opposition',
        steps: [
          T('Kings face to face', 'When kings stand on the same file with one square between them, the side NOT to move "has the opposition" - the other king must give way. In king and pawn endings this decides whether the pawn queens.', '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', { squares: ['e6', 'e8'] }),
          M('King on the 6th in front of the pawn: find a winning move.', '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', ['e6d6', 'e6f6'], 'Step to the side; the black king must give way and your pawn walks in. With the king on the 6th, this always wins (except a rook pawn).'),
          M('Defend: take the opposition to hold the draw.', '8/4k3/8/3K4/4P3/8/8/8 b - - 0 1', ['e7d7'], '...Kd7 faces the white king - now it can\'t get past, and the game is drawn.'),
        ],
      },
      {
        id: 'square', title: 'The square of the pawn',
        steps: [
          T('Can the king catch it?', 'Draw a square from the pawn to its promotion rank. If the defending king can step inside that square, it catches the pawn. No counting needed!', '7k/8/8/p7/8/8/4K3/8 w - - 0 1', { squares: ['a5', 'd5', 'a1', 'd1'] }),
          M('Step into the square and stop the pawn.', '7k/8/8/p7/8/8/4K3/8 w - - 0 1', ['e2d3', 'e2d2', 'e2d1'], 'Inside the square - you catch the pawn in time and it\'s a draw.'),
          P('pawnEndgame', 3, 1800),
        ],
      },
      {
        id: 'lucena', title: 'Lucena: building a bridge',
        steps: [
          T('The most important rook ending', 'Your pawn is on the 7th with your king in front of it. Bring your rook to the 4th rank, walk your king out, and when the checks come, block with the rook - the "bridge".', '3K4/3P2k1/8/8/8/8/2r5/4R3 w - - 0 1', { arrows: [['e1', 'e4']] }),
          M('Start building the bridge.', '3K4/3P2k1/8/8/8/8/2r5/4R3 w - - 0 1', ['e1e4'], 'Re4! Next the king comes out, and the rook blocks the checks on the 4th rank.'),
          P('rookEndgame', 3, 1700),
        ],
      },
      {
        id: 'philidor', title: 'Philidor: the drawing wall',
        steps: [
          T('Defending a rook ending', 'Keep your rook on your 3rd rank so the enemy king can\'t reach it. When the pawn steps up to that rank, swing the rook behind and check from far away.', '4k3/8/8/3PK3/8/8/7R/r7 b - - 0 1', { arrows: [['a1', 'a6']] }),
          M('Set up the Philidor defence.', '4k3/8/8/3PK3/8/8/7R/r7 b - - 0 1', ['a1a6'], '...Ra6 - the third-rank wall. The white king can\'t advance without the pawn going to d6 first.'),
        ],
      },
    ],
  },
  {
    id: 'strategy', title: 'Strategy Basics', level: 'Advanced', icon: '♜',
    blurb: 'What to do when there\'s no tactic: rooks on open files, outposts, and active kings.',
    lessons: [
      {
        id: 'rooks', title: 'Rooks: open files & the 7th rank',
        steps: [
          T('Give your rooks open files', 'Rooks need open files (no pawns). Once a rook reaches the 7th rank it attacks pawns from the side and traps the king on the back rank.', '2r3k1/pp3ppp/8/8/8/7P/PP3PP1/3R2K1 w - - 0 1', { arrows: [['d1', 'd7']] }),
          M('Invade with your rook.', '2r3k1/pp3ppp/8/8/8/7P/PP3PP1/3R2K1 w - - 0 1', ['d1d7'], 'Rd7 hits b7 and f7 - the "pig on the 7th".'),
        ],
      },
      {
        id: 'king', title: 'An active king in the endgame',
        steps: [
          T('Your king is a fighter', 'Once queens are off, the king is a strong piece - bring it to the centre, towards the pawns. In the endgame the more active king usually wins.', '8/5pk1/6p1/8/8/6P1/5PK1/8 w - - 0 1', { arrows: [['g2', 'f3'], ['f3', 'e4']] }),
          M('Activate your king.', '8/p4pk1/6p1/8/8/6P1/P4PK1/8 w - - 0 1', ['g2f3'], 'Kf3, heading for e4 and d5 - in the centre your king supports pawns and attacks theirs.'),
        ],
      },
      {
        id: 'quiet', title: 'Quiet moves',
        steps: [
          T('Not every good move is a capture', 'Sometimes the strongest move is a calm one: a retreat, a pawn move, or improving your worst piece. Ask what your opponent wants to do, and stop it.', null),
          P('quietMove', 3, 2400, 1500),
        ],
      },
    ],
  },
]
