// Plain-language findings, generated from the aggregated numbers.
// Each finding only fires when the sample is big enough to mean something.

const MIN = 30

export function takeaways(ins) {
  const good = []
  const bad = []
  const t = ins.total.pct
  const fmt = (x) => `${x.pct}% over ${x.n.toLocaleString()} games`

  const hours = ins.byHour.filter((h) => h.n >= MIN)
  if (hours.length >= 4) {
    const best = [...hours].sort((a, b) => b.pct - a.pct)[0]
    const worst = [...hours].sort((a, b) => a.pct - b.pct)[0]
    if (best.pct - worst.pct >= 8) {
      good.push(`You play best around ${best.label}:00 (${fmt(best)}).`)
      bad.push(`Your weakest hour is ${worst.label}:00 (${fmt(worst)}) - consider not playing rated games then.`)
    }
  }
  const days = ins.byWeekday.filter((d) => d.n >= MIN)
  if (days.length >= 4) {
    const best = [...days].sort((a, b) => b.pct - a.pct)[0]
    const worst = [...days].sort((a, b) => a.pct - b.pct)[0]
    if (best.pct - worst.pct >= 5) good.push(`${best.label} is your best day (${best.pct}%), ${worst.label} your worst (${worst.pct}%).`)
  }
  if (ins.openings.best && ins.openings.best.pct >= t + 5) good.push(`Best opening: ${ins.openings.best.label} - ${fmt(ins.openings.best)}.`)
  if (ins.openings.worst && ins.openings.worst.pct <= t - 5) bad.push(`Weakest opening: ${ins.openings.worst.label} - ${fmt(ins.openings.worst)}.`)

  if (ins.advantage.ahead.n >= MIN) {
    const c = ins.advantage.conversion
    ;(c >= 80 ? good : bad).push(`When you get 3+ points of material ahead you win ${c}% of the time.`)
  }
  if (ins.advantage.behind.n >= MIN && ins.advantage.comebackRate >= 30) good.push(`Fighter: you still avoid defeat in ${ins.advantage.comebackRate}% of games where you fall 3+ points behind.`)

  const [short, long, none] = ins.castling
  if (none.n >= MIN && short.n >= MIN && short.pct - none.pct >= 5) bad.push(`You score ${none.pct}% when you never castle vs ${short.pct}% when you castle short.`)
  if (long.n >= MIN && long.pct >= t + 4) good.push(`Opposite-side castling suits you: ${long.pct}% when you castle long.`)

  const eq = ins.moves.earlyQueen
  if (eq.n >= MIN && ins.moves.noEarlyQueen.pct - eq.pct >= 4) bad.push(`Moving your queen in the first 6 moves drops your score to ${eq.pct}% (vs ${ins.moves.noEarlyQueen.pct}%).`)

  for (const tc of ins.time) {
    if (tc.trouble.n >= MIN && tc.calm.pct - tc.trouble.pct >= 8)
      bad.push(`${cap(tc.tc)}: you score ${tc.trouble.pct}% in games where you fall under 10% of your clock, vs ${tc.calm.pct}% otherwise.`)
    if (tc.n >= MIN && tc.lostOnTimePct >= 10) bad.push(`${cap(tc.tc)}: ${tc.lostOnTimePct}% of your games are lost on time.`)
  }
  if (ins.afterLoss.n >= MIN && ins.afterWin.pct - ins.afterLoss.pct >= 6)
    bad.push(`Tilt: ${ins.afterWin.pct}% in the game after a win, ${ins.afterLoss.pct}% after a loss. Take a break after a defeat.`)
  const late = ins.bySession.find((s) => s.label === '11th+')
  const first = ins.bySession[0]
  if (late && late.n >= MIN && first.pct - late.pct >= 6) bad.push(`Your score falls to ${late.pct}% from the 11th game of a session onward.`)
  if (late && late.n >= MIN && late.pct - first.pct >= 6) good.push(`You warm up: ${late.pct}% from the 11th game of a session, vs ${first.pct}% in the first.`)
  const longG = ins.byLength.at(-1), shortG = ins.byLength[0]
  if (longG.n >= MIN && longG.pct - shortG.pct >= 4) good.push(`Long games favour you: ${longG.pct}% in games of 60+ moves.`)
  if (ins.accuracyN >= 20 && ins.accuracyWin != null && ins.accuracyLoss != null)
    good.push(`Average accuracy ${ins.accuracy.toFixed(1)} in ${ins.accuracyN} reviewed games (${ins.accuracyWin.toFixed(1)} in wins, ${ins.accuracyLoss.toFixed(1)} in losses).`)
  return { good, bad }
}

const cap = (s) => s[0].toUpperCase() + s.slice(1)
