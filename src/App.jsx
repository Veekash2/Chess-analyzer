import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchAllGames, fetchProfile, toRow } from './chessApi'
import InsightsView from './insights/InsightsView'
import ReviewView from './review/ReviewView'
import Mandala from './Mandala'
import CompareView from './compare/CompareView'
import { addPreGameRatings } from './insights/aggregate'

const LIMITS = [['all', 'All'], [100, '100'], [200, '200'], [500, '500'], [1000, '1,000'], [2000, '2,000']]
import './App.css'

const TIME_CLASSES = ['all', 'bullet', 'blitz', 'rapid', 'daily']
const HOW = {
  checkmated: 'checkmate', resigned: 'resignation', timeout: 'timeout', abandoned: 'abandonment',
  agreed: 'agreement', repetition: 'repetition', stalemate: 'stalemate', insufficient: 'insufficient material',
  '50move': '50-move rule', timevsinsufficient: 'timeout vs insufficient material', kingofthehill: 'king of the hill',
  threecheck: 'three-check', bughousepartnerlose: 'partner lost', lose: 'loss',
}

function score(rows) {
  const w = rows.filter((r) => r.outcome === 'win').length
  const d = rows.filter((r) => r.outcome === 'draw').length
  const l = rows.length - w - d
  return { n: rows.length, w, d, l, pct: rows.length ? Math.round((100 * (w + d / 2)) / rows.length) : 0 }
}

