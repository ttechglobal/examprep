// src/lib/server/subjectTopics.js
// A subject's practice topics for one exam: the topics that have at least one
// active question, in curriculum order (order_index), with question counts.
// `free` marks the ones open on the Free plan (lib/plans.js: the first five).
//
// Used by GET /api/student/topics (the topic picker) and by the questions API
// to check a Free student's topic, so both always agree on which are free.

import { isFreeTopic } from '@/lib/plans'

export async function listSubjectTopics(db, subjectId, exam) {
  const [topicsRes, countsRes] = await Promise.all([
    db.from('topics')
      .select('id, name, order_index, exam_type')
      .eq('subject_id', subjectId)
      .order('order_index', { ascending: true }),
    db.rpc('topic_question_counts', { p_subject_id: subjectId, p_exam: exam }),
  ])
  if (topicsRes.error) throw topicsRes.error
  if (countsRes.error) throw countsRes.error

  const countMap = {}
  for (const c of countsRes.data ?? []) countMap[c.topic_id] = Number(c.question_count) || 0

  return (topicsRes.data ?? [])
    .filter(t => !t.exam_type || t.exam_type === exam || t.exam_type === 'BOTH')
    .filter(t => (countMap[t.id] ?? 0) > 0)
    .map((t, position) => ({
      id:             t.id,
      name:           t.name,
      order_index:    t.order_index,
      exam_type:      t.exam_type,
      question_count: countMap[t.id],
      free:           isFreeTopic(position),
    }))
}
