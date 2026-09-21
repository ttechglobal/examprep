'use client'
// src/app/admin/users/page.js — v2
// Student management: full info, plan badge, expandable detail rows.

import { useState, useEffect, useCallback } from 'react'

const BLUE   = '#1264E5'
const GREEN  = '#10b981'
const ORANGE = '#f97316'
const RED    = '#ef4444'
const PURPLE = '#7c3aed'

function formatDate(d) {
  if (!d) return 'Never'
  const date = new Date(d)
  const now   = new Date()
  const days  = Math.floor((now - date) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)   return `${days}d ago`
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

function formatJoined(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PlanBadge({ plan }) {
  const isPremium = plan === 'premium'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10, fontWeight: 800,
      padding: '2px 7px', borderRadius: 999,
      background: isPremium ? `${PURPLE}15` : '#f1f5f9',
      color: isPremium ? PURPLE : '#64748b',
      border: `1px solid ${isPremium ? `${PURPLE}40` : '#e2e8f0'}`,
    }}>
      {isPremium ? '⭐ Premium' : 'Free'}
    </span>
  )
}

function AccuracyBadge({ accuracy }) {
  if (accuracy == null) return <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>
  const color = accuracy >= 70 ? GREEN : accuracy >= 45 ? ORANGE : RED
  const bg    = accuracy >= 70 ? '#f0fdf4' : accuracy >= 45 ? '#fff7ed' : '#fef2f2'
  return (
    <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: bg, color }}>
      {accuracy}%
    </span>
  )
}

