// Board colours and piece colour sets, chosen independently of the site theme.
// Pieces are recoloured with SVG "duotone" filters: each piece's dark parts (outline / body)
// and light parts (body / details) are mapped onto two new colours, so every board in the
// app (review, puzzles, bots) picks up the set without swapping piece artwork.
import { useEffect, useRef, useState } from 'react'

const WAVES = 'repeating-linear-gradient(160deg, rgba(255,255,255,0.07) 0 6px, transparent 6px 15px)'
const GRAIN = 'repeating-linear-gradient(95deg, rgba(0,0,0,0.05) 0 2px, transparent 2px 7px)'

export const BOARDS = [
  { id: 'theme', name: 'Match site theme', light: null, dark: null },
  { id: 'green', name: 'Tournament green', light: '#ebecd0', dark: '#739552' },
  { id: 'wood', name: 'Walnut', light: '#e8c99b', dark: '#a3703f', img: GRAIN },
  { id: 'beach', name: 'Beach', light: '#fbeee6', dark: '#4f93a8', img: WAVES },
  { id: 'sunset', name: 'Sunset', light: '#fde2d4', dark: '#c46a8a', img: WAVES },
  { id: 'ice', name: 'Ice', light: '#e6f1f8', dark: '#7fa7c6' },
  { id: 'marble', name: 'Marble', light: '#efefef', dark: '#8d8d8d', img: 'repeating-linear-gradient(130deg, rgba(255,255,255,0.12) 0 3px, transparent 3px 22px)' },
  { id: 'night', name: 'Midnight', light: '#9aa4bf', dark: '#3b4466' },
  { id: 'coral', name: 'Coral', light: '#f3e9dc', dark: '#d9776a' },
]

// [darkStop, lightStop] for white pieces and for black pieces. null = original pieces.
export const PIECE_SETS = [
  { id: 'classic', name: 'Classic', w: null, b: null },
  { id: 'pastel', name: 'Pastel', w: ['#3e2b6e', '#f7b2c8'], b: ['#283a73', '#a9d8ea'] },
  { id: 'royal', name: 'Royal gold', w: ['#5a3d0c', '#ffe08a'], b: ['#4a0f24', '#f2c94c'] },
  { id: 'neon', name: 'Neon', w: ['#00384a', '#8ff7ff'], b: ['#5b0030', '#ff8ab6'], glow: true },
  { id: 'ivory', name: 'Ivory & ebony', w: ['#3b2a1a', '#f7ecd6'], b: ['#16110d', '#d6bf98'] },
  { id: 'jade', name: 'Jade', w: ['#123d2c', '#c9f0d8'], b: ['#0f3b2b', '#88d7ae'] },
  { id: 'ocean', name: 'Ocean', w: ['#173a5e', '#e8f6ff'], b: ['#0b2a4a', '#6fc3ff'] },
]

const KEY = 'smc-board'
export function savedBoard() {
  try { return { board: 'theme', pieces: 'classic', ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { board: 'theme', pieces: 'classic' } }
}

export function applyBoard({ board, pieces }) {
  const root = document.documentElement
  const b = BOARDS.find((x) => x.id === board) || BOARDS[0]
  if (b.light) { root.style.setProperty('--rb-light', b.light); root.style.setProperty('--rb-dark', b.dark) } else { root.style.removeProperty('--rb-light'); root.style.removeProperty('--rb-dark') }
  root.style.setProperty('--rb-dark-img', b.img || 'none')
  root.style.setProperty('--rb-light-img', b.img || 'none')
  root.dataset.pieces = pieces
  try { localStorage.setItem(KEY, JSON.stringify({ board, pieces })) } catch { /* ignore */ }
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)

/** One SVG duotone filter per piece colour. Mounted once near the app root. */
export function PieceFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {PIECE_SETS.filter((s) => s.w).flatMap((s) => ['w', 'b'].map((c) => {
          const [d, l] = s[c].map(hex)
          return (
            <filter key={s.id + c} id={`pc-${s.id}-${c}`} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" />
              <feComponentTransfer>
                <feFuncR type="table" tableValues={`${d[0]} ${l[0]}`} />
                <feFuncG type="table" tableValues={`${d[1]} ${l[1]}`} />
                <feFuncB type="table" tableValues={`${d[2]} ${l[2]}`} />
              </feComponentTransfer>
            </filter>
          )
        }))}
      </defs>
    </svg>
  )
}

/** CSS that points each piece at its filter (generated from PIECE_SETS). */
export function PieceCss() {
  const css = PIECE_SETS.filter((s) => s.w).map((s) => ['w', 'b'].map((c) =>
    `[data-pieces="${s.id}"] [data-piece^="${c}"] svg, [data-pieces="${s.id}"] .pc-prev.${c} svg { filter: url(#pc-${s.id}-${c})${s.glow ? ` drop-shadow(0 0 3px ${s[c][1]})` : ' drop-shadow(0 1px 1px rgba(0,0,0,.35))'}; }`,
  ).join('\n')).join('\n')
  return <style>{css}</style>
}

// small preview pieces (simplified knight & pawn outlines in the classic style)
const Knight = () => (
  <svg viewBox="0 0 45 45" width="26" height="26"><g fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
    <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.99-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.99 2.5-3c1 0 1 3 1 3" />
  </g></svg>
)
const Pawn = ({ fill = '#000' }) => (
  <svg viewBox="0 0 45 45" width="26" height="26"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill={fill} stroke="#000" strokeWidth="1.5" /></svg>
)

const BoardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M3 3h9v9H3zM12 12h9v9h-9z" /><path d="M12 3h9v9h-9zM3 12h9v9H3z" opacity=".35" />
  </svg>
)

export default function BoardPicker() {
  const [pref, setPref] = useState(savedBoard)
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useEffect(() => { applyBoard(pref) }, [pref])
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div className="theme-picker board-picker" ref={box}>
      <button className="theme-btn" onClick={() => setOpen(!open)} aria-expanded={open} title="Board and pieces">
        <BoardIcon /> <span className="theme-btn-label">Board</span>
      </button>
      {open && (
        <div className="theme-menu board-menu" role="dialog" aria-label="Board and pieces">
          <h6>Pieces</h6>
          <div className="pc-grid">
            {PIECE_SETS.map((s) => (
              <button key={s.id} className={`pc-opt ${pref.pieces === s.id ? 'on' : ''}`} aria-pressed={pref.pieces === s.id} onClick={() => setPref({ ...pref, pieces: s.id })}>
                <span className="pc-prev-row" data-pieces={s.id}>
                  <span className="pc-prev w"><Knight /></span><span className="pc-prev b"><Pawn /></span>
                </span>
                <span>{s.name}</span>
              </button>
            ))}
          </div>
          <h6>Board</h6>
          <div className="bd-grid">
            {BOARDS.map((b) => (
              <button key={b.id} className={`bd-opt ${pref.board === b.id ? 'on' : ''}`} aria-pressed={pref.board === b.id} onClick={() => setPref({ ...pref, board: b.id })} title={b.name}>
                <span className="bd-prev" style={b.light ? { '--l': b.light, '--d': b.dark, '--img': b.img || 'none' } : { '--l': 'var(--bg)', '--d': 'var(--accent)' }} />
                <span>{b.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
