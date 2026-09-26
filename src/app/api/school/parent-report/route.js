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

import { createClient }    from '@/lib/supabase/server'
import { supabaseAdmin }   from '@/lib/server/supabaseAdmin'
import { effectiveStreak } from '@/lib/streak'
import { NextResponse }    from 'next/server'

const UUID_RE     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RESEND_DAYS = 6   // at most one report email per student per week

// Who may see / send a student's report: the student, or the admin of the
// student's school. (Previously any signed-in user could pass any student_id.)
async function authorize(db, userId, studentId) {
  if (studentId === userId) return true
  const { data: rows } = await db.from('profiles').select('id, role, school_id').in('id', [userId, studentId])
  const caller  = rows?.find(r => r.id === userId)
  const student = rows?.find(r => r.id === studentId)
  return !!(caller?.role === 'school_admin' && caller.school_id && student?.school_id === caller.school_id)
}

async function resolveRequest(request, studentIdParam) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const studentId = studentIdParam ?? user.id
  if (!UUID_RE.test(studentId)) return { error: NextResponse.json({ error: 'Invalid student_id' }, { status: 400 }) }

  const db = supabaseAdmin()
  if (!(await authorize(db, user.id, studentId))) {
    return { error: NextResponse.json({ error: 'Not allowed' }, { status: 403 }) }
  }
  return { db, studentId }
}

// The week's numbers, grouped in SQL (no raw-answer downloads).
async function buildReport(db, studentId) {
  const now     = new Date()
  const weekAgo = new Date(now - 7 * 86400000)

  const [profileRes, daysRes, topicsRes, progressRes] = await Promise.all([
    db.from('profiles')
      .select('id, full_name, parent_email, exam_type, subjects, streak_days, last_active_date')
      .eq('id', studentId).single(),
    db.from('student_daily_stats')
      .select('day, answered, correct')
      .eq('student_id', studentId)
      .gte('day', weekAgo.toISOString().slice(0, 10)),
    db.rpc('stats_by_topic', { p_student_ids: [studentId], p_since: weekAgo.toISOString(), p_exam: null, p_subject_id: null }),
    db.from('lesson_progress')
      .select('subtopic_id', { count: 'exact', head: true })
      .eq('student_id', studentId).eq('completed', true)
      .gte('started_at', weekAgo.toISOString()),
  ])

  if (daysRes.error)   throw daysRes.error
  if (topicsRes.error) throw topicsRes.error
  const profile = profileRes.data
  if (!profile) return null

  const days          = (daysRes.data ?? []).filter(d => Number(d.answered) > 0)
  const totalAttempts = days.reduce((a, d) => a + (Number(d.answered) || 0), 0)
  const correct       = days.reduce((a, d) => a + (Number(d.correct)  || 0), 0)
  const topics        = topicsRes.data ?? []

  // Weakest topics this week: lowest accuracy among topics with ≥ 3 answers.
  const weakTopics = topics
    .filter(t => Number(t.answered) >= 3)
    .map(t => ({
      name:    t.topic_name,
      subject: t.subject_name,
      score:   Math.round((Number(t.correct) / Number(t.answered)) * 100),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)

  return {
    profile,
    report: {
      student: {
        id:       profile.id,
        name:     profile.full_name,
        email:    profile.parent_email,
        examType: profile.exam_type,
        subjects: profile.subjects ?? [],
      },
      week: {
        daysStudied:      days.length,
        totalAttempts,
        correct,
        accuracy:         totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : null,
        lessonsCompleted: progressRes.error ? 0 : (progressRes.count ?? 0),
        topicsCovered:    [...new Set(topics.map(t => t.topic_name).filter(Boolean))],
        streak:           effectiveStreak(profile),
      },
      weakTopics,
      generatedAt: now.toISOString(),
    },
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const { db, studentId, error } = await resolveRequest(request, searchParams.get('student_id'))
  if (error) return error

  try {
    const built = await buildReport(db, studentId)
    if (!built) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    return NextResponse.json({ report: built.report })
  } catch (err) {
    console.error('[parent-report] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not build report' }, { status: 500 })
  }
}

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {}
  const { db, studentId, error } = await resolveRequest(request, body.student_id)
  if (error) return error

  try {
    const built = await buildReport(db, studentId)
    if (!built) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    const { profile, report } = built
    if (!profile.parent_email) {
      return NextResponse.json({ error: 'No parent email on file for this student' }, { status: 400 })
    }

    // Rate limit: one email per student per week, so the endpoint can't be
    // used to flood a parent's inbox.
    const since = new Date(Date.now() - RESEND_DAYS * 86400000).toISOString()
    const { count: recent } = await db.from('parent_report_log')
      .select('student_id', { count: 'exact', head: true })
      .eq('student_id', studentId).gte('sent_at', since)
    if ((recent ?? 0) > 0) {
      return NextResponse.json({ error: 'A report was already sent this week' }, { status: 429 })
    }

    const emailHtml = buildEmailHTML({
      parentEmail:   profile.parent_email,
      studentName:   profile.full_name,
      daysStudied:   report.week.daysStudied,
      totalAttempts: report.week.totalAttempts,
      accuracy:      report.week.accuracy,
      weakTopics:    report.weakTopics,
      currentStreak: report.week.streak,
      examType:      profile.exam_type,
      subjects:      profile.subjects ?? [],
      weekOf:        new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
    })

    // Send via Edge Function if configured
    const edgeFnUrl = process.env.PARENT_REPORT_EDGE_FUNCTION_URL
    if (edgeFnUrl) {
      try {
        await fetch(edgeFnUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({
            to:      profile.parent_email,
            subject: `${String(profile.full_name ?? 'Your child').replace(/[\r\n]/g, ' ')}'s weekly ExamPrep report`,
            html:    emailHtml,
          }),
        })
      } catch {}
    }

    const { error: logErr } = await db.from('parent_report_log').insert({
      student_id:   studentId,
      parent_email: profile.parent_email,
      sent_at:      new Date().toISOString(),
      week_start:   new Date(Date.now() - 7 * 86400000).toISOString(),
      days_studied: report.week.daysStudied,
      accuracy:     report.week.accuracy,
    })
    if (logErr) console.warn('[parent-report] log insert failed:', logErr.message)

    return NextResponse.json({ ok: true, parentEmail: profile.parent_email, preview: emailHtml.slice(0, 200) })
  } catch (err) {
    console.error('[parent-report] POST:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not send report' }, { status: 500 })
  }
}

