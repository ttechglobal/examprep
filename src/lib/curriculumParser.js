export function parseCurriculum(rawText) {
  // Strip markdown fences
  let cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // Fix unescaped control characters inside JSON strings
  cleaned = cleaned.replace(
    /"((?:[^"\\]|\\.)*)"/g,
    (match) => match
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  )

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    try {
      const aggressive = cleaned
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/,\s*([}\]])/g, '$1')
      parsed = JSON.parse(aggressive)
    } catch (err2) {
      return { valid: false, errors: [`Invalid JSON: ${err2.message}`], data: null }
    }
  }

  const errors = []

  // Handle case where Claude wraps in an extra object
  if (parsed && !parsed.topics && parsed.curriculum) {
    parsed = parsed.curriculum
  }
  if (parsed && !parsed.topics && parsed.subject && typeof parsed === 'object') {
    // Already at right level but topics might be named differently
    const possibleTopicsKey = Object.keys(parsed).find(k =>
      k.toLowerCase().includes('topic') || Array.isArray(parsed[k])
    )
    if (possibleTopicsKey && possibleTopicsKey !== 'topics') {
      parsed.topics = parsed[possibleTopicsKey]
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Response is not a valid JSON object'], data: null }
  }

  if (!parsed.subject) errors.push("Missing 'subject' field")

  if (!parsed.topics) {
    errors.push("Missing 'topics' array — got keys: " + Object.keys(parsed).join(', '))
    return { valid: false, errors, data: null }
  }

  if (!Array.isArray(parsed.topics)) {
    errors.push(`'topics' must be an array, got: ${typeof parsed.topics}`)
    return { valid: false, errors, data: null }
  }

  if (parsed.topics.length === 0) {
    errors.push("'topics' array is empty")
    return { valid: false, errors, data: null }
  }

  const validExamTags = ['waec', 'jamb', 'both', 'WAEC', 'JAMB', 'BOTH']

  parsed.topics.forEach((topic, ti) => {
    const tLabel = `Topic ${ti + 1} ("${topic.title ?? topic.name ?? 'untitled'}")`

    // Support both 'title' and 'name' fields
    if (!topic.title && topic.name) topic.title = topic.name
    if (!topic.title?.trim()) errors.push(`${tLabel}: missing 'title'`)

    if (!topic.exam_tag) {
      // Default to BOTH if missing rather than erroring
      topic.exam_tag = 'BOTH'
    } else if (!validExamTags.includes(topic.exam_tag)) {
      errors.push(`${tLabel}: invalid exam_tag '${topic.exam_tag}' — must be WAEC, JAMB, or BOTH`)
    }

    if (!topic.subtopics) {
      errors.push(`${tLabel}: missing 'subtopics' array`)
      return
    }

    if (!Array.isArray(topic.subtopics)) {
      errors.push(`${tLabel}: 'subtopics' must be an array`)
      return
    }

    if (topic.subtopics.length === 0) {
      errors.push(`${tLabel}: has no subtopics`)
      return
    }

    topic.subtopics.forEach((sub, si) => {
      const sLabel = `${tLabel} → Subtopic ${si + 1} ("${sub.title ?? sub.name ?? 'untitled'}")`

      // Support both 'title' and 'name' fields
      if (!sub.title && sub.name) sub.title = sub.name

      if (!sub.title?.trim()) errors.push(`${sLabel}: missing 'title'`)

      if (!sub.exam_tag) {
        // Inherit from parent topic if missing
        sub.exam_tag = topic.exam_tag ?? 'BOTH'
      } else if (!validExamTags.includes(sub.exam_tag)) {
        errors.push(`${sLabel}: invalid exam_tag '${sub.exam_tag}'`)
      }

      if (!sub.objectives || !Array.isArray(sub.objectives) || sub.objectives.length === 0) {
        // Don't error — just default to empty array
        sub.objectives = []
      }
    })
  })

  if (errors.length > 0) return { valid: false, errors, data: null }

  const stats = {
    subject: parsed.subject,
    topicCount: parsed.topics.length,
    subtopicCount: parsed.topics.reduce((a, t) => a + (t.subtopics?.length ?? 0), 0),
    examScope: parsed.exam_scope ?? [],
  }

  return { valid: true, errors: [], data: parsed, stats }
}

