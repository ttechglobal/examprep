// src/lib/server/topicFrequency.js
// How often each topic of a subject appears across past papers, ranked.
// One source for the admin Topic Frequency page, the past-questions coverage
// chart and the weekly battle missions, so they always agree.
//
// Wraps topic_frequency() (20261009_frequency_and_missions.sql): a GROUP BY in
// Postgres, so it isn't capped at Supabase's 1,000 returned rows.
//
// Subjects are one row per exam, so `exam` defaults to the subject's own.

export async function getTopicFrequency(db, subjectId, exam = null) {
  let examType = exam
  if (!examType || examType === 'ALL') {
    const { data: subject, error } = await db
      .from('subjects').select('exam_type').eq('id', subjectId).maybeSingle()
    if (error) throw error
    examType = subject?.exam_type ?? 'WAEC'
  }

  const { data, error } = await db.rpc('topic_frequency', { p_subject_id: subjectId, p_exam: examType })
  if (error) throw error

  const topics = (data ?? []).map(t => ({
    topic_id:       t.topic_id,
    topic_name:     t.topic_name,
    order_index:    t.order_index,
    past_count:     Number(t.past_count) || 0,
    years_appeared: Number(t.years_appeared) || 0,
    total_years:    Number(t.total_years) || 0,
    share_pct:      Number(t.share_pct) || 0,
    bank_count:     Number(t.bank_count) || 0,
    rank:           Number(t.rank) || 0,
  }))

  return {
    exam: examType,
    total_years: topics[0]?.total_years ?? 0,
    total_questions: topics.reduce((sum, t) => sum + t.past_count, 0),
    topics,
  }
}
