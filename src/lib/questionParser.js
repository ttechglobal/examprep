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

  // 7. Stray LaTeX display/inline delimiters that leaked into plain text
  //    e.g. \$ appearing as literal text (not inside math), \text{...}, \dfrac leaked
  //    Strip backslash-dollar that isn't part of a $ math block
  s = s.replace(/\\dfrac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
  s = s.replace(/\\text\{([^}]*)\}/g, '$1')

  // 8. "The correct answer is X - text" → use em dash instead of hyphen
  //    Normalise hyphen-minus used as separator after answer letter
  s = s.replace(
    /((?:The )?correct answer is\s+[A-Ea-e])\s*-\s*/gi,
    (_, prefix) => `${prefix} — `
  )

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

"concept" field: One short phrase naming the principle tested.
  e.g. "Curved surface area of a cylinder" / "Linear equations" / "Osmosis vs diffusion"

"correct" field: 1–2 plain-English sentences explaining WHY the correct answer is right. No math notation here.

"steps" field — CALCULATION QUESTIONS (Maths, Physics, Chemistry, Further Maths,
  Economics, Geography, Biology magnification/genetics, Commerce %):

  Array of step objects: { "title": "Short action label", "lines": ["..."] }
  EVERY equation line MUST be wrapped in $...$:
    GOOD: { "title": "Apply the formula", "lines": ["$v = u + at$", "$v = 0 + 10 \\times 5$", "$v = 50$ m/s"] }
    BAD:  { "title": "Solve", "lines": ["v = u + at", "v = 50 m/s"] }  ← no $ = caret shows, fractions break
  ONE operation per line — never combine substitution + calculation on the same line.
  Powers: $(1.03)^{3}$ not 1.03^3. Fractions: $\\frac{22}{7}$ not 22/7.
  Pure recall questions (no calculation): "steps": []

"steps" field — ENGLISH / LANGUAGE / HUMANITIES (English Language, Use of English,
  Literature, Yoruba, Igbo, Hausa, Government, CRK, History, Commerce concepts):

  Set "steps": [] always. Explain in the "correct" field instead:
  GOOD: "The word 'garrulous' means excessively talkative. 'Talkative' is the nearest synonym."
  GOOD: "Section 14 of the 1999 Nigerian Constitution defines Nigeria as a democratic state. Option C quotes this correctly."
  BAD: ["Step 1: identify root word", "Step 2: match synonym"] — never steps for language/humanities.

"wrong_options": for EACH wrong option (B, C, D — and E if present), explain the specific mistake.
Always include ALL wrong options — the UI shows only the one the student picked, but we store all of them.
Each explanation: (1) what the student was probably thinking, (2) why that is wrong, (3) the correct principle.
BAD: "This option is incorrect."
GOOD: "A student choosing B has confused osmotic pressure with turgor pressure — osmosis depends on water potential difference, not pressure alone."

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

SYMBOLS (inside $ only — these are KaTeX commands, not plain text characters):
  × → \\times    ÷ → \\div    ± → \\pm    ∴ → \\therefore
  ≤ → \\leq      ≥ → \\geq    ≠ → \\neq   ∞ → \\infty
  π → \\pi       α → \\alpha  β → \\beta  θ → \\theta

EVERY mathematical expression — no matter how short — goes inside $...$
Plain prose text (question_text, answer_note, hint, study_tip) uses Unicode directly:
  Write × ÷ π √ as characters. Write "3 squared" or "x²". Do NOT use \\times or \\pi in prose.

═══════════════════════════════════════════════
PART 4 — TAG TO CURRICULUM
═══════════════════════════════════════════════

- topic_title: main topic (specific, match the curriculum tree)
- subtopic_title: specific subtopic (match the curriculum tree exactly if possible)

═══════════════════════════════════════════════

═════════════════════════════════════════════
PART 5 — SVG DIAGRAMS (STEM SUBJECTS)
═════════════════════════════════════════════

For Mathematics, Physics, Chemistry, Further Mathematics, Biology, Geography:
Whenever a question involves a geometric shape, graph, circuit, force diagram,
molecular structure, coordinate axis, or any spatial concept — CREATE AN SVG.