// Student-controlled text (names, topics) must never become HTML.
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function buildEmailHTML({ studentName, parentEmail, daysStudied, totalAttempts, accuracy, weakTopics, currentStreak, examType, subjects, weekOf }) {
  const streakMsg = currentStreak > 0 ? `${currentStreak}-day streak 🔥` : 'No streak this week'
  const accMsg    = accuracy !== null ? `${accuracy}% accuracy` : 'No practice data'
  const weakList  = weakTopics.length > 0
    ? weakTopics.map(t => `<li style="margin-bottom:4px;">${esc(t.name)} — ${Number(t.score) || 0}% accuracy</li>`).join('')
    : '<li>No weak topics identified yet</li>'

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f6fa;margin:0;padding:24px;">
<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">
  <div style="background:linear-gradient(135deg,#0b1330,#1e2a6e);padding:28px 28px 20px;text-align:center;">
    <div style="width:40px;height:40px;border-radius:10px;background:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0b1330;margin-bottom:12px;">E</div>
    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:900;">${esc(studentName)}'s weekly report</h1>
    <p style="color:rgba(255,255,255,.6);margin:4px 0 0;font-size:13px;">Week of ${esc(weekOf)} · ${esc(examType)} · ${esc(subjects.slice(0,3).join(', '))}</p>
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
      <p style="font-size:11px;color:#9ca3af;margin:0;">ExamPrep · Sent to ${esc(parentEmail)}</p>
    </div>
  </div>
</div>
</body></html>`
}