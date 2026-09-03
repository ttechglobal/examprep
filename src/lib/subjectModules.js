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

    illustration: `
ILLUSTRATION — MATHEMATICS
Two fields to fill for every diagram: illustration_title and illustration_prompt.

illustration_title — short label shown above the diagram in the UI (4–7 words max).
  GOOD: "Cylinder with Radius and Height" / "Right-Angled Triangle (3-4-5)" / "Venn Diagram — Sets A and B"
  BAD: "Diagram" / "Illustration" / "See below"
  Set "" when illustration_prompt is "".

illustration_prompt — precise SVG code brief. Set "" for most questions (see EXCLUDE below).

⚠️ GENERATE ONLY when a student would still be confused about the SHAPE or SPATIAL RELATIONSHIP after reading the steps.

INCLUDE:
  • Mensuration: labelled shape with CALCULATED measurements from your steps
    (cylinder: r and h labelled; cone: r, h, slant; circle: radius and arc; sphere: radius)
  • Trigonometry: right-angled triangle with all three sides labelled from your steps, right-angle marker, angle arc
  • Coordinate geometry: x/y grid with plotted points, drawn line, labelled intercepts and gradient
  • Venn diagram: two labelled overlapping circles with region counts from your steps, universal set rectangle
  • Bearing / angle problems: north arrow, labelled bearing angle, direction lines

EXCLUDE — always "" for these (no exceptions):
  • Algebra, indices, surds, logs, sequences, series, matrices
  • Simultaneous equations, quadratic equations (no spatial idea)
  • Fractions, percentages, ratios, profit/loss, simple/compound interest
  • Statistics (mean, median, mode, frequency tables)
  • Probability (tree diagrams are prose — no SVG needed)
  • Any question where the written steps alone are completely clear

VALUES RULE: every measurement in illustration_prompt MUST match values from your steps, not the raw question.
  If your steps found r = 4 cm (from diameter ÷ 2), write r = 4 cm — never 8 cm.

SVG CONVENTIONS — apply to every brief:
  • viewBox "0 0 400 300", white background rect filling viewBox
  • Main outlines: stroke #1f2937, stroke-width 2
  • Key/answer element: stroke or fill #4f46e5 (indigo)
  • Dashed measurement lines: stroke-dasharray "6 3", stroke #6b7280
  • All labels: font-size 14px minimum, font-family "system-ui, sans-serif", fill #1f2937
  • End with: "Generate SVG code."

── EXAMPLE 1 — Cylinder (r=4 cm, h=14 cm from steps) ──
illustration_title: "Cylinder — Radius 4 cm, Height 14 cm"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 Cylinder body centred: top ellipse cx=200 cy=95 rx=85 ry=26; bottom ellipse cx=200 cy=225 rx=85 ry=26.
 Left vertical line (115,95)→(115,225): stroke #1f2937 w2. Right vertical line (285,95)→(285,225): stroke #1f2937 w2.
 Fill cylinder body white. All strokes #1f2937 w2.
 Dashed radius line (200,95)→(285,95): stroke #4f46e5 stroke-dasharray 6 3 w2.
 Label 'r = 4 cm' at (290,90) fill #4f46e5 font-size 14 font-weight bold.
 Vertical arrow with arrowheads at (300,95) and (300,225): stroke #1f2937 w1.5.
 Label 'h = 14 cm' at (312,162) fill #1f2937 font-size 14.
 Diagram title 'Cylinder' at (200,285) text-anchor middle fill #6b7280 font-size 13. Generate SVG code."

── EXAMPLE 2 — Right-Angled Triangle (sides 3, 4, hypotenuse 5 from steps) ──
illustration_title: "Right-Angled Triangle — Sides 3, 4, 5"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 Right-angled triangle: vertices at A=(70,240), B=(290,240), C=(70,70). Stroke #1f2937 w2, fill none.
 Right-angle square marker at A=(70,240): small square 14×14 from (70,226) stroke #1f2937 w1.5.
 Label '3' (vertical side AC) at (45,158) font-size 15 fill #1f2937.
 Label '4' (horizontal base AB) at (178,265) font-size 15 fill #1f2937.
 Label '5' (hypotenuse BC) at (198,148) font-size 15 fill #4f46e5 font-weight bold.
 Angle arc at B=(290,240) radius 32: stroke #6b7280 w1.5.
 Label 'θ' at (255,225) font-size 15 fill #6b7280.
 Diagram title 'Right-Angled Triangle' at (200,285) text-anchor middle fill #6b7280 font-size 13. Generate SVG code."

── EXAMPLE 3 — Coordinate Geometry (line through (1,2) and (3,6), y-intercept 0 from steps) ──
illustration_title: "Straight Line — Gradient 2, y-intercept 0"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 X-axis (40,240)→(380,240): stroke #1f2937 w2. Arrowhead at right end. Label 'x' at (385,240) font-size 14.
 Y-axis (40,240)→(40,20): stroke #1f2937 w2. Arrowhead at top end. Label 'y' at (40,14) font-size 14.
 Grid lines every 60px: stroke #e5e7eb w1 (faint). X-axis labels '1','2','3','4' at x=100,160,220,280 y=258 font-size 12 fill #6b7280.
 Y-axis labels '2','4','6','8' at x=24 y=180,120,60 font-size 12 fill #6b7280.
 Origin label '0' at (26,256) font-size 12 fill #6b7280.
 Line through (40,240) to (280,60): stroke #4f46e5 w2.5.
 Filled circle at (100,180) r=5 fill #4f46e5. Label '(1, 2)' at (108,174) font-size 13 fill #4f46e5.
 Filled circle at (220,60) r=5 fill #4f46e5. Label '(3, 6)' at (228,54) font-size 13 fill #4f46e5.
 Diagram title 'Line: y = 2x' at (200,285) text-anchor middle fill #6b7280 font-size 13. Generate SVG code."

── EXAMPLE 4 — Venn Diagram (A=15, B=20, A∩B=7, outside=8 from steps) ──
illustration_title: "Venn Diagram — Sets A and B"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 Universal set rectangle: (20,30)→(380,270) stroke #6b7280 w1.5 fill none. Label 'ξ' at (32,48) font-size 15 fill #6b7280.
 Circle A: cx=155 cy=155 r=90 fill #4f46e540 stroke #4f46e5 w2. Label 'A' at (100,90) font-size 16 font-weight bold fill #4f46e5.
 Circle B: cx=245 cy=155 r=90 fill #10b98140 stroke #10b981 w2. Label 'B' at (298,90) font-size 16 font-weight bold fill #10b981.
 Label '8' (A only) at (112,158) font-size 18 font-weight bold fill #1f2937.
 Label '7' (intersection) at (197,158) font-size 18 font-weight bold fill #1f2937.
 Label '13' (B only) at (278,158) font-size 18 font-weight bold fill #1f2937.
 Label '8' (outside) at (345,240) font-size 15 fill #6b7280.
 Diagram title 'Venn Diagram' at (200,285) text-anchor middle fill #6b7280 font-size 13. Generate SVG code."

BAD (never write vague briefs): "Draw a triangle." / "Show the cylinder." / "Illustrate the sets."`,

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

    illustration: `
ILLUSTRATION — PHYSICS
Two fields to fill for every diagram: illustration_title and illustration_prompt.

illustration_title — short label shown above the diagram in the UI (4–7 words max).
  GOOD: "Refraction of Light at Air-Glass Boundary" / "Series Circuit — Two Resistors" / "Velocity-Time Graph"
  BAD: "Diagram" / "Physics illustration" / "See diagram"
  Set "" when illustration_prompt is "".

illustration_prompt — precise SVG code brief. Generate when the SPATIAL SETUP matters.
  Test: "Would the student still be confused about the physical arrangement after reading the steps?"

INCLUDE:
  • Ray diagrams: refraction, reflection, lens/mirror — boundary/surface, normal (dashed), incident ray, refracted/reflected ray, all angles labelled from your steps
  • Electric circuits: rectangular loop with correctly placed components — cell (long/short line symbol), resistors (zigzag), bulbs, switches — series or parallel, all values from your steps
  • Force / vector diagrams: arrows at correct angles, labelled with magnitudes from your steps, resultant highlighted in indigo
  • Velocity-time graphs: plotted line with correct values from your steps — x-axis=time, y-axis=velocity, gradient=acceleration
  • Distance-time graphs: plotted line from your steps — gradient=speed, flat=stationary
  • Wave diagrams: sinusoidal curve with wavelength (λ), amplitude (A), crest and trough labelled from your steps
  • Lever / moments: horizontal beam on fulcrum, load and effort arrows with distances from your steps
  • Projectile path: curved arc from launch, labelled u, angle, max height, range — values from your steps

EXCLUDE — always "" (no illustration changes understanding):
  • Pure definitions (what is inertia, what is frequency)
  • Formula substitution with no spatial component (V=IR, P=IV calculations)
  • Nuclear/radioactive decay equations
  • Any question where the steps fully carry the understanding

VALUES RULE: every angle, distance, speed, and resistance in the brief MUST match your steps, not the raw question.

SVG CONVENTIONS:
  • viewBox "0 0 400 300", white background rect
  • Main structure / outlines: stroke #1f2937, stroke-width 2
  • Key element / answer / direction of interest: stroke or fill #4f46e5 (indigo)
  • Dashed normals / secondary lines: stroke-dasharray "6 3", stroke #6b7280
  • Angle arcs: stroke #6b7280, radius 32–40
  • All labels: font-size 14px minimum, font-family "system-ui, sans-serif"
  • End with: "Generate SVG code."

── EXAMPLE 1 — Refraction (incidence 30°, refraction 19°, air→glass from steps) ──
illustration_title: "Refraction of Light — Air to Glass (30° → 19°)"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 Boundary line (40,155)→(360,155): stroke #1f2937 w2.
 Label 'Air' at (22,135) font-size 14 fill #6b7280. Label 'Glass' at (18,180) font-size 14 fill #6b7280.
 Dashed normal (200,40)→(200,260): stroke #6b7280 stroke-dasharray 6 3 w1.5.
 Incident ray from (90,55) to (200,155): stroke #1f2937 w2.5. Arrowhead at (200,155) pointing down-right.
 Refracted ray from (200,155) to (305,248): stroke #4f46e5 w2.5. Arrowhead at (305,248).
 Arc at (200,155) r=38 sweeping from normal to incident ray: stroke #6b7280 w1.5. Label '30°' at (172,122) font-size 14 fill #6b7280.
 Arc at (200,155) r=48 sweeping from normal to refracted ray: stroke #4f46e5 w1.5. Label '19°' at (218,190) font-size 14 fill #4f46e5 font-weight bold.
 Label 'Incident ray' at (82,44) font-size 13 fill #1f2937. Label 'Refracted ray' at (265,255) font-size 13 fill #4f46e5.
 Diagram title 'Refraction of Light' at (200,285) text-anchor middle fill #6b7280 font-size 13. Generate SVG code."

── EXAMPLE 2 — Series Circuit (V=12V, R₁=3Ω, R₂=5Ω from steps) ──
illustration_title: "Series Circuit — 12 V, R₁=3Ω, R₂=5Ω"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 Circuit rectangle: corners at (55,80),(345,80),(345,220),(55,220). Stroke #1f2937 w2.
 Cell on left side: long line (55,130)→(55,170) stroke #1f2937 w3; short line (55,143)→(55,157) stroke #1f2937 w1.5, offset right 8px.
 Label '+' at (65,128) font-size 13 fill #1f2937. Label '−' at (65,162) font-size 13 fill #1f2937.
 Label '12 V' at (22,150) font-size 14 fill #4f46e5 font-weight bold.
 Resistor R₁ on top wire: zigzag from (110,80) to (200,80) stroke #1f2937 w2. Label 'R₁ = 3 Ω' at (148,66) font-size 13 fill #1f2937.
 Resistor R₂ on top wire: zigzag from (210,80) to (300,80) stroke #1f2937 w2. Label 'R₂ = 5 Ω' at (248,66) font-size 13 fill #1f2937.
 Current arrow at (200,220) pointing right: stroke #6b7280 w1.5. Label 'I' at (200,236) font-size 13 fill #6b7280.
 Diagram title 'Series Circuit' at (200,285) text-anchor middle fill #6b7280 font-size 13. Generate SVG code."

── EXAMPLE 3 — Velocity-Time Graph (u=0, a=4 m/s², t=5 s, v=20 m/s from steps) ──
illustration_title: "Velocity-Time Graph — Uniform Acceleration"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 X-axis (50,250)→(370,250): stroke #1f2937 w2. Arrowhead at right. Label 'Time (s)' at (355,270) font-size 13.
 Y-axis (50,250)→(50,20): stroke #1f2937 w2. Arrowhead at top. Label 'Velocity (m/s)' at (8,130) font-size 13 writing-mode vertical-lr.
 X-axis ticks and labels at x=50,110,170,230,290,350 for t=0,1,2,3,4,5: font-size 12 fill #6b7280.
 Y-axis ticks and labels at y=250,210,170,130,90,50 for v=0,4,8,12,16,20: font-size 12 fill #6b7280.
 Plotted line from (50,250) to (350,50): stroke #4f46e5 w2.5.
 Filled circles at start (50,250) and end (350,50): r=5 fill #4f46e5.
 Dashed vertical (350,50)→(350,250): stroke-dasharray 6 3 #6b7280. Label 't = 5 s' at (352,262) font-size 13 fill #6b7280.
 Dashed horizontal (50,50)→(350,50): stroke-dasharray 6 3 #6b7280. Label 'v = 20 m/s' at (14,48) font-size 13 fill #6b7280.
 Label 'gradient = a = 4 m/s²' at (170,130) font-size 13 fill #4f46e5.
 Diagram title 'Velocity-Time Graph' at (200,285) text-anchor middle fill #6b7280 font-size 13. Generate SVG code."

── EXAMPLE 4 — Lever / Moments (effort=20N at 3m, load=60N at 1m from fulcrum from steps) ──
illustration_title: "Lever — Moments in Equilibrium"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 Horizontal beam (40,160)→(360,160): stroke #1f2937 w3.
 Fulcrum triangle at centre (200,160): points (200,200),(178,200),(222,200) and apex (200,160). Stroke #1f2937 w2, fill #e5e7eb.
 Effort arrow pointing down from (80,120)→(80,160): stroke #4f46e5 w2.5 arrowhead at (80,160). Label 'Effort = 20 N' at (16,100) font-size 13 fill #4f46e5.
 Dashed distance line (80,175)→(200,175): stroke-dasharray 6 3 #6b7280. Label '3 m' at (135,190) font-size 13 fill #6b7280.
 Load arrow pointing down from (260,120)→(260,160): stroke #1f2937 w2.5 arrowhead at (260,160). Label 'Load = 60 N' at (268,100) font-size 13 fill #1f2937.
 Dashed distance line (200,175)→(260,175): stroke-dasharray 6 3 #6b7280. Label '1 m' at (225,190) font-size 13 fill #6b7280.
 Label 'Fulcrum' at (195,215) font-size 13 fill #6b7280.
 Diagram title 'Lever — Moments' at (200,285) text-anchor middle fill #6b7280 font-size 13. Generate SVG code."

BAD (never vague): "Draw a circuit." / "Show the ray diagram." / "Illustrate the lever."`,

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

    illustration: `
ILLUSTRATION — CHEMISTRY
Two fields to fill for every diagram: illustration_title and illustration_prompt.

illustration_title — short label shown above the diagram in the UI (4–7 words max).
  GOOD: "Electron Shell Diagram — Sodium (Na)" / "Electrolysis of Brine Setup" / "Energy Profile — Exothermic Reaction"
  BAD: "Chemistry diagram" / "Illustration" / "Structure"
  Set "" when illustration_prompt is "".

illustration_prompt — precise SVG code brief. Generate ONLY when a student cannot visualise the structure or apparatus from text alone.

INCLUDE:
  • Electron shell diagrams: atomic structure questions — nucleus with proton number, shells with correct electron counts
  • Laboratory apparatus: titration setup (retort stand, burette, conical flask, white tile), electrolysis cell (electrodes, electrolyte, gas jars), distillation (flask, condenser, receiver), gas collection over water
  • Reaction energy profiles: progress-of-reaction x-axis, energy y-axis — reactants level, activation energy hump, products level; label Ea, ΔH, reactants, products; show catalyst lowering Ea as second dashed hump
  • Organic structural formulae: displayed structure where bond arrangement IS the concept — e.g. ethanol (C₂H₅OH with C-O-H shown), ester linkage (-COO-), benzene ring (hexagon with alternating bonds)
  • Periodic trend arrows: a simple labelled table strip with arrow showing direction of increase (e.g. atomic radius increasing down Group I)

EXCLUDE — always "" for:
  • Naming compounds, writing/balancing equations (the equation IS the content)
  • Defining terms (ionisation energy, electronegativity)
  • Mole / concentration / titration calculations (steps carry it fully)
  • Gas law calculations (no apparatus needed)
  • Any bonding recall question answered in one sentence

VALUES RULE: electron count per shell, Ea values, temperature/volume values — MUST match your steps.

SVG CONVENTIONS:
  • viewBox "0 0 400 300", white background rect
  • Main outlines: stroke #1f2937, stroke-width 2
  • Key/answer element: fill or stroke #4f46e5 (indigo)
  • Electrons: fill #ef4444 (red), r=5
  • Dashed lines: stroke-dasharray "6 3", stroke #6b7280
  • All labels: font-size 14px minimum, font-family "system-ui, sans-serif"
  • End with: "Generate SVG code."

── EXAMPLE 1 — Electron Shell Diagram (Sodium, 2,8,1 from steps) ──
illustration_title: "Electron Shell Diagram — Sodium (Na, Z=11)"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 Nucleus: filled circle cx=200 cy=150 r=30 fill #4f46e5. Label '11p' at (200,148) text-anchor middle font-size 13 fill white font-weight bold. Label '12n' at (200,162) text-anchor middle font-size 11 fill white.
 Shell 1: circle cx=200 cy=150 r=55 stroke #1f2937 w1.5 fill none.
 2 electrons on shell 1 evenly spaced: circles r=5 fill #ef4444 at (200,95),(200,205).
 Shell 2: circle cx=200 cy=150 r=100 stroke #1f2937 w1.5 fill none.
 8 electrons on shell 2 at 45° intervals: r=5 fill #ef4444 at (271,79),(300,150),(271,221),(200,250),(129,221),(100,150),(129,79),(200,50).
 Shell 3: circle cx=200 cy=150 r=140 stroke #1f2937 w1.5 fill none.
 1 electron on shell 3: circle r=5 fill #ef4444 at (200,10).
 Label '2' at (225,97) font-size 13 fill #6b7280. Label '8' at (310,150) font-size 13 fill #6b7280. Label '1' at (215,14) font-size 13 fill #6b7280.
 Diagram title 'Sodium (Na) — Electronic Configuration 2, 8, 1' at (200,285) text-anchor middle fill #6b7280 font-size 12. Generate SVG code."

── EXAMPLE 2 — Electrolysis Cell (copper sulfate solution, copper electrodes from steps) ──
illustration_title: "Electrolysis of Copper Sulfate Solution"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 Electrolytic cell: rectangle (60,100)→(340,260) stroke #1f2937 w2 fill #f0f9ff.
 Label 'CuSO₄ solution' at (200,195) text-anchor middle font-size 13 fill #1f2937.
 Left electrode (cathode): rect (90,80)→(120,240) fill #6b7280 stroke #1f2937 w1.5. Label 'Cathode (−)' at (65,70) font-size 13 fill #1f2937.
 Right electrode (anode): rect (280,80)→(310,240) fill #b45309 stroke #1f2937 w1.5. Label 'Anode (+)' at (285,70) font-size 13 fill #1f2937.
 Battery symbol above: line (105,55)→(295,55) stroke #1f2937 w1.5. Long line at (175,42)→(175,68) stroke #1f2937 w2.5. Short line at (225,48)→(225,62) stroke #1f2937 w1.5.
 Label '+' at (236,44) font-size 14 fill #1f2937. Label '−' at (160,44) font-size 14 fill #1f2937.
 Cu²⁺ ion arrows moving toward cathode (left): small arrow at (220,160) pointing left, stroke #4f46e5 w1.5. Label 'Cu²⁺' at (228,158) font-size 12 fill #4f46e5.
 Label 'Cu deposited' at (55,210) font-size 12 fill #4f46e5.
 Diagram title 'Electrolysis — Copper Sulfate' at (200,285) text-anchor middle fill #6b7280 font-size 12. Generate SVG code."

── EXAMPLE 3 — Reaction Energy Profile (exothermic, with and without catalyst from steps) ──
illustration_title: "Energy Profile — Exothermic Reaction with Catalyst"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 X-axis (40,250)→(380,250): stroke #1f2937 w2. Label 'Progress of Reaction' at (200,272) text-anchor middle font-size 13 fill #6b7280.
 Y-axis (40,250)→(40,20): stroke #1f2937 w2. Label 'Energy' at (14,140) font-size 13 fill #6b7280 writing-mode vertical-rl.
 Reactants energy level: horizontal dashed line (60,130)→(130,130) stroke #6b7280 w1.5. Label 'Reactants' at (40,123) font-size 12 fill #6b7280.
 Products energy level: horizontal dashed line (280,200)→(370,200) stroke #6b7280 w1.5. Label 'Products' at (310,218) font-size 12 fill #6b7280.
 Main reaction curve (no catalyst): smooth arc from (100,130) up to peak (200,50) and down to (320,200). Stroke #1f2937 w2.5.
 Catalyst curve: smooth arc from (100,130) up to peak (200,88) and down to (320,200). Stroke #4f46e5 w2 stroke-dasharray 8 4.
 Vertical arrow (200,50)→(200,130): stroke #1f2937 w1.5 arrowheads both ends. Label 'Ea (no catalyst)' at (210,88) font-size 12 fill #1f2937.
 Vertical arrow (200,88)→(200,130): stroke #4f46e5 w1.5 arrowheads both ends. Label 'Ea (catalyst)' at (212,112) font-size 12 fill #4f46e5.
 Vertical arrow (130,130)→(130,200): stroke #6b7280 w1.5. Label 'ΔH (−ve)' at (135,168) font-size 12 fill #6b7280.
 Diagram title 'Exothermic Reaction — Effect of Catalyst on Activation Energy' at (200,285) text-anchor middle fill #6b7280 font-size 11. Generate SVG code."

BAD (never vague): "Draw the electron shells." / "Show the apparatus." / "Illustrate the energy profile."`,

    hintGuide: `
HINT EXAMPLES — CHEMISTRY
  Mole calc:        "Start with n = m ÷ M — identify the molar mass from the periodic table first."
  Titration:        "Write the balanced equation first to find the mole ratio between acid and base."
  Gas laws:         "Check which gas law applies — are P, V or T changing?"
  Electrochemistry: "Use the Faraday equation: moles of electrons = charge ÷ 96,500."
  Periodic trends:  "Think about how nuclear charge and shielding change across the period."
  Organic chem:     "Identify the functional group first — that tells you the reaction type."
  Atomic structure: "Count total electrons, then fill shell 1 (max 2), shell 2 (max 8), shell 3 (max 8)."`,

    extraRules: '',
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

