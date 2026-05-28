// src/lib/videoLessonParser.js
// Prompt builder + JSON validator for video lesson packages
// Completely separate from lessonParser.js (text lessons)

// ── Prompt builder ────────────────────────────────────────────────────────────

export function buildVideoLessonPrompt({ subjectName, topicName, title, lessonType, examType }) {
  const examLabel =
    examType === 'WAEC' ? 'WAEC' :
    examType === 'JAMB' ? 'JAMB' :
    'WAEC and JAMB'

  const typeInstructions = {
    calculation: `This is a CALCULATION lesson (Mathematics or Physics-style).
- The video script must walk through a worked example step by step, writing on a board
- Show every calculation clearly — no skipped steps
- Use × for multiplication, ÷ for division, write fractions as numerator/denominator
- Practice questions must include numbers students can work with — not vague theory questions
- At least 6 of the 10 questions must involve actual calculations`,

    concept: `This is a CONCEPT EXPLANATION lesson (Biology, Chemistry theory, or descriptive topics).
- The video script must use real-life analogies a Nigerian student can relate to
- Use examples from everyday life: markets, football, cooking, farming, transport, body sensations
- Avoid jargon — if you must use a technical word, immediately explain it in plain English
- Practice questions should test understanding, not memorisation`,

    mixed: `This is a MIXED lesson (both concept explanation and calculation).
- Start by explaining the concept clearly with a real-life analogy
- Then move into a worked example that applies the concept
- Practice questions must include a mix: some test understanding, some require calculation`,
  }

  return `You are an expert teacher creating a VIDEO LESSON PACKAGE for Nigerian secondary school students (ages 14–18) preparing for ${examLabel}.

Subject: ${subjectName}
Topic: ${topicName}
Lesson Title: ${title}
Lesson Type: ${lessonType.toUpperCase()}

${typeInstructions[lessonType] ?? typeInstructions.concept}

LANGUAGE RULES — strictly follow these:
- Write as if speaking TO the student, not about them. Use "you", "we", "let's"
- Maximum 20 words per sentence — short, punchy, clear
- Zero jargon without immediate plain-English explanation
- NO LaTeX, NO $$, NO double dollar signs anywhere
- Use × for multiplication, use ÷ for division
- Write fractions as: numerator/denominator (e.g. 3/4, not \\frac{3}{4})

VIDEO SCRIPT RULES:
- hook: 2–3 sentences. Open with a real-life Nigerian situation that leads into the topic. Grab attention immediately. Do NOT say "today we'll learn about..." — just start the scene.
- step_by_step_explanation: The main body of the video. Build understanding one idea at a time. Short paragraphs. Each paragraph is one idea.
- worked_example: Walk through a specific example. For calculation topics, show every step. For concept topics, apply the idea to a concrete scenario.
- summary: 3–4 short bullet points. What the student now knows. End with one encouraging sentence.

PRACTICE QUESTIONS RULES:
- 10 questions total: 3 easy, 4 medium, 2 hard, 1 mixed/tricky
- Every question must be multiple choice (A, B, C, D)
- Questions must be clearly written — a student reading alone should understand them immediately
- correct_explanation: 2–3 sentences. Explain WHY the answer is correct in plain English. No assumptions.
- wrong_explanations: For EVERY wrong option, explain in 1–2 sentences exactly why it is wrong. Be specific — don't just say "this is incorrect". Tell the student what mistake leads to that answer.
- difficulty guide:
  - easy: direct recall or one-step application
  - medium: two-step or requires combining ideas
  - hard: exam-style, may have a twist or require deeper reasoning
  - mixed: could be any difficulty — often the "trap" question

Return ONLY valid JSON. No markdown, no explanation, no preamble.

{
  "lesson_title": "${title}",
  "exam_type": "${examType}",
  "subject": "${subjectName}",
  "topic": "${topicName}",
  "lesson_type": "${lessonType}",
  "tags": ["${subjectName.toLowerCase()}", "${topicName.toLowerCase().replace(/\s+/g, '-')}"],

  "video_script": {
    "hook": "",
    "step_by_step_explanation": "",
    "worked_example": "",
    "summary": ""
  },

  "visual_directions": [
    "Visual direction 1 — describe exactly what should be shown on screen",
    "Visual direction 2",
    "Visual direction 3"
  ],

  "practice_questions": [
    {
      "question": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "A",
      "difficulty": "easy",
      "correct_explanation": "",
      "wrong_explanations": { "B": "", "C": "", "D": "" }
    },
    {
      "question": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "B",
      "difficulty": "easy",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "C": "", "D": "" }
    },
    {
      "question": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "C",
      "difficulty": "easy",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "B": "", "D": "" }
    },
    {
      "question": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "A",
      "difficulty": "medium",
      "correct_explanation": "",
      "wrong_explanations": { "B": "", "C": "", "D": "" }
    },
    {
      "question": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "B",
      "difficulty": "medium",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "C": "", "D": "" }
    },
    {
      "question": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "C",
      "difficulty": "medium",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "B": "", "D": "" }
    },
    {
      "question": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "D",
      "difficulty": "medium",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "B": "", "C": "" }
    },
    {
      "question": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "A",
      "difficulty": "hard",
      "correct_explanation": "",
      "wrong_explanations": { "B": "", "C": "", "D": "" }
    },
    {
      "question": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "B",
      "difficulty": "hard",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "C": "", "D": "" }
    },
    {
      "question": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "C",
      "difficulty": "mixed",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "B": "", "D": "" }
    }
  ]
}`
}

