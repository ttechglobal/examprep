'use client'
// src/components/games/engines/MatchEngine.jsx
// (renamed from ConceptConnector.jsx — fixes "Module not found" build error.
//  Logic unchanged from the original delivery.)
// ─────────────────────────────────────────────────────────────────────────────
// Tap a term, then tap its matching definition. No drag needed.
// Correct pairs lock in green. Wrong pairs flash red and reset.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getResultTheme(pct) {
  if (pct >= 80) return { solid: '#3b6d11', bg: '#eaf3de', text: '#27500a', border: '#c0dd97', darkSolid: '#639922', darkBg: '#173404', darkText: '#c0dd97', darkBorder: '#3b6d11' }
  if (pct >= 50) return { solid: '#854f0b', bg: '#faeeda', text: '#633806', border: '#fac775', darkSolid: '#ba7517', darkBg: '#412402', darkText: '#fac775', darkBorder: '#854f0b' }
  return { solid: '#a32d2d', bg: '#fcebeb', text: '#791f1f', border: '#f7c1c1', darkSolid: '#e24b4a', darkBg: '#501313', darkText: '#f7c1c1', darkBorder: '#a32d2d' }
}

function useIsDarkLocal() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

function ScoreRing({ correct, total, isDark }) {
  const finalPct = total > 0 ? Math.round((correct / total) * 100) : 0
  const [displayPct, setDisplayPct] = useState(0)
  const theme = getResultTheme(finalPct)
  const color = isDark ? theme.darkSolid : theme.solid

  useEffect(() => {
    const duration = 700
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setDisplayPct(Math.round(t * finalPct))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [finalPct])

  const r = 40, circ = 2 * Math.PI * r, fill = (displayPct / 100) * circ
  const trackColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke={trackColor} strokeWidth="8"/>
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)"/>
      <text x="50" y="46" textAnchor="middle" style={{ fontSize: 22, fontWeight: 900, fill: color }}>{displayPct}%</text>
      <text x="50" y="62" textAnchor="middle" style={{ fontSize: 11, fill: isDark ? '#6b7280' : '#9ca3af' }}>{correct}/{total}</text>
    </svg>
  )
}

