'use client'
// src/app/admin/access-codes/page.js
// Access code management — generate, view, deactivate, export

import { useState, useEffect, useMemo } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtShort(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const TYPE_LABEL = { school: 'School', promo: 'Promo', voucher: 'Voucher' }
const TYPE_COLOR = {
  school:  { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  promo:   { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
  voucher: { bg: '#fefce8', border: '#fef08a', color: '#854d0e' },
}

const DURATION_OPTIONS = [
  { label: '7 days',    value: 7 },
  { label: '30 days',   value: 30 },
  { label: '90 days',   value: 90 },
  { label: '6 months',  value: 180 },
  { label: '1 year',    value: 365 },
]

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({ type }) {
  const c = TYPE_COLOR[type] ?? TYPE_COLOR.voucher
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
    }}>
      {TYPE_LABEL[type] ?? type}
    </span>
  )
}

// ── Copy button ────────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button onClick={copy} style={{
      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
      background: copied ? '#f0fdf4' : '#f9fafb',
      border: `1px solid ${copied ? '#86efac' : '#e5e7eb'}`,
      color: copied ? '#15803d' : '#6b7280',
      transition: 'all .15s',
    }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// ── Code row ──────────────────────────────────────────────────────────────────
function CodeRow({ code, schools, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  const usedPct = code.max_uses ? Math.round(((code.uses_count ?? 0) / code.max_uses) * 100) : null
  const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
  const isFull    = code.max_uses !== null && (code.uses_count ?? 0) >= code.max_uses

  const statusColor = !code.is_active ? '#9ca3af'
    : isExpired || isFull ? '#ef4444'
    : '#22c55e'
  const statusLabel = !code.is_active ? 'Deactivated'
    : isExpired ? 'Expired'
    : isFull ? 'Used up'
    : 'Active'

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Status dot */}
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />

        {/* Code string */}
        <code style={{
          fontSize: 14, fontWeight: 900, letterSpacing: '.04em',
          color: code.is_active && !isExpired && !isFull ? '#111827' : '#9ca3af',
          fontFamily: 'monospace', minWidth: 160,
        }}>
          {code.code}
        </code>

        <CopyBtn text={code.code} />

        {/* Type badge */}
        <Badge type={code.type} />

        {/* School name if applicable */}
        {code.school_name && (
          <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
            🏫 {code.school_name}
          </span>
        )}

        {/* Duration */}
        <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
          {code.duration_days}d access
        </span>

        {/* Uses */}
        <div style={{ textAlign: 'right', minWidth: 80 }}>
          {code.max_uses !== null ? (
            <>
              <p style={{ fontSize: 12, fontWeight: 800, color: usedPct >= 90 ? '#ef4444' : '#111827' }}>
                {code.uses_count ?? 0} / {code.max_uses}
              </p>
              <div style={{ height: 3, borderRadius: 999, background: '#f3f4f6', marginTop: 3, width: 80 }}>
                <div style={{ height: '100%', borderRadius: 999, width: `${usedPct}%`,
                  background: usedPct >= 90 ? '#ef4444' : usedPct >= 50 ? '#f59e0b' : '#22c55e' }} />
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>
              {code.uses_count ?? 0} used
            </p>
          )}
        </div>

        {/* Expiry */}
        <span style={{ fontSize: 11, color: isExpired ? '#ef4444' : '#9ca3af', minWidth: 80, textAlign: 'right' }}>
          {code.expires_at ? (isExpired ? '✗ ' : '') + fmt(code.expires_at) : 'No expiry'}
        </span>

        {/* Toggle active */}
        <button
          onClick={() => onToggle(code.id, !code.is_active)}
          style={{
            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
            background: code.is_active ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${code.is_active ? '#fecaca' : '#bbf7d0'}`,
            color: code.is_active ? '#dc2626' : '#15803d',
          }}
        >
          {code.is_active ? 'Deactivate' : 'Activate'}
        </button>

        {/* Expand */}
        <button onClick={() => setExpanded(e => !e)} style={{
          width: 28, height: 28, borderRadius: 7, background: '#f9fafb', border: '1px solid #e5e7eb',
          cursor: 'pointer', fontSize: 11, color: '#9ca3af',
          transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s',
        }}>▼</button>
      </div>

      {/* Expanded: redemption list */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa', padding: '12px 16px' }}>
          {code.redemptions.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>No redemptions yet</p>
          ) : (
            <>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ca3af', marginBottom: 8 }}>
                Redemptions ({code.redemptions.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {code.redemptions.slice(0, 20).map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6b7280' }}>
                    <span style={{ fontFamily: 'monospace', color: '#111827' }}>{r.student_id?.slice(0, 8)}…</span>
                    <span>Redeemed {fmtShort(r.redeemed_at)}</span>
                    <span>Expires {fmtShort(r.access_expires_at)}</span>
                  </div>
                ))}
                {code.redemptions.length > 20 && (
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>+{code.redemptions.length - 20} more</p>
                )}
              </div>
            </>
          )}
          {code.metadata?.note && (
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>📝 {code.metadata.note}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Generate modal ─────────────────────────────────────────────────────────────
function GenerateModal({ schools, onClose, onGenerated }) {
  const [type,         setType]         = useState('voucher')
  const [schoolId,     setSchoolId]     = useState('')
  const [prefix,       setPrefix]       = useState('')
  const [duration,     setDuration]     = useState(30)
  const [maxUses,      setMaxUses]      = useState(1)
  const [unlimitedUse, setUnlimitedUse] = useState(false)
  const [quantity,     setQuantity]     = useState(1)
  const [expiresAt,    setExpiresAt]    = useState('')
  const [note,         setNote]         = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [result,       setResult]       = useState(null)

  // Auto-set school prefix from selected school
  useEffect(() => {
    if (type === 'school' && schoolId) {
      const school = schools.find(s => s.id === schoolId)
      if (school) {
        const words = school.name.split(/\s+/)
        const auto  = words.map(w => w[0]).join('').toUpperCase().slice(0, 4)
        setPrefix(auto)
      }
    }
  }, [type, schoolId, schools])

  async function generate() {
    if (type === 'school' && !schoolId) { setError('Select a school'); return }
    setLoading(true); setError(null)
    const res  = await fetch('/api/admin/access-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        school_id:    type === 'school' ? schoolId : null,
        prefix:       prefix || '',
        duration_days: duration,
        max_uses:     unlimitedUse ? null : Number(maxUses),
        quantity:     Number(quantity),
        expires_at:   expiresAt ? new Date(expiresAt).toISOString() : null,
        note,
      }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    setResult(data.codes)
    onGenerated(data.codes)
    setLoading(false)
  }

  function exportCSV() {
    if (!result) return
    const rows = [['Code', 'Type', 'Duration', 'Created'].join(',')]
    for (const c of result) rows.push([c.code, c.type, c.duration_days + 'd', c.created_at].join(','))
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `access-codes-${Date.now()}.csv`
    a.click()
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, boxSizing: 'border-box',
    border: '1.5px solid #e5e7eb', fontSize: 13, fontWeight: 500,
    background: '#fff', color: '#111827', outline: 'none', fontFamily: 'inherit',
  }
  const labelStyle = { fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>Generate Access Codes</h2>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Configure and generate in bulk</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: 16, color: '#6b7280' }}>✕</button>
        </div>

        {!result ? (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Type selector */}
            <div>
              <label style={labelStyle}>Code type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[
                  { id: 'school',  label: '🏫 School',  sub: 'For school batches' },
                  { id: 'promo',   label: '🎁 Promo',   sub: 'Marketing / trial' },
                  { id: 'voucher', label: '🎟 Voucher', sub: 'Sold individually' },
                ].map(t => (
                  <button key={t.id} onClick={() => setType(t.id)} style={{
                    padding: '10px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    background: type === t.id ? '#eff6ff' : '#f9fafb',
                    border: `2px solid ${type === t.id ? '#3b82f6' : '#e5e7eb'}`,
                    transition: 'all .12s',
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>{t.label}</p>
                    <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{t.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* School selector */}
            {type === 'school' && (
              <div>
                <label style={labelStyle}>School *</label>
                <select value={schoolId} onChange={e => setSchoolId(e.target.value)} style={inputStyle}>
                  <option value="">Select a school…</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {/* Prefix */}
            <div>
              <label style={labelStyle}>
                {type === 'school' ? 'Code prefix (auto-set from school name)' : type === 'promo' ? 'Promo code string' : 'Custom prefix (optional)'}
              </label>
              <input
                value={prefix}
                onChange={e => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12))}
                placeholder={type === 'school' ? 'e.g. KC' : type === 'promo' ? 'e.g. LAUNCH2026' : 'e.g. EXAM'}
                style={inputStyle}
              />
              {type === 'school' && prefix && (
                <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>Preview: {prefix}-A7X2B9</p>
              )}
              {type === 'promo' && prefix && quantity === 1 && (
                <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>Exact code: {prefix}</p>
              )}
            </div>

            {/* Duration */}
            <div>
              <label style={labelStyle}>Access duration</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DURATION_OPTIONS.map(d => (
                  <button key={d.value} onClick={() => setDuration(d.value)} style={{
                    padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                    background: duration === d.value ? '#1264E5' : '#f9fafb',
                    border: `1.5px solid ${duration === d.value ? '#1264E5' : '#e5e7eb'}`,
                    color: duration === d.value ? '#fff' : '#374151',
                    fontSize: 12, fontWeight: 700,
                  }}>{d.label}</button>
                ))}
              </div>
            </div>

            {/* Max uses */}
            <div>
              <label style={labelStyle}>
                {type === 'voucher' ? 'Uses (vouchers are always single-use)' : 'Maximum uses per code'}
              </label>
              {type !== 'voucher' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
                  <input type="checkbox" checked={unlimitedUse} onChange={e => setUnlimitedUse(e.target.checked)} />
                  Unlimited uses (e.g. school-wide code)
                </label>
              )}
              {!unlimitedUse && type !== 'voucher' && (
                <input
                  type="number" min={1} max={10000}
                  value={maxUses} onChange={e => setMaxUses(e.target.value)}
                  style={inputStyle}
                />
              )}
              {type === 'voucher' && (
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Each voucher code can only be used once.</p>
              )}
            </div>

            {/* Quantity */}
            {type === 'voucher' && (
              <div>
                <label style={labelStyle}>How many codes to generate</label>
                <input
                  type="number" min={1} max={500}
                  value={quantity} onChange={e => setQuantity(e.target.value)}
                  style={inputStyle}
                />
                <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>Max 500 per batch. Export as CSV for printing/distribution.</p>
              </div>
            )}

            {/* Code expiry */}
            <div>
              <label style={labelStyle}>Code expires on (optional — leave blank for no expiry)</label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} style={inputStyle} />
              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>This is when the CODE itself stops working, not when access ends.</p>
            </div>

            {/* Note */}
            <div>
              <label style={labelStyle}>Internal note (optional)</label>
              <input
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="e.g. Kings College batch 1 — May 2026"
                style={inputStyle}
              />
            </div>

            {error && <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{error}</p>}

            <button
              onClick={generate} disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: loading ? '#93c5fd' : '#1264E5', color: '#fff',
                fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 0 #0a3fa0',
              }}
            >
              {loading ? 'Generating…' : `Generate ${quantity > 1 ? quantity + ' codes' : 'code'} →`}
            </button>
          </div>
        ) : (
          /* Success state */
          <div style={{ padding: '20px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>✅</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>{result.length} code{result.length !== 1 ? 's' : ''} generated</p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{result[0]?.duration_days} days access each</p>
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {result.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <code style={{ flex: 1, fontSize: 14, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '.05em', color: '#111827' }}>{c.code}</code>
                  <CopyBtn text={c.code} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={exportCSV} style={{
                flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e5e7eb',
                background: '#f9fafb', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>⬇ Export CSV</button>
              <button onClick={() => { setResult(null); setPrefix(''); setNote(''); setQuantity(1) }} style={{
                flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                background: '#1264E5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>Generate more</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AccessCodesPage() {
  const [codes,   setCodes]   = useState([])
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [showing, setShowing] = useState(false)  // generate modal
  const [filter,  setFilter]  = useState('all')  // all | school | promo | voucher | active | inactive
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/access-codes').then(r => r.json()),
      fetch('/api/admin/schools').then(r => r.json()),
    ]).then(([codeData, schoolData]) => {
      if (codeData.error) { setError(codeData.error); return }
      setCodes(codeData.codes ?? [])
      setSchools(schoolData.schools ?? [])
      setLoading(false)
    }).catch(() => { setError('Failed to load'); setLoading(false) })
  }, [])

  function onGenerated(newCodes) {
    setCodes(prev => [...newCodes, ...prev])
  }

  async function toggleCode(id, is_active) {
    const res  = await fetch('/api/admin/access-codes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    })
    if (res.ok) setCodes(prev => prev.map(c => c.id === id ? { ...c, is_active } : c))
  }

  const filtered = useMemo(() => {
    let list = codes
    if (filter === 'active')   list = list.filter(c => c.is_active)
    if (filter === 'inactive') list = list.filter(c => !c.is_active)
    if (filter === 'school')   list = list.filter(c => c.type === 'school')
    if (filter === 'promo')    list = list.filter(c => c.type === 'promo')
    if (filter === 'voucher')  list = list.filter(c => c.type === 'voucher')
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.code.toLowerCase().includes(q) ||
        c.school_name?.toLowerCase().includes(q) ||
        c.metadata?.note?.toLowerCase().includes(q)
      )
    }
    return list
  }, [codes, filter, search])

  // Summary stats
  const total   = codes.length
  const active  = codes.filter(c => c.is_active).length
  const redeemed = codes.reduce((a, c) => a + (c.uses_count ?? 0), 0)
  const seats   = codes.filter(c => c.type === 'school' && c.is_active)
    .reduce((a, c) => a + (c.max_uses ?? 0), 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#1264E5', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <p style={{ fontSize: 32, marginBottom: 8 }}>⚠️</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>{error}</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Access Codes</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Generate and manage premium access codes for schools, campaigns, and vouchers
          </p>
        </div>
        <button
          onClick={() => setShowing(true)}
          style={{
            padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: '#1264E5', color: '#fff', fontSize: 13, fontWeight: 800,
            boxShadow: '0 4px 0 #0a3fa0', flexShrink: 0,
          }}
        >
          + Generate codes
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { label: 'Total codes',   value: total,    color: '#111827' },
          { label: 'Active codes',  value: active,   color: '#15803d' },
          { label: 'Total uses',    value: redeemed, color: '#1d4ed8' },
          { label: 'School seats',  value: seats,    color: '#854d0e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all','active','inactive','school','promo','voucher'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
            background: filter === f ? '#1264E5' : '#f9fafb',
            border: `1.5px solid ${filter === f ? '#1264E5' : '#e5e7eb'}`,
            color: filter === f ? '#fff' : '#6b7280',
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search codes, schools, notes…"
          style={{
            marginLeft: 'auto', padding: '7px 12px', borderRadius: 9, border: '1.5px solid #e5e7eb',
            fontSize: 12, outline: 'none', width: 220, fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Code list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🎟</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#374151', marginBottom: 4 }}>
            {codes.length === 0 ? 'No codes yet' : 'Nothing matches'}
          </p>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>
            {codes.length === 0 ? 'Generate your first access code to get started.' : 'Try a different filter or search.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(code => (
            <CodeRow key={code.id} code={code} schools={schools} onToggle={toggleCode} />
          ))}
        </div>
      )}

      {showing && (
        <GenerateModal
          schools={schools}
          onClose={() => setShowing(false)}
          onGenerated={onGenerated}
        />
      )}
    </div>
  )
}