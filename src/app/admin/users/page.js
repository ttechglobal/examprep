'use client'
// src/app/admin/users/page.js
// Student management — search, filter, sort, delete.

import { useState, useEffect, useCallback } from 'react'

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

function DeleteConfirmModal({ student, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">🗑️</span>
          </div>
          <h2 className="text-base font-black text-gray-900 mb-1">Delete student?</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            <span className="font-bold text-gray-700">{student.full_name ?? student.email}</span> will be permanently removed — their account, progress, and all data. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 text-sm font-bold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-500 disabled:opacity-50 transition-colors"
          >
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
  const [toDelete,    setToDelete]    = useState(null)   // student object
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
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const filtered = students
    .filter(s => {
      if (filter === 'active')    return s.isActiveThisWeek
      if (filter === 'inactive')  return !s.isActiveThisWeek
      if (filter === 'no_school') return !s.school_name
      return true
    })
    .filter(s =>
      !search ||
      (s.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name')     return (a.full_name ?? '').localeCompare(b.full_name ?? '')
      if (sortBy === 'accuracy') return (b.accuracy ?? -1) - (a.accuracy ?? -1)
      if (sortBy === 'streak')   return (b.streak ?? 0) - (a.streak ?? 0)
      return new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)
    })

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const pages = Math.ceil(filtered.length / PER_PAGE)

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      {toDelete && (
        <DeleteConfirmModal
          student={toDelete}
          onConfirm={handleDelete}
          onCancel={() => { setToDelete(null); setDeleteError(null) }}
          deleting={deleting}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length.toLocaleString()} student{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {deleteError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Delete failed: {deleteError}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search by name or email…"
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="flex gap-2">
          {[
            { id: 'all',       l: 'All' },
            { id: 'active',    l: '🔥 Active' },
            { id: 'inactive',  l: 'Inactive' },
            { id: 'no_school', l: 'No school' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(0) }}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors flex-shrink-0 ${
                filter === f.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Sort:</span>
        {[
          { id: 'joined',   l: 'Newest' },
          { id: 'name',     l: 'Name' },
          { id: 'accuracy', l: 'Accuracy' },
          { id: 'streak',   l: 'Streak' },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setSortBy(s.id)}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
              sortBy === s.id ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            {s.l}
          </button>
        ))}
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-base font-black text-gray-900 mb-1">No students yet</p>
          <p className="text-sm text-gray-400">Students will appear here once they sign up.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">Student</th>
                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide hidden sm:table-cell">Subjects</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">Accuracy</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide hidden md:table-cell">Streak</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last active</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(s => (
                <tr key={s.id} className="group hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                        s.isActiveThisWeek ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {(s.full_name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{s.full_name ?? '—'}</p>
                        {s.exam_type && (
                          <p className="text-xs text-gray-400">
                            {s.exam_type}{s.school_name ? ` · ${s.school_name}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-xs text-gray-500">{(s.subjects ?? []).slice(0, 3).join(', ') || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.accuracy !== null ? (
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        s.accuracy >= 70 ? 'bg-emerald-50 text-emerald-700' :
                        s.accuracy >= 45 ? 'bg-amber-50 text-amber-700' :
                                           'bg-red-50 text-red-600'
                      }`}>
                        {s.accuracy}%
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className="text-sm font-bold text-orange-500">
                      {s.streak > 0 ? `${s.streak}d 🔥` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    <span className="text-xs text-gray-400">{formatDate(s.last_active)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setToDelete(s); setDeleteError(null) }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="Delete student"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm font-bold rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >←</button>
          <span className="text-sm text-gray-600">Page {page + 1} of {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
            disabled={page >= pages - 1}
            className="px-3 py-1.5 text-sm font-bold rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >→</button>
        </div>
      )}
    </div>
  )
}