function download(name, text, type) {
  const blob = new Blob([text], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

function WdlBar({ s }) {
  if (!s.n) return null
  return (
    <div className="wdl" role="img" aria-label={`${s.w} wins, ${s.d} draws, ${s.l} losses`}>
      {s.w > 0 && <span className="w" style={{ flex: s.w }} title={`${s.w} wins`} />}
      {s.d > 0 && <span className="d" style={{ flex: s.d }} title={`${s.d} draws`} />}
      {s.l > 0 && <span className="l" style={{ flex: s.l }} title={`${s.l} losses`} />}
    </div>
  )
}

export default function App() {
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)
  const [player, setPlayer] = useState(null)
  const [raw, setRaw] = useState([])
  const [fetchedFor, setFetchedFor] = useState('')
  const [tc, setTc] = useState('all')
  const abortRef = useRef(null)

  async function load(e) {
    e.preventDefault()
    const name = username.trim()
    if (!name) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStatus('loading'); setError(''); setProgress(null); setRaw([]); setPlayer(null); setTc('all'); setLimit('all'); setCustomLimit('')
    try {
      const p = await fetchProfile(name, ctrl.signal)
      setPlayer(p)
      const games = await fetchAllGames(name, { signal: ctrl.signal, onProgress: setProgress })
      setRaw(games)
      setFetchedFor(p.profile.username || name)
      setStatus('done')
    } catch (err) {
      if (err.name === 'AbortError') { setStatus('idle'); return }
      setError(err.status === 404 ? `No Chess.com player called "${name}".` : err.message)
      setStatus('error')
    }
  }

  const rows = useMemo(
    () => (fetchedFor ? addPreGameRatings(raw.map((g) => toRow(g, fetchedFor))).sort((a, b) => b.end - a.end) : []),
    [raw, fetchedFor],
  )
  // Replay every game in a Web Worker so the page stays responsive
  const [page, setPage] = useState('overview')
  const [reviewPgn, setReviewPgn] = useState(null)
  const [reviewKey, setReviewKey] = useState(0)
  const openReview = (pgnText) => {
    setReviewPgn(pgnText)
    setReviewKey((k) => k + 1)
    setPage('review')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const [records, setRecords] = useState(null)
  const [insProgress, setInsProgress] = useState(null)
  useEffect(() => {
    setRecords(null); setInsProgress(null)
    if (!rows.length) return
    const worker = new Worker(new URL('./insights/insightsWorker.js', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      if (e.data.type === 'progress') setInsProgress(e.data)
      else { setRecords(e.data.records); worker.terminate() }
    }
    worker.postMessage(rows.filter((r) => r.rules === 'chess' && r.pgn).map((r) => ({ url: r.url, pgn: r.pgn, color: r.color, timeControl: r.timeControl })))
    return () => worker.terminate()
  }, [rows])

  const hasData = status === 'done' && rows.length > 0
  // people you play most often - offered as one-click "friends" on the Compare page
  const topOpponents = useMemo(() => {
    const c = new Map()
    for (const r of rows) c.set(r.opponent, (c.get(r.opponent) || 0) + 1)
    return [...c.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n)
  }, [rows])
  // Which games are analysed: time control first, then the most recent N of those
  const [limit, setLimit] = useState('all')
  const [customLimit, setCustomLimit] = useState('')
  const cut = (list) => (limit === 'all' ? list : list.slice(0, limit))
  const view = cut(tc === 'all' ? rows : rows.filter((r) => r.timeClass === tc))
  const recentAll = cut(rows)
  const tcWord = tc === 'all' ? '' : `${tc} `
  const scopeLabel = limit === 'all' || view.length < limit
    ? `all ${view.length.toLocaleString()} ${tcWord}games`
    : `latest ${view.length.toLocaleString()} ${tcWord}games`
  const scopeKey = `${tc}${limit === 'all' ? '' : `_last${limit}`}`
  const applyCustom = (e) => {
    e.preventDefault()
    const n = parseInt(customLimit, 10)
    if (n > 0) setLimit(n)
  }
  const total = score(view)
  const byColor = ['white', 'black'].map((c) => ({ c, ...score(view.filter((r) => r.color === c)) }))
  const byClass = TIME_CLASSES.slice(1).map((t) => ({ t, ...score(recentAll.filter((r) => r.timeClass === t)) })).filter((x) => x.n)

  const openings = useMemo(() => {
    const m = new Map()
    for (const r of view) {
      const k = `${r.color}|${r.opening}`
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(r)
    }
    return [...m.entries()]
      .map(([k, rs]) => ({ color: k.split('|')[0], name: k.split('|')[1], ...score(rs) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 12)
  }, [view])

  const opponents = useMemo(() => {
    const m = new Map()
    for (const r of view) m.set(r.opponent, [...(m.get(r.opponent) || []), r])
    return [...m.entries()].map(([name, rs]) => ({ name, ...score(rs) })).sort((a, b) => b.n - a.n).slice(0, 8)
  }, [view])

  const endings = useMemo(() => {
    const c = {}
    for (const r of view) {
      const k = `${r.outcome}:${r.how}`
      c[k] = (c[k] || 0) + 1
    }
    return c
  }, [view])

  const accs = view.map((r) => r.accuracy).filter((a) => a != null)
  const avgAcc = accs.length ? (accs.reduce((a, b) => a + b, 0) / accs.length).toFixed(1) : null
  const ratings = player?.stats
    ? ['chess_bullet', 'chess_blitz', 'chess_rapid', 'chess_daily']
        .filter((k) => player.stats[k])
        .map((k) => ({ k: k.replace('chess_', ''), now: player.stats[k].last?.rating, best: player.stats[k].best?.rating }))
    : []

  const pgnFile = () => {
    const text = view.map((r) => r.pgn).filter(Boolean).join('\n\n')
    download(`${fetchedFor}_${scopeKey}_games.pgn`, text, 'application/x-chess-pgn')
  }
  const [pdfBusy, setPdfBusy] = useState(false)
  const pdfFile = async () => {
    setPdfBusy(true)
    try {
      const { downloadStatsPdf } = await import('./statsPdf') // loaded only when needed
      const p = player.profile
      downloadStatsPdf({
        username: p.username || fetchedFor,
        realName: p.name,
        joined: p.joined ? new Date(p.joined * 1000).toLocaleDateString() : null,
        filterKey: scopeKey,
        filterLabel: scopeLabel,
        classLabel: limit === 'all' ? 'all games' : `latest ${recentAll.length.toLocaleString()} games`,
        ratings,
        total,
        avgAcc,
        accCount: accs.length,
        byColor,
        byClass,
        endings: Object.entries(endings).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => {
          const [outcome, how] = k.split(':')
          return { outcome, how: HOW[how] || how, n }
        }),
        openings,
        opponents,
        games: view.map((r) => ({ ...r, howLabel: HOW[r.how] || r.how })),
      })
    } finally {
      setPdfBusy(false)
    }
  }
  const jsonFile = () => {
    const urls = new Set(view.map((r) => r.url))
    download(`${fetchedFor}_${scopeKey}_games.json`, JSON.stringify(raw.filter((g) => urls.has(g.url)), null, 1), 'application/json')
  }

  return (
    <div className="page">
      <header className="hero">
        <Mandala className="hero-mandala" size={260} />
        <div className="hero-brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="hero-logo" width="52" height="52" />
          <div>
            <h1>Singh Master Chess</h1>
            <p className="hero-tag">Chess was born in India as chaturanga. Study your games like a master.</p>
          </div>
        </div>
        <p className="hero-sub">Enter a Chess.com username to load every public game, see insights, review games with Stockfish and download them as PGN.</p>
        <form onSubmit={load} className="search">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Chess.com username"
            aria-label="Chess.com username"
            autoFocus
            spellCheck={false}
          />
          {status === 'loading' ? (
            <button type="button" className="secondary" onClick={() => abortRef.current?.abort()}>Cancel</button>
          ) : (
            <button type="submit" disabled={!username.trim()}>Get games</button>
          )}
        </form>
        {status === 'error' && <p className="error">{error}</p>}
        <div className="hero-links">
          {page !== 'review' && <button className="link-btn hero-alt" onClick={() => openReview(null)}>Review a game from a PGN file →</button>}
          {page !== 'compare' && <button className="link-btn hero-alt" onClick={() => setPage('compare')}>Compare friends →</button>}
        </div>
      </header>

      {player && (
        <section className="card player">
          {player.profile.avatar && <img src={player.profile.avatar} alt="" />}
          <div>
            <h2>
              <a href={player.profile.url} target="_blank" rel="noreferrer">{player.profile.username}</a>
              {player.profile.title && <span className="title">{player.profile.title}</span>}
            </h2>
            <p className="muted">
              {player.profile.name ? `${player.profile.name} · ` : ''}
              Joined {new Date(player.profile.joined * 1000).toLocaleDateString()}
            </p>
          </div>
          <div className="ratings">
            {ratings.map((r) => (
              <div key={r.k}>
                <span className="muted">{r.k}</span>
                <strong>{r.now ?? '-'}</strong>
                {r.best && <span className="muted small">best {r.best}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {status === 'loading' && (
        <section className="card">
          <p>
            {progress
              ? `Downloading month ${progress.done} of ${progress.total} (${progress.month}) - ${progress.games.toLocaleString()} games so far`
              : 'Finding game archives...'}
          </p>
          <div className="progress"><span style={{ width: progress ? `${(100 * progress.done) / progress.total}%` : '3%' }} /></div>
        </section>
      )}

      {status === 'done' && rows.length === 0 && <section className="card"><p>This player has no public games yet.</p></section>}

      {(hasData || page === 'review' || page === 'compare') && (
        <nav className="page-tabs" role="tablist">
          {[['overview', 'Overview'], ['insights', 'Insights'], ['review', 'Game Review'], ['compare', 'Compare']].filter(([k]) => hasData || k === 'review' || k === 'compare').map(([k, label]) => (
            <button key={k} role="tab" aria-selected={page === k} className={page === k ? 'page-tab active' : 'page-tab'} onClick={() => setPage(k)}>
              {label}
              {k === 'insights' && !records && <span className="badge">{insProgress ? `${Math.round((100 * insProgress.done) / insProgress.total)}%` : '...'}</span>}
            </button>
          ))}
        </nav>
      )}

      {page === 'review' && <ReviewView key={reviewKey} initialPgn={reviewPgn} username={fetchedFor} rows={rows.filter((r) => r.pgn && r.rules === 'chess')} />}

      {page === 'compare' && <CompareView me={fetchedFor || null} suggestions={topOpponents} />}

      {hasData && page !== 'review' && page !== 'compare' && (
        <>
          <div className="toolbar">
            <div className="tabs" role="tablist">
              {TIME_CLASSES.filter((t) => t === 'all' || rows.some((r) => r.timeClass === t)).map((t) => (
                <button key={t} role="tab" aria-selected={tc === t} className={tc === t ? 'tab active' : 'tab'} onClick={() => setTc(t)}>
                  {t}
                </button>
              ))}
            </div>
            <div className="downloads">
              <button onClick={pdfFile} disabled={pdfBusy}>{pdfBusy ? 'Building PDF...' : '⬇ Download statistics (PDF)'}</button>
              <button className="secondary" onClick={pgnFile}>Download PGN ({view.length})</button>
              <button className="secondary" onClick={jsonFile}>Download JSON</button>
            </div>
          </div>

          <div className="limit-bar">
            <span className="limit-label">Last</span>
            <div className="tabs chips" role="tablist" aria-label="How many recent games to analyse">
              {LIMITS.map(([k, label]) => (
                <button key={k} role="tab" aria-selected={limit === k} className={limit === k ? 'tab active' : 'tab'} onClick={() => { setLimit(k); setCustomLimit('') }}>
                  {label}
                </button>
              ))}
            </div>
            <form onSubmit={applyCustom} className="custom-limit">
              <input
                type="number" min="1" inputMode="numeric" placeholder="Custom"
                value={customLimit} onChange={(e) => setCustomLimit(e.target.value)}
                aria-label="Number of recent games to analyse"
                className={typeof limit === 'number' && !LIMITS.some(([k]) => k === limit) ? 'active' : ''}
              />
              <button type="submit" className="secondary" disabled={!(parseInt(customLimit, 10) > 0)}>Apply</button>
            </form>
            <span className="limit-label tail">games</span>
            <span className="muted small scope-note">
              Showing {scopeLabel}{view.length ? ` (${view.at(-1).end.toLocaleDateString()} to ${view[0].end.toLocaleDateString()})` : ''}
            </span>
          </div>

          {page === 'insights' ? (
            <InsightsView rows={view} records={records} progress={insProgress} scopeLabel={scopeLabel} onReview={(r) => openReview(r.pgn)} />
          ) : (<>
          <section className="tiles">
            <div className="tile"><strong>{total.n.toLocaleString()}</strong><span>games</span></div>
            <div className="tile"><strong>{total.w}-{total.d}-{total.l}</strong><span>wins - draws - losses</span></div>
            <div className="tile"><strong>{total.pct}%</strong><span>score</span></div>
            <div className="tile"><strong>{avgAcc ?? '-'}</strong><span>avg accuracy{accs.length ? ` (${accs.length} reviewed)` : ''}</span></div>
          </section>

          <div className="grid">
            <section className="card">
              <h3>By colour</h3>
              {byColor.map((x) => (
                <div className="row" key={x.c}>
                  <span className="label"><i className={`piece ${x.c}`} />{x.c}</span>
                  <WdlBar s={x} />
                  <span className="num">{x.pct}% · {x.n}</span>
                </div>
              ))}
              <h3>By time control</h3>
              {byClass.map((x) => (
                <div className="row" key={x.t}>
                  <span className="label">{x.t}</span>
                  <WdlBar s={x} />
                  <span className="num">{x.pct}% · {x.n}</span>
                </div>
              ))}
              <p className="legend"><span className="sw w" />win <span className="sw d" />draw <span className="sw l" />loss</p>
            </section>

            <section className="card">
              <h3>How games ended</h3>
              <table>
                <tbody>
                  {Object.entries(endings).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => {
                    const [o, how] = k.split(':')
                    return (
                      <tr key={k}>
                        <td><span className={`pill ${o}`}>{o}</span></td>
                        <td>by {HOW[how] || how}</td>
                        <td className="num">{n}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <h3>Most played opponents</h3>
              <table>
                <tbody>
                  {opponents.map((o) => (
                    <tr key={o.name}>
                      <td><a href={`https://www.chess.com/member/${o.name}`} target="_blank" rel="noreferrer">{o.name}</a></td>
                      <td className="num">{o.w}-{o.d}-{o.l}</td>
                      <td className="num">{o.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className="card">
            <h3>Most played openings</h3>
            <table>
              <thead><tr><th>Side</th><th>Opening</th><th className="num">Games</th><th>Results</th><th className="num">Score</th></tr></thead>
              <tbody>
                {openings.map((o) => (
                  <tr key={o.color + o.name}>
                    <td><i className={`piece ${o.color}`} title={o.color} /></td>
                    <td>{o.name}</td>
                    <td className="num">{o.n}</td>
                    <td><WdlBar s={o} /></td>
                    <td className="num">{o.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card pdf-cta">
            <div>
              <strong>Save these statistics</strong>
              <p className="muted small">Ratings, results, openings, opponents and the latest 200 games{tc !== 'all' ? ` (${tc} only)` : ''} in one PDF.</p>
            </div>
            <button onClick={pdfFile} disabled={pdfBusy}>{pdfBusy ? 'Building PDF...' : '⬇ Download statistics (PDF)'}</button>
          </section>

          <section className="card">
            <h3>Games ({view.length.toLocaleString()}){view.length > 200 ? ' - latest 200 shown; downloads include all' : ''}</h3>
            <div className="scroll">
              <table className="games">
                <thead>
                  <tr><th>Date</th><th>Type</th><th>Side</th><th>Opponent</th><th>Result</th><th>Opening</th><th className="num">Acc.</th><th /></tr>
                </thead>
                <tbody>
                  {view.slice(0, 200).map((r) => (
                    <tr key={r.url}>
                      <td>{r.end.toLocaleDateString()}</td>
                      <td>{r.timeClass}</td>
                      <td><i className={`piece ${r.color}`} title={r.color} /></td>
                      <td>{r.opponent} <span className="muted">({r.oppRating})</span></td>
                      <td><span className={`pill ${r.outcome}`}>{r.outcome}</span> <span className="muted small">{HOW[r.how] || r.how}</span></td>
                      <td className="ellipsis">{r.opening}</td>
                      <td className="num">{r.accuracy != null ? r.accuracy.toFixed(1) : ''}</td>
                      <td className="nowrap">
                        {r.pgn && r.rules === 'chess' && <button className="link-btn" onClick={() => openReview(r.pgn)}>review</button>}
                        {' '}<a href={r.url} target="_blank" rel="noreferrer">view</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* phone layout: one card per game instead of an 8-column table */}
            <ul className="game-cards">
              {view.slice(0, 200).map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    <span className={`pill ${r.outcome}`}>{r.outcome}</span>
                    <span className="gc-opp"><i className={`piece ${r.color}`} title={r.color} /> {r.opponent} <span className="muted">({r.oppRating})</span></span>
                    <span className="gc-acc num">{r.accuracy != null ? r.accuracy.toFixed(1) : ''}</span>
                    <span className="gc-meta muted small">
                      {r.end.toLocaleDateString()} · {r.timeClass} · {HOW[r.how] || r.how}<br />{r.opening}
                    </span>
                  </a>
                  {r.pgn && r.rules === 'chess' && <button className="gc-review" onClick={() => openReview(r.pgn)}>Review</button>}
                </li>
              ))}
            </ul>
          </section>
          </>)}
        </>
      )}

      <footer className="site-footer">
        <div className="toran-line" aria-hidden="true" />
        <p><strong>Singh Master Chess</strong> · Game data comes live from the public Chess.com API. Analysis runs in your browser; nothing is stored or sent anywhere else.</p>
      </footer>
    </div>
  )
}
