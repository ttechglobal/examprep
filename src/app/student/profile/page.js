'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import GoalModal from '@/components/dashboard/GoalModal'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
      setLoading(false)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  return (
    <div className="space-y-5">

      {showGoalModal && profile && (
        <GoalModal
          profile={profile}
          onClose={() => {
            setShowGoalModal(false)
            supabase.from('profiles').select('*').eq('id', profile.id).single()
              .then(({ data }) => setProfile(data))
          }}
        />
      )}

      {/* Avatar + name */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-2xl font-black text-white">{initials}</span>
          </div>
          <div>
            <h2 className="text-xl font-black">{profile?.full_name}</h2>
            <p className="text-indigo-200 text-sm">{profile?.exam_type ?? 'Exam not set'} Student</p>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900">My Goals</h3>
          <button
            onClick={() => setShowGoalModal(true)}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            Edit
          </button>
        </div>

        {profile?.university_course ? (
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">🎓</span>
            <div>
              <p className="text-xs text-gray-400">University course</p>
              <p className="text-sm font-bold text-gray-800">{profile.university_course}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-3">No course set yet</p>
        )}

        {/* WAEC targets */}
        {Object.keys(profile?.waec_target_grades ?? {}).length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">WAEC Targets</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(profile.waec_target_grades).map(([sub, grade]) => {
                const color = getSubjectColor(sub)
                return (
                  <span key={sub} className={`text-xs px-2.5 py-1 rounded-full ${color.bg} ${color.text} font-medium`}>
                    {sub}: {grade}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* JAMB targets */}
        {Object.keys(profile?.jamb_target_scores ?? {}).length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">JAMB Targets</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(profile.jamb_target_scores).map(([sub, score]) => {
                const color = getSubjectColor(sub)
                return (
                  <span key={sub} className={`text-xs px-2.5 py-1 rounded-full ${color.bg} ${color.text} font-medium`}>
                    {sub}: {score}
                  </span>
                )
              })}
            </div>
            {profile?.jamb_total_target && (
              <p className="text-sm font-bold text-indigo-700 mt-2">
                Total target: {profile.jamb_total_target}/400
              </p>
            )}
          </div>
        )}

        {!profile?.goals_set && (
          <button
            onClick={() => setShowGoalModal(true)}
            className="w-full mt-2 py-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-100 transition-colors"
          >
            🎯 Set your exam goals
          </button>
        )}
      </div>

      {/* Subjects */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-black text-gray-900 mb-3">My Subjects</h3>
        <div className="flex flex-wrap gap-2">
          {(profile?.subjects ?? []).map(subject => {
            const color = getSubjectColor(subject)
            return (
              <span key={subject} className={`text-sm px-3 py-1.5 rounded-full font-medium ${color.bg} ${color.text}`}>
                {subject}
              </span>
            )
          })}
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full py-3 border border-red-200 text-red-600 text-sm font-bold rounded-2xl hover:bg-red-50 transition-colors"
      >
        Sign out
      </button>

    </div>
  )
}