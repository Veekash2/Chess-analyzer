// Turns the moves you got wrong in a reviewed game into puzzles.
import { Chess } from 'chess.js'
import { CLASSES, hangs } from '../review/reviewCore.js'

/** How to think about each kind of puzzle - shown before you solve it. */
export const ANALYSE_TIPS = {
  mate: ['Start with every check you have - forcing moves come first.', 'Look at the squares around the enemy king: which are covered, which are free?', 'After each check, ask where the king can go and whether a follow-up check closes the net.'],
  defence: ['First ask: what is your opponent threatening right now?', 'Look at their checks and captures after each move you consider.', 'Find a move that covers the threat - or makes a bigger threat of your own.'],
  hanging: ['List every piece of yours that is attacked or not defended.', 'For each candidate move, ask: what does this leave unprotected?', 'Prefer moves that improve a piece while keeping everything defended.'],
  tactic: ['Your opponent has just slipped - something is loose. Look for undefended pieces and an exposed king.', 'Check every Check, Capture and Threat (CCT) for you first.', 'Look for one move that attacks two things at once (a fork, pin or skewer).'],
  endgame: ['Activate your king - in endgames it is a strong piece.', 'Look for passed pawns and count how fast each side can promote.', 'Count tempi: who gets there first?'],
  opening: ['Develop knights and bishops, control the centre and get castled.', "Check what your opponent's last move threatens before you answer.", "Don't move the same piece twice without a reason."],
  best: ['Scan checks, captures and threats for both sides.', 'Pick 2-3 candidate moves and picture the position after each one.', 'Choose the move that creates a threat or improves your worst piece.'],
}

export const THEMES = {
  mate: { label: 'Checkmate', icon: '#', blurb: 'You had a forced mate here.' },
  defence: { label: 'Defence', icon: '♚', blurb: 'Your move allowed a mating attack - find the defence.' },
  hanging: { label: 'Hanging piece', icon: '♞', blurb: 'Your move left a piece en prise - find a safe, strong move.' },
  tactic: { label: 'Missed tactic', icon: '⚔', blurb: 'Your opponent had just erred - punish it.' },
  endgame: { label: 'Endgame', icon: '♔', blurb: 'Find the best endgame move.' },
  opening: { label: 'Opening', icon: '♙', blurb: 'Find the best opening move.' },
  best: { label: 'Best move', icon: '★', blurb: 'Find the strongest move.' },
}

const forMover = (s, color) => (s.mate != null ? { mate: color === 'w' ? s.mate : -s.mate } : { cp: color === 'w' ? s.cp : -s.cp })

export function gameKey(headers, pgn) {
  if (headers.Link) return headers.Link
  let h = 0
  for (let i = 0; i < pgn.length; i++) h = (h * 31 + pgn.charCodeAt(i)) | 0
  return `pgn-${(h >>> 0).toString(36)}`
}

export function gameMeta(headers, pgn, color) {
  const me = color === 'w' ? headers.White : headers.Black
  const opp = color === 'w' ? headers.Black : headers.White
  return {
    key: gameKey(headers, pgn), pgn,
    url: headers.Link || null,
    me, opp, oppRating: color === 'w' ? headers.BlackElo : headers.WhiteElo,
    date: (headers.Date || '').replace(/\./g, '-'),
    result: headers.Result, timeControl: headers.TimeControl, termination: headers.Termination,
  }
}

function themeFor(m, color) {
  const best = forMover(m.sBest, color), after = forMover(m.sAfter, color)
  if (best.mate != null && best.mate > 0) return 'mate'
  if (after.mate != null && after.mate < 0) return 'defence'
  const h = hangs(m)
  if (h && h.piece !== 'pawn') return 'hanging'
  if (m.cls === 'miss') return 'tactic'
  if (m.phase === 'endgame') return 'endgame'
  if (m.phase === 'opening') return 'opening'
  return 'best'
}

/** Solution line in UCI: mates are played out; other puzzles stop after the key move,
 *  or after the follow-up when it wins material or gives check (a short combination). */
function solutionLine(fen, pv, theme, mateIn) {
  if (!pv?.length) return []
  if (theme === 'mate' && mateIn) return pv.slice(0, Math.min(2 * mateIn - 1, 7))
  if (pv.length >= 3) {
    const c = new Chess(fen)
    try {
      c.move({ from: pv[0].slice(0, 2), to: pv[0].slice(2, 4), promotion: pv[0][4] })
      c.move({ from: pv[1].slice(0, 2), to: pv[1].slice(2, 4), promotion: pv[1][4] })
      const third = c.move({ from: pv[2].slice(0, 2), to: pv[2].slice(2, 4), promotion: pv[2][4] })
      if (third.captured || third.san.includes('+')) return pv.slice(0, 3)
    } catch { /* keep the single move */ }
  }
  return pv.slice(0, 1)
}

/** Candidate puzzles for one player in a reviewed game (their mistakes, misses, blunders; optionally inaccuracies). */
export function buildPuzzles(result, headers, pgn, color, { includeInaccuracies = false } = {}) {
  const meta = gameMeta(headers, pgn, color)
  const kinds = includeInaccuracies ? ['inaccuracy', 'mistake', 'miss', 'blunder'] : ['mistake', 'miss', 'blunder']
  return result.moves
    .filter((m) => m.color === color && kinds.includes(m.cls) && m.bestUci)
    .map((m) => {
      const theme = themeFor(m, color)
      const best = forMover(m.sBest, color)
      const pv = result.evals[m.ply - 1].lines[0]?.pv || [m.bestUci]
      const line = solutionLine(m.fenBefore, pv, theme, best.mate > 0 ? best.mate : null)
      return {
        id: `${meta.key}#${m.ply}`,
        gameKey: meta.key,
        fen: m.fenBefore,
        color,
        solution: line,
        bestSan: m.bestSan,
        bestLine: m.bestLine.slice(0, line.length),
        bestLineFull: m.bestLine.slice(0, 6),
        theme,
        mateIn: theme === 'mate' ? best.mate : null,
        ply: m.ply,
        moveNo: Math.ceil(m.ply / 2),
        playedSan: m.san,
        wrongText: m.explain?.wrong || null, // what went wrong in your game (shown up front)
        betterText: m.explain?.better || null, // why the solution works (shown after solving)
        playedLine: [m.san, ...m.replyLine].slice(0, 4),
        playedCls: m.cls,
        playedLabel: CLASSES[m.cls].label,
        wBest: m.wBest,
        opp: meta.opp, oppRating: meta.oppRating, date: meta.date, url: meta.url, timeControl: meta.timeControl,
        added: Date.now(), attempts: 0, solvedCount: 0, status: 'new',
      }
    })
}
