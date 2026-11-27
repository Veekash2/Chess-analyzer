import { COURSES } from '../openings/courses'
import { useMemo, useState } from 'react'
import { aggregate } from './aggregate'
import { takeaways } from './takeaways'
import { RatingChart, ScoreColumns, ScoreRows, Tile } from './Charts'
import { BoardHeatmap, CalendarHeatmap, Chips, EndingBars, FormStrip, HourWeekHeatmap, StackedColumns, XYChart } from './Visuals'

const NAV = [['summary', 'Summary'], ['personality', 'Personality'], ['form', 'Form'], ['results', 'Results'], ['openings', 'Openings'], ['when', 'When you play'],
  ['time', 'Clock'], ['board', 'Board'], ['material', 'Material'], ['best', 'Best games']]

function SectionNav() {
  const go = (id) => document.getElementById(`ins-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <nav className="ins-nav" aria-label="Insights sections">
      {NAV.map(([id, label]) => <button key={id} className="tab" onClick={() => go(id)}>{label}</button>)}
    </nav>
  )
}

function ClockCurves({ clock }) {
  const [tc, setTc] = useState(clock.find((c) => c.tc === 'blitz') ? 'blitz' : clock[0].tc)
  const c = clock.find((x) => x.tc === tc) || clock[0]
  return (
    <div>
      {clock.length > 1 && <Chips label="Time control" value={c.tc} onChange={setTc} options={clock.map((x) => [x.tc, cap(x.tc)])} />}
      <XYChart
        series={[{ name: 'Wins', color: 'var(--win)', pts: c.win }, { name: 'Losses', color: 'var(--loss)', pts: c.loss }]}
        yDomain={[0, 100]} yFmt={(v) => `${Math.round(v)}%`} xFmt={(v, full) => (full ? `Move ${Math.round(v)}` : Math.round(v))}
        xLabel="move number" bands={[{ label: 'trouble', from: 0, to: 10, cls: 'band-danger' }]}
      />
      <p className="muted small">Average share of your starting clock left after each move ({c.n.toLocaleString()} {c.tc} games). Shaded = under 10%, the time-trouble zone.</p>
    </div>
  )
}

const pct = (x) => (x == null ? '-' : `${Math.round(x * 100)}%`)
const sec = (x) => (x == null ? '-' : `${x.toFixed(1)}s`)
const cap = (s) => s[0].toUpperCase() + s.slice(1)

const COURSE_NAME = Object.fromEntries(COURSES.map((c) => [c.id, c.name]))

/** Chess personality: the 16 ChessPersonality types, measured from your games. */
function Personality({ p, onOpenings }) {
  if (!p || !p.type) return <p className="muted">Play at least 30 games to get a personality.</p>
  const t = p.type
  const fav = p.openings.filter((o) => /Vienna|Scandinavian/i.test(o.name))
  return (
    <div className="persona">
      <div className="persona-head">
        <span className="persona-icon" aria-hidden="true">{t.icon}</span>
        <div>
          <span className="small muted">Your chess personality</span>
          <h3>The {t.name}</h3>
          <p>{t.blurb}</p>
        </div>
      </div>
      <div className="persona-dims">
        {Object.entries(p.dims).map(([k, d]) => (
          <div key={k} className="pdim">
            <div className="pdim-labels"><span className={d.value < 0.5 ? 'on' : ''}>{d.left}</span><span className={d.value >= 0.5 ? 'on' : ''}>{d.right}</span></div>
            <div className="pdim-bar" role="img" aria-label={`${d.left} ${Math.round(100 - d.value * 100)}% / ${d.right} ${Math.round(d.value * 100)}%`}><span style={{ left: `${Math.max(2, Math.min(98, d.value * 100))}%` }} /></div>
            <ul className="small muted">{d.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        ))}
      </div>
      <div className="persona-grid">
        <div>
          <h4>Players you play like</h4>
          <p><strong>{t.player}</strong> <span className="small muted">- the quiz's example of a {t.name}</span></p>
          <p className="small">Learn from: {t.also.join(', ')}.</p>
        </div>
        <div>
          <h4>Openings that suit a {t.name}</h4>
          <p className="small">The quiz suggests: <strong>{t.openings.join(' and ')}</strong>.</p>
          <p className="small">Courses here:</p>
          <div className="persona-courses">{t.courses.filter((id) => COURSE_NAME[id]).map((id) => <button key={id} className="secondary slim" onClick={onOpenings}>{COURSE_NAME[id]}</button>)}</div>
        </div>
        <div>
          <h4>Your best openings</h4>
          <ol className="small persona-open">{p.openings.slice(0, 5).map((o) => <li key={o.name}>{o.name} <span className="muted">- {o.score}% in {o.n} games</span></li>)}</ol>
          {fav.length > 0 && <p className="small">You picked the Vienna and Scandinavian: {fav.map((o) => `${o.name} ${o.score}% (${o.n} games)`).join(', ')}. Both are sharp, development-first openings that fit an attacking style.</p>}
        </div>
      </div>
      <p className="small muted">
        Closest other types: {p.matches.filter((m) => m.type !== t).slice(0, 3).map((m) => `${m.type.name} ${m.pct}%`).join(' · ')}. Measured from {p.n.toLocaleString()} games; types, players and opening picks follow Chess.com's <a href="https://www.chesspersonality.com/quiz" target="_blank" rel="noreferrer">ChessPersonality quiz</a> - take it to compare.
      </p>
    </div>
  )
}

function Section({ id, title, sub, children }) {
  return (
    <section className="card insight" id={id ? `ins-${id}` : undefined}>
      <h3>{title}</h3>
      {sub && <p className="muted small sub">{sub}</p>}
      {children}
    </section>
  )
}

function GameList({ title, games, value, onReview }) {
  if (!games.length) return null
  return (
    <div className="game-list">
      <h4>{title}</h4>
      <ol>
        {games.map((r) => (
          <li key={r.url}>
            <a href={r.url} target="_blank" rel="noreferrer">vs {r.opponent}</a>
            <span className="muted small"> {r.oppPre ?? r.oppRating} · {r.timeClass} · {r.end.toLocaleDateString()}</span>
            <span className="num strong">{value(r)}</span>
            {onReview && r.pgn && <button className="link-btn small" onClick={() => onReview(r)}>review</button>}
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function InsightsView({ rows, records, progress, scopeLabel, onReview, onOpenings }) {
  const ins = useMemo(() => (records ? aggregate(rows, records) : null), [rows, records])
  const tips = useMemo(() => (ins ? takeaways(ins) : null), [ins])

  if (!records) {
    return (
      <section className="card">
        <p>
          Replaying every game to build your insights
          {progress ? ` - ${progress.done.toLocaleString()} of ${progress.total.toLocaleString()} games` : '...'}
        </p>
        <div className="progress"><span style={{ width: progress ? `${(100 * progress.done) / progress.total}%` : '2%' }} /></div>
        <p className="muted small">This runs in your browser and takes about 10-30 seconds for 5,000 games.</p>
      </section>
    )
  }
  if (!ins.n) return <section className="card"><p>No games for this filter.</p></section>

  const o = ins.openings
  const v = ins.vis
  const openingExtra = (x) => (x.acc != null ? ` · acc ${x.acc.toFixed(0)}` : '')
  return (
    <div className="insights">
      {ins.analysed < ins.n && (
        <p className="muted small scope">
          Move-level stats use the {ins.analysed.toLocaleString()} standard-chess games of these {ins.n.toLocaleString()} that could be replayed (variants like Chess960 are skipped).
        </p>
      )}

      <SectionNav />
      <section className="tiles" id="ins-summary">
        <Tile value={`${ins.total.pct}%`} label="score" sub={`${ins.total.w}W ${ins.total.d}D ${ins.total.l}L`} />
        <Tile value={ins.accuracy != null ? ins.accuracy.toFixed(1) : '-'} label="avg accuracy" sub={`${ins.accuracyN} reviewed games`} />
        <Tile value={ins.avgOpp ? Math.round(ins.avgOpp) : '-'} label="avg opponent rating" sub="before the game" />
        <Tile value={`${ins.streaks.win} / ${ins.streaks.loss}`} label="longest win / loss streak" />
      </section>

      <Section id="personality" title="Chess personality" sub="Which of the 16 ChessPersonality types your games point to - and who and what to study.">
        <Personality p={ins.personality} onOpenings={onOpenings} />
      </Section>

      {tips && (tips.good.length > 0 || tips.bad.length > 0) && (
        <div className="grid">
          <Section title="What's working">
            <ul className="tips good">{tips.good.map((t) => <li key={t}>{t}</li>)}</ul>
          </Section>
          <Section title="What's costing you points">
            <ul className="tips bad">{tips.bad.map((t) => <li key={t}>{t}</li>)}</ul>
          </Section>
        </div>
      )}

      <Section id="form" title="Recent form" sub="Your last 100 results, oldest on the left. Each square links to the game.">
        <FormStrip form={v.form} />
        {v.rolling.length > 1 && (
          <>
            <h4>Form over time (each point = score in your previous {v.rollingWindow} games)</h4>
            <XYChart
              series={[{ name: `Score, last ${v.rollingWindow} games`, color: 'var(--s1)', pts: v.rolling }]}
              yDomain={[0, 100]} refLine={50} yFmt={(y) => `${Math.round(y)}%`}
              xFmt={(x, full) => {
                const p = v.rolling.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a))
                const d = new Date(p.t)
                return full ? `Game ${Math.round(x)} - ${d.toLocaleDateString()}` : d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
              }}
            />
          </>
        )}
      </Section>

      <Section title="Rating over time" sub="Rated standard games, last rating of each day. Hover or tap to read values.">
        <RatingChart series={ins.rating} />
      </Section>

      <div className="grid" id="ins-results">
        <Section title="Results vs expectation" sub="Your real score against opponents rated above or below you, compared with what the rating system predicts.">
          <XYChart
            series={[
              { name: 'Your score', color: 'var(--s1)', pts: v.expected.map((e) => ({ x: e.x, y: e.actual, n: e.n })), dots: true },
              { name: 'Expected', color: 'var(--ink2)', pts: v.expected.map((e) => ({ x: e.x, y: e.expected })), dashed: true },
            ]}
            yDomain={[0, 100]} yFmt={(y) => `${Math.round(y)}%`}
            xFmt={(x, full) => (full ? `Opponent ${x > 0 ? '+' : ''}${Math.round(x)} rating` : `${x > 0 ? '+' : ''}${Math.round(x)}`)}
            xLabel="opponent's rating minus yours"
          />
        </Section>
        <Section title="How your games end">
          <EndingBars endings={v.endings} />
        </Section>
      </div>

      <div className="grid">
        <Section title="Results by rating difference" sub="Opponent's rating minus yours, both before the game.">
          <ScoreRows items={ins.byDiff} labelWidth={150} />
        </Section>
        <Section title="Results by game length">
          <ScoreRows items={ins.byLength} labelWidth={90} />
          <h4>Where your games are decided</h4>
          <ScoreRows items={ins.byPhase.map((p) => ({ ...p, label: cap(p.label) }))} labelWidth={90} />
          <p className="muted small">Phase in which the game ended: endgame = most pieces traded off.</p>
        </Section>
      </div>

      <Section id="openings" title="Openings" sub="Score % with win/draw/loss split. Accuracy shown where Chess.com reviewed the games.">
        <div className="grid tight">
          <div>
            <h4>As White - first move</h4>
            <ScoreRows items={o.whiteFirst} labelWidth={70} />
            <h4>As Black vs 1.e4</h4>
            <ScoreRows items={o.vsE4} labelWidth={70} />
            <h4>As Black vs 1.d4</h4>
            <ScoreRows items={o.vsD4} labelWidth={70} />
          </div>
          <div>
            <h4>Most played as White</h4>
            <ScoreRows items={o.whiteNamed.slice(0, 6)} labelWidth={190} extra={openingExtra} />
            <h4>Most played as Black</h4>
            <ScoreRows items={o.blackNamed.slice(0, 6)} labelWidth={190} extra={openingExtra} />
          </div>
        </div>
      </Section>

      <Section id="when" title="Activity" sub="Games per day over the last year of this selection. Hover or tap a day.">
        <CalendarHeatmap calendar={v.calendar} />
      </Section>
      <div className="grid">
        <Section title="When you play best" sub="Day of week by hour of day (your local time).">
          <HourWeekHeatmap hw={v.hw} />
        </Section>
        <Section title="Day of week" sub="Score % by day. Faded bars have under 20 games.">
          <ScoreColumns items={ins.byWeekday} />
          <h4>Hour of day</h4>
          <ScoreColumns items={ins.byHour} height={90} />
        </Section>
      </div>

      {v.clock.length > 0 && (
        <Section id="time" title="Your clock, move by move" sub="Do your losses come from running short of time?">
          <ClockCurves clock={v.clock} />
        </Section>
      )}

      {ins.time.length > 0 && (
        <Section title="Time management" sub="From the clock times stored with each move. Time trouble = 3+ moves played with under 10% of your starting clock.">
          <div className="scroll-x time-table">
            <table>
              <thead>
                <tr>
                  <th>Time control</th><th className="num">Games</th><th className="num">Moves 1-10</th><th className="num">11-30</th><th className="num">31+</th>
                  <th className="num">Clock left (wins)</th><th className="num">Clock left (losses)</th><th className="num">Lost on time</th>
                  <th className="num">Score in time trouble</th><th className="num">Score otherwise</th>
                </tr>
              </thead>
              <tbody>
                {ins.time.map((t) => (
                  <tr key={t.tc}>
                    <td>{cap(t.tc)}</td>
                    <td className="num">{t.n.toLocaleString()}</td>
                    <td className="num">{sec(t.opening)}</td>
                    <td className="num">{sec(t.middlegame)}</td>
                    <td className="num">{sec(t.late)}</td>
                    <td className="num">{pct(t.leftWin)}</td>
                    <td className="num">{pct(t.leftLoss)}</td>
                    <td className="num">{t.lostOnTime} ({t.lostOnTimePct}%)</td>
                    <td className="num">{t.trouble.n ? `${t.trouble.pct}% (${t.trouble.n})` : '-'}</td>
                    <td className="num">{t.calm.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="time-cards">
            {ins.time.map((t) => (
              <div className="time-card" key={t.tc}>
                <h4>{cap(t.tc)} <span className="muted small">{t.n.toLocaleString()} games</span></h4>
                <dl>
                  <dt>Seconds per move</dt><dd>{sec(t.opening)} / {sec(t.middlegame)} / {sec(t.late)}</dd>
                  <dt>Clock left - wins / losses</dt><dd>{pct(t.leftWin)} / {pct(t.leftLoss)}</dd>
                  <dt>Lost on time</dt><dd>{t.lostOnTime} ({t.lostOnTimePct}%)</dd>
                  <dt>Score in time trouble</dt><dd>{t.trouble.n ? `${t.trouble.pct}% (${t.trouble.n})` : '-'}</dd>
                  <dt>Score otherwise</dt><dd>{t.calm.pct}%</dd>
                </dl>
              </div>
            ))}
          </div>
          <p className="muted small">Seconds per move = average time you spend per move in moves 1-10, 11-30 and 31+.</p>
        </Section>
      )}

      <Section id="board" title="Where your pieces go" sub="Every square you moved a piece to - the brighter, the more often.">
        <BoardHeatmap boards={v.boards} />
      </Section>

      <div className="grid">
        <Section title="Your pieces" sub="Share of all your moves and captures made by each piece.">
          <table>
            <thead><tr><th>Piece</th><th>Moves</th><th className="num" /><th>Captures</th><th className="num" /></tr></thead>
            <tbody>
              {ins.pieces.map((p) => (
                <tr key={p.label}>
                  <td>{p.label}</td>
                  <td><div className="hbar"><span style={{ width: `${p.movePct * 2.5}%` }} /></div></td>
                  <td className="num">{p.movePct.toFixed(0)}%</td>
                  <td><div className="hbar alt"><span style={{ width: `${p.capPct * 2.5}%` }} /></div></td>
                  <td className="num">{p.capPct.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mini-stats">
            <span><strong>{ins.moves.avgLength?.toFixed(0)}</strong> moves per game</span>
            <span><strong>{ins.moves.checksPerGame?.toFixed(1)}</strong> checks per game</span>
            <span><strong>{ins.moves.capturesPerGame?.toFixed(1)}</strong> captures per game</span>
            <span><strong>{ins.moves.promos}</strong> promotions ({ins.moves.underpromos} under-promotions)</span>
          </div>
        </Section>
        <Section title="Castling & king safety">
          <ScoreRows items={ins.castling} labelWidth={150} />
          <p className="muted small">You castle on move {ins.moves.avgCastleMove?.toFixed(0) ?? '-'} on average.</p>
          <h4>Early queen moves</h4>
          <ScoreRows labelWidth={150} items={[
            { label: 'Queen out by move 6', ...ins.moves.earlyQueen },
            { label: 'Queen stays home', ...ins.moves.noEarlyQueen },
          ]} />
        </Section>
      </div>

      <div className="grid" id="ins-material">
        <Section title="Material swing by move" sub="Average material balance (pawn = 1, knight/bishop = 3, rook = 5, queen = 9) after each move.">
          <XYChart
            series={[
              { name: 'Wins', color: 'var(--win)', pts: v.material.win },
              { name: 'Draws', color: 'var(--draw)', pts: v.material.draw },
              { name: 'Losses', color: 'var(--loss)', pts: v.material.loss },
            ]}
            refLine={0} yFmt={(y, full) => `${y > 0 ? '+' : ''}${full ? y.toFixed(1) : Math.round(y)}`}
            xFmt={(x, full) => (full ? `Move ${Math.round(x)}` : Math.round(x))} xLabel="move number"
          />
          <p className="muted small">Where the lines split is where your games are usually won or lost.</p>
        </Section>
        <Section title="Accuracy spread" sub="Only games Chess.com has reviewed have an accuracy score.">
          <StackedColumns bins={v.accBins} />
        </Section>
      </div>

      <div className="grid">
        <Section title="Winning and saving positions" sub="Material lead or deficit of 3+ points (a piece) held for two full moves.">
          <ScoreRows labelWidth={130} items={[
            { label: 'When ahead', ...ins.advantage.ahead },
            { label: 'When behind', ...ins.advantage.behind },
          ]} />
          <div className="mini-stats">
            <span><strong>{ins.advantage.conversion ?? '-'}%</strong> of winning positions converted</span>
            <span><strong>{ins.advantage.comebackRate ?? '-'}%</strong> of losing positions saved (win or draw)</span>
          </div>
        </Section>
        <Section title="Sessions & tilt" sub="A session is a run of games with less than 30 minutes between them.">
          <ScoreRows labelWidth={110} items={[
            { label: 'After a win', ...ins.afterWin },
            { label: 'After a loss', ...ins.afterLoss },
          ]} />
          <h4>By game number in a session</h4>
          <ScoreRows items={ins.bySession} labelWidth={110} />
        </Section>
      </div>

      <Section id="best" title="Best games" sub="Open a game on Chess.com to see its full review, including Brilliant (!!) moves.">
        <div className="grid tight">
          <GameList onReview={onReview} title="Highest accuracy wins" games={ins.bestGames.accuracy} value={(r) => r.accuracy.toFixed(1)} />
          <GameList onReview={onReview} title="Biggest upsets" games={ins.bestGames.upsets} value={(r) => `+${Math.round(r.oppPre - r.myPre)}`} />
          <GameList onReview={onReview} title="Fastest checkmates" games={ins.bestGames.fastestMates} value={(r) => `${Math.ceil(r.rec.plies / 2)} moves`} />
          <GameList onReview={onReview} title="Greatest comebacks" games={ins.bestGames.comebacks} value={(r) => `-${r.rec.maxDeficit} pts`} />
        </div>
      </Section>
    </div>
  )
}
