// Decorative mandala / rangoli ornament drawn with plain SVG (no image files).
export default function Mandala({ size = 220, className = '' }) {
  const petals = (n, r, rx, ry, extra = {}) =>
    Array.from({ length: n }, (_, i) => (
      <ellipse key={`${r}-${i}`} cx="0" cy={-r} rx={rx} ry={ry} transform={`rotate(${(360 / n) * i})`} {...extra} />
    ))
  return (
    <svg className={`mandala ${className}`} width={size} height={size} viewBox="-110 -110 220 220" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle r="104" strokeDasharray="2 5" />
        <circle r="96" />
        {petals(24, 82, 7, 15)}
        <circle r="66" />
        {petals(16, 54, 9, 14)}
        <circle r="40" strokeDasharray="3 4" />
        {petals(8, 26, 8, 14)}
        <circle r="13" />
      </g>
      <g fill="currentColor" opacity=".55">
        {petals(24, 96, 2.4, 2.4)}
        {petals(8, 40, 3, 3)}
        <circle r="5" />
      </g>
    </svg>
  )
}
