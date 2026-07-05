// src/app/api/challenges/route.js
// GET /api/challenges
//
// Returns:
//   active   — the currently running challenge (if any)
//   upcoming — challenges starting in the next 30 days
//   past     — last 3 completed challenges, with the student's result
//
// DB table: challenges
//   id, title, description, type (national|school|class),
//   subject (null = all subjects), starts_at, ends_at,
//   target_count (questions to complete), prize_description,
//   is_active, created_at
//
// DB table: challenge_entries
//   id, challenge_id, student_id, questions_completed, rank, created_at
//
// Since the challenges table may not exist yet, this route gracefully
// returns mock data when the table is missing — allowing the UI to
// render without breaking.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Fallback mock data for when challenges table doesn't exist yet
const MOCK_ACTIVE = {
  id:              'mock-1',
  title:           '100 Questions Sprint',
  description:     'Answer 100 questions to qualify. Top 3 win prizes.',
  type:            'national',
  subject:         null,
  starts_at:       new Date(Date.now() - 5 * 86400000).toISOString(),
  ends_at:         new Date(Date.now() + 2 * 86400000).toISOString(),
  target_count:    100,
  prize_description: 'Top 3 win ₦10,000 airtime + ExamPrep Pro subscription',
  participant_count: 14203,
}

const MOCK_UPCOMING = [
  {
    id:           'mock-2',
    title:        'November Chemistry Blitz',
    description:  '50 Chemistry questions. Top scorer wins.',
    type:         'national',
    subject:      'Chemistry',
    starts_at:    new Date(Date.now() + 10 * 86400000).toISOString(),
    ends_at:      new Date(Date.now() + 17 * 86400000).toISOString(),
    target_count: 50,
    prize_description: 'Top 5 win prizes',
  },
  {
    id:           'mock-3',
    title:        'Inter-school Tournament',
    description:  'Compete against students from 47 schools. School with most points wins.',
    type:         'school',
    subject:      null,
    starts_at:    new Date(Date.now() + 14 * 86400000).toISOString(),
    ends_at:      new Date(Date.now() + 19 * 86400000).toISOString(),
    target_count: 200,
    prize_description: 'Top school wins a trophy + ₦50,000',
  },
]

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const now = new Date().toISOString()

  try {
    // Try to fetch from DB — gracefully degrade if table missing
    const [{ data: activeChallenges }, { data: upcoming }, { data: past }] = await Promise.all([
      service.from('challenges')
        .select('*, challenge_entries(questions_completed, rank)')
        .lte('starts_at', now).gte('ends_at', now)
        .eq('is_active', true)
        .order('starts_at', { ascending: false })
        .limit(1),
      service.from('challenges')
        .select('*')
        .gt('starts_at', now)
        .order('starts_at', { ascending: true })
        .limit(5),
      service.from('challenges')
        .select('*, challenge_entries!inner(questions_completed, rank, student_id)')
        .lt('ends_at', now)
        .eq('challenge_entries.student_id', user.id)
        .order('ends_at', { ascending: false })
        .limit(3),
    ])

    // Attach my_entry to active challenge
    const active = activeChallenges?.[0] ?? null
    let myEntry = null
    if (active) {
      const { data: entry } = await service
        .from('challenge_entries')
        .select('questions_completed, rank')
        .eq('challenge_id', active.id)
        .eq('student_id', user.id)
        .maybeSingle()
      myEntry = entry
    }

    return NextResponse.json({
      active:   active ? { ...active, my_entry: myEntry } : null,
      upcoming: upcoming ?? [],
      past:     past ?? [],
    })
  } catch {
    // Table likely doesn't exist yet — return mock data
    return NextResponse.json({
      active:   { ...MOCK_ACTIVE, my_entry: { questions_completed: 78, rank: 6 } },
      upcoming: MOCK_UPCOMING,
      past: [{
        id: 'mock-past-1',
        title: 'Physics Sprint — September',
        ends_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        my_entry: { rank: 3, questions_completed: 50 },
        prize_description: 'Certificate + 500 XP',
      }],
    })
  }
}