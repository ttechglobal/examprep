'use client'
// src/components/games/SortItEngine.jsx
// ─────────────────────────────────────────────────────────────────────────────
// REDESIGNED — fixes light mode transparency bug, adds tactile feedback.
//
// FIXES:
//   - Bucket colours now come from gamesData.js bucket.themeKey → gameTheme.js
//     PALETTE_RING, applied via inline style. Previously used `bucket.color`
//     hex directly with string concatenation like `bucket.color + '22'` for
//     opacity — this DOES work as inline style (it's not a Tailwind class)
//     but wasn't consistent with light/dark adaptation. Now every bucket gets
//     a proper light/dark pair from the palette ring.
//   - Unsorted item chips: solid border + bg-card token (was already okay,
//     kept as-is since it's a structural token, not data colour).
//   - Score ring: count-up animation on reveal, themed via getResultTheme.
//   - Item "snap" feedback: brief scale-pulse when placed in a bucket.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react'
import { getPaletteColor, getResultTheme } from '@/lib/gameTheme'
import { useIsDark } from '@/lib/useIsDark'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Animated score ring — counts up from 0 to final % over ~700ms ────────────
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

  const r    = 40
  const circ = 2 * Math.PI * r
  const fill = (displayPct / 100) * circ
  const trackColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke={trackColor} strokeWidth="8"/>
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="46" textAnchor="middle" style={{ fontSize: 22, fontWeight: 900, fill: color }}>{displayPct}%</text>
        <text x="50" y="62" textAnchor="middle" style={{ fontSize: 11, fill: isDark ? '#6b7280' : '#9ca3af' }}>{correct}/{total}</text>
      </svg>
    </div>
  )
}

