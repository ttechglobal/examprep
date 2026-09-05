'use client'
// src/app/admin/early-access-leads/page.js
// Lists all early access form submissions.
// Protected by admin session cookie (same as all other admin pages).

import { useState, useEffect } from 'react'

const ROLE_LABELS = {
  school_owner:  'School Owner',
  principal:     'Principal / Head Teacher',
  administrator: 'Administrator',
  teacher:       'Teacher',
}

const DIGITAL_LABELS = {
  yes_actively:  'Yes — regularly',
  yes_sometimes: 'Yes — occasionally',
  no:            'No',
}

const CHALLENGE_LABELS = {
  coverage:    'Covering enough topics',
  engagement:  'Keeping students motivated',
  weak_areas:  'Identifying weak areas',
  practice:    'Lack of practice questions',
  progress:    'Tracking student progress',
  resources:   'Limited resources / time',
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EarlyAccessLeadsPage() {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetch('/api/admin/early-access-leads')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setLeads(d.leads ?? [])
        setLoading(false)
      })
      .catch(() => { setError('Failed to load leads'); setLoading(false) })
  }, [])

  const filtered = leads.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      l.school_name?.toLowerCase().includes(q) ||
      l.full_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q)
    )
  })

  function downloadCSV() {
    const headers = ['Full Name', 'School', 'Role', 'Phone', 'Email', 'Uses Digital Tools', 'Biggest Challenge', 'Submitted At']
    const rows = leads.map(l => [
      l.full_name,
      l.school_name,
      ROLE_LABELS[l.role] ?? l.role,
      l.phone ?? '',
      l.email,
      DIGITAL_LABELS[l.uses_digital_tools] ?? l.uses_digital_tools ?? '',
      CHALLENGE_LABELS[l.biggest_challenge] ?? l.biggest_challenge ?? '',
      formatDate(l.created_at),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a   = document.createElement('a')
    a.href    = url
    a.download = `early-access-leads-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-primary">Early Access Leads</h1>
          <p className="text-secondary text-sm mt-0.5">Schools that signed up for early access</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="text"
            placeholder="Search by school, name, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-subtle rounded-lg px-3 py-2 text-sm bg-base text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ minWidth: 220 }}
          />
          <button
            onClick={downloadCSV}
            disabled={leads.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total leads', value: leads.length },
          { label: 'This week', value: leads.filter(l => {
            const d = new Date(l.created_at)
            const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
            return d >= cutoff
          }).length },
          { label: 'School owners', value: leads.filter(l => l.role === 'school_owner').length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-subtle rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-primary">{value}</div>
            <div className="text-xs text-secondary mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-secondary">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-1 text-secondary/60">Make sure the <code>early_access_leads</code> table exists in Supabase.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-secondary">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-sm">{search ? 'No leads match your search.' : 'No leads yet. Share the early access link to start collecting interest.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => (
            <div key={lead.id} className="bg-card border border-subtle rounded-xl overflow-hidden">
              {/* Row */}
              <button
                onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-subtle/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-primary">{lead.school_name}</span>
                    <span className="text-xs text-secondary bg-subtle px-2 py-0.5 rounded-full">
                      {ROLE_LABELS[lead.role] ?? lead.role}
                    </span>
                  </div>
                  <div className="text-xs text-secondary mt-0.5">{lead.full_name} · {lead.email}</div>
                </div>
                <div className="text-xs text-secondary shrink-0 hidden sm:block">{formatDate(lead.created_at)}</div>
                <svg
                  className={`w-4 h-4 text-secondary shrink-0 transition-transform ${expanded === lead.id ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded detail */}
              {expanded === lead.id && (
                <div className="px-5 pb-5 pt-1 border-t border-subtle grid grid-cols-2 gap-x-8 gap-y-3">
                  <Detail label="Phone" value={lead.phone || '—'} />
                  <Detail label="Email" value={lead.email} link={`mailto:${lead.email}`} />
                  <Detail label="Uses digital tools" value={DIGITAL_LABELS[lead.uses_digital_tools] ?? lead.uses_digital_tools ?? '—'} />
                  <Detail label="Biggest challenge" value={CHALLENGE_LABELS[lead.biggest_challenge] ?? lead.biggest_challenge ?? '—'} />
                  <Detail label="Submitted" value={formatDate(lead.created_at)} fullWidth />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value, link, fullWidth }) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <div className="text-xs text-secondary mb-0.5">{label}</div>
      {link ? (
        <a href={link} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{value}</a>
      ) : (
        <div className="text-sm font-medium text-primary">{value}</div>
      )}
    </div>
  )
}
