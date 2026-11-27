import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { fetchAllGames, fetchProfile, toRow } from './chessApi'
import Mandala from './Mandala'
import ThemePicker from './ThemePicker'
import BoardPicker, { PieceFilters, PieceCss } from './BoardPicker'
import { getRecent, pushRecent, removeRecent } from './recentPlayers'
import { usePuzzleStore } from './puzzles/puzzleStore'
import { addPreGameRatings } from './insights/aggregate'

// Each page is its own download, fetched the first time you open it (and quietly
// prefetched once the first page is on screen), so the site starts fast on phones.
const loadInsightsView = () => import('./insights/InsightsView')
const loadReviewView = () => import('./review/ReviewView')
const loadCompareView = () => import('./compare/CompareView')
const loadPuzzlesView = () => import('./puzzles/PuzzlesView')
const loadPlayView = () => import('./play/PlayView')
const loadOpeningsView = () => import('./openings/OpeningsView')
const loadLessonsView = () => import('./lessons/LessonsView')
const InsightsView = lazy(loadInsightsView)
const ReviewView = lazy(loadReviewView)
const CompareView = lazy(loadCompareView)
const PuzzlesView = lazy(loadPuzzlesView)
const PlayView = lazy(loadPlayView)
const OpeningsView = lazy(loadOpeningsView)
const LessonsView = lazy(loadLessonsView)
const PageLoading = () => <div className="card page-loading muted">Loading...</div>
const Page = ({ children }) => <Suspense fallback={<PageLoading />}>{children}</Suspense>
if (typeof window !== 'undefined') {
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500))
  window.addEventListener('load', () => idle(() => [loadInsightsView, loadReviewView, loadCompareView, loadPuzzlesView, loadPlayView, loadOpeningsView, loadLessonsView].forEach((f) => f())))
}

