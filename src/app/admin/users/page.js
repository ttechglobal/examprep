'use client'
// src/app/admin/users/page.js
// Student management — search, filter, view per-student stats.

import { useState, useEffect } from 'react'

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

export default function AdminUsersPage() {
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [sortBy,   setSortBy]   = useState('joined')
  const [page,     setPage]     = useState(0)
  const PER_PAGE = 50

  useEffect(() => {
    // Use supabase directly for student listing — no dedicated API needed
    async function load() {
      try {
        const res  = await fetch('/api/admin/analytics') // reuse analytics for count
        const data = await res.json()
        // Fetch students separately
        const res2  = await fetch('/api/admin/users-list')
        const data2 = await res2.json()
        if (data2.error) throw new Error(data2.error)
        setStudents(data2.students ?? [])
        setLoading(false)
      } catch (err) {
        // Graceful: show an empty state with explanation
        setStudents([])
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = students
    .filter(s => {
      if (filter === 'active')   return s.isActiveThisWeek
      if (filter === 'inactive') return !s.isActiveThisWeek
      if (filter === 'no_school') return !s.school_name
      return true
    })
    .filter(s => !search || (s.full_name ?? '').toLowerCase().includes(search.toLowerCase()) || (s.email ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name')     return (a.full_name ?? '').localeCompare(b.full_name ?? '')
      if (sortBy === 'accuracy') return (b.accuracy ?? -1) - (a.accuracy ?? -1)
      if (sortBy === 'streak')   return (b.streak ?? 0) - (a.streak ?? 0)
      // Default: joined (newest first)
      return new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)
    })

  const paged  = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const pages  = Math.ceil(filtered.length / PER_PAGE)

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // If the API endpoint doesn't exist yet, show a useful message
  if (students.length === 0 && !loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">All student accounts</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-3xl mb-4">👥</p>
          <p className="text-base font-black text-gray-900 mb-2">Student list</p>
          <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
            Student management requires the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/api/admin/users-list</code> endpoint.
            It should return a list of student profiles with accuracy and streak data from <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">profiles</code>, <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">question_attempts</code>, and <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">student_streaks</code>.
          </p>
          <p className="text-xs text-gray-400 mt-4">Use the Supabase dashboard or school-level views to manage individual students for now.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length.toLocaleString()} student{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} placeholder="Search by name or email…"
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <div className="flex gap-2">
          {[{ id: 'all', l: 'All' }, { id: 'active', l: '🔥 Active' }, { id: 'inactive', l: 'Inactive' }].map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); setPage(0) }}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors flex-shrink-0 ${filter === f.id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Sort:</span>
        {[{ id: 'joined', l: 'Newest' }, { id: 'name', l: 'Name' }, { id: 'accuracy', l: 'Accuracy' }, { id: 'streak', l: 'Streak' }].map(s => (
          <button key={s.id} onClick={() => setSortBy(s.id)}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${sortBy === s.id ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}>
            {s.l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">Student</th>
              <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide hidden sm:table-cell">Subjects</th>
              <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">Accuracy</th>
              <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide hidden md:table-cell">Streak</th>
              <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${s.isActiveThisWeek ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {(s.full_name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{s.full_name ?? '—'}</p>
                      {s.exam_type && <p className="text-xs text-gray-400">{s.exam_type}{s.school_name ? ` · ${s.school_name}` : ''}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <p className="text-xs text-gray-500">{(s.subjects ?? []).slice(0, 3).join(', ') || '—'}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  {s.accuracy !== null ? (
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${s.accuracy >= 70 ? 'bg-emerald-50 text-emerald-700' : s.accuracy >= 45 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                      {s.accuracy}%
                    </span>
                  ) : <span className="text-xs text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className="text-sm font-bold text-orange-500">{s.streak > 0 ? `${s.streak}d 🔥` : '—'}</span>
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  <span className="text-xs text-gray-400">{formatDate(s.last_active)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 text-sm font-bold rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50">←</button>
          <span className="text-sm text-gray-600">Page {page + 1} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
            className="px-3 py-1.5 text-sm font-bold rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50">→</button>
        </div>
      )}
    </div>
  )
}