const SECTION_TYPES = [
  'hook',
  'definition',
  'explanation',
  'formula',
  'quick_check',
  'worked_example',
  'summary',
]

function validateSection(section, index) {
  const errors = []
  const id = `Section ${index + 1} (${section.type})`

  switch (section.type) {
    case 'hook':
      if (!section.body) errors.push(`${id}: missing 'body'`)
      break

    case 'definition':
      if (!section.term) errors.push(`${id}: missing 'term'`)
      if (!section.definition) errors.push(`${id}: missing 'definition'`)
      if (!section.explanation) errors.push(`${id}: missing 'explanation'`)
      break

    case 'explanation':
      if (!section.heading) errors.push(`${id}: missing 'heading'`)
      if (!section.body) errors.push(`${id}: missing 'body'`)
      break

    case 'formula':
      if (!section.label) errors.push(`${id}: missing 'label'`)
      if (!section.formula) errors.push(`${id}: missing 'formula'`)
      if (!Array.isArray(section.variables) || section.variables.length === 0)
        errors.push(`${id}: missing 'variables' array`)
      break

    case 'quick_check':
      if (!section.question) errors.push(`${id}: missing 'question'`)
      if (!Array.isArray(section.options) || section.options.length < 2)
        errors.push(`${id}: 'options' must have at least 2 items`)
      if (!section.correct) errors.push(`${id}: missing 'correct'`)
      if (!section.explanation) errors.push(`${id}: missing 'explanation'`)
      break

    case 'worked_example':
      if (!section.mode) errors.push(`${id}: missing 'mode' (guided or student_attempt)`)
      if (!section.problem) errors.push(`${id}: missing 'problem'`)
      if (!Array.isArray(section.steps)) errors.push(`${id}: missing 'steps' array`)
      if (!section.final_answer) errors.push(`${id}: missing 'final_answer'`)
      break

    case 'summary':
      if (!Array.isArray(section.points) || section.points.length === 0)
        errors.push(`${id}: missing or empty 'points'`)
      break

    default:
      errors.push(`Section ${index + 1}: unknown type '${section.type}'`)
  }

  return errors
}

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
      return { valid: false, errors: [`Invalid JSON: ${err2.message}`], lesson: null }
    }
  }

  const errors = []

  if (!parsed.title) errors.push("Missing 'title'")
  if (!parsed.sections) {
    errors.push("Missing 'sections' array")
    return { valid: false, errors, lesson: null }
  }
  if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    errors.push("'sections' must be a non-empty array")
    return { valid: false, errors, lesson: null }
  }

  parsed.sections.forEach((section, i) => {
    if (!section.type) {
      errors.push(`Section ${i + 1}: missing 'type'`)
      return
    }
    if (!SECTION_TYPES.includes(section.type)) {
      errors.push(`Section ${i + 1}: unknown type '${section.type}'`)
      return
    }
    errors.push(...validateSection(section, i))
  })

  const types = parsed.sections.map(s => s.type)
  if (!types.includes('hook')) errors.push('Lesson must have a hook section')
  if (!types.includes('quick_check')) errors.push('Lesson must have at least one quick_check')
  if (!types.includes('summary')) errors.push('Lesson must have a summary section')
  if (types[types.length - 1] !== 'summary') errors.push('Last section must be a summary')

  if (errors.length > 0) return { valid: false, errors, lesson: null }

  return {
    valid: true,
    errors: [],
    lesson: parsed,
    stats: {
      totalSections: parsed.sections.length,
      definitions: types.filter(t => t === 'definition').length,
      explanations: types.filter(t => t === 'explanation').length,
      workedExamples: types.filter(t => t === 'worked_example').length,
      quickChecks: types.filter(t => t === 'quick_check').length,
      formulas: types.filter(t => t === 'formula').length,
      imageSlots: parsed.sections.filter(s => s.image_prompt).length,
    },
  }
}