Recall and process questions (set [] — explain in "correct"):
  Cell structure, organelles, osmosis, diffusion, respiration, photosynthesis process,
  classification, ecological relationships, menstrual cycle, blood groups (ABO logic —
  only the probability crosses need steps, not the blood type definitions)

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
  ]`,

    illustration: `
ILLUSTRATION — BIOLOGY
Two fields to fill for every diagram: illustration_title and illustration_prompt.

illustration_title — short label shown above the diagram in the UI (4–7 words max).
  GOOD: "Osmosis — Water Movement Across Membrane" / "Punnett Square — Tall × Dwarf Cross" / "Simplified Animal Cell"
  BAD: "Biology diagram" / "Illustration" / "Cell diagram"
  Set "" when illustration_prompt is "".

illustration_prompt — precise SVG code brief. Generate when the VISUAL STRUCTURE or PROCESS DIRECTION is the core of the question.

INCLUDE:
  • Osmosis / diffusion diagrams: two compartments separated by a membrane — label concentrations (hypertonic/hypotonic or solute %, water potential ψ), large blue arrow showing direction of water movement
  • Punnett squares: 2×2 grid — label parent genotypes across top and side, fill four cells with offspring genotypes, show phenotype ratio below the grid
  • Cell diagrams: animal cell (circle outline) or plant cell (rectangle outline) — show ONLY organelles relevant to the question; label with leader lines
  • Food chain / web: boxes connected by arrows — energy flows from left to right; label each trophic level; arrow = "energy transferred to"
  • Reflex arc: five labelled boxes in sequence — Receptor → Sensory Neuron → Relay Neuron → Motor Neuron → Effector — connected by arrows, spinal cord shown as oval around relay neuron
  • Heart structure: simplified cross-section showing four chambers (RA, LA, RV, LV), aorta, pulmonary artery/vein — label only parts tested in the question
  • Leaf cross-section: layers from top to bottom — upper epidermis, palisade mesophyll, spongy mesophyll, lower epidermis, stoma — label only tested parts

