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
//   5. buildSdashEnrichPrompt() — v3: subject-module architecture.
//      Prompt is assembled from subjectModules.js (subject-specific) + core.
// ─────────────────────────────────────────────────────────────────────────────

import { getSubjectModule } from './subjectModules.js'

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

UNDERLINED WORDS (English, Use of English) — CRITICAL:
  Exam papers print certain words underlined (e.g. "Choose the synonym for the UNDERLINED word").
  In plain text, indicate underlines with **double asterisks** so the UI can render them bold/underlined.

  RULE: NEVER leave a question that says "the underlined word" or "the underlined letters" without
  identifying and marking the actual underlined word/letters using **word** markers.

  CORRECT: "Choose the word nearest in meaning to **garrulous** in the sentence:
            The politician was **garrulous** during the debate."
  WRONG:   "Choose the word nearest in meaning to the underlined word in the sentence:
            The politician was garrulous during the debate."
            ← The student cannot see which word is underlined!

  CORRECT: "Choose the option in which the underlined letters sound the same as **ch** in **ch**urch."
  WRONG:   "Choose the option with the same underlined letter sound." ← useless without the word

  If the original PDF uses italics for emphasis or to indicate a word, use *single asterisks* for italics:
  e.g. "The word *ephemeral* is best replaced by..."

FILL-IN-THE-GAP / CLOZE QUESTIONS — CRITICAL:
  The gap/blank MUST be clearly shown in question_text as _____ (five underscores) or [...].
  NEVER omit the gap — without it the question is unanswerable.

  CORRECT: "The policeman ran _____ the armed robbers who had fled."
  WRONG:   "The policeman ran the armed robbers who had fled." ← gap is missing

  If the gap has a word or clause after it that connects back to the sentence, include it:
  CORRECT: "He behaved _____ a manner that surprised everyone."

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

ANGLES — CRITICAL:
  ✓  $64^{\\circ}$           (inside $ delimiters)
  ✓  Since $64^{\\circ} < 180^{\\circ}$, we add $180^{\\circ} - 64^{\\circ} = 116^{\\circ}$
  ✗  \\text{Since } 064∘ < 180^{\\circ}\\text{, we add }  ← NEVER DO THIS
  ✗  064∘064∘                                             ← NEVER duplicate values
  RULE: Never use \\text{...} to wrap sentence prose inside a math expression.
        \\text{} is only for short labels inside equations (e.g. $x_{\\text{max}}$).
        Write prose as normal text. Only the numbers/symbols go inside $...$.

CURRENCY — CRITICAL:
  ✓  ₦500.00  (use ₦ directly for Naira)
  ✓  GH₵500.00  (Ghana cedis — use character directly)
  ✓  $\\$500.00$  (US dollars inside math delimiters)
  ✗  \\500.00  (backslash before number — NEVER do this)
  ✗  \\text{N}500  (never use \\text{N} for Naira)

SPACING — CRITICAL:
  Always keep spaces between all words.
  Never join words that were on separate lines in the PDF.

CHEMICAL FORMULAE — SUBSCRIPTS (CRITICAL for Chemistry questions):
  Chemical formulae in question_text and options MUST use KaTeX subscript notation, not plain text.
  Wrap every formula in $...$ and use _{} for subscripts, ^{} for charges.

  ✓  $\\text{H}_2\\text{O}$                           — water
  ✓  $\\text{H}_2\\text{SO}_4$                        — sulfuric acid
  ✓  $\\text{CO}_2$                                    — carbon dioxide
  ✓  $\\text{Ca(OH)}_2$                                — calcium hydroxide
  ✓  $\\text{C}_6\\text{H}_{12}\\text{O}_6$           — glucose (brace two-digit subscripts!)
  ✓  $2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}$  — balanced equation
  ✓  $\\text{Na}^+$,  $\\text{SO}_4^{2-}$             — ionic charges use ^{}
  ✗  H2O   H₂O   H2SO4   (plain text or Unicode glyphs — NEVER use these)

  COEFFICIENT RULE: the number before a formula in a balanced equation may go inside the $ block:
    $2\\text{NaCl}$ or $\\text{2NaCl}$ — both fine. Never write 2NaCl in plain text.
  TWO-DIGIT SUBSCRIPTS: always brace them — $\\text{C}_{12}$ not $\\text{C}_12$

