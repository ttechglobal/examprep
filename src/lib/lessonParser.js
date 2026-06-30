// src/lib/lessonParser.js
// ─────────────────────────────────────────────────────────────────────────────
// Lesson JSON parser + prompt builder.
//
// FIXES in buildLessonPrompt:
// 1. Guard against undefined subject/topic/subtopic — now throws a clear error
//    instead of silently interpolating "undefined" into the stored prompt.
// 2. Hook instruction rewritten — simpler, more direct, no room for
//    poetic/over-literary output from the AI.
// ─────────────────────────────────────────────────────────────────────────────

export const SLIDE_TYPES = [
  'hook', 'definition', 'concept', 'formula', 'interaction',
  'worked_example', 'end_quiz', 'summary', 'real_life',
]

// Human-readable labels per slide type — single source of truth, shared by
// the admin lesson editor's slide list and MobilePreview's phone-frame pills.
// Previously duplicated locally in LessonEditorClient.jsx and re-invented
// inline (as "{i+1} · {s.type}") in MobilePreview.jsx.
export const SLIDE_TYPE_LABELS = {
  hook: 'Hook',
  definition: 'Definition',
  real_life: 'Real-life Connection',
  concept: 'Concept',
  formula: 'Formula',
  interaction: 'Interaction',
  worked_example: 'Worked Example',
  end_quiz: 'End Quiz',
  summary: 'Summary',
}

// ── Slide-level validation ────────────────────────────────────────────────────
function validateSlide(slide, i) {
  const errors = []
  const label = `Slide ${i + 1} (${slide.type})`

  switch (slide.type) {
    case 'hook':
      if (!slide.body?.trim()) errors.push(`${label}: missing 'body'`)
      break
    case 'definition':
      if (!slide.term?.trim())       errors.push(`${label}: missing 'term'`)
      if (!slide.definition?.trim()) errors.push(`${label}: missing 'definition'`)
      if (!Array.isArray(slide.examples) || slide.examples.length === 0)
        errors.push(`${label}: 'examples' must be a non-empty array`)
      break
    case 'concept':
      if (!slide.heading?.trim()) errors.push(`${label}: missing 'heading'`)
      if (!slide.body?.trim())    errors.push(`${label}: missing 'body'`)
      break
    case 'formula':
      if (!slide.label?.trim())   errors.push(`${label}: missing 'label'`)
      if (!slide.formula?.trim()) errors.push(`${label}: missing 'formula'`)
      break
    case 'interaction':
      if (!slide.question?.trim())           errors.push(`${label}: missing 'question'`)
      if (!Array.isArray(slide.options) || slide.options.length < 3)
        errors.push(`${label}: 'options' must have at least 3 items`)
      if (!slide.correct?.trim())            errors.push(`${label}: missing 'correct'`)
      if (!slide.feedback_correct?.trim())   errors.push(`${label}: missing 'feedback_correct'`)
      if (!slide.feedback_wrong?.trim())     errors.push(`${label}: missing 'feedback_wrong'`)
      break
    case 'worked_example':
      if (!slide.problem?.trim())  errors.push(`${label}: missing 'problem'`)
      if (!slide.mode)             errors.push(`${label}: missing 'mode' (guided | student_attempt)`)
      if (!Array.isArray(slide.steps) || slide.steps.length === 0)
        errors.push(`${label}: 'steps' must be a non-empty array`)
      if (!slide.final_answer?.trim()) errors.push(`${label}: missing 'final_answer'`)
      break
    case 'end_quiz':
      if (!Array.isArray(slide.questions) || slide.questions.length < 2)
        errors.push(`${label}: 'questions' must have at least 2 items`)
      break
    case 'summary':
      if (!Array.isArray(slide.points) || slide.points.length === 0)
        errors.push(`${label}: 'points' must be a non-empty array`)
      if (!slide.closing?.trim()) errors.push(`${label}: missing 'closing'`)
      break
  }

  return errors
}

// ── Main parser ───────────────────────────────────────────────────────────────
export function parseLesson(raw) {
  if (!raw?.trim()) {
    return { valid: false, errors: ['No content provided'], lesson: null }
  }

  // Sanitise control characters inside JSON strings
  const cleaned = raw.trim().replace(
    /"(?:[^"\\]|\\.)*"/g,
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
  if (!types.includes('hook'))        errors.push('Lesson must have a hook slide')
  if (!types.includes('interaction')) errors.push('Lesson must have at least one interaction slide')
  if (!types.includes('end_quiz'))    errors.push('Lesson must have an end_quiz slide before the summary')
  if (!types.includes('summary'))     errors.push('Lesson must have a summary slide')
  if (types[types.length - 1] !== 'summary') errors.push('Last slide must be a summary')

  const endQuizIdx = types.lastIndexOf('end_quiz')
  const summaryIdx = types.lastIndexOf('summary')
  if (endQuizIdx > summaryIdx) errors.push('end_quiz slide must appear before the summary')

  if (errors.length > 0) return { valid: false, errors, lesson: null }

  return {
    valid: true,
    errors: [],
    lesson: parsed,
    stats: {
      totalSlides:      parsed.slides.length,
      definitions:      types.filter((t) => t === 'definition').length,
      concepts:         types.filter((t) => t === 'concept').length,
      formulas:         types.filter((t) => t === 'formula').length,
      interactions:     types.filter((t) => t === 'interaction').length,
      workedExamples:   types.filter((t) => t === 'worked_example').length,
      imageSlots:       parsed.slides.filter((s) => s.image?.needed || s.image_prompt).length,
      endQuizQuestions: parsed.slides
        .filter(s => s.type === 'end_quiz')
        .reduce((acc, s) => acc + (s.questions?.length ?? 0), 0),
    },
  }
}

// ── Prompt builder ────────────────────────────────────────────────────────────
export function buildLessonPrompt({ subjectName, topicName, subtopicName, objectives, examTag }) {
  // ── FIX: guard undefined values before string interpolation ───────────────
  // If any of these are missing, the stored generation_prompt will literally
  // contain the word "undefined" — making every generated lesson wrong.
  if (!subjectName || subjectName === 'undefined') {
    throw new Error('buildLessonPrompt: subjectName is required')
  }
  if (!topicName || topicName === 'undefined') {
    throw new Error('buildLessonPrompt: topicName is required')
  }
  if (!subtopicName || subtopicName === 'undefined') {
    throw new Error('buildLessonPrompt: subtopicName is required')
  }

  const examLabel =
    examTag === 'WAEC' ? 'WAEC' :
    examTag === 'JAMB' ? 'JAMB' :
    'WAEC and JAMB'

  const objectivesList = Array.isArray(objectives) && objectives.length > 0
    ? objectives.map((obj) => `- ${obj}`).join('\n')
    : '- (not specified — derive objectives from the subtopic name)'

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
Write 2–3 short sentences. State one thing a Nigerian student already sees or does in real life that directly connects to this subtopic. Be plain and direct — no metaphors, no dramatic language.

Good example (for Speed):
"When a danfo and a keke are both moving, they don't cover the same distance in the same time. That difference is exactly what speed measures. Let's break it down."

Bad example (avoid this style):
"Have you ever watched the world blur past as you rush to catch a bus, feeling time itself bend around you?"

Rules:
- Pick ONE everyday Nigerian context: market, bus, football, cooking, farming, school, phone
- Say what the student already observes, then say what concept explains it
- 2–3 sentences maximum — no more
- No question openers ("Have you ever...?") — make a direct statement
- Never label it "Introduction"

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
  "exam_tag": "${examTag ?? 'BOTH'}",
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