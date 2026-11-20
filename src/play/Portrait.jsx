// Original illustrated bot portraits, drawn as SVG from a few parameters
// (skin, hair, beard, glasses, headwear...), so every bot has a face of its own.

const SKIN = { light: '#f1c7a5', wheat: '#e0a982', tan: '#c98b5e', brown: '#a86b45', deep: '#7a4a2e' }
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16)
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(Math.min(255, Math.max(0, v * f))))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export default function Portrait({ look = {}, bg = '#5b6b7a', size = 48, title }) {
  const {
    skin = 'tan', hair = 'short', hairColor = '#2b1d14', beard = null, moustache = false,
    glasses = false, head = null, headColor = '#c0392b', shirt = '#2f4f6f', bindi = false,
    tilak = false, earrings = false, age = 0, mood = 'smile', glow = false,
  } = look
  const s = SKIN[skin] || skin
  const sd = shade(s, 0.86)
  const hc = age > 1 ? '#d9d9d9' : age === 1 ? '#8c8c8c' : hairColor
  const id = `pg${Math.random().toString(36).slice(2, 8)}`
  return (
    <svg className="portrait" viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title || 'Bot portrait'}>
      <defs>
        <radialGradient id={`${id}b`} cx="50%" cy="35%" r="75%">
          <stop offset="0" stopColor={shade(bg, 1.35)} />
          <stop offset="1" stopColor={bg} />
        </radialGradient>
        <clipPath id={`${id}c`}><rect width="100" height="100" rx="18" /></clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="100" height="100" fill={`url(#${id}b)`} />
        {glow && <circle cx="50" cy="44" r="40" fill="#ffd36e" opacity=".22" />}

        {/* long hair behind the head */}
        {(hair === 'long' || hair === 'braid') && <path d="M24 44 Q22 82 30 96 L70 96 Q78 82 76 44 Z" fill={hc} />}

        {/* shoulders & shirt */}
        <path d="M14 100 Q16 78 36 73 L64 73 Q84 78 86 100 Z" fill={shirt} />
        <path d="M40 73 L50 86 L60 73 Z" fill={shade(shirt, 0.75)} />
        {/* neck */}
        <rect x="42" y="60" width="16" height="15" rx="5" fill={sd} />

        {/* ears */}
        <ellipse cx="29" cy="47" rx="4.5" ry="6.5" fill={sd} />
        <ellipse cx="71" cy="47" rx="4.5" ry="6.5" fill={sd} />
        {earrings && <><circle cx="29" cy="55" r="2.2" fill="#f2c94c" /><circle cx="71" cy="55" r="2.2" fill="#f2c94c" /></>}

        {/* face */}
        <ellipse cx="50" cy="45" rx="21" ry="24" fill={s} />
        {age > 1 && <path d="M38 33 Q42 31 46 33 M54 33 Q58 31 62 33" stroke={sd} strokeWidth="1.2" fill="none" />}

        {/* hair on top */}
        {hair === 'short' && <path d="M29 42 Q28 20 50 19 Q72 20 71 42 Q66 30 50 29 Q36 30 29 42 Z" fill={hc} />}
        {hair === 'spiky' && <path d="M29 42 L30 26 L36 30 L39 18 L45 26 L50 15 L55 26 L61 18 L64 30 L70 26 L71 42 Q64 30 50 30 Q36 30 29 42 Z" fill={hc} />}
        {(hair === 'long' || hair === 'braid' || hair === 'bun') && <path d="M28 46 Q27 19 50 18 Q73 19 72 46 Q70 30 58 27 Q48 34 30 36 Z" fill={hc} />}
        {hair === 'bun' && <circle cx="50" cy="16" r="9" fill={hc} />}
        {hair === 'bald' && age > 0 && <path d="M29 44 Q30 36 33 35 M71 44 Q70 36 67 35" stroke={hc} strokeWidth="5" strokeLinecap="round" />}
        {hair === 'braid' && <path d="M70 46 Q80 60 74 78 Q72 86 76 92" stroke={hc} strokeWidth="7" strokeLinecap="round" fill="none" />}

        {/* headwear */}
        {head === 'cap' && <><path d="M28 38 Q29 17 50 17 Q71 17 72 38 Z" fill={headColor} /><path d="M50 36 L82 38 Q80 43 66 42 L50 40 Z" fill={shade(headColor, 0.8)} /></>}
        {head === 'turban' && <>
          <path d="M26 40 Q24 14 50 12 Q76 14 74 40 Q64 32 50 33 Q36 32 26 40 Z" fill={headColor} />
          <path d="M28 34 Q50 18 72 34 M30 26 Q50 14 70 28" stroke={shade(headColor, 0.78)} strokeWidth="2.2" fill="none" />
          <circle cx="50" cy="25" r="3.6" fill="#f2c94c" stroke="#fff6" strokeWidth="1" />
          <path d="M50 22 Q47 10 53 6" stroke="#fff" strokeWidth="2" fill="none" />
        </>}
        {head === 'crown' && <>
          <path d="M31 30 L33 14 L41 23 L50 10 L59 23 L67 14 L69 30 Z" fill="#f2c94c" stroke="#b8892f" strokeWidth="1.2" />
          <circle cx="50" cy="22" r="2.6" fill="#c0392b" /><circle cx="39" cy="26" r="1.8" fill="#2e86de" /><circle cx="61" cy="26" r="1.8" fill="#2e86de" />
        </>}
        {head === 'tiara' && <path d="M33 30 Q50 18 67 30 L62 27 L56 22 L50 17 L44 22 L38 27 Z" fill="#f2c94c" stroke="#b8892f" strokeWidth="1" />}
        {head === 'headband' && <rect x="28" y="30" width="44" height="6" rx="3" fill={headColor} />}

        {/* brows */}
        <path d={mood === 'stern' ? 'M38 37 L46 39 M54 39 L62 37' : 'M38 37 Q42 35 46 37 M54 37 Q58 35 62 37'} stroke={age > 1 ? '#bdbdbd' : shade(hc, 0.9)} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        {/* eyes */}
        <ellipse cx="42" cy="44" rx="2.6" ry="3" fill="#2b2118" />
        <ellipse cx="58" cy="44" rx="2.6" ry="3" fill="#2b2118" />
        <circle cx="43" cy="43" r=".9" fill="#fff" /><circle cx="59" cy="43" r=".9" fill="#fff" />
        {glow && <><circle cx="42" cy="44" r="3.6" fill="#ffd36e" opacity=".55" /><circle cx="58" cy="44" r="3.6" fill="#ffd36e" opacity=".55" /></>}
        {glasses && <g stroke="#222" strokeWidth="1.6" fill="#ffffff22"><circle cx="42" cy="44" r="6" /><circle cx="58" cy="44" r="6" /><path d="M48 44 L52 44" /></g>}
        {bindi && <circle cx="50" cy="36" r="1.9" fill="#c0392b" />}
        {tilak && <path d="M50 30 L50 38" stroke="#e67e22" strokeWidth="2.4" strokeLinecap="round" />}

        {/* nose */}
        <path d="M50 46 Q48 53 51 54" stroke={shade(s, 0.72)} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {/* cheeks */}
        <circle cx="38" cy="53" r="3.2" fill="#e57373" opacity=".22" /><circle cx="62" cy="53" r="3.2" fill="#e57373" opacity=".22" />

        {/* beard */}
        {beard === 'stubble' && <path d="M31 50 Q33 70 50 70 Q67 70 69 50 Q66 64 50 64 Q34 64 31 50 Z" fill={hc} opacity=".35" />}
        {beard === 'full' && <path d="M29 46 Q29 76 50 80 Q71 76 71 46 Q68 62 50 62 Q32 62 29 46 Z" fill={hc} />}
        {beard === 'long' && <path d="M29 46 Q28 86 50 96 Q72 86 71 46 Q68 62 50 62 Q32 62 29 46 Z" fill={hc} />}
        {(moustache || beard === 'full' || beard === 'long') && <path d="M40 58 Q50 53 60 58 Q55 61 50 59 Q45 61 40 58 Z" fill={beard ? shade(hc, 0.85) : hc} />}

        {/* mouth */}
        {mood === 'smile' && <path d="M43 61 Q50 67 57 61" stroke="#7a2e2e" strokeWidth="2" fill="none" strokeLinecap="round" />}
        {mood === 'grin' && <path d="M42 60 Q50 69 58 60 Z" fill="#7a2e2e" />}
        {mood === 'stern' && <path d="M44 63 L56 63" stroke="#7a2e2e" strokeWidth="2" strokeLinecap="round" />}
        {mood === 'calm' && <path d="M45 62 Q50 64 55 62" stroke="#7a2e2e" strokeWidth="1.8" fill="none" strokeLinecap="round" />}
      </g>
    </svg>
  )
}
