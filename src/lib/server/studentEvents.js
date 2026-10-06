// src/lib/server/studentEvents.js
// Records what Analytics needs and the other tables don't keep (session
// starts and completions, flashcard decks opened, upgrade-sheet views):
// student_events, 20261008_analytics.sql. Server only.
//
// recordAfterResponse() writes once the response has been sent (Next.js
// after()), so recording never slows a student down. A failure is logged,
// never shown: losing one analytics row must not break practice. Events with
// the same student, event and ref are stored once, so retries are harmless.

import { after } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'

const EVENTS = new Set(['session_start', 'session_complete', 'flashcards_open', 'upgrade_view', 'upgrade_click'])

export async function recordEvent(db, { studentId, event, feature = null, ref = null, detail = {} }) {
  if (!studentId || !EVENTS.has(event)) return
  const { error } = await db.rpc('record_student_event', {
    p_student: studentId, p_event: event, p_feature: feature, p_ref: ref, p_detail: detail,
  })
  if (error) console.error('[studentEvents]', event, error.message)
}

export function recordAfterResponse(event) {
  if (!event?.studentId) return
  after(() => recordEvent(supabaseAdmin(), event))
}