SYMBOLS (inside $ only — these are KaTeX commands, not plain text characters):
  × → \\times    ÷ → \\div    ± → \\pm    ∴ → \\therefore
  ≤ → \\leq      ≥ → \\geq    ≠ → \\neq   ∞ → \\infty
  π → \\pi       α → \\alpha  β → \\beta  θ → \\theta
  → → \\rightarrow  (use in chemical equations)

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
PART 5 — ILLUSTRATION PROMPTS
═════════════════════════════════════════════

PURPOSE: illustration_prompt is a description that will be pasted into Claude or
another AI to generate SVG code. Write it so the AI produces actual <svg>…</svg>
code — not a picture, not a URL. The description must be precise enough that the
resulting SVG code could be dropped into a page and render correctly without any
human editing.

WHEN TO INCLUDE:
  Generate ONLY when a diagram genuinely helps the student understand the concept.
  Test: "Would a student who read the explanation still be confused without seeing it?"
  If yes — write the prompt. If no — leave "".

  INCLUDE (diagram changes understanding):
    • Geometry: labelled shapes with specific measurements (cylinder, triangle, circle)
    • Force/vector diagrams: arrows, angles, resultant labelled
    • Ray diagrams: refraction, reflection, lenses
    • Electric circuits: components in series/parallel
    • Coordinate geometry: graph with plotted points, lines, intercepts
    • Chemical apparatus: titration, distillation, electrolysis set-up
    • Biological structures: labelled cell, organ, or system diagram
    • Economics: demand/supply curves, shifts, equilibrium point labelled

  EXCLUDE — leave "" (do not generate a prompt):
    • Pure number calculations: simultaneous equations, quadratics, indices,
      fractions, percentages, profit/loss, interest, logs, sequences, probability
    • Recall and definition questions
    • English, literature, government, commerce, history, CRK, IRK
    • Economics recall (no chart needed — just a definition or explanation)
    • Chemistry recall (naming compounds, equations without apparatus)
    • Any question where the written steps fully explain the concept
    • When in doubt — always default to ""

  MATHEMATICS RULE: the vast majority of maths questions get "". Only include
  for geometry (shapes with labelled measurements), coordinate geometry (plotted
  points/lines on a grid), and trigonometry (right-angled triangle with sides
  labelled). Algebra, number, statistics, logs — always "".

VALUES RULE: every measurement in the brief must match the values in your steps —
  not the raw question. If your steps found r = 4 cm, the brief must say r = 4 cm.
  Never copy values from the question text if your steps changed them (e.g. diameter
  halved to find radius).

SVG BRIEF FORMAT — write a precise code specification, not a vague description.
  The AI receiving this will generate SVG code, so specify everything:
    1. viewBox: always "0 0 400 300" (landscape, mobile-safe at 100% width)
    2. Background: white rect filling the viewBox
    3. Every shape: element type, position (cx/cy or x/y), size, fill, stroke
    4. Every label: text content, x/y coordinates, font-size 13–15px minimum, colour
    5. Key/answer element accent: stroke or fill #4f46e5 (indigo)
    6. Main outlines: stroke #1f2937, stroke-width 2
    7. Secondary/dashed lines: stroke-dasharray="6 3", colour #6b7280
    8. Font: font-family="system-ui, sans-serif"
    9. No shadows, no gradients — clean flat educational style

