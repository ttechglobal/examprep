'use client'
// src/app/admin/schools/page.js
// School management — list all partner schools, student counts, cohort status.
// Admin can create schools, view details, see which have active cohorts.

import { useState, useEffect } from 'react'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminSchoolsPage() {
  const [schools,  setSchools]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')
  const [creating, setCreating] = useState(false)
  const [form,     setForm]     = useState({ name: '', city: '', state: '' })
  const [saving,   setSaving]   = useState(false)
  const [formErr,  setFormErr]  = useState(null)

  useEffect(() => {
    fetch('/api/admin/schools')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setSchools(d.schools ?? []); setLoading(false) })
      .catch(() => { setError('Failed to load schools'); setLoading(false) })
  }, [])

  async function createSchool() {
    if (!form.name.trim()) return
    setSaving(true); setFormErr(null)
    const res  = await fetch('/api/admin/schools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.error) { setFormErr(data.error); setSaving(false); return }
    setSchools(prev => [{ ...data.school, studentCount: 0, cohortCount: 0, activeCohort: false }, ...prev])
    setCreating(false); setForm({ name: '', city: '', state: '' })
    setSaving(false)
  }

  const filtered = schools.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center py-24 text-center">
      <div><p className="text-3xl mb-3">⚠️</p><p className="text-sm font-bold text-gray-700">{error}</p></div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Schools</h1>
          <p className="text-sm text-gray-500 mt-0.5">{schools.length} partner school{schools.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setCreating(c => !c)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors">
          + Add school
        </button>
      </div>

      {/* Create school form */}
      {creating && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <p className="font-black text-gray-900">New partner school</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="School name *"
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white" />
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City"
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white" />
            <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="State (e.g. Lagos)"
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white" />
          </div>
          {formErr && <p className="text-xs text-red-600">{formErr}</p>}
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="px-4 py-2 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={createSchool} disabled={saving || !form.name.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition-colors">
              {saving ? 'Creating…' : 'Create school →'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search schools…"
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />

      {/* Schools table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🏫</p>
            <p className="text-sm font-bold text-gray-700">{search ? 'No schools match' : 'No schools yet'}</p>
            {!search && <p className="text-xs text-gray-400 mt-1">Add partner schools to track their students.</p>}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">School</th>
                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide hidden sm:table-cell">Location</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">Students</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide hidden sm:table-cell">Cohorts</th>
                <th className="text-center px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide hidden md:table-cell">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(school => (
                <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-base flex-shrink-0">🏫</div>
                      <p className="text-sm font-bold text-gray-900">{school.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <p className="text-xs text-gray-500">{[school.city, school.state].filter(Boolean).join(', ') || '—'}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <p className="text-sm font-bold text-gray-900">{school.studentCount.toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                    <p className="text-sm text-gray-600">{school.cohortCount}</p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {school.activeCohort ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">No cohort</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right hidden md:table-cell">
                    <p className="text-xs text-gray-400">{formatDate(school.created_at)}</p>
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