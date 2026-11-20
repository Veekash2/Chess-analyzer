import { useRef, useState } from 'react'
import { useWidth } from './Visuals'

export const SERIES = { bullet: 'var(--s1)', blitz: 'var(--s2)', rapid: 'var(--s3)', daily: 'var(--s4)' }

export function WdlBar({ s }) {
  if (!s.n) return <div className="wdl empty" />
  return (
    <div className="wdl" role="img" aria-label={`${s.w} wins, ${s.d} draws, ${s.l} losses`}>
      {s.w > 0 && <span className="w" style={{ flex: s.w }} title={`${s.w} wins`} />}
      {s.d > 0 && <span className="d" style={{ flex: s.d }} title={`${s.d} draws`} />}
      {s.l > 0 && <span className="l" style={{ flex: s.l }} title={`${s.l} losses`} />}
    </div>
  )
}

/** Rows of label | win/draw/loss bar | score % | games */
export function ScoreRows({ items, labelWidth = 150, extra }) {
  return (
    <div className="score-rows" style={{ '--lw': `${labelWidth}px` }}>
      {items.map((x) => (
        <div className="score-row" key={x.label} title={`${x.label}: ${x.w}W ${x.d}D ${x.l}L`}>
          <span className="lbl">{x.label}</span>
          <WdlBar s={x} />
          <span className="num strong">{x.n ? `${x.pct}%` : '-'}</span>
          <span className="num muted">{x.n.toLocaleString()}{extra ? extra(x) : ''}</span>
        </div>
      ))}
    </div>
  )
}

/** Vertical columns showing score %, with a hover tooltip. Faded when the sample is small. */
export function ScoreColumns({ items, minN = 20, height = 120 }) {
  const [hover, setHover] = useState(null)
  return (
    <div className="cols-wrap">
      <div className="cols" style={{ height }}>
        <div className="cols-mid" style={{ bottom: '50%' }}><span>50%</span></div>
        {items.map((x, i) => (
          <div
            key={x.label}
            className="col-hit"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className={`col ${x.n < minN ? 'faint' : ''} ${hover === i ? 'hot' : ''}`} style={{ height: `${x.n ? x.pct : 0}%` }} />
          </div>
        ))}
        {hover != null && (
          <div className="tip" style={{ left: `${((hover + 0.5) / items.length) * 100}%` }}>
            <strong>{items[hover].label}{items[hover].label.length <= 2 ? ':00' : ''}</strong>
            <span>{items[hover].n ? `${items[hover].pct}% score` : 'no games'}</span>
            <span className="muted">{items[hover].n} games · {items[hover].w}W {items[hover].d}D {items[hover].l}L</span>
          </div>
        )}
      </div>
      <div className="cols-axis">
        {items.map((x, i) => (
          <span key={x.label}>{items.length > 12 ? (i % 3 === 0 ? x.label : '') : x.label}</span>
        ))}
      </div>
    </div>
  )
}

