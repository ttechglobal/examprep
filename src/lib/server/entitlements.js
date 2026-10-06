// src/lib/server/entitlements.js
// Server side of the Free / Premium rules (lib/plans.js): reads a student's
// plan, counts daily uses, and decides whether a question request may run.
// The app shows locks before a student gets here; this is what makes them
// real (another device, an old app version, a hand-made request).
// Needs 20261005_plans.sql (run before deploying).

import { planStatus, practiceFeature, FEATURES, DAILY_FEATURES, TRIAL_DAYS } from '@/lib/plans'
import { appDay } from '@/lib/dates'
import { listSubjectTopics } from '@/lib/server/subjectTopics'

const REF_RE = /^[A-Za-z0-9_-]{8,64}$/

/** The signed-in student's plan status (lib/plans.js planStatus). */
export async function loadPlanStatus(db, userId) {
  const { data, error } = await db.from('profiles')
    .select('plan, plan_expires_at, trial_ends_at').eq('id', userId).maybeSingle()
  if (error) throw error
  return planStatus(data ?? {})
}

/** Today's uses of each daily-limited feature: { custom: 1, battle: 0 }. */
export async function loadUsageToday(db, userId) {
  const usage = Object.fromEntries(DAILY_FEATURES.map(key => [key, 0]))
  const { data, error } = await db.from('feature_usage')
    .select('feature').eq('student_id', userId).eq('day', appDay())
  if (error) throw error
  for (const row of data ?? []) if (row.feature in usage) usage[row.feature]++
  return usage
}

function denial(feature, reason, { guest, limit } = {}) {
  const name = feature === 'topic' ? 'This topic' : FEATURES[feature]?.name ?? 'This'
  const error = reason === 'limit'
    ? `You've used today's free ${name === 'Battle' ? `battles (${limit})` : `${name} session`}. Go Premium for unlimited, or come back tomorrow.`
    : guest
      ? `${name} is part of Premium. Create a free account to get ${TRIAL_DAYS} days of Premium.`
      : `${name} is part of Premium.`
  return { ok: false, status: 403, body: { error, code: reason === 'limit' ? 'daily_limit' : 'premium_required', feature, limit: limit ?? null } }
}

/**
 * May this question request run? Called by GET /api/student/questions.
 *   userId   signed-in student, or null for a guest
 *   ref      the session/match id (daily features count once per ref)
 * → { ok: true, maxCount? } or { ok: false, status, body }
 *
 * Guests: Premium-only features and locked topics are refused; their daily
 * limits are counted on their device (they have no account to count against).
 */
export async function checkQuestionAccess(db, { userId, mode, topicId, exam, ref }) {
  const feature = practiceFeature({ mode, topicId })
  const guest   = !userId
  const status  = guest ? planStatus({ isGuest: true }) : await loadPlanStatus(db, userId)
  if (status.premium) return { ok: true }

  const rule = FEATURES[feature]
  if (rule?.premiumOnly) return denial(feature, 'premium', { guest })

  // A single topic outside the free ones is locked in every mode but battle.
  if (topicId && mode !== 'battle') {
    const { data: topic, error } = await db.from('topics').select('subject_id').eq('id', topicId).maybeSingle()
    if (error) throw error
    if (topic) {
      const topics = await listSubjectTopics(db, topic.subject_id, exam)
      if (!topics.find(t => t.id === topicId)?.free) return denial('topic', 'premium', { guest })
    }
  }

  if (feature === 'quick5') return { ok: true, maxCount: 5 }

  if (rule?.freePerDay && !guest) {
    if (!REF_RE.test(ref ?? '')) {
      return { ok: false, status: 400, body: { error: 'Please refresh the app to start this session.', code: 'update_required' } }
    }
    const { data, error } = await db.rpc('use_feature', {
      p_student: userId, p_feature: feature, p_ref: ref, p_limit: rule.freePerDay,
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    if (!row?.allowed) return denial(feature, 'limit', { limit: rule.freePerDay })
  }
  return { ok: true }
}