EXCLUDE — always "" for:
  • Pure recall definitions ("what is a mitochondrion", "define osmosis")
  • Classification questions (kingdom, phylum — no diagram changes recall)
  • Any concept fully explained in one or two sentences
  • Magnification calculation questions (the steps carry everything)

VALUES RULE: genotype ratios, concentration values, percentage figures — MUST match your steps.

SVG CONVENTIONS:
  • viewBox "0 0 400 300", white background rect
  • Cell outlines: stroke #1f2937 w2, fill none; plant cell corners are right-angled, animal cell is rounded
  • Organelle fills: nucleus #4f46e540 stroke #4f46e5; mitochondria #10b98140 stroke #10b981; chloroplast #16a34a40 stroke #16a34a
  • Process arrows (water movement, energy flow): stroke #4f46e5, stroke-width 3, filled arrowhead
  • Punnett square grid: stroke #1f2937 w1.5, cell font-size 16 font-weight bold, dominant allele uppercase
  • All labels: font-size 14px minimum, font-family "system-ui, sans-serif"
  • End with: "Generate SVG code."

── EXAMPLE 1 — Osmosis (5% solution left, 15% solution right, water moves right from steps) ──
illustration_title: "Osmosis — Water Movement from Low to High Solute Concentration"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 Left compartment rectangle (30,50)→(185,250): stroke #1f2937 w2 fill #dbeafe. Label '5% sucrose solution' at (107,280) text-anchor middle font-size 12 fill #1f2937. Label 'Low solute' at (107,90) text-anchor middle font-size 13 fill #6b7280. Label 'High water potential (ψ)' at (107,108) text-anchor middle font-size 11 fill #6b7280.
 Right compartment rectangle (215,50)→(370,250): stroke #1f2937 w2 fill #bfdbfe. Label '15% sucrose solution' at (292,280) text-anchor middle font-size 12 fill #1f2937. Label 'High solute' at (292,90) text-anchor middle font-size 13 fill #6b7280. Label 'Low water potential (ψ)' at (292,108) text-anchor middle font-size 11 fill #6b7280.
 Semipermeable membrane: dashed vertical line (200,50)→(200,250) stroke #1f2937 w3 stroke-dasharray 8 4. Label 'Semipermeable membrane' at (200,38) text-anchor middle font-size 12 fill #1f2937.
 Large water movement arrow (160,150)→(240,150): stroke #4f46e5 w4 arrowhead at (240,150) fill #4f46e5. Label 'Water moves by osmosis →' at (200,175) text-anchor middle font-size 13 fill #4f46e5 font-weight bold.
 Diagram title 'Osmosis — Net Movement of Water' at (200,295) text-anchor middle fill #6b7280 font-size 12. Generate SVG code."

