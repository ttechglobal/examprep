'use client'
// src/app/admin/schools/page.js
// Lists all partner schools registered via the school registration portal.
// Schools are never created manually here — they register themselves.
// Click any row to view the full school profile.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const BLUE  = '#1264E5'
const GREEN = '#10b981'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminSchoolsPage() {
  const router              = useRouter()
  const [schools,  setSchools]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/schools')
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to load schools')
      setSchools(data.schools ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = schools.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.name?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.state?.toLowerCase().includes(q) ||
      s.admin_name?.toLowerCase().includes(q) ||
      s.admin_email?.toLowerCase().includes(q)
    )
  })

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
      <button onClick={load} style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button>
    </div>
  )

  return (
    <div style={{ maxWidth: 1000, fontFamily: 'inherit' }}>
      <style>{`* { box-sizing: border-box }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-.03em', marginBottom: 4 }}>Schools</h1>
        <p style={{ fontSize: 13, color: '#64748b' }}>
          {schools.length} partner school{schools.length !== 1 ? 's' : ''} registered via the school portal
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by school name, city, state, admin…"
          style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#0f172a' }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>🏫</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
              {search ? 'No schools match that search' : 'No schools registered yet'}
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>
              Schools appear here when they register via the school registration portal.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>School</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Admin</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Location</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Students</th>
                <th style={{ textAlign: 'center', padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Registered</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((school, i) => (
                <tr
                  key={school.id}
                  onClick={() => router.push(`/admin/schools/${school.id}`)}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                    cursor: 'pointer',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* School name */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                        🏫
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{school.name}</p>
                        {school.slots_purchased != null && (
                          <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                            {school.slots_used ?? 0}/{school.slots_purchased} slots used
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Admin */}
                  <td style={{ padding: '12px 16px' }}>
                    {school.admin_name ? (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{school.admin_name}</p>
                        {school.admin_email && (
                          <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{school.admin_email}</p>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: '#cbd5e1' }}>—</p>
                    )}
                  </td>

                  {/* Location */}
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ fontSize: 12, color: '#64748b' }}>
                      {[school.city, school.state].filter(Boolean).join(', ') || '—'}
                    </p>
                  </td>

                  {/* Students */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{(school.studentCount ?? 0).toLocaleString()}</span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {school.activeCohort ? (
                      <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 999, fontSize: 10, fontWeight: 800, background: '#f0fdf4', color: GREEN, border: '1px solid #bbf7d0' }}>Active</span>
                    ) : (
                      <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 999, fontSize: 10, fontWeight: 800, background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }}>No cohort</span>
                    )}
                  </td>

                  {/* Registered */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(school.created_at)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}