QUESTION-LEVEL svg_diagram: (top-level field)
  Draw the described setup. Label all given values. Accent the unknown in #4f46e5.
  e.g. "A cylinder of radius 3.5 cm and height 10 cm…" → draw the labelled cylinder
  e.g. "Forces P and Q act at 60° to each other…" → draw the force diagram
  e.g. "ABCD is a rectangle with AB = 8 cm, BC = 5 cm…" → draw the labelled rectangle

EXPLANATION-LEVEL svg_diagram: (inside explanation object)
  ALWAYS add to the explanation of any geometric/spatial calculation.
  Show the worked solution: label the values used, highlight the answer.

SVG RULES:
  - viewBox="0 0 280 200" · scales to the mobile card width
  - stroke="#1e293b" fill="none" for outlines · fill="#1e293b" for labels
  - Accent colour #4f46e5 for the key measurement or answer
  - font-size="13" font-family="system-ui,sans-serif" on all <text> elements
  - Include <title> describing what it shows
  - Clean and minimal — label clearly, avoid clutter
  - If no diagram is useful: svg_diagram: "" (empty string — never force one)

EXAMPLE — cylinder with r=3.5cm h=10cm:
  "svg_diagram": "<svg viewBox=\"0 0 280 200\" xmlns=\"http://www.w3.org/2000/svg\"><title>Cylinder r=3.5cm h=10cm</title><ellipse cx=\"140\" cy=\"48\" rx=\"72\" ry=\"22\" stroke=\"#1e293b\" stroke-width=\"1.5\" fill=\"#f1f5f9\"/><rect x=\"68\" y=\"48\" width=\"144\" height=\"112\" fill=\"#f1f5f9\" stroke=\"none\"/><line x1=\"68\" y1=\"48\" x2=\"68\" y2=\"160\" stroke=\"#1e293b\" stroke-width=\"1.5\"/><line x1=\"212\" y1=\"48\" x2=\"212\" y2=\"160\" stroke=\"#1e293b\" stroke-width=\"1.5\"/><ellipse cx=\"140\" cy=\"160\" rx=\"72\" ry=\"22\" stroke=\"#1e293b\" stroke-width=\"1.5\" fill=\"#f1f5f9\"/><line x1=\"140\" y1=\"48\" x2=\"212\" y2=\"48\" stroke=\"#4f46e5\" stroke-width=\"2\" stroke-dasharray=\"5,3\"/><text x=\"148\" y=\"43\" font-size=\"12\" fill=\"#4f46e5\" font-family=\"system-ui\">r = 3.5 cm</text><line x1=\"220\" y1=\"48\" x2=\"220\" y2=\"160\" stroke=\"#64748b\" stroke-width=\"1.5\"/><text x=\"225\" y=\"108\" font-size=\"12\" fill=\"#64748b\" font-family=\"system-ui\">h = 10 cm</text></svg>"

═════════════════════════════════════════════
PART 6 — ENGLISH / LANGUAGE INSTRUCTION TEXT
═════════════════════════════════════════════

For English Language, Use of English, Literature in English, Yoruba, Igbo, Hausa, French:
Many exam questions depend on a section instruction printed once that applies to
a group of questions. Students CANNOT answer without it. Each question MUST carry
its own instruction_text since they appear in random CBT order.

