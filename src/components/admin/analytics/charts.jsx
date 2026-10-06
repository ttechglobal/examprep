'use client'
// src/components/admin/analytics/charts.jsx
// The Analytics page's charts, plain SVG:
//   LineChart   one series over days (daily active students). Hover or focus
//               shows a crosshair and the day's value.
//   PairBars    two series side by side per period (new vs returning), with a
//               legend and a tooltip per bar.
//   Meter       a thin inline bar for a share in a table row.
//   DataTable   the same numbers as a table ("Show data") so no value is
//               only reachable by hovering.
// Colours are roles from analytics.module.css (validated categorical slots
// 1–2 on the light admin surface; the admin area is always light).

import { useEffect, useId, useRef, useState } from 'react'
import s from './analytics.module.css'

const H = 220, PAD = { top: 16, right: 12, bottom: 28, left: 40 }

// Charts draw at their real width (not a scaled-down picture), so axis text
// stays 11px in narrow cards.
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}
const fmt = n => (n ?? 0).toLocaleString('en-NG')

/** Round a max up to a "nice" axis top and return 4 ticks. */
function ticks(max) {
  const top = max <= 4 ? 4 : (() => {
    const step = 10 ** Math.floor(Math.log10(max / 4))
    const nice = [1, 2, 2.5, 5, 10].map(m => m * step).find(m => m * 4 >= max) ?? step * 10
    return nice * 4
  })()
  return [0, top / 4, top / 2, (3 * top) / 4, top]
}

export function LineChart({ points, label, valueLabel, dateLabel }) {
  const [box, W] = useWidth()
  const [hover, setHover] = useState(null)
  const svg = useRef(null)
  const id = useId()
  const max = Math.max(1, ...points.map(p => p.value))
  const yTicks = ticks(max)
  const top = yTicks.at(-1)
  const innerW = W - PAD.left - PAD.right, innerH = H - PAD.top - PAD.bottom
  const x = i => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = v => PAD.top + innerH - (v / top) * innerH
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('')
  const area = `${path}L${x(points.length - 1)},${PAD.top + innerH}L${x(0)},${PAD.top + innerH}Z`
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(W / 80))))

  function pick(event) {
    const box = svg.current.getBoundingClientRect()
    const px = ((event.clientX - box.left) / box.width) * W
    const i = Math.round(((px - PAD.left) / innerW) * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, i)))
  }

  const h = hover != null ? points[hover] : null
  return <figure className={s.figure} ref={box}>
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label={label}
      onPointerMove={pick} onPointerLeave={() => setHover(null)} tabIndex={0}
      onFocus={() => setHover(points.length - 1)} onBlur={() => setHover(null)}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') setHover(i => Math.max(0, (i ?? points.length) - 1))
        if (e.key === 'ArrowRight') setHover(i => Math.min(points.length - 1, (i ?? -1) + 1))
      }}>
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--series-1)" stopOpacity=".16"/>
          <stop offset="1" stopColor="var(--series-1)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {yTicks.map(t => <g key={t}>
        <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className={t === 0 ? s.baseline : s.grid}/>
        <text x={PAD.left - 8} y={y(t) + 4} className={s.axisText} textAnchor="end">{fmt(t)}</text>
      </g>)}
      {points.map((p, i) => i % labelEvery === 0 || i === points.length - 1
        ? <text key={p.key} x={x(i)} y={H - 8} className={s.axisText} textAnchor="middle">{p.short}</text> : null)}
      <path d={area} fill={`url(#${id}-fill)`}/>
      <path d={path} className={s.line}/>
      {h && <>
        <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className={s.crosshair}/>
        <circle cx={x(hover)} cy={y(h.value)} r={5} className={s.marker}/>
      </>}
    </svg>
    {h && <div className={s.tooltip} style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
      <strong>{fmt(h.value)}</strong> {valueLabel}<span>{h.long ?? dateLabel}</span>
    </div>}
  </figure>
}

export function PairBars({ groups, series, label }) {
  const [box, W] = useWidth()
  const [hover, setHover] = useState(null)   // { g, k }
  const max = Math.max(1, ...groups.flatMap(g => series.map(se => g[se.key] ?? 0)))
  const yTicks = ticks(max)
  const top = yTicks.at(-1)
  const innerW = W - PAD.left - PAD.right, innerH = H - PAD.top - PAD.bottom
  const slot = innerW / Math.max(1, groups.length)
  const barW = Math.min(28, (slot * 0.7) / series.length)
  const y = v => PAD.top + innerH - (v / top) * innerH

  return <figure className={s.figure} ref={box}>
    <div className={s.legend}>
      {series.map(se => <span key={se.key}><i style={{ background: `var(${se.color})` }}/>{se.label}</span>)}
    </div>
    <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="img" aria-label={label}>
      {yTicks.map(t => <g key={t}>
        <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className={t === 0 ? s.baseline : s.grid}/>
        <text x={PAD.left - 8} y={y(t) + 4} className={s.axisText} textAnchor="end">{fmt(t)}</text>
      </g>)}
      {groups.map((g, gi) => {
        const start = PAD.left + gi * slot + (slot - (barW * series.length + 2 * (series.length - 1))) / 2
        return <g key={g.key}>
          {series.map((se, si) => {
            const v = g[se.key] ?? 0, bx = start + si * (barW + 2), by = y(v), bh = PAD.top + innerH - by
            const r = Math.min(4, bh / 2, barW / 2)
            return <path key={se.key} tabIndex={0} aria-label={`${g.long}: ${fmt(v)} ${se.label}`}
              d={bh <= 0 ? '' : `M${bx},${by + bh}V${by + r}Q${bx},${by} ${bx + r},${by}H${bx + barW - r}Q${bx + barW},${by} ${bx + barW},${by + r}V${by + bh}Z`}
              style={{ fill: `var(${se.color})` }} className={s.bar}
              onPointerEnter={() => setHover({ g: gi, k: se.key })} onPointerLeave={() => setHover(null)}
              onFocus={() => setHover({ g: gi, k: se.key })} onBlur={() => setHover(null)}/>
          })}
          <text x={PAD.left + gi * slot + slot / 2} y={H - 8} className={s.axisText} textAnchor="middle">{g.short}</text>
        </g>
      })}
    </svg>
    {hover && <div className={s.tooltip} style={{ left: `${((PAD.left + hover.g * slot + slot / 2) / W) * 100}%` }} role="status">
      <strong>{fmt(groups[hover.g][hover.k])}</strong> {series.find(se => se.key === hover.k).label.toLowerCase()}<span>{groups[hover.g].long}</span>
    </div>}
  </figure>
}

/** A share (0–100) as a thin bar with its number beside it. */
export function Meter({ value, tone = 'series-1' }) {
  const v = Math.max(0, Math.min(100, value ?? 0))
  return <span className={s.meter}>
    <span className={s.meterTrack}><span className={s.meterFill} style={{ width: `${v}%`, background: `var(--${tone})` }}/></span>
    <span className={s.meterValue}>{value == null ? '—' : `${Math.round(value)}%`}</span>
  </span>
}

/** "Show data": the numbers behind a chart. columns: [{ key, label }] */
export function DataTable({ rows, columns, caption }) {
  return <details className={s.details}>
    <summary>Show data</summary>
    <table className={s.table}>
      <caption className={s.srOnly}>{caption}</caption>
      <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{columns.map(c => <td key={c.key}>{typeof r[c.key] === 'number' ? fmt(r[c.key]) : r[c.key]}</td>)}</tr>)}</tbody>
    </table>
  </details>
}
