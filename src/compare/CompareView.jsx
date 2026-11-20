import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchAllGames, fetchProfile } from '../chessApi'
import { POOLS, deepCompare, matchup, quickCompare } from './compareData'
import { WdlBar } from '../insights/Charts'
import { Chips, XYChart } from '../insights/Visuals'

const MAX = 4
const COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'] // validated categorical order
const MONTHS = [[3, '3 months'], [6, '6 months'], [12, '1 year'], [0, 'All time']]
const TCS = [['all', 'All'], ['bullet', 'Bullet'], ['blitz', 'Blitz'], ['rapid', 'Rapid'], ['daily', 'Daily']]
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDay = (t) => { const d = new Date(t); return `${d.getDate()} ${MON[d.getMonth()]}` }
const fmtMonth = (t) => { const d = new Date(t); return `${MON[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` }

function Crown() {
  return <span className="crown" title="Leader" aria-label="leader">♛</span>
}

function PlayerChip({ name, color, onRemove }) {
  return (
    <span className="p-chip" style={{ '--pc': color }}>
      <i />{name}
      {onRemove && <button className="chip-x" onClick={onRemove} aria-label={`Remove ${name}`}>×</button>}
    </span>
  )
}

export default function CompareView({ me, suggestions = [] }) {
  // remember the last group you compared (saved in this browser)
  const [names, setNames] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('smc-compare-names') || '[]'); if (Array.isArray(saved) && saved.length) return saved.slice(0, MAX) } catch { /* ignore */ }
    return me ? [me] : []
  })
  useEffect(() => { try { localStorage.setItem('smc-compare-names', JSON.stringify(names)) } catch { /* ignore */ } }, [names])
  const [input, setInput] = useState('')
  const [players, setPlayers] = useState(null) // [{ username, profile, stats }]
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [error, setError] = useState('')
  const [months, setMonths] = useState(3)
  const [deep, setDeep] = useState(null) // { status, progress, games: [] }
  const [tc, setTc] = useState('all')
  const abortRef = useRef(null)

  const add = (raw) => {
    const n = raw.trim().replace(/^@/, '')
    if (!n) return
    if (names.some((x) => x.toLowerCase() === n.toLowerCase())) { setInput(''); return }
    if (names.length >= MAX) { setError(`You can compare up to ${MAX} players.`); return }
    setNames([...names, n]); setInput(''); setError('')
  }
  const remove = (i) => { setNames(names.filter((_, j) => j !== i)); setPlayers(null); setDeep(null) }

  async function compare() {
    abortRef.current?.abort()
    const ctrl = new AbortController(); abortRef.current = ctrl
    setStatus('loading'); setError(''); setDeep(null)
    try {
      const out = []
      for (const n of names) {
        try {
          const p = await fetchProfile(n, ctrl.signal)
          out.push({ username: n, profile: p.profile, stats: p.stats }) // keep the capitalisation the user typed
        } catch (e) {
          if (e.name === 'AbortError') throw e
          throw new Error(e.status === 404 ? `No Chess.com player called "${n}".` : e.message)
        }
      }
      setPlayers(out); setStatus('done')
    } catch (e) {
      if (e.name === 'AbortError') return
      setError(e.message); setStatus('error')
    }
  }

  async function loadGames() {
    const ctrl = new AbortController(); abortRef.current = ctrl
    const games = []
    setDeep({ status: 'loading', progress: { player: 0, done: 0, total: 0 }, games })
    try {
      for (let i = 0; i < players.length; i++) {
        const g = await fetchAllGames(players[i].username, {
          signal: ctrl.signal, months: months || undefined,
          onProgress: (p) => setDeep((d) => ({ ...d, progress: { player: i, done: p.done, total: p.total } })),
        })
        games.push(g)
      }
      setDeep({ status: 'done', games })
    } catch (e) {
      if (e.name === 'AbortError') return
      setDeep({ status: 'error', error: e.message })
    }
  }

  const quick = useMemo(() => (players ? quickCompare(players) : null), [players])
  const deepData = useMemo(() => (players && deep?.status === 'done' ? deepCompare(players, deep.games, tc) : null), [players, deep, tc])
  const cols = players?.length || 0
  const sugg = suggestions.filter((s) => !names.some((n) => n.toLowerCase() === s.toLowerCase())).slice(0, 8)

  return (
    <div className="compare">
      <section className="card">
        <h3>Compare friends</h3>
        <p className="muted small">Add up to {MAX} Chess.com usernames - you and your friends - to see who leads where. Chess.com doesn't share friend lists publicly, so type their usernames{suggestions.length ? ' or pick from the people you play most' : ''}.</p>
        <div className="p-chips">
          {names.map((n, i) => <PlayerChip key={n} name={n} color={COLORS[i]} onRemove={() => remove(i)} />)}
        </div>
        <form className="search compare-add" onSubmit={(e) => { e.preventDefault(); add(input) }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add a friend's username" aria-label="Friend's Chess.com username" spellCheck={false} disabled={names.length >= MAX} />
          <button type="submit" className="secondary" disabled={!input.trim() || names.length >= MAX}>Add</button>
        </form>
        {sugg.length > 0 && names.length < MAX && (
          <div className="sugg">
            <span className="muted small">You often play:</span>
            {sugg.map((s) => <button key={s} className="sugg-chip" onClick={() => add(s)}>+ {s}</button>)}
          </div>
        )}
        <button className="big-green compare-go" onClick={compare} disabled={names.length < 2 || status === 'loading'}>
          {status === 'loading' ? 'Loading players...' : names.length < 2 ? 'Add at least 2 players' : `Compare ${names.length} players`}
        </button>
        {error && <p className="error">{error}</p>}
      </section>

      {status === 'done' && players && quick && (
        <>
          {/* player cards */}
          <div className="cmp-players" style={{ '--cols': cols }}>
            {players.map((p, i) => (
              <section key={p.username} className="card cmp-player" style={{ '--pc': COLORS[i] }}>
                {p.profile.avatar ? <img src={p.profile.avatar} alt="" /> : <div className="cmp-avatar">{p.username[0].toUpperCase()}</div>}
                <div className="cmp-pname">
                  <a href={p.profile.url} target="_blank" rel="noreferrer">{p.username}</a>
                  {p.profile.title && <span className="title">{p.profile.title}</span>}
                </div>
                <span className="muted small">Joined {new Date(p.profile.joined * 1000).getFullYear()}</span>
                <div className="cmp-total">
                  <strong>{quick.totals[i].n.toLocaleString()}</strong><span className="muted small">games</span>
                  <WdlBar s={quick.totals[i]} />
                  <span className="muted small">{quick.totals[i].pct ?? '-'}% score</span>
                </div>
              </section>
            ))}
          </div>

          {/* ratings table */}
          <section className="card">
            <h3>Ratings</h3>
            <div className="scroll-x">
              <table className="cmp-table">
                <thead>
                  <tr><th />{players.map((p, i) => <th key={p.username} className="num"><PlayerChip name={p.username} color={COLORS[i]} /></th>)}</tr>
                </thead>
                <tbody>
                  {quick.ratingRows.map((r) => (
                    <tr key={r.key}>
                      <td><strong>{r.label}</strong></td>
                      {r.cells.map((c, i) => (
                        <td key={i} className={`num ${r.leader === i ? 'lead' : ''}`}>
                          {c ? (
                            <div className="rate-cell">
                              <span className="rate-now">{r.leader === i && <Crown />}{c.now ?? '-'}</span>
                              <span className="muted small">best {c.best ?? '-'}</span>
                              {c.n > 0 && <span className="muted small">{c.w}W {c.d}D {c.l}L · {c.pct}%</span>}
                            </div>
                          ) : <span className="muted">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {quick.extra.map((r) => (
                    <tr key={r.key}>
                      <td><strong>{r.label}</strong></td>
                      {r.cells.map((c, i) => (
                        <td key={i} className={`num ${r.leader === i ? 'lead' : ''}`}>
                          <span className="rate-now">{r.leader === i && <Crown />}{c ?? '-'}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">♛ = highest current rating. Records are lifetime totals from Chess.com.</p>
          </section>

          {/* rating bars per pool */}
          <section className="card">
            <h3>Rating face-off</h3>
            <div className="faceoff">
              {quick.ratingRows.filter((r) => r.cells.some((c) => c?.now)).map((r) => {
                const vals = r.cells.map((c) => c?.now || 0)
                const max = Math.max(...vals), min = Math.min(...vals.filter(Boolean))
                const lo = Math.max(0, Math.floor((min - 200) / 100) * 100)
                return (
                  <div key={r.key} className="faceoff-group">
                    <h4>{r.label}</h4>
                    {vals.map((v, i) => (
                      <div key={i} className="faceoff-row">
                        <span className="fo-name">{players[i].username}</span>
                        <div className="fo-track"><span style={{ width: v ? `${(100 * (v - lo)) / Math.max(1, max - lo)}%` : 0, background: COLORS[i] }} /></div>
                        <span className="num strong">{v || '-'}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </section>

          {/* deeper comparison */}
          <section className="card">
            <h3>Recent games, form and head-to-head</h3>
            <p className="muted small">Downloads each player's recent games to compare form, openings, accuracy and your games against each other.</p>
            <div className="deep-controls">
              <Chips label="Period" value={months} onChange={(m) => { setMonths(m); setDeep(null) }} options={MONTHS} />
              {deep?.status !== 'loading' && <button onClick={loadGames}>{deep?.status === 'done' ? 'Reload games' : 'Load games'}</button>}
            </div>
            {deep?.status === 'loading' && (
              <>
                <p className="small">Downloading {players[deep.progress.player]?.username}: month {deep.progress.done} of {deep.progress.total || '?'} (player {deep.progress.player + 1} of {players.length})</p>
                <div className="progress"><span style={{ width: `${((deep.progress.player + (deep.progress.total ? deep.progress.done / deep.progress.total : 0)) / players.length) * 100}%` }} /></div>
              </>
            )}
            {deep?.status === 'error' && <p className="error">{deep.error}</p>}
          </section>

          {deepData && <DeepSection players={players} data={deepData} tc={tc} setTc={setTc} months={months} />}
        </>
      )}
    </div>
  )
}

function MovePill({ m }) { return <span className="move-pill">{m}</span> }

function OpeningPrediction({ label, white, black, o }) {
  if (!o) return <div className="mu-open"><h5>{label}</h5><p className="muted small">Not enough games to predict.</p></div>
  return (
    <div className="mu-open">
      <h5>{label}</h5>
      <p className="small"><strong>{white}</strong> usually opens <MovePill m={`1.${o.first.key}`} /> <span className="muted">({o.first.pct}% of {o.first.of} White games)</span></p>
      {(o.first.of < 10 || (o.reply && o.sampleReply < 10)) && <p className="small sample-warn">Small sample - pick a longer period or "All" time controls for a better read.</p>}
      {o.reply ? (
        <p className="small">Against that, <strong>{black}</strong> usually answers <MovePill m={`1...${o.reply.key}`} /> <span className="muted">({o.reply.pct}% of {o.sampleReply} games)</span></p>
      ) : <p className="muted small">{black} rarely faces 1.{o.first.key} - expect something new.</p>}
      {o.named && (
        <p className="small mu-line">Most likely opening: <strong>{o.named.name}</strong>
          <span className="muted"> - {white} scores {o.named.white.n ? `${o.named.white.pct}% (${o.named.white.n})` : 'n/a'} in it, {black} {o.named.black.n ? `${o.named.black.pct}% (${o.named.black.n})` : 'n/a'}</span></p>
      )}
    </div>
  )
}

function Matchup({ players, data }) {
  const [pair, setPair] = useState('0-1')
  const pairs = []
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) pairs.push([`${i}-${j}`, `${players[i].username} vs ${players[j].username}`])
  const [a, b] = pair.split('-').map(Number)
  const m = useMemo(() => matchup(players, data, a, b), [players, data, a, b])
  const nA = players[a].username, nB = players[b].username
  const e = m.expect
  return (
    <section className="card matchup">
      <h3>Matchup preview</h3>
      <p className="muted small">If these two played a {m.pool} game today - based on current ratings and how each of them usually plays.</p>
      {pairs.length > 1 && <Chips label="Pair" value={pair} onChange={setPair} options={pairs} />}
      <div className="mu-head">
        <PlayerChip name={nA} color={COLORS[a]} />
        <span className="mu-vs">vs</span>
        <PlayerChip name={nB} color={COLORS[b]} />
      </div>
      {e ? (
        <div className="mu-odds">
          <div className="mu-bar" role="img" aria-label={`${nA} wins ${Math.round(e.win * 100)}%, draw ${Math.round(e.draw * 100)}%, ${nB} wins ${Math.round(e.loss * 100)}%`}>
            <span style={{ flex: e.win, background: COLORS[a] }} />
            <span style={{ flex: e.draw, background: 'var(--draw)' }} />
            <span style={{ flex: e.loss, background: COLORS[b] }} />
          </div>
          <div className="mu-odds-labels small">
            <span><strong>{Math.round(e.win * 100)}%</strong> {nA} wins</span>
            <span><strong>{Math.round(e.draw * 100)}%</strong> draw</span>
            <span><strong>{Math.round(e.loss * 100)}%</strong> {nB} wins</span>
          </div>
          <p className="muted small">Expected score {(e.e * 100).toFixed(0)}-{(100 - e.e * 100).toFixed(0)} for {nA} ({e.ra} vs {e.rb}, Elo formula){m.h2h ? `. Real head-to-head in this period: ${m.h2h.w}W ${m.h2h.d}D ${m.h2h.l}L for ${nA}.` : '.'}</p>
        </div>
      ) : <p className="muted small">One of the players has no {m.pool} rating, so no odds.</p>}

      <div className="mu-grid">
        <OpeningPrediction label={`${nA} with White`} white={nA} black={nB} o={m.aWhite} />
        <OpeningPrediction label={`${nB} with White`} white={nB} black={nA} o={m.bWhite} />
      </div>

      <h5>How the game would probably go</h5>
      <ul className="mu-facts small">
        {m.length && <li>Typical length: about <strong>{m.length} moves</strong> (their recent average).</li>}
        {m.likelyEnd && <li>Most likely finish: <strong>{m.likelyEnd[0]}</strong> - {m.endings.map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ')} of their decisive games.</li>}
      </ul>
      {m.edges.length > 0 && (
        <>
          <h5>Edges</h5>
          <ul className="mu-edges">
            {m.edges.map((x) => <li key={x.text} style={{ '--pc': COLORS[x.who] }}><i />{x.text}</li>)}
          </ul>
        </>
      )}
      <p className="muted small">A prediction from statistics, not a guarantee - chess is played on the board.</p>
    </section>
  )
}

function DeepSection({ players, data, tc, setTc, months }) {
  const { per, ratingSeries, pool, h2h } = data
  const cols = players.length
  const best = (vals, higher = true) => {
    const nums = vals.map((v) => (v == null ? null : v))
    const target = higher ? Math.max(...nums.filter((v) => v != null)) : Math.min(...nums.filter((v) => v != null))
    return nums.map((v) => v != null && v === target && nums.filter((x) => x === target).length === 1)
  }
  const rows = [
    ['Games', per.map((p) => p.n), (v) => v.toLocaleString(), true],
    ['Score', per.map((p) => (p.n ? p.pct : null)), (v) => `${v}%`, true],
    ['As White', per.map((p) => (p.white.n ? p.white.pct : null)), (v) => `${v}%`, true],
    ['As Black', per.map((p) => (p.black.n ? p.black.pct : null)), (v) => `${v}%`, true],
    ['Avg accuracy', per.map((p) => (p.accuracy != null ? +p.accuracy.toFixed(1) : null)), (v, i) => `${v.toFixed(1)} (${per[i].accN} reviewed)`, true],
    ['Avg opponent', per.map((p) => p.avgOpp), (v) => v, true],
    ['Longest win streak', per.map((p) => p.longestStreak), (v) => v, true],
    ['Wins by checkmate', per.map((p) => p.matePct), (v) => `${v}%`, true],
    ['Losses on time', per.map((p) => p.timeoutLossPct), (v) => `${v}%`, false],
  ]
  const allX = ratingSeries.flat().map((p) => p.x)
  const span = allX.length ? Math.max(...allX) - Math.min(...allX) : 0
  const xTicks = allX.length ? Array.from({ length: 5 }, (_, i) => Math.min(...allX) + ((Math.max(...allX) - Math.min(...allX)) * i) / 4) : undefined
  return (
    <>
      <div className="deep-tc">
        <Chips label="Time control" value={tc} onChange={setTc} options={TCS} />
        <span className="muted small">{months ? `Last ${months} months` : 'All time'}</span>
      </div>

      <section className="card">
        <h3>Head to head</h3>
        <div className="h2h-grid">
          {h2h.map((h) => (
            <div key={`${h.a}-${h.b}`} className="h2h">
              <div className="h2h-names">
                <PlayerChip name={players[h.a].username} color={COLORS[h.a]} />
                <span className="muted small">vs</span>
                <PlayerChip name={players[h.b].username} color={COLORS[h.b]} />
              </div>
              {h.n ? (
                <>
                  <div className="h2h-score"><strong>{h.w + h.d / 2}</strong><span className="muted">-</span><strong>{h.l + h.d / 2}</strong></div>
                  <WdlBar s={h} />
                  <span className="muted small">{h.n} game{h.n === 1 ? '' : 's'} · {h.w}W {h.d}D {h.l}L for {players[h.a].username}</span>
                  {h.last && <a className="small" href={h.last.url} target="_blank" rel="noreferrer">Last game: {h.last.end.toLocaleDateString()}</a>}
                </>
              ) : <span className="muted small">No games against each other in this period.</span>}
            </div>
          ))}
        </div>
      </section>

      <Matchup players={players} data={data} />

      <section className="card">
        <h3>Side by side</h3>
        <div className="scroll-x">
          <table className="cmp-table">
            <thead><tr><th />{players.map((p, i) => <th key={p.username} className="num"><PlayerChip name={p.username} color={COLORS[i]} /></th>)}</tr></thead>
            <tbody>
              {rows.map(([label, vals, fmt, higher]) => {
                const lead = best(vals, higher)
                return (
                  <tr key={label}>
                    <td><strong>{label}</strong></td>
                    {vals.map((v, i) => <td key={i} className={`num ${lead[i] ? 'lead' : ''}`}>{lead[i] && <Crown />}{v == null ? '-' : fmt(v, i)}</td>)}
                  </tr>
                )
              })}
              <tr>
                <td><strong>Favourite as White</strong></td>
                {per.map((p, i) => <td key={i} className="small">{p.openingWhite ? <>{p.openingWhite.name}<br /><span className="muted">{p.openingWhite.n} game{p.openingWhite.n === 1 ? '' : 's'} · {p.openingWhite.pct}%</span></> : '-'}</td>)}
              </tr>
              <tr>
                <td><strong>Favourite as Black</strong></td>
                {per.map((p, i) => <td key={i} className="small">{p.openingBlack ? <>{p.openingBlack.name}<br /><span className="muted">{p.openingBlack.n} game{p.openingBlack.n === 1 ? '' : 's'} · {p.openingBlack.pct}%</span></> : '-'}</td>)}
              </tr>
              <tr>
                <td><strong>Biggest upset</strong></td>
                {per.map((p, i) => <td key={i} className="small">{p.bestWin ? <a href={p.bestWin.url} target="_blank" rel="noreferrer">beat {p.bestWin.opponent} (+{Math.round(p.bestWin.oppPre - p.bestWin.myPre)})</a> : '-'}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted small">♛ marks the leader in each row. Accuracy only counts games Chess.com has reviewed.</p>
      </section>

      <section className="card">
        <h3>Recent form</h3>
        <div className="form-compare">
          {per.map((p, i) => (
            <div key={i} className="fc-row">
              <PlayerChip name={players[i].username} color={COLORS[i]} />
              <div className="fc-strip">
                {p.form.map((g) => <a key={g.url} href={g.url} target="_blank" rel="noreferrer" className={`fs ${g.outcome}`} title={`${g.outcome} vs ${g.opp}, ${g.end.toLocaleDateString()}`} />)}
              </div>
              <span className="muted small">{p.currentStreak > 1 ? `${p.currentStreak} wins in a row` : ''}</span>
            </div>
          ))}
        </div>
        <p className="muted small">Last 20 games, oldest on the left. Blue = win, grey = draw, orange = loss.</p>
      </section>

      <section className="card">
        <h3>Rating race ({pool})</h3>
        <XYChart
          series={ratingSeries.map((pts, i) => ({ name: players[i].username, color: COLORS[i], pts }))}
          xTicks={xTicks} xFmt={(x, full) => (full ? new Date(x).toLocaleDateString() : span < 200 * 864e5 ? fmtDay(x) : fmtMonth(x))}
          yFmt={(y) => Math.round(y)}
        />
        <p className="muted small">Rated {pool} games, last rating of each day. Pick a time control above to switch.</p>
      </section>
    </>
  )
}

export { POOLS }
