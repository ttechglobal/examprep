// src/lib/prerequisitePrompt.js
// Two prompt builders:
// 1. buildPrerequisiteMapPrompt  — AI generates the topic dependency graph for a subject
// 2. buildGeneratedQuestionsPrompt — generates exam-style questions with enriched explanations

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


// ── 2. Generated questions prompt ─────────────────────────────────────────────
// Admin copies this prompt, pastes into Claude, gets 10 WAEC/JAMB-style MCQs back.
//
// EXPLANATION SCHEMA (per question):
//   concept          — one sentence: the core principle this question tests
//   why_correct      — one clear sentence: why the right answer is correct,
//                      applied specifically to this question (not generic)
//   misconception    — one sentence: the most common wrong answer and the
//                      exact thinking mistake behind it
//   visual_needed    — boolean: true only if a diagram/graph meaningfully
//                      helps (circuits, graphs, force diagrams, structures).
//                      false for pure recall or language-based questions.
//   workings         — array of step strings for calculation questions only.
//                      Empty array [] for non-calculation questions.
//   wrong_options    — object keyed by option letter (excluding correct answer):
//                      one sentence per wrong option naming the specific mistake.
//
// BACKWARD COMPATIBILITY: The old `correct` field is still written alongside
// the new fields so existing rendering code keeps working untouched.

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
- Wrong options (distractors) must represent REAL mistakes students commonly make — not random wrong answers
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

EXPLANATION REQUIREMENTS — read carefully, this is the most important part:

The goal is that a student who got the question WRONG should finish reading the explanation and truly understand the concept — not just know the answer. Write for the confused student, not the one who already knows.

For each question, provide:

1. concept — ONE sentence naming the underlying principle or idea this question is testing.
   Example: "Ohm's Law states that voltage equals current multiplied by resistance."
   NOT: "This question tests Ohm's Law." (too vague)
   NOT: A paragraph. One sentence only.

2. why_correct — ONE sentence explaining why the correct answer is right, applied to THIS specific question.
   Show the key step or reasoning, not a general statement.
   Example: "Since V = IR, with V = 12V and R = 4Ω, the current is 12 ÷ 4 = 3A."
   NOT: "The correct answer is A because it applies Ohm's Law correctly."

3. misconception — ONE sentence naming the most common wrong answer and the specific thinking mistake behind it.
   Example: "Many students choose C because they divide resistance by voltage instead of voltage by resistance."
   NOT: "Students often get confused with this topic."

4. visual_needed — true if the concept becomes significantly clearer with a diagram, graph, or visual.
   Set true for: circuit diagrams, force/motion diagrams, graphs, chemical structures, geometric problems, wave diagrams.
   Set false for: definitions, processes described in words, pure arithmetic, recall questions.

5. workings — for CALCULATION questions only: array of step-by-step strings showing every calculation step.
   Example: ["Step 1: Write the formula — V = IR", "Step 2: Substitute values — 12 = I × 4", "Step 3: Solve — I = 12 ÷ 4 = 3A"]
   For NON-CALCULATION questions: empty array []

6. wrong_options — for EVERY wrong option (not the correct one): one sentence naming the specific mistake.
   Be precise — name the exact misconception, not just "this is incorrect".
   Example: { "B": "Students who choose B have confused the formula direction, dividing R by V instead of V by R." }

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
      "concept": "",
      "why_correct": "",
      "misconception": "",
      "visual_needed": false,
      "workings": [],
      "wrong_options": { "B": "", "C": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "B",
      "difficulty": "easy",
      "question_type": "recall",
      "concept": "",
      "why_correct": "",
      "misconception": "",
      "visual_needed": false,
      "workings": [],
      "wrong_options": { "A": "", "C": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "C",
      "difficulty": "easy",
      "question_type": "recall",
      "concept": "",
      "why_correct": "",
      "misconception": "",
      "visual_needed": false,
      "workings": [],
      "wrong_options": { "A": "", "B": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "A",
      "difficulty": "medium",
      "question_type": "application",
      "concept": "",
      "why_correct": "",
      "misconception": "",
      "visual_needed": false,
      "workings": [],
      "wrong_options": { "B": "", "C": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "B",
      "difficulty": "medium",
      "question_type": "application",
      "concept": "",
      "why_correct": "",
      "misconception": "",
      "visual_needed": false,
      "workings": [],
      "wrong_options": { "A": "", "C": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "C",
      "difficulty": "medium",
      "question_type": "application",
      "concept": "",
      "why_correct": "",
      "misconception": "",
      "visual_needed": false,
      "workings": [],
      "wrong_options": { "A": "", "B": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "D",
      "difficulty": "medium",
      "question_type": "application",
      "concept": "",
      "why_correct": "",
      "misconception": "",
      "visual_needed": false,
      "workings": [],
      "wrong_options": { "A": "", "B": "", "C": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "A",
      "difficulty": "hard",
      "question_type": "reasoning",
      "concept": "",
      "why_correct": "",
      "misconception": "",
      "visual_needed": false,
      "workings": [],
      "wrong_options": { "B": "", "C": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "B",
      "difficulty": "hard",
      "question_type": "reasoning",
      "concept": "",
      "why_correct": "",
      "misconception": "",
      "visual_needed": false,
      "workings": [],
      "wrong_options": { "A": "", "C": "", "D": "" }
    },
    {
      "question_text": "",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "correct_answer": "C",
      "difficulty": "mixed",
      "question_type": "reasoning",
      "concept": "",
      "why_correct": "",
      "misconception": "",
      "visual_needed": false,
      "workings": [],
      "wrong_options": { "A": "", "B": "", "D": "" }
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
    // New required fields
    if (!q.concept?.trim())         errors.push(`${label}: missing concept`)
    if (!q.why_correct?.trim())     errors.push(`${label}: missing why_correct`)
    if (!q.misconception?.trim())   errors.push(`${label}: missing misconception`)
    if (!q.wrong_options)           errors.push(`${label}: missing wrong_options`)
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