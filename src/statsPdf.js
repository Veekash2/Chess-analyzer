import { jsPDF } from 'jspdf'
import * as autoTableModule from 'jspdf-autotable'

// The plugin exposes the function differently in its ESM and CommonJS builds
const autoTable = autoTableModule.autoTable || autoTableModule.default?.default || autoTableModule.default

const INK = [11, 11, 11]
const INK2 = [82, 81, 78]
const LINE = [228, 227, 223]
const ACCENT = [93, 138, 58]
const WIN = [42, 120, 214]
const DRAW = [185, 184, 178]
const LOSS = [235, 104, 52]

// Helvetica in jsPDF only covers Latin-1; swap anything else for '?'
const safe = (s) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')

function wdlBar(doc, x, y, w, h, s) {
  if (!s.n) return
  let cx = x
  for (const [v, c] of [[s.w, WIN], [s.d, DRAW], [s.l, LOSS]]) {
    if (!v) continue
    const segW = (w * v) / s.n
    doc.setFillColor(...c)
    doc.rect(cx, y, Math.max(segW - 0.4, 0.2), h, 'F')
    cx += segW
  }
}

/**
 * Builds a PDF of the statistics currently shown on the page and saves it.
 * `data` is the same set of numbers the page renders, for the active time-control tab.
 */
export function downloadStatsPdf(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 14
  let y = 18

  const heading = (text) => {
    if (y > 260) { doc.addPage(); y = 18 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...INK)
    doc.text(text, M, y)
    y += 4
  }

  // Title
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ACCENT)
  doc.text('SINGH MASTER CHESS  |  STATISTICS', M, y)
  y += 8
  doc.setFontSize(22); doc.setTextColor(...INK)
  doc.text(safe(data.username), M, y)
  y += 6
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK2)
  const sub = [data.realName, data.joined && `Joined ${data.joined}`, `Showing: ${data.filterLabel}`, `Generated ${new Date().toLocaleDateString()}`]
    .filter(Boolean).join('   |   ')
  doc.text(safe(sub), M, y)
  y += 7

  // Ratings strip
  if (data.ratings.length) {
    const cw = (W - 2 * M) / data.ratings.length
    data.ratings.forEach((r, i) => {
      const x = M + i * cw
      doc.setDrawColor(...LINE); doc.rect(x, y, cw, 16)
      doc.setFontSize(8); doc.setTextColor(...INK2); doc.text(r.k.toUpperCase(), x + cw / 2, y + 4.5, { align: 'center' })
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...INK)
      doc.text(String(r.now ?? '-'), x + cw / 2, y + 10.5, { align: 'center' })
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...INK2)
      if (r.best) doc.text(`best ${r.best}`, x + cw / 2, y + 14, { align: 'center' })
    })
    y += 21
  }

  // Headline tiles
  const t = data.total
  const tiles = [
    [t.n.toLocaleString(), 'games'],
    [`${t.w}-${t.d}-${t.l}`, 'wins - draws - losses'],
    [`${t.pct}%`, 'score'],
    [data.avgAcc ?? '-', `avg accuracy${data.accCount ? ` (${data.accCount} reviewed)` : ''}`],
  ]
  const tw = (W - 2 * M) / 4
  tiles.forEach(([v, l], i) => {
    const x = M + i * tw
    doc.setFillColor(246, 246, 243); doc.rect(x + 0.5, y, tw - 1, 17, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...INK)
    doc.text(String(v), x + 4, y + 8)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...INK2)
    doc.text(l, x + 4, y + 13.5)
  })
  y += 24

  // Breakdown bars: colour + time control
  const barSection = (title, items) => {
    heading(title)
    y += 1
    for (const it of items) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK)
      doc.text(safe(it.label), M, y + 3)
      wdlBar(doc, M + 28, y, 100, 3.6, it)
      doc.setTextColor(...INK2)
      doc.text(`${it.pct}%  (${it.w}-${it.d}-${it.l}, ${it.n} games)`, M + 132, y + 3)
      y += 7
    }
  }
  barSection('By colour', data.byColor.map((x) => ({ ...x, label: x.c[0].toUpperCase() + x.c.slice(1) })))
  y += 2
  if (data.byClass.length) barSection(`By time control (${data.classLabel || 'all games'})`, data.byClass.map((x) => ({ ...x, label: x.t[0].toUpperCase() + x.t.slice(1) })))
  // legend
  doc.setFontSize(7.5)
  ;[['win', WIN], ['draw', DRAW], ['loss', LOSS]].forEach(([l, c], i) => {
    doc.setFillColor(...c); doc.rect(M + i * 18, y - 2.2, 3, 3, 'F')
    doc.setTextColor(...INK2); doc.text(l, M + 4.5 + i * 18, y)
  })
  y += 7

  const table = (title, head, body, opts = {}) => {
    heading(title)
    autoTable(doc, {
      startY: y,
      head: [head],
      body: body.map((r) => r.map(safe)),
      margin: { left: M, right: M },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.6, textColor: INK, lineColor: LINE, lineWidth: 0.1 },
      headStyles: { fillColor: INK, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 247, 245] },
      ...opts,
    })
    y = doc.lastAutoTable.finalY + 9
  }

  table('How games ended', ['Outcome', 'By', 'Games'],
    data.endings.map((e) => [e.outcome, e.how, e.n]),
    { columnStyles: { 2: { halign: 'right' } }, tableWidth: 110 })

  table('Most played openings', ['Side', 'Opening', 'Games', 'W-D-L', 'Score'],
    data.openings.map((o) => [o.color, o.name, o.n, `${o.w}-${o.d}-${o.l}`, `${o.pct}%`]),
    { columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right' } } })

  table('Most played opponents', ['Opponent', 'Games', 'W-D-L', 'Score'],
    data.opponents.map((o) => [o.name, o.n, `${o.w}-${o.d}-${o.l}`, `${o.pct}%`]),
    { columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } }, tableWidth: 130 })

  const shown = data.games.slice(0, 200)
  table(`Games (${shown.length === data.games.length ? 'all ' + data.games.length : `latest ${shown.length} of ${data.games.length.toLocaleString()}`})`,
    ['Date', 'Type', 'Side', 'Opponent', 'Result', 'How', 'Opening', 'Acc.'],
    shown.map((r) => [r.end.toLocaleDateString(), r.timeClass, r.color, `${r.opponent} (${r.oppRating})`, r.outcome, r.howLabel, r.opening,
      r.accuracy != null ? r.accuracy.toFixed(1) : '']),
    {
      styles: { fontSize: 7, cellPadding: 1.2, textColor: INK, lineColor: LINE, lineWidth: 0.1 },
      columnStyles: { 6: { cellWidth: 52 }, 7: { halign: 'right' } },
      didParseCell: (h) => {
        if (h.section === 'body' && h.column.index === 4) {
          h.cell.styles.textColor = h.cell.raw === 'win' ? WIN : h.cell.raw === 'loss' ? LOSS : INK2
          h.cell.styles.fontStyle = 'bold'
        }
      },
    })

  // Footer on every page
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(138, 137, 132)
    doc.text(safe(`${data.username} - Singh Master Chess - ${data.filterLabel}`), M, 290)
    doc.text(`Page ${i} of ${pages}`, W - M, 290, { align: 'right' })
  }

  doc.save(`${data.username}_${data.filterKey}_stats.pdf`)
}
