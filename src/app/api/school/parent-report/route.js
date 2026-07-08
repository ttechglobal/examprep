// src/app/api/school/parent-report/route.js
// POST — triggers a parent report email for a specific student.
// GET  — returns the report data for a student (for preview).
//
// Parent reports are weekly summaries sent to the parent email address
// stored on the student's profile (parent_email field).
// Report content:
//   - Days studied this week
//   - Questions answered + accuracy
//   - Topics covered
//   - 3 topics the student needs to work on
//   - Streak status
//   - Overall progress snapshot
//
// Email is sent via the Supabase Edge Function "send-parent-report" if
// PARENT_REPORT_EDGE_FUNCTION_URL is set. Otherwise returns the data
// so the caller can handle sending (e.g. via Resend/SendGrid directly).

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('student_id') ?? user.id

  const db  = svc()
  const now = new Date()
  const weekAgo = new Date(now - 7 * 86400000).toISOString()

  const [
    { data: profile },
    { data: attempts },
    { data: progress },
    { data: streak },
    { data: mastery },
  ] = await Promise.all([
    db.from('profiles').select('id, full_name, parent_email, exam_type, subjects, streak_days').eq('id', studentId).single(),
    db.from('question_attempts').select('is_correct, topic_id, subject_id, created_at, topics(name), subjects(name)').eq('student_id', studentId).gte('created_at', weekAgo),
    db.from('lesson_progress').select('subtopic_id, completed, started_at').eq('student_id', studentId).gte('started_at', weekAgo),
    db.from('student_streaks').select('current_streak, last_active_date').eq('student_id', studentId).maybeSingle(),
    db.from('student_topic_mastery').select('score, topics(name, subjects(name))').eq('student_id', studentId).order('score', { ascending: true }).limit(5),
  ])

  if (!profile) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Compute weekly stats
  const daysStudied  = new Set((attempts ?? []).map(a => a.created_at?.split('T')[0])).size
  const totalAttempts = attempts?.length ?? 0
  const correct      = attempts?.filter(a => a.is_correct).length ?? 0
  const accuracy     = totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : null
  const lessonsCompleted = progress?.filter(p => p.completed).length ?? 0

  // Topics covered this week
  const topicNames = [...new Set((attempts ?? []).map(a => a.topics?.name).filter(Boolean))]

  // Topics needing work
  const weakTopics = (mastery ?? [])
    .filter(m => m.topics)
    .slice(0, 3)
    .map(m => ({ name: m.topics.name, subject: m.topics.subjects?.name, score: Math.round(m.score ?? 0) }))

  const reportData = {
    student: {
      id:        profile.id,
      name:      profile.full_name,
      email:     profile.parent_email,
      examType:  profile.exam_type,
      subjects:  profile.subjects ?? [],
    },
    week: {
      daysStudied,
      totalAttempts,
      correct,
      accuracy,
      lessonsCompleted,
      topicsCovered: topicNames,
      streak: streak?.current_streak ?? 0,
    },
    weakTopics,
    generatedAt: now.toISOString(),
  }

  return NextResponse.json({ report: reportData })
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const studentId = body.student_id ?? user.id

  // Get the report data
  const db  = svc()
  const now = new Date()
  const weekAgo = new Date(now - 7 * 86400000).toISOString()

  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, parent_email, exam_type, subjects')
    .eq('id', studentId)
    .single()

  if (!profile?.parent_email) {
    return NextResponse.json({ error: 'No parent email on file for this student' }, { status: 400 })
  }

  // Fetch report data (reuse GET logic)
  const [{ data: attempts }, { data: streak }, { data: mastery }] = await Promise.all([
    db.from('question_attempts').select('is_correct, created_at, topics(name), subjects(name)').eq('student_id', studentId).gte('created_at', weekAgo),
    db.from('student_streaks').select('current_streak').eq('student_id', studentId).maybeSingle(),
    db.from('student_topic_mastery').select('score, topics(name, subjects(name))').eq('student_id', studentId).order('score', { ascending: true }).limit(3),
  ])

  const daysStudied   = new Set((attempts ?? []).map(a => a.created_at?.split('T')[0])).size
  const totalAttempts = attempts?.length ?? 0
  const correct       = attempts?.filter(a => a.is_correct).length ?? 0
  const accuracy      = totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : null
  const weakTopics    = (mastery ?? []).filter(m => m.topics).slice(0, 3).map(m => ({ name: m.topics.name, score: Math.round(m.score ?? 0) }))
  const currentStreak = streak?.current_streak ?? 0

  // Build email HTML
  const emailHtml = buildEmailHTML({
    parentEmail: profile.parent_email,
    studentName: profile.full_name,
    daysStudied,
    totalAttempts,
    accuracy,
    weakTopics,
    currentStreak,
    examType: profile.exam_type,
    subjects: profile.subjects ?? [],
    weekOf:   new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
  })

  // Try to send via Edge Function if configured
  const edgeFnUrl = process.env.PARENT_REPORT_EDGE_FUNCTION_URL
  if (edgeFnUrl) {
    try {
      await fetch(edgeFnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ to: profile.parent_email, subject: `${profile.full_name}'s weekly ExamPrep report`, html: emailHtml }),
      })
    } catch {}
  }

  // Log the send attempt
  await db.from('parent_report_log').insert({
    student_id:  studentId,
    parent_email: profile.parent_email,
    sent_at:     now.toISOString(),
    week_start:  weekAgo,
    days_studied: daysStudied,
    accuracy,
  }).catch(() => {}) // non-fatal

  return NextResponse.json({ ok: true, parentEmail: profile.parent_email, preview: emailHtml.slice(0, 200) })
}

