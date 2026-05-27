'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function LeaderboardRow({ entry, currentUserId, rank }) {
  const isMe = entry.student_id === currentUserId
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors ${
      isMe
        ? 'bg-indigo-50 border-2 border-indigo-200'
        : 'bg-white border border-gray-100'
    }`}>
      {/* Rank */}
      <div className="w-8 text-center flex-shrink-0">
        {medals[rank] ? (
          <span className="text-xl">{medals[rank]}</span>
        ) : (
          <span className="text-sm font-black text-gray-400">{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        isMe ? 'bg-indigo-200' : 'bg-gray-100'
      }`}>
        <span className={`text-sm font-black ${isMe ? 'text-indigo-700' : 'text-gray-500'}`}>
          {entry.full_name?.charAt(0)?.toUpperCase() ?? '?'}
        </span>
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${isMe ? 'text-indigo-800' : 'text-gray-800'}`}>
          {isMe ? 'You' : entry.full_name}
        </p>
        <p className="text-xs text-gray-400">
          {entry.lessons_completed} lessons · {entry.questions_attempted} questions
        </p>
      </div>

      {/* Score */}
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-black ${
          rank <= 3 ? 'text-indigo-600' : isMe ? 'text-indigo-500' : 'text-gray-600'
        }`}>
          {entry.score} pts
        </p>
        {entry.correct_rate > 0 && (
          <p className="text-xs text-gray-400">{entry.correct_rate}% acc</p>
        )}
      </div>
    </div>
  )
}

