import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SchoolLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // TODO: re-enable before production
  // const { data: profile } = await supabase
  //   .from('profiles')
  //   .select('role, school_id, full_name, schools(name, city, state)')
  //   .eq('id', user.id)
  //   .single()
  // if (!profile || !['superadmin', 'school_admin'].includes(profile.role)) {
  //   redirect('/unauthorized')
  // }

  // Dev: fetch profile without role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id, full_name, schools(name, city, state)')
    .eq('id', user.id)
    .single()

  const school = profile?.schools

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="font-black text-lg text-indigo-600">ExamPrep</span>
            <span className="text-gray-300">|</span>
            <div>
              <p className="text-sm font-bold text-gray-800 leading-tight">
                {school?.name ?? 'School Dashboard'}
              </p>
              {school?.city && (
                <p className="text-xs text-gray-400">{school.city}, {school.state}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full">
              School Admin
            </span>
            <Link href="/student/dashboard" className="text-xs text-gray-400 hover:text-gray-600">
              ← Student view
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}