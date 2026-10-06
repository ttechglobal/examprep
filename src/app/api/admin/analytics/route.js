// src/app/api/admin/analytics/route.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics — numbers for the admin Analytics page.
//
//   tab     overview | engagement | features | learning | conversion
//   days    7 | 30 | 90  (ending today, Nigerian days)
//   exam    WAEC | JAMB          (optional)
//   plan    free | trial | premium (optional; the student's plan now)
//   school  a school id          (optional)
//   meta=1  also return the schools for the filter
//   refresh=1  skip the cache and count again
//
// Response: { range: { from, to, days }, sections... } — only the sections the
// tab shows (kpis, daily, newReturning, features, subjects, topics, difficult,
// exams, engagement, retention, conversion, triggers).
//
// Everything is counted in Postgres (analytics_* in 20261008_analytics.sql).
// v2 replaces v1, which downloaded raw rows and counted them here; Supabase
// returns at most 1,000 rows, so v1's numbers were cut short.
// v3: easy on the database (these are the heaviest queries in the app). Each
// answer is kept for 5 minutes per server (lib/server/memo.js), so switching tabs
// back and forth, reloading, or two admins looking at once runs the counts once.
// "Refresh" on the page skips it. Analytics don't need to be to-the-second.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { appDay, addDays } from '@/lib/dates'
import { UUID_RE }       from '@/lib/uuid'
import { memo }          from '@/lib/server/memo'

const CACHE_MS = 5 * 60_000

const TABS = {
  overview:   ['kpis', 'daily', 'newReturning', 'features', 'subjects', 'topics', 'conversion', 'triggers'],
  engagement: ['kpis', 'daily', 'newReturning', 'engagement', 'retention'],
  features:   ['kpis', 'features'],
  learning:   ['kpis', 'subjects', 'topics', 'difficult', 'exams'],
  conversion: ['kpis', 'conversion', 'triggers'],
}
const DAYS = new Set([7, 30, 90])

export async function GET(request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const params = new URL(request.url).searchParams
  const tab = TABS[params.get('tab')] ? params.get('tab') : 'overview'
  const days = DAYS.has(Number(params.get('days'))) ? Number(params.get('days')) : 30
  const exam = ['WAEC', 'JAMB'].includes(params.get('exam')) ? params.get('exam') : null
  const plan = ['free', 'trial', 'premium'].includes(params.get('plan')) ? params.get('plan') : null
  const school = params.get('school')
  if (school && !UUID_RE.test(school)) return NextResponse.json({ error: 'Invalid school' }, { status: 400 })

  const to = appDay()
  const from = addDays(to, -(days - 1))
  const f = { p_from: from, p_to: to, p_exam: exam, p_plan: plan, p_school: school || null }
  const scope = { p_exam: exam, p_plan: plan, p_school: school || null }
  const weeks = days <= 7 ? 4 : days <= 30 ? 5 : 13

  const db = supabaseAdmin()
  const meta = params.get('meta') === '1'
  const queries = {
    kpis:         () => db.rpc('analytics_kpis', f),
    daily:        () => db.rpc('analytics_daily', f),
    newReturning: () => db.rpc('analytics_new_returning', { p_to: to, p_weeks: weeks, ...scope }),
    features:     () => db.rpc('analytics_features', f),
    subjects:     () => db.rpc('analytics_subjects', f),
    topics:       () => db.rpc('analytics_topics', { ...f, p_order: 'popular', p_limit: tab === 'overview' ? 10 : 20, p_min: 1 }),
    difficult:    () => db.rpc('analytics_topics', { ...f, p_order: 'difficult', p_limit: 10, p_min: 20 }),
    exams:        () => db.rpc('analytics_exams', f),
    engagement:   () => db.rpc('analytics_engagement', f),
    retention:    () => db.rpc('analytics_retention', { p_to: to, p_weeks: 8, ...scope }),
    conversion:   () => db.rpc('analytics_conversion', f),
    triggers:     () => db.rpc('analytics_triggers', f),
  }

  try {
    const wanted = TABS[tab]
    const load = async () => {
      const results = await Promise.all([
        ...wanted.map(key => queries[key]()),
        meta ? db.from('schools').select('id, name').order('name') : Promise.resolve(null),
      ])
      const failed = results.find(r => r?.error)
      if (failed) throw failed.error
      const body = { tab, range: { from, to, days }, at: Date.now() }
      wanted.forEach((key, i) => { body[key] = results[i].data })
      if (results.at(-1)) body.schools = results.at(-1).data ?? []
      return body
    }
    const key = `admin-analytics:${tab}:${days}:${exam ?? ''}:${plan ?? ''}:${school ?? ''}:${meta ? 'm' : ''}:${to}`
    const body = await memo(key, CACHE_MS, load, { fresh: params.get('refresh') === '1' })
    return NextResponse.json(body, { headers: { 'Cache-Control': 'private, max-age=60' } })
  } catch (err) {
    console.error('[admin/analytics] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load analytics' }, { status: 500 })
  }
}
