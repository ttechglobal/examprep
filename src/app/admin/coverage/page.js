'use client'
// src/app/admin/coverage/page.js
// Question bank coverage register — subject × year matrix.
// Shows every subject as a row, every year as a column.
// Switch between WAEC / JAMB / NECO / IGCSE / ALL at the top.
// Click any missing cell to go straight to the import page for that combo.

import { useState, useEffect } from 'react'
import Link from 'next/link'

const EXAM_TYPES = ['WAEC', 'JAMB', 'NECO', 'IGCSE', 'ALL']

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  )
}

// ── Cell colour based on question count ──────────────────────────────────────
function cellStyle(count) {
  if (count >= 40) return { bg: 'bg-green-600 text-white', label: String(count) }
  if (count >= 20) return { bg: 'bg-green-500 text-white', label: String(count) }
  if (count >= 10) return { bg: 'bg-green-200 text-green-800', label: String(count) }
  if (count >= 1)  return { bg: 'bg-amber-100 text-amber-800', label: String(count) }
  return { bg: '', label: '+' }
}

// ── Summary card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 min-w-[110px]">
      <p className={`text-xl font-black tabular-nums ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{label}</p>
    </div>
  )
}

export default function CoveragePage() {
  const [examType, setExamType] = useState('WAEC')
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [showAll,  setShowAll]  = useState(false)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/admin/questions/coverage-matrix?examType=${examType}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [examType])

  // Filter subjects by search
  const allSubjects = data?.subjects ?? []
  const filtered    = search.trim()
    ? allSubjects.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : allSubjects
  const displayed   = showAll ? filtered : filtered.slice(0, 15)

  const { years = [], matrix = {} } = data ?? {}

  // Summary stats (over all subjects, not just visible)
  const totalQ     = allSubjects.reduce((a, s) => a + s.totalQuestions, 0)
  const withData   = allSubjects.filter(s => s.totalQuestions > 0).length
  const missing    = allSubjects.filter(s => s.totalQuestions === 0).length
  const filledCells = allSubjects.reduce((a, s) => {
    return a + Object.values(matrix[s.id] ?? {}).filter(c => c > 0).length
  }, 0)
  const totalCells = allSubjects.length * years.length
  const pct = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Question Coverage</h1>
          <p className="text-sm text-gray-400 mt-1">
            See exactly which years you've imported for each subject. Click any missing cell to import.
          </p>
        </div>
        <Link
          href="/admin/questions/import"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors shadow-sm"
        >
          ⬆ Import questions
        </Link>
      </div>

      {/* ── Exam type switcher ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {EXAM_TYPES.map(et => (
            <button
              key={et}
              onClick={() => { setExamType(et); setShowAll(false); setSearch('') }}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
                examType === et
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {et}
            </button>
          ))}
        </div>
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter subjects…"
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
        />
      </div>

      {/* ── Loading / Error ──────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Spinner />
            <p className="text-sm text-gray-400">Loading {examType} coverage…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700">
          ✗ {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* ── Summary stats ────────────────────────────────────────── */}
          <div className="flex gap-3 flex-wrap">
            <StatCard label="Total questions" value={totalQ.toLocaleString()} color="text-indigo-700" />
            <StatCard label="Subjects with data" value={`${withData} / ${allSubjects.length}`} color="text-green-700" />
            <StatCard label="Subjects empty" value={missing} color={missing > 0 ? 'text-red-500' : 'text-gray-400'} />
            <StatCard label="Year slots filled" value={`${pct}%`} color={pct > 50 ? 'text-green-700' : 'text-amber-700'} />
            <StatCard label="Years tracked" value={years.length} />
          </div>

          {/* ── Legend ───────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
            <span className="font-bold text-gray-600">Legend:</span>
            {[
              { bg: 'bg-green-600', label: '40+ questions' },
              { bg: 'bg-green-500', label: '20–39' },
              { bg: 'bg-green-200', label: '10–19' },
              { bg: 'bg-amber-100 border border-amber-200', label: '1–9' },
              { bg: 'bg-white border border-dashed border-gray-300', label: 'Empty (click to import)' },
            ].map(({ bg, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`w-4 h-4 rounded ${bg} inline-block flex-shrink-0`} />
                {label}
              </span>
            ))}
          </div>

          {/* ── No results ───────────────────────────────────────────── */}
          {allSubjects.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center space-y-3">
              <p className="text-gray-400 text-sm">No {examType} subjects found.</p>
              <Link href="/admin/subjects-manager" className="text-indigo-600 text-sm font-bold hover:underline">
                Add subjects in Subjects Manager →
              </Link>
            </div>
          )}

          {/* ── Matrix table ──────────────────────────────────────────── */}
          {allSubjects.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {/* Subject header */}
                      <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-3 font-black text-gray-600 whitespace-nowrap border-r border-gray-100 min-w-[170px]">
                        Subject
                      </th>
                      {/* Totals column */}
                      <th className="px-3 py-3 font-black text-gray-500 text-center border-r border-gray-100 whitespace-nowrap bg-gray-50 min-w-[60px]">
                        Total
                      </th>
                      <th className="px-3 py-3 font-black text-gray-500 text-center border-r border-gray-100 whitespace-nowrap bg-gray-50 min-w-[55px]">
                        Years
                      </th>
                      {/* Year columns */}
                      {years.map(y => (
                        <th key={y} className="px-1 py-3 font-bold text-gray-400 text-center min-w-[44px] whitespace-nowrap">
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayed.length === 0 && (
                      <tr>
                        <td colSpan={years.length + 3} className="text-center text-gray-400 py-8 text-sm">
                          No subjects match &quot;{search}&quot;
                        </td>
                      </tr>
                    )}
                    {displayed.map((s, i) => {
                      const counts    = matrix[s.id] ?? {}
                      const rowBg     = i % 2 === 0 ? '#fff' : '#fafafa'
                      return (
                        <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors group">
                          {/* Subject name — sticky */}
                          <td
                            className="sticky left-0 z-10 px-4 py-2.5 border-r border-gray-100 whitespace-nowrap"
                            style={{ background: rowBg }}
                          >
                            <span className="font-bold text-gray-800">{s.name}</span>
                            {examType === 'ALL' && (
                              <span className="ml-2 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                {s.exam_type}
                              </span>
                            )}
                          </td>
                          {/* Total questions */}
                          <td className="px-3 py-2.5 text-center border-r border-gray-100 whitespace-nowrap">
                            <span className={`font-black tabular-nums ${s.totalQuestions > 0 ? 'text-indigo-700' : 'text-gray-200'}`}>
                              {s.totalQuestions > 0 ? s.totalQuestions.toLocaleString() : '—'}
                            </span>
                          </td>
                          {/* Years covered */}
                          <td className="px-3 py-2.5 text-center border-r border-gray-100 whitespace-nowrap">
                            <span className={`font-bold tabular-nums ${s.yearsCovered > 0 ? 'text-green-700' : 'text-gray-200'}`}>
                              {s.yearsCovered > 0 ? `${s.yearsCovered}y` : '—'}
                            </span>
                          </td>
                          {/* Year cells */}
                          {years.map(y => {
                            const count  = counts[y] ?? 0
                            const { bg, label } = cellStyle(count)
                            return (
                              <td key={y} className="px-1 py-1.5 text-center">
                                <Link
                                  href={`/admin/questions/import?subject=${encodeURIComponent(s.name)}&examType=${s.exam_type}&year=${y}`}
                                  title={count > 0
                                    ? `${s.name} ${s.exam_type} ${y} — ${count} questions`
                                    : `Import ${s.name} ${s.exam_type} ${y}`
                                  }
                                  className={`flex items-center justify-center w-9 h-7 rounded-lg mx-auto font-bold transition-all ${
                                    count > 0
                                      ? `${bg} hover:opacity-75`
                                      : 'text-gray-200 border border-dashed border-gray-200 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50'
                                  }`}
                                >
                                  {label}
                                </Link>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Show more / less */}
              {filtered.length > 15 && (
                <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50/50">
                  <p className="text-xs text-gray-400">
                    Showing {displayed.length} of {filtered.length} subjects
                  </p>
                  <button
                    onClick={() => setShowAll(v => !v)}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    {showAll ? '↑ Show fewer' : `↓ Show all ${filtered.length}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}