RULE: Set instruction_text when the question is any of these types:
  Fill-the-blank/cloze:   "Choose the option that best fills the gap."
  Synonym/nearest meaning:"Choose the word nearest in meaning to the underlined word."
  Antonym/opposite:       "Choose the word opposite in meaning to the underlined word."
  Sentence completion:    "Choose the option that best completes the sentence."
  Word stress/phonetics:  "Identify the word with the same stress pattern as the given word."
  Rhyme:                  "Which word rhymes with the word given?"
  Grammar correction:     "Choose the option that correctly fills the gap."
  Comprehension:          "Answer based on the passage above." (passage goes in passage_text)

  If the instruction appears verbatim in the PDF: copy it exactly.
  If the instruction is missing from the PDF but the question type is clear: write it
  yourself using the standard WAEC/JAMB phrasing above.
  If the question is self-contained (no instruction needed): instruction_text: null

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
      "concept": "one-line name of the principle tested",
      "correct": "why the correct answer is right — 1-2 sentences",
      "answer_note": "The correct answer is [LETTER] — [option text]. 1-2 warm sentences.",
      "steps": [],
      "svg_diagram": "",
      "hint": "one sentence nudging toward solution without revealing the answer",
      "study_tip": "",
      "wrong_options": {
        "B": "one sentence: specific misconception behind option B",
        "C": "one sentence: specific misconception behind option C",
        "D": "one sentence: specific misconception behind option D"
      }
    },
    "svg_diagram": "",
    "instruction_text": null,
    "topic_title": "",
    "subtopic_title": ""
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
  "subtopic_title": ""
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
//   [{ index, explanation: { correct, workings[], wrong_options:{} }, topic_title, subtopic_title }]
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
    : '(use the most accurate topic name you know)'

  // Subjects that need step-by-step calculation workings
  // isCalc: subjects that need step-by-step calculation workings
  // Covers all STEM + commercial calculation subjects
  const isCalc = /physics|chemistry|mathematics|further math|economics|geography|biology|commerce|agricultural/i.test(subjectName)
  const isBio  = false  // biology is now included in isCalc — kept for backwards compat

  // ── Format questions inline into the prompt ──────────────────────────────
  const questionLines = rawQuestions.map((q, i) => {
    const opts = Object.entries(q.option ?? {})
      .map(([k, v]) => `   ${k.toUpperCase()}. ${v}`)
      .join('\n')
    const answer  = (q.answer ?? '').toUpperCase()
    const hint    = q.solution ? `\n   Solution hint: ${q.solution.trim().slice(0, 200)}` : ''
    return `Q${i + 1}. ${(q.question ?? '').trim()}\n${opts}\n   ✓ Answer: ${answer}${hint}`
  }).join('\n\n')

  const calcWorkingsGuide = `
"steps": REQUIRED for every STEM calculation question. Array of step objects.
Each step: { "title": "Short action label", "lines": ["$equation 1$", "$equation 2$"] }

══════════════════════════════════════════════════════
THE SINGLE MOST IMPORTANT RULE — READ THIS CAREFULLY
══════════════════════════════════════════════════════

Every line inside "lines" MUST be wrapped in $...$
This is not optional. This is how the app renders math. Without $, the student sees raw text.

  CORRECT: { "title": "Apply the formula", "lines": ["$v = u + at$", "$v = 0 + (10 \\times 5)$", "$v = 50$ m/s"] }
  WRONG:   { "title": "Apply the formula", "lines": ["v = u + at", "v = 0 + 50", "v = 50 m/s"] }

  CORRECT: { "title": "Substitute values", "lines": ["$A = 3000 \\times (1.03)^{3}$"] }
  WRONG:   { "title": "Substitute values", "lines": ["A = 3000 × (1.03)^3"] }

POWERS — always brace multi-char exponents and use $ delimiters:
  CORRECT: "$x^{2}$"   "$a^{n+1}$"   "$(1.03)^{3}$"   "$P(1+r)^{n}$"
  WRONG:   "x^2"       "a^n+1"       "1.03^3"          "P(1+r)^n"    ← raw carets always show

FRACTIONS — always use \frac inside $:
  CORRECT: "$\\frac{1}{2}$"   "$\\frac{22}{7}$"   "$\\frac{x+1}{2}$"
  WRONG:   "1/2"               "22/7"               "(x+1)/2"        ← renders as plain slash

MIXED FRACTIONS:
  CORRECT: "$4\\frac{7}{9}$"   "$2\\frac{1}{3}$"
  WRONG:   "4 7/9"              "2 1/3"

MULTIPLICATION in equations: use \times inside $
  CORRECT: "$3000 \\times 1.0927$"   "$2 \\times \\pi \\times r$"
  WRONG:   "3000 × 1.0927"            "2 × π × r"

SQUARE ROOTS:
  CORRECT: "$\\sqrt{100}$"   "$\\sqrt{b^{2} - 4ac}$"
  WRONG:   "√100"             "sqrt(b²-4ac)"

SPECIAL VALUES: π → $\\pi$  · θ → $\\theta$  · ° → $90^{\\circ}$  · ≈ → $\\approx$

══════════════════════════════════════════════════════
ONE OPERATION PER LINE — NO SKIPPING STEPS
══════════════════════════════════════════════════════

Every single algebraic move gets its own line. Students must be able to follow each transition.

  WRONG: ["$x - 3 = 10$", "$x = 7$"]                         ← what happened?
  RIGHT: ["$x - 3 = 10$", "$x = 10 + 3$", "$x = 13$"]       ← every move shown

  WRONG: ["$v^{2} = u^{2} + 2as = 0 + 100 = 100$", "$v = 10$ m/s"]  ← three operations merged
  RIGHT: ["$v^{2} = u^{2} + 2as$", "$v^{2} = 0 + 2 \\times 10 \\times 5$", "$v^{2} = 100$", "$v = \\sqrt{100}$", "$v = 10$ m/s"]

  WRONG: ["$CSA = 2 \\times \\frac{22}{7} \\times 4 \\times 14 = 352$ cm²"]  ← substitution + answer combined
  RIGHT: ["$CSA = 2 \\times \\pi \\times r \\times h$", "$CSA = 2 \\times \\frac{22}{7} \\times 4 \\times 14$", "$CSA = 2 \\times 176$", "$CSA = 352$ cm²"]

Test: could a student who just finished the previous line do this line themselves?
If yes → one step. If they need to do two things mentally → split it.

══════════════════════════════════════════════════════
STEP STRUCTURE GUIDE
══════════════════════════════════════════════════════

Step titles should be clear action phrases:
  "Write down what we know" / "Identify the formula" / "Substitute the values" /
  "Expand the brackets" / "Collect like terms" / "Solve for x" / "Check the answer"

Minimum steps by question type:
  Substitution (e.g. v = u + at):     3 steps — identify given / write formula / substitute and evaluate
  Algebra (solve for x):              4–5 steps — write equation / expand / collect / solve
  Mensuration (area, volume, CSA):    4–5 steps — formula / find unknowns / substitute / compute / state with units
  Physics / Chemistry calculation:    4–6 steps — state given values / write equation / rearrange if needed / substitute / compute / state answer with units
  Compound growth/decay:              5 steps — identify P, r, n / write formula / substitute / expand step by step / final answer
  Quadratic equations:                5–6 steps — write in standard form / identify a,b,c / apply formula / simplify / evaluate both roots
  Word problems:                      5+ steps — define variables / set up equation / expand / solve / interpret answer

══════════════════════════════════════════════════════
WORKED EXAMPLES — COPY THIS FORMAT EXACTLY
══════════════════════════════════════════════════════

ALGEBRA EXAMPLE (3(2x−5)+4 = 2(x+7)−6 → x = 4.75):
[
  { "title": "Write down the equation",  "lines": ["$3(2x - 5) + 4 = 2(x + 7) - 6$"] },
  { "title": "Expand the brackets",      "lines": ["$6x - 15 + 4 = 2x + 14 - 6$", "$6x - 11 = 2x + 8$"] },
  { "title": "Collect like terms",       "lines": ["$6x - 2x = 8 + 11$", "$4x = 19$"] },
  { "title": "Divide both sides by 4",  "lines": ["$x = \\frac{19}{4}$", "$x = 4.75$"] }
]

COMPOUND INTEREST EXAMPLE (P=3000, r=3%, n=3 years → A≈3278):
[
  { "title": "Write down what we know",   "lines": ["$P = 3000$", "$r = 3\\% = 0.03$", "$n = 3$ years"] },
  { "title": "Identify the formula",      "lines": ["$A = P(1 + r)^{n}$"] },
  { "title": "Substitute the values",     "lines": ["$A = 3000 \\times (1 + 0.03)^{3}$", "$A = 3000 \\times (1.03)^{3}$"] },
  { "title": "Evaluate $(1.03)^{3}$",     "lines": ["$(1.03)^{2} = 1.0609$", "$(1.03)^{3} = 1.0609 \\times 1.03$", "$(1.03)^{3} = 1.0927$"] },
  { "title": "Calculate the final answer","lines": ["$A = 3000 \\times 1.0927$", "$A \\approx 3278$"] }
]

MENSURATION EXAMPLE (CSA of cylinder, r=4cm, h=14cm → 352cm²):
[
  { "title": "Write down the formula",    "lines": ["$CSA = 2 \\times \\pi \\times r \\times h$"] },
  { "title": "Find the radius",           "lines": ["$\\text{diameter} = 8$ cm", "$r = 8 \\div 2 = 4$ cm"] },
  { "title": "Substitute the values",     "lines": ["$CSA = 2 \\times \\frac{22}{7} \\times 4 \\times 14$"] },
  { "title": "Simplify step by step",    "lines": ["$CSA = 2 \\times \\frac{22}{7} \\times 56$", "$CSA = 2 \\times 176$", "$CSA = 352$ cm²"] }
]

For pure recall with NO calculation: "steps": []`

  const nonCalcWorkingsGuide = `"steps": [] — no calculation steps needed for this subject.`

  return `You are writing student-friendly solutions for ${ctx} — ${subjectName}.

Below are ${rawQuestions.length} questions. For EACH one write a clear explanation.

═══════════════════════════════════════
⚠️ CRITICAL — READ BEFORE STARTING
═══════════════════════════════════════

You MUST process questions in EXACTLY the order shown (Q1, Q2, Q3 ...).
Do NOT skip, reorder, or group questions.
Each output object MUST include "question_snippet" — the first 8 words of that question
copied EXACTLY. This is used to verify each explanation matches its question.
If question_snippet does not match the question, the explanation will be rejected.

Before writing any explanation, verify:
  1. Which question number is this? (Q1? Q2?)
  2. What is the correct answer letter shown after "✓ Answer:"?
  3. What is the actual text of that answer option?
Your explanation MUST match the correct answer shown — not what you think is correct.

═══════════════════════════════════════
QUESTIONS
═══════════════════════════════════════

${questionLines}

═══════════════════════════════════════
EXPLANATION STRUCTURE
═══════════════════════════════════════

Each explanation object has these fields:

"concept"      — One short phrase naming what is being tested. E.g. "Curved surface area of a cylinder", "Linear equations", "Osmosis vs diffusion"

"intro"        — One sentence introducing the solution. For calculation: "Let's work through this step by step." For recall: brief context sentence.

"formula_box"  — The key formula for this question, rendered in a highlighted box ABOVE the steps.
                 WHEN TO INCLUDE: any question where a named formula is applied.
                 This means: kinematics (v=u+at, s=ut+½at²), electricity (V=IR, P=IV),
                 mensuration (A=πr², V=½bh), logarithms (logₐ(xy)=logₐx+logₐy),
                 compound interest (A=P(1+r)^n), quadratic formula, trigonometric ratios,
                 pressure (P=F/A), density (ρ=m/V), wave speed (v=fλ), and so on.
                 Write the formula in $...$ KaTeX: e.g. "$V = IR$" or "$A = P(1+r)^{n}$"
                 WHEN NOT TO INCLUDE: pure recall/definition questions, English, humanities.
                 Set to "" when no named formula applies.

"variables_key" — Array of strings that decode each symbol in the formula.
                 REQUIRED whenever formula_box is non-empty.
                 Each entry: "Symbol = what it means (unit if applicable)"
                 Example for V = IR: ["$V$ = voltage (volts, V)", "$I$ = current (amperes, A)", "$R$ = resistance (ohms, Ω)"]
                 Example for A = P(1+r)^n: ["$A$ = final amount", "$P$ = principal (starting amount)", "$r$ = rate per period (as a decimal)", "$n$ = number of periods"]
                 Example for CSA = 2πrh: ["$CSA$ = curved surface area (cm²)", "$r$ = radius (cm)", "$h$ = height (cm)"]
                 Keep each entry short. Use the exact symbol that appears in the formula.
                 Set to [] when formula_box is empty.

"steps"        — ${isCalc || isBio ? 'REQUIRED for calculation questions' : 'leave as []'}
${isCalc || isBio ? calcWorkingsGuide : nonCalcWorkingsGuide}

"answer_note"  — The green confirmation box the student sees.
                 MUST start with: "The correct answer is [LETTER] — [option text]."
                 The LETTER must match the ✓ Answer shown above for this question.
                 Then 1–2 plain-English sentences saying why.
                 No LaTeX. No bold. Keep it warm and clear.

"formula_box"  — (see above)

"variables_key" — (see above)

"hint"         — One sentence, max 20 words. Nudges the student without revealing the answer.
                 This hint appears when a student is STUCK — they chose wrong and need direction.
                 A student who reads it should feel "I know what to try next."
                 For calculations: name the exact formula or the first step to take.
                 For recall: name the principle, law, or category without giving the answer.
                 NEVER say "the answer is", give the option letter, or restate the question.

                 For CALCULATION questions — these are your priority:
                   The best hint names the formula to use OR identifies the first value to isolate.
                   Ask yourself: what is the one thing a stuck student needs to get started?

                   Mensuration:      "Start by identifying the formula for curved surface area of a cylinder."
                   Kinematics:       "Which SUVAT equation connects the values you have been given?"
                   Compound growth:  "Identify P, r and n from the question, then apply the compound formula."
                   Algebra:          "Try expanding the brackets on both sides before collecting like terms."
                   Quadratic:        "Write the equation in the form $ax^2 + bx + c = 0$ first."
                   Logarithm:        "Think about which log law lets you separate the terms."
                   Trigonometry:     "Identify which sides of the triangle are given and which trig ratio connects them."
                   Fractions:        "Find the lowest common denominator before adding the fractions."
                   Word problem:     "Define your variable first — what is the unknown you need to find?"

                 For RECALL questions:
                   Name the principle or law being tested without stating the answer.
                   e.g. "Think about what Newton’s second law says about the relationship between force and acceleration."

"study_tip"    — One short exam technique tip. Only include if genuinely useful. Otherwise "".

"correct"      — Repeat answer_note here exactly (legacy field).

═══════════════════════════════════════
TONE & LANGUAGE
═══════════════════════════════════════

- You are a brilliant, warm older sibling explaining to a younger one. Not a textbook. Not a lecturer.
- Plain English at all times. If a 15-year-old cannot follow it, rewrite it.
- Never say "hence", "thus", "it can be deduced". Say "so", "this means", "that gives us".
- answer_note and hint: prose only. NO math symbols, NO $ delimiters, NO LaTeX.
  Write numbers as words or simple numerals: "using r equals 4 cm" not "$r = 4$".
- No filler. Every sentence must help the student. Cut anything that does not.

TOPIC TAGGING — pick the single closest name from this list:
${topicList}

═══════════════════════════════════════
OUTPUT — JSON ARRAY ONLY
═══════════════════════════════════════

Return ONLY a valid JSON array. No markdown fences, no text before or after.
One object per question, in the SAME ORDER as the questions above (Q1 → index 1).
The array must have EXACTLY ${rawQuestions.length} objects.

[
  {
    "index": 1,
    "question_snippet": "COPY the first 8 words of Q1 here",
    "topic_title": "exact topic name from the list",
    "subtopic_title": "specific subtopic or empty string",
    "explanation": {
      "concept": "Curved surface area of a cylinder",
      "formula_box": "$CSA = 2 \\times \\pi \\times r \\times h$",
      "variables_key": [
        "$CSA$ = curved surface area (cm²)",
        "$r$ = radius of the circular end (cm)",
        "$h$ = height of the cylinder (cm)",
        "$\\pi \\approx \\frac{22}{7}$"
      ],
      "intro": "Let's work through this step by step.",
      "steps": [
        { "title": "Write down the formula",  "lines": ["$CSA = 2 \\times \\pi \\times r \\times h$"] },
        { "title": "Find the radius",          "lines": ["$\\text{diameter} = 8$ cm", "$r = 8 \\div 2 = 4$ cm"] },
        { "title": "Substitute the values",   "lines": ["$CSA = 2 \\times \\frac{22}{7} \\times 4 \\times 14$"] },
        { "title": "Simplify step by step",   "lines": ["$CSA = 2 \\times \\frac{22}{7} \\times 56$", "$CSA = 2 \\times 176$", "$CSA = 352$ cm²"] }
      ],
      "answer_note": "The correct answer is C — 352cm². Using CSA = 2πrh with r = 4cm, h = 14cm and π = 22/7 gives 352cm².",
      "hint": "Think about which formula links curved surface area, radius and height.",
      "study_tip": "Always find the radius (diameter ÷ 2) before substituting into the formula.",
      "correct": "The correct answer is C — 352cm². Using CSA = 2πrh with r = 4cm, h = 14cm and π = 22/7 gives 352cm²."
    }
  }
]

FINAL CHECK before submitting: scan your array. For each object, confirm:
  • index matches Q number
  • question_snippet matches the first 8 words of that question
  • answer_note starts with the correct answer letter from ✓ Answer`
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

  // Secondary match by question_snippet — if the AI included one and the index is off,
  // we can still find the right question by text prefix match.
  function snippetMatch(qText, snippet) {
    if (!snippet || !qText) return false
    const a = qText.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30)
    const b = snippet.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30)
    return a.length > 8 && b.length > 8 && a.startsWith(b.slice(0, 20))
  }

  return fetchedQuestions.map((q, i) => {
    let e = byIndex[i + 1] ?? {}

    // Verify the match — if the AI returned a question_snippet, check it matches
    const snippet = e.question_snippet ?? ''
    const qText   = (q.question ?? '').trim()
    let _mismatch = false

    if (snippet && !snippetMatch(qText, snippet)) {
      // Index-based match failed the snippet check — try to find the right enrichment by snippet
      const allEnrichments = Object.values(byIndex)
      const betterMatch = allEnrichments.find(en =>
        en.question_snippet && snippetMatch(qText, en.question_snippet)
      )
      if (betterMatch) {
        e = betterMatch
      } else {
        _mismatch = true  // Flag this for the admin preview
      }
    }

    // Secondary mismatch check: does the explanation's answer_note start with the correct answer letter?
    // e.g. if correct_answer is "C" but answer_note says "The correct answer is A", flag it.
    if (!_mismatch && e.explanation) {
      const answerNote = (e.explanation.answer_note ?? e.explanation.correct ?? '').toLowerCase()
      const correctLetter = (q.answer ?? '').toLowerCase().trim()
      if (correctLetter && answerNote) {
        // Look for "the correct answer is X" pattern
        const letterMatch = answerNote.match(/correct answer is\s+([a-e])/i)
        if (letterMatch && letterMatch[1].toLowerCase() !== correctLetter) {
          _mismatch = true  // AI explained the wrong answer
        }
      }
    }
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
      hint:           e.explanation?.hint ?? '',
      explanation: e.explanation
        ? {
            // New schema fields
            concept:          e.explanation.concept          ?? '',
            formula_box:      e.explanation.formula_box      ?? '',
            variables_key:    e.explanation.variables_key    ?? [],
            intro:            e.explanation.intro            ?? '',
            steps:            e.explanation.steps            ?? [],
            answer_note:      e.explanation.answer_note      ?? e.explanation.correct ?? '',
            hint:             e.explanation.hint             ?? '',
            study_tip:        e.explanation.study_tip        ?? '',
            wrong_option_note:e.explanation.wrong_option_note ?? '',
            // Legacy compat
            correct:          e.explanation.correct          ?? e.explanation.answer_note ?? '',
            workings:         e.explanation.workings         ?? [],
            wrong_options:    e.explanation.wrong_options    ?? {},
          }
        : {
            concept: '', formula_box: '', variables_key: [],
            intro: '', steps: [], answer_note: q.solution?.trim() ?? '',
            hint: '',
            study_tip: '', wrong_option_note: '',
            correct: q.solution?.trim() ?? '', wrong_options: {},
          },
      topic_title:    e.topic_title    ?? '',
      subtopic_title: e.subtopic_title ?? '',
      _mismatch,   // true if explanation may not match this question
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
    // Note: em dash (\u2014) is intentionally kept in answer_note text; only en dash normalised
    .replace(/\u2013/g, '-')
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
    // Accept either the new answer_note field OR the legacy correct field
    const hasExplanation = e.explanation?.answer_note?.trim() || e.explanation?.correct?.trim()
    if (!hasExplanation) errors.push(`Question ${n}: explanation.answer_note (or correct) is empty`)
    if (!e.topic_title?.trim())          errors.push(`Question ${n}: topic_title is missing`)
  })

  return { valid: errors.length === 0, errors, enrichments: parsed }}