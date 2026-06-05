// src/app/school/layout.js
// v2 — desktop sidebar + mobile header. No student view link.
// Desktop: fixed left sidebar 220px with school name + nav icons.
// Mobile: sticky top bar with school name.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SchoolNav from '@/components/school/SchoolNav'

export default async function SchoolLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, schools(name, city)')
    .eq('id', user.id)
    .single()

  const school = profile?.schools

  return (
    <div className="min-h-screen bg-gray-50">
      <SchoolNav schoolName={school?.name ?? 'School Dashboard'} schoolCity={school?.city ?? ''} />
      <div className="lg:ml-56">
        <main className="max-w-5xl mx-auto px-4 lg:px-8 pb-24 lg:pb-12 pt-4 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  )
}