function buildEmailHTML({ studentName, parentEmail, daysStudied, totalAttempts, accuracy, weakTopics, currentStreak, examType, subjects, weekOf }) {
  const streakMsg = currentStreak > 0 ? `${currentStreak}-day streak 🔥` : 'No streak this week'
  const accMsg    = accuracy !== null ? `${accuracy}% accuracy` : 'No practice data'
  const weakList  = weakTopics.length > 0
    ? weakTopics.map(t => `<li style="margin-bottom:4px;">${t.name} — ${t.score}% mastery</li>`).join('')
    : '<li>No weak topics identified yet</li>'

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f6fa;margin:0;padding:24px;">
<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">
  <div style="background:linear-gradient(135deg,#0b1330,#1e2a6e);padding:28px 28px 20px;text-align:center;">
    <div style="width:40px;height:40px;border-radius:10px;background:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0b1330;margin-bottom:12px;">E</div>
    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:900;">${studentName}'s weekly report</h1>
    <p style="color:rgba(255,255,255,.6);margin:4px 0 0;font-size:13px;">Week of ${weekOf} · ${examType} · ${subjects.slice(0,3).join(', ')}</p>
  </div>
  <div style="padding:24px 28px;">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
      <div style="text-align:center;padding:14px;background:#f5f6fa;border-radius:12px;">
        <p style="font-size:24px;font-weight:900;color:#0b1330;margin:0;">${daysStudied}</p>
        <p style="font-size:11px;color:#6b7280;margin:2px 0 0;">Days studied</p>
      </div>
      <div style="text-align:center;padding:14px;background:#f5f6fa;border-radius:12px;">
        <p style="font-size:24px;font-weight:900;color:#0b1330;margin:0;">${totalAttempts}</p>
        <p style="font-size:11px;color:#6b7280;margin:2px 0 0;">Questions done</p>
      </div>
      <div style="text-align:center;padding:14px;background:#f5f6fa;border-radius:12px;">
        <p style="font-size:24px;font-weight:900;color:${accuracy !== null && accuracy >= 70 ? '#059669' : accuracy !== null && accuracy >= 45 ? '#d97706' : '#6b7280'};margin:0;">${accuracy !== null ? accuracy + '%' : '—'}</p>
        <p style="font-size:11px;color:#6b7280;margin:2px 0 0;">Accuracy</p>
      </div>
    </div>
    <p style="font-size:13px;color:#374151;margin:0 0 8px;"><strong>Streak:</strong> ${streakMsg}</p>
    ${weakTopics.length > 0 ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;margin-top:16px;">
      <p style="font-size:12px;font-weight:700;color:#dc2626;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em;">Focus areas</p>
      <ul style="margin:0;padding-left:16px;font-size:13px;color:#374151;">${weakList}</ul>
    </div>` : ''}
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="font-size:11px;color:#9ca3af;margin:0;">ExamPrep · Sent to ${parentEmail}</p>
    </div>
  </div>
</div>
</body></html>`
}