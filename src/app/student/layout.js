// src/app/student/layout.js
// ─────────────────────────────────────────────────────────────────────────────
// Server component: handles auth + data fetch.
// Delegates chrome rendering to StudentLayoutClient which can read pathname
// and suppress header/sidebar/nav on focused-mode routes (session pages).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LessonNavProvider } from '@/contexts/LessonNavContext'
import { PointsProvider } from '@/contexts/PointsContext'
import { UserProvider } from '@/contexts/UserContext'
import StudentLayoutClient from './StudentLayoutClient'

export const revalidate = 60

export default async function StudentLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_points, full_name, streak_days')
    .eq('id', user.id)
    .single()

  return (
    <LessonNavProvider>
      <PointsProvider initialTotal={profile?.total_points ?? 0}>
        <UserProvider userId={user.id} profile={profile}>
          <StudentLayoutClient profile={profile}>
            {children}
          </StudentLayoutClient>
        </UserProvider>
      </PointsProvider>
    </LessonNavProvider>
  )
}