GOOD EXAMPLE — cylinder (geometry, r and h from solved steps):
  "SVG code brief: viewBox 0 0 400 300. White background rect.
   Cylinder centred in frame: top ellipse cx=200 cy=100 rx=80 ry=25;
   bottom ellipse cx=200 cy=220 rx=80 ry=25. Two vertical lines:
   left edge x=120 y=100→220, right edge x=280 y=100→220.
   All fills white, stroke #1f2937 stroke-width 2.
   Dashed radius line from (200,100) to (280,100): stroke #4f46e5 dasharray 6 3.
   Label 'r = 4 cm' at (285,96) fill #4f46e5 font-size 13.
   Vertical arrow (295,100)→(295,220) with arrowhead, stroke #1f2937.
   Label 'h = 14 cm' at (305,165) font-size 13 fill #1f2937.
   Title 'Cylinder' at (200,278) text-anchor middle fill #6b7280 font-size 13.
   Generate SVG code."

GOOD EXAMPLE — refraction (ray diagram):
  "SVG code brief: viewBox 0 0 400 300. White background.
   Horizontal boundary line from (50,160) to (350,160): stroke #1f2937 w2.
   Label 'Air' at (30,140) and 'Glass' at (25,185), font-size 13 fill #6b7280.
   Dashed normal line from (200,60) to (200,240): stroke #6b7280 dasharray 6 3.
   Incident ray from (80,60) to (200,160): stroke #1f2937 w2, arrowhead at end.
   Refracted ray from (200,160) to (300,240): stroke #4f46e5 w2, arrowhead.
   Arc for incidence angle near (200,160) radius 35: stroke #6b7280.
   Label '30°' at (175,135) font-size 13. Label '19°' at (215,180) fill #4f46e5 font-size 13.
   Labels 'Incident ray' and 'Refracted ray' near each arrow, font-size 13.
   Generate SVG code."

GOOD EXAMPLE — demand/supply (Economics):
  "SVG code brief: viewBox 0 0 400 300. White background.
   X-axis from (50,250) to (370,250): stroke #1f2937 w2. Label 'Quantity' at (370,265) font-size 13.
   Y-axis from (50,250) to (50,30): stroke #1f2937 w2. Label 'Price' at (30,30) font-size 13.
   Demand curve: line from (80,60) to (340,240): stroke #4f46e5 w2. Label 'D' at (348,240) fill #4f46e5 font-size 13.
   Supply curve: line from (80,240) to (340,60): stroke #10b981 w2. Label 'S' at (348,60) fill #10b981 font-size 13.
   Equilibrium point at (210,150): filled circle r=5 fill #1f2937.
   Dashed lines from (210,150) to (210,250) and (50,150) to (210,150): stroke #6b7280 dasharray 6 3.
   Label 'P*' at (35,150) font-size 13. Label 'Q*' at (210,265) font-size 13.
   Generate SVG code."

BAD EXAMPLE (never write like this — too vague, no coordinates, no sizes):
  "Draw a diagram of the cylinder from the question."
  "Illustrate the forces acting on the object."
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
      "illustration_prompt": "",
      "hint": "one sentence nudging toward solution without revealing the answer",
      "study_tip": "",
      "wrong_options": {
        "B": "one sentence: specific misconception behind option B",
        "C": "one sentence: specific misconception behind option C",
        "D": "one sentence: specific misconception behind option D"
      }
    },
    "illustration_prompt": "",
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

