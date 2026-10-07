// src/app/partner/dashboard/layout.js
// Server guard for /partner/dashboard: signed in, and an ambassador. Everything
// the dashboard shows still comes from /api/partner/*, which checks the same.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Ambassador dashboard | ExamPrep A1', robots: { index: false } }

export default async function PartnerDashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/partner/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'ambassador') redirect('/unauthorized')

  return children
}
