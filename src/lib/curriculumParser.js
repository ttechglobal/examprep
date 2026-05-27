export function parseCurriculum(rawText) {
  let cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // Fix unescaped control characters inside JSON strings
  cleaned = cleaned.replace(
    /"((?:[^"\\]|\\.)*)"/g,
    (match) => {
      return match
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
    }
  )

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    // Second attempt — aggressive cleaning
    try {
      const aggressive = cleaned
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/,\s*([}\]])/g, '$1')
      parsed = JSON.parse(aggressive)
    } catch (err2) {
      return { valid: false, errors: [`Invalid JSON: ${err2.message}`], data: null }
    }
  }

  const validExamTags = ['waec', 'jamb', 'both', 'WAEC', 'JAMB', 'BOTH']

  parsed.topics.forEach((topic, ti) => {
    const tLabel = `Topic ${ti + 1} ("${topic.title ?? 'untitled'}")`

    if (!topic.title?.trim()) errors.push(`${tLabel}: missing 'title'`)
    if (!topic.exam_tag) errors.push(`${tLabel}: missing 'exam_tag'`)
    else if (!validExamTags.includes(topic.exam_tag)) {
      errors.push(`${tLabel}: invalid exam_tag '${topic.exam_tag}' — must be waec, jamb, or both`)
    }

    if (!topic.subtopics || !Array.isArray(topic.subtopics)) {
      errors.push(`${tLabel}: missing 'subtopics' array`)
      return
    }
    if (topic.subtopics.length === 0) {
      errors.push(`${tLabel}: has no subtopics`)
    }

    topic.subtopics.forEach((sub, si) => {
      const sLabel = `${tLabel} → Subtopic ${si + 1} ("${sub.title ?? 'untitled'}")`
      if (!sub.title?.trim()) errors.push(`${sLabel}: missing 'title'`)
      if (!sub.exam_tag) errors.push(`${sLabel}: missing 'exam_tag'`)
      else if (!validExamTags.includes(sub.exam_tag)) {
        errors.push(`${sLabel}: invalid exam_tag '${sub.exam_tag}'`)
      }
      if (!sub.objectives || !Array.isArray(sub.objectives) || sub.objectives.length === 0) {
        errors.push(`${sLabel}: missing or empty 'objectives' array`)
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

// Build the AI prompt dynamically
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
- The order must be strictly progressive — each subtopic must build naturally on the one before it. A student should never encounter a concept before it has been introduced
- Never group multiple concepts into one subtopic just because they appear together in the syllabus
- Think like an expert teacher breaking a subject down for a struggling student — make every step as small and clear as possible
- Subtopic titles must be specific and descriptive — not vague. Bad example: "Equations." Good example: "Solving One-Step Linear Equations Using Addition and Subtraction"
- Each subtopic must have 2–4 tightly focused learning objectives — if you find yourself writing more than 4, the subtopic is too broad and must be split further
- Exam tag every subtopic correctly: "WAEC", "JAMB", or "BOTH"

QUALITY CHECK — before returning the JSON, verify:
- Could any subtopic be broken into two? If yes — break it
- Does the order make complete sense for a student learning from scratch? If not — reorder
- Is every subtopic title specific enough that a student knows exactly what they will learn? If not — rewrite it
- Does every subtopic have focused objectives (not broad ones)? If not — tighten them

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