export default function CommunityPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [cohort, setCohort] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joinError, setJoinError] = useState(null)
  const [joinSuccess, setJoinSuccess] = useState(null)
  const [showJoinForm, setShowJoinForm] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)

    const { data: prof } = await supabase
      .from('profiles')
      .select('*, cohorts(id, name, session, invite_code, schools(name, city))')
      .eq('id', user.id)
      .single()

    setProfile(prof)

    if (prof?.cohort_id) {
      setCohort(prof.cohorts)
      await loadLeaderboard(prof.cohort_id, user.id)
    }

    setLoading(false)
  }

  async function loadLeaderboard(cohortId, userId) {
    // Get this week's leaderboard
    const weekStart = getWeekStart()

    const { data: entries } = await supabase
      .from('weekly_leaderboard')
      .select('*, profiles(full_name)')
      .eq('cohort_id', cohortId)
      .eq('week_start', weekStart)
      .order('score', { ascending: false })
      .limit(20)

    if (entries?.length) {
      setLeaderboard(entries.map(e => ({
        ...e,
        full_name: e.profiles?.full_name,
      })))
      return
    }

    // No leaderboard yet — build from weekly_stats
    const { data: stats } = await supabase
      .from('weekly_stats')
      .select('student_id, lessons_completed, questions_attempted, correct_rate, profiles(full_name)')
      .gte('week_start', weekStart)

    if (stats?.length) {
      // Aggregate per student
      const byStudent = {}
      stats.forEach(s => {
        if (!byStudent[s.student_id]) {
          byStudent[s.student_id] = {
            student_id: s.student_id,
            full_name: s.profiles?.full_name,
            lessons_completed: 0,
            questions_attempted: 0,
            correct_rate: 0,
            score: 0,
          }
        }
        byStudent[s.student_id].lessons_completed += s.lessons_completed
        byStudent[s.student_id].questions_attempted += s.questions_attempted
        byStudent[s.student_id].correct_rate = Math.round(
          (byStudent[s.student_id].correct_rate + parseFloat(s.correct_rate ?? 0)) / 2
        )
      })

      const ranked = Object.values(byStudent)
        .map(s => ({
          ...s,
          score: (s.lessons_completed * 10) + (s.questions_attempted * 2) + (s.correct_rate * 3),
        }))
        .sort((a, b) => b.score - a.score)

      setLeaderboard(ranked)
    }
  }

  function getWeekStart() {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    setJoining(true)
    setJoinError(null)
    setJoinSuccess(null)

    try {
      const res = await fetch('/api/school/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      })
      const data = await res.json()

      if (data.error) {
        setJoinError(data.error)
        return
      }

      setJoinSuccess(`You've joined ${data.cohort.school}!`)
      setShowJoinForm(false)
      setInviteCode('')

      // Reload
      setTimeout(() => init(), 1000)
    } catch {
      setJoinError('Something went wrong — try again')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const myRank = leaderboard.findIndex(e => e.student_id === user?.id) + 1
  const myEntry = leaderboard.find(e => e.student_id === user?.id)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Community 🏆</h1>
        <p className="text-gray-500 text-sm mt-1">
          See how you're doing compared to your classmates this week
        </p>
      </div>

      {/* Join success */}
      {joinSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-green-800 font-bold">🎉 {joinSuccess}</p>
          <p className="text-green-600 text-sm mt-1">Your leaderboard will appear here.</p>
        </div>
      )}

      {/* Not in a cohort */}
      {!profile?.cohort_id && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-6 text-white text-center">
            <p className="text-3xl mb-2">🏫</p>
            <h2 className="text-lg font-black mb-1">Join your school</h2>
            <p className="text-indigo-200 text-sm leading-relaxed">
              Ask your teacher for your school's invite code and enter it below to join your class leaderboard.
            </p>
          </div>

          <div className="p-5">
            {!showJoinForm ? (
              <button
                onClick={() => setShowJoinForm(true)}
                className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
              >
                Enter invite code →
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    School invite code
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl font-black tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                    placeholder="XXXXXX"
                  />
                  {joinError && (
                    <p className="text-xs text-red-600 mt-1.5">{joinError}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowJoinForm(false); setInviteCode(''); setJoinError(null) }}
                    className="flex-1 py-3 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoin}
                    disabled={joining || inviteCode.length < 6}
                    className="flex-1 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl disabled:opacity-50 hover:bg-indigo-500 transition-colors"
                  >
                    {joining ? 'Joining...' : 'Join →'}
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center mt-4">
              Don't have a code? Ask your teacher or school admin.
            </p>
          </div>
        </div>
      )}

      {/* In a cohort — show leaderboard */}
      {profile?.cohort_id && cohort && (
        <>
          {/* Cohort info */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-200">Your class</p>
                <p className="font-black text-lg">{cohort.name}</p>
                <p className="text-indigo-200 text-xs mt-0.5">
                  {cohort.schools?.name}
                  {cohort.session && ` · ${cohort.session}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-indigo-200">Your rank</p>
                <p className="text-3xl font-black">
                  {myRank > 0 ? `#${myRank}` : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* My stats card */}
          {myEntry && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-4">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-3">
                Your stats this week
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xl font-black text-indigo-700">{myEntry.lessons_completed}</p>
                  <p className="text-xs text-indigo-500">Lessons</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-indigo-700">{myEntry.questions_attempted}</p>
                  <p className="text-xs text-indigo-500">Questions</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-indigo-700">{myEntry.score}</p>
                  <p className="text-xs text-indigo-500">Points</p>
                </div>
              </div>
            </div>
          )}

          {/* How points work */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500">
              💡 <span className="font-semibold">How points work:</span> 10 pts per lesson completed · 2 pts per question answered · 3 pts per accuracy %
            </p>
          </div>

          {/* Leaderboard */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-gray-900">This week's leaderboard</h2>
              <span className="text-xs text-gray-400">
                {leaderboard.length} students
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <p className="text-3xl mb-2">🏁</p>
                <p className="font-bold text-gray-700 mb-1">No activity yet this week</p>
                <p className="text-sm text-gray-400">
                  Complete lessons and practice questions to appear on the leaderboard!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Top 3 podium */}
                {leaderboard.slice(0, 3).length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-center mb-3">
                      Top students this week 🌟
                    </p>
                    <div className="space-y-2">
                      {leaderboard.slice(0, 3).map((entry, i) => (
                        <LeaderboardRow
                          key={entry.student_id}
                          entry={entry}
                          currentUserId={user?.id}
                          rank={i + 1}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Rest of leaderboard */}
                {leaderboard.length > 3 && (
                  <div className="space-y-2">
                    {leaderboard.slice(3).map((entry, i) => (
                      <LeaderboardRow
                        key={entry.student_id}
                        entry={entry}
                        currentUserId={user?.id}
                        rank={i + 4}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Leave cohort */}
          <button
            onClick={() => setShowJoinForm(true)}
            className="w-full py-2.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Enter a different code
          </button>
        </>
      )}
    </div>
  )
}