/** Multi-series rating line chart with a crosshair tooltip. */
export function RatingChart({ series }) {
  const ref = useRef(null)
  const [wrapRef, width] = useWidth(720)
  const all = series.flatMap((s) => s.pts)
  if (!all.length) return <p className="muted">No rated games.</p>
  const W = width, H = W < 520 ? 190 : 230, P = { l: 40, r: 10, t: 12, b: 24 }
  const t0 = Math.min(...all.map((p) => p.t)), t1 = Math.max(...all.map((p) => p.t))
  const v0 = Math.floor((Math.min(...all.map((p) => p.v)) - 20) / 50) * 50
  const v1 = Math.ceil((Math.max(...all.map((p) => p.v)) + 20) / 50) * 50
  const x = (t) => P.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - P.l - P.r)
  const y = (v) => P.t + (1 - (v - v0) / Math.max(1, v1 - v0)) * (H - P.t - P.b)
  const step = (v1 - v0) / 4
  const yTicks = [0, 1, 2, 3, 4].map((i) => Math.round(v0 + i * step))
  const xTicks = timeTicks(t0, t1, Math.max(2, Math.floor((W - P.l - P.r) / 70)))

  const onMove = (e) => {
    const box = ref.current.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    const t = t0 + ((px - P.l) / (W - P.l - P.r)) * (t1 - t0)
    setHoverT(Math.min(t1, Math.max(t0, t)))
  }
  const nearest = (s) => {
    if (hoverT == null) return null
    let best = null
    for (const p of s.pts) if (p.t <= hoverT) best = p
    return best
  }
  return (
    <div className="rating-chart" ref={wrapRef}>
      <div className="legend-row">
        {series.map((s) => (
          <span key={s.tc}><i style={{ background: SERIES[s.tc] }} />{s.tc} <strong>{s.now}</strong> <span className="muted">peak {s.peak}</span></span>
        ))}
      </div>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width={W} height={H} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHoverT(null)} role="img" aria-label="Rating over time">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="gridline" />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="axis">{v}</text>
          </g>
        ))}
        {xTicks.map((tk) => (
          <text key={tk.t} x={x(tk.t)} y={H - 6} textAnchor="middle" className="axis">{tk.label}</text>
        ))}
        {series.map((s) => (
          <polyline key={s.tc} fill="none" stroke={SERIES[s.tc]} strokeWidth="2" strokeLinejoin="round"
            points={s.pts.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} />
        ))}
        {hoverT != null && (
          <>
            <line x1={x(hoverT)} x2={x(hoverT)} y1={P.t} y2={H - P.b} className="crosshair" />
            {series.map((s) => {
              const p = nearest(s)
              return p && <circle key={s.tc} cx={x(p.t)} cy={y(p.v)} r="4" fill={SERIES[s.tc]} stroke="var(--surface)" strokeWidth="2" />
            })}
          </>
        )}
      </svg>
      {hoverT != null && (
        <div className="tip static" style={{ left: `${Math.min(80, Math.max(20, (x(hoverT) / W) * 100))}%` }}>
          <strong>{new Date(hoverT).toLocaleDateString()}</strong>
          {series.map((s) => {
            const p = nearest(s)
            return p && <span key={s.tc}><i style={{ background: SERIES[s.tc] }} />{s.tc}: {p.v}</span>
          })}
        </div>
      )}
    </div>
  )
}

export function Tile({ value, label, sub }) {
  return (
    <div className="tile">
      <strong>{value}</strong>
      <span>{label}</span>
      {sub && <span className="muted small">{sub}</span>}
    </div>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Readable x-axis ticks for any range: years, months or days, never more than `max`. */
function timeTicks(t0, t1, max) {
  const span = t1 - t0
  const DAY = 86400000
  const out = []
  if (span > 2 * 365 * DAY) {
    const first = new Date(t0).getFullYear() + 1, last = new Date(t1).getFullYear()
    const step = Math.ceil((last - first + 1) / max) || 1
    for (let yr = first; yr <= last; yr += step) out.push({ t: new Date(yr, 0, 1).getTime(), label: String(yr) })
  } else if (span > 45 * DAY) {
    const d = new Date(t0); d.setDate(1); d.setMonth(d.getMonth() + 1)
    const months = []
    while (d.getTime() <= t1) { months.push(new Date(d)); d.setMonth(d.getMonth() + 1) }
    const step = Math.ceil(months.length / max) || 1
    months.forEach((m, i) => {
      if (i % step === 0) out.push({ t: m.getTime(), label: m.getMonth() === 0 ? String(m.getFullYear()) : MONTHS[m.getMonth()] })
    })
  } else {
    const days = Math.max(1, Math.round(span / DAY))
    const step = Math.ceil(days / max) || 1
    for (let i = 0; i <= days; i += step) {
      const d = new Date(t0 + i * DAY)
      out.push({ t: d.getTime(), label: `${d.getDate()} ${MONTHS[d.getMonth()]}` })
    }
  }
  return out
}