const LIMITS = [['all', 'All'], [100, '100'], [200, '200'], [500, '500'], [1000, '1,000'], [2000, '2,000']]
import './App.css'
import './themes.css'

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
  // remember who was looked up last (saved in this browser)
  const [recent, setRecent] = useState(getRecent)
  const [username, setUsername] = useState(() => getRecent()[0] || '')
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)
  const [player, setPlayer] = useState(null)
  const [raw, setRaw] = useState([])
  const [fetchedFor, setFetchedFor] = useState('')
  const [tc, setTc] = useState('all')
  const abortRef = useRef(null)

  async function load(e, override) {
    e?.preventDefault()
    const name = (override ?? username).trim()
    if (override) setUsername(override)
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
      setRecent(pushRecent(name))
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
  const [botStart, setBotStart] = useState(null) // opening position to play out against a bot
  const puzzles = usePuzzleStore()
  const [reviewPgn, setReviewPgn] = useState(null)
  const [reviewKey, setReviewKey] = useState(0)
  const openReview = (pgnText) => {
    setReviewPgn(pgnText)
    setReviewKey((k) => k + 1)
    setPage('review')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  // centre the active tab in the strip only when the tab changes, so swiping the strip isn't undone by re-renders
  const tabsRef = useRef(null)
  useEffect(() => {
    const el = tabsRef.current
    const a = el?.querySelector('.page-tab.active')
    if (a) el.scrollTo({ left: el.scrollLeft + a.getBoundingClientRect().left - el.getBoundingClientRect().left - (el.clientWidth - a.offsetWidth) / 2, behavior: 'smooth' })
  }, [page])
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
        <div className="pickers"><BoardPicker /><ThemePicker /></div>
        <PieceFilters /><PieceCss />
        <div className="hero-brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="hero-logo" width="52" height="52" />
          <div>
            <h1>Singh Master Chess</h1>
            <p className="hero-tag">Chess was born in India as chaturanga. Study your games like a master.</p>
            <p className="hero-theme-tip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5C21 6.6 17 3 12 3zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" /></svg>
              Themes are changeable - press the palette button (top right) to switch to Cyberpunk, Futuristic, Classic Wood or Minimal.
            </p>
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
        {recent.length > 0 && status !== 'loading' && (
          <div className="recent-users">
            <span className="recent-label">{status === 'idle' && !fetchedFor ? 'Welcome back:' : 'Recent:'}</span>
            {recent.map((n, i) => (
              <span key={n} className={`recent-chip ${i === 0 && !fetchedFor ? 'first' : ''} ${fetchedFor && n.toLowerCase() === fetchedFor.toLowerCase() ? 'on' : ''}`}>
                <button className="recent-go" onClick={() => load(null, n)} title={`Load ${n}'s games`}>{n}</button>
                <button className="recent-x" onClick={() => setRecent(removeRecent(n))} aria-label={`Forget ${n}`} title="Forget">×</button>
              </span>
            ))}
          </div>
        )}
        {status === 'error' && <p className="error">{error}</p>}
        <div className="hero-links">
          {page !== 'review' && <button className="link-btn hero-alt" onClick={() => openReview(null)}>Review a game from a PGN file →</button>}
          {page !== 'puzzles' && <button className="link-btn hero-alt" onClick={() => setPage('puzzles')}>My puzzles{puzzles.puzzles.length ? ` (${puzzles.puzzles.length})` : ''} →</button>}
          {page !== 'play' && <button className="link-btn hero-alt" onClick={() => setPage('play')}>Play a bot →</button>}
          {page !== 'openings' && <button className="link-btn hero-alt" onClick={() => setPage('openings')}>Practise openings →</button>}
          {page !== 'lessons' && <button className="link-btn hero-alt" onClick={() => setPage('lessons')}>Lessons →</button>}
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

      {(hasData || ['review', 'compare', 'puzzles', 'play', 'openings', 'lessons'].includes(page) || puzzles.puzzles.length > 0) && (
        <nav className="page-tabs" role="tablist" ref={tabsRef}>
          {[['overview', 'Overview'], ['insights', 'Insights'], ['review', 'Game Review'], ['puzzles', 'Puzzles'], ['play', 'Play bots'], ['openings', 'Openings'], ['lessons', 'Lessons'], ['compare', 'Compare']].filter(([k]) => hasData || ['review', 'compare', 'puzzles', 'play', 'openings', 'lessons'].includes(k)).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={page === k} className={page === k ? 'page-tab active' : 'page-tab'} onClick={() => setPage(k)}>
              {label}
              {k === 'puzzles' && puzzles.puzzles.some((p) => p.status !== 'solved') && <span className="badge">{puzzles.puzzles.filter((p) => p.status !== 'solved').length}</span>}
              {k === 'insights' && !records && <span className="badge">{insProgress ? `${Math.round((100 * insProgress.done) / insProgress.total)}%` : '...'}</span>}
            </button>
          ))}
        </nav>
      )}

      {page === 'review' && <Page><ReviewView key={reviewKey} initialPgn={reviewPgn} username={fetchedFor} rows={rows.filter((r) => r.pgn && r.rules === 'chess')} puzzles={puzzles} onOpenPuzzles={() => { setPage('puzzles'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} /></Page>}
      {page === 'puzzles' && <Page><PuzzlesView store={puzzles} onReview={openReview} /></Page>}
      {page === 'play' && <Page><PlayView onReview={openReview} start={botStart} /></Page>}
      {page === 'lessons' && <Page><LessonsView /></Page>}
      {page === 'openings' && <Page><OpeningsView rows={rows} username={fetchedFor} onPlayOut={(s) => { setBotStart(s); setPage('play') }} /></Page>}
      {!hasData && status !== 'loading' && ['overview', 'insights'].includes(page) && (
        <section className="card welcome">
          <h3>Welcome</h3>
          <div className="welcome-grid">
            <div><strong>Your stats & insights</strong><span className="muted small">Enter your Chess.com username above.</span></div>
            <button className="secondary" onClick={() => openReview(null)}><strong>Game Review</strong><span className="muted small">Analyse any game with Stockfish.</span></button>
            <button className="secondary" onClick={() => setPage('puzzles')}><strong>My puzzles{puzzles.puzzles.length ? ` (${puzzles.puzzles.length})` : ''}</strong><span className="muted small">Practise the mistakes from your games.</span></button>
            <button className="secondary" onClick={() => setPage('compare')}><strong>Compare friends</strong><span className="muted small">Ratings, form and head-to-head.</span></button>
          </div>
        </section>
      )}

      {page === 'compare' && <Page><CompareView me={fetchedFor || null} suggestions={topOpponents} /></Page>}

      {hasData && !['review', 'compare', 'puzzles', 'play', 'openings', 'lessons'].includes(page) && (
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
            <Page><InsightsView rows={view} records={records} progress={insProgress} scopeLabel={scopeLabel} onReview={(r) => openReview(r.pgn)} onOpenings={() => { setPage('openings'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} /></Page>
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