── EXAMPLE 2 — Punnett Square (Tt × Tt, tall=T dominant, dwarf=t recessive from steps) ──
illustration_title: "Punnett Square — Tall Plant Cross (Tt × Tt)"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 Parent genotype labels: 'P₁: Tt' at (50,30) font-size 15 font-weight bold fill #1f2937. '×' at (200,30) font-size 15 fill #6b7280. 'P₂: Tt' at (310,30) font-size 15 font-weight bold fill #1f2937.
 Column gametes above grid: 'T' at (175,72) font-size 16 font-weight bold fill #4f46e5. 't' at (285,72) font-size 16 font-weight bold fill #6b7280.
 Row gametes left of grid: 'T' at (82,130) font-size 16 font-weight bold fill #4f46e5. 't' at (82,200) font-size 16 font-weight bold fill #6b7280.
 Grid outline (110,88)→(330,238): 4 cells, each 110×75. Stroke #1f2937 w2.
 Vertical divider (220,88)→(220,238): stroke #1f2937 w1.5.
 Horizontal divider (110,163)→(330,163): stroke #1f2937 w1.5.
 Cell contents: 'TT' at (165,132) font-size 17 font-weight bold fill #4f46e5. 'Tt' at (275,132) font-size 17 font-weight bold fill #4f46e5. 'Tt' at (165,202) font-size 17 font-weight bold fill #4f46e5. 'tt' at (275,202) font-size 17 font-weight bold fill #6b7280.
 Ratio label below: 'Phenotype ratio: 3 Tall : 1 Dwarf' at (220,260) text-anchor middle font-size 13 fill #1f2937.
 Diagram title 'Punnett Square — Monohybrid Cross' at (200,285) text-anchor middle fill #6b7280 font-size 12. Generate SVG code."