ANGLES — CRITICAL (most common AI mistake):
  ✓  Since $64^{\\circ} < 180^{\\circ}$, we add $180^{\\circ} - 64^{\\circ} = 116^{\\circ}$
  ✗  \\text{Since } 064∘ < 180^{\\circ}\\text{, we add }  ← NEVER wrap prose in \\text{}
  RULE: Write prose as normal text. Only numbers/symbols go inside $...$.

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
// ── SdashAPI Enrichment Prompt ────────────────────────────────────────────────
// buildSdashEnrichPrompt — v3 (subject-module architecture)
//
// The prompt is now assembled from a focused subject module + a shared core.
// Each module (subjectModules.js) contains ONLY what is relevant to that subject:
//   - Steps guide (maths, physics, chemistry, biology, economics, humanities)
//   - Illustration rules (what to diagram, what to skip, examples)
//   - Hint examples (subject-specific nudges)
//   - Extra rules (e.g. instruction_text for language subjects)
//
// The core carries everything that applies to every subject:
//   - Ordering / critical rules, explanation fields, KaTeX formatting
//   - Tone & language, topic tagging, output JSON schema
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

  // ── Get the subject-specific module ─────────────────────────────────────────
  const mod = getSubjectModule(subjectName)

  // ── Format questions inline ──────────────────────────────────────────────────
  const questionLines = rawQuestions.map((q, i) => {
    const opts = Object.entries(q.option ?? {})
      .map(([k, v]) => `   ${k.toUpperCase()}. ${v}`)
      .join('\n')
    const answer = (q.answer ?? '').toUpperCase()
    const hint   = q.solution ? `\n   Solution hint: ${q.solution.trim().slice(0, 200)}` : ''
    return `Q${i + 1}. ${(q.question ?? '').trim()}\n${opts}\n   ✓ Answer: ${answer}${hint}`
  }).join('\n\n')

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

⚠️ STEPS DECISION — make this call for EVERY question before writing:

  Ask yourself: "Does this question require me to compute a number?"
    YES (calculation) → use steps array with {title, lines} objects. Use formula_box.
    NO  (recall/definition/identification) → "steps": [], "formula_box": "", "variables_key": []

  RECALL signals (steps: [] always):
    • "Which of the following is..."
    • "What is the term for..."
    • "What occurs during..."
    • "Which type of bond..."
    • "What is the primary..."
    • "In which state of matter..."
    • Any question answered by naming, identifying, or defining something

  CALCULATION signals (steps required):
    • Question contains numbers (masses, volumes, moles, pressures, speeds, concentrations)
    • Question asks you to "calculate", "determine", "find the value of"
    • Question requires applying a formula to reach a numerical answer

  DO NOT use steps for recall questions even if the subject module says isCalc: true.
  The module flag tells you steps are POSSIBLE for this subject — not that every question needs them.

═══════════════════════════════════════
QUESTIONS
═══════════════════════════════════════

${questionLines}

═══════════════════════════════════════
EXPLANATION STRUCTURE
═══════════════════════════════════════

Each explanation object has these fields:

"concept"       — One short phrase naming what is being tested.
                  e.g. "Curved surface area of a cylinder" / "Osmosis vs diffusion"

"intro"         — One sentence introducing the solution.
                  Calculation: "Let's work through this step by step."
                  Recall: brief context sentence.

"formula_box"   — The key named formula in $...$ KaTeX.
                  INCLUDE for: kinematics, electricity, mensuration, logarithms,
                  compound interest, quadratic formula, trig ratios, wave speed,
                  pressure, density, mole equations, elasticity formulas.
                  e.g. "$V = IR$" or "$A = P(1+r)^{n}$" or "$n = \\\\frac{m}{M}$"
                  EXCLUDE for: recall questions, English, humanities, no named formula.
                  Set "" when no formula applies.

"variables_key" — Array decoding each symbol in formula_box. Required when formula_box non-empty.
                  Each entry: "$symbol$ = what it means (unit)"
                  e.g. ["$V$ = voltage (volts)", "$I$ = current (amperes)", "$R$ = resistance (ohms, Ω)"]
                  Set [] when formula_box is empty.

"steps"         — ${mod.stepsGuide}

"answer_note"   — MUST start: "The correct answer is [LETTER] — [option text]."
                  LETTER must match ✓ Answer above. Then 1–2 plain-English sentences.
                  No LaTeX. No bold. Warm and clear.

"hint"          — One sentence, max 20 words. Nudges without revealing the answer.
                  NEVER say "the answer is" or give the option letter.
${mod.hintGuide}

"study_tip"     — One short exam technique tip. Otherwise "".

"illustration_prompt" —
${mod.illustration}

"wrong_options" — For EACH wrong option (B, C, D): specific misconception.
                  Include ALL wrong options.
                  Each: (1) what the student probably thought, (2) why wrong, (3) correct principle.
                  BAD: "This option is incorrect."
                  GOOD: "A student choosing B confused osmotic pressure with turgor pressure —
                         osmosis depends on water potential difference, not pressure alone."

