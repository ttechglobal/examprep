// src/app/api/student/notifications/route.js
// In-app notification system for ExamPrep students.
//
// Notification types:
//   streak_reminder   — "You haven't practiced today yet"
//   weak_topic        — "Your weakest topic this week: [topic]"
//   milestone         — "You've answered 100 questions!"
//   download_reminder — "Download questions for offline practice"
//   weekly_summary    — "Your week in review"
//   school_event      — "School sent a message" (future)
//
// Storage: student_notifications table (see SQL below)
// GET  — fetch unread + recent notifications for the student
// POST — mark notification(s) as read
// PUT  — generate/refresh contextual notifications (called after login)
//
// SQL to run in Supabase:
// ─────────────────────────────────────────────────────────────────
// CREATE TABLE IF NOT EXISTS student_notifications (
//   id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   student_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE,
//   type        text NOT NULL,
//   title       text NOT NULL,
//   body        text NOT NULL,
//   action_url  text,
//   is_read     boolean DEFAULT false,
//   created_at  timestamptz DEFAULT now()
// );
// CREATE INDEX IF NOT EXISTS idx_notif_student ON student_notifications(student_id, is_read, created_at DESC);
// ALTER TABLE student_notifications ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "students read own" ON student_notifications FOR SELECT USING (auth.uid() = student_id);
// CREATE POLICY "students update own" ON student_notifications FOR UPDATE USING (auth.uid() = student_id);
// -- Service role handles inserts (PUT endpoint uses service role)
// ─────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function today() { return new Date().toISOString().slice(0, 10) }

// ── GET — fetch recent notifications ──────────────────────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('student_notifications')
    .select('id, type, title, body, action_url, is_read, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const notifications = data ?? []
  return NextResponse.json({
    notifications,
    unread_count: notifications.filter(n => !n.is_read).length,
  })
}

// ── POST — mark notifications as read ─────────────────────────────────────────
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids, mark_all } = await request.json()

  if (mark_all) {
    await supabase
      .from('student_notifications')
      .update({ is_read: true })
      .eq('student_id', user.id)
      .eq('is_read', false)
  } else if (Array.isArray(ids) && ids.length) {
    await supabase
      .from('student_notifications')
      .update({ is_read: true })
      .eq('student_id', user.id)
      .in('id', ids)
  }

  return NextResponse.json({ ok: true })
}

// ── PUT — generate contextual notifications for the student ───────────────────
// Call this after login / once per day. It checks the student's state
// and inserts relevant nudges. Idempotent — won't duplicate same-day notifs.
export async function PUT() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = svc()
  const todayStr = today()
  const newNotifs = []

  // Get student profile + recent activity
  const [{ data: profile }, { data: recentAttempts }, { data: weakTopics }, { data: streak }] = await Promise.all([
    db.from('profiles').select('full_name, streak_days, total_points, subjects').eq('id', user.id).single(),
    db.from('question_attempts').select('created_at').eq('student_id', user.id)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).limit(100),
    db.from('student_topic_mastery').select('topic_id, score, topics(name)').eq('student_id', user.id)
      .order('score', { ascending: true }).limit(3),
    db.from('student_streaks').select('current_streak, last_active_date').eq('student_id', user.id).maybeSingle(),
  ])

  // Check what notifs were already sent today to avoid duplicates
  const { data: todayNotifs } = await db
    .from('student_notifications')
    .select('type')
    .eq('student_id', user.id)
    .gte('created_at', todayStr + 'T00:00:00Z')

  const sentToday = new Set((todayNotifs ?? []).map(n => n.type))

  // 1. Streak reminder — no practice today yet
  const practicedToday = (recentAttempts ?? []).some(a => a.created_at?.slice(0, 10) === todayStr)
  if (!practicedToday && !sentToday.has('streak_reminder')) {
    const currentStreak = streak?.current_streak ?? 0
    newNotifs.push({
      student_id: user.id,
      type:       'streak_reminder',
      title:      currentStreak > 0 ? `Keep your ${currentStreak}-day streak going! 🔥` : 'Practice makes perfect 📚',
      body:       currentStreak > 0
        ? `You haven't practiced today yet. Answer 5 questions to keep your streak alive.`
        : `Start your daily practice session — even 5 questions makes a difference.`,
      action_url: '/student/practice',
    })
  }

  // 2. Weak topic alert — if any topic is below 40%
  const weakTopic = (weakTopics ?? []).find(t => (t.score ?? 100) < 40)
  if (weakTopic && !sentToday.has('weak_topic')) {
    const name = weakTopic.topics?.name ?? 'a topic'
    newNotifs.push({
      student_id: user.id,
      type:       'weak_topic',
      title:      `Weak area: ${name} ⚠️`,
      body:       `Your score on ${name} is ${weakTopic.score ?? 0}%. A focused 10-minute session could make a real difference.`,
      action_url: '/student/practice',
    })
  }

  // 3. Milestone — total questions answered
  const totalAttempts = (recentAttempts ?? []).length
  const milestones = [10, 25, 50, 100, 200, 500]
  // Check if they just crossed a milestone this week
  const { data: allAttempts } = await db
    .from('question_attempts').select('id', { count: 'exact', head: true }).eq('student_id', user.id)
  const allCount = allAttempts ?? 0
  const crossedMilestone = milestones.find(m => allCount >= m && (allCount - totalAttempts) < m)
  if (crossedMilestone && !sentToday.has('milestone')) {
    newNotifs.push({
      student_id: user.id,
      type:       'milestone',
      title:      `You've answered ${crossedMilestone} questions! 🎉`,
      body:       `That's a great achievement. Keep going — consistency is what separates the A students.`,
      action_url: '/student/dashboard',
    })
  }

  // Insert new notifications
  if (newNotifs.length) {
    await db.from('student_notifications').insert(newNotifs)
  }

  return NextResponse.json({ generated: newNotifs.length, types: newNotifs.map(n => n.type) })
}