── EXAMPLE 3 — Food Chain (Grass → Grasshopper → Frog → Snake from steps) ──
illustration_title: "Food Chain — Grassland Ecosystem"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 Box 1 (Grass): rect (20,120)→(90,180) rx=6 stroke #16a34a w2 fill #dcfce7. Label 'Grass' at (55,155) text-anchor middle font-size 13 fill #16a34a font-weight bold. Label 'Producer' at (55,170) text-anchor middle font-size 11 fill #6b7280.
 Arrow 1→2: (90,150)→(120,150) stroke #4f46e5 w2.5 arrowhead at (120,150).
 Box 2 (Grasshopper): rect (120,120)→(210,180) rx=6 stroke #1f2937 w2 fill #f3f4f6. Label 'Grasshopper' at (165,150) text-anchor middle font-size 12 fill #1f2937. Label 'Primary consumer' at (165,168) text-anchor middle font-size 10 fill #6b7280.
 Arrow 2→3: (210,150)→(240,150) stroke #4f46e5 w2.5 arrowhead at (240,150).
 Box 3 (Frog): rect (240,120)→(310,180) rx=6 stroke #1f2937 w2 fill #f3f4f6. Label 'Frog' at (275,150) text-anchor middle font-size 13 fill #1f2937. Label 'Secondary consumer' at (275,168) text-anchor middle font-size 10 fill #6b7280.
 Arrow 3→4: (310,150)→(340,150) stroke #4f46e5 w2.5 arrowhead at (340,150).
 Box 4 (Snake): rect (340,120)→(390,180) rx=6 stroke #1f2937 w2 fill #fef3c7. Label 'Snake' at (365,150) text-anchor middle font-size 12 fill #b45309. Label 'Tertiary' at (365,168) text-anchor middle font-size 10 fill #6b7280.
 Label 'Energy flow →' at (200,105) text-anchor middle font-size 13 fill #4f46e5.
 Diagram title 'Food Chain — Grassland' at (200,285) text-anchor middle fill #6b7280 font-size 13. Generate SVG code."

