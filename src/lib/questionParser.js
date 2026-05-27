export function buildQuestionPrompt(examType, subjectName) {
  return `You are an expert teacher and exam question analyst for Nigerian secondary school education.
Exam: ${examType}
Subject: ${subjectName}

I am going to give you a set of past exam questions. For each question, do the following:

EXTRACT AND STRUCTURE:
- Extract the full question text exactly as written
- Extract all answer options (A, B, C, D) exactly as written
- Identify the correct answer
- If the question has a diagram or image, note it with "has_image": true and describe what the image shows in "image_description"

EXPLAIN — keep explanations concise but complete:
- Correct answer: explain clearly why this is correct — simple, direct language, 2–4 sentences maximum
- For maths and science calculations: show full step-by-step workings — no skipped steps, well formatted, every formula shown and applied, every variable defined. Format as numbered steps.
- Wrong options: for each wrong option, one clear sentence explaining why it is incorrect.

TAG TO CURRICULUM TOPIC:
- Map each question to the most relevant topic and subtopic from this subject's curriculum
- Use the topic and subtopic titles to identify the mapping — be specific, not broad
- If a question spans multiple subtopics, pick the primary one

FORMATTING RULES — strictly enforced:
- NO LaTeX, NO double dollar signs ($$), NO \\frac, NO \\times
- Use × for multiplication, ÷ for division, → for arrows
- Write fractions as numerator/denominator or in clean readable format
- All steps numbered and on separate lines
- No walls of text — short clear sentences throughout

Return ONLY valid JSON array. No markdown, no explanation, no preamble:

[
  {
    "exam": "${examType}",
    "subject": "${subjectName}",
    "year": "",
    "question_text": "",
    "has_image": false,
    "image_description": "",
    "options": {
      "A": "",
      "B": "",
      "C": "",
      "D": ""
    },
    "correct_answer": "A",
    "explanation": {
      "correct": "",
      "workings": [
        { "step": 1, "instruction": "" }
      ],
      "wrong_options": {
        "A": "",
        "B": "",
        "C": "",
        "D": ""
      }
    },
    "topic_title": "",
    "subtopic_title": "",
    "difficulty": "medium",
    "question_type": "objective"
  }
]`
}

export function buildImageQuestionPrompt(examType, subjectName) {
  return `You are an expert teacher analysing a Nigerian secondary school exam question that contains a diagram.
Exam: ${examType}
Subject: ${subjectName}

Look at the image carefully and:
1. Describe exactly what the diagram shows
2. Extract the full question text
3. Extract all answer options A–D
4. Identify the correct answer
5. Solve with full step-by-step workings — no skipped steps
6. Explain why each wrong option is incorrect
7. Tag to the most relevant topic and subtopic

FORMATTING RULES:
- NO LaTeX, NO $$, NO \\frac — use plain text maths
- Use × for multiplication, ÷ for division
- Numbered steps, short sentences

Return ONLY valid JSON using this structure:

{
  "exam": "${examType}",
  "subject": "${subjectName}",
  "year": "",
  "question_text": "",
  "has_image": true,
  "image_description": "",
  "options": { "A": "", "B": "", "C": "", "D": "" },
  "correct_answer": "A",
  "explanation": {
    "correct": "",
    "workings": [{ "step": 1, "instruction": "" }],
    "wrong_options": { "A": "", "B": "", "C": "", "D": "" }
  },
  "topic_title": "",
  "subtopic_title": "",
  "difficulty": "medium",
  "question_type": "objective"
}`
}

export function parseQuestions(rawText) {
  // Strip markdown fences
  let cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // Fix unescaped control characters
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
      return { valid: false, errors: [`Invalid JSON: ${err2.message}`], questions: [] }
    }
  }

  if (!Array.isArray(parsed)) {
    return { valid: false, errors: ['Response must be a JSON array of questions'], questions: [] }
  }

  const errors = []
  const validated = []

  parsed.forEach((q, i) => {
    const qErrors = []
    const label = `Question ${i + 1}`

    if (!q.question_text?.trim()) qErrors.push(`${label}: missing question_text`)
    if (!q.options?.A) qErrors.push(`${label}: missing option A`)
    if (!q.options?.B) qErrors.push(`${label}: missing option B`)
    if (!q.options?.C) qErrors.push(`${label}: missing option C`)
    if (!q.options?.D) qErrors.push(`${label}: missing option D`)
    if (!q.correct_answer) qErrors.push(`${label}: missing correct_answer`)
    if (!q.explanation?.correct) qErrors.push(`${label}: missing explanation.correct`)
    if (!q.topic_title?.trim()) qErrors.push(`${label}: missing topic_title`)
    if (!q.subtopic_title?.trim()) qErrors.push(`${label}: missing subtopic_title`)
    if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
      q.difficulty = 'medium' // default
    }

    if (qErrors.length > 0) {
      errors.push(...qErrors)
    } else {
      validated.push(q)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    questions: validated,
    stats: {
      total: parsed.length,
      valid: validated.length,
      invalid: parsed.length - validated.length,
    },
  }
}

export function matchTopicSubtopic(question, topics) {
  // Try to find matching topic + subtopic from curriculum
  let matchedTopic = null
  let matchedSubtopic = null
  let matchScore = 0

  for (const topic of topics) {
    const topicScore = stringSimilarity(
      question.topic_title?.toLowerCase() ?? '',
      topic.name.toLowerCase()
    )

    if (topicScore > 0.5) {
      for (const sub of topic.subtopics ?? []) {
        const subScore = stringSimilarity(
          question.subtopic_title?.toLowerCase() ?? '',
          sub.name.toLowerCase()
        )
        const combined = (topicScore + subScore) / 2
        if (combined > matchScore) {
          matchScore = combined
          matchedTopic = topic
          matchedSubtopic = sub
        }
      }
    }
  }

  return {
    topic: matchedTopic,
    subtopic: matchedSubtopic,
    confidence: matchScore,
    needsReview: matchScore < 0.7,
  }
}

function stringSimilarity(a, b) {
  if (a === b) return 1
  if (!a || !b) return 0
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  if (longer.includes(shorter)) return shorter.length / longer.length
  // Simple word overlap
  const aWords = new Set(a.split(/\s+/))
  const bWords = new Set(b.split(/\s+/))
  const intersection = [...aWords].filter(w => bWords.has(w)).length
  const union = new Set([...aWords, ...bWords]).size
  return intersection / union
}