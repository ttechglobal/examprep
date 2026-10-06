// A match fetches its full question set before the countdown. The question
// counter cannot shrink or declare the final round while a batch is in flight.
export function battleQuestionParams(config, timestamp = Date.now()) {
  const params = new URLSearchParams({mode:'battle',exam:config.exam || 'WAEC',count:String(config.count || 10),_t:String(timestamp)})
  if (config.subject_id) params.set('subject_id',config.subject_id)
  else if (config.subject_name) params.set('subjects',config.subject_name)
  if (config.topic_ids?.length) params.set('topic_ids',config.topic_ids.join(','))
  else if (config.topic_id) params.set('topic_id',config.topic_id)
  if (config._exclude) params.set('exclude',config._exclude)
  if (config.ref) params.set('ref',config.ref)   // Free plan: one daily use per match
  return params
}
