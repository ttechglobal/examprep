const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function selectedTopicIds(params) {
  const raw = params.get('topic_ids') || params.get('topic_id') || ''
  const ids = [...new Set(raw.split(',').map(id => id.trim()).filter(Boolean))]
  if (ids.length > 12 || ids.some(id => !UUID.test(id))) throw new Error('Invalid topic_ids')
  return ids
}

// Preserve the existing database filters for every topic. A failed pool must
// fail the request rather than silently dropping a player's chosen topic.
export async function loadQuestionPool(db, { subjectIds, exam, topicIds, excludeIds, count }) {
  const pools = await Promise.all((topicIds.length ? topicIds : [null]).map(id => db.rpc('get_practice_questions', {
    p_subject_ids: subjectIds,
    p_exam: exam,
    p_topic_id: id,
    p_exclude: excludeIds.length ? excludeIds : null,
    p_pool: Math.min(count * 3, 300),
    p_year_spread: count > 5,
  })))
  const error = pools.find(result => result.error)?.error
  if (error) throw error
  return [...new Map(pools.flatMap(result => result.data ?? []).filter(Boolean).map(q => [q.id, q])).values()]
}