// ── Validator ─────────────────────────────────────────────────────────────────

export function parseVideoLesson(rawText) {
  let cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // Fix unescaped control chars inside strings
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
      return { valid: false, errors: [`Invalid JSON: ${err2.message}`], lesson: null }
    }
  }

  const errors = []

  if (!parsed.lesson_title) errors.push("Missing 'lesson_title'")
  if (!parsed.video_script) {
    errors.push("Missing 'video_script'")
  } else {
    if (!parsed.video_script.hook) errors.push("video_script: missing 'hook'")
    if (!parsed.video_script.step_by_step_explanation) errors.push("video_script: missing 'step_by_step_explanation'")
    if (!parsed.video_script.worked_example) errors.push("video_script: missing 'worked_example'")
    if (!parsed.video_script.summary) errors.push("video_script: missing 'summary'")
  }

  if (!Array.isArray(parsed.visual_directions) || parsed.visual_directions.length === 0) {
    errors.push("Missing 'visual_directions' array")
  }

  if (!Array.isArray(parsed.practice_questions)) {
    errors.push("Missing 'practice_questions' array")
  } else {
    if (parsed.practice_questions.length < 8) {
      errors.push(`practice_questions: expected at least 8, got ${parsed.practice_questions.length}`)
    }
    parsed.practice_questions.forEach((q, i) => {
      const label = `Question ${i + 1}`
      if (!q.question) errors.push(`${label}: missing 'question'`)
      if (!q.options?.A) errors.push(`${label}: missing option A`)
      if (!q.options?.B) errors.push(`${label}: missing option B`)
      if (!q.options?.C) errors.push(`${label}: missing option C`)
      if (!q.options?.D) errors.push(`${label}: missing option D`)
      if (!q.correct_answer) errors.push(`${label}: missing 'correct_answer'`)
      if (!q.difficulty) errors.push(`${label}: missing 'difficulty'`)
      if (!q.correct_explanation) errors.push(`${label}: missing 'correct_explanation'`)
      if (!q.wrong_explanations) errors.push(`${label}: missing 'wrong_explanations'`)
    })
  }

  if (errors.length > 0) return { valid: false, errors, lesson: null }

  const difficulties = parsed.practice_questions.map(q => q.difficulty)
  const stats = {
    total: parsed.practice_questions.length,
    easy:   difficulties.filter(d => d === 'easy').length,
    medium: difficulties.filter(d => d === 'medium').length,
    hard:   difficulties.filter(d => d === 'hard').length,
    mixed:  difficulties.filter(d => d === 'mixed').length,
    visualDirections: parsed.visual_directions.length,
  }

  return { valid: true, errors: [], lesson: parsed, stats }
}