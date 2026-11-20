import { useEffect, useRef, useState } from 'react'

export const THEMES = [
  { id: 'indian', name: 'Singh (Indian)', note: 'Maroon, saffron and gold', swatch: ['#7a1f3d', '#e8771e', '#e8c879'] },
  { id: 'cyberpunk', name: 'Cyberpunk', note: 'Neon pink and cyan at night', swatch: ['#0d0221', '#ff2a6d', '#05d9e8'] },
  { id: 'futuristic', name: 'Futuristic', note: 'Glass panels, ice-blue glow', swatch: ['#0a1428', '#4cc9f0', '#e0f4ff'] },
  { id: 'classic', name: 'Classic Wood', note: 'Walnut, cream and brass', swatch: ['#4a2e1f', '#b58863', '#f0d9b5'] },
  { id: 'minimal', name: 'Minimal', note: 'Clean, light and simple', swatch: ['#ffffff', '#2563eb', '#111827'] },
]
const KEY = 'smc-theme'

export function savedTheme() {
  try { return localStorage.getItem(KEY) || 'indian' } catch { return 'indian' }
}

export function applyTheme(id) {
  document.documentElement.dataset.theme = id
  try { localStorage.setItem(KEY, id) } catch { /* private mode: just don't remember */ }
}

const PaletteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5C21 6.6 17 3 12 3zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
  </svg>
)

export default function ThemePicker() {
  const [theme, setTheme] = useState(savedTheme)
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const current = THEMES.find((t) => t.id === theme) || THEMES[0]
  return (
    <div className="theme-picker" ref={box}>
      <button className="theme-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="listbox" title="Change theme">
        <PaletteIcon /> <span className="theme-btn-label">{current.name}</span>
      </button>
      {open && (
        <ul className="theme-menu" role="listbox" aria-label="Theme">
          {THEMES.map((t) => (
            <li key={t.id}>
              <button role="option" aria-selected={t.id === theme} className={t.id === theme ? 'on' : ''} onClick={() => { setTheme(t.id); setOpen(false) }}>
                <span className="theme-swatch">{t.swatch.map((c) => <i key={c} style={{ background: c }} />)}</span>
                <span className="theme-text"><strong>{t.name}</strong><span>{t.note}</span></span>
                {t.id === theme && <span className="theme-check">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