BAD (never vague): "Draw a cell." / "Show osmosis." / "Illustrate the food chain."`,

    hintGuide: `
HINT EXAMPLES — BIOLOGY
  Magnification:   "Magnification = image size ÷ actual size — check your units are the same."
  Genetics:        "Write out the parental genotypes, list the gametes, then fill in the Punnett square."
  Osmosis:         "Water moves from a region of high water potential to low water potential."
  Respiration:     "Decide whether conditions are aerobic or anaerobic — that determines the products."
  Photosynthesis:  "Think about which raw materials go IN and what products come OUT of the chloroplast."
  Ecology:         "Producers always start a food chain — they make their own food from sunlight."`,

    extraRules: '',
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

    illustration: `
ILLUSTRATION — ECONOMICS
Two fields to fill for every diagram: illustration_title and illustration_prompt.

illustration_title — short label shown above the diagram in the UI (4–7 words max).
  GOOD: "Demand and Supply — Market Equilibrium" / "Demand Shift — Increase in Consumer Income" / "Production Possibility Curve"
  BAD: "Economics diagram" / "Graph" / "Chart"
  Set "" when illustration_prompt is "".

illustration_prompt — precise SVG code brief. Generate ONLY when the VISUAL RELATIONSHIP between curves/points IS the answer.

