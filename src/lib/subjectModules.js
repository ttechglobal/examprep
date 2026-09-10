// src/lib/subjectModules.js
// ─────────────────────────────────────────────────────────────────────────────
// Subject-specific prompt modules for buildSdashEnrichPrompt and buildQuestionPrompt.
// Each module returns ONLY what is unique to that subject group.
// The core prompt (ordering, KaTeX, tone, output schema) is assembled separately.
//
// Usage:
//   import { getSubjectModule } from '@/lib/subjectModules'
//   const module = getSubjectModule(subjectName)
//   // module.stepsGuide   — steps field instruction
//   // module.illustration — illustration_prompt field instruction
//   // module.hintGuide    — subject-specific hint examples
//   // module.extraRules   — any other subject-specific rules (e.g. instruction_text)
//   // module.isCalc       — boolean: does this subject use calculation steps
//   // module.id           — slug for the module ('maths'|'physics'|'chemistry'|'biology'|'economics'|'humanities')
// ─────────────────────────────────────────────────────────────────────────────

// ── Module definitions ────────────────────────────────────────────────────────

const MODULES = {

  // ── MATHEMATICS ─────────────────────────────────────────────────────────────
  maths: {
    id: 'maths',
    isCalc: true,

    stepsGuide: `
STEPS — MATHEMATICS
Required for ALL calculation questions. Set [] only for pure definitions.

Minimum steps by type:
  Algebra (solve for x):           4–5 steps — write / expand / collect / solve / check
  Mensuration (area, volume, CSA): 4–5 steps — formula / find unknowns / substitute / compute / state with units
  Coordinate geometry:             3–4 steps — formula / substitute / simplify
  Quadratic equations:             5–6 steps — standard form / identify a,b,c / apply formula / simplify / both roots
  Trigonometry:                    3–4 steps — identify sides / write ratio / substitute / evaluate
  Sets / Venn:                     3 steps — draw structure mentally / assign regions / count
  Word problems:                   5+ steps — define variable / set up equation / expand / solve / interpret
  Probability:                     3–4 steps — total outcomes / favourable outcomes / write as fraction / simplify
  Statistics (mean/median/mode):   3–4 steps — arrange data / apply formula / compute
  Matrices:                        3–4 steps — write matrix / apply operation / evaluate each cell

ONE OPERATION PER LINE. Every algebraic move on its own line.
Every equation line wrapped in $...$. No exceptions.`,

    illustration: `ILLUSTRATION — MATHEMATICS
Two fields: illustration_title (4–7 words) and illustration_prompt.
Set both "" when written steps fully explain the answer.

HOW TO WRITE THE ILLUSTRATION BRIEF
=====================================
Write the brief in this order. Content must come before any coordinates.

  AHA:         One sentence. "After seeing this, the student understands that ___."
               This determines the diagram type (mechanism vs parts map vs sequence).
  CONTAINMENT: What is nested inside what, and why are they separated?
               Name every region and the boundary between them.
  FLOW:        Direction of movement. State if something loops, branches, or feeds back.
               Never draw a cycle as a straight line.
  BOUNDARIES:  What enters each region (inputs) and what leaves (outputs / byproducts).
               Label every arrow crossing a boundary.
  QUANTITIES:  Numbers that appear on the exam. State them here so they appear in the diagram.
  STYLE:       viewBox "0 0 400 300". White background rect. Outlines #1f2937 w2.
               Key element / main direction: #4f46e5. Secondary: #6b7280.
               Minimum font-size 14px. Every arrow must have a visible arrowhead.
               End with: "Generate SVG code."

⚠️ ACCURACY GATE — ask before writing anything:
  Am I certain of every element I plan to draw — shape, position, label, scientific name?
  If ANY element is uncertain → set illustration_prompt to "" immediately. Do not guess.
  A wrong diagram actively misleads students. No diagram is better than a wrong one.

⚠️ LAYOUT RULE:
  Do NOT open the brief with pixel coordinates or hex colours.
  Open with AHA, CONTAINMENT, FLOW, BOUNDARIES, QUANTITIES.
  Coordinates may follow at the end, but content must come first.

WHEN TO GENERATE:
  ✓ Mensuration — shape with all calculated measurements labelled (cylinder r and h; cone r, h, slant; circle radius)
  ✓ Trigonometry — right-angled triangle: all three sides labelled, right-angle marker, angle arc
  ✓ Coordinate geometry — axes with plotted points, drawn line, intercepts and gradient
  ✓ Venn diagrams — overlapping circles with region element counts, universal set rectangle
  ✓ Bearing / angle problems — north arrow, labelled bearing, direction lines
  ✗ Algebra, logs, surds, sequences, matrices, fractions, percentages, ratios, statistics, probability

VALUES RULE: every measurement MUST come from your computed steps, not the raw question numbers.

── EXAMPLE 1 — Cylinder (r=4 cm, h=14 cm computed from steps) ──
illustration_title: "Cylinder — Radius 4 cm, Height 14 cm"
illustration_prompt:
"AHA: The student sees that the radius (half the diameter) and height are the two measurements needed for the formula.
CONTAINMENT: A 3D cylinder — flat circular top face, flat circular bottom face, curved lateral surface connecting them.
FLOW: None — static shape.
BOUNDARIES: r = 4 cm measured horizontally across the top face. h = 14 cm measured vertically between top and bottom faces.
QUANTITIES: r = 4 cm (label in indigo bold), h = 14 cm (double-headed arrow outside the body).
STYLE: viewBox 0 0 400 300. White background. Cylinder centred with top ellipse, bottom ellipse, two vertical sides. Dashed indigo radius line on top face. External double-headed arrow for height. Font-size 14. Generate SVG code."

── EXAMPLE 2 — Right-Angled Triangle (sides 3, 4, hyp=5 from steps) ──
illustration_title: "Right-Angled Triangle — Sides 3, 4, 5"
illustration_prompt:
"AHA: The student can identify which side is the hypotenuse and where the angle θ is, so they can write sin/cos/tan correctly.
CONTAINMENT: A right-angled triangle. Right angle at bottom-left. Angle θ at bottom-right. Hypotenuse is the longest side, from bottom-right to top-left.
FLOW: None.
BOUNDARIES: Side lengths are fixed: vertical=3, base=4, hypotenuse=5.
QUANTITIES: 3 (vertical), 4 (horizontal base), 5 (hypotenuse in indigo bold — the key value). Right-angle square marker. Angle arc at θ.
STYLE: viewBox 0 0 400 300. White background. Triangle stroke #1f2937 w2. Hypotenuse label #4f46e5 bold. Right-angle square 14×14. θ arc radius 32. Generate SVG code."

── EXAMPLE 3 — Venn Diagram (A only=8, A∩B=7, B only=13, outside=8 from steps) ──
illustration_title: "Venn Diagram — Sets A and B"
illustration_prompt:
"AHA: The student sees how elements are split between the two sets and the universal set.
CONTAINMENT: A universal set rectangle contains two overlapping circles A (left) and B (right). The overlapping region is A∩B. Region outside both circles but inside the rectangle belongs to neither set.
FLOW: None — static set diagram.
BOUNDARIES: A only = 8. A∩B = 7. B only = 13. Outside both = 8.
QUANTITIES: All four counts in font-size 18 bold, centred in their region.
STYLE: viewBox 0 0 400 300. White background. Rectangle stroke #6b7280. Circle A fill #4f46e540 stroke #4f46e5. Circle B fill #10b98140 stroke #10b981. Circle labels A and B bold at top of each. Generate SVG code."

BAD — never open with coordinates. Never write "Circle A: cx=155 cy=155..." before stating the AHA.`,
    hintGuide: `
HINT EXAMPLES — MATHEMATICS
One sentence. Nudges the student toward the method without revealing the answer.

  Mensuration:       "Start by identifying the formula for [surface area / volume] of a [shape]."
  Kinematics:        "Which SUVAT equation connects the values you have been given?"
  Algebra:           "Try expanding the brackets on both sides before collecting like terms."
  Quadratic:         "Write the equation in the form ax² + bx + c = 0 first, then identify a, b and c."
  Logarithm:         "Think about which log law lets you separate or combine the terms."
  Trigonometry:      "Identify which sides of the triangle are given, then choose sin, cos or tan."
  Fractions:         "Find the lowest common denominator before adding the fractions."
  Compound growth:   "Identify P, r and n from the question, then apply the compound interest formula."
  Word problem:      "Define your variable first — what exactly is the unknown you are solving for?"
  Probability:       "Count the total number of outcomes first, then count only the favourable ones."
  Coordinate geom:   "Use the formula for [distance / midpoint / gradient] between two points."`,

    extraRules: '',
  },

  // ── PHYSICS ──────────────────────────────────────────────────────────────────
  physics: {
    id: 'physics',
    isCalc: true,

    stepsGuide: `
STEPS — PHYSICS
Required for ALL numerical questions. Set [] only for pure definitions (e.g. "What is inertia?").

Always:
  1. List EVERY given value with its symbol and unit: "$u = 0$ m/s", "$a = 10$ m/s²", "$t = 5$ s"
  2. Identify the correct equation
  3. Rearrange if needed (show the rearrangement as its own line)
  4. Substitute — one line per substitution
  5. Compute — one arithmetic step per line
  6. State the final answer with units

Minimum steps by type:
  Kinematics (SUVAT):     5–6 steps — list given / identify equation / rearrange / substitute / compute / state answer
  Electricity (V=IR, P=IV): 4–5 steps — list given / write equation / rearrange / substitute / state answer
  Wave speed (v=fλ):      4 steps — given / formula / substitute / answer
  Pressure, density:      4 steps — given / formula / substitute / answer
  Moments / torque:       4–5 steps — given / principle / set up equation / solve
  Heat / temperature:     4–5 steps — given / formula / substitute / answer
  Optics (lens/mirror):   4–5 steps — given / formula / substitute / answer
  Nuclear / radioactive:  3–4 steps — given / formula / compute half-lives / answer

⚠️ DECISION RULE — read this before every question:
  Does the question contain numbers to compute? → use steps
  Does the question ask you to DEFINE, IDENTIFY, or DESCRIBE (no numbers)? → steps: []

RECALL SHAPE (definitions, properties, descriptions):
  "formula_box": "",
  "variables_key": [],
  "intro": "One sentence introducing the concept — no 'step by step'.",
  "steps": []

CALCULATION SHAPE (any question with numbers):
  "formula_box": "$v = u + at$",
  "variables_key": ["$v$ = final velocity (m/s)", "$u$ = initial velocity (m/s)", "$a$ = acceleration (m/s²)", "$t$ = time (s)"],
  "intro": "Let's work through this step by step.",
  "steps": [
    { "title": "List given values", "lines": ["$u = 0$ m/s", "$a = 10$ m/s²", "$t = 5$ s"] },
    { "title": "Choose equation",   "lines": ["$v = u + at$"] },
    { "title": "Substitute",        "lines": ["$v = 0 + 10 \\times 5$"] },
    { "title": "State answer",      "lines": ["$v = 50$ m/s"] }
  ]`,

    illustration: `ILLUSTRATION — PHYSICS
Two fields: illustration_title (4–7 words) and illustration_prompt.
Generate when the PHYSICAL ARRANGEMENT — direction, boundary, or spatial setup — is the point.
Set "" when steps fully carry understanding.

HOW TO WRITE THE ILLUSTRATION BRIEF
=====================================
Write the brief in this order. Content must come before any coordinates.

  AHA:         One sentence. "After seeing this, the student understands that ___."
               This determines the diagram type (mechanism vs parts map vs sequence).
  CONTAINMENT: What is nested inside what, and why are they separated?
               Name every region and the boundary between them.
  FLOW:        Direction of movement. State if something loops, branches, or feeds back.
               Never draw a cycle as a straight line.
  BOUNDARIES:  What enters each region (inputs) and what leaves (outputs / byproducts).
               Label every arrow crossing a boundary.
  QUANTITIES:  Numbers that appear on the exam. State them here so they appear in the diagram.
  STYLE:       viewBox "0 0 400 300". White background rect. Outlines #1f2937 w2.
               Key element / main direction: #4f46e5. Secondary: #6b7280.
               Minimum font-size 14px. Every arrow must have a visible arrowhead.
               End with: "Generate SVG code."

⚠️ ACCURACY GATE — ask before writing anything:
  Am I certain of every element I plan to draw — shape, position, label, scientific name?
  If ANY element is uncertain → set illustration_prompt to "" immediately. Do not guess.
  A wrong diagram actively misleads students. No diagram is better than a wrong one.

⚠️ LAYOUT RULE:
  Do NOT open the brief with pixel coordinates or hex colours.
  Open with AHA, CONTAINMENT, FLOW, BOUNDARIES, QUANTITIES.
  Coordinates may follow at the end, but content must come first.

WHEN TO GENERATE:
  ✓ Refraction / reflection / lens — boundary, normal (dashed), incident ray, refracted ray, all angles from steps
  ✓ Circuits — rectangular loop, correctly placed components (cell, resistors, bulbs), series vs parallel clear
  ✓ Force / vector diagrams — arrows at correct angles, labelled magnitudes, resultant in indigo
  ✓ Velocity-time / distance-time graphs — plotted from step values, gradient labelled, axes named
  ✓ Waves — sinusoidal curve with λ, amplitude, crest and trough labelled from steps
  ✓ Lever / moments — horizontal beam on fulcrum, effort and load arrows with distances from steps
  ✗ Pure definitions, V=IR / P=IV calculations alone, nuclear equations

VALUES RULE: angles, distances, speeds, resistances — MUST match your steps.

── EXAMPLE 1 — Refraction (incident=30°, refracted=19°, air→glass from steps) ──
illustration_title: "Refraction of Light — Air to Glass (30° → 19°)"
illustration_prompt:
"AHA: The student understands that light bends toward the normal when entering a denser medium (glass), so the angle of refraction is smaller than the angle of incidence.
CONTAINMENT: The diagram is divided by a horizontal boundary line. Air is above; glass is below. A vertical dashed normal line crosses the boundary at the point of incidence.
FLOW: The incident ray travels from top-left down to the boundary point. The refracted ray continues from the boundary point into glass, bending toward the normal (steeper = closer to vertical). Both rays have arrowheads showing direction of light travel.
BOUNDARIES: The boundary line separates air (above) and glass (below). The normal is dashed and perpendicular to the boundary.
QUANTITIES: Angle of incidence = 30° (between incident ray and normal, in air). Angle of refraction = 19° (between refracted ray and normal, in glass, in indigo bold — smaller than 30°, showing the bending).
STYLE: viewBox 0 0 400 300. White background. Boundary stroke #1f2937 w2. Dashed normal stroke #6b7280. Incident ray stroke #1f2937 w2.5 with arrowhead. Refracted ray stroke #4f46e5 w2.5 with arrowhead. Angle arcs with labels. 'Air' and 'Glass' labels in their regions. Generate SVG code."

── EXAMPLE 2 — Series Circuit (V=12V, R₁=3Ω, R₂=5Ω from steps) ──
illustration_title: "Series Circuit — 12 V, R₁=3 Ω, R₂=5 Ω"
illustration_prompt:
"AHA: The student sees that in a series circuit, the same current flows through every component and the resistors are in a single unbroken loop.
CONTAINMENT: A single rectangular loop of wire. The cell (battery) is on one side. Two resistors are on the top wire, one after the other. There are no branches — it is a single path.
FLOW: Current flows in one direction around the loop (from + terminal, through resistors, back to − terminal). One current arrow on the bottom wire labelled 'I'.
BOUNDARIES: Cell provides 12 V. R₁ = 3 Ω drops some voltage. R₂ = 5 Ω drops the remaining voltage.
QUANTITIES: 12 V (at the cell, indigo bold). R₁ = 3 Ω and R₂ = 5 Ω (labelled above their respective zigzag symbols on the top wire).
STYLE: viewBox 0 0 400 300. White background. Wire as a rectangle stroke #1f2937 w2. Cell symbol (long+short line pair) on left side labelled + and −. Resistors as zigzag lines on top. Current arrow with direction. Generate SVG code."

── EXAMPLE 3 — Velocity-Time Graph (u=0, a=4 m/s², t=5 s, v=20 m/s from steps) ──
illustration_title: "Velocity-Time Graph — Uniform Acceleration"
illustration_prompt:
"AHA: The student sees that a straight diagonal line on a v-t graph means constant acceleration, and the gradient equals the acceleration value.
CONTAINMENT: Standard x-y graph. X-axis is time (0 to 5 s). Y-axis is velocity (0 to 20 m/s). The plotted line is a straight diagonal from origin.
FLOW: Time increases left to right. Velocity increases proportionally (straight line, not curved — constant acceleration).
BOUNDARIES: Start point: t=0 s, v=0 m/s. End point: t=5 s, v=20 m/s. Dashed drop lines from the end point to both axes.
QUANTITIES: t=5 s (x-axis drop), v=20 m/s (y-axis drop). Gradient label on the line: 'gradient = a = 4 m/s²' in indigo.
STYLE: viewBox 0 0 400 300. White background. Axes with arrowheads and labels. Axis tick marks and numeric labels. Plotted line in #4f46e5 w2.5. Filled circles at start and end. Dashed drop lines #6b7280. Gradient label on the line in #4f46e5. Generate SVG code."

BAD — never open with "X-axis (50,250)→(370,250)..." before stating the AHA and what the graph shows.`,

    hintGuide: `
HINT EXAMPLES — PHYSICS
  Kinematics:     "Which SUVAT equation connects the values you have — list u, v, a, s, t."
  Electricity:    "Write down V, I and R from the question, then choose the correct form of Ohm's law."
  Wave speed:     "The wave speed equation connects frequency and wavelength — which value are you finding?"
  Pressure:       "Pressure equals force divided by area — check that your area is in the right units."
  Moments:        "Clockwise moments equal anticlockwise moments at the point of balance."
  Optics:         "Use the thin lens formula and check whether your image is real or virtual."
  Heat:           "The heat equation Q = mcΔT needs mass in kg and temperature change in °C or K."`,

    extraRules: '',
  },

  // ── CHEMISTRY ────────────────────────────────────────────────────────────────
  chemistry: {
    id: 'chemistry',
    isCalc: true,

    stepsGuide: `
STEPS — CHEMISTRY
Required for numerical / mole calculation questions. Set [] for naming, recall, and bonding definitions.

Calculation types that need steps:
  Mole calculations (n=m/M):        4–5 steps — given / formula / substitute / answer with units
  Concentration (C=n/V):            4–5 steps — given / formula / substitute / answer
  Titration calculations:           5–6 steps — write balanced equation / mole ratio / given / calculate moles / find unknown
  Gas laws (PV=nRT, Boyle's, etc.): 4–5 steps — list given / formula / rearrange / substitute / answer
  Electrochemistry (Faraday):       5–6 steps — given / formula / mole of electrons / mole of element / mass
  pH calculations:                  4 steps — given / formula / substitute / answer
  Empirical formula:                5 steps — mass given / divide by Mr / smallest ratio / whole numbers / formula

Recall questions (no steps needed — set [] and explain in "correct"):
  Naming compounds, bonding types, periodic trends, reactivity series,
  functional groups, indicators, oxidation states (non-numerical)

⚠️ DECISION RULE — read this before every question:
  Does the question ask you to CALCULATE a number? → use steps
  Does the question ask you to IDENTIFY, NAME, DEFINE, or EXPLAIN? → steps: []

RECALL SHAPE (bonding, naming, trends, definitions, indicators):
  "formula_box": "",
  "variables_key": [],
  "intro": "One sentence introducing the concept — no 'step by step'.",
  "steps": []

CALCULATION SHAPE (moles, gas laws, concentrations, empirical formula):
  "formula_box": "$n = \\frac{m}{M}$",
  "variables_key": ["$n$ = moles (mol)", "$m$ = mass (g)", "$M$ = molar mass (g/mol)"],
  "intro": "Let's work through this step by step.",
  "steps": [
    { "title": "List given values", "lines": ["$m = 4$ g", "$M = 40$ g/mol"] },
    { "title": "Apply formula",     "lines": ["$n = \\frac{4}{40}$"] },
    { "title": "State answer",      "lines": ["$n = 0.1$ mol"] }
  ]`,

    illustration: `ILLUSTRATION — CHEMISTRY
Two fields: illustration_title (4–7 words) and illustration_prompt.
Generate ONLY when a student cannot visualise the structure or apparatus from text alone.
Set "" for naming, balancing equations, definitions, and most calculations.

HOW TO WRITE THE ILLUSTRATION BRIEF
=====================================
Write the brief in this order. Content must come before any coordinates.

  AHA:         One sentence. "After seeing this, the student understands that ___."
               This determines the diagram type (mechanism vs parts map vs sequence).
  CONTAINMENT: What is nested inside what, and why are they separated?
               Name every region and the boundary between them.
  FLOW:        Direction of movement. State if something loops, branches, or feeds back.
               Never draw a cycle as a straight line.
  BOUNDARIES:  What enters each region (inputs) and what leaves (outputs / byproducts).
               Label every arrow crossing a boundary.
  QUANTITIES:  Numbers that appear on the exam. State them here so they appear in the diagram.
  STYLE:       viewBox "0 0 400 300". White background rect. Outlines #1f2937 w2.
               Key element / main direction: #4f46e5. Secondary: #6b7280.
               Minimum font-size 14px. Every arrow must have a visible arrowhead.
               End with: "Generate SVG code."

⚠️ ACCURACY GATE — ask before writing anything:
  Am I certain of every element I plan to draw — shape, position, label, scientific name?
  If ANY element is uncertain → set illustration_prompt to "" immediately. Do not guess.
  A wrong diagram actively misleads students. No diagram is better than a wrong one.

⚠️ LAYOUT RULE:
  Do NOT open the brief with pixel coordinates or hex colours.
  Open with AHA, CONTAINMENT, FLOW, BOUNDARIES, QUANTITIES.
  Coordinates may follow at the end, but content must come first.

WHEN TO GENERATE:
  ✓ Electron shell diagrams — nucleus with proton count, shells with correct electron counts (verify from atomic number first)
  ✓ Electrolysis / titration / distillation apparatus — each component named and in correct position
  ✓ Reaction energy profiles — reactants level, activation energy peak, products level; ΔH arrow; catalyst lower peak
  ✓ Organic structural formulae — where the bond arrangement IS the concept (ethanol C-O-H linkage, ester -COO-)
  ✗ Naming compounds, balancing equations, mole calculations, gas law calculations, bonding recall

ACCURACY REQUIREMENT FOR ELECTRON SHELLS: confirm the exact electron configuration from the atomic number
before writing a single shell. E.g. Na (Z=11): configuration is 2,8,1 — confirm this before drawing.
If uncertain → illustration_prompt: "" immediately.

── EXAMPLE 1 — Electron Shell Diagram (Sodium, Z=11, configuration 2,8,1 from verification) ──
illustration_title: "Electron Shell Diagram — Sodium (Na, Z=11)"
illustration_prompt:
"AHA: The student sees that sodium has one electron in its outer shell, which is why it readily loses that electron and forms Na⁺.
CONTAINMENT: Three concentric circles (shells) centred on the nucleus. Shell 1 is innermost (smallest), shell 2 is middle, shell 3 is outermost. The nucleus is a filled circle at the centre labelled with proton count (11p) and neutron count (12n).
FLOW: No flow — static atomic structure.
BOUNDARIES: Shell 1 holds exactly 2 electrons. Shell 2 holds exactly 8 electrons. Shell 3 holds exactly 1 electron. These numbers are from the verified configuration 2,8,1 for Z=11.
QUANTITIES: 2 electrons on shell 1 (evenly spaced). 8 electrons on shell 2 (evenly spaced at 45° intervals). 1 electron on shell 3. Shell count labels (2, 8, 1) outside each shell. The lone outer electron highlighted in indigo to show reactivity.
STYLE: viewBox 0 0 400 300. White background. Nucleus: filled circle fill #4f46e5 with white labels. Shells: circles stroke #1f2937 w1.5 fill none. Electrons: small filled circles r=5 fill #ef4444, except the lone valence electron fill #4f46e5. Shell count labels outside each shell in #6b7280. Title 'Sodium (Na) — Configuration 2, 8, 1'. Generate SVG code."

── EXAMPLE 2 — Reaction Energy Profile (exothermic, with and without catalyst) ──
illustration_title: "Energy Profile — Exothermic Reaction, Effect of Catalyst"
illustration_prompt:
"AHA: The student understands that a catalyst lowers the activation energy but does NOT change the reactants, products, or the overall energy change (ΔH).
CONTAINMENT: A progress-of-reaction graph. X-axis = progress of reaction. Y-axis = energy. Reactants start at a higher energy level than products (exothermic: products lower). The curve rises to a peak (activation energy) then falls to the products level.
FLOW: Reaction progresses left to right along the x-axis. Energy rises from reactants to the transition state (peak), then falls to products. This is a single-pass pathway, not a cycle.
BOUNDARIES: Reactants level (left, higher). Activation energy peak (highest point). Products level (right, lower). ΔH = difference between reactants and products (negative for exothermic). With catalyst: a second dashed curve with a LOWER peak — same reactants and products levels, lower activation energy.
QUANTITIES: Two peaks — uncatalysed (higher) and catalysed (lower, in indigo dashed). Vertical arrows labelling 'Ea (no catalyst)' and 'Ea (catalyst)'. Vertical arrow labelling 'ΔH (−ve)' between reactants and products levels.
STYLE: viewBox 0 0 400 300. White background. X and Y axes with labels. Reactants and products as horizontal dashed lines. Uncatalysed curve stroke #1f2937 w2.5. Catalysed curve stroke #4f46e5 w2 stroke-dasharray 8 4. Labelled arrows for Ea and ΔH. Generate SVG code."

BAD — never draw electron shells without first confirming the exact electron configuration. Never start with coordinates before stating the AHA.`,

    hintGuide: `
  Mole calc:        "Start with n = m ÷ M — identify the molar mass from the periodic table first."
  Titration:        "Write the balanced equation first to find the mole ratio between acid and base."
  Gas laws:         "Check which gas law applies — are P, V or T changing?"
  Electrochemistry: "Use the Faraday equation: moles of electrons = charge ÷ 96,500."
  Periodic trends:  "Think about how nuclear charge and shielding change across the period."
  Organic chem:     "Identify the functional group first — that tells you the reaction type."
  Atomic structure: "Count total electrons, then fill shell 1 (max 2), shell 2 (max 8), shell 3 (max 8)."`,

    extraRules: `
CHEMICAL FORMULAE & EQUATIONS — SUBSCRIPTS (CRITICAL)
Chemistry questions and explanations contain chemical formulae. Subscripts in formulae MUST be
rendered correctly using KaTeX so students read proper chemical notation.

RULE: Every chemical formula that appears in a step line, answer_note, or question_text MUST be
wrapped in $...$ and use _{} for subscripts and ^{} for superscripts.

SUBSCRIPT EXAMPLES (numbers after element symbols):
  ✓  $\\text{H}_2\\text{O}$           — water (subscript 2)
  ✓  $\\text{H}_2\\text{SO}_4$        — sulfuric acid
  ✓  $\\text{CO}_2$                   — carbon dioxide
  ✓  $\\text{NaOH}$                   — sodium hydroxide (no subscript needed)
  ✓  $\\text{Ca(OH)}_2$               — calcium hydroxide
  ✓  $\\text{NH}_3$                   — ammonia
  ✓  $\\text{CaCO}_3$                 — calcium carbonate
  ✓  $\\text{CH}_3\\text{COOH}$       — acetic acid
  ✓  $\\text{C}_6\\text{H}_{12}\\text{O}_6$  — glucose (subscript 12 needs braces)
  ✗  H2O  (never plain text — subscript won't show)
  ✗  H₂O  (Unicode subscript glyph — inconsistent rendering on all devices)

COEFFICIENTS (numbers before formulae in balanced equations):
  ✓  $2\\text{H}_2\\text{O}$          — 2 molecules of water (coefficient 2 in front)
  ✓  $2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}$
  ✗  2H2O  (plain text — never)
  ✗  2H₂O  (Unicode — never)

MULTI-SUBSCRIPT numbers (two or more digits): MUST use braces:
  ✓  $\\text{C}_6\\text{H}_{12}\\text{O}_6$   — brace 12 because it is two digits
  ✓  $\\text{Ca}_3(\\text{PO}_4)_2$           — brace both subscripts
  ✗  $\\text{C}_6\\text{H}_12\\text{O}_6$     — 12 without braces renders as "1" then plain "2"

IONIC CHARGES (superscripts):
  ✓  $\\text{Na}^+$,  $\\text{Mg}^{2+}$,  $\\text{Cl}^-$,  $\\text{SO}_4^{2-}$
  ✗  Na+  or  SO4 2-  (plain text)

BALANCED EQUATIONS IN STEP LINES:
  Each equation line is one step. Use \\rightarrow (→) for reaction arrow. Example:
  { "title": "Balanced equation", "lines": ["$2\\\\text{H}_2 + \\\\text{O}_2 \\\\rightarrow 2\\\\text{H}_2\\\\text{O}$"] }

STATE SYMBOLS (if needed):
  ✓  $\\text{NaCl}_{(aq)}$,  $\\text{CO}_{2(g)}$,  $\\text{H}_2\\text{O}_{(l)}$

SHORT RULE TO REMEMBER:
  • Any number that is part of a chemical formula → subscript with _{}
  • Any charge → superscript with ^{}
  • Any coefficient before a formula → plain number before the $ block, OR inside the $ block: $2\\\\text{H}_2\\\\text{O}$
  • Always wrap the whole formula in $...$
`,
  },

  // ── BIOLOGY ──────────────────────────────────────────────────────────────────
  biology: {
    id: 'biology',
    isCalc: true,

    stepsGuide: `
STEPS — BIOLOGY
Required for numerical questions only. Set [] for recall, definitions, and processes.

Numerical biology questions that need steps:
  Magnification (M = I/A):       3–4 steps — formula / substitute / compute / state
  Genetics / probability:        3–5 steps — write parental genotypes / gametes / Punnett square results / ratio
  Photosynthesis rate calc:      3–4 steps — given / formula / substitute / answer
  Population / ecology stats:    3–4 steps — given / formula / compute

Recall and process questions (set [] — explain in "correct" + "answer_note"):
  Cell structure, organelles, osmosis, diffusion, respiration, photosynthesis process,
  classification, ecological relationships, menstrual cycle, blood groups

⚠️ DECISION RULE — read this before every question:
  Does the question give numbers to compute (size, ratio, rate)? → use steps
  Does the question ask you to NAME, DESCRIBE, EXPLAIN, or IDENTIFY? → steps: []

RECALL SHAPE (processes, structures, definitions):
  "formula_box": "",
  "variables_key": [],
  "intro": "One sentence introducing the concept — no 'step by step'.",
  "steps": []

CALCULATION SHAPE (magnification, genetics ratios):
  "formula_box": "$M = \\frac{I}{A}$",
  "variables_key": ["$M$ = magnification", "$I$ = image size (mm)", "$A$ = actual size (mm)"],
  "intro": "Let's work through this step by step.",
  "steps": [
    { "title": "Write formula",  "lines": ["$M = \\frac{I}{A}$"] },
    { "title": "Substitute",     "lines": ["$M = \\frac{40}{0.2}$"] },
    { "title": "State answer",   "lines": ["$M = 200\\times$"] }
  ]

═══════════════════════════
BIOLOGY EXPLANATION QUALITY
═══════════════════════════

Keep explanations SHORT and DIRECT. The goal is the biological principle in the fewest clear words.
answer_note: 2 sentences maximum — name the answer and the mechanism. No padding.
intro: 1 sentence max. Never "Let's explore" or "Great question".

WHAT TO INCLUDE:
  • The correct biological term (bold it: **osmosis**, **mitochondria**)
  • The mechanism in plain English (why, not just what)
  • Nothing else — no history, no tangents, no restating the question

WRONG OPTIONS — BIOLOGY SPECIFIC:
  Identify the exact mix-up the student made. One sentence per option, directly stated:
  • Osmosis vs diffusion → state the membrane + water-only rule
  • Mitosis vs meiosis → state the cell count + chromosome outcome
  • Aerobic vs anaerobic products → name the correct products for each
  • Xylem vs phloem → xylem = water up, phloem = food both ways
  • Photosynthesis inputs/outputs → CO₂ + H₂O + light IN → glucose + O₂ OUT

LANGUAGE:
  Use real biological terms but explain them briefly. Write for a smart 15-year-old.`,

    illustration: `ILLUSTRATION — BIOLOGY
Biology is built on visual understanding. Diagrams are not optional extras.
Generate for ALL the types listed below. The default is: draw it.
Only set "" for pure one-sentence recall definitions where a diagram genuinely adds nothing.

Two fields: illustration_title (4–7 words) and illustration_prompt.

HOW TO WRITE THE ILLUSTRATION BRIEF
=====================================
Write the brief in this order. Content must come before any coordinates.

  AHA:         One sentence. "After seeing this, the student understands that ___."
               This determines the diagram type (mechanism vs parts map vs sequence).
  CONTAINMENT: What is nested inside what, and why are they separated?
               Name every region and the boundary between them.
  FLOW:        Direction of movement. State if something loops, branches, or feeds back.
               Never draw a cycle as a straight line.
  BOUNDARIES:  What enters each region (inputs) and what leaves (outputs / byproducts).
               Label every arrow crossing a boundary.
  QUANTITIES:  Numbers that appear on the exam. State them here so they appear in the diagram.
  STYLE:       viewBox "0 0 400 300". White background rect. Outlines #1f2937 w2.
               Key element / main direction: #4f46e5. Secondary: #6b7280.
               Minimum font-size 14px. Every arrow must have a visible arrowhead.
               End with: "Generate SVG code."

⚠️ ACCURACY GATE: Am I certain of every element I plan to draw — shape, label, scientific name?
  If ANY element is uncertain → set illustration_prompt to "" immediately. Do not guess.
  A wrong diagram actively misleads students. No diagram is better than a wrong one.

⚠️ LAYOUT RULE: Open with AHA, CONTAINMENT, FLOW, BOUNDARIES, QUANTITIES.
  Coordinates may follow, but content must come first.

WHEN TO GENERATE (biology — mandatory list):
  ✓ Osmosis / diffusion — two compartments, membrane, concentration labels, bold directional arrow
  ✓ Cell structure — every relevant organelle drawn, labelled, with leader lines
  ✓ Punnett squares — 2×2 grid, parent genotypes, four offspring cells, phenotype ratio below
  ✓ Photosynthesis — inputs (CO₂, H₂O, sunlight) and outputs (O₂, glucose) with arrows on a leaf
  ✓ Respiration — flow diagram: Glucose + O₂ → CO₂ + H₂O + ATP (aerobic), or anaerobic products
  ✓ Food chain / web — labelled boxes connected by 'eaten by' arrows, trophic levels named
  ✓ Reflex arc — five boxes: Receptor → Sensory Neuron → Relay Neuron → Motor Neuron → Effector
  ✓ Heart structure — 4 chambers labelled, oxygenated blood red, deoxygenated blue, flow arrows
  ✓ Leaf cross-section — layers: cuticle, epidermis, palisade, spongy mesophyll, stoma
  ✓ Kidney nephron — tubule stages with filtration / reabsorption arrows
  ✗ Pure recall definitions / classification lists where one sentence fully answers the question

⚠️ BIOLOGY RULE: if in doubt, draw it. Always err on the side of including the diagram.

── EXAMPLE 1 — Osmosis (5% left, 15% right, net water movement right from steps) ──
illustration_title: "Osmosis — Net Water Movement Across Membrane"
illustration_prompt:
"AHA: Water moves by osmosis from LOW solute concentration (HIGH water potential) to HIGH solute concentration (LOW water potential).
CONTAINMENT: Two compartments side by side, separated by a semipermeable membrane in the centre. Left = 5% sucrose (high water potential). Right = 15% sucrose (low water potential). The membrane allows water through but not sucrose.
FLOW: Net water movement is from LEFT to RIGHT. Show as a large bold arrow crossing the membrane, pointing right. Label it 'Net water movement (osmosis)'.
BOUNDARIES: Water (H₂O) crosses the membrane. Sucrose does not. Label membrane 'Semipermeable membrane' as a dashed vertical line.
QUANTITIES: Left = 5% sucrose (low solute, high ψ). Right = 15% sucrose (high solute, low ψ). Both visible.
STYLE: viewBox 0 0 400 300. White background. Left compartment fill #dbeafe. Right fill #bfdbfe. Dashed membrane centre. Bold arrow #4f46e5 w5 pointing right. Solute and water potential labels in both compartments. Generate SVG code."

── EXAMPLE 2 — Aerobic Respiration (mitochondrion, stages, ATP yield from steps) ──
illustration_title: "Aerobic Respiration — Stages and ATP Yield"
illustration_prompt:
"AHA: Aerobic respiration happens in two places — glycolysis in the cytoplasm and Krebs + ETC in the mitochondrion — producing approximately 38 ATP total.
CONTAINMENT: Three nested regions. (1) Cytoplasm (outer). (2) Mitochondrion (oval inside cytoplasm, with double membrane). Inside: (3a) Matrix (fluid interior where Krebs cycle happens) and (3b) Cristae (inner membrane folds where ETC happens).
FLOW: Glucose → Glycolysis in cytoplasm → Pyruvate enters mitochondrion → Krebs cycle in matrix (CIRCULAR arrow — it is a cycle, not a line) → ETC on cristae.
BOUNDARIES: O₂ enters the mitochondrion. CO₂ exits at Krebs. H₂O exits at ETC. ATP exits at each stage. Label every crossing arrow.
QUANTITIES: Glycolysis ≈ 2 ATP. Krebs ≈ 2 ATP. ETC ≈ 34 ATP. Total ≈ 38 ATP. Show at each stage.
STYLE: viewBox 0 0 400 300. White background. Mitochondrion as large oval with double-line boundary. Matrix fill #fef9c3 (light yellow). Cristae shown as wavy inner folds. Krebs shown with circular loop arrow inside matrix. All gas exchange arrows bold and labelled. ATP yield in #4f46e5 at each stage. Generate SVG code."

── EXAMPLE 3 — Punnett Square (Tt × Tt, T=tall dominant, t=dwarf recessive) ──
illustration_title: "Punnett Square — Tall Plant Cross (Tt × Tt)"
illustration_prompt:
"AHA: Crossing two heterozygous tall plants gives a 3:1 ratio of tall to dwarf offspring.
CONTAINMENT: A 2×2 grid. Parent 1 gametes (T, t) label the columns. Parent 2 gametes (T, t) label the rows. Four cells show offspring genotypes.
FLOW: Each cell = one column gamete + one row gamete. Read across columns and down rows.
BOUNDARIES: Four offspring: TT (top-left), Tt (top-right), tT (bottom-left), tt (bottom-right, the only dwarf).
QUANTITIES: Phenotype ratio below the grid: 3 Tall (T_) : 1 Dwarf (tt). Genotype labels font-size 18 bold.
STYLE: viewBox 0 0 400 300. White background. Grid stroke #1f2937 w2. Dominant genotype labels in #4f46e5. tt in #9ca3af (visually distinct). Phenotype ratio in a green box below the grid. Generate SVG code."

── EXAMPLE 4 — Reflex Arc ──
illustration_title: "Reflex Arc — Nerve Impulse Pathway"
illustration_prompt:
"AHA: A reflex bypasses the brain — the impulse goes from receptor through the spinal cord (relay neuron) to the effector without conscious thought.
CONTAINMENT: Five components in sequence. The relay neuron sits INSIDE an oval labelled 'Spinal cord'. The other four are outside this oval. This containment shows the bypass.
FLOW: Strictly left to right: Receptor → Sensory Neuron → Relay Neuron (inside spinal cord oval) → Motor Neuron → Effector. Label 'Nerve impulse →' above.
BOUNDARIES: Arrows enter the spinal cord oval (from sensory neuron) and exit (to motor neuron). This boundary represents the CNS.
QUANTITIES: None — qualitative diagram.
STYLE: viewBox 0 0 400 300. White background. Five labelled boxes. Spinal cord oval dashed outline #7c3aed. Arrows between components in #4f46e5. Sub-labels under each box. Direction label 'Nerve impulse →' above in #4f46e5. Generate SVG code."

BAD — never write "Cell outline: ellipse cx=200..." before stating the AHA and what is nested inside what.`,

    hintGuide: `
  Genetics:        "Write out the parental genotypes first, list the possible gametes, then fill in the Punnett square."
  Osmosis:         "Water always moves from a region of high water potential (low solute) to low water potential (high solute)."
  Diffusion:       "Think about the direction of the concentration gradient — particles always move from high to low."
  Aerobic resp:    "Aerobic respiration needs oxygen and produces CO₂, water, and a large amount of ATP."
  Anaerobic resp:  "Without oxygen, animals produce lactic acid; plants and yeast produce ethanol and CO₂."
  Photosynthesis:  "Think about what goes IN to the leaf (CO₂, H₂O, light) and what comes OUT (glucose, O₂)."
  Cell organelles: "Match the function to the organelle — energy production is mitochondria, protein synthesis is ribosomes."
  Ecology:         "Producers always start a food chain — they are the only organisms that make their own food from sunlight."
  Blood/transport: "Oxygenated blood travels away from the heart in arteries; deoxygenated blood returns via veins."`,

    extraRules: `
BIOLOGY EXPLANATION QUALITY RULE
Your explanation must teach the biological principle, not just confirm the answer.
Keep it SHORT — the explanation plus wrong options together should feel concise, not like an essay.

FORMATTING:
  Use **double asterisks** around key biological terms (**mitochondria**, **osmosis**, **ATP**).
  Use *single asterisks* for classifications (*aerobic*, *autotroph*).
  Separate 2 distinct ideas with \n if needed — never more than 2 newlines.

TARGET LENGTH:
  answer_note: 2 sentences — the correct answer + the mechanism. That is all.
  correct:     same as answer_note.

NEVER acceptable:
  ✗ "The correct answer is A. This is the definition of osmosis." ← no mechanism
  ✗ Long multi-paragraph walkthroughs for simple recall questions ← too long

ALWAYS required:
  ✓ Name the concept → one sentence on the mechanism. Done.
`,
  },

  // ── ECONOMICS ────────────────────────────────────────────────────────────────
  economics: {
    id: 'economics',
    isCalc: true,   // economics has calculation questions (elasticity, national income, etc.)

    stepsGuide: `
STEPS — ECONOMICS
Required for numerical questions. Set [] for definitions, concept explanations, and policy questions.

Numerical economics questions that need steps:
  Elasticity (PED, PES, YED, XED): 4 steps — formula / substitute values / compute / interpret sign
  National income (Y=C+I+G+X-M):  3–4 steps — identify components / substitute / compute
  Multiplier:                       3 steps — identify MPC or MPS / formula / compute
  Index numbers:                    3 steps — formula / substitute / compute
  Percentage change questions:      3 steps — (new−old)/old × 100 / substitute / answer

Recall / concept questions (set [] — explain in "correct"):
  Definitions of demand, supply, elasticity concepts, market structures,
  fiscal/monetary policy effects, trade theories, development indicators

⚠️ DECISION RULE — read this before every question:
  Does the question give numbers to compute (%, index, elasticity value)? → use steps
  Does the question ask you to DEFINE, EXPLAIN, or IDENTIFY a concept? → steps: []

RECALL SHAPE (definitions, policy, market structures):
  "formula_box": "",
  "variables_key": [],
  "intro": "One sentence introducing the concept — no 'step by step'.",
  "steps": []

CALCULATION SHAPE (elasticity, multiplier, national income):
  "formula_box": "$PED = \\frac{\\% \\Delta Q_d}{\\% \\Delta P}$",
  "variables_key": ["$PED$ = price elasticity of demand", "$\\% \\Delta Q_d$ = percentage change in quantity demanded", "$\\% \\Delta P$ = percentage change in price"],
  "intro": "Let's work through this step by step.",
  "steps": [
    { "title": "Write formula",    "lines": ["$PED = \\frac{\\% \\Delta Q_d}{\\% \\Delta P}$"] },
    { "title": "Substitute",       "lines": ["$PED = \\frac{-20}{10}$"] },
    { "title": "State answer",     "lines": ["$PED = -2$ (elastic demand)"] }
  ]`,

    illustration: `ILLUSTRATION — ECONOMICS
Two fields: illustration_title (4–7 words) and illustration_prompt.
Generate ONLY when the VISUAL RELATIONSHIP between curves or positions IS the answer.
Set "" for definitions, elasticity calculations, and prose policy explanations.

HOW TO WRITE THE ILLUSTRATION BRIEF
=====================================
  AHA:         One sentence. "After seeing this, the student understands that ___."
  CONTAINMENT: What is nested inside what, and why separated?
  FLOW:        Direction of movement. State if something shifts, loops, or feeds back.
  BOUNDARIES:  What enters / leaves / is unchanged.
  QUANTITIES:  Axis labels, equilibrium values, curve labels.
  STYLE:       viewBox "0 0 400 300". White background. Axes labelled 'Price (P)' and 'Quantity (Q)'.
               D curve #4f46e5. S curve #10b981. Equilibrium circle fill #1f2937. End with "Generate SVG code."

⚠️ ACCURACY GATE: Am I certain of every element? If not → set to "" immediately.

WHEN TO GENERATE:
  ✓ Demand and supply equilibrium — D curve, S curve, intersection, dashed drop lines to P* and Q*
  ✓ Demand or supply SHIFT — original + shifted curve, two equilibrium points, labels P₁Q₁ and P₂Q₂
  ✓ PPC — curved frontier, one inside point (inefficient), one outside (unattainable), one on curve (efficient)
  ✓ Business cycle — smooth wave with phases: Boom, Recession, Trough, Recovery
  ✗ Definitions, elasticity / multiplier calculations, prose policy explanations

── EXAMPLE 1 — Demand and Supply Equilibrium ──
illustration_title: "Demand and Supply — Market Equilibrium"
illustration_prompt:
"AHA: Equilibrium is the ONE price where quantity demanded equals quantity supplied — the D and S intersection.
CONTAINMENT: A standard market graph. X-axis = Quantity (Q). Y-axis = Price (P). D curve slopes downward. S curve slopes upward. They cross at one equilibrium point.
FLOW: D: higher price → less demanded. S: higher price → more supplied. Static — no loops.
BOUNDARIES: Equilibrium point where D meets S. Dashed lines from it to both axes marking P* and Q*.
QUANTITIES: P* (bold at y-axis), Q* (bold at x-axis).
STYLE: viewBox 0 0 400 300. White background. Axes with arrowheads. D curve #4f46e5 labelled 'D'. S curve #10b981 labelled 'S'. Equilibrium circle r=6 fill #1f2937. Dashed drop lines #6b7280. P* and Q* bold. Generate SVG code."

── EXAMPLE 2 — Demand Shift Right (income rises, normal good) ──
illustration_title: "Demand Shift Right — Rise in Consumer Income"
illustration_prompt:
"AHA: When income rises, demand for a normal good increases — D shifts right, raising both equilibrium price and quantity.
CONTAINMENT: Market graph with one S curve (unchanged) and two D curves: D₁ (original) and D₂ (shifted right).
FLOW: The shift is from D₁ rightward to D₂. Show a horizontal arrow between the two curves labelled 'Demand increases'. New equilibrium E₂ is to the right of and above E₁.
BOUNDARIES: At E₁: price=P₁, quantity=Q₁. At E₂: price=P₂ (higher), quantity=Q₂ (higher). Dashed drop lines from both equilibria to both axes.
QUANTITIES: P₁, Q₁ (lighter, at E₁). P₂, Q₂ (bold, at E₂ — the new values).
STYLE: viewBox 0 0 400 300. S curve #10b981. D₁ solid #4f46e5 w2. D₂ dashed #4f46e5 w2.5 (stroke-dasharray 8 4). Arrow showing shift. E₁ circle #6b7280 lighter. E₂ circle #1f2937 bold. Generate SVG code."

BAD — never draw supply and demand without stating the AHA and what each curve represents.`,

    hintGuide: `
  Demand shift:   "Think about what causes demand to change — income, price of substitutes, tastes."
  Multiplier:     "The multiplier equals 1 ÷ MPS, or 1 ÷ (1 − MPC)."
  National income:"Use Y = C + I + G + (X − M) and substitute the values given."
  Market struct:  "Think about how many firms are in this market and whether the product is identical."`,

    extraRules: '',
  },

  // ── HUMANITIES & LANGUAGE ────────────────────────────────────────────────────
  humanities: {
    id: 'humanities',
    isCalc: false,

    stepsGuide: `
STEPS — HUMANITIES & LANGUAGE
"steps": [] always. No calculation steps for these subjects.
Explain everything in the "correct" field using plain English.

FORMATTING — HUMANITIES & LANGUAGE EXPLANATIONS:
  Use **double asterisks** around key terms, rule names, and the correct concept (renders as bold).
  Use *single asterisks* around secondary terms or classifications (renders as italic).
  Use \n (newline) between distinct ideas — do not write a single wall of text.
  Example (English): "**Garrulous** means excessively talkative\n*Loquacious* is a close synonym, but garrulous specifically implies an annoying quality\nThe key distinction is the negative connotation — 'talkative' is neutral."
  Example (Government): "The **Executive arm** of government implements laws\nIn Nigeria, this is headed by the President at the federal level\nIt is distinct from the *Legislature* (makes laws) and *Judiciary* (interprets laws)."

Subjects in this group: English Language, Use of English, Literature in English,
Government, History, CRK, IRK, Yoruba, Igbo, Hausa, French, Commerce (non-numerical),
Geography (non-numerical questions).`,

    illustration: `ILLUSTRATION — HUMANITIES & LANGUAGE
illustration_prompt: "" always. No SVG diagrams for these subjects.
These subjects are fully explained through text. Set illustration_prompt to "" for every question.
`,

    hintGuide: `
  Government:        "Think about which arm of government (executive, legislative, judicial) handles this."
  History:           "Think about the TIME PERIOD — which event or leader is associated with that era?"
  Literature:        "Think about the CHARACTER'S motivation — why would they say or do that at this point?"`,

    extraRules: `
INSTRUCTION TEXT — ENGLISH & LANGUAGE QUESTIONS (MANDATORY)
Many exam questions depend on a section instruction printed once for a group of questions.
Students see questions in random CBT order — each question MUST be self-contained.
A student who sees only the question_text must know exactly what they are being asked to do.

⚠️ THIS IS NOT OPTIONAL. Every English/language question must have instruction_text unless
the question is 100% self-contained (e.g. a direct grammar question with a full sentence).

MANDATORY — set instruction_text for ALL of these question types:
  Fill-the-blank / cloze:      "Choose the option that best fills the gap."
  Synonym / nearest meaning:   "Choose the option nearest in meaning to the underlined word."
  Antonym / opposite meaning:  "Choose the option most nearly opposite in meaning to the underlined word."
  Sentence completion:         "Choose the option that best completes the sentence."
  Word stress / phonetics:     "Identify the option that has the same stress pattern as the given word."
  Rhyme:                       "Choose the word that rhymes with the word given."
  Grammar / error correction:  "Choose the option that correctly completes the sentence."
  Comprehension:               "Read the passage carefully and answer the question that follows."
  Oral English (consonants):   "Identify the option in which the underlined letters have the same sound as in the given word."
  Register / register shift:   "Choose the option that best describes the register used in the passage."

If the instruction appears verbatim in the PDF → copy it exactly.
If the instruction is missing but the type is clear → write it using the standard phrasing above.
If the question is genuinely self-contained (a direct standalone grammar rule question) → instruction_text: null

UNDERLINED WORDS — CRITICAL RULE:
When the question asks about an "underlined word" or "the underlined letters", that word MUST
appear in question_text enclosed in **double asterisks** (markdown bold/underline marker).
NEVER leave "the underlined word" in question_text without including the actual word in **bold**.

  CORRECT: "In the following sentence, choose the word nearest in meaning to **garrulous**:
            The politician was **garrulous** during the debate."
  WRONG:   "Choose the word nearest in meaning to the underlined word in the sentence:
            The politician was garrulous during the debate."
            ← Student cannot tell which word is underlined without **markers**

  CORRECT: "Choose the option in which the underlined letters have the same sound as in '**ch**urch'."
  WRONG:   "Choose the option in which the underlined letters have the same sound." ← missing the word

ITALIC WORDS (words in italics in the original paper):
  Use *single asterisks* for words shown in italics in the original.
  e.g. "The word *ephemeral* is best replaced by which of the following?"

FILL-IN-THE-GAP:
  The blank/gap must be clearly shown as _____ (five underscores) or [...] in question_text.
  CORRECT: "The child ran _____ the road without looking."
  WRONG:   "The child ran the road without looking." ← gap is invisible

PASSAGE TEXT:
  When comprehension questions depend on a reading passage, copy the FULL passage into passage_text.
  Do NOT summarise or truncate. Students in CBT see the question alone — the passage must travel with it.
`,
  },
}

// ── Classifier ────────────────────────────────────────────────────────────────
/**
 * Returns the correct subject module for a given subject name.
 * Matching is case-insensitive and handles partial names.
 */
export function getSubjectModule(subjectName = '') {
  const s = subjectName.toLowerCase()

  if (/math|further math/.test(s))                         return MODULES.maths
  if (/physics/.test(s))                                   return MODULES.physics
  if (/chemistry/.test(s))                                 return MODULES.chemistry
  if (/biology/.test(s))                                   return MODULES.biology
  if (/economics/.test(s))                                 return MODULES.economics

  // Humanities & language — everything else
  // (English, Government, History, CRK, IRK, Yoruba, Igbo, Hausa,
  //  Literature, French, Commerce, Geography, Agric, Civic Ed, etc.)
  return MODULES.humanities
}

export default MODULES