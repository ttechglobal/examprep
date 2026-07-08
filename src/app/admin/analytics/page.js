'use client'
// src/app/admin/analytics/page.js
// Platform-wide analytics — student growth, daily activity, subject usage.

import { useState, useEffect } from 'react'
import Link from 'next/link'

function StatCard({ label, value, sub, icon, color = '#4f46e5' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900">{value ?? '—'}</p>
      <p className="text-xs font-bold text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function MiniBar({ label, count, max, color }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-700 w-32 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .7s' }} />
      </div>
      <span className="text-xs font-black text-gray-700 w-12 text-right">{count.toLocaleString()}</span>
    </div>
  )
}

function SparkBars({ data, color }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-0.5 h-16">
      {data.map((d, i) => {
        const h = Math.max(2, Math.round((d.count / max) * 52))
        const isToday = i === data.length - 1
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center" title={`${d.date}: ${d.count}`}>
            <div style={{ width: '100%', height: h, background: isToday ? color : `${color}55`, borderRadius: '2px 2px 0 0', transition: 'height .5s' }} />
          </div>
        )
      })}
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [period,  setPeriod]  = useState('14d')

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load analytics'); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center py-24 text-center">
      <div>
        <p className="text-3xl mb-3">⚠️</p>
        <p className="text-sm font-bold text-gray-700">{error}</p>
      </div>
    </div>
  )

  const { summary, dailyAttempts, subjectBreakdown, newStudents } = data
  const maxSubject = Math.max(...(subjectBreakdown ?? []).map(s => s.count), 1)

  const SUBJECT_COLORS = {
    'Chemistry':'#10b981','Physics':'#06b6d4','Biology':'#059669',
    'Mathematics':'#3b82f6','English Language':'#8b5cf6',
    'Economics':'#f59e0b','Government':'#ef4444','Geography':'#14b8a6',
  }

  return (
    <div className="space-y-8 max-w-5xl">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Platform Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Student activity and content usage across ExamPrep</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon="👥" label="Total Students"    value={summary.totalStudents.toLocaleString()}  color="#4f46e5" />
        <StatCard icon="🔥" label="Active This Week"  value={summary.activeWeek.toLocaleString()}      sub={`${summary.weeklyActRate}% of all students`} color="#f97316" />
        <StatCard icon="📅" label="Active This Month" value={summary.activeMonth.toLocaleString()}     color="#059669" />
        <StatCard icon="❓" label="Total Questions"   value={summary.totalQuestions.toLocaleString()}  color="#7c3aed" />
        <StatCard icon="✍️" label="Total Attempts"    value={summary.totalAttempts.toLocaleString()}   color="#0369a1" />
        <StatCard icon="✅" label="Published Lessons" value={summary.totalLessons.toLocaleString()}    color="#059669" />
      </div>

      {/* Daily activity sparkline */}
      {dailyAttempts?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-black text-gray-900">Daily question attempts</p>
              <p className="text-xs text-gray-400 mt-0.5">Last 14 days</p>
            </div>
            <p className="text-xl font-black text-indigo-600">{dailyAttempts.reduce((a, d) => a + d.count, 0).toLocaleString()} total</p>
          </div>
          <SparkBars data={dailyAttempts} color="#4f46e5" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-gray-400">{dailyAttempts[0]?.date}</span>
            <span className="text-[10px] text-gray-400">Today</span>
          </div>
        </div>
      )}

      {/* New students trend */}
      {newStudents?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-black text-gray-900">New student signups</p>
              <p className="text-xs text-gray-400 mt-0.5">Last 30 days</p>
            </div>
            <p className="text-xl font-black text-emerald-600">{newStudents.reduce((a, d) => a + d.count, 0).toLocaleString()} new</p>
          </div>
          <SparkBars data={newStudents} color="#059669" />
        </div>
      )}

      {/* Subject breakdown */}
      {subjectBreakdown?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm font-black text-gray-900 mb-4">Subject activity — last 30 days</p>
          <div className="space-y-3">
            {subjectBreakdown.map(s => (
              <MiniBar
                key={s.name}
                label={s.name}
                count={s.count}
                max={maxSubject}
                color={SUBJECT_COLORS[s.name] ?? '#6366f1'}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}