INCLUDE:
  • Demand and supply equilibrium: D curve (downward), S curve (upward), intersection marked (P*, Q*) with dashed drop lines — when the question is about reading or interpreting a market diagram
  • Demand SHIFT: original D curve + new D₁ or D₂ curve (parallel, shifted right or left), two equilibrium points, labels showing new P and Q — for questions about what causes demand to change
  • Supply SHIFT: original S curve + new S₁ or S₂ curve (parallel, shifted), two equilibrium points — for questions about supply determinants
  • PPC (Production Possibility Curve): curved frontier from y-axis to x-axis, one interior point labelled "Inefficient", one exterior point labelled "Unattainable", one point on curve labelled "Efficient" — for opportunity cost and efficiency questions
  • Business cycle: smooth wave across x-axis (time), clearly labelled phases — Boom (peak), Recession (falling), Trough (lowest), Recovery (rising) — only when question tests reading the phases

EXCLUDE — always "" for:
  • Definitions ("what is demand", "define elasticity", "what is a public good")
  • Elasticity / multiplier / national income CALCULATIONS — the steps carry understanding
  • Policy questions answered in prose ("effect of raising interest rates")
  • Any concept fully explained in one sentence

SVG CONVENTIONS:
  • viewBox "0 0 400 300", white background rect
  • X-axis label: "Quantity (Q)", Y-axis label: "Price (P)" — always
  • Demand curve: stroke #4f46e5 (indigo), label 'D' or 'D₁'/'D₂' at curve end
  • Supply curve: stroke #10b981 (green), label 'S' or 'S₁'/'S₂' at curve end
  • Equilibrium point: filled circle r=5 fill #1f2937, dashed lines to both axes
  • Shifted curve: same colour as original, stroke-dasharray "8 4", labelled with subscript
  • All labels: font-size 14px minimum, font-family "system-ui, sans-serif"
  • End with: "Generate SVG code."

── EXAMPLE 1 — Demand and Supply Equilibrium ──
illustration_title: "Demand and Supply — Market Equilibrium"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 X-axis (50,265)→(375,265): stroke #1f2937 w2. Arrowhead at right. Label 'Quantity (Q)' at (355,282) font-size 13 fill #6b7280.
 Y-axis (50,265)→(50,20): stroke #1f2937 w2. Arrowhead at top. Label 'Price (P)' at (28,32) font-size 13 fill #6b7280.
 Demand curve (80,55)→(345,245): stroke #4f46e5 w2.5. Label 'D' at (352,248) font-size 15 fill #4f46e5 font-weight bold.
 Supply curve (80,245)→(345,55): stroke #10b981 w2.5. Label 'S' at (352,52) font-size 15 fill #10b981 font-weight bold.
 Equilibrium point at (213,150): filled circle r=6 fill #1f2937.
 Dashed vertical (213,150)→(213,265): stroke-dasharray 6 3 stroke #6b7280 w1.5.
 Dashed horizontal (50,150)→(213,150): stroke-dasharray 6 3 stroke #6b7280 w1.5.
 Label 'P*' at (30,148) font-size 14 fill #1f2937 font-weight bold. Label 'Q*' at (210,280) font-size 14 fill #1f2937 font-weight bold.
 Diagram title 'Market Equilibrium' at (200,295) text-anchor middle fill #6b7280 font-size 12. Generate SVG code."

