// src/lib/questionParser.js
// ─────────────────────────────────────────────────────────────────────────────
// Parses and validates AI-extracted question JSON.
// Also provides matchTopicSubtopic — subtopic-first curriculum matching.
//
// matchTopicSubtopic change:
//   OLD: topic-first — only searched subtopics under a topic that scored >0.5
//        This caused systematic misses because exam curricula use different
//        topic names than the AI's topic_title suggestions.
//   NEW: subtopic-first — scores ALL subtopics across ALL topics directly
//        against the AI's subtopic_title. Parent topic is inferred from the
//        winning subtopic. The AI's raw topic_title / subtopic_title strings
//        are always passed through unchanged for display in the UI.
// ─────────────────────────────────────────────────────────────────────────────

// ── Image-reference detection ─────────────────────────────────────────────────
const IMAGE_TEXT_PATTERNS = [
  /\bdiagram\b/i,
  /\bfigure\b/i,
  /\billustration\b/i,
  /\bthe (image|picture|graph|chart|table) (above|below|shown|given)\b/i,
  /\brefer(ring)? to (the )?(image|diagram|figure|table)\b/i,
  /\busing the (information|data) (in|from) the (table|graph|chart)\b/i,
  /\bfrom the graph\b/i,
  /\bas shown (in|above|below)\b/i,
]

export function questionHasImage(q) {
  if (q.has_image === true) return true
  const text = (q.question_text ?? '').toLowerCase()
  return IMAGE_TEXT_PATTERNS.some(pat => pat.test(text))
}

// ── Prompt builders ───────────────────────────────────────────────────────────

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

// ── Parser + validator ────────────────────────────────────────────────────────

export function parseQuestions(rawText) {
  let cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // Fix unescaped control characters inside JSON strings
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

  const errors   = []
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
      q.difficulty = 'medium'
    }

    if (qErrors.length > 0) {
      errors.push(...qErrors)
    } else {
      validated.push(q)
    }
  })

  return {
    valid:  errors.length === 0,
    errors,
    questions: validated,
    stats: {
      total:   parsed.length,
      valid:   validated.length,
      invalid: parsed.length - validated.length,
    },
  }
}

// ── Subtopic-first curriculum matching ───────────────────────────────────────
//
// How it works:
//   1. Flatten ALL subtopics from all topics into one list.
//   2. Score q.subtopic_title against every subtopic name.
//   3. Best-scoring subtopic wins. Its parent topic is the matched topic.
//   4. A secondary topic-name bonus (×0.2) acts as a tiebreaker when two
//      subtopics score identically — it does not gate the search.
//
// Why subtopic-first beats topic-first:
//   The AI returns subtopic_title values that closely reflect the actual
//   concept tested (e.g. "Ohm's Law", "Newton's Second Law of Motion").
//   Curriculum topic names are broader and use different wording than the
//   AI's topic_title suggestions, so topic-first matching misses frequently.
//   Subtopic names are specific enough to match reliably.
//
// Confidence thresholds:
//   ≥ 0.7  → confirmed  (green, needsReview: false)
//   0.4–0.69 → low confidence (amber, needsReview: true, best guess shown)
//   < 0.4  → untagged  (red, must be set manually)
//
// The AI's raw topic_title + subtopic_title are always returned unchanged
// as aiTopicTitle / aiSubtopicTitle so the UI can display them.

export function matchTopicSubtopic(question, topics) {
  const qSubtopic = (question.subtopic_title ?? '').toLowerCase().trim()
  const qTopic    = (question.topic_title ?? '').toLowerCase().trim()

  let bestSubtopic  = null
  let bestTopic     = null
  let bestScore     = 0

  for (const topic of topics) {
    // Small bonus when topic name also matches — acts as tiebreaker only
    const topicBonus = stringSimilarity(qTopic, topic.name.toLowerCase()) * 0.2

    for (const sub of topic.subtopics ?? []) {
      const subScore = stringSimilarity(qSubtopic, sub.name.toLowerCase())
      const combined = subScore + topicBonus

      if (combined > bestScore) {
        bestScore    = combined
        bestSubtopic = sub
        bestTopic    = topic
      }
    }
  }

  // Clamp to [0,1] — the bonus can push slightly above 1
  const confidence = Math.min(bestScore, 1)

  // Below floor → treat as no match
  if (confidence < 0.4) {
    return {
      topic:          null,
      subtopic:       null,
      confidence:     0,
      needsReview:    true,
      aiTopicTitle:    question.topic_title    ?? '',
      aiSubtopicTitle: question.subtopic_title ?? '',
    }
  }

  return {
    topic:          bestTopic,
    subtopic:       bestSubtopic,
    confidence,
    needsReview:    confidence < 0.7,
    aiTopicTitle:    question.topic_title    ?? '',
    aiSubtopicTitle: question.subtopic_title ?? '',
  }
}

// ── String similarity ─────────────────────────────────────────────────────────
// Combines substring containment + word-overlap (Jaccard).
// Normalises punctuation so "Newton's Laws" matches "Newton Laws".

function stringSimilarity(a, b) {
  if (!a || !b) return 0

  const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const na = norm(a)
  const nb = norm(b)

  if (na === nb) return 1

  const longer  = na.length >= nb.length ? na : nb
  const shorter = na.length >= nb.length ? nb : na

  // Exact substring — strong signal
  if (longer.includes(shorter) && shorter.length > 3) {
    return shorter.length / longer.length
  }

  // Word overlap — Jaccard coefficient
  const aWords = new Set(na.split(/\s+/).filter(w => w.length > 1))
  const bWords = new Set(nb.split(/\s+/).filter(w => w.length > 1))
  const intersection = [...aWords].filter(w => bWords.has(w)).length
  const union = new Set([...aWords, ...bWords]).size

  return union === 0 ? 0 : intersection / union
}