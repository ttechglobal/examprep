// src/lib/questionParser.js
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES IN THIS VERSION:
//   1. cleanLatex() — sanitises malformed PDF extraction artifacts:
//        \500 → \$500,  \text{N} → ₦,  deltaPQR → \Delta PQR,
//        \{1,2\} outside $ → $\{1,2\}$,  concatenated words fixed
//   2. buildQuestionPrompt() — now instructs AI to use $...$ KaTeX delimiters
//      for ALL math. Previous version said "NO LaTeX" which was wrong.
//   3. parseQuestions() — runs cleanLatex() on every string field after parse
//   4. question_type removed from validation (column dropped from DB)
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

// ── LaTeX sanitiser ───────────────────────────────────────────────────────────
// Fixes malformed LaTeX produced by PDF extraction or AI mis-formatting.
// Called on every string field before the question is saved or validated.
export function cleanLatex(text) {
  if (!text || typeof text !== 'string') return text
  let s = text

  // 1. Currency: \500 or \12,000 → \$500 / \$12,000
  //    (backslash immediately followed by digits)
  s = s.replace(/\\(\d[\d,]*(?:\.\d+)?)/g, '\\$$1')

  // 2. \text{N} naira notation → ₦
  s = s.replace(/\\text\{N\}/g, '₦')
  s = s.replace(/\\text\{\\#\}/g, '₦')

  // 3. delta/Delta before uppercase label → \Delta
  s = s.replace(/\bdelta([A-Z])/g, '\\Delta $1')
  s = s.replace(/\bDelta([A-Z])/g, '\\Delta $1')

  // 4. \{...\} set notation outside $ delimiters → wrap in $...$
  //    Only wraps when not already inside $ context
  s = s.replace(/(^|[^$])(\\{[^$]*?\\})([^$]|$)/g, (_, pre, content, post) => {
    return `${pre}$${content}$${post}`
  })

  // 5. Common concatenated-word artifacts from bad PDF extraction
  s = s.replace(/\$\s*\.\s*At\s+what/g, '$. At what')
  s = s.replace(/ofthe([A-Za-z])/g, 'of the $1')
  s = s.replace(/andthe([A-Za-z])/g, 'and the $1')
  s = s.replace(/inthe([A-Za-z])/g, 'in the $1')
  s = s.replace(/thatthe([A-Za-z])/g, 'that the $1')
  s = s.replace(/forthe([A-Za-z])/g, 'for the $1')
  s = s.replace(/tothe([A-Za-z])/g, 'to the $1')
  s = s.replace(/fromthe([A-Za-z])/g, 'from the $1')
  s = s.replace(/ofan([A-Za-z])/g, 'of an $1')
  s = s.replace(/isthe([A-Za-z])/g, 'is the $1')
  s = s.replace(/makea([A-Za-z])/g, 'make a $1')

  // 6. Double-escaped dollar inside $: $\$500$ → $500
  s = s.replace(/(\$)\\\$(\d)/g, '$1$2')

  return s
}

// Helper: clean all string fields in a question object in-place
function cleanQuestion(q) {
  if (!q) return q

  if (q.passage_text)
    q.passage_text = cleanLatex(q.passage_text)

  if (q.question_text)
    q.question_text = cleanLatex(q.question_text)

  if (q.options && typeof q.options === 'object') {
    Object.keys(q.options).forEach(k => {
      q.options[k] = cleanLatex(String(q.options[k] ?? ''))
    })
  }

  if (q.explanation) {
    if (q.explanation.correct)
      q.explanation.correct = cleanLatex(q.explanation.correct)

    if (Array.isArray(q.explanation.workings)) {
      q.explanation.workings = q.explanation.workings.map(w => {
        if (typeof w === 'string') return cleanLatex(w)
        if (w?.instruction) return { ...w, instruction: cleanLatex(w.instruction) }
        return w
      })
    } else if (typeof q.explanation.workings === 'string') {
      q.explanation.workings = cleanLatex(q.explanation.workings)
    }

    if (q.explanation.wrong_options && typeof q.explanation.wrong_options === 'object') {
      Object.keys(q.explanation.wrong_options).forEach(k => {
        q.explanation.wrong_options[k] = cleanLatex(
          String(q.explanation.wrong_options[k] ?? '')
        )
      })
    }
  }

  return q
}

// ── Main question extraction prompt ──────────────────────────────────────────
export function buildQuestionPrompt(examType, subjectName) {
  const examContext = {
    WAEC:  'Nigerian WAEC (West African Senior School Certificate Examination)',
    JAMB:  'Nigerian JAMB/UTME (Joint Admissions and Matriculation Board)',
    IGCSE: 'Cambridge IGCSE',
  }
  const ctx = examContext[examType] ?? examType

  return `You are an expert teacher extracting ${ctx} past exam questions.

Subject: ${subjectName}
Exam: ${examType}

═══════════════════════════════════════════════
PART 0 — DETECT SHARED CONTEXT (CRITICAL)
═══════════════════════════════════════════════

Many exam questions depend on shared context that MUST appear before the question.
This context can be any of the following:

  TYPE 1 — INSTRUCTION
    A directive that tells the student how to answer a set of questions.
    e.g. "In each of questions 1–5, choose the option that best fills the gap."
    e.g. "From the words lettered A–D, choose the word that is nearest in meaning
          to the underlined word."
    e.g. "Questions 6–10 are based on the following passage. Read it carefully."

  TYPE 2 — READING PASSAGE / EXTRACT
    A paragraph, prose extract, poem, or news article that questions are set on.
    Common in: English Language, Literature in English, Use of English.

  TYPE 3 — SHARED DIAGRAM OR FIGURE
    A labelled diagram, graph, or geometric figure that multiple questions refer to.
    Common in: Mathematics, Physics, Geography, Biology.
    → Set has_image: true on each question in the group.
    → Set passage_text to describe what the diagram shows (since image upload is separate).

  TYPE 4 — DATA TABLE OR CHART
    A table of values, statistical data, or chart that questions are based on.
    Common in: Economics, Commerce, Chemistry, Further Mathematics.

  TYPE 5 — SCENARIO OR GIVEN-INFORMATION BLOCK
    A paragraph of given data, a word problem setup, or a business scenario
    shared across multiple questions.
    e.g. "The following data relates to Company X in 2022: Revenue = ₦5m..."

RULE — APPLY TO EVERY AFFECTED QUESTION:
  • Copy the FULL context text into passage_text on EVERY question that needs it
  • Do NOT truncate, summarise, or paraphrase — copy it word for word
  • Apply the same KaTeX math formatting rules as question_text
  • A question with NO shared context → passage_text: null

WHY THIS IS CRITICAL:
  Students answer in random CBT order. Question 12 may appear before question 3.
  Each question must be 100% self-contained. Never rely on "refer to the passage
  above" — there is no "above" in CBT mode.

passage_image_url: always null — admin uploads images separately.
  But set has_image: true on each question if the shared context includes a diagram.

═══════════════════════════════════════════════
PART 1 — EXTRACT EACH QUESTION
═══════════════════════════════════════════════

For every question:
1. Extract question_text exactly as written — every word, number, and symbol
2. Extract all options A, B, C, D exactly as written
3. Identify correct_answer
4. Set has_image: true if the question references a diagram, table, or graph
5. If has_image, write image_description — describe exactly what the diagram shows

═══════════════════════════════════════════════
PART 2 — WRITE THE EXPLANATION
═══════════════════════════════════════════════

"correct" field: 1–2 sentences explaining WHY the correct answer is right.

"workings" field:

  FOR MATHS / SCIENCE / QUANTITATIVE SUBJECTS (Mathematics, Physics, Chemistry,
  Further Mathematics, Economics calculations, etc.):
    MUST be a JSON array of strings, one calculation step per string.
    GOOD: ["Given: u = 0, a = 10, t = 5", "v = u + at", "v = 0 + 50", "v = 50 m/s"]
    BAD:  ["We substitute u=0 into v=u+at to get v=50 m/s"]

  FOR ENGLISH / LANGUAGE / COMPREHENSION SUBJECTS (English Language, Use of English,
  Literature in English, Yoruba, Igbo, Hausa, etc.):
    Do NOT write step-by-step workings. These subjects have no calculation steps.
    Instead write 1–2 plain sentences explaining the grammar rule, vocabulary meaning,
    or literary device that makes the answer correct.
    Set "workings" to [] (empty array) for all English/language questions.
    GOOD correct: "The word \"garrulous\" means excessively talkative. Option A \"talkative\" is the nearest synonym."
    BAD: ["Step 1: identify root word", "Step 2: match synonym"] — never write steps for language questions.

"wrong_options": for EACH wrong option (B, C, D), write one sentence explaining the specific mistake. Include ALL — the UI will show only the one the student picked.
Only include the option the student picked — not all wrong options.

═══════════════════════════════════════════════
PART 3 — TEXT & MATHEMATICAL FORMATTING (CRITICAL)
═══════════════════════════════════════════════

UNDERLINED WORDS (English, Use of English):
  Exam papers print certain words underlined (e.g. "Choose the synonym for the
  UNDERLINED word"). In plain text, indicate underlines with **double asterisks**
  so the UI can render them bold/underlined.
  e.g. "Choose the word nearest in meaning to the **underlined** word in the sentence:
       The politician was **garrulous** during the debate."
  NEVER leave a question that says "the underlined word" without including the
  actual underlined word in the question_text using **word** markers.
  If the original PDF uses italics for emphasis, use *single asterisks* for italics.

WORD STRESS MARKS (English phonetics):
  Use ˈ (primary stress) and ˌ (secondary stress) directly as characters.
  e.g. ˈrecord (noun) vs reˈcord (verb)

We use KaTeX to render math. Wrap ALL mathematical expressions in $...$

FRACTIONS — always use \\frac:
  ✓  $\\frac{1}{x} + \\frac{4}{3x} = 0$
  ✗  1/x + 4/3x = 0

MIXED FRACTIONS:
  ✓  $4\\frac{7}{9}$   or   $2\\frac{1}{3}$
  ✗  4 7/9   or   2 1/3

POWERS:
  ✓  $x^2$,  $a^{n+1}$,  $2^{10}$,  $p^{-2}$
  ✗  x^2 written outside $ delimiters

SQUARE ROOTS:
  ✓  $\\sqrt{x}$,  $\\sqrt{\\frac{t-p}{r}}$
  ✗  sqrt(x),  √x

LOGARITHMS:
  ✓  $\\log_{2} 8$,  $\\log_{10} x$,  $\\ln x$
  ✗  log_2(8)

ALGEBRAIC EXPRESSIONS — always wrap in $...$:
  ✓  $M = \\frac{3n}{2p^2}$
  ✗  M = 3n/2p^2

SET NOTATION:
  ✓  $\\{1, 7, 8\\}$  (always inside $ delimiters)
  ✗  \\{1, 7, 8\\}  (outside $ — renders as literal braces)

GEOMETRY / TRIANGLES:
  ✓  $\\Delta PQR$,  $\\angle PQR = 34^{\\circ}$
  ✗  deltaPQR,  ΔPR  (without proper LaTeX)

CURRENCY — CRITICAL:
  ✓  ₦500.00  (use ₦ directly for Naira)
  ✓  GH₵500.00  (Ghana cedis — use character directly)
  ✓  $\\$500.00$  (US dollars inside math delimiters)
  ✗  \\500.00  (backslash before number — NEVER do this)
  ✗  \\text{N}500  (never use \\text{N} for Naira)

SPACING — CRITICAL:
  Always keep spaces between all words.
  Never join words that were on separate lines in the PDF.

SYMBOLS:
  × → \\times    ÷ → \\div    ± → \\pm    ∴ → \\therefore
  ≤ → \\leq      ≥ → \\geq    ≠ → \\neq   ∞ → \\infty
  π → \\pi       α → \\alpha  β → \\beta  θ → \\theta

EVERY mathematical expression — no matter how short — goes inside $...$

═══════════════════════════════════════════════
PART 4 — TAG TO CURRICULUM
═══════════════════════════════════════════════

- topic_title: main topic (specific, match the curriculum tree)
- subtopic_title: specific subtopic (match the curriculum tree exactly if possible)
- difficulty:
    easy   = direct recall or single substitution
    medium = 2–3 step application
    hard   = multi-step reasoning or unfamiliar context

═══════════════════════════════════════════════
RETURN FORMAT — JSON ARRAY ONLY
═══════════════════════════════════════════════

Return ONLY a valid JSON array. No markdown, no preamble, no explanation.

[
  {
    "exam": "${examType}",
    "subject": "${subjectName}",
    "year": "",
    "passage_text": null,
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
        "Step one — one line only",
        "Step two — one line only",
        "Answer"
      ],
      "wrong_options": {
        "B": "one sentence explaining why B is wrong",
        "C": "one sentence explaining why C is wrong",
        "D": "one sentence explaining why D is wrong"
      }
    },
    "topic_title": "",
    "subtopic_title": "",
    "difficulty": "medium"
  }
]`
}

// ── Image question prompt ─────────────────────────────────────────────────────
export function buildImageQuestionPrompt(examType, subjectName) {
  const examContext = {
    WAEC:  'Nigerian WAEC',
    JAMB:  'Nigerian JAMB/UTME',
    IGCSE: 'Cambridge IGCSE',
  }
  const ctx = examContext[examType] ?? examType

  return `You are an expert teacher analysing a ${ctx} exam question that contains a diagram or image.

Subject: ${subjectName}
Exam: ${examType}

STEP 0 — DETECT SHARED CONTEXT (CRITICAL)
Before extracting the question, check whether it depends on any shared context.
Shared context includes ANY of:

  • An instruction telling the student how to answer this and nearby questions
    e.g. "In questions 1–5, choose the word nearest in meaning to the underlined word."
  • A reading passage, poem, or prose extract
  • A scenario or given-information block shared by multiple questions
  • A data table or chart (copy the data as text into passage_text)
  • A shared diagram or figure used by multiple questions
    → For a shared diagram: describe it in passage_text AND set has_image: true
      so the admin knows to upload the image for each affected question

RULE: Copy the FULL shared context into passage_text on this question AND every
other question in the group. Do not truncate. Students see questions in random
CBT order — each question must be completely self-contained.

No shared context → passage_text: null

STEP 1 — DESCRIBE THE DIAGRAM
Write a precise image_description covering: type of diagram, all labels, measurements, values shown.

STEP 2 — EXTRACT THE QUESTION
Extract question_text and all options A–D exactly as written. Set has_image: true.

STEP 3 — SOLUTION
"workings" MUST be a JSON array of strings. One mathematical line per string. No prose.

Example for a circuit:
  ["Given: R1 = 4Ω, R2 = 6Ω in parallel",
   "$\\frac{1}{R} = \\frac{1}{4} + \\frac{1}{6}$",
   "$\\frac{1}{R} = \\frac{5}{12}$",
   "$R = \\frac{12}{5} = 2.4\\,\\Omega$"]

FORMATTING: same KaTeX rules as main prompt — wrap ALL math in $...$
Use ₦ for Naira directly. Never \\text{N} or \\500.

"wrong_options": include ALL wrong options (B, C, D) — one sentence each explaining the specific mistake. The UI will only show the one the student picked.

Return ONLY valid JSON:

{
  "exam": "${examType}",
  "subject": "${subjectName}",
  "year": "",
  "passage_text": null,
  "question_text": "",
  "has_image": true,
  "image_description": "",
  "options": { "A": "", "B": "", "C": "", "D": "" },
  "correct_answer": "A",
  "explanation": {
    "correct": "",
    "workings": ["step 1", "step 2", "answer"],
    "wrong_options": { "B": "...", "C": "...", "D": "..." }
  },
  "topic_title": "",
  "subtopic_title": "",
  "difficulty": "medium"
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

  // ── Sanitise all string fields with cleanLatex ────────────────────────────
  parsed.forEach(q => cleanQuestion(q))

  // ── Normalise workings: string blob → array ───────────────────────────────
  parsed.forEach(q => {
    if (!q.explanation) return
    const w = q.explanation.workings
    if (typeof w === 'string' && w.trim()) {
      q.explanation.workings = w
        .split(/\.\s+|\n+/)
        .map(s => s.trim())
        .filter(Boolean)
    } else if (Array.isArray(w)) {
      q.explanation.workings = w.flatMap(line => {
        if (typeof line === 'string' && line.length > 150) {
          return line.split(/\.\s+/).map(s => s.trim()).filter(Boolean)
        }
        if (typeof line === 'object') {
          return [line?.instruction ?? line?.text ?? String(line)]
        }
        return [line]
      }).filter(Boolean)
    }
  })

  // ── Validate ──────────────────────────────────────────────────────────────
  const errors = []

  parsed.forEach((q, i) => {
    const label = `Question ${i + 1}`
    if (!q.question_text?.trim())  errors.push(`${label}: missing question_text`)
    if (!q.options?.A?.trim())     errors.push(`${label}: missing option A`)
    if (!q.options?.B?.trim())     errors.push(`${label}: missing option B`)
    if (!q.options?.C?.trim())     errors.push(`${label}: missing option C`)
    if (!q.options?.D?.trim())     errors.push(`${label}: missing option D`)
    if (!q.correct_answer)         errors.push(`${label}: missing correct_answer`)
    if (!q.difficulty)             errors.push(`${label}: missing difficulty`)
    // question_type intentionally not validated — column dropped from DB
  })

  if (errors.length > 0) {
    return { valid: false, errors, questions: [] }
  }

  return {
    valid: true,
    errors: [],
    questions: parsed,
    stats: {
      total:        parsed.length,
      easy:         parsed.filter(q => q.difficulty === 'easy').length,
      medium:       parsed.filter(q => q.difficulty === 'medium').length,
      hard:         parsed.filter(q => q.difficulty === 'hard').length,
      withWorkings: parsed.filter(q => q.explanation?.workings?.length > 0).length,
      withImages:   parsed.filter(q => q.has_image).length,
      withPassage:  parsed.filter(q => q.passage_text).length,
    },
  }
}

// ── Subtopic-first curriculum matching ───────────────────────────────────────
//
// Scores ALL subtopics across ALL topics directly against q.subtopic_title.
// Parent topic is inferred from the winning subtopic.
// Topic name provides a small tiebreaker bonus (×0.2) but does not gate search.
//
// Confidence thresholds:
//   ≥ 0.7  → confirmed  (green badge, needsReview: false)
//   0.4–0.69 → low confidence (amber, needsReview: true)
//   < 0.4  → no match  (red, manual tagging required)

export function matchTopicSubtopic(question, topics) {
  const qSubtopic = (question.subtopic_title ?? '').toLowerCase().trim()
  const qTopic    = (question.topic_title    ?? '').toLowerCase().trim()

  // Score every subtopic across every topic
  const candidates = []

  for (const topic of topics) {
    const topicScore = stringSimilarity(qTopic, topic.name.toLowerCase())
    // Topic bonus: strong when topic name matches well, small when it doesn't
    // This prevents a good topic match from overriding a bad subtopic match
    const topicBonus = topicScore * 0.25

    for (const sub of topic.subtopics ?? []) {
      const subScore = stringSimilarity(qSubtopic, sub.name.toLowerCase())
      const combined = Math.min(subScore + topicBonus, 1)

      if (combined > 0.1) { // filter out totally irrelevant
        candidates.push({
          topic,
          subtopic:   sub,
          score:      combined,
          subScore,
          topicScore,
        })
      }
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score)

  // Top 3 suggestions for UI display
  const suggestions = candidates.slice(0, 3).map(c => ({
    topic:        c.topic,
    subtopic:     c.subtopic,
    score:        c.score,
    label:        `${c.topic.name} → ${c.subtopic.name}`,
  }))

  const best       = candidates[0]
  const confidence = best ? Math.min(best.score, 1) : 0

  const base = {
    aiTopicTitle:    question.topic_title    ?? '',
    aiSubtopicTitle: question.subtopic_title ?? '',
    suggestions,  // top 3 ranked matches for UI
  }

  if (!best || confidence < 0.35) {
    return { ...base, topic: null, subtopic: null, confidence: 0, needsReview: true }
  }

  return {
    ...base,
    topic:       best.topic,
    subtopic:    best.subtopic,
    confidence,
    needsReview: confidence < 0.65,
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

  // Substring containment bonus
  const longer  = na.length >= nb.length ? na : nb
  const shorter = na.length >= nb.length ? nb : na
  const containment = longer.includes(shorter) ? 0.8 : 0

  // Word-overlap (Jaccard)
  const wordsA  = new Set(na.split(/\s+/).filter(Boolean))
  const wordsB  = new Set(nb.split(/\s+/).filter(Boolean))
  const inter   = [...wordsA].filter(w => wordsB.has(w)).length
  const union   = new Set([...wordsA, ...wordsB]).size
  const jaccard = union > 0 ? inter / union : 0

  return Math.max(containment, jaccard)
}

// ── SdashAPI Enrichment Prompt ────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// buildSdashEnrichPrompt
//
// Generates a LEAN prompt the admin copies into Claude/Gemini.
//
// What the AI receives:
//   - Each question's text + original solution (as reference, not to copy)
//   - The curriculum topic list (names only — short numbered list)
//
// What the AI returns (small JSON — enrichment delta only):
//   [{ index, explanation: { correct, workings[], wrong_options:{} }, topic_title, subtopic_title, difficulty }]
//
// The original question data (text, options, answer) stays in fetchedQuestions
// on the client. mergeSdashEnrichment() joins them together before save.
//
// Keeping the output small prevents the AI truncating mid-array and avoids the
// parse errors we were getting when we asked it to echo back the full question.
// ─────────────────────────────────────────────────────────────────────────────

// ── SdashAPI Enrichment Prompt ────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// buildSdashEnrichPrompt — v2 (Claude-optimised, mastery-first)
//
// KEY CHANGES FROM v1:
//   • Explanation style rewritten for simple English that a smart 12-year-old
//     can follow — not dumbed-down, but plain and direct
//   • "correct" field: first VERIFIES the answer is correct with a brief
//     reason, then explains the underlying concept in 1–3 sentences
//   • "concept" field added: one-line core concept the question is testing
//   • Wrong options explanations name the specific misconception, not just
//     "this is wrong" — crucial for exam prep
//   • Maths/science workings: each step labelled (Given, Formula, Substitute,
//     Solve, Check) so students can follow the logic, not just copy numbers
//   • Tone: direct, warm, encouraging — like a smart older sibling explaining
//     something, not a textbook
// ─────────────────────────────────────────────────────────────────────────────

export function buildSdashEnrichPrompt(rawQuestions, examType, subjectName, topics = []) {
  const examContext = {
    WAEC:  'Nigerian WAEC (West African Examinations Council)',
    JAMB:  'Nigerian JAMB/UTME (Joint Admissions and Matriculation Board)',
    IGCSE: 'Cambridge IGCSE',
  }
  const ctx = examContext[examType] ?? examType

  const topicList = topics.length
    ? topics.map((t, i) => `${i + 1}. ${t.name}`).join('\n')
    : '(curriculum not yet loaded — suggest the most accurate topic name you know)'

  const isMathSci = /physics|chemistry|mathematics|further math|biology|economics/i.test(subjectName)
  const isLanguage = /english|literature|yoruba|igbo|hausa/i.test(subjectName)

  const questionLines = rawQuestions.map((q, i) => {
    const opts = typeof q.options === 'object' && !Array.isArray(q.options)
      ? Object.entries(q.options).map(([k, v]) => `   ${k}. ${v}`).join('\n')
      : ''
    const answer = q.answer ? `\n   ✓ Correct answer: ${q.answer}` : ''
    const sol = q.solution ? `\n   Original solution hint: ${q.solution.trim().slice(0, 200)}` : ''
    return `[${i + 1}] (${q.examyear ?? '?'}) ${(q.question ?? '').trim()}\n${opts}${answer}${sol}`
  }).join('\n\n')

  const mathSciWorkingsGuide = `
"workings": Array of step-by-step strings. Each step must be a complete, readable line — not just a formula.
Label your steps: "Given:", "Formula:", "Substitute:", "Solve:", "Answer:"
GOOD EXAMPLE (Physics — velocity):
  ["Given: initial velocity u = 0, acceleration a = 10 m/s², time t = 5s",
   "Formula: v = u + at",
   "Substitute: v = 0 + (10 × 5)",
   "Solve: v = 50 m/s ✓"]
BAD EXAMPLE:
  ["Use v = u + at", "Get 50"]
For pure recall questions with no calculation: use []`

  const nonMathWorkingsGuide = `
"workings": Always [] for this subject — no calculation steps needed.
Put any extra clarification in the "correct" field instead.`

  return `You are helping Nigerian secondary school students prepare for ${ctx} — ${subjectName}.

Your job is to write clear, student-friendly explanations for each question below.
You have been given the correct answer and an original solution hint. Use these to stay accurate, but write your own explanation in simple, plain English.

═══════════════════════════════════════
EXPLANATION QUALITY STANDARDS
═══════════════════════════════════════

Your explanations must meet these three standards:

1. VERIFY FIRST
   Start the "correct" field by confirming which answer is right and why — one sentence.
   Then explain the concept behind it — 1 to 2 more sentences.
   Total: 2–3 sentences maximum for "correct". No padding.

2. PLAIN ENGLISH — EXPLAIN LIKE A SMART 12-YEAR-OLD WOULD UNDERSTAND
   Avoid textbook language. Say "speed increases" not "velocity is augmented."
   If a concept needs a real-world comparison to click, use one.
   No long paragraphs. Short sentences. Every word earns its place.
   GOOD: "The correct answer is B — osmosis. Water moves from a dilute solution
         to a concentrated one through a semi-permeable membrane. Think of it like
         water being 'pulled in' to balance things out."
   BAD:  "The correct option is B because osmosis is a process by which solvent
         molecules pass through a semipermeable membrane from a less concentrated
         solution to a more concentrated one."

3. NAME THE MISCONCEPTION IN WRONG OPTIONS
   For each wrong option, explain the SPECIFIC mistake a student makes when they pick it.
   Don't just say "this is incorrect." Say WHY a student might think it's right, and what's wrong with that thinking.
   GOOD: "D — diffusion. Students confuse this with osmosis. Diffusion is about particles moving,
         not specifically water through a membrane."
   BAD:  "D is wrong because diffusion is different from osmosis."

"concept" field: One short line naming the core idea being tested.
   e.g. "Osmosis vs diffusion", "Newton's second law", "Subject-verb agreement"
   This appears as a label above the explanation in the app.

${isMathSci ? mathSciWorkingsGuide : nonMathWorkingsGuide}

MATHS FORMATTING
Wrap expressions in $…$: $v = u + at$, $\\frac{1}{2}mv^2$, $\\sqrt{x+1}$
Use ₦ directly for Naira. Symbols: × → \\times, ÷ → \\div, π → \\pi, ≠ → \\neq

DIFFICULTY GUIDE
easy   — direct recall, one-step, straightforward
medium — requires understanding, 2–3 steps, some reasoning
hard   — multi-step, tricky wording, requires deep understanding

TOPIC TAGGING
Pick the single closest topic from this numbered list:
${topicList}

═══════════════════════════════════════
QUESTIONS
═══════════════════════════════════════

${questionLines}

═══════════════════════════════════════
OUTPUT — JSON ARRAY ONLY
═══════════════════════════════════════
Return ONLY a valid JSON array. No markdown, no text before or after the array.
One object per question, in the same order as the questions above.

[
  {
    "index": 1,
    "topic_title": "exact topic name from the list above",
    "subtopic_title": "specific subtopic if you know it, or empty string",
    "difficulty": "easy",
    "explanation": {
      "concept": "One-line core concept being tested",
      "correct": "Verify the answer in one sentence. Then explain the concept in 1–2 more sentences. Plain English, no padding.",
      "workings": ["Step 1 — labelled", "Step 2 — labelled", "Answer ✓"],
      "wrong_options": {
        "B": "Name the specific misconception — why a student picks this and what's wrong with that thinking",
        "C": "Same — name the specific mistake",
        "D": "Same — name the specific mistake"
      }
    }
  }
]`
}

//
// Merges the AI's enrichment delta onto the original SdashAPI question data.
// Called in the import page after parseEnrichment() validates the paste-back.
// The merged result goes straight into the Tag Review UI (same as upload flow).
// ─────────────────────────────────────────────────────────────────────────────
export function mergeSdashEnrichment(fetchedQuestions, enrichments, examType, subjectName) {
  // Build index → enrichment map (AI returns 1-based index)
  const byIndex = {}
  for (const e of (enrichments ?? [])) {
    if (e.index != null) byIndex[Number(e.index)] = e
  }

  return fetchedQuestions.map((q, i) => {
    const e = byIndex[i + 1] ?? {}
    return {
      exam:          examType,
      subject:       subjectName,
      year:          q.examyear ?? '',
      passage_text:  q.section  ?? null,
      question_text: (q.question ?? '').trim(),
      has_image:     !!(q.image),
      image_description: '',
      options: {
        A: q.option?.a ?? q.option?.A ?? '',
        B: q.option?.b ?? q.option?.B ?? '',
        C: q.option?.c ?? q.option?.C ?? '',
        D: q.option?.d ?? q.option?.D ?? '',
        ...(q.option?.e || q.option?.E ? { E: q.option.e ?? q.option.E } : {}),
      },
      correct_answer: (q.answer ?? '').toUpperCase(),
      explanation: e.explanation ?? {
        correct: q.solution?.trim() ?? '',
        workings: [],
        wrong_options: {},
      },
      topic_title:    e.topic_title    ?? '',
      subtopic_title: e.subtopic_title ?? '',
      difficulty:     e.difficulty     ?? 'medium',
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// parseEnrichment
//
// Parses the lean AI enrichment response.
// Same cleaning pipeline as parseQuestions, validates enrichment shape.
// ─────────────────────────────────────────────────────────────────────────────

// Internal helper — escape literal newlines/tabs only inside JSON string values
function _escapeControlsInsideStrings(text) {
  let out = ''
  let inStr = false
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (inStr) {
      if (ch === '\\') { out += ch + (text[i+1] ?? ''); i += 2; continue }
      if (ch === '"')  { inStr = false; out += ch; i++; continue }
      if (ch === '\n') { out += '\\n'; i++; continue }
      if (ch === '\r') { out += '\\r'; i++; continue }
      if (ch === '\t') { out += '\\t'; i++; continue }
    } else {
      if (ch === '"') inStr = true
    }
    out += ch; i++
  }
  return out
}

export function parseEnrichment(rawText) {
  if (!rawText?.trim()) return { valid: false, errors: ['No content pasted'], enrichments: [] }

  let cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // Normalise Unicode punctuation AI models commonly emit
  cleaned = cleaned
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')

  // Strip illegal control characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Escape unescaped newlines/tabs inside string values only
  cleaned = _escapeControlsInsideStrings(cleaned)

  // Trailing comma repair
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    try {
      parsed = JSON.parse(cleaned.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' '))
    } catch (err2) {
      return { valid: false, errors: [`Invalid JSON: ${err2.message}`], enrichments: [] }
    }
  }

  if (!Array.isArray(parsed)) {
    return { valid: false, errors: ['Expected a JSON array — make sure the AI returned [...]'], enrichments: [] }
  }
  if (parsed.length === 0) {
    return { valid: false, errors: ['Array is empty'], enrichments: [] }
  }

  const errors = []
  parsed.forEach((e, i) => {
    const n = e.index ?? i + 1
    if (!e.explanation?.correct?.trim()) errors.push(`Question ${n}: explanation.correct is empty`)
    if (!e.topic_title?.trim())          errors.push(`Question ${n}: topic_title is missing`)
    if (!['easy','medium','hard'].includes(e.difficulty)) errors.push(`Question ${n}: difficulty must be easy / medium / hard`)
  })

  return { valid: errors.length === 0, errors, enrichments: parsed }}