── EXAMPLE 2 — Demand Shift Right (income increases, normal good from steps) ──
illustration_title: "Demand Shift — Increase in Consumer Income"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 X-axis (50,265)→(375,265): stroke #1f2937 w2. Label 'Quantity (Q)' at (355,282) font-size 13 fill #6b7280.
 Y-axis (50,265)→(50,20): stroke #1f2937 w2. Label 'Price (P)' at (28,32) font-size 13 fill #6b7280.
 Supply curve (80,245)→(345,55): stroke #10b981 w2.5. Label 'S' at (352,52) font-size 15 fill #10b981 font-weight bold.
 Original demand D₁ (60,60)→(310,250): stroke #4f46e5 w2. Label 'D₁' at (318,252) font-size 14 fill #4f46e5.
 New demand D₂ shifted right (130,55)→(370,245): stroke #4f46e5 w2.5 stroke-dasharray 8 4. Label 'D₂' at (375,248) font-size 14 fill #4f46e5 font-weight bold.
 Old equilibrium E₁ at (185,148): circle r=5 fill #6b7280.
 Dashed vertical (185,148)→(185,265): stroke-dasharray 6 3 #6b7280 w1. Label 'Q₁' at (182,278) font-size 12 fill #6b7280.
 Dashed horizontal (50,148)→(185,148): stroke-dasharray 6 3 #6b7280 w1. Label 'P₁' at (32,146) font-size 12 fill #6b7280.
 New equilibrium E₂ at (255,120): circle r=6 fill #1f2937.
 Dashed vertical (255,120)→(255,265): stroke-dasharray 6 3 #6b7280 w1.5. Label 'Q₂' at (252,278) font-size 13 fill #1f2937 font-weight bold.
 Dashed horizontal (50,120)→(255,120): stroke-dasharray 6 3 #6b7280 w1.5. Label 'P₂' at (30,118) font-size 13 fill #1f2937 font-weight bold.
 Arrow showing shift from D₁ to D₂: (240,110)→(280,110) stroke #4f46e5 w2 arrowhead at (280,110).
 Diagram title 'Demand Shift — Income Rise (Normal Good)' at (200,295) text-anchor middle fill #6b7280 font-size 12. Generate SVG code."

── EXAMPLE 3 — Production Possibility Curve (guns vs butter from steps) ──
illustration_title: "Production Possibility Curve — Guns vs Butter"
illustration_prompt: "SVG code brief: viewBox 0 0 400 300. White background rect.
 X-axis (50,265)→(375,265): stroke #1f2937 w2. Arrowhead at right. Label 'Butter (units)' at (340,282) font-size 13 fill #6b7280.
 Y-axis (50,265)→(50,20): stroke #1f2937 w2. Arrowhead at top. Label 'Guns (units)' at (18,130) font-size 13 fill #6b7280 writing-mode vertical-rl.
 PPC curve: smooth quadratic arc from (50,55) curving to (355,265): stroke #1f2937 w2.5 fill none.
 Point A on curve (efficient) at (175,130): filled circle r=6 fill #10b981. Label 'A (Efficient)' at (182,120) font-size 13 fill #10b981.
 Point B inside curve (inefficient) at (160,185): filled circle r=6 fill #6b7280. Label 'B (Inefficient)' at (168,195) font-size 13 fill #6b7280.
 Point C outside curve (unattainable) at (270,80): filled circle r=6 fill #ef4444. Label 'C (Unattainable)' at (278,72) font-size 13 fill #ef4444.
 Opportunity cost arrow along curve from A toward x-axis: stroke #4f46e5 w1.5 arrowhead.
 Diagram title 'Production Possibility Curve' at (200,295) text-anchor middle fill #6b7280 font-size 12. Generate SVG code."

BAD (never vague): "Draw a demand curve." / "Show the PPC." / "Illustrate the shift."`,

    hintGuide: `
HINT EXAMPLES — ECONOMICS
  PED:            "Price elasticity = percentage change in quantity demanded ÷ percentage change in price."
  Supply shift:   "Think about what causes supply to change — costs, technology, number of producers."
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

Subjects in this group: English Language, Use of English, Literature in English,
Government, History, CRK, IRK, Yoruba, Igbo, Hausa, French, Commerce (non-numerical),
Geography (non-numerical questions).`,

    illustration: `
ILLUSTRATION — HUMANITIES & LANGUAGE
illustration_prompt: "" always. No diagrams for these subjects.

These subjects are fully explained through text. No geometry, no apparatus, no charts.
Do not generate illustration_prompt for any English, Government, History, Literature, CRK, IRK, or language question.`,

    hintGuide: `
HINT EXAMPLES — HUMANITIES & LANGUAGE
  Synonym/antonym:   "Think about the ROOT meaning of the word — what family of ideas does it belong to?"
  Grammar:           "Read the sentence aloud — does it sound right? Check subject-verb agreement."
  Comprehension:     "Go back to the passage and find the sentence that directly answers this question."
  Government:        "Think about which arm of government (executive, legislative, judicial) handles this."
  History:           "Think about the TIME PERIOD — which event or leader is associated with that era?"
  Literature:        "Think about the CHARACTER'S motivation — why would they say or do that at this point?"`,

    extraRules: `
INSTRUCTION TEXT — ENGLISH & LANGUAGE QUESTIONS
Many exam questions depend on a section instruction printed once for a group of questions.
Students see questions in random CBT order, so each question must be self-contained.

Set instruction_text when the question type is:
  Fill-the-blank / cloze:     "Choose the option that best fills the gap."
  Synonym / nearest meaning:  "Choose the word nearest in meaning to the underlined word."
  Antonym / opposite:         "Choose the word opposite in meaning to the underlined word."
  Sentence completion:        "Choose the option that best completes the sentence."
  Word stress / phonetics:    "Identify the word with the same stress pattern as the given word."
  Rhyme:                      "Which word rhymes with the word given?"
  Grammar correction:         "Choose the option that correctly fills the gap."
  Comprehension:              "Answer based on the passage above." (passage goes in passage_text)

If the instruction appears verbatim in the PDF → copy it exactly.
If the instruction is missing but the type is clear → write it using the standard phrasing above.
If the question is self-contained → instruction_text: null`,
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