// Expanded detail panel shown below a row
function StudentDetail({ s, onClose, onDelete, deleting }) {
  const schoolDisplay = s.school_name || s.student_school_name || null
  return (
    <tr>
      <td colSpan={7} style={{ padding: 0, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {/* Identity */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Identity</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{s.full_name ?? '—'}</p>
            {s.username && <p style={{ fontSize: 11, color: '#64748b' }}>@{s.username}</p>}
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.email ?? '—'}</p>
            {s.phone_number && <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>📞 {s.phone_number}</p>}
          </div>

          {/* Exam & School */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Exam & School</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{s.exam_type ?? '—'}</p>
            {schoolDisplay ? (
              <p style={{ fontSize: 11, color: '#64748b' }}>🏫 {schoolDisplay}</p>
            ) : (
              <p style={{ fontSize: 11, color: '#cbd5e1' }}>No school linked</p>
            )}
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              Joined {formatJoined(s.created_at)}
            </p>
          </div>

          {/* Subjects */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Subjects</p>
            {s.subjects?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {s.subjects.map(sub => (
                  <span key={sub} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0' }}>{sub}</span>
                ))}
              </div>
            ) : <p style={{ fontSize: 11, color: '#cbd5e1' }}>None set</p>}
          </div>

          {/* Performance */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Performance</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b', width: 70 }}>XP total</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{(s.total_points ?? 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b', width: 70 }}>Accuracy</span>
                <AccuracyBadge accuracy={s.accuracy} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b', width: 70 }}>Streak</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: ORANGE }}>{s.streak > 0 ? `${s.streak}d 🔥` : '—'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b', width: 70 }}>Plan</span>
                <PlanBadge plan={s.plan} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Close
            </button>
            <button onClick={onDelete} disabled={deleting} style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid #fecaca', background: '#fef2f2', color: RED, fontSize: 12, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: deleting ? 0.6 : 1 }}>
              {deleting ? 'Deleting…' : '🗑 Delete student'}
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

function DeleteConfirmModal({ student, onConfirm, onCancel, deleting }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxWidth: 360, width: '100%', padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20 }}>🗑️</div>
          <p style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>Delete student?</p>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
            <strong style={{ color: '#374151' }}>{student.full_name ?? student.email}</strong> will be permanently removed — account, progress, all data. Cannot be undone.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} disabled={deleting} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: RED, color: '#fff', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: deleting ? 0.6 : 1 }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [students,    setStudents]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState('all')
  const [sortBy,      setSortBy]      = useState('joined')
  const [page,        setPage]        = useState(0)
  const [expanded,    setExpanded]    = useState(null)   // student id
  const [toDelete,    setToDelete]    = useState(null)
  const [deleting,    setDeleting]    = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const PER_PAGE = 50

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/users-list')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStudents(data.students ?? [])
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res  = await fetch(`/api/admin/users/${toDelete.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStudents(prev => prev.filter(s => s.id !== toDelete.id))
      setToDelete(null)
      setExpanded(null)
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const FILTERS = [
    { id: 'all',       label: 'All' },
    { id: 'active',    label: '🔥 Active' },
    { id: 'inactive',  label: 'Inactive' },
    { id: 'premium',   label: '⭐ Premium' },
    { id: 'no_school', label: 'No school' },
  ]

  const SORTS = [
    { id: 'joined',   label: 'Newest' },
    { id: 'name',     label: 'Name' },
    { id: 'xp',       label: 'XP' },
    { id: 'accuracy', label: 'Accuracy' },
    { id: 'streak',   label: 'Streak' },
  ]

  const filtered = students
    .filter(s => {
      if (filter === 'active')    return s.isActiveThisWeek
      if (filter === 'inactive')  return !s.isActiveThisWeek
      if (filter === 'premium')   return s.plan === 'premium'
      if (filter === 'no_school') return !s.school_name && !s.student_school_name
      return true
    })
    .filter(s => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        (s.full_name  ?? '').toLowerCase().includes(q) ||
        (s.username   ?? '').toLowerCase().includes(q) ||
        (s.email      ?? '').toLowerCase().includes(q) ||
        (s.phone_number ?? '').includes(q) ||
        (s.student_school_name ?? '').toLowerCase().includes(q) ||
        (s.school_name ?? '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'name')     return (a.full_name ?? '').localeCompare(b.full_name ?? '')
      if (sortBy === 'xp')       return (b.total_points ?? 0) - (a.total_points ?? 0)
      if (sortBy === 'accuracy') return (b.accuracy ?? -1) - (a.accuracy ?? -1)
      if (sortBy === 'streak')   return (b.streak ?? 0) - (a.streak ?? 0)
      return new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)
    })

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const pages = Math.ceil(filtered.length / PER_PAGE)

  const premiumCount = students.filter(s => s.plan === 'premium').length
  const activeCount  = students.filter(s => s.isActiveThisWeek).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${BLUE}`, borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, fontFamily: 'inherit' }}>
      <style>{`* { box-sizing: border-box } @keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {toDelete && (
        <DeleteConfirmModal
          student={toDelete}
          onConfirm={handleDelete}
          onCancel={() => { setToDelete(null); setDeleteError(null) }}
          deleting={deleting}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-.03em', marginBottom: 4 }}>Students</h1>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>{students.length.toLocaleString()} total</span>
          <span style={{ fontSize: 13, color: '#64748b' }}>·</span>
          <span style={{ fontSize: 13, color: ORANGE }}>{activeCount.toLocaleString()} active this week</span>
          <span style={{ fontSize: 13, color: '#64748b' }}>·</span>
          <span style={{ fontSize: 13, color: PURPLE }}>{premiumCount.toLocaleString()} premium</span>
        </div>
      </div>

      {deleteError && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, fontSize: 13, color: RED, marginBottom: 16 }}>
          Delete failed: {deleteError}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search by name, username, email, phone, school…"
          style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#0f172a' }}
        />
      </div>

      {/* Filters + Sort */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); setPage(0) }}
              style={{ padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1.5px solid ${filter === f.id ? BLUE : '#e2e8f0'}`, background: filter === f.id ? BLUE : '#fff', color: filter === f.id ? '#fff' : '#64748b', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Sort:</span>
          {SORTS.map(s => (
            <button key={s.id} onClick={() => setSortBy(s.id)}
              style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', background: sortBy === s.id ? '#f1f5f9' : 'transparent', color: sortBy === s.id ? '#0f172a' : '#94a3b8', cursor: 'pointer', fontFamily: 'inherit' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
        {filtered.length.toLocaleString()} student{filtered.length !== 1 ? 's' : ''}
        {search && ` matching "${search}"`}
      </p>

      {/* Table */}
      {students.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 10 }}>👥</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>No students yet</p>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Students will appear here once they sign up.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Student</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Plan</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>XP</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Accuracy</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Streak</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Last active</th>
                <th style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {paged.map(s => {
                const isExpanded = expanded === s.id
                const schoolDisplay = s.school_name || s.student_school_name
                return (
                  <>
                    <tr key={s.id}
                      onClick={() => setExpanded(isExpanded ? null : s.id)}
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid #f8fafc', cursor: 'pointer', background: isExpanded ? '#f8fafc' : 'transparent', transition: 'background .1s' }}>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, background: s.isActiveThisWeek ? '#dcfce7' : '#f1f5f9', color: s.isActiveThisWeek ? '#16a34a' : '#94a3b8' }}>
                            {(s.full_name ?? s.email ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{s.full_name ?? '—'}</p>
                            <p style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                              {s.username ? `@${s.username}` : s.email ?? ''}
                              {schoolDisplay ? ` · ${schoolDisplay}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <PlanBadge plan={s.plan} />
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{(s.total_points ?? 0).toLocaleString()}</span>
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                        <AccuracyBadge accuracy={s.accuracy} />
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ORANGE }}>{s.streak > 0 ? `${s.streak}d 🔥` : '—'}</span>
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(s.last_active)}</span>
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', opacity: .4 }}>
                          <path d="M2 5l5 5 5-5" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </td>
                    </tr>
                    {isExpanded && (
                      <StudentDetail
                        key={`detail-${s.id}`}
                        s={s}
                        onClose={() => setExpanded(null)}
                        onDelete={() => { setToDelete(s); setDeleteError(null) }}
                        deleting={deleting && toDelete?.id === s.id}
                      />
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 700, color: '#64748b', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1, fontFamily: 'inherit' }}>← Prev</button>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Page {page + 1} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
            style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 700, color: '#64748b', cursor: page >= pages - 1 ? 'default' : 'pointer', opacity: page >= pages - 1 ? 0.4 : 1, fontFamily: 'inherit' }}>Next →</button>
        </div>
      )}
    </div>
  )
}