"correct"       — Repeat answer_note here exactly (legacy field).
${mod.extraRules ? `\n═══════════════════════════════════════\nSUBJECT-SPECIFIC RULES\n═══════════════════════════════════════\n${mod.extraRules}` : ''}
═══════════════════════════════════════
KaTeX FORMATTING${mod.isCalc ? ' (REQUIRED)' : ''}
═══════════════════════════════════════
${mod.isCalc ? `
Every equation line in "steps" MUST be wrapped in $...$. No exceptions.

FRACTIONS:      $\\\\frac{1}{2}$  not  1/2
POWERS:         $x^{2}$  $(1.03)^{3}$  — brace multi-char exponents
MULTIPLICATION: $3000 \\\\times 1.09$  not  3000 × 1.09
SQUARE ROOTS:   $\\\\sqrt{100}$  not  √100
ANGLES:         $64^{\\\\circ}$  inside $...$ always
CURRENCY:       ₦500 directly — NEVER \\\\text{N} or \\\\500

ONE OPERATION PER LINE. Every algebraic move on its own line.
NEVER use \\\\text{} to wrap prose. Write prose outside $...$ normally.` : 'steps: [] — no calculation steps for this subject.'}

═══════════════════════════════════════
TONE & LANGUAGE
═══════════════════════════════════════

- Warm older sibling, not a textbook. Plain English. 15-year-old must follow it.
- Never "hence", "thus", "it can be deduced". Say "so", "this means", "that gives us".
- answer_note and hint: prose only. No $ delimiters, no LaTeX.
- No filler. Every sentence must help the student.

TOPIC TAGGING — pick the single closest name from this list:
${topicList}

═══════════════════════════════════════
OUTPUT — JSON ARRAY ONLY
═══════════════════════════════════════

Return ONLY a valid JSON array. No markdown fences, no text before or after.
One object per question, SAME ORDER as above. EXACTLY ${rawQuestions.length} objects.

USE THE CORRECT SHAPE FOR EACH QUESTION:

── SHAPE A: RECALL question (identification / definition / naming — no arithmetic) ──
{
  "index": 1,
  "question_snippet": "COPY the first 8 words of Q1 here",
  "topic_title": "exact topic name from the list",
  "subtopic_title": "specific subtopic or empty string",
  "explanation": {
    "concept": "Metallic bonding — sea of electrons model",
    "formula_box": "",
    "variables_key": [],
    "intro": "The sea of electrons model describes a specific type of bonding — let's match it correctly.",
    "steps": [],
    "answer_note": "The correct answer is D — metallic bonds. In metallic bonding, metal cations sit in a shared sea of delocalized electrons that holds the structure together.",
    "hint": "Which type of bonding involves a lattice of positive ions surrounded by freely moving electrons?",
    "study_tip": "The sea of electrons explains three key metal properties: electrical conductivity, thermal conductivity, and malleability.",
    "illustration_title": "",
    "illustration_prompt": "",
    "wrong_options": {
      "A": "A student choosing A picked covalent bonds — covalent bonding involves shared pairs between specific atoms, not a delocalized sea.",
      "B": "A student choosing B picked ionic bonds — ionic bonding has discrete positive and negative ions with no sea of electrons.",
      "C": "A student choosing C picked dative bonds — a dative bond is a type of covalent bond between specific atoms, not a collective electron sea."
    },
    "correct": "The correct answer is D — metallic bonds. Metal cations sit in a sea of delocalized electrons."
  }
}

