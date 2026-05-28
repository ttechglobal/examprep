// ─────────────────────────────────────────────────────────────────────────────
// lessonParser.js
// Validates, parses, and builds prompts for the slide-based lesson schema.
// Replaces the old sections-based schema entirely.
// ─────────────────────────────────────────────────────────────────────────────

export const SLIDE_TYPES = [
  'hook',
  'definition',
  'concept',
  'formula',
  'interaction',
  'worked_example',
  'end_quiz',
  'summary',
  // real_life kept for backward compat only — not generated in new lessons
  'real_life',
]

// ── Per-type validators ───────────────────────────────────────────────────────

function validateSlide(slide, index) {
  const errors = []
  const id = `Slide ${index + 1} (${slide.type})`

  switch (slide.type) {
    case 'hook':
      if (!slide.body?.trim()) errors.push(`${id}: missing 'body'`)
      break

    case 'definition':
      if (!slide.term?.trim()) errors.push(`${id}: missing 'term'`)
      if (!slide.definition?.trim()) errors.push(`${id}: missing 'definition'`)
      if (!Array.isArray(slide.examples) || slide.examples.length === 0)
        errors.push(`${id}: 'examples' must be a non-empty array`)
      break

    case 'real_life':
      // backward compat — no strict validation
      break

    case 'concept':
      if (!slide.heading?.trim()) errors.push(`${id}: missing 'heading'`)
      if (!slide.body?.trim()) errors.push(`${id}: missing 'body'`)
      // examples is optional but encouraged
      // image block is optional — but if present, validate intent_type
      if (slide.image && slide.image.intent_type) {
        const validIntents = ['concept_visual','real_life_example','process_diagram','comparison_visual','formula_diagram','intuition_builder','memory_aid','experiment_visual']
        if (!validIntents.includes(slide.image.intent_type))
          errors.push(`${id}: image.intent_type '${slide.image.intent_type}' is not valid`)
      }
      break

    case 'formula':
      if (!slide.label?.trim()) errors.push(`${id}: missing 'label'`)
      if (!slide.formula?.trim()) errors.push(`${id}: missing 'formula'`)
      if (!slide.plain_english?.trim()) errors.push(`${id}: missing 'plain_english'`)
      if (!Array.isArray(slide.variables) || slide.variables.length === 0)
        errors.push(`${id}: 'variables' must be a non-empty array`)
      else {
        slide.variables.forEach((v, vi) => {
          if (!v.symbol?.trim()) errors.push(`${id}: variable ${vi + 1} missing 'symbol'`)
          if (!v.meaning?.trim()) errors.push(`${id}: variable ${vi + 1} missing 'meaning'`)
        })
      }
      break

    case 'interaction':
      if (!slide.question?.trim()) errors.push(`${id}: missing 'question'`)
      if (!Array.isArray(slide.options) || slide.options.length < 2)
        errors.push(`${id}: 'options' must have at least 2 items`)
      if (!slide.correct?.trim()) errors.push(`${id}: missing 'correct'`)
      if (!slide.feedback_correct?.trim()) errors.push(`${id}: missing 'feedback_correct'`)
      if (!slide.feedback_wrong?.trim()) errors.push(`${id}: missing 'feedback_wrong'`)
      break

    case 'worked_example':
      if (!slide.mode) errors.push(`${id}: missing 'mode' — must be 'guided' or 'student_attempt'`)
      else if (!['guided', 'student_attempt'].includes(slide.mode))
        errors.push(`${id}: 'mode' must be 'guided' or 'student_attempt'`)
      if (!slide.problem?.trim()) errors.push(`${id}: missing 'problem'`)
      if (!Array.isArray(slide.steps)) errors.push(`${id}: missing 'steps' array`)
      if (!slide.final_answer?.trim()) errors.push(`${id}: missing 'final_answer'`)
      if (slide.mode === 'student_attempt') {
        if (!slide.reveal_delay_seconds)
          errors.push(`${id}: student_attempt must have 'reveal_delay_seconds' (use 8)`)
      }
      break

    case 'end_quiz':
      if (!Array.isArray(slide.questions) || slide.questions.length < 2)
        errors.push(`${id}: end_quiz must have at least 2 questions`)
      else {
        slide.questions.forEach((q, qi) => {
          const qid = `${id} question ${qi + 1}`
          if (!q.question?.trim()) errors.push(`${qid}: missing 'question'`)
          if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`${qid}: must have at least 2 options`)
          if (!q.correct?.trim()) errors.push(`${qid}: missing 'correct'`)
          if (!q.feedback_correct?.trim()) errors.push(`${qid}: missing 'feedback_correct'`)
          if (!q.feedback_wrong?.trim()) errors.push(`${qid}: missing 'feedback_wrong'`)
        })
      }
      break

    case 'summary':
      if (!Array.isArray(slide.points) || slide.points.length === 0)
        errors.push(`${id}: 'points' must be a non-empty array`)
      if (!slide.closing?.trim()) errors.push(`${id}: missing 'closing' encouragement line`)
      break

    default:
      errors.push(`Slide ${index + 1}: unknown type '${slide.type}'`)
  }

  return errors
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseLesson(rawText) {
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
    (match) =>
      match
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

  if (!parsed.title?.trim()) errors.push("Missing 'title'")

  if (!parsed.slides) {
    errors.push("Missing 'slides' array")
    return { valid: false, errors, lesson: null }
  }
  if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    errors.push("'slides' must be a non-empty array")
    return { valid: false, errors, lesson: null }
  }

  parsed.slides.forEach((slide, i) => {
    if (!slide.type) {
      errors.push(`Slide ${i + 1}: missing 'type'`)
      return
    }
    if (!SLIDE_TYPES.includes(slide.type)) {
      errors.push(`Slide ${i + 1}: unknown type '${slide.type}' — must be one of: ${SLIDE_TYPES.join(', ')}`)
      return
    }
    errors.push(...validateSlide(slide, i))
  })

  // Structural requirements
  const types = parsed.slides.map((s) => s.type)
  if (!types.includes('hook')) errors.push('Lesson must have a hook slide')
  if (!types.includes('interaction')) errors.push('Lesson must have at least one interaction slide')
  if (!types.includes('end_quiz')) errors.push('Lesson must have an end_quiz slide before the summary')
  if (!types.includes('summary')) errors.push('Lesson must have a summary slide')
  if (types[types.length - 1] !== 'summary') errors.push('Last slide must be a summary')
  // end_quiz must come before summary
  const endQuizIdx = types.lastIndexOf('end_quiz')
  const summaryIdx = types.lastIndexOf('summary')
  if (endQuizIdx > summaryIdx) errors.push('end_quiz slide must appear before the summary')

  if (errors.length > 0) return { valid: false, errors, lesson: null }

  return {
    valid: true,
    errors: [],
    lesson: parsed,
    stats: {
      totalSlides: parsed.slides.length,
      definitions: types.filter((t) => t === 'definition').length,
      concepts: types.filter((t) => t === 'concept').length,
      formulas: types.filter((t) => t === 'formula').length,
      interactions: types.filter((t) => t === 'interaction').length,
      workedExamples: types.filter((t) => t === 'worked_example').length,
      imageSlots: parsed.slides.filter((s) => s.image?.needed || s.image_prompt).length,
      endQuizQuestions: parsed.slides.filter(s => s.type === 'end_quiz').reduce((acc, s) => acc + (s.questions?.length ?? 0), 0),
    },
  }
}

