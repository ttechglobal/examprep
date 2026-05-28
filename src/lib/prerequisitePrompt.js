// src/lib/prerequisitePrompt.js
// Two prompt builders:
// 1. buildPrerequisiteMapPrompt  — AI generates the topic dependency graph for a subject
// 2. buildGeneratedQuestionsPrompt — extends lesson generation to also produce 10 exam-style questions per subtopic

// ── 1. Knowledge graph prompt ─────────────────────────────────────────────────

export function buildPrerequisiteMapPrompt({ subjectName, examType, topicsList }) {
  const examLabel =
    examType === 'WAEC' ? 'WAEC' :
    examType === 'JAMB' ? 'JAMB' :
    'WAEC and JAMB'

  const topicsText = topicsList
    .map((t, i) => `${i + 1}. ${t.name}`)
    .join('\n')

  return `You are an expert curriculum analyst for Nigerian secondary school education (${examLabel}).

Subject: ${subjectName}

Below is the complete list of topics in this subject's curriculum. Your task is to map the prerequisite relationships between them — which topics must be understood before a student can meaningfully learn another topic.

TOPICS:
${topicsText}

YOUR TASK:
1. For each topic, determine if it is FOUNDATIONAL (can be learned without understanding any other topic in this list) or DEPENDENT (requires understanding of one or more other topics first).
2. For each DEPENDENT topic, list only its DIRECT prerequisites — the 1–2 topics a student must understand immediately before this one. Do NOT list every distantly related topic, only the immediate ones.
3. Use the exact topic names from the list above. Do not invent new topic names.

RULES:
- A topic can only depend on topics that appear earlier in the typical teaching sequence.
- Do not create circular dependencies (Topic A requires Topic B, Topic B requires Topic A).
- If a topic is typically taught early and is self-contained, mark it foundational.
- Be conservative: only mark a prerequisite if a student who doesn't understand it would genuinely struggle with the dependent topic.

Return ONLY valid JSON. No markdown, no explanation, no preamble.

{
  "subject": "${subjectName}",
  "exam_type": "${examType}",
  "topics": [
    {
      "name": "exact topic name from the list",
      "foundational": true,
      "prerequisites": []
    },
    {
      "name": "another topic name",
      "foundational": false,
      "prerequisites": ["prerequisite topic name 1", "prerequisite topic name 2"]
    }
  ]
}`
}


// ── 2. Generated questions prompt (added to lesson generation) ────────────────
// This is appended to the existing lesson prompt or run separately per subtopic.
// Admin copies it, pastes into Claude, gets 10 WAEC/JAMB-style MCQs back.