export function buildLessonPrompt({ subjectName, topicName, subtopicName, objectives, examTag }) {
  const examLabel =
    examTag === 'WAEC' ? 'WAEC' :
    examTag === 'JAMB' ? 'JAMB' :
    'WAEC and JAMB'

  const objectivesList = (objectives ?? []).map(obj => `- ${obj}`).join('\n')

  return `You are an expert teacher creating a lesson for Nigerian secondary school students (ages 14–18) preparing for ${examLabel}.

Subject: ${subjectName}
Topic: ${topicName}
Subtopic: ${subtopicName}
Learning Objectives:
${objectivesList}

Create a complete, deeply engaging lesson following ALL of these rules:

LESSON STRUCTURE — in this exact order:

1. HOOK (1 section)
- Open with a real-life scenario or observation that connects directly to the concept
- Must be relatable to a Nigerian student's everyday life (markets, construction sites, football, cooking, transport, farming, etc.)
- Must be 2–3 sentences maximum — punchy, not wordy
- Do NOT label it "Introduction" — it should feel natural, like a teacher grabbing attention

2. DEFINITION SPOTLIGHT (for each key term)
- Each key definition gets its own dedicated section
- The definition itself must be a clear, standalone statement
- Follow immediately with 1–2 sentences of plain-language explanation
- Then one real-life example that illustrates it
- Never bury definitions inside paragraphs

3. CONCEPT EXPLANATION (as many sections as needed)
- Each section covers ONE idea only — never combine two concepts
- Use short paragraphs — maximum 3 sentences per paragraph
- Use analogies from Nigerian student life wherever possible
- Build strictly progressively — each section assumes the student understood the previous one
- For every explanation section, include an image_prompt field describing a specific real-life image
- Where a formula is introduced: use a dedicated formula section with every variable defined

4. QUICK CHECK — after every 2–3 explanation sections
- Pop up a question based on what was just taught
- Must be answerable from what the student has learned so far in this lesson
- Show explanation of correct answer

5. WORKED EXAMPLES — minimum 3 for calculation-based subtopics
- Example 1 & 2: guided mode — solve step by step, include micro_question on at least one step
- Example 3: student_attempt mode — reveal_delay_seconds must be 8
- All maths: use × not IMES, use ÷ not /, use → not ->, write fractions as numerator/denominator
- NO LaTeX, NO $$, NO double dollar signs anywhere

6. SUMMARY
- Bullet points of the key things learned
- End with one short encouraging line in closing_encouragement field

FORMATTING RULES — strictly enforced:
- NO double dollar signs ($$) anywhere
- NO LaTeX syntax anywhere  
- NO "IMES" — always use ×
- Fractions written as: numerator/denominator
- Short sentences throughout — maximum 20 words per sentence

Return ONLY valid JSON. No markdown, no explanation, no preamble:

{
  "title": "${subtopicName}",
  "exam_tag": "${examTag}",
  "sections": [
    {
      "type": "hook",
      "body": ""
    },
    {
      "type": "definition",
      "term": "",
      "definition": "",
      "explanation": "",
      "example": ""
    },
    {
      "type": "explanation",
      "heading": "",
      "body": "",
      "image_prompt": ""
    },
    {
      "type": "formula",
      "label": "",
      "formula": "",
      "variables": [
        { "symbol": "", "meaning": "" }
      ]
    },
    {
      "type": "quick_check",
      "question": "",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": "A",
      "explanation": ""
    },
    {
      "type": "worked_example",
      "mode": "guided",
      "problem": "",
      "image_prompt": "",
      "steps": [
        {
          "instruction": "",
          "micro_question": "",
          "micro_answer": ""
        }
      ],
      "final_answer": ""
    },
    {
      "type": "worked_example",
      "mode": "student_attempt",
      "problem": "",
      "reveal_delay_seconds": 8,
      "steps": [],
      "final_answer": ""
    },
    {
      "type": "summary",
      "points": [],
      "closing_encouragement": ""
    }
  ]
}`
}