// ── Prompt builder ────────────────────────────────────────────────────────────

export function buildLessonPrompt({ subjectName, topicName, subtopicName, objectives, examTag }) {
  const examLabel =
    examTag === 'WAEC' ? 'WAEC' : examTag === 'JAMB' ? 'JAMB' : 'WAEC and JAMB'

  const objectivesList = (objectives ?? []).map((obj) => `- ${obj}`).join('\n')

  return `You are an expert teacher creating a lesson for Nigerian secondary school students (ages 14–18) preparing for ${examLabel}.

Subject: ${subjectName}
Topic: ${topicName}
Subtopic: ${subtopicName}
Learning Objectives:
${objectivesList}

Create a complete lesson as a sequence of slides. Each slide covers ONE idea only.

SLIDE ORDER — strictly follow this sequence:
1. Hook
2. Definition(s) — one per key term
3. Concept slides + Interaction slides interleaved (one interaction after every 2–3 concepts)
4. Formula slide(s) — if applicable
5. Worked examples — 2 guided, 1 student attempt
6. End quiz — minimum 2 questions (MANDATORY)
7. Summary

──────────────────────────────────────────
SLIDE SPECIFICATIONS
──────────────────────────────────────────

HOOK SLIDE
- One real-life observation that creates curiosity — 2–3 lines max
- Nigerian student everyday life: buses, markets, football, construction, cooking, farming
- Never label it "Introduction" — it just opens naturally

DEFINITION SLIDE (one per key term)
- Definition in one clean conversational sentence
- Bad: "Velocity is defined as the rate of change of displacement"
- Good: "Velocity is simply how fast something moves AND in which direction"
- 2–3 real-life examples as an array

CONCEPT SLIDE
- One idea only per slide — never combine two
- examples: 2–3 short concrete examples as numbered cards. ALWAYS include — not optional.
- image: add only where it genuinely helps (see IMAGE RULES)

FORMULA SLIDE
- plain_english: what the formula means in everyday language
- Every variable defined
- image: always add formula_diagram

INTERACTION SLIDE (after every 2–3 concept slides)
- One question, 3–4 options
- feedback_correct: warm celebration, 1–2 sentences
- feedback_wrong: supportive correction — NEVER just "Incorrect." Always: "Almost. Remember: [one-line reminder]."
- NO image

WORKED EXAMPLE — GUIDED (×2)
- mode: "guided"
- steps: each step is one clear instruction line
- MATH FORMATTING — strictly enforced:
  * Every calculation step on its own line
  * Write steps as: "Step 1: Speed = Distance ÷ Time" then "Step 2: Speed = 100 ÷ 10" then "Step 3: Speed = 10 m/s"
  * Final answer: "Answer: The speed is 10 m/s"
  * Never embed calculations in prose sentences
  * Use × for multiplication, ÷ for division — never written as words
- No micro_question fields — pure step-by-step only

WORKED EXAMPLE — STUDENT ATTEMPT (×1)
- mode: "student_attempt"
- reveal_delay_seconds: 8
- Same math formatting rules apply

END QUIZ (MANDATORY — minimum 2 questions)
- Tests understanding of THIS lesson — not general knowledge
- Same feedback rules as interaction slides
- Student must answer ALL questions before lesson completes

SUMMARY SLIDE
- points: one line per key concept
- closing: one short encouraging line
- NO image

──────────────────────────────────────────
IMAGE RULES
──────────────────────────────────────────
Only add images where they genuinely help understanding.
NEVER add images to: hook, definition, interaction, end_quiz, summary slides.

For every image block:
"image": {
  "needed": true,
  "intent_type": "[see types below]",
  "learning_objective": "[what understanding this creates in the student's mind]",
  "prompt": "[see template below]",
  "filename": "",
  "url": ""
}

Intent types: concept_visual, real_life_example, process_diagram, comparison_visual, formula_diagram, intuition_builder, memory_aid, experiment_visual

Image prompt template — SIMPLE, not busy:
[intent_type] simple educational illustration showing [ONE specific thing], clean and uncluttered, designed for Nigerian secondary school students, no excessive arrows or labels, focused on one visual idea only, beginner-friendly, mobile-optimized, modern educational illustration style

KEY RULE: An image shows the concept — it does NOT explain it. The lesson text handles explanation.
- One visual idea maximum per image
- If labeling is needed: ONE label only — never a diagram full of annotations
- Simple and clear beats detailed and busy — always

──────────────────────────────────────────
FORMATTING RULES — non-negotiable
──────────────────────────────────────────
- One idea per slide — always
- Short sentences — max 20 words
- NO LaTeX, NO $$, NO \\frac — plain text only
- × for multiplication, ÷ for division
- Conversational tone — never textbook language
- Real-life examples from Nigerian student life

Return ONLY valid JSON. No markdown, no explanation, no preamble:

{
  "title": "${subtopicName}",
  "exam_tag": "${examTag}",
  "slides": [
    {
      "type": "hook",
      "body": ""
    },
    {
      "type": "definition",
      "term": "",
      "definition": "",
      "examples": ["", "", ""]
    },
    {
      "type": "concept",
      "heading": "",
      "body": "",
      "examples": ["", ""],
      "image": {
        "needed": true,
        "intent_type": "concept_visual",
        "learning_objective": "",
        "prompt": "",
        "filename": "",
        "url": ""
      }
    },
    {
      "type": "interaction",
      "question": "",
      "options": [
        { "key": "A", "text": "" },
        { "key": "B", "text": "" },
        { "key": "C", "text": "" },
        { "key": "D", "text": "" }
      ],
      "correct": "A",
      "feedback_correct": "",
      "feedback_wrong": ""
    },
    {
      "type": "formula",
      "label": "",
      "formula": "",
      "plain_english": "",
      "variables": [
        { "symbol": "", "meaning": "" }
      ],
      "image": {
        "needed": true,
        "intent_type": "formula_diagram",
        "learning_objective": "",
        "prompt": "",
        "filename": "",
        "url": ""
      }
    },
    {
      "type": "worked_example",
      "mode": "guided",
      "problem": "",
      "steps": [
        { "instruction": "" }
      ],
      "final_answer": ""
    },
    {
      "type": "worked_example",
      "mode": "guided",
      "problem": "",
      "steps": [
        { "instruction": "" }
      ],
      "final_answer": ""
    },
    {
      "type": "worked_example",
      "mode": "student_attempt",
      "problem": "",
      "reveal_delay_seconds": 8,
      "steps": [
        { "instruction": "" }
      ],
      "final_answer": ""
    },
    {
      "type": "end_quiz",
      "questions": [
        {
          "question": "",
          "options": [
            { "key": "A", "text": "" },
            { "key": "B", "text": "" },
            { "key": "C", "text": "" },
            { "key": "D", "text": "" }
          ],
          "correct": "A",
          "feedback_correct": "",
          "feedback_wrong": ""
        },
        {
          "question": "",
          "options": [
            { "key": "A", "text": "" },
            { "key": "B", "text": "" },
            { "key": "C", "text": "" },
            { "key": "D", "text": "" }
          ],
          "correct": "A",
          "feedback_correct": "",
          "feedback_wrong": ""
        }
      ]
    },
    {
      "type": "summary",
      "points": [],
      "closing": ""
    }
  ]
}`
}