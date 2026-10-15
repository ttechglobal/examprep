// Independent weekly Practice challenges: GET reads/claims, POST unlocks one
// extra set. Authenticated user's verified non-Battle answers are counted in SQL.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { registeredSubjects } from '@/lib/server/registeredSubjects'
import { getTopicFrequency } from '@/lib/server/topicFrequency'
import { listSubjectTopics } from '@/lib/server/subjectTopics'
import { pickMissions } from '@/lib/missions'
import { appDay, mondayOfDay, addDays } from '@/lib/dates'

const headers = { 'Cache-Control': 'private, no-store' }
const names = value => [...new Set((value ?? '').split(',').map(x => x.trim().slice(0, 60)).filter(Boolean))].slice(0, 15)

function sameOrigin(request) {
  // Next may normalize request.url to localhost behind a dev server/proxy.
  // Host is the browser's destination; forwarded protocol restores HTTPS.
  try {
    const expected = new URL(request.url)
    const host = request.headers.get('host')
    if (host) expected.host = host
    const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
    if (protocol === 'http' || protocol === 'https') expected.protocol = `${protocol}:`
    return request.headers.get('origin') === expected.origin
  } catch { return false }
}

async function chooseTopics(db, student, request) {
  const params = new URL(request.url).searchParams
  const { data: profile, error } = await db.from('profiles')
    .select('exam_types, exam_type, subjects, subjects_waec, subjects_jamb').eq('id', student).single()
  if (error) throw error
  const subjects = await registeredSubjects(db, profile, { WAEC: names(params.get('waec')), JAMB: names(params.get('jamb')) })
  if (!subjects.length) return { items: [], reason: 'no_subjects' }
  const week = mondayOfDay(appDay())
  const { data: sets, error: setError } = await db.from('practice_challenge_sets')
    .select('id, week_start').eq('student_id', student).gte('week_start', addDays(week, -28))
  if (setError) throw setError
  let history = []
  if (sets.length) {
    const reply = await db.from('practice_challenges').select('set_id, topic_id, subject_id').in('set_id', sets.map(x => x.id))
    if (reply.error) throw reply.error
    history = reply.data ?? []
  }
  const current = new Set(sets.filter(x => x.week_start === week).map(x => x.id))
  const used = new Set(history.filter(x => current.has(x.set_id)).map(x => x.topic_id))
  const pools = await Promise.all(subjects.map(async subject => {
    const [frequency, catalog] = await Promise.all([
      getTopicFrequency(db, subject.subject.id, subject.exam), listSubjectTopics(db, subject.subject.id, subject.exam),
    ])
    // Challenges must be playable on Free as well as Premium.
    const open = new Set(catalog.filter(t => t.free).map(t => t.id))
    return { ...subject, topics: frequency.topics.filter(t => open.has(t.topic_id) && !used.has(t.topic_id)) }
  }))
  const picks = pickMissions(pools, { count: 3, recent: new Set(history.map(x => x.topic_id)) })
  return { items: picks.map(p => ({ exam: p.exam, subject_id: p.subject.id, subject_name: p.subject.name,
    topic_id: p.topic.topic_id, topic_name: p.topic.topic_name })), reason: picks.length ? null : 'no_topics' }
}

async function respond(request, next) {
  try {
    if (next && !sameOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403, headers })
    }
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return NextResponse.json({ guest: true, set: null }, { headers })
    const db = supabaseAdmin()
    let result = await db.rpc('read_practice_challenges', { p_student: user.id })
    if (result.error) throw result.error
    const awarded = result.data.xp_awarded ?? 0
    if (next && !result.data.set?.can_unlock) {
      return NextResponse.json({ error: 'An extra set is not available yet' }, { status: 409, headers })
    }
    if (!result.data.set || next) {
      const { items, reason } = await chooseTopics(db, user.id, request)
      if (!items.length) return NextResponse.json({ ...result.data, reason }, { headers })
      const created = await db.rpc('create_practice_challenges', { p_student: user.id, p_items: items, p_next: next })
      if (created.error) throw created.error
      result = await db.rpc('read_practice_challenges', { p_student: user.id })
      if (result.error) throw result.error
      result.data.xp_awarded = awarded + (result.data.xp_awarded ?? 0)
    }
    return NextResponse.json(result.data, { headers })
  } catch (error) {
    console.error('[practice/challenges]', error?.message)
    return NextResponse.json({ error: 'Could not load weekly challenges' }, { status: 500, headers })
  }
}

export const GET = request => respond(request, false)
export const POST = request => respond(request, true)
