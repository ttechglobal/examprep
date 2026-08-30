import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ── Code generator ──────────────────────────────────────────────────────────
// Produces a human-readable invite code from the school name + session year.
//
// Format:  SCHOOLSLUG-YEAR   e.g. KINGSWAY-2025  or  FAITHACADEMY-2026
// If that's already taken (same school, new cohort same year), appends -B, -C etc.
//
// Rules:
//   - School slug: up to 12 chars, letters only, uppercased
//   - Year: last 4 digits of the session string, or current year as fallback
//   - Separator: hyphen
//   - Uniqueness guaranteed by checking the cohorts table before inserting
//
function buildBaseCode(schoolName, session) {
  // Slug: strip non-alpha, uppercase, cap at 12 chars
  const slug = (schoolName || 'SCHOOL')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')   // letters only
    .slice(0, 12)

  // Year: pull 4-digit year from session string, else current year
  const yearMatch = (session || '').match(/\d{4}/)
  const year = yearMatch ? yearMatch[0] : String(new Date().getFullYear())

  return `${slug}-${year}`
}

async function generateUniqueCode(service, schoolName, session) {
  const base    = buildBaseCode(schoolName, session)
  const suffixes = ['', '-B', '-C', '-D', '-E', '-F', '-G', '-H']

  for (const suffix of suffixes) {
    const candidate = `${base}${suffix}`
    const { data: existing } = await service
      .from('cohorts')
      .select('id')
      .eq('invite_code', candidate)
      .maybeSingle()
    if (!existing) return candidate   // not taken — use it
  }

  // Extremely unlikely fallback: append random 3-char suffix
  const rand = Math.random().toString(36).slice(2,5).toUpperCase()
  return `${base}-${rand}`
}

// GET — fetch school's active cohort + members
export async function GET() {
  const supabase = await createClient()
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await service
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) {
    return NextResponse.json({ cohort: null, members: [] })
  }

  const { data: cohort } = await service
    .from('cohorts')
    .select('*')
    .eq('school_id', profile.school_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!cohort) {
    return NextResponse.json({ cohort: null, members: [] })
  }

  const { data: members } = await service
    .from('cohort_members')
    .select('student_id, joined_at, profiles(full_name, exam_type, subjects)')
    .eq('cohort_id', cohort.id)
    .order('joined_at', { ascending: false })

  return NextResponse.json({ cohort, members: members ?? [] })
}

// POST — create new cohort
export async function POST(request) {
  const supabase = await createClient()
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, session, invite_code, school_id: bodySchoolId } = await request.json()

  // Get school_id from body (onboarding) or profile (dashboard)
  let schoolId = bodySchoolId
  if (!schoolId) {
    const { data: profile } = await service
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()
    schoolId = profile?.school_id
  }

  if (!schoolId) {
    return NextResponse.json({ error: 'No school assigned' }, { status: 403 })
  }

  // Fetch school name to build the readable code slug
  const { data: school } = await service
    .from('schools')
    .select('name')
    .eq('id', schoolId)
    .single()

  // Archive existing active cohort
  await service
    .from('cohorts')
    .update({ is_active: false })
    .eq('school_id', schoolId)
    .eq('is_active', true)

  // Generate readable unique code — allow override from body (e.g. onboarding)
  const code = invite_code ?? await generateUniqueCode(service, school?.name ?? '', session ?? '')

  const { data: cohort, error } = await service
    .from('cohorts')
    .insert({
      school_id: schoolId,
      name,
      session,
      invite_code: code,
      invite_active: true,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cohort })
}