export default function MatchEngine({ game, onComplete }) {
  const isDark = useIsDarkLocal()
  const solid = '#534ab7'

  const [terms,   setTerms]   = useState(() => shuffle(game.pairs.map((p, i) => ({ ...p, id: i }))))
  const [matches, setMatches] = useState(() => shuffle(game.pairs.map((p, i) => ({ ...p, id: i }))))
  const [selectedTerm,  setSelectedTerm]  = useState(null)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [matched,   setMatched]   = useState(new Set())
  const [wrong,     setWrong]     = useState(null)
  const [attempts,  setAttempts]  = useState(0)
  const [done,      setDone]      = useState(false)

  const total = game.pairs.length

  useEffect(() => { if (matched.size === total) setDone(true) }, [matched, total])

  useEffect(() => {
    if (!wrong) return
    const t = setTimeout(() => { setWrong(null); setSelectedTerm(null); setSelectedMatch(null) }, 600)
    return () => clearTimeout(t)
  }, [wrong])

  const handleTermTap = (id) => {
    if (matched.has(id) || wrong || done) return
    setSelectedTerm(prev => prev === id ? null : id)
    setSelectedMatch(null)
  }

  const handleMatchTap = (id) => {
    if (matched.has(id) || wrong || done) return
    if (selectedTerm === null) return
    setAttempts(a => a + 1)
    if (selectedTerm === id) {
      setMatched(prev => new Set([...prev, id]))
      setSelectedTerm(null)
      setSelectedMatch(null)
    } else {
      setWrong({ term: selectedTerm, match: id })
    }
  }

  const handleRetry = () => {
    setTerms(shuffle(game.pairs.map((p, i) => ({ ...p, id: i }))))
    setMatches(shuffle(game.pairs.map((p, i) => ({ ...p, id: i }))))
    setSelectedTerm(null); setSelectedMatch(null); setMatched(new Set())
    setWrong(null); setAttempts(0); setDone(false)
  }

  const accuracy = attempts > 0 ? Math.round((total / attempts) * 100) : 100
  const correctTheme = getResultTheme(100)
  const wrongTheme = getResultTheme(0)
  const cardBg = isDark ? '#111827' : '#ffffff'
  const cardBorder = isDark ? '#1f2937' : '#ede9e3'

  if (done) {
    const msg =
      attempts === total ? `First try on all ${total}! Perfect memory. 🎉` :
      accuracy >= 80    ? 'Great job — mostly got them right first try.' :
      accuracy >= 50    ? 'Good work. A second round will sharpen these.' :
                          'The concepts are tricky — practice makes perfect!'
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 py-6">
          <ScoreRing correct={total} total={total} isDark={isDark} />
          <p className="text-base font-black text-primary text-center max-w-xs">{msg}</p>
          {attempts > total && (
            <p className="text-xs text-secondary">{attempts - total} wrong attempt{attempts - total !== 1 ? 's' : ''} along the way</p>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${cardBorder}`, background: cardBg }}>
          <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${cardBorder}` }}>
            <p className="text-xs font-black text-secondary uppercase tracking-wide">All pairs</p>
          </div>
          <div>
            {game.pairs.map((pair, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3" style={{ borderTop: i > 0 ? `1px solid ${cardBorder}` : 'none' }}>
                <span style={{ color: isDark ? correctTheme.darkSolid : correctTheme.solid }} className="mt-0.5 flex-shrink-0">✓</span>
                <div>
                  <p className="text-sm font-black text-primary">{pair.term}</p>
                  <p className="text-xs text-secondary mt-0.5 leading-relaxed">{pair.match}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleRetry}
            className="flex-1 py-3.5 text-sm font-black rounded-2xl transition-colors active:scale-[0.98]"
            style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#f9fafb' : '#111827' }}>
            Play again
          </button>
          <button onClick={() => onComplete?.({ correct: total, total, score: accuracy })}
            className="flex-1 py-3.5 text-sm font-black rounded-2xl text-white transition-colors active:scale-[0.98]"
            style={{ background: solid }}>
            Done →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-black text-secondary uppercase tracking-wide text-center">
        {matched.size}/{total} matched
      </p>

      {selectedTerm === null ? (
        <p className="text-xs font-bold text-center" style={{ color: solid }}>
          Tap a term on the left to start →
        </p>
      ) : (
        <p className="text-xs font-bold text-center animate-pulse" style={{ color: solid }}>
          Now tap the matching definition on the right ↓
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[10px] font-black text-secondary uppercase tracking-wide text-center">Terms</p>
          {terms.map(pair => {
            const isMatched  = matched.has(pair.id)
            const isSelected = selectedTerm === pair.id
            const isWrong    = wrong?.term === pair.id

            const style = isMatched
              ? { background: isDark ? correctTheme.darkBg : correctTheme.bg, color: isDark ? correctTheme.darkText : correctTheme.text, border: `2px solid ${isDark ? correctTheme.darkBorder : correctTheme.border}` }
              : isWrong
              ? { background: isDark ? wrongTheme.darkBg : wrongTheme.bg, color: isDark ? wrongTheme.darkText : wrongTheme.text, border: `2px solid ${isDark ? wrongTheme.darkBorder : wrongTheme.border}`, transform: 'scale(0.95)' }
              : isSelected
              ? { background: solid, color: '#ffffff', border: `2px solid ${solid}`, transform: 'scale(1.02)', boxShadow: `0 4px 12px ${solid}40` }
              : { background: isDark ? '#111827' : '#ffffff', color: isDark ? '#f9fafb' : '#111827', border: `2px solid ${isDark ? '#374151' : '#e5e7eb'}` }

            return (
              <button
                key={pair.id}
                onClick={() => handleTermTap(pair.id)}
                disabled={isMatched}
                style={style}
                className="w-full text-left px-3 py-3 rounded-xl text-xs font-bold transition-all leading-snug"
              >
                {isMatched && <span className="mr-1">✓</span>}
                {pair.term}
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black text-secondary uppercase tracking-wide text-center">Definitions</p>
          {matches.map(pair => {
            const isMatched  = matched.has(pair.id)
            const isSelected = selectedMatch === pair.id
            const isWrong    = wrong?.match === pair.id
            const canTap     = selectedTerm !== null && !isMatched

            const style = isMatched
              ? { background: isDark ? correctTheme.darkBg : correctTheme.bg, color: isDark ? correctTheme.darkText : correctTheme.text, border: `2px solid ${isDark ? correctTheme.darkBorder : correctTheme.border}` }
              : isWrong
              ? { background: isDark ? wrongTheme.darkBg : wrongTheme.bg, color: isDark ? wrongTheme.darkText : wrongTheme.text, border: `2px solid ${isDark ? wrongTheme.darkBorder : wrongTheme.border}`, transform: 'scale(0.95)' }
              : canTap
              ? { background: isDark ? '#111827' : '#ffffff', color: isDark ? '#f9fafb' : '#111827', border: `2px solid ${isDark ? '#374151' : '#e5e7eb'}` }
              : { background: isDark ? '#0a0f1a' : '#f9fafb', color: isDark ? '#6b7280' : '#9ca3af', border: `2px solid ${isDark ? '#1f2937' : '#e5e7eb'}`, opacity: 0.7 }

            return (
              <button
                key={pair.id}
                onClick={() => handleMatchTap(pair.id)}
                disabled={isMatched || selectedTerm === null}
                style={style}
                className="w-full text-left px-3 py-3 rounded-xl text-xs font-medium transition-all leading-snug"
              >
                {isMatched && <span className="mr-1">✓</span>}
                {pair.match}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}