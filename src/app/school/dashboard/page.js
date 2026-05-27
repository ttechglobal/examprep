'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'

function StatCard({ label, value, sub, color = 'indigo', icon }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700',
    green:  'bg-green-50 text-green-700',
    amber:  'bg-amber-50 text-amber-700',
    red:    'bg-red-50 text-red-700',
  }
  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-black">{value}</p>
          <p className="text-sm font-medium mt-0.5 opacity-80">{label}</p>
          {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
    </div>
  )
}

function EngagementBar({ data }) {
  const max = Math.max(...data.map(d => d.activeStudents), 1)
  return (
    <div className="flex items-end gap-3 h-28">
      {data.map((week, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-gray-700">{week.activeStudents}</span>
          <div className="w-full bg-gray-100 rounded-t-lg" style={{ height: '72px', display: 'flex', alignItems: 'flex-end' }}>
            <div
              className={`w-full rounded-t-lg transition-all duration-700 ${
                week.week === 0 ? 'bg-indigo-500' : 'bg-indigo-200'
              }`}
              style={{ height: `${Math.max(4, Math.round((week.activeStudents / max) * 100))}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 truncate w-full text-center">{week.label}</span>
        </div>
      ))}
    </div>
  )
}

function StudentRow({ student, rank }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-xs text-gray-300 w-5 flex-shrink-0 font-medium">{rank}</span>

        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-600 text-xs font-black">
            {student.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{student.full_name}</p>
          <p className="text-xs text-gray-400">
            {student.exam_type} · {student.subjects?.slice(0, 2).join(', ')}
            {student.subjects?.length > 2 && ` +${student.subjects.length - 2}`}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-sm font-black text-gray-800">{student.completedLessons}</p>
            <p className="text-xs text-gray-400">lessons</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-orange-500">
              {student.currentStreak > 0 ? `🔥${student.currentStreak}` : '—'}
            </p>
            <p className="text-xs text-gray-400">streak</p>
          </div>
          {student.avgCorrectRate !== null && (
            <div className="text-center">
              <p className={`text-sm font-black ${
                student.avgCorrectRate >= 70 ? 'text-green-600' :
                student.avgCorrectRate >= 40 ? 'text-yellow-600' : 'text-red-500'
              }`}>
                {student.avgCorrectRate}%
              </p>
              <p className="text-xs text-gray-400">accuracy</p>
            </div>
          )}
        </div>

        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:block ${
          student.isActiveThisWeek
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {student.isActiveThisWeek ? 'Active' : 'Inactive'}
        </span>

        <span className={`text-gray-300 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: student.completedLessons, label: 'Lessons done', color: 'text-gray-800' },
              {
                value: student.currentStreak,
                label: 'Day streak',
                color: 'text-orange-500',
              },
              {
                value: student.avgCorrectRate !== null ? `${student.avgCorrectRate}%` : '—',
                label: 'Avg accuracy',
                color: student.avgCorrectRate >= 70 ? 'text-green-600' :
                       student.avgCorrectRate >= 40 ? 'text-yellow-500' :
                       student.avgCorrectRate !== null ? 'text-red-500' : 'text-gray-300',
              },
              {
                value: student.lastActive
                  ? new Date(student.lastActive).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                  : 'Never',
                label: 'Last active',
                color: 'text-gray-600',
              },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl p-3 text-center">
                <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>

          {student.subjects?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {student.subjects.map(subject => {
                const color = getSubjectColor(subject)
                return (
                  <span key={subject} className={`text-xs px-2.5 py-1 rounded-full font-medium ${color.bg} ${color.text}`}>
                    {subject}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SchoolDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [data, setData] = useState(null)
  const [cohort, setCohort] = useState(null)
  const [cohortMembers, setCohortMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('overview')

  // Students tab state
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filterActive, setFilterActive] = useState('all')

  // Cohort tab state
  const [newCohortName, setNewCohortName] = useState('')
  const [newSession, setNewSession] = useState('')
  const [creatingCohort, setCreatingCohort] = useState(false)
  const [cohortMessage, setCohortMessage] = useState(null)

  // Reports tab state
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      Promise.all([
        fetch('/api/school/dashboard').then(r => r.json()),
        fetch('/api/school/cohort').then(r => r.json()),
      ]).then(([dashData, cohortData]) => {
        if (dashData.error) { setError(dashData.error); return }
        setData(dashData)
        setCohort(cohortData.cohort ?? null)
        setCohortMembers(cohortData.members ?? [])
      }).catch(() => setError('Failed to load dashboard'))
        .finally(() => setLoading(false))
    })
  }, [])

  const handleDownloadReport = async (period) => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/school/report?format=csv&period=${period}`)
      if (!res.ok) { alert('No data to download yet.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `school_report_${period}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed — try again')
    } finally {
      setDownloading(false)
    }
  }

  const handleCreateCohort = async () => {
    if (!newCohortName.trim()) return
    setCreatingCohort(true)
    setCohortMessage(null)
    try {
      const res = await fetch('/api/school/cohort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCohortName, session: newSession }),
      })
      const d = await res.json()
      if (d.cohort) {
        setCohort(d.cohort)
        setCohortMembers([])
        setNewCohortName('')
        setNewSession('')
        setCohortMessage({ type: 'success', text: 'New cohort created successfully!' })
      }
    } catch {
      setCohortMessage({ type: 'error', text: 'Failed to create cohort — try again' })
    } finally {
      setCreatingCohort(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading school data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-red-500 text-sm mb-2">{error}</p>
          <button onClick={() => window.location.reload()} className="text-indigo-600 text-sm hover:underline">
            Try again
          </button>
        </div>
      </div>
    )
  }

  const { students, subjectStats, weeklyEngagement, summary } = data

  const filteredStudents = students
    .filter(s => {
      const matchesSearch = !search ||
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.subjects?.some(sub => sub.toLowerCase().includes(search.toLowerCase()))
      const matchesFilter =
        filterActive === 'all' ||
        (filterActive === 'active' && s.isActiveThisWeek) ||
        (filterActive === 'inactive' && !s.isActiveThisWeek)
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      if (sortBy === 'name')     return (a.full_name ?? '').localeCompare(b.full_name ?? '')
      if (sortBy === 'lessons')  return b.completedLessons - a.completedLessons
      if (sortBy === 'streak')   return b.currentStreak - a.currentStreak
      if (sortBy === 'accuracy') return (b.avgCorrectRate ?? -1) - (a.avgCorrectRate ?? -1)
      return 0
    })

  const engagementRate = summary.totalStudents > 0
    ? Math.round((summary.activeThisWeek / summary.totalStudents) * 100) : 0

  const TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'students',  label: `Students (${summary.totalStudents})` },
    { id: 'subjects',  label: 'Subjects' },
    { id: 'cohort',    label: 'Cohort' },
    { id: 'reports',   label: 'Reports' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">School Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Track your students' progress and engagement</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl min-w-max">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total Students" value={summary.totalStudents} icon="👥" color="indigo" />
            <StatCard
              label="Active This Week"
              value={summary.activeThisWeek}
              sub={`${engagementRate}% engagement`}
              icon="🔥"
              color={engagementRate >= 60 ? 'green' : engagementRate >= 30 ? 'amber' : 'red'}
            />
            <StatCard
              label="Lessons This Week"
              value={summary.lessonsThisWeek}
              sub="across all students"
              icon="📚"
              color="indigo"
            />
          </div>

          <div className={`rounded-2xl p-4 ${
            engagementRate >= 60 ? 'bg-green-50 border border-green-200' :
            engagementRate >= 30 ? 'bg-amber-50 border border-amber-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm font-semibold ${
              engagementRate >= 60 ? 'text-green-800' :
              engagementRate >= 30 ? 'text-amber-800' : 'text-red-800'
            }`}>
              {engagementRate >= 60
                ? `🎉 Great engagement! ${summary.activeThisWeek} of ${summary.totalStudents} students studied this week.`
                : engagementRate >= 30
                ? `📢 ${summary.activeThisWeek} of ${summary.totalStudents} students active this week. Room to improve.`
                : `⚠️ Only ${summary.activeThisWeek} of ${summary.totalStudents} students active this week.`}
            </p>
          </div>

          {weeklyEngagement.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">Weekly Engagement</h3>
              <EngagementBar data={weeklyEngagement} />
              <p className="text-xs text-gray-400 text-center mt-3">Active students per week (last 4 weeks)</p>
            </div>
          )}

          {subjectStats.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-1">Subject Performance</h3>
              <p className="text-xs text-gray-400 mb-4">Based on practice question accuracy</p>
              <div className="space-y-3">
                {subjectStats.map(subject => (
                  <div key={subject.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{subject.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${
                          subject.correctRate >= 70 ? 'text-green-600' :
                          subject.correctRate >= 40 ? 'text-yellow-600' : 'text-red-500'
                        }`}>{subject.correctRate}%</span>
                        {subject.correctRate < 50 && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                            Needs attention
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div
                        className={`h-full rounded-full ${
                          subject.correctRate >= 70 ? 'bg-green-400' :
                          subject.correctRate >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${subject.correctRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setTab('students')}
            className="w-full flex items-center justify-between bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-4 hover:border-indigo-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">👤</span>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">View all students</p>
                <p className="text-xs text-gray-400">See individual progress and engagement</p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>
      )}

      {/* ── STUDENTS TAB ── */}
      {tab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students or subjects..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
            <div className="flex gap-2">
              <select
                value={filterActive}
                onChange={e => setFilterActive(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="all">All students</option>
                <option value="active">Active this week</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="name">Name</option>
                <option value="lessons">Lessons</option>
                <option value="streak">Streak</option>
                <option value="accuracy">Accuracy</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Showing {filteredStudents.length} of {students.length} students
          </p>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm">No students match your search.</p>
              </div>
            ) : (
              filteredStudents.map((student, i) => (
                <StudentRow key={student.id} student={student} rank={i + 1} />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── SUBJECTS TAB ── */}
      {tab === 'subjects' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Class-wide performance based on practice question accuracy.
          </p>

          {subjectStats.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-gray-500 text-sm">
                No practice data yet. Encourage students to take practice questions.
              </p>
            </div>
          ) : (
            subjectStats.map(subject => {
              const color = getSubjectColor(subject.name)
              const isWeak   = subject.correctRate < 50
              const isFair   = subject.correctRate >= 50 && subject.correctRate < 70
              const isStrong = subject.correctRate >= 70

              return (
                <div
                  key={subject.name}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                    isWeak ? 'border-red-200' : isFair ? 'border-yellow-200' : 'border-green-200'
                  }`}
                >
                  <div className={`px-5 py-4 ${color.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-black text-base ${color.text}`}>{subject.name}</h3>
                      <span className={`text-sm font-black ${
                        isStrong ? 'text-green-600' :
                        isFair   ? 'text-yellow-600' : 'text-red-500'
                      }`}>{subject.correctRate}%</span>
                    </div>
                    <div className="h-2.5 bg-white/60 rounded-full">
                      <div
                        className={`h-full rounded-full ${
                          isStrong ? 'bg-green-400' :
                          isFair   ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${subject.correctRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {subject.correct} correct out of {subject.total} attempts
                    </p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      isStrong ? 'bg-green-100 text-green-700' :
                      isFair   ? 'bg-yellow-100 text-yellow-700' :
                                 'bg-red-100 text-red-700'
                    }`}>
                      {isStrong ? '✓ Strong' : isFair ? '~ Fair' : '⚠ Weak'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

   {/* ── COHORT TAB ── */}
{tab === 'cohort' && (
  <div className="space-y-5">

    {cohortMessage && (
      <div className={`p-3 rounded-xl text-sm font-medium ${
        cohortMessage.type === 'success'
          ? 'bg-green-50 border border-green-200 text-green-800'
          : 'bg-red-50 border border-red-200 text-red-800'
      }`}>
        {cohortMessage.text}
      </div>
    )}

    {/* No cohort yet — welcoming empty state */}
    {!cohort && (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 text-center">
        <p className="text-4xl mb-3">👥</p>
        <h3 className="font-black text-gray-900 text-lg mb-1">Create your first cohort</h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          A cohort is a group of students — usually a class or set.
          Once created, you'll get an invite code to share with your students.
        </p>
      </div>
    )}

    {/* Active cohort card */}
    {cohort && (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-black text-gray-900 text-base">{cohort.name}</h3>
            {cohort.session && (
              <p className="text-xs text-gray-400 mt-0.5">{cohort.session}</p>
            )}
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 rounded-full">
            Active
          </span>
        </div>

        {/* Invite code */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">
            Student invite code
          </p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black text-indigo-700 tracking-[0.3em]">
              {cohort.invite_code}
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(cohort.invite_code)}
              className="text-xs font-bold text-indigo-600 hover:underline px-3 py-1.5 bg-white rounded-lg border border-indigo-200"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-indigo-500 mt-2">
            Students enter this in ExamPrep → Community → Join School
          </p>
        </div>

        {/* Members */}
        <div>
          <p className="text-sm font-bold text-gray-700 mb-3">
            {cohortMembers.length} student{cohortMembers.length !== 1 ? 's' : ''} joined
          </p>
          {cohortMembers.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <p className="text-2xl mb-2">👋</p>
              <p className="text-sm text-gray-500">No students yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Share the invite code above with your students.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {cohortMembers.map(member => (
                <div
                  key={member.student_id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-black text-indigo-600">
                      {member.profiles?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {member.profiles?.full_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {member.profiles?.exam_type} · Joined{' '}
                      {new Date(member.joined_at).toLocaleDateString('en', {
                        month: 'short', day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

    {/* Create / new cohort form */}
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-900 mb-1">
        {cohort ? 'Start a new cohort' : 'Set up your cohort'}
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        {cohort
          ? 'Starting a new cohort archives the current one.'
          : 'Name your cohort and share the invite code with your students.'}
      </p>

      {cohort && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4">
          <p className="text-xs text-amber-700 font-medium">
            ⚠️ "{cohort.name}" will be archived. Existing student data is preserved.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <input
          type="text"
          value={newCohortName}
          onChange={e => setNewCohortName(e.target.value)}
          placeholder="Cohort name (e.g. SS3 Science 2026)"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <input
          type="text"
          value={newSession}
          onChange={e => setNewSession(e.target.value)}
          placeholder="Session (e.g. 2025/2026)"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={handleCreateCohort}
          disabled={creatingCohort || !newCohortName.trim()}
          className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-50 hover:bg-indigo-500 transition-colors"
        >
          {creatingCohort
            ? 'Creating...'
            : cohort ? 'Archive current & create new →' : 'Create cohort →'}
        </button>
      </div>
    </div>

  </div>
)}

      {/* ── REPORTS TAB ── */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Download student progress reports as CSV. Open in Excel or Google Sheets.
          </p>

          {[
            { period: 'week',  label: 'Weekly report',  sub: 'Activity from the last 7 days',  icon: '📅' },
            { period: 'month', label: 'Monthly report', sub: 'Activity from the last 30 days', icon: '📊' },
          ].map(report => (
            <div
              key={report.period}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{report.icon}</span>
                <div>
                  <p className="font-bold text-gray-900">{report.label}</p>
                  <p className="text-xs text-gray-400">{report.sub}</p>
                </div>
              </div>
              <button
                onClick={() => handleDownloadReport(report.period)}
                disabled={downloading}
                className="px-4 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <span>⬇</span>
                {downloading ? 'Downloading...' : 'Download CSV'}
              </button>
            </div>
          ))}

          <div className="bg-gray-50 rounded-xl p-4 space-y-1">
            <p className="text-xs font-bold text-gray-600">What's included in each report:</p>
            <ul className="text-xs text-gray-500 space-y-0.5">
              <li>· Student name, exam type, subjects</li>
              <li>· Lessons completed in the period</li>
              <li>· Questions attempted and accuracy %</li>
              <li>· Current streak and last active date</li>
              <li>· Date joined ExamPrep</li>
            </ul>
          </div>
        </div>
      )}

    </div>
  )
}