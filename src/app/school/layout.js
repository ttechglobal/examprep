// src/app/school/layout.js
// Server layout — guards /school/* and passes school + admin info to nav.

import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import SchoolNav        from '@/components/school/SchoolNav'

export default async function SchoolLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/school-login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, schools(name, city)')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'school_admin') redirect('/unauthorized')

  const school = profile?.schools

  return (
    <div style={{ minHeight: '100dvh', background: '#f4f7ff' }}>
      <SchoolNav
        schoolName={school?.name ?? 'My School'}
        schoolCity={school?.city  ?? ''}
        adminName={profile?.full_name ?? 'School Admin'}
      />
      <div className="school-content">
        <main style={{ maxWidth: 1100, margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}