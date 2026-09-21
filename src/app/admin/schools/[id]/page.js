'use client'
// src/app/admin/schools/[id]/page.js
// Full school profile for admin: info, admin contact, students, cohorts,
// slot management with full audit history.

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const BLUE   = '#1264E5'
const NAVY   = '#062A78'
const GREEN  = '#10b981'
const ORANGE = '#f97316'
const RED    = '#ef4444'
const PURPLE = '#7c3aed'

function fmt(d, opts) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatPill({ label, value, color = '#64748b' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 18px', minWidth: 100 }}>
      <p style={{ fontSize: 22, fontWeight: 900, color: color ?? '#0f172a', letterSpacing: '-.03em', lineHeight: 1, marginBottom: 4 }}>{value ?? '—'}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{label}</p>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <p style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{title}</p>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

function SlotManager({ school, slotHistory, onUpdated }) {
  const [newSlots, setNewSlots]   = useState(String(school.slots_purchased ?? 2))
  const [note,     setNote]       = useState('')
  const [saving,   setSaving]     = useState(false)
  const [error,    setError]      = useState(null)
  const [success,  setSuccess]    = useState(null)
  const [history,  setHistory]    = useState(slotHistory)

  const current = school.slots_purchased ?? 0
  const used    = school.slots_used      ?? 0
  const parsed  = parseInt(newSlots, 10)
  const isValid = !isNaN(parsed) && parsed >= 0 && parsed !== current

  async function save() {
    if (!isValid) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res  = await fetch(`/api/admin/schools/${school.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slots_purchased: parsed, note: note.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Update failed')

      setSuccess(`Updated from ${current} → ${parsed} slots`)
      setNote('')
      if (data.auditRow) setHistory(prev => [data.auditRow, ...prev])
      onUpdated?.(data.school)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Current state */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 120, padding: '12px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Purchased</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>{current}</p>
        </div>
        <div style={{ flex: 1, minWidth: 120, padding: '12px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Used</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: used >= current ? RED : '#0f172a' }}>{used}</p>
        </div>
        <div style={{ flex: 1, minWidth: 120, padding: '12px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Available</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: GREEN }}>{Math.max(0, current - used)}</p>
        </div>
      </div>

      {/* Update form */}
      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 12 }}>Change slot capacity</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>New total slots</label>
            <input
              type="number"
              min="0"
              value={newSlots}
              onChange={e => setNewSlots(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 14, fontFamily: 'inherit', fontWeight: 800, color: '#0f172a', outline: 'none' }}
            />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Note (optional)</label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Renewed for 2027 session, invoice #1042"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, fontFamily: 'inherit', color: '#0f172a', outline: 'none' }}
          />
        </div>
        {error   && <p style={{ fontSize: 12, color: RED,   marginBottom: 8 }}>⚠️ {error}</p>}
        {success && <p style={{ fontSize: 12, color: GREEN, marginBottom: 8 }}>✓ {success}</p>}
        <button
          onClick={save}
          disabled={!isValid || saving}
          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: isValid && !saving ? NAVY : '#e2e8f0', color: isValid && !saving ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 800, cursor: isValid && !saving ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all .12s' }}
        >
          {saving ? 'Saving…' : `Set to ${isNaN(parsed) ? '?' : parsed} slots →`}
        </button>
      </div>

      {/* Audit history */}
      {history.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Change history</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <div style={{ flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: h.new_slots > h.old_slots ? GREEN : RED }}>
                    {h.old_slots} → {h.new_slots}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {h.note && <p style={{ fontSize: 12, color: '#374151', fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.note}</p>}
                  <p style={{ fontSize: 11, color: '#94a3b8' }}>{fmtDateTime(h.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SchoolDetailPage() {
  const { id }    = useParams()
  const router    = useRouter()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [school,  setSchool]  = useState(null) // kept in sync when slots updated

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/schools/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setData(json)
      setSchool(json.school)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${BLUE}`, borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <p style={{ fontSize: 32, marginBottom: 10 }}>⚠️</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 16 }}>{error}</p>
      <button onClick={() => router.push('/admin/schools')} style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Back to schools</button>
    </div>
  )

  const { admin, students, cohorts, slotHistory } = data
  const activeCohort = cohorts.find(c => c.is_active) ?? null

  return (
    <div style={{ maxWidth: 900, fontFamily: 'inherit' }}>
      <style>{`* { box-sizing: border-box } @keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: '#94a3b8' }}>
        <Link href="/admin/schools" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 600 }}>Schools</Link>
        <span>/</span>
        <span style={{ color: '#0f172a', fontWeight: 700 }}>{school?.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: `${NAVY}10`, border: `1.5px solid ${NAVY}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🏫</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-.03em', marginBottom: 2 }}>{school?.name}</h1>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              {[school?.city, school?.state].filter(Boolean).join(', ') || 'Location not set'}
              {' · '}Registered {fmt(school?.created_at)}
            </p>
          </div>
        </div>
        <span style={{
          padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 800,
          background: school?.is_active ? '#f0fdf4' : '#f8fafc',
          color:      school?.is_active ? GREEN : '#94a3b8',
          border:     `1px solid ${school?.is_active ? '#bbf7d0' : '#e2e8f0'}`,
        }}>
          {school?.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatPill label="Students" value={students.length} color={BLUE} />
        <StatPill label="Cohorts"  value={cohorts.length}  color={NAVY} />
        <StatPill label="Slots purchased" value={school?.slots_purchased ?? 0} color={PURPLE} />
        <StatPill label="Slots used"      value={school?.slots_used      ?? 0} color={ORANGE} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* School info */}
        <SectionCard title="School info">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['School name', school?.name],
              ['City',        school?.city      || '—'],
              ['State',       school?.state     || '—'],
              ['Registered',  fmt(school?.created_at)],
              ['Setup complete', school?.setup_complete ? 'Yes' : 'No'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, width: 110, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{val}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Admin contact */}
        <SectionCard title="School admin">
          {admin?.name || admin?.email ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${BLUE}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {admin.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{admin.name ?? '—'}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8' }}>School Administrator</p>
                </div>
              </div>
              {admin.email && (
                <a href={`mailto:${admin.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', textDecoration: 'none' }}>
                  <span style={{ fontSize: 14 }}>✉️</span>
                  <span style={{ fontSize: 12, color: BLUE, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin.email}</span>
                </a>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>No admin registered for this school yet.</p>
          )}
        </SectionCard>
      </div>

      {/* Slot management */}
      <div style={{ marginBottom: 20 }}>
        <SectionCard title="Subscription slots">
          <SlotManager
            school={school}
            slotHistory={slotHistory}
            onUpdated={updated => setSchool(s => ({ ...s, ...updated }))}
          />
        </SectionCard>
      </div>

      {/* Cohorts */}
      <div style={{ marginBottom: 20 }}>
        <SectionCard title={`Cohorts (${cohorts.length})`}>
          {cohorts.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>No cohorts set up yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cohorts.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 1 }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>
                      Code: <strong style={{ color: '#374151', fontFamily: 'monospace' }}>{c.invite_code}</strong>
                      {c.session ? ` · ${c.session}` : ''}
                      {' · '}Created {fmt(c.created_at)}
                    </p>
                  </div>
                  <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 800, background: c.is_active ? '#f0fdf4' : '#f8fafc', color: c.is_active ? GREEN : '#94a3b8', border: `1px solid ${c.is_active ? '#bbf7d0' : '#e2e8f0'}` }}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Students */}
      <SectionCard title={`Students (${students.length})`}>
        {students.length === 0 ? (
          <p style={{ fontSize: 13, color: '#94a3b8' }}>No students linked to this school yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {['Name', 'Exam', 'XP', 'Plan', 'Joined'].map(h => (
                    <th key={h} style={{ textAlign: h === 'XP' || h === 'Joined' ? 'right' : 'left', padding: '8px 12px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '9px 12px' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{s.full_name ?? '—'}</p>
                      <p style={{ fontSize: 10, color: '#94a3b8' }}>{s.email ?? ''}</p>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ fontSize: 11, color: '#374151' }}>{s.exam_type ?? '—'}</span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{(s.total_points ?? 0).toLocaleString()}</span>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: s.plan === 'premium' ? `${PURPLE}15` : '#f1f5f9', color: s.plan === 'premium' ? PURPLE : '#94a3b8' }}>
                        {s.plan === 'premium' ? '⭐ Premium' : 'Free'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{fmt(s.created_at, { month: 'short', day: 'numeric' })}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length === 100 && (
              <p style={{ fontSize: 11, color: '#94a3b8', padding: '10px 12px', textAlign: 'center' }}>Showing first 100 students</p>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  )
}