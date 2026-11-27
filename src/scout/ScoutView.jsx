// Scout a friend or opponent: their openings, their weaknesses, and how to punish them.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { fetchAllGames, fetchProfile, toRow } from '../chessApi'
import { getEngine } from '../review/engine'
import { COURSES } from '../openings/courses'
import { useCustomPieces } from '../BoardPicker'
import { scout } from './scout'

const COURSE_NAME = Object.fromEntries(COURSES.map((c) => [c.id, c.name]))
const KEY = 'smc-scout-recent'
const recentNames = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const fmtLine = (line) => line.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}.${m}` : m)).join(' ')
const scoreClass = (s) => (s == null ? '' : s <= 42 ? 'bad' : s >= 58 ? 'good' : '')

function ScoreBar({ score }) {
  return <span className={`scout-bar ${scoreClass(score)}`} title={`${score}%`}><span style={{ width: `${score}%` }} /></span>
}

/** One "punish this" position: board, their record, and the engine's best reply for you. */
function Problem({ p, name, onPractise }) {
  const customPieces = useCustomPieces()
  const [best, setBest] = useState(null)
  useEffect(() => {
    let live = true
    getEngine().then((e) => e.evaluate(p.fen, 14)).then(({ lines }) => {
      if (!live || !lines[0]) return
      const g = new Chess(p.fen)
      const sans = []
      for (const u of lines[0].pv.slice(0, 4)) { try { sans.push(g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san) } catch { break } }
      const l = lines[0]
      setBest({ san: sans[0], line: sans, eval: l.mate != null ? (l.mate > 0 ? `mate in ${l.mate}` : `mated in ${-l.mate}`) : `${l.cp >= 0 ? '+' : ''}${(l.cp / 100).toFixed(1)}` })
    })
    return () => { live = false }
  }, [p.fen])
  const you = p.color === 'white' ? 'b' : 'w'
  return (
    <div className="scout-problem">
      <div className="scout-mini">
        <Chessboard id={`scout-${p.fen}`} position={p.fen} boardWidth={210} arePiecesDraggable={false} boardOrientation={you === 'w' ? 'white' : 'black'}
          customPieces={customPieces}
          customDarkSquareStyle={{ backgroundColor: 'var(--rb-dark)', backgroundImage: 'var(--rb-dark-img, none)' }}
          customLightSquareStyle={{ backgroundColor: 'var(--rb-light)', backgroundImage: 'var(--rb-light-img, none)' }}
          customArrows={best?.line?.length ? (() => { const g = new Chess(p.fen); const m = g.move(best.line[0]); return [[m.from, m.to, 'rgba(80,160,60,0.9)']] })() : []} />
      </div>
      <div className="scout-problem-text">
        <strong>{p.opening}</strong>
        <span className="small mono">{fmtLine(p.line)}</span>
        <span className="small">{name} plays <b>{p.line.at(-1)}</b> here in {p.n} games and scores only <b className="bad-move">{p.score}%</b>.</span>
        {best ? (
          <span className="small">Punish it with <b className="good-move">{best.san}</b> ({best.eval} for you{best.line.length > 1 ? `; ${best.line.join(' ')}` : ''}).</span>
        ) : <span className="small muted">Stockfish is finding your best reply...</span>}
        <button className="secondary slim" onClick={() => onPractise({ moves: p.line, color: you, opening: `${p.opening} - punishing ${name}` })}>Practise it vs a bot</button>
      </div>
    </div>
  )
}

export default function ScoutView({ me, suggestions = [], onPlayOut, onOpenings, target }) {
  const [input, setInput] = useState('')
  const [months, setMonths] = useState(12)
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [who, setWho] = useState(null) // { name, avatar, rows }
  const [recent, setRecent] = useState(recentNames)
  const abort = useRef(null)
  const report = useMemo(() => (who ? scout(who.rows, me) : null), [who, me])

  async function run(raw) {
    const name = (raw ?? input).trim().replace(/^@/, '')
    if (!name) return
    abort.current?.abort()
    const ac = new AbortController()
    abort.current = ac
    setStatus('loading'); setError(''); setProgress(null); setWho(null)
    try {
      const profile = await fetchProfile(name, ac.signal)
      const games = await fetchAllGames(name, { signal: ac.signal, months: months || undefined, onProgress: setProgress })
      const rows = games.filter((g) => g.white && g.black).map((g) => toRow(g, profile.username || name))
      if (!rows.length) throw new Error(`No public games in this period for ${name}.`)
      setWho({ name: profile.username || name, avatar: profile.avatar, rows })
      setStatus('done')
      const next = [profile.username || name, ...recent.filter((x) => x.toLowerCase() !== (profile.username || name).toLowerCase())].slice(0, 8)
      setRecent(next); try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ }
    } catch (e) {
      if (e.name === 'AbortError') return
      setError(/404|not found/i.test(e.message) ? `Couldn't find a Chess.com player called "${name}".` : e.message)
      setStatus('error')
    }
  }
  useEffect(() => () => abort.current?.abort(), [])
  // opened from Compare friends: scout that player straight away
  useEffect(() => { if (target?.name) { setInput(target.name); run(target.name) } }, [target]) // eslint-disable-line react-hooks/exhaustive-deps

  const chips = [...new Set([...recent, ...suggestions.map((s) => (typeof s === 'string' ? s : s.name || s.username)).filter(Boolean)])].slice(0, 10)

  return (
    <div className="scout">
      <section className="card">
        <h3>Scout a player</h3>
        <p className="small muted">See a friend's or opponent's openings, where they're weak, and how to punish it. Uses their public Chess.com games.</p>
        <form className="scout-form" onSubmit={(e) => { e.preventDefault(); run() }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Their Chess.com username" aria-label="Player to scout" />
          <select value={months} onChange={(e) => setMonths(+e.target.value)} aria-label="How far back">
            <option value={3}>Last 3 months</option><option value={6}>Last 6 months</option><option value={12}>Last 12 months</option><option value={0}>All games</option>
          </select>
          <button className="big-green slim" type="submit" disabled={status === 'loading'}>Scout</button>
        </form>
        {chips.length > 0 && (
          <div className="scout-chips">
            <span className="small muted">{recent.length ? 'Recent / your opponents:' : 'Your frequent opponents:'}</span>
            {chips.map((n) => <button key={n} className="chip" onClick={() => { setInput(n); run(n) }}>{n}</button>)}
          </div>
        )}
        {status === 'loading' && (
          <div className="scout-loading">
            <p className="small">Loading games{progress ? ` - month ${progress.done} of ${progress.total} (${progress.games} games)` : '...'}</p>
            <div className="progress"><span style={{ width: progress ? `${(100 * progress.done) / progress.total}%` : '3%' }} /></div>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </section>

      {report && (
        <>
          <section className="card scout-head">
            {who.avatar && <img src={who.avatar} alt="" width="56" height="56" />}
            <div>
              <h3>{who.name}</h3>
              <p className="small muted">{report.n} games · scores {report.overall}% · {report.white.score}% as White, {report.black.score}% as Black · average {report.avgLength} moves
                {Object.keys(report.ratings).length ? ` · ${Object.entries(report.ratings).map(([k, v]) => `${k} ${v}`).join(', ')}` : ''}</p>
              {report.vsMe && <p className="small">Against you: they scored {report.vsMe.theirScore}% in {report.vsMe.n} games.</p>}
            </div>
          </section>

          <section className="card">
            <h3>How to punish {who.name}</h3>
            {report.problems.length ? (
              <>
                <p className="small muted">Positions they reach again and again - after their move they score badly. The green arrow is Stockfish's best reply for you.</p>
                <div className="scout-problems">{report.problems.map((p) => <Problem key={p.fen} p={p} name={who.name} onPractise={onPlayOut} />)}</div>
              </>
            ) : <p className="small muted">No repeated opening position where they score badly - they're consistent. Use the weaknesses below.</p>}
          </section>

          <section className="card">
            <h3>Weaknesses</h3>
            {report.weaknesses.length ? (
              <ul className="scout-weak">
                {report.weaknesses.map((w) => <li key={w.title}><strong>{w.title}</strong><span className="small">{w.text}</span><span className="small good-move">→ {w.tip}</span></li>)}
              </ul>
            ) : <p className="small muted">No clear weaknesses in this sample - try a longer period.</p>}
          </section>

          <section className="card">
            <h3>Their openings</h3>
            <div className="scout-cols">
              {[['w', 'As White', report.firstMoves, 'First move'], ['b', 'As Black', null, null]].map(([side, title, first, firstLabel]) => (
                <div key={side}>
                  <h4>{title} <span className="small muted">({side === 'w' ? report.white.n : report.black.n} games)</span></h4>
                  {first && <p className="small">{firstLabel}: {first.map((f) => `${f.move} ${f.share}% (scores ${f.score}%)`).join(' · ')}</p>}
                  {side === 'b' && report.vsE4.length > 0 && <p className="small">Against 1.e4: {report.vsE4.map((f) => `...${f.move} ${f.share}% (${f.score}%)`).join(' · ')}</p>}
                  {side === 'b' && report.vsD4.length > 0 && <p className="small">Against 1.d4: {report.vsD4.map((f) => `...${f.move} ${f.share}% (${f.score}%)`).join(' · ')}</p>}
                  <table className="scout-table">
                    <tbody>
                      {report.openings[side].slice(0, 8).map((o) => (
                        <tr key={o.name}>
                          <td>{o.name}</td>
                          <td className="num small">{o.n}</td>
                          <td><ScoreBar score={o.score} /></td>
                          <td className={`num small ${scoreClass(o.score)}`}>{o.score}%</td>
                          <td>{o.course && COURSE_NAME[o.course] ? <button className="link-btn small" onClick={onOpenings} title={`Prepare with: ${COURSE_NAME[o.course]}`}>Prepare →</button> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <p className="small muted">"Prepare →" opens the Openings page; the matching course: {[...new Set([...report.openings.w, ...report.openings.b].map((o) => o.course).filter(Boolean))].slice(0, 6).map((c) => COURSE_NAME[c]).join(', ') || 'none'}.</p>
          </section>
        </>
      )}
    </div>
  )
}
