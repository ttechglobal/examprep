// src/app/api/student/battle/missions/route.js
// GET → this week's battle missions for the signed-in student.
//   ?waec=Maths,Physics&jamb=…   the subjects on the student's phone, used only
//                                when their account has none saved (the app keeps
//                                subjects on the device first, so a new account may
//                                not have synced them yet)
//
//   1. pays out any finished mission (this week or last), once
//   2. creates this week's missions if the student has none yet: topics from
//      the most-examined in past papers, only for the subjects they registered
//   3. returns them with live progress
//
// { missions: [{ id, exam, subject_id, subject_name, topic_id, topic_name,
//                target, progress, xp, done, claimed }],
//   completed: [ids paid just now], week_start, week_end, days_left,
//   reason: when there are no missions: 'no_subjects' | 'no_topics' }
//
// Guests get no missions ({ guest: true }). Progress is counted in SQL from the
// student's battle answers (20261009_frequency_and_missions.sql); nothing here
// trusts the client except which subjects to use when none are saved.

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { getTopicFrequency } from '@/lib/server/topicFrequency'
import { getRankProgress } from '@/lib/ranks'
import { NextResponse }  from 'next/server'
import {
  MISSION_XP, RECENT_WEEKS, HISTORY_WEEKS, missionTarget, missionCountFor, pickMissions,
} from '@/lib/missions'

const EXAMS = ['WAEC', 'JAMB']
// WAEC "English Language" and JAMB "Use of English" may be stored under either name.
const ALIASES = { 'Use of English': 'English Language', 'English Language': 'Use of English' }

// A subject's ranking only changes when questions are imported, so a server
// keeps it for an hour instead of re-querying for every student.
const FREQ_TTL = 60 * 60 * 1000
const freqCache = new Map()
async function frequencyFor(db, subjectId, exam) {
  const key = `${subjectId}:${exam}`
  const hit = freqCache.get(key)
  if (hit && Date.now() - hit.at < FREQ_TTL) return hit.value
  const value = await getTopicFrequency(db, subjectId, exam)
  freqCache.set(key, { value, at: Date.now() })
  return value
}

const isoDate = d => d.toISOString().slice(0, 10)
function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return isoDate(d)
}
// Today in Nigeria (UTC+1, no daylight saving), as YYYY-MM-DD.
const lagosToday = () => isoDate(new Date(Date.now() + 3600_000))

// Subject names the phone sent: a few short, plain names.
function nameList(value) {
  if (typeof value !== 'string') return []
  return [...new Set(value.split(',').map(n => n.trim().slice(0, 60)).filter(Boolean))].slice(0, 15)
}

// The student's registered subject rows, per exam they sit. The account's own
// subjects win; the phone's list is used for an exam the account has none for.
async function registeredSubjects(db, profile, hints) {
  const saved = exam => {
    const list = exam === 'WAEC' ? profile.subjects_waec : profile.subjects_jamb
    return Array.isArray(list) && list.length ? list : null
  }
  const primary = (profile.exam_types?.length ? profile.exam_types : [profile.exam_type]).filter(e => EXAMS.includes(e))
  const out = []
  for (const exam of EXAMS) {
    const names = saved(exam)
      ?? (primary.includes(exam) && Array.isArray(profile.subjects) && profile.subjects.length ? profile.subjects : null)
      ?? hints[exam] ?? []
    if (!names.length) continue
    const queryNames = [...new Set(names.flatMap(n => [n, ALIASES[n]].filter(Boolean)))]
    const { data: rows, error } = await db.from('subjects')
      .select('id, name').in('name', queryNames).eq('exam_type', exam).eq('is_active', true)
    if (error) throw error
    const seen = new Set()
    for (const row of rows ?? []) {
      const name = names.includes(row.name) ? row.name : ALIASES[row.name] ?? row.name
      if (seen.has(name)) continue
      seen.add(name)
      out.push({ subject: { id: row.id, name }, exam })
    }
  }
  return out
}