export function buildCurriculumPrompt(subject, examType) {
  const examLabel =
    examType === 'WAEC' ? 'WAEC' :
    examType === 'JAMB' ? 'JAMB' :
    'WAEC and JAMB'

  return `You are an expert teacher and curriculum designer for Nigerian secondary school students (ages 14–18) preparing for ${examLabel}.

Subject: ${subject}

I am going to give you the official syllabus/curriculum document. Your job is to break it down into a structured JSON curriculum following these strict rules:

BREAKDOWN RULES:
- Break every topic into the smallest possible teachable subtopics
- Each subtopic must cover one single concept only — if a subtopic could reasonably be split into two lessons, split it
- A student should be able to fully understand each subtopic in one focused 10–15 minute lesson
- The order must be strictly progressive — each subtopic must build naturally on the one before it
- Never group multiple concepts into one subtopic just because they appear together in the syllabus
- Think like an expert teacher breaking a subject down for a struggling student — make every step as small and clear as possible
- Subtopic titles must be specific and descriptive — not vague. Bad: "Equations" Good: "Solving One-Step Linear Equations Using Addition and Subtraction"
- Each subtopic must have 2–4 tightly focused learning objectives
- Exam tag every subtopic correctly: "WAEC", "JAMB", or "BOTH"

QUALITY CHECK — before returning the JSON, verify:
- Could any subtopic be broken into two? If yes — break it
- Does the order make complete sense for a student learning from scratch?
- Is every subtopic title specific enough that a student knows exactly what they will learn?
- Does every subtopic have focused objectives?

Return ONLY valid JSON. No markdown, no explanation, no preamble. Use this exact structure:

{
  "subject": "${subject}",
  "exam_scope": ["${examType === 'BOTH' ? 'WAEC", "JAMB' : examType}"],
  "topics": [
    {
      "id": "topic_001",
      "title": "",
      "exam_tag": "BOTH",
      "subtopics": [
        {
          "id": "subtopic_001a",
          "title": "",
          "exam_tag": "BOTH",
          "objectives": [
            "Student will be able to...",
            "Student will understand..."
          ]
        }
      ]
    }
  ]
}`
}

export function buildSingleTopicPrompt(subjectName, examType, topicName) {
  const examLabel =
    examType === 'WAEC' ? 'WAEC' :
    examType === 'JAMB' ? 'JAMB' : 'WAEC and JAMB'

  return `You are an expert curriculum designer for Nigerian secondary school students preparing for ${examLabel}.

Subject: ${subjectName}

I need you to structure just ONE topic from the curriculum into JSON format.

Topic: ${topicName}

Break this topic into granular, progressive subtopics following these rules:
- Each subtopic covers one single concept — teachable in one 10–15 minute lesson
- Strictly progressive order — builds from basics upward
- Specific descriptive subtopic titles
- 2–4 focused learning objectives per subtopic
- Exam tag: "${examType}" on all subtopics

Return ONLY valid JSON. No markdown, no explanation:

{
  "topic_title": "${topicName}",
  "exam_tag": "${examType}",
  "subtopics": [
    {
      "id": "sub_001",
      "title": "",
      "exam_tag": "${examType}",
      "objectives": [
        "Student will be able to...",
        "Student will understand..."
      ]
    }
  ]
}`
}

export function parseSingleTopic(rawText) {
  let cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  cleaned = cleaned.replace(
    /"((?:[^"\\]|\\.)*)"/g,
    match => match
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  )

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    try {
      const aggressive = cleaned
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/,\s*([}\]])/g, '$1')
      parsed = JSON.parse(aggressive)
    } catch (err2) {
      return { valid: false, errors: [`Invalid JSON: ${err2.message}`], data: null }
    }
  }

  const errors = []

  if (!parsed.topic_title && !parsed.title) errors.push("Missing 'topic_title'")
  if (!parsed.subtopics || !Array.isArray(parsed.subtopics)) {
    errors.push("Missing 'subtopics' array")
    return { valid: false, errors, data: null }
  }
  if (parsed.subtopics.length === 0) {
    errors.push("'subtopics' is empty")
    return { valid: false, errors, data: null }
  }

  parsed.subtopics.forEach((sub, i) => {
    const title = sub.title ?? sub.name ?? ''
    if (!title.trim()) errors.push(`Subtopic ${i + 1}: missing title`)
    if (!sub.objectives || !Array.isArray(sub.objectives)) sub.objectives = []
    if (!sub.exam_tag) sub.exam_tag = parsed.exam_tag ?? 'BOTH'
  })

  if (errors.length > 0) return { valid: false, errors, data: null }

  return {
    valid: true,
    errors: [],
    data: parsed,
    stats: {
      topicTitle: parsed.topic_title ?? parsed.title,
      subtopicCount: parsed.subtopics.length,
    },
  }
}