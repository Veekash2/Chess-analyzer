import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOW = { checkmated: 'Checkmate', resigned: 'Resignation', timeout: 'Timeout', abandoned: 'Abandoned', agreed: 'Agreement', repetition: 'Repetition', stalemate: 'Stalemate', insufficient: 'Insufficient material', '50move': '50-move rule', timevsinsufficient: 'Timeout vs insufficient' }
const fmtDate = (t) => new Date(t).toLocaleDateString()

export function useWidth(fallback = 600) {
  const ref = useRef(null)
  const [w, setW] = useState(fallback)
  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

export function Chips({ options, value, onChange, label }) {
  return (
    <div className="tabs chips small-chips" role="tablist" aria-label={label}>
      {options.map(([k, text]) => (
        <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'tab active' : 'tab'} onClick={() => onChange(k)}>{text}</button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------ form guide */
export function FormStrip({ form }) {
  const [hover, setHover] = useState(null)
  if (!form.length) return null
  const g = hover != null ? form[hover] : null
  return (
    <div className="form-strip-wrap">
      <div className="form-strip" onMouseLeave={() => setHover(null)}>
        {form.map((r, i) => (
          <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className={`fs ${r.outcome}`}
            onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} aria-label={`${r.outcome} vs ${r.opp}, ${fmtDate(r.end)}`} />
        ))}
      </div>
      <div className="form-axis muted small"><span>{form.length} games ago</span><span>{g ? `${g.outcome.toUpperCase()} vs ${g.opp} · ${g.tc} · ${fmtDate(g.end)}` : 'Hover or tap a square'}</span><span>latest</span></div>
    </div>
  )
}

/* ------------------------------------------------------------ generic XY line chart */
/** Round tick values (1, 2, 5 x 10^n steps) inside [lo, hi]. */
function niceTicks(lo, hi, count) {
  const span = hi - lo
  if (!(span > 0)) return [lo]
  const raw = span / Math.max(1, count)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag
  const out = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6)
  return out
}

export function XYChart({ series, height, yFmt = (v) => v, xFmt = (v) => v, xLabel, yDomain, refLine, bands, xTicks }) {
  const [wrap, W] = useWidth()
  const [hx, setHx] = useState(null)
  const all = series.flatMap((s) => s.pts)
  if (!all.length) return <div className="xy" ref={wrap}><p className="muted small">Not enough games yet.</p></div>
  const H = height || (W < 520 ? 180 : 220)
  const P = { l: 42, r: 10, t: 10, b: xLabel ? 34 : 22 }
  const x0 = Math.min(...all.map((p) => p.x)), x1 = Math.max(...all.map((p) => p.x))
  let y0 = yDomain ? yDomain[0] : Math.min(...all.map((p) => p.y)), y1 = yDomain ? yDomain[1] : Math.max(...all.map((p) => p.y))
  if (!yDomain) { const pad = (y1 - y0) * 0.1 || 1; y0 -= pad; y1 += pad }
  const X = (v) => P.l + ((v - x0) / Math.max(1e-9, x1 - x0)) * (W - P.l - P.r)
  const Y = (v) => P.t + (1 - (v - y0) / Math.max(1e-9, y1 - y0)) * (H - P.t - P.b)
  const yt = niceTicks(y0, y1, H < 200 ? 4 : 5)
  const xt = xTicks || niceTicks(x0, x1, Math.max(2, Math.floor((W - P.l - P.r) / 70)))
  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect()
    const v = x0 + ((e.clientX - box.left - P.l) / (W - P.l - P.r)) * (x1 - x0)
    setHx(Math.min(x1, Math.max(x0, v)))
  }
  const near = (s) => {
    if (hx == null || !s.pts.length) return null
    return s.pts.reduce((a, b) => (Math.abs(b.x - hx) < Math.abs(a.x - hx) ? b : a))
  }
  const hp = series.map(near).find(Boolean)
  return (
    <div className="xy" ref={wrap}>
      <div className="legend-row">
        {series.map((s) => (
          <span key={s.name}><i className={s.dashed ? 'dash' : ''} style={{ background: s.color }} />{s.name}</span>
        ))}
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHx(null)} role="img">
        {bands?.map((b) => (
          <rect key={b.label} x={P.l} width={W - P.l - P.r} y={Y(Math.min(y1, b.to))} height={Math.max(0, Y(Math.max(y0, b.from)) - Y(Math.min(y1, b.to)))} className={b.cls} />
        ))}
        {yt.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={Y(v)} y2={Y(v)} className="gridline" />
            <text x={P.l - 6} y={Y(v) + 4} textAnchor="end" className="axis">{yFmt(v)}</text>
          </g>
        ))}
        {xt.map((v) => <text key={v} x={X(v)} y={H - (xLabel ? 20 : 6)} textAnchor="middle" className="axis">{xFmt(v)}</text>)}
        {xLabel && <text x={(W + P.l) / 2} y={H - 4} textAnchor="middle" className="axis">{xLabel}</text>}
        {refLine != null && <line x1={P.l} x2={W - P.r} y1={Y(refLine)} y2={Y(refLine)} className="refline" />}
        {series.map((s) => (
          <g key={s.name}>
            <polyline fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round"
              points={s.pts.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')} />
            {s.dots && s.pts.map((p) => <circle key={p.x} cx={X(p.x)} cy={Y(p.y)} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" />)}
          </g>
        ))}
        {hp && (
          <>
            <line x1={X(hp.x)} x2={X(hp.x)} y1={P.t} y2={H - P.b} className="crosshair" />
            {series.map((s) => { const p = near(s); return p && <circle key={s.name} cx={X(p.x)} cy={Y(p.y)} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" /> })}
          </>
        )}
      </svg>
      {hp && (
        <div className="tip static" style={{ left: `${Math.min(80, Math.max(20, (X(hp.x) / W) * 100))}%` }}>
          <strong>{xFmt(hp.x, true)}</strong>
          {series.map((s) => { const p = near(s); return p && <span key={s.name}><i style={{ background: s.color }} />{s.name}: {yFmt(p.y, true)}{p.n ? ` (${p.n} games)` : ''}</span> })}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ activity calendar */
export function CalendarHeatmap({ calendar }) {
  const scroller = useRef(null)
  const [hover, setHover] = useState(null)
  // start scrolled to the most recent weeks (after layout, so the width is known)
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const go = () => { el.scrollLeft = el.scrollWidth }
    go(); const id = requestAnimationFrame(go)
    return () => cancelAnimationFrame(id)
  }, [calendar])
  if (!calendar) return null
  const weeks = []
  calendar.days.forEach((d, i) => { (weeks[Math.floor(i / 7)] ||= []).push(d) })
  const level = (n) => (n === 0 ? 0 : Math.min(4, Math.ceil((4 * n) / calendar.max)))
  const h = hover != null ? calendar.days[hover] : null
  return (
    <div className="cal-wrap">
      <div className="cal-scroll" ref={scroller}>
        <div className="cal">
          <div className="cal-days">{DAYS.map((d, i) => <span key={d}>{i % 2 === 0 ? d : ''}</span>)}</div>
          {weeks.map((w, wi) => {
            const first = new Date(w[0].t)
            const showMonth = first.getDate() <= 7
            return (
              <div className="cal-week" key={wi}>
                <span className="cal-month">{showMonth ? MONTHS[first.getMonth()] : ''}</span>
                {w.map((d, di) => (
                  <span key={d.t} className={`cal-cell l${level(d.n)}`}
                    onMouseEnter={() => setHover(wi * 7 + di)} onClick={() => setHover(wi * 7 + di)} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
      <div className="cal-foot">
        <span className="muted small">
          {h ? `${new Date(h.t).toDateString()}: ${h.n ? `${h.n} games, ${h.w}W ${h.d}D ${h.l}L (${h.pct}%)` : 'no games'}`
            : `Played on ${calendar.activeDays} of the last ${calendar.days.length} days. Busiest day: ${calendar.max} games.`}
        </span>
        <span className="cal-legend muted small">Less {[0, 1, 2, 3, 4].map((l) => <i key={l} className={`cal-cell l${l}`} />)} More</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ weekday x hour */
export function HourWeekHeatmap({ hw }) {
  const [mode, setMode] = useState('score')
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...hw.flat().map((c) => c.n))
  const MIN = 5
  const cellStyle = (c) => {
    if (mode === 'games') return c.n ? { background: `color-mix(in oklab, var(--s1) ${Math.round(15 + (85 * c.n) / max)}%, var(--surface))` } : null
    if (c.n < MIN) return null
    const d = (c.pct - 50) / 30 // +-30 points = full colour
    const col = d >= 0 ? 'var(--win)' : 'var(--loss)'
    return { background: `color-mix(in oklab, ${col} ${Math.round(Math.min(1, Math.abs(d)) * 90)}%, var(--neutral))` }
  }
  const h = hover ? hw[hover[0]][hover[1]] : null
  return (
    <div>
      <Chips label="Colour by" value={mode} onChange={setMode} options={[['score', 'Score'], ['games', 'Games played']]} />
      <div className="hw" onMouseLeave={() => setHover(null)}>
        {hw.map((row, di) => (
          <div className="hw-row" key={di}>
            <span className="hw-day">{DAYS[di]}</span>
            {row.map((c, hi) => (
              <span key={hi} className={`hw-cell ${mode === 'score' && c.n < MIN ? 'thin' : ''} ${hover && hover[0] === di && hover[1] === hi ? 'on' : ''}`}
                style={cellStyle(c) || undefined} onMouseEnter={() => setHover([di, hi])} onClick={() => setHover([di, hi])} />
            ))}
          </div>
        ))}
        <div className="hw-row hw-axis"><span className="hw-day" />{Array.from({ length: 24 }, (_, i) => <span key={i}>{i % 6 === 0 ? i : ''}</span>)}</div>
      </div>
      <p className="muted small hw-note">
        {h ? `${DAYS[hover[0]]} ${hover[1]}:00-${hover[1]}:59 - ${h.n} games${h.n ? `, ${h.pct}% score (${h.w}W ${h.d}D ${h.l}L)` : ''}`
          : mode === 'score' ? 'Blue = you score above 50%, orange = below. Striped = fewer than 5 games.' : 'Darker = more games played in that hour.'}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------ board heatmap */
const PIECE_OPTS = [['all', 'All'], ['p', 'Pawn'], ['n', 'Knight'], ['b', 'Bishop'], ['r', 'Rook'], ['q', 'Queen'], ['k', 'King']]
const GLYPH = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
const sqName = (i) => 'abcdefgh'[i % 8] + (Math.floor(i / 8) + 1)

export function BoardHeatmap({ boards }) {
  const [side, setSide] = useState('white')
  const [piece, setPiece] = useState('all')
  const counts = boards[side][piece]
  const total = counts.reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...counts)
  const top = counts.map((n, i) => [n, i]).sort((a, b) => b[0] - a[0]).slice(0, 5).filter((x) => x[0])
  const topSet = new Set(top.slice(0, 3).map((t) => t[1]))
  // rank 8 at the top for White, rank 1 at the top for Black (your side at the bottom)
  const order = []
  for (let r = 7; r >= 0; r--) for (let f = 0; f < 8; f++) order.push(side === 'white' ? r * 8 + f : (7 - r) * 8 + (7 - f))
  return (
    <div className="board-heat">
      <div className="board-controls">
        <Chips label="Side" value={side} onChange={setSide} options={[['white', 'As White'], ['black', 'As Black']]} />
        <Chips label="Piece" value={piece} onChange={setPiece} options={PIECE_OPTS} />
      </div>
      <div className="board-layout">
        <div className="bh-board" role="img" aria-label={`Squares your ${piece === 'all' ? 'pieces' : PIECE_OPTS.find((p) => p[0] === piece)[1].toLowerCase()} move to as ${side}`}>
          {order.map((sq) => {
            const n = counts[sq]
            const light = (Math.floor(sq / 8) + (sq % 8)) % 2 === 1
            const a = n ? 0.04 + 0.96 * (n / max) ** 0.9 : 0
            return (
              <div key={sq} className={`bh-sq ${light ? 'light' : 'dark'}`} title={`${sqName(sq)}: ${n.toLocaleString()} moves (${total ? ((100 * n) / total).toFixed(1) : 0}%)`}>
                <span className="bh-heat" style={{ opacity: a }} />
                {topSet.has(sq) && <span className="bh-label">{sqName(sq)}</span>}
              </div>
            )
          })}
        </div>
        <div className="bh-side">
          <h4>Favourite squares</h4>
          <ol>
            {top.map(([n, sq]) => (
              <li key={sq}><span className="bh-glyph">{piece === 'all' ? '' : GLYPH[piece]}</span><strong>{sqName(sq)}</strong><span className="muted small">{((100 * n) / total).toFixed(1)}% · {n.toLocaleString()}</span></li>
            ))}
          </ol>
          <p className="muted small">{total.toLocaleString()} moves. Your side of the board is at the bottom.</p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ stacked columns (accuracy) */
export function StackedColumns({ bins }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...bins.map((b) => b.win + b.draw + b.loss))
  const total = bins.reduce((a, b) => a + b.win + b.draw + b.loss, 0)
  if (!total) return <p className="muted small">None of these games have a Chess.com review yet.</p>
  const b = hover != null ? bins[hover] : null
  return (
    <div>
      <div className="stack-cols" onMouseLeave={() => setHover(null)}>
        {bins.map((x, i) => (
          <div key={x.label} className="stack-col" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
            <div className="stack" style={{ height: `${(100 * (x.win + x.draw + x.loss)) / max}%` }}>
              {x.loss > 0 && <span className="l" style={{ flex: x.loss }} />}
              {x.draw > 0 && <span className="d" style={{ flex: x.draw }} />}
              {x.win > 0 && <span className="w" style={{ flex: x.win }} />}
            </div>
          </div>
        ))}
      </div>
      <div className="cols-axis">{bins.map((x) => <span key={x.label}>{x.label.split('-')[0]}</span>)}</div>
      <p className="muted small">{b ? `Accuracy ${b.label}: ${b.win + b.draw + b.loss} games - ${b.win} wins, ${b.draw} draws, ${b.loss} losses` : `${total} reviewed games by accuracy. Blue = wins, grey = draws, orange = losses.`}</p>
    </div>
  )
}

/* ------------------------------------------------------------ how games end */
export function EndingBars({ endings }) {
  const groups = ['win', 'loss', 'draw'].map((o) => {
    const parts = Object.entries(endings).filter(([k]) => k.startsWith(o + '|')).map(([k, n]) => ({ how: k.split('|')[1], n })).sort((a, b) => b.n - a.n)
    return { o, parts, total: parts.reduce((a, b) => a + b.n, 0) }
  }).filter((g) => g.total)
  const shade = (i) => `${100 - i * 22}%`
  return (
    <div className="ending-bars">
      {groups.map((g) => (
        <div key={g.o} className="ending-group">
          <div className="ending-head"><span className={`pill ${g.o}`}>{g.o}</span><span className="muted small">{g.total.toLocaleString()} games</span></div>
          <div className="ending-bar">
            {g.parts.map((p, i) => (
              <span key={p.how} className={g.o[0]} style={{ flex: p.n, opacity: shade(Math.min(i, 3)) }} title={`${HOW[p.how] || p.how}: ${p.n}`} />
            ))}
          </div>
          <div className="ending-legend">
            {g.parts.slice(0, 4).map((p, i) => (
              <span key={p.how}><i className={g.o[0]} style={{ opacity: shade(i) }} />{HOW[p.how] || p.how} <strong>{Math.round((100 * p.n) / g.total)}%</strong></span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