── SHAPE B: CALCULATION question (has numbers; requires formula and arithmetic) ──
{
  "index": 2,
  "question_snippet": "COPY the first 8 words of Q2 here",
  "topic_title": "exact topic name from the list",
  "subtopic_title": "specific subtopic or empty string",
  "explanation": {
    "concept": "Curved surface area of a cylinder",
    "formula_box": "$CSA = 2 \\\\times \\\\pi \\\\times r \\\\times h$",
    "variables_key": [
      "$CSA$ = curved surface area (cm²)",
      "$r$ = radius (cm)",
      "$h$ = height (cm)",
      "$\\\\pi \\\\approx \\\\frac{22}{7}$"
    ],
    "intro": "Let's work through this step by step.",
    "steps": [
      { "title": "Write down the formula",  "lines": ["$CSA = 2 \\\\times \\\\pi \\\\times r \\\\times h$"] },
      { "title": "Find the radius",          "lines": ["$r = 8 \\\\div 2 = 4$ cm"] },
      { "title": "Substitute the values",   "lines": ["$CSA = 2 \\\\times \\\\frac{22}{7} \\\\times 4 \\\\times 14$"] },
      { "title": "Simplify",                "lines": ["$CSA = 2 \\\\times 176$", "$CSA = 352$ cm²"] }
    ],
    "answer_note": "The correct answer is C — 352cm². Using CSA = 2πrh with r = 4cm and h = 14cm gives 352cm².",
    "hint": "Start by identifying the formula for curved surface area of a cylinder.",
    "study_tip": "Always find the radius (diameter ÷ 2) before substituting into the formula.",
    "illustration_title": "Cylinder — Radius 4 cm, Height 14 cm",
    "illustration_prompt": "SVG code brief: viewBox 0 0 400 300. White background rect. Cylinder centred: top ellipse cx=200 cy=95 rx=85 ry=26; bottom ellipse cx=200 cy=225 rx=85 ry=26. Vertical lines (115,95)→(115,225) and (285,95)→(285,225) stroke #1f2937 w2. Dashed radius (200,95)→(285,95) stroke #4f46e5 dasharray 6 3. Label 'r = 4 cm' at (290,90) fill #4f46e5 font-size 14. Arrow (300,95)→(300,225) stroke #1f2937. Label 'h = 14 cm' at (312,162) font-size 14. Title 'Cylinder' at (200,285) text-anchor middle fill #6b7280 font-size 13. Generate SVG code.",
    "wrong_options": {
      "B": "A student choosing B may have used total surface area instead of curved surface area — TSA includes the two circular ends.",
      "D": "A student choosing D likely forgot to halve the diameter to get the radius before substituting."
    },
    "correct": "The correct answer is C — 352cm². Using CSA = 2πrh with r = 4cm and h = 14cm gives 352cm²."
  }
}

FINAL CHECK before submitting:
  • index matches Q number
  • question_snippet matches the first 8 words of that question
  • answer_note starts with the correct answer letter from ✓ Answer
  • steps: [] for every recall/definition question — never put steps on a recall question
  • illustration_title and illustration_prompt are BOTH "" when no diagram is needed
  • illustration_title is ALWAYS filled when illustration_prompt is filled — never leave the title empty if there is a diagram`
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
            concept:              e.explanation.concept              ?? '',
            formula_box:          e.explanation.formula_box          ?? '',
            variables_key:        e.explanation.variables_key        ?? [],
            intro:                e.explanation.intro                ?? '',
            steps:                e.explanation.steps                ?? [],
            answer_note:          e.explanation.answer_note          ?? e.explanation.correct ?? '',
            hint:                 e.explanation.hint                 ?? '',
            study_tip:            e.explanation.study_tip            ?? '',
            wrong_option_note:    e.explanation.wrong_option_note    ?? '',
            illustration_title:   e.explanation.illustration_title   ?? '',
            illustration_prompt:  e.explanation.illustration_prompt  ?? '',
            // Legacy compat
            correct:          e.explanation.correct          ?? e.explanation.answer_note ?? '',
            workings:         e.explanation.workings         ?? [],
            wrong_options:    e.explanation.wrong_options    ?? {},
          }
        : {
            concept: '', formula_box: '', variables_key: [],
            intro: '', steps: [], answer_note: q.solution?.trim() ?? '',
            hint: '', study_tip: '', wrong_option_note: '',
            illustration_title: '',
            illustration_prompt: '',
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