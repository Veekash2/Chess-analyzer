// "Coastal" - an original illustrated piece set (beach-ball pawns, seahorse knights,
// palm-tree bishops, lighthouse rooks, scallop-shell queens, crowned-anchor kings),
// drawn in pastel pink for White and deep navy for Black.

const PAL = {
  w: { body: '#f9c3d3', shade: '#e48aab', line: '#3d2a6b', hi: '#fff3f7', rim: '#7b5cd6' },
  b: { body: '#46579a', shade: '#2d3a74', line: '#171c40', hi: '#a6dcf0', rim: '#e98ad6' },
}

const Base = ({ c }) => (
  <g stroke={c.line} strokeWidth="3" strokeLinejoin="round">
    <path d="M32 79 H68 L70 86 H30 Z" fill={c.shade} />
    <rect x="22" y="86" width="56" height="8" rx="3" fill={c.body} />
    <path d="M27 89 H73" stroke={c.hi} strokeWidth="1.6" strokeLinecap="round" />
  </g>
)

const SHAPES = {
  p: (c) => (
    <>
      <path d="M41 64 H59 L64 80 H36 Z" fill={c.shade} stroke={c.line} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="50" cy="46" r="20" fill={c.body} stroke={c.line} strokeWidth="3" />
      <path d="M50 26 Q35 46 50 66 Q43 46 50 26 Z" fill={c.shade} />
      <path d="M50 26 Q65 46 50 66 Q57 46 50 26 Z" fill={c.hi} />
      <circle cx="50" cy="46" r="20" fill="none" stroke={c.line} strokeWidth="3" />
      <ellipse cx="42" cy="36" rx="4" ry="2.5" fill="#fff" opacity=".7" transform="rotate(-30 42 36)" />
    </>
  ),
  n: (c) => (
    <>
      <path d="M58 14 C72 14 79 28 72 40 C67 47 62 51 64 59 C66 67 73 71 68 80 L36 80 C40 71 47 66 47 58 C47 52 41 50 34 47 L24 43 C19 41 19 34 26 33 L40 31 C42 21 48 14 58 14 Z"
        fill={c.body} stroke={c.line} strokeWidth="3" strokeLinejoin="round" />
      <path d="M71 22 L80 26 L73 31 L82 35 L73 40 L80 45 L69 47" fill={c.hi} stroke={c.line} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M50 54 Q55 57 52 62 M48 62 Q54 65 51 70 M46 70 Q52 72 50 77" stroke={c.shade} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M29 37 L38 37" stroke={c.shade} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="53" cy="27" r="4.2" fill="#fff" stroke={c.line} strokeWidth="2" />
      <circle cx="54" cy="27" r="2" fill={c.line} />
      <path d="M58 16 C64 18 68 22 68 28" stroke={c.hi} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".9" />
    </>
  ),
  b: (c) => (
    <>
      <path d="M30 80 Q50 68 70 80 Z" fill={c.shade} stroke={c.line} strokeWidth="3" strokeLinejoin="round" />
      <path d="M46 79 C44 63 48 50 53 38 L59 39 C55 52 54 65 56 79 Z" fill={c.body} stroke={c.line} strokeWidth="3" strokeLinejoin="round" />
      <path d="M47 70 H55 M48 61 H55 M50 52 H56 M52 44 H57" stroke={c.shade} strokeWidth="2.2" strokeLinecap="round" />
      <g fill={c.body} stroke={c.line} strokeWidth="2.6" strokeLinejoin="round">
        <path d="M56 37 C46 23 31 23 20 33 C32 30 44 31 56 37 Z" />
        <path d="M56 37 C66 23 81 23 90 34 C78 30 68 31 56 37 Z" />
        <path d="M56 37 C50 25 50 15 58 8 C56 18 58 27 56 37 Z" />
        <path d="M56 37 C44 37 33 44 28 54 C38 46 47 42 56 37 Z" />
        <path d="M56 37 C68 37 78 44 82 54 C73 46 64 42 56 37 Z" />
      </g>
      <path d="M26 31 C36 28 46 30 54 35 M86 32 C76 28 66 30 58 35" stroke={c.hi} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="52" cy="41" r="3.4" fill={c.shade} stroke={c.line} strokeWidth="2" />
      <circle cx="59" cy="42" r="3.4" fill={c.shade} stroke={c.line} strokeWidth="2" />
    </>
  ),
  r: (c) => (
    <>
      <path d="M30 22 L44 26 L44 30 Z M70 22 L56 26 L56 30 Z" fill={c.hi} opacity=".75" />
      <path d="M37 80 L42 38 H58 L63 80 Z" fill={c.body} stroke={c.line} strokeWidth="3" strokeLinejoin="round" />
      <path d="M40.5 52 H59.5 L60.8 62 H39.2 Z" fill={c.shade} />
      <path d="M38.3 70 H61.7 L62.6 78 H37.4 Z" fill={c.shade} />
      <path d="M37 80 L42 38 H58 L63 80 Z" fill="none" stroke={c.line} strokeWidth="3" strokeLinejoin="round" />
      <rect x="35" y="33" width="30" height="6" rx="2" fill={c.body} stroke={c.line} strokeWidth="2.6" />
      <rect x="42" y="20" width="16" height="13" rx="2" fill={c.hi} stroke={c.line} strokeWidth="2.6" />
      <path d="M50 20 V33" stroke={c.line} strokeWidth="2" />
      <path d="M39 20 L50 10 L61 20 Z" fill={c.shade} stroke={c.line} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="50" cy="9" r="2.2" fill={c.line} />
      <rect x="47" y="44" width="6" height="7" rx="3" fill={c.line} opacity=".75" />
    </>
  ),
  q: (c) => (
    <>
      <path d="M43 66 H57 L62 80 H38 Z" fill={c.shade} stroke={c.line} strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 68 L22 42 C21 26 36 15 50 15 C64 15 79 26 78 42 Z" fill={c.body} stroke={c.line} strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 66 L28 36 M50 66 L37 23 M50 66 L50 19 M50 66 L63 23 M50 66 L72 36" stroke={c.shade} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M31 30 C36 22 44 19 50 19" stroke={c.hi} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M42 70 L50 63 L58 70" fill={c.body} stroke={c.line} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="50" cy="12" r="5" fill={c.hi} stroke={c.line} strokeWidth="2.4" />
      <circle cx="48.5" cy="10.5" r="1.5" fill="#fff" />
    </>
  ),
  k: (c) => (
    <>
      <path d="M36 25 L37 11 L43.5 17 L50 8 L56.5 17 L63 11 L64 25 Z" fill={c.hi} stroke={c.line} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="50" cy="31" r="6" fill="none" stroke={c.line} strokeWidth="8" />
      <circle cx="50" cy="31" r="6" fill="none" stroke={c.body} strokeWidth="3.5" />
      <path d="M28 57 Q30 77 50 78 Q70 77 72 57" fill="none" stroke={c.line} strokeWidth="11" strokeLinecap="round" />
      <path d="M28 57 Q30 77 50 78 Q70 77 72 57" fill="none" stroke={c.body} strokeWidth="5.5" strokeLinecap="round" />
      <rect x="45.5" y="36" width="9" height="42" rx="3" fill={c.body} stroke={c.line} strokeWidth="3" />
      <rect x="34" y="42" width="32" height="7" rx="3" fill={c.shade} stroke={c.line} strokeWidth="3" />
      <path d="M21 62 L28 51 L35 62 Z M65 62 L72 51 L79 62 Z" fill={c.body} stroke={c.line} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M48 52 V74" stroke={c.hi} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
}

function make(color, type) {
  const c = PAL[color]
  const Piece = ({ squareWidth }) => (
    <svg viewBox="0 0 100 100" width={squareWidth} height={squareWidth} className="coastal-piece"
      style={{ filter: `drop-shadow(1.6px 0 0 ${c.rim}) drop-shadow(0 2px 1.5px rgba(0,0,0,.3))` }}>
      <g transform="translate(5 3) scale(.9)">
        <Base c={c} />
        {SHAPES[type](c)}
      </g>
    </svg>
  )
  Piece.displayName = `Coastal${color}${type}`
  return Piece
}

export const COASTAL = Object.fromEntries(['w', 'b'].flatMap((col) => 'pnbrqk'.split('').map((t) => [`${col}${t.toUpperCase()}`, make(col, t)])))