// Makes this week's missions. → null when made, else why not: 'no_subjects' | 'no_topics'.
async function generate(db, userId, weekStart, hints) {
  const { data: profile, error } = await db.from('profiles')
    .select('exam_types, exam_type, subjects, subjects_waec, subjects_jamb, battle_xp')
    .eq('id', userId).maybeSingle()
  if (error) throw error
  if (!profile) return 'no_subjects'

  const registered = await registeredSubjects(db, profile, hints)
  if (!registered.length) return 'no_subjects'

  const pools = await Promise.all(registered.map(async r => ({
    ...r, topics: (await frequencyFor(db, r.subject.id, r.exam)).topics,
  })))

  // What this student was given lately: topics (not repeated for a few weeks)
  // and subjects (the one done longest ago goes first, so all of them rotate).
  const { data: history, error: historyErr } = await db.from('weekly_missions')
    .select('topic_id, subject_id, week_start')
    .eq('student_id', userId).gte('week_start', addDays(weekStart, -7 * HISTORY_WEEKS))
  if (historyErr) throw historyErr
  const recentFrom = addDays(weekStart, -7 * RECENT_WEEKS)
  const recent = new Set((history ?? []).filter(r => r.week_start >= recentFrom).map(r => r.topic_id))
  const subjectLast = new Map()
  for (const r of history ?? []) {
    if (!(subjectLast.get(r.subject_id) >= r.week_start)) subjectLast.set(r.subject_id, r.week_start)
  }

  const target = missionTarget(getRankProgress(Number(profile.battle_xp) || 0).rank)
  const picks = pickMissions(pools, { count: missionCountFor(), recent, subjectLast })
  if (!picks.length) return 'no_topics'

  const { error: createErr } = await db.rpc('create_weekly_missions', {
    p_student: userId,
    p_week: weekStart,
    p_missions: picks.map(p => ({
      exam: p.exam, subject_id: p.subject.id, subject_name: p.subject.name,
      topic_id: p.topic.topic_id, topic_name: p.topic.topic_name,
      target_questions: target, xp_reward: MISSION_XP,
    })),
  })
  if (createErr) throw createErr
  return null
}

export async function GET(request) {
  try {
    const supabase = await createClient()
    const user = (await supabase.auth.getUser()).data?.user
    if (!user) return NextResponse.json({ missions: [], completed: [], guest: true })

    const params = new URL(request.url).searchParams
    const hints = { WAEC: nameList(params.get('waec')), JAMB: nameList(params.get('jamb')) }

    const db = supabaseAdmin()
    const paid = await db.rpc('claim_completed_missions', { p_student: user.id })
    if (paid.error) throw paid.error

    // The week starts on Monday. Day 0 = Sunday in JS, so Monday is (day + 6) % 7 days back.
    const today = lagosToday()
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay()
    const weekStart = addDays(today, -((dow + 6) % 7))

    let reason = null
    let list = await db.rpc('list_weekly_missions', { p_student: user.id, p_week: weekStart })
    if (list.error) throw list.error
    if (!list.data?.length) {
      reason = await generate(db, user.id, weekStart, hints)
      if (!reason) {
        list = await db.rpc('list_weekly_missions', { p_student: user.id, p_week: weekStart })
        if (list.error) throw list.error
      }
    }

    const missions = (list.data ?? []).map(m => ({
      id: m.id, exam: m.exam,
      subject_id: m.subject_id, subject_name: m.subject_name,
      topic_id: m.topic_id, topic_name: m.topic_name,
      target: m.target_questions, progress: m.progress, xp: m.xp_reward,
      done: m.progress >= m.target_questions, claimed: !!m.claimed,
    }))
    const weekEnd = addDays(weekStart, 6)
    const daysLeft = Math.round((Date.parse(`${weekEnd}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400_000) + 1

    return NextResponse.json(
      { missions, completed: paid.data ?? [], week_start: weekStart, week_end: weekEnd, days_left: daysLeft, ...(missions.length ? {} : { reason }) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (e) {
    console.error('[battle/missions] GET:', e?.message ?? e)
    return NextResponse.json({ error: 'Could not load missions' }, { status: 500 })
  }
}