export default function SortItEngine({ game, onComplete }) {
  const isDark = useIsDark()
  const [items,       setItems]       = useState(() => shuffle(game.items))
  const [sorted,      setSorted]      = useState({})
  const [selected,    setSelected]    = useState(null)
  const [dragItem,    setDragItem]    = useState(null)
  const [revealed,    setRevealed]    = useState(false)
  const [dragOver,    setDragOver]    = useState(null)
  const [justPlaced,  setJustPlaced]  = useState(null) // itemId — triggers snap animation

  // Build bucket colour map once
  const bucketColors = {}
  game.buckets.forEach((b, i) => { bucketColors[b.id] = getPaletteColor(i) })

  const unsorted = items.filter(i => !sorted[i.id])
  const allPlaced = unsorted.length === 0

  const placeItem = useCallback((itemId, bucketId) => {
    setSorted(prev => ({ ...prev, [itemId]: bucketId }))
    setSelected(null)
    setJustPlaced(itemId)
    setTimeout(() => setJustPlaced(null), 280)
  }, [])

  const handleItemTap = (itemId) => {
    if (revealed) return
    setSelected(prev => prev === itemId ? null : itemId)
  }

  const handleBucketTap = (bucketId) => {
    if (!selected || revealed) return
    placeItem(selected, bucketId)
  }

  const handleDragStart = (e, itemId) => {
    setDragItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e, bucketId) => {
    e.preventDefault()
    setDragOver(bucketId)
  }
  const handleDrop = (e, bucketId) => {
    e.preventDefault()
    if (dragItem) placeItem(dragItem, bucketId)
    setDragItem(null)
    setDragOver(null)
  }
  const handleDragEnd = () => {
    setDragItem(null)
    setDragOver(null)
  }

  const handleRemoveFromBucket = (itemId) => {
    if (revealed) return
    setSorted(prev => {
      const n = { ...prev }
      delete n[itemId]
      return n
    })
  }

  const handleSubmit = () => setRevealed(true)

  const handleRetry = () => {
    setItems(shuffle(game.items))
    setSorted({})
    setSelected(null)
    setRevealed(false)
  }

  const correct = revealed
    ? game.items.filter(i => sorted[i.id] === i.correct).length
    : 0
  const total = game.items.length

  // Theme tokens for structural surfaces (these are safe — global CSS vars)
  const dashedBg     = isDark ? '#1f2937' : '#f9fafb'
  const dashedBorder = isDark ? '#374151' : '#d1d5db'
  const chipBg        = isDark ? '#111827' : '#ffffff'
  const chipBorder    = isDark ? '#374151' : '#e5e7eb'
  const chipBorderSel = '#534ab7'

  // ── RESULT SCREEN ────────────────────────────────────────────────────────────
  if (revealed) {
    const pct = Math.round((correct / total) * 100)
    const resultTheme = getResultTheme(pct)
    const msg =
      pct === 100 ? "Perfect! You know every one of these. 🎉" :
      pct >= 80   ? "Really strong — just a couple to review." :
      pct >= 50   ? "Good start. Check the ones highlighted below." :
                    "Keep practising — this is exactly why games help!"

    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 py-6">
          <ScoreRing correct={correct} total={total} isDark={isDark} />
          <p className="text-base font-black text-primary text-center max-w-xs">{msg}</p>
        </div>

        <div className="space-y-3">
          {game.buckets.map((bucket, i) => {
            const c = bucketColors[bucket.id]
            const bucketItems = game.items.filter(item => item.correct === bucket.id)
            return (
              <div
                key={bucket.id}
                className="rounded-2xl overflow-hidden"
                style={{ border: `1.5px solid ${isDark ? c.darkBorder : c.border}` }}
              >
                <div
                  className="px-4 py-2.5"
                  style={{ background: isDark ? c.darkBg : c.bg }}
                >
                  <p className="text-sm font-black" style={{ color: isDark ? c.darkText : c.text }}>
                    {bucket.label}
                  </p>
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-2" style={{ background: chipBg }}>
                  {bucketItems.map(item => {
                    const wasCorrect = sorted[item.id] === item.correct
                    const okTheme = getResultTheme(wasCorrect ? 100 : 0)
                    return (
                      <span
                        key={item.id}
                        className="text-xs font-bold px-3 py-1.5 rounded-full"
                        style={{
                          background: isDark ? okTheme.darkBg : okTheme.bg,
                          color: isDark ? okTheme.darkText : okTheme.text,
                          border: `1px solid ${isDark ? okTheme.darkBorder : okTheme.border}`,
                        }}
                      >
                        {wasCorrect ? '✓' : '✗'} {item.text}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 py-3.5 text-sm font-black rounded-2xl transition-colors active:scale-[0.98]"
            style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#f9fafb' : '#111827' }}
          >
            Play again
          </button>
          <button
            onClick={() => onComplete?.({ correct, total, score: pct })}
            className="flex-1 py-3.5 text-sm font-black rounded-2xl text-white transition-colors active:scale-[0.98]"
            style={{ background: isDark ? resultTheme.darkSolid : resultTheme.solid }}
          >
            Done →
          </button>
        </div>
      </div>
    )
  }

  // ── PLAYING SCREEN ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Unsorted items */}
      <div>
        <p className="text-xs font-black text-secondary uppercase tracking-wide mb-2">
          {unsorted.length > 0 ? `${unsorted.length} left to sort` : 'All sorted — ready to check!'}
        </p>
        <div
          className="flex flex-wrap gap-2 min-h-[48px] p-3 rounded-2xl"
          style={{ background: dashedBg, border: `2px dashed ${dashedBorder}` }}
        >
          {unsorted.map(item => (
            <button
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragEnd={handleDragEnd}
              onClick={() => handleItemTap(item.id)}
              className="text-sm font-bold px-3 py-2 rounded-xl transition-all cursor-grab active:cursor-grabbing select-none active:scale-95"
              style={{
                background: selected === item.id ? '#534ab7' : chipBg,
                color: selected === item.id ? '#ffffff' : (isDark ? '#f9fafb' : '#111827'),
                border: `2px solid ${selected === item.id ? '#534ab7' : chipBorder}`,
                boxShadow: selected === item.id ? '0 4px 12px rgba(83,74,183,0.3)' : 'none',
                transform: selected === item.id ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {item.text}
            </button>
          ))}
          {unsorted.length === 0 && (
            <p className="text-xs text-tertiary self-center w-full text-center">Nothing left to sort</p>
          )}
        </div>
        {selected && (
          <p className="text-xs font-bold mt-1.5 text-center animate-pulse" style={{ color: '#534ab7' }}>
            Now tap a bucket below to place it ↓
          </p>
        )}
      </div>

      {/* Buckets */}
      <div className="space-y-2.5">
        {game.buckets.map((bucket, i) => {
          const c = bucketColors[bucket.id]
          const bucketItems = Object.entries(sorted)
            .filter(([, bid]) => bid === bucket.id)
            .map(([iid]) => game.items.find(item => item.id === iid))
            .filter(Boolean)

          const isOver   = dragOver === bucket.id
          const isTarget = selected !== null
          const borderColor = isDark ? c.darkBorder : c.border
          const solidColor  = isDark ? c.darkSolid : c.solid

          return (
            <div
              key={bucket.id}
              onDragOver={(e) => handleDragOver(e, bucket.id)}
              onDrop={(e) => handleDrop(e, bucket.id)}
              onDragLeave={() => setDragOver(null)}
              onClick={() => handleBucketTap(bucket.id)}
              className="rounded-2xl overflow-hidden transition-all duration-150"
              style={{
                border: `2px solid ${isOver || isTarget ? solidColor : borderColor}`,
                transform: isOver ? 'scale(1.01)' : 'scale(1)',
                boxShadow: isOver ? `0 4px 14px ${solidColor}30` : 'none',
                cursor: isTarget ? 'pointer' : 'default',
              }}
            >
              {/* Bucket header — solid colour, not tinted */}
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ background: solidColor }}
              >
                <p className="text-sm font-black text-white">{bucket.label}</p>
                <span
                  className="text-xs font-black px-2 py-0.5 rounded-full text-white"
                  style={{ background: 'rgba(255,255,255,0.25)' }}
                >
                  {bucketItems.length}
                </span>
              </div>

              {/* Bucket items */}
              <div
                className="px-4 py-3 min-h-[52px] flex flex-wrap gap-2"
                style={{ background: isDark ? c.darkBg : c.bg }}
              >
                {bucketItems.map(item => (
                  <button
                    key={item.id}
                    onClick={(e) => { e.stopPropagation(); handleRemoveFromBucket(item.id) }}
                    title="Tap to return to unsorted"
                    className="text-sm font-bold px-3 py-1.5 rounded-xl transition-all"
                    style={{
                      background: chipBg,
                      color: isDark ? c.darkText : c.text,
                      border: `1px solid ${borderColor}`,
                      transform: justPlaced === item.id ? 'scale(1.12)' : 'scale(1)',
                    }}
                  >
                    {item.text} ×
                  </button>
                ))}
                {bucketItems.length === 0 && (
                  <p className="text-xs font-medium" style={{ color: isDark ? c.darkText : c.text, opacity: 0.6 }}>
                    {isTarget ? `Tap to place here` : 'Drop items here'}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!allPlaced}
        className="w-full py-4 text-sm font-black rounded-2xl transition-all active:scale-[0.98]"
        style={
          allPlaced
            ? { background: '#534ab7', color: '#ffffff' }
            : { background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#6b7280' : '#9ca3af' }
        }
      >
        {allPlaced ? 'Check my answers →' : `Sort all ${unsorted.length} remaining items first`}
      </button>
    </div>
  )
}