export function buildGeneratedQuestionsPrompt({
  subjectName,
  topicName,
  subtopicName,
  examType,
  objectives = [],
}) {
  const examLabel =
    examType === 'WAEC' ? 'WAEC' :
    examType === 'JAMB' ? 'JAMB' :
    'WAEC and JAMB'

  const objectivesText = objectives.length > 0
    ? objectives.map(o => `- ${o}`).join('\n')
    : '- (not specified — use the subtopic name as your guide)'

  return `You are an expert exam question writer for Nigerian secondary school education (${examLabel}).

Subject: ${subjectName}
Topic: ${topicName}
Subtopic: ${subtopicName}
Learning Objectives:
${objectivesText}

Write 10 original exam-style multiple choice questions for this subtopic.

QUESTION REQUIREMENTS:
- Style must match real ${examLabel} exam questions — not textbook exercises
- Each question must have exactly 4 options: A, B, C, D
- One option is unambiguously correct
- Wrong options (distractors) must represent REAL mistakes students commonly make — not random wrong answers. Each wrong option should be a plausible answer a confused student might choose.
- Questions must vary in type:
  - 3 RECALL questions (direct knowledge check)
  - 4 APPLICATION questions (apply the concept to a situation or calculation)
  - 3 REASONING questions (require understanding why, not just what)
- Difficulty distribution: 3 easy, 4 medium, 2 hard, 1 mixed/tricky
- Every question must be self-contained — a student can answer it without seeing any other question

LANGUAGE RULES:
- Plain English throughout — no LaTeX, no $$, no \\frac
- Use × for multiplication, ÷ for division
- Write fractions as numerator/denominator (e.g. 3/4)
- Short, clear sentences — maximum 25 words per question stem
- If a question involves a calculation, include all necessary values in the question

EXPLANATION REQUIREMENTS — this is critical:
- correct_explanation: 2–3 sentences. Explain clearly WHY the correct answer is right. Use plain language. Show working if it's a calculation.
- wrong_explanations: For EVERY wrong option, write 1–2 sentences explaining the specific mistake that leads a student to choose that option. Be precise — don't just say "this is wrong". Name the misconception.

Return ONLY valid JSON. No markdown, no explanation, no preamble.

{
  "subject": "${subjectName}",
  "topic": "${topicName}",
  "subtopic": "${subtopicName}",
  "exam_type": "${examType}",
  "source": "ai_generated",
  "questions": [
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "A",
      "difficulty": "easy",
      "question_type": "recall",
      "correct_explanation": "",
      "wrong_explanations": { "B": "", "C": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "B",
      "difficulty": "easy",
      "question_type": "recall",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "C": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "C",
      "difficulty": "easy",
      "question_type": "recall",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "B": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "A",
      "difficulty": "medium",
      "question_type": "application",
      "correct_explanation": "",
      "wrong_explanations": { "B": "", "C": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "B",
      "difficulty": "medium",
      "question_type": "application",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "C": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "C",
      "difficulty": "medium",
      "question_type": "application",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "B": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "D",
      "difficulty": "medium",
      "question_type": "application",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "B": "", "C": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "A",
      "difficulty": "hard",
      "question_type": "reasoning",
      "correct_explanation": "",
      "wrong_explanations": { "B": "", "C": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "B",
      "difficulty": "hard",
      "question_type": "reasoning",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "C": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "C",
      "difficulty": "mixed",
      "question_type": "reasoning",
      "correct_explanation": "",
      "wrong_explanations": { "A": "", "B": "", "D": "" }
    }
  ]
}`
}


// ── Validator for generated questions JSON ────────────────────────────────────

export function parseGeneratedQuestions(rawText) {
  let cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // Fix unescaped control chars
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

  const questions = parsed.questions ?? (Array.isArray(parsed) ? parsed : [])
  const errors = []

  if (!questions.length) {
    errors.push('No questions found in response')
    return { valid: false, errors, questions: [] }
  }

  if (questions.length < 8) {
    errors.push(`Expected at least 8 questions, got ${questions.length}`)
  }

  questions.forEach((q, i) => {
    const label = `Question ${i + 1}`
    if (!q.question_text?.trim())   errors.push(`${label}: missing question_text`)
    if (!q.options?.A)              errors.push(`${label}: missing option A`)
    if (!q.options?.B)              errors.push(`${label}: missing option B`)
    if (!q.options?.C)              errors.push(`${label}: missing option C`)
    if (!q.options?.D)              errors.push(`${label}: missing option D`)
    if (!q.correct_answer)          errors.push(`${label}: missing correct_answer`)
    if (!q.difficulty)              errors.push(`${label}: missing difficulty`)
    if (!q.correct_explanation)     errors.push(`${label}: missing correct_explanation`)
    if (!q.wrong_explanations)      errors.push(`${label}: missing wrong_explanations`)
  })

  if (errors.length > 0) return { valid: false, errors, questions: [] }

  const difficulties = questions.map(q => q.difficulty)
  return {
    valid: true,
    errors: [],
    questions,
    meta: {
      subject:   parsed.subject,
      topic:     parsed.topic,
      subtopic:  parsed.subtopic,
      exam_type: parsed.exam_type,
    },
    stats: {
      total:  questions.length,
      easy:   difficulties.filter(d => d === 'easy').length,
      medium: difficulties.filter(d => d === 'medium').length,
      hard:   difficulties.filter(d => d === 'hard').length,
      mixed:  difficulties.filter(d => d === 'mixed').length,
    },
  }
}