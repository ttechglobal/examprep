'use client'
// src/app/admin/questions/myquest-import/page.js
// ─────────────────────────────────────────────────────────────────────────────
// MyQuest API Import Engine — Admin UI
//
// Flow (identical to S-Dash import):
//   1. Pick subject + exam type + year
//   2. Fetch questions from MyQuest API (preview 5, then fetch full batch)
//   3. Generate enrichment prompt → copy to Claude/ChatGPT
//   4. Paste AI response back → Tag Review
//   5. Save to the same question bank
//
// Only what changes vs. S-Dash:
//   • API calls go to /api/admin/myquest/* instead of /api/admin/sdash/*
//   • Subject slugs use MyQuest format (e.g. "use-of-english" not "english")
//   • Exam type is passed as "WAEC" / "JAMB" directly (not "wassce" / "utme")
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { buildSdashEnrichPrompt, parseEnrichment, mergeSdashEnrichment, matchTopicSubtopic, questionHasImage } from '@/lib/questionParser'
import { MathText } from '@/lib/mathRenderer'

// ── MyQuest subject slug map ──────────────────────────────────────────────────
// Maps ExamPrep subject name → MyQuest API subject slug.
// MyQuest slugs are lowercase, hyphenated where needed.
// Lookup is case-insensitive.
const MYQUEST_SLUG_MAP = {
  // Accounting
  'accounting':                    'accounting',
  // Agriculture
  'agriculture':                   'agriculture',
  'agricultural science':          'agriculture',
  'agric science':                 'agriculture',
  'agric':                         'agriculture',
  // Biology
  'biology':                       'biology',
  // Chemistry
  'chemistry':                     'chemistry',
  // Civic Education
  'civic education':               'government',    // closest MyQuest equivalent
  'civic':                         'government',
  // Commerce
  'commerce':                      'commerce',
  // Computer
  'computer':                      'computer',
  'computer studies':              'computer',
  'computer science':              'computer',
  // CRK
  'crk':                           'crk',
  'christian religious knowledge': 'crk',
  'christian religious studies':   'crk',
  // Economics
  'economics':                     'economics',
  // English Language
  'english':                       'use-of-english',
  'english language':              'use-of-english',
  'use of english':                'use-of-english',
  // Literature in English
  'english literature':            'literature-in-english',
  'literature':                    'literature-in-english',
  'literature in english':         'literature-in-english',
  // Geography
  'geography':                     'geography',
  // Government
  'government':                    'government',
  // History
  'history':                       'history',
  // IRK
  'irk':                           'irk',
  'islamic religious knowledge':   'irk',
  'islamic studies':               'irk',
  // Mathematics
  'mathematics':                   'mathematics',
  'maths':                         'mathematics',
  'further mathematics':           'mathematics',
  'further maths':                 'mathematics',
  // Physics
  'physics':                       'physics',
}

// ── Subjects with no MyQuest equivalent ──────────────────────────────────────
const NO_MYQUEST_EQUIVALENT = new Set(['arabic', 'hausa', 'igbo', 'yoruba', 'fine art', 'visual art', 'insurance'])

// ── Normalize a raw MyQuest question to the shape mergeSdashEnrichment expects ─
// mergeSdashEnrichment reads q.option.a / q.option.A / q.answer.
// MyQuest may return options under different key shapes — normalize them all
// to lowercase {a, b, c, d} so the shared enrichment pipeline works correctly.
function normalizeMyQuestQuestion(q, year) {
  const rawOpt = q.option ?? q.options ?? {}
  let normalized = {}

  if (Array.isArray(rawOpt)) {
    // Array: ["text A", "text B", "text C", "text D"]
    const keys = ['a', 'b', 'c', 'd', 'e']
    rawOpt.forEach((v, i) => { if (v != null && String(v).trim()) normalized[keys[i] ?? String(i)] = String(v).trim() })
  } else if (typeof rawOpt === 'object' && rawOpt !== null) {
    // Object: normalize all keys to lowercase
    for (const [k, v] of Object.entries(rawOpt)) {
      if (v != null && String(v).trim()) {
        normalized[k.toLowerCase()] = String(v).trim()
      }
    }
  }

  return {
    ...q,
    option: normalized,          // always {a, b, c, d} shape after normalization
    examyear: q.year ?? q.examyear ?? year,  // ensure year is on the object
  }
}

// ── Detect image references in raw MyQuest question text ─────────────────────
// MyQuest sets q.image when the question has an attached image file.
// But some questions also have text like "refer to the diagram" with no image
// field — we catch those too so they are auto-hidden at import time.
const MQ_IMAGE_TEXT_PATTERNS = [
  /\bdiagram\b/i,
  /\bfigure\b/i,
  /\billustration\b/i,
  /\bthe (image|picture|graph|chart|table) (above|below|shown|given)\b/i,
  /\brefer(ring)? to (the )?(image|diagram|figure|table)\b/i,
  /\busing the (information|data) (in|from) the (table|graph|chart)\b/i,
  /\bfrom the graph\b/i,
  /\bas shown (in|above|below)\b/i,
]

function mqQuestionReferencesImage(q) {
  if (q.image) return true
  const text = (q.question ?? q.question_text ?? '').toLowerCase()
  return MQ_IMAGE_TEXT_PATTERNS.some(pat => pat.test(text))
}

function slugForSubject(name) {
  const key = name.toLowerCase().trim()
  return MYQUEST_SLUG_MAP[key] ?? null
}

function baseSubjectName(name) {
  return (name ?? '').replace(/\s*(WAEC|JAMB|NECO|IGCSE)\s*$/i, '').trim()
}

// ── Small UI components (same as S-Dash page) ─────────────────────────────────

function Spinner({ size = 'md' }) {
  const sz = size === 'sm' ? 'w-4 h-4 border-2' : 'w-6 h-6 border-[3px]'
  return (
    <div className={`${sz} border-indigo-500 border-t-transparent rounded-full animate-spin`} />
  )
}

function Badge({ children, color = 'gray' }) {
  const c = {
    gray:   'bg-gray-100 text-gray-600',
    green:  'bg-green-50 text-green-700',
    amber:  'bg-amber-50 text-amber-700',
    red:    'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-700',
    blue:   'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${c[color] ?? c.gray}`}>
      {children}
    </span>
  )
}

function Alert({ type = 'info', children }) {
  const styles = {
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error:   'bg-red-50 border-red-200 text-red-700',
  }
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm ${styles[type]}`}>
      {children}
    </div>
  )
}

// ── Raw question preview card (MyQuest shape) ─────────────────────────────────
// NOTE: year is passed as a prop because MyQuest does NOT include year on each
// question object — it only exists in the request params we sent.
// NOTE: solution/explanation from MyQuest is intentionally NOT shown here.
// We do not use the provider's answers. Explanations come from Claude.
function QuestionPreviewCard({ q, year, examType }) {
  // Normalise options — MyQuest may return them under different keys
  // Handles: q.option (object), q.options (object), q.option (array)
  const rawOpt = q.option ?? q.options ?? {}
  let options = {}
  if (Array.isArray(rawOpt)) {
    // Array shape: ["text A", "text B", "text C", "text D"]
    const keys = ['a', 'b', 'c', 'd', 'e']
    rawOpt.forEach((v, i) => { if (v != null) options[keys[i] ?? String(i)] = String(v) })
  } else if (typeof rawOpt === 'object' && rawOpt !== null) {
    // Object shape: {a:"...", b:"..."} or {A:"...", B:"..."} or {1:"...", 2:"..."}
    options = rawOpt
  }

  const hasOptions = Object.keys(options).length > 0

  return (
    <div className="border border-gray-100 rounded-xl bg-gray-50 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge color="indigo">{examType ?? '?'}</Badge>
        <Badge color="gray">{year ?? '?'}</Badge>
        {q.image && <Badge color="blue">🖼 Has image</Badge>}
        {q.section && <Badge color="amber">📄 Passage</Badge>}
        {!hasOptions && <Badge color="red">⚠ No options</Badge>}
        <span className="text-[11px] text-gray-400 ml-auto">ID #{q.id}</span>
      </div>

      {q.section && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-wide mb-1">Passage</p>
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{q.section}</p>
        </div>
      )}

      <p className="text-sm text-gray-900 font-medium leading-relaxed">{q.question}</p>

      {hasOptions ? (
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(options).map(([key, val]) => (
            <div
              key={key}
              className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${
                String(key).toLowerCase() === String(q.answer ?? '').toLowerCase()
                  ? 'border-green-300 bg-green-50 text-green-800 font-medium'
                  : 'border-gray-100 bg-white text-gray-600'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 ${
                String(key).toLowerCase() === String(q.answer ?? '').toLowerCase()
                  ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{String(key).toUpperCase()}</span>
              <span className="leading-snug">{String(val)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            Options not found in expected field. Raw keys: <code className="font-mono">{JSON.stringify(Object.keys(q))}</code>
          </p>
        </div>
      )}
      {/* Solution from MyQuest is intentionally not displayed — explanations come from Claude */}
    </div>
  )
}

// ── Import result panel ───────────────────────────────────────────────────────
function ImportResult({ result }) {
  if (!result) return null
  if (result.noData) {
    return (
      <Alert type="warning">
        ⚠️ {result.message ?? 'MyQuest has no questions for this subject/exam/year combination.'}{' '}
        Try a different year.
      </Alert>
    )
  }
  const { fetched, new: isNew, duplicate, saved, errors } = result
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Fetched from MyQuest', value: fetched,    color: 'text-gray-900' },
          { label: 'New (not in DB)',       value: isNew,      color: 'text-indigo-700' },
          { label: 'Duplicates skipped',   value: duplicate,  color: 'text-amber-700' },
          { label: 'Saved to database',    value: saved,      color: 'text-green-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 text-center">
            <p className={`text-2xl font-black tabular-nums ${color}`}>{value ?? 0}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>
      {saved > 0 && (
        <Alert type="success">
          ✅ {saved} question{saved !== 1 ? 's' : ''} imported successfully.{' '}
          Go to{' '}
          <Link href="/admin/past-questions" className="underline font-bold">Past Questions</Link>{' '}
          to tag them to topics.
        </Alert>
      )}
      {duplicate > 0 && (
        <Alert type="info">
          ℹ️ {duplicate} duplicate{duplicate !== 1 ? 's' : ''} detected and skipped — already in your database.
        </Alert>
      )}
      {errors?.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
          <p className="text-xs font-black text-red-600 uppercase tracking-wide">
            {errors.length} error{errors.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-red-600 font-mono">
                {e.id ? `[ID ${e.id}] ` : ''}{e.reason}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Year range builder ────────────────────────────────────────────────────────
function YearRangePicker({ value, onChange }) {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear; y >= 1999; y--) years.push(y)
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={value.from}
        onChange={e => onChange({ ...value, from: e.target.value })}
        className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">From year…</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <span className="text-gray-400 text-sm font-medium">→</span>
      <select
        value={value.to}
        onChange={e => onChange({ ...value, to: e.target.value })}
        className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">To year…</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

const CURRENT_YEAR = new Date().getFullYear()
const DEFAULT_YEAR = String(CURRENT_YEAR - 1)

// ── Illustration Panel (same as S-Dash page) ──────────────────────────────────
function IllustrationPanel({ prompt, svgCode, onChange }) {
  const [copied, setCopied] = useState(false)
  const [tab, setTab]       = useState('prompt')
  const hasValidSvg = svgCode && svgCode.trim().toLowerCase().startsWith('<svg')
  return (
    <div className="rounded-xl border-2 border-violet-200 bg-violet-50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-100 border-b border-violet-200">
        <span className="text-base">🎨</span>
        <span className="text-xs font-black text-violet-800 uppercase tracking-wide flex-1">Illustration needed</span>
        {hasValidSvg && (
          <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">✓ SVG ready</span>
        )}
      </div>
      <div className="flex gap-1 px-3 pt-2.5 pb-0">
        {[
          { id: 'prompt',  label: '1. Prompt' },
          { id: 'paste',   label: '2. Paste SVG' },
          { id: 'preview', label: '3. Preview', disabled: !hasValidSvg },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => !t.disabled && setTab(t.id)}
            disabled={t.disabled}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-t-lg border-b-2 transition-colors ${
              tab === t.id
                ? 'border-violet-500 text-violet-700 bg-white'
                : t.disabled
                ? 'border-transparent text-gray-300 cursor-not-allowed'
                : 'border-transparent text-violet-500 hover:text-violet-700'
            }`}
          >{t.label}</button>
        ))}
      </div>
      <div className="p-4 bg-white border-t border-violet-100">
        {tab === 'prompt' && (
          <>
            <p className="text-xs text-violet-700 mb-2">Copy this prompt and use an AI image/SVG generator to create the diagram.</p>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-xs font-mono text-gray-700 leading-relaxed">
              {prompt}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              className={`mt-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-violet-600 text-white hover:bg-violet-500'}`}
            >{copied ? '✓ Copied' : '📋 Copy prompt'}</button>
          </>
        )}
        {tab === 'paste' && (
          <>
            <p className="text-xs text-violet-700 mb-2">Paste the SVG code here. It will be previewed and saved with the question.</p>
            <textarea
              value={svgCode ?? ''}
              onChange={e => onChange(e.target.value)}
              placeholder="<svg viewBox=...>...</svg>"
              className="w-full h-32 text-xs font-mono border border-violet-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </>
        )}
        {tab === 'preview' && hasValidSvg && (
          <>
            <div
              className="flex justify-center p-4 overflow-x-auto"
              dangerouslySetInnerHTML={{
                __html: svgCode
                  .replace(/<script[\s\S]*?<\/script>/gi, '')
                  .replace(/\son\w+="[^"]*"/gi, '')
              }}
            />
            <p className="text-[10px] text-green-700 font-bold text-center">
              ✓ This SVG will be saved with the question.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyQuestImportPage() {
  const [subjects,       setSubjects]       = useState([])
  const [subjectId,      setSubjectId]      = useState('')
  const [subjectName,    setSubjectName]    = useState('')
  const [examType,       setExamType]       = useState('WAEC')
  const [year,           setYear]           = useState(DEFAULT_YEAR)
  const [mode,           setMode]           = useState('single')   // 'single' | 'range'
  const [yearRange,      setYearRange]      = useState({ from: '2015', to: DEFAULT_YEAR })
  const [preview,        setPreview]        = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError,   setPreviewError]   = useState(null)
  const [importing,      setImporting]      = useState(false)
  const [importResult,   setImportResult]   = useState(null)
  const [importLog,      setImportLog]      = useState([])
  const [activeTab,      setActiveTab]      = useState('import')
  const [mounted,        setMounted]        = useState(false)

  // Enrichment flow state
  const [fetchedQuestions,  setFetchedQuestions]  = useState([])
  const [topics,            setTopics]            = useState([])
  const [enrichStep,        setEnrichStep]        = useState(1)
  const [enrichPrompt,      setEnrichPrompt]      = useState('')
  const [pasteText,         setPasteText]         = useState('')
  const [parsedQuestions,   setParsedQuestions]   = useState([])
  const [parseError,        setParseError]        = useState(null)
  const [diagramQuestions,  setDiagramQuestions]  = useState([])
  const [copiedPrompt,      setCopiedPrompt]      = useState(false)
  const [saving,            setSaving]            = useState(false)
  const pasteRef = useRef(null)

  // Per-question review state
  const [hiddenIndexes,   setHiddenIndexes]   = useState(new Set())
  const [previewQuestion, setPreviewQuestion] = useState(null)
  const [editingTopicIdx, setEditingTopicIdx] = useState(null)
  const [svgDrafts,       setSvgDrafts]       = useState({})
  const [topicEditValue,  setTopicEditValue]  = useState({ topic_title: '', subtopic_title: '' })

  // Held (diagram) questions
  const [heldGroups,       setHeldGroups]      = useState([])
  const [heldEditTarget,   setHeldEditTarget]  = useState(null)
  const [heldEditText,     setHeldEditText]    = useState('')
  const [heldEditError,    setHeldEditError]   = useState(null)
  const [heldSendPrompt,   setHeldSendPrompt]  = useState('')
  const [heldPasteText,    setHeldPasteText]   = useState('')
  const [heldParseError,   setHeldParseError]  = useState(null)
  const [heldSendGroupKey, setHeldSendGroupKey]= useState(null)
  const [heldSendStep,     setHeldSendStep]    = useState(null)
  const [heldParsedQs,     setHeldParsedQs]   = useState([])
  const [heldSaving,       setHeldSaving]      = useState(false)
  const [heldCopied,       setHeldCopied]      = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Namespace held questions separately from S-Dash so they don't collide
  const HELD_KEY = 'ep_mq_diagram_held'

  function loadHeldGroups() {
    try {
      const held = JSON.parse(localStorage.getItem(HELD_KEY) ?? '[]')
      setHeldGroups(Array.isArray(held) ? held : [])
    } catch { setHeldGroups([]) }
  }

  useEffect(() => { if (mounted) loadHeldGroups() }, [mounted])

  const years = []
  for (let y = CURRENT_YEAR; y >= 1999; y--) years.push(y)

  // Group subjects by name
  const groupedSubjects = useMemo(() => {
    const map = {}
    for (const s of subjects) {
      if (!map[s.name]) map[s.name] = { name: s.name, exams: {} }
      map[s.name].exams[s.exam_type] = s
    }
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }, [subjects])

  // Auto-resolve subjectId when name or examType changes
  useEffect(() => {
    const group = groupedSubjects.find(g => g.name === subjectName)
    if (!group) return
    const row = group.exams[examType] ?? Object.values(group.exams)[0]
    if (row?.id) setSubjectId(row.id)
  }, [subjectName, examType, groupedSubjects])

  // Load subjects
  useEffect(() => {
    fetch('/api/admin/subjects?active=true')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.subjects ?? [])
        setSubjects(list)
        if (list[0]) {
          setSubjectName(list[0].name)
          setSubjectId(list[0].id)
          if (list[0].exam_type === 'JAMB') setExamType('JAMB')
        }
      })
      .catch(() => {})
  }, [])

  // Auto-sync examType when subject changes
  useEffect(() => {
    const group = groupedSubjects.find(g => g.name === subjectName)
    if (!group) return
    if (!group.exams[examType]) {
      const available = Object.keys(group.exams)[0]
      if (available) setExamType(available)
    }
  }, [subjectName, groupedSubjects]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load curriculum tree for subject
  useEffect(() => {
    if (!subjectId) return
    fetch(`/api/admin/curriculum?subjectId=${subjectId}`)
      .then(r => r.json())
      .then(d => setTopics(Array.isArray(d) ? d : []))
      .catch(() => setTopics([]))
  }, [subjectId])

  const selectedSubject = useMemo(
    () => subjects.find(s => s.id === subjectId),
    [subjects, subjectId]
  )
  const mqSlug = useMemo(() => {
    if (!selectedSubject) return null
    return slugForSubject(baseSubjectName(selectedSubject.name))
  }, [selectedSubject])

  const canImport = subjectId && mqSlug && year

  // ── Fetch full batch + build enrichment prompt ─────────────────────────────
  async function fetchAndBuildPrompt() {
    if (!canImport) return
    setImporting(true)
    setPreviewError(null)
    try {
      const params = new URLSearchParams({ subject: mqSlug, exam: examType, year, limit: '50' })
      const res  = await fetch(`/api/admin/myquest/fetchbatch?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Fetch failed')
      if (data.noData) {
        setPreviewError(
          `MyQuest has no ${examType} questions for "${mqSlug}" in ${year}. Try a different year.`
        )
        return
      }

      const qs = (data.questions ?? []).map(q => normalizeMyQuestQuestion(q, year))
      if (!qs.length) {
        setPreviewError('No questions returned. Try a different year.')
        return
      }

      // Separate diagram questions — anything with q.image OR text references to a diagram
      const diagramQs = qs.filter(q => mqQuestionReferencesImage(q))
      const cleanQs   = qs.filter(q => !mqQuestionReferencesImage(q))

      if (diagramQs.length) {
        try {
          const key     = `mq_${mqSlug}_${examType}_${year}`
          const held    = JSON.parse(localStorage.getItem(HELD_KEY) ?? '[]')
          const newEntry = { key, subject: selectedSubject?.name, exam: examType, year, questions: diagramQs, savedAt: new Date().toISOString() }
          const updated  = [...held.filter(h => h.key !== key), newEntry]
          localStorage.setItem(HELD_KEY, JSON.stringify(updated))
        } catch {}
      }

      setFetchedQuestions(cleanQs)
      setDiagramQuestions(diagramQs)

      if (!cleanQs.length) {
        setPreviewError(`All ${qs.length} questions reference diagrams. They've been saved for later.`)
        return
      }

      // Build enrichment prompt — reuse same function as S-Dash (same output format)
      const prompt = buildSdashEnrichPrompt(
        cleanQs,
        examType,
        selectedSubject?.name ?? 'Unknown Subject',
        topics
      )
      setEnrichPrompt(prompt)
      setEnrichStep(2)
    } catch (err) {
      setPreviewError(err.message)
    } finally {
      setImporting(false)
    }
  }

  // ── Parse the AI paste-back ─────────────────────────────────────────────────
  function handleParsePaste() {
    setParseError(null)
    const result = parseEnrichment(pasteText)
    if (!result.valid) { setParseError(result.errors.join('\n')); return }
    const merged = mergeSdashEnrichment(
      fetchedQuestions,
      result.enrichments,
      examType,
      selectedSubject?.name ?? 'Unknown Subject'
    )
    const withMatches = merged.map((q, idx) => {
      const rawQ  = fetchedQuestions[idx] ?? {}
      const match = matchTopicSubtopic(q, topics)

      // ── Option count mismatch check ──────────────────────────────────────
      // MyQuest sometimes returns 3 or 5 options; the enriched options object
      // should have the same count as what the raw question had.
      const rawOptKeys = Object.keys(rawQ.option ?? {})
      const enrichOptKeys = Object.keys(q.options ?? {}).filter(k => (q.options[k] ?? '').trim())
      const _optionCountMismatch =
        rawOptKeys.length > 0 &&
        enrichOptKeys.length > 0 &&
        rawOptKeys.length !== enrichOptKeys.length

      return { ...q, _topicMatch: match, _importIdx: idx, _optionCountMismatch }
    })

    // ── Auto-hide questions that reference images/diagrams ──────────────────
    // We use questionHasImage (post-enrichment) PLUS check the raw question text.
    // These are auto-added to hiddenIndexes with reason shown in the UI.
    const autoHidden = new Set()
    withMatches.forEach((q, idx) => {
      const rawQ = fetchedQuestions[idx] ?? {}
      if (questionHasImage(q) || mqQuestionReferencesImage(rawQ)) {
        autoHidden.add(idx)
      }
    })

    setParsedQuestions(withMatches)
    setHiddenIndexes(autoHidden)
    setSvgDrafts({})
    setEnrichStep(4)
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave(questionsToSave) {
    setSaving(true)
    try {
      const questionsWithIds = questionsToSave.map(q => {
        const match      = q._topicMatch
        const topicId    = q.topic_id    ?? match?.topic?.id    ?? null
        const subtopicId = q.subtopic_id ?? match?.subtopic?.id ?? null
        const svgCode    = q._importIdx != null ? (svgDrafts[q._importIdx] ?? '') : ''
        const explanation = svgCode.trim()
          ? { ...(q.explanation ?? {}), svg_diagram: svgCode.trim() }
          : q.explanation

        return {
          ...q,
          explanation,
          topic_id:       topicId,
          subtopic_id:    subtopicId,
          topic_title:    q.topic_title    || match?.topic?.name    || '',
          subtopic_title: q.subtopic_title || match?.subtopic?.name || '',
        }
      })

      const batchRes = await fetch('/api/admin/questions/batch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examType, subjectId, total: questionsToSave.length }),
      })
      const batch = await batchRes.json()

      const saveRes = await fetch('/api/admin/questions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions:   questionsWithIds,
          examType,
          subjectId,
          defaultYear: year,
          batchId:     batch.id ?? null,
          source:      'past_paper',
        }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error ?? 'Save failed')

      setEnrichStep(5)
      setImportResult({ saved: saveData.saved, errors: saveData.errors ?? [] })
    } catch (err) {
      setParseError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Preview (5 questions) ──────────────────────────────────────────────────
  const loadPreview = useCallback(async () => {
    if (!mqSlug || !year) return
    setPreviewLoading(true)
    setPreviewError(null)
    setPreview([])
    try {
      const params = new URLSearchParams({ subject: mqSlug, exam: examType, year })
      const res  = await fetch(`/api/admin/myquest/preview?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Preview failed')
      if (data.noData) {
        setPreviewError(
          `MyQuest has no ${examType} questions for "${mqSlug}" in ${year}. Try a different year.`
        )
      } else if (!data.questions?.length) {
        setPreviewError('No questions returned. Try a different year.')
      } else {
        setPreview(data.questions.map(q => normalizeMyQuestQuestion(q, year)))
      }
    } catch (err) {
      setPreviewError(err.message)
    } finally {
      setPreviewLoading(false)
    }
  }, [mqSlug, examType, year])

  // ── Single-year bulk import (no enrichment) ────────────────────────────────
  async function runImport() {
    if (!canImport) return
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/admin/myquest/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mqSubject: mqSlug, exam: examType, year, subjectId, examType, limit: 50 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setImportResult(data)
    } catch (err) {
      setImportResult({ error: err.message })
    } finally {
      setImporting(false)
    }
  }

  // ── Bulk year-range import ─────────────────────────────────────────────────
  async function runBulkImport() {
    if (!canImport || !yearRange.from || !yearRange.to) return
    const fromY = parseInt(yearRange.from)
    const toY   = parseInt(yearRange.to)
    if (fromY > toY) return

    const yearsToImport = []
    for (let y = fromY; y <= toY; y++) yearsToImport.push(String(y))

    setImporting(true)
    setImportLog([])
    setImportResult(null)

    let totalSaved = 0
    let totalDupe  = 0

    for (const yr of yearsToImport) {
      setImportLog(prev => [...prev, { year: yr, status: 'fetching' }])
      try {
        const res = await fetch('/api/admin/myquest/import', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mqSubject: mqSlug, exam: examType, year: yr, subjectId, examType, limit: 50 }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Import failed')
        totalSaved += data.saved ?? 0
        totalDupe  += data.duplicate ?? 0
        setImportLog(prev => prev.map(e => e.year === yr
          ? { year: yr, status: 'done', fetched: data.fetched, saved: data.saved, duplicate: data.duplicate, errors: data.errors?.length ?? 0 }
          : e
        ))
      } catch (err) {
        setImportLog(prev => prev.map(e => e.year === yr
          ? { year: yr, status: 'error', error: err.message }
          : e
        ))
      }
      if (yr !== String(toY)) await new Promise(r => setTimeout(r, 700))
    }

    setImportResult({ fetched: yearsToImport.length, new: totalSaved, duplicate: totalDupe, saved: totalSaved, errors: [], isBulk: true })
    setImporting(false)
  }

  // ── Held questions helpers ─────────────────────────────────────────────────
  function deleteHeldGroup(key) {
    try {
      const held    = JSON.parse(localStorage.getItem(HELD_KEY) ?? '[]')
      const updated = held.filter(h => h.key !== key)
      localStorage.setItem(HELD_KEY, JSON.stringify(updated))
      setHeldGroups(updated)
    } catch {}
  }

  function deleteHeldQuestion(groupKey, qIndex) {
    try {
      const held    = JSON.parse(localStorage.getItem(HELD_KEY) ?? '[]')
      const updated = held.map(h => {
        if (h.key !== groupKey) return h
        const qs = [...h.questions]
        qs.splice(qIndex, 1)
        return { ...h, questions: qs }
      }).filter(h => h.questions.length > 0)
      localStorage.setItem(HELD_KEY, JSON.stringify(updated))
      setHeldGroups(updated)
    } catch {}
  }

  function saveHeldEdit(groupKey, qIndex) {
    setHeldEditError(null)
    let parsed
    try { parsed = JSON.parse(heldEditText) } catch (e) {
      setHeldEditError('Invalid JSON: ' + e.message)
      return
    }
    try {
      const held    = JSON.parse(localStorage.getItem(HELD_KEY) ?? '[]')
      const updated = held.map(h => {
        if (h.key !== groupKey) return h
        const qs = [...h.questions]
        qs[qIndex] = { ...qs[qIndex], ...parsed }
        return { ...h, questions: qs }
      })
      localStorage.setItem(HELD_KEY, JSON.stringify(updated))
      setHeldGroups(updated)
      setHeldEditTarget(null)
      setHeldEditText('')
    } catch (e) { setHeldEditError(e.message) }
  }

  function buildHeldPrompt(group) {
    const prompt = buildSdashEnrichPrompt(group.questions, group.exam, group.subject, topics)
    setHeldSendPrompt(prompt)
    setHeldSendGroupKey(group.key)
    setHeldSendStep('prompt')
    setHeldPasteText('')
    setHeldParseError(null)
    setHeldParsedQs([])
    setHeldCopied(false)
  }

  function handleHeldParsePaste(group) {
    setHeldParseError(null)
    const result = parseEnrichment(heldPasteText)
    if (!result.valid) { setHeldParseError(result.errors.join('\n')); return }
    const merged = mergeSdashEnrichment(group.questions, result.enrichments, group.exam, group.subject)
    const withMatches = merged.map(q => ({ ...q, _topicMatch: matchTopicSubtopic(q, topics) }))
    setHeldParsedQs(withMatches)
    setHeldSendStep('review')
  }

  async function handleHeldSave(group) {
    setHeldSaving(true)
    try {
      const matchedSubject = subjects.find(s =>
        s.name.toLowerCase().includes(group.subject?.toLowerCase?.() ?? '') &&
        s.exam_type === group.exam
      ) ?? subjects.find(s => s.exam_type === group.exam)
      const saveSubjectId = matchedSubject?.id ?? subjectId
      if (!saveSubjectId) throw new Error('Cannot find subject ID')

      const batchRes = await fetch('/api/admin/questions/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examType: group.exam, subjectId: saveSubjectId, total: heldParsedQs.length }),
      })
      const batch = await batchRes.json()

      const saveRes = await fetch('/api/admin/questions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: heldParsedQs, examType: group.exam, subjectId: saveSubjectId,
          defaultYear: group.year, batchId: batch.id ?? null, source: 'past_paper',
        }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error ?? 'Save failed')

      deleteHeldGroup(group.key)
      setHeldSendStep(null)
      setHeldSendGroupKey(null)
      setHeldParsedQs([])
      alert(`✅ ${saveData.saved} questions saved from held queue.`)
    } catch (err) {
      setHeldParseError(err.message)
    } finally {
      setHeldSaving(false)
    }
  }

  const totalHeld = heldGroups.reduce((sum, g) => sum + (g.questions?.length ?? 0), 0)

  async function hideQuestion(q, index) {
    setHiddenIndexes(prev => new Set([...prev, index]))
    try {
      await fetch('/api/admin/questions/hidden', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: q.question_text, options: q.options, correct_answer: q.correct_answer,
          explanation: q.explanation, subject_name: selectedSubject?.name, exam_type: examType,
          year: q.year || year, topic_title: q.topic_title ?? '', subtopic_title: q.subtopic_title ?? '',
          hide_reason: 'manual_review', sdash_id: q.sdash_id ?? null,
        }),
      })
    } catch {}
  }

  function unhideQuestion(index) {
    setHiddenIndexes(prev => { const next = new Set(prev); next.delete(index); return next })
  }

  function applyTopicEdit(index) {
    const topicId    = topicEditValue._topicId    ?? null
    const subtopicId = topicEditValue._subtopicId ?? null
    let resolvedTopicId    = topicId
    let resolvedSubtopicId = subtopicId
    if (!resolvedTopicId && topics.length > 0) {
      const matchedTopic = topics.find(t => t.name.toLowerCase() === topicEditValue.topic_title.toLowerCase())
      if (matchedTopic) {
        resolvedTopicId = matchedTopic.id
        if (!resolvedSubtopicId && topicEditValue.subtopic_title) {
          const matchedSub = (matchedTopic.subtopics ?? []).find(s => s.name.toLowerCase() === topicEditValue.subtopic_title.toLowerCase())
          if (matchedSub) resolvedSubtopicId = matchedSub.id
        }
      }
    }
    setParsedQuestions(prev => prev.map((q, i) =>
      i === index ? { ...q, topic_title: topicEditValue.topic_title, subtopic_title: topicEditValue.subtopic_title, topic_id: resolvedTopicId, subtopic_id: resolvedSubtopicId, _topicMatch: null } : q
    ))
    setEditingTopicIdx(null)
  }

  // ── Preview Modal ──────────────────────────────────────────────────────────
  function PreviewModal({ q, onClose }) {
    if (!q) return null
    const opts = q.options ?? {}
    const exp  = q.explanation ?? {}
    const steps = Array.isArray(exp.steps) ? exp.steps
                : Array.isArray(exp.workings) ? exp.workings.map((w, i) => ({ title: `Step ${i+1}`, lines: [typeof w === 'string' ? w : w?.instruction ?? ''] }))
                : []
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-full">Student View</span>
              <span className="text-xs text-gray-400">{examType} · {q.year || year}</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none">×</button>
          </div>
          <div className="p-5 space-y-5">
            {q.passage_text && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wide mb-2">Passage</p>
                <p className="text-sm text-gray-700 leading-relaxed">{q.passage_text}</p>
              </div>
            )}
            <MathText text={q.question_text} as="p" className="text-base font-semibold text-gray-900 leading-relaxed" />
            <div className="space-y-2">
              {Object.entries(opts).map(([k, v]) => {
                const isCorrect = k.toUpperCase() === (q.correct_answer ?? '').toUpperCase()
                return (
                  <div key={k} className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-sm ${isCorrect ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{k.toUpperCase()}</span>
                    <MathText text={String(v)} as="span" className={`leading-snug ${isCorrect ? 'text-green-800 font-medium' : 'text-gray-700'}`} />
                    {isCorrect && <span className="ml-auto text-green-600 font-black flex-shrink-0">✓</span>}
                  </div>
                )
              })}
            </div>
            {(exp.answer_note || exp.correct) && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <MathText text={exp.answer_note ?? exp.correct} as="p" className="text-sm text-green-800 leading-relaxed" />
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 text-xs text-gray-400">
              Topic: <span className="text-gray-600 font-medium">{q.topic_title || '—'}</span>
              {q.subtopic_title && <> → <span className="text-gray-600 font-medium">{q.subtopic_title}</span></>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {previewQuestion && <PreviewModal q={previewQuestion} onClose={() => setPreviewQuestion(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/past-questions" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Past Questions
            </Link>
            <span className="text-gray-300">·</span>
            <Link href="/admin/questions/import" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              SdashAPI Import
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900">Import from MyQuest</h1>
            <span className="text-xs font-bold text-violet-700 bg-violet-100 border border-violet-200 px-2.5 py-1 rounded-full">New Provider</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Fetch past questions from MyQuest API into your question bank.
            Same flow as SdashAPI — same enrichment, same database, same deduplication.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'import', label: '⬆ Import' },
          { id: 'held',   label: totalHeld > 0 ? `🖼️ Held (${totalHeld})` : '🖼️ Held' },
          { id: 'guide',  label: '📖 How it works' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); if (t.id === 'held') loadHeldGroups() }}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === t.id ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── IMPORT TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'import' && (
        <div className="space-y-6">

          {/* Step indicator */}
          <div className="flex items-center gap-0">
            {[
              { n: 1, label: 'Select' },
              { n: 2, label: 'Copy Prompt' },
              { n: 4, label: 'Paste AI' },
              { n: 5, label: 'Done' },
            ].map(({ n, label }, i, arr) => (
              <div key={n} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                    n < enrichStep ? 'bg-green-500 text-white' :
                    n === enrichStep ? 'bg-violet-600 text-white' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {n < enrichStep ? '✓' : n}
                  </div>
                  <span className={`text-[10px] mt-1 hidden sm:block whitespace-nowrap ${n === enrichStep ? 'text-violet-600 font-bold' : 'text-gray-400'}`}>{label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 ${n < enrichStep ? 'bg-green-400' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>

          {/* ── STEP 1: SELECT ───────────────────────────────────────────── */}
          {enrichStep === 1 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
              <p className="text-sm font-black text-gray-700">Step 1 — Select subject, exam and year</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Subject */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Subject</label>
                  <select
                    value={subjectName}
                    onChange={e => { setSubjectName(e.target.value); setPreview([]); setImportResult(null) }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    <option value="">Select subject…</option>
                    {groupedSubjects.map(g => (
                      <option key={g.name} value={g.name}>
                        {g.name}{Object.keys(g.exams).length === 1 ? ` (${Object.keys(g.exams)[0]} only)` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedSubject && (
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      MyQuest →{' '}
                      {mqSlug
                        ? <>subject=<span className="font-mono text-violet-600 font-bold">{mqSlug}</span>{' '}exam=<span className="font-mono text-violet-600 font-bold">{examType}</span></>
                        : <span className="text-red-500 font-bold">⚠ No MyQuest slug for &quot;{baseSubjectName(selectedSubject.name)}&quot;</span>
                      }
                    </p>
                  )}
                </div>

                {/* Exam type */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Exam Type</label>
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                    {(() => {
                      const group = groupedSubjects.find(g => g.name === subjectName)
                      const available = group ? Object.keys(group.exams) : ['WAEC', 'JAMB']
                      return ['WAEC', 'JAMB'].filter(et => available.includes(et)).map(et => (
                        <button key={et}
                          onClick={() => { setExamType(et); setPreview([]); setImportResult(null) }}
                          className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${examType === et ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >{et}</button>
                      ))
                    })()}
                  </div>
                </div>
              </div>

              {/* Year + mode */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  {['single', 'range'].map(m => (
                    <button key={m}
                      onClick={() => setMode(m)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${mode === m ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`}
                    >{m === 'single' ? 'Single year' : 'Year range'}</button>
                  ))}
                </div>

                {mode === 'single' ? (
                  <select
                    value={year}
                    onChange={e => { setYear(e.target.value); setPreview([]); setImportResult(null) }}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                ) : (
                  <YearRangePicker value={yearRange} onChange={setYearRange} />
                )}
              </div>

              {/* Preview strip */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-black text-gray-600 uppercase tracking-wide">Preview (first 5 questions)</span>
                  <button
                    onClick={loadPreview}
                    disabled={!mqSlug || !year || previewLoading}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-40 transition-colors"
                  >
                    {previewLoading ? <><Spinner size="sm" /> Loading…</> : '👁 Preview 5 questions'}
                  </button>
                </div>

                {previewError && (
                  <div className="p-4"><Alert type="warning">{previewError}</Alert></div>
                )}

                {preview.length > 0 && (
                  <div className="p-4 space-y-3">
                    {preview.map((q, i) => <QuestionPreviewCard key={i} q={q} year={year} examType={examType} />)}
                  </div>
                )}

                {!previewLoading && preview.length === 0 && !previewError && (
                  <p className="text-xs text-gray-400 text-center py-5">
                    Click &quot;Preview 5 questions&quot; to check quality before importing
                  </p>
                )}
              </div>

              {previewError && <Alert type="warning">{previewError}</Alert>}

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={fetchAndBuildPrompt}
                  disabled={!canImport || importing}
                  className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white text-sm font-black rounded-xl hover:bg-violet-500 disabled:opacity-40 transition-colors shadow-sm"
                >
                  {importing ? <><Spinner size="sm" /> Fetching…</> : '→ Fetch all & build enrichment prompt'}
                </button>

                {mode === 'range' && (
                  <button
                    onClick={runBulkImport}
                    disabled={!canImport || importing || !yearRange.from || !yearRange.to}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white text-sm font-black rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    {importing ? <><Spinner size="sm" /> Importing…</> : `⚡ Bulk import (no enrichment)`}
                  </button>
                )}
              </div>

              {/* Bulk import log */}
              {importLog.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-black text-gray-600 uppercase tracking-wide">Bulk import progress</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {importLog.map((entry) => (
                      <div key={entry.year} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm font-bold text-gray-700">{entry.year}</span>
                        <div className="flex items-center gap-2">
                          {entry.status === 'fetching' && <><Spinner size="sm" /><span className="text-xs text-gray-500">Fetching…</span></>}
                          {entry.status === 'done' && <><span className="text-xs text-green-600 font-bold">✓ {entry.saved} saved</span>{entry.duplicate > 0 && <span className="text-xs text-amber-600">({entry.duplicate} dupes)</span>}</>}
                          {entry.status === 'error' && <span className="text-xs text-red-600 font-bold">⚠ {entry.error}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult && <ImportResult result={importResult} />}
            </div>
          )}

          {/* ── STEP 2: COPY PROMPT ──────────────────────────────────────── */}
          {enrichStep === 2 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-gray-700">Step 2 — Copy the prompt &amp; send to Claude or ChatGPT</p>
                <button onClick={() => setEnrichStep(1)} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
              </div>

              <Alert type="success">
                ✅ Fetched <strong>{fetchedQuestions.length} questions</strong> ready for enrichment — {selectedSubject?.name} · {examType} · {year}
              </Alert>

              {diagramQuestions.length > 0 && (
                <Alert type="warning">
                  🖼️ <strong>{diagramQuestions.length} questions</strong> reference diagrams and have been held back. They&apos;re saved in your browser — go to the Held tab to revisit them.
                </Alert>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-blue-800 uppercase tracking-wide">How to use this</p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-blue-800">
                  <li>Click <strong>Copy prompt</strong> — the questions are already embedded inside</li>
                  <li>Open <strong>Claude.ai or ChatGPT</strong> in a new tab</li>
                  <li>Paste and send — one message, everything included</li>
                  <li>Come back here and paste the AI&apos;s JSON response in the next step</li>
                </ol>
              </div>

              <div className="border border-violet-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-violet-50 border-b border-violet-200">
                  <div>
                    <span className="text-xs font-black text-violet-700 uppercase tracking-wide">
                      Prompt · {fetchedQuestions.length} questions · {selectedSubject?.name} {examType} {year}
                    </span>
                    <p className="text-[11px] text-violet-500 mt-0.5">Questions are embedded inside — copy and paste the whole thing</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(enrichPrompt)
                      setCopiedPrompt(true)
                      setTimeout(() => setCopiedPrompt(false), 2500)
                    }}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${copiedPrompt ? 'bg-green-100 text-green-700' : 'bg-violet-600 text-white hover:bg-violet-500'}`}
                  >
                    {copiedPrompt ? '✓ Copied!' : '📋 Copy prompt'}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={enrichPrompt}
                  className="w-full text-xs font-mono text-gray-600 bg-white p-4 resize-none focus:outline-none"
                  rows={10}
                />
              </div>

              <button
                onClick={() => setEnrichStep(4)}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white text-sm font-black rounded-xl hover:bg-violet-500 transition-colors shadow-sm"
              >
                → I&apos;ve got the AI response — paste it now
              </button>
            </div>
          )}

          {/* ── STEP 4: PASTE AI RESPONSE ───────────────────────────────── */}
          {enrichStep === 4 && parsedQuestions.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-gray-700">Step 4 — Paste the AI&apos;s JSON response</p>
                <button onClick={() => setEnrichStep(2)} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
              </div>
              <p className="text-sm text-gray-500">
                Paste the JSON array the AI returned. It should start with <code className="bg-gray-100 px-1 rounded text-xs">[</code> and end with <code className="bg-gray-100 px-1 rounded text-xs">]</code>.
              </p>
              <textarea
                ref={pasteRef}
                value={pasteText}
                onChange={e => { setPasteText(e.target.value); setParseError(null) }}
                placeholder={'[\n  {\n    "question_text": "...",\n    ...\n  }\n]'}
                className="w-full h-64 text-xs font-mono text-gray-700 border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-black text-red-600 mb-1">Parse error</p>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap">{parseError}</pre>
                </div>
              )}
              <button
                onClick={handleParsePaste}
                disabled={!pasteText.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white text-sm font-black rounded-xl hover:bg-violet-500 disabled:opacity-40 transition-colors shadow-sm"
              >
                → Parse &amp; review
              </button>
            </div>
          )}

          {/* ── STEP 4 (review): QUESTION REVIEW PANEL ──────────────────── */}
          {enrichStep === 4 && parsedQuestions.length > 0 && (() => {
            const visibleQs       = parsedQuestions.filter((_, i) => !hiddenIndexes.has(i))
            const autoHiddenCount = parsedQuestions.filter((q, i) => hiddenIndexes.has(i) && (questionHasImage(q) || mqQuestionReferencesImage(fetchedQuestions[i] ?? {}))).length
            const mismatchCount   = parsedQuestions.filter(q => q._mismatch).length
            const allMismatch     = mismatchCount > 0 && mismatchCount === parsedQuestions.length

            return (
              <div className="space-y-4">
                {/* Summary header */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-sm font-black text-gray-900">
                        Review {parsedQuestions.length} enriched questions
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {hiddenIndexes.size > 0 && `${hiddenIndexes.size} hidden · `}
                        {visibleQs.length} will be saved
                      </p>
                    </div>
                    <button
                      onClick={() => handleSave(visibleQs)}
                      disabled={saving || visibleQs.length === 0}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-500 disabled:opacity-40 transition-colors shadow-sm"
                    >
                      {saving ? <><Spinner size="sm" /> Saving…</> : `✓ Save all ${visibleQs.length} questions`}
                    </button>
                  </div>
                </div>

                {/* Auto-hidden notice */}
                {autoHiddenCount > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-xl flex-shrink-0">🖼️</span>
                    <div className="flex-1">
                      <p className="text-sm font-black text-amber-800">
                        {autoHiddenCount} question{autoHiddenCount !== 1 ? 's' : ''} auto-hidden — image reference detected
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        These questions reference a diagram, figure, or image that we don't have yet.
                        They've been hidden automatically. You can unhide and review them individually,
                        or leave them hidden — they won't be saved in this batch.
                      </p>
                    </div>
                  </div>
                )}

                {/* Global mismatch warning */}
                {mismatchCount > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <span className="text-xl flex-shrink-0">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-black text-red-700">
                        {mismatchCount} possible explanation mismatch{mismatchCount !== 1 ? 'es' : ''} detected
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {allMismatch
                          ? 'All explanations appear mismatched — the AI likely returned them in the wrong order. Go back and re-send the prompt to Claude.'
                          : 'Questions highlighted in red may have the wrong explanation. The AI may have returned answers out of order. Review each carefully before saving.'}
                      </p>
                      {allMismatch && (
                        <button
                          onClick={() => { setParsedQuestions([]); setEnrichStep(2) }}
                          className="mt-2 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-500 transition-colors"
                        >
                          ← Go back and re-send prompt
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Per-question cards */}
                {parsedQuestions.map((q, index) => {
                  const isHidden  = hiddenIndexes.has(index)
                  const match     = q._topicMatch
                  const hasTopic  = !!(q.topic_title || match?.topic?.name)
                  const isEditing = editingTopicIdx === index
                  const svgCode   = svgDrafts[q._importIdx ?? index] ?? ''
                  const needsSvg  = q.explanation?.illustration_prompt
                  const rawQ      = fetchedQuestions[index] ?? {}
                  const isAutoHid = isHidden && (questionHasImage(q) || mqQuestionReferencesImage(rawQ))

                  return (
                    <div key={index} className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-opacity border-2 ${
                      isHidden
                        ? 'opacity-40 border-gray-200'
                        : q._mismatch
                        ? 'border-red-400'
                        : q._answerDisagreement
                        ? 'border-amber-400'
                        : q._optionCountMismatch
                        ? 'border-orange-400'
                        : 'border-gray-200'
                    }`}>
                      {/* Card header */}
                      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-gray-500">#{index + 1}</span>
                          <Badge color={hasTopic ? 'green' : 'amber'}>
                            {hasTopic ? (q.topic_title || match?.topic?.name) : '⚠ Untagged'}
                          </Badge>
                          {(q.subtopic_title || match?.subtopic?.name) && (
                            <Badge color="gray">{q.subtopic_title || match?.subtopic?.name}</Badge>
                          )}
                          <Badge color="indigo">{q.difficulty ?? 'medium'}</Badge>
                          {needsSvg && (
                            <Badge color="violet">🎨 {svgCode.trim().toLowerCase().startsWith('<svg') ? 'SVG ready' : 'Needs diagram'}</Badge>
                          )}
                          {q._mismatch && !isHidden && <Badge color="red">⚠ Mismatch</Badge>}
                          {q._answerDisagreement && !isHidden && <Badge color="amber">🔍 Answer conflict</Badge>}
                          {q._optionCountMismatch && !isHidden && <Badge color="amber">⚠ Option count</Badge>}
                          {isAutoHid && <Badge color="amber">🖼️ Auto-hidden</Badge>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setPreviewQuestion(q)} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-100 rounded-lg px-2 py-1">👁 Preview</button>
                          {isHidden
                            ? <button onClick={() => unhideQuestion(index)} className="text-xs text-green-600 hover:text-green-700 border border-green-100 rounded-lg px-2 py-1">↩ Unhide</button>
                            : <button onClick={() => hideQuestion(q, index)} className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-lg px-2 py-1">🚫 Hide</button>
                          }
                        </div>
                      </div>

                      {/* Per-question mismatch banner */}
                      {q._mismatch && !isHidden && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-200">
                          <span className="text-base">⚠️</span>
                          <div>
                            <span className="text-xs font-black text-red-700">Explanation mismatch detected</span>
                            <p className="text-xs text-red-600 mt-0.5">The explanation below may belong to a different question. Review carefully or hide this question.</p>
                          </div>
                        </div>
                      )}

                      {/* Option count mismatch banner */}
                      {q._optionCountMismatch && !isHidden && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border-b border-orange-200">
                          <span className="text-base">🔢</span>
                          <div>
                            <span className="text-xs font-black text-orange-700">Option count mismatch</span>
                            <p className="text-xs text-orange-600 mt-0.5">
                              MyQuest returned {Object.keys(rawQ.option ?? {}).length} options but the enrichment has {Object.keys(q.options ?? {}).filter(k => (q.options[k] ?? '').trim()).length}.
                              Verify the options are correct before saving.
                            </p>
                          </div>
                        </div>
                      )}

                      {!isHidden && (
                        <div className="p-5 space-y-4">
                          {/* Question text */}
                          <MathText text={q.question_text} as="p" className="text-sm text-gray-900 font-medium leading-relaxed" />

                          {/* Options */}
                          <div className="grid grid-cols-2 gap-1.5">
                            {Object.entries(q.options ?? {}).map(([k, v]) => {
                              const isCorrect = k.toUpperCase() === (q.correct_answer ?? '').toUpperCase()
                              return (
                                <div key={k} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${isCorrect ? 'border-green-300 bg-green-50 text-green-800 font-medium' : 'border-gray-100 bg-gray-50 text-gray-600'}`}>
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 ${isCorrect ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{k.toUpperCase()}</span>
                                  <MathText text={String(v)} as="span" className="leading-snug" />
                                </div>
                              )
                            })}
                          </div>

                          {/* Answer disagreement panel */}
                          {q._answerDisagreement && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                              <p className="text-xs font-black text-amber-800 mb-2">🔍 Answer disagreement — Claude vs MyQuest</p>
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="bg-white border border-amber-200 rounded-lg p-2">
                                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-wide mb-1">Claude says</p>
                                  <p className="text-sm font-black text-amber-900">{q.correct_answer}</p>
                                </div>
                                <div className="bg-white border border-amber-200 rounded-lg p-2">
                                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-wide mb-1">MyQuest says</p>
                                  <p className="text-sm font-black text-amber-900">{q.sdash_answer}</p>
                                </div>
                              </div>
                              <p className="text-[11px] text-amber-700">Claude's answer is saved by default. Override below if MyQuest is correct.</p>
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                {Object.keys(q.options ?? {}).map(k => (
                                  <button
                                    key={k}
                                    onClick={() => setParsedQuestions(prev => prev.map((pq, pi) => pi === index ? { ...pq, correct_answer: k.toUpperCase() } : pq))}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                      k.toUpperCase() === (q.correct_answer ?? '').toUpperCase()
                                        ? 'bg-green-600 text-white border-green-600'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
                                    }`}
                                  >
                                    {k.toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Explanation preview */}
                          {(q.explanation?.correct || q.explanation?.intro) && (
                            <div className={`rounded-xl p-3 border ${q._mismatch ? 'bg-red-50 border-red-200 text-red-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                              <p className="text-[11px] font-black uppercase tracking-wide mb-1">{q._mismatch ? '⚠️ Explanation (possibly mismatched)' : '💡 Explanation'}</p>
                              <p className="text-xs leading-relaxed line-clamp-3">
                                {q.explanation?.intro ?? q.explanation?.correct}
                              </p>
                            </div>
                          )}

                          {/* SVG Illustration panel */}
                          {needsSvg && (
                            <IllustrationPanel
                              prompt={q.explanation.illustration_prompt}
                              svgCode={svgCode}
                              onChange={code => setSvgDrafts(prev => ({ ...prev, [q._importIdx ?? index]: code }))}
                            />
                          )}

                          {/* Topic edit */}
                          <div className="border-t border-gray-100 pt-3">
                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[11px] font-bold text-gray-500 mb-1 block">Topic</label>
                                    <input
                                      value={topicEditValue.topic_title}
                                      onChange={e => setTopicEditValue(prev => ({ ...prev, topic_title: e.target.value }))}
                                      list={`topics-${index}`}
                                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    />
                                    <datalist id={`topics-${index}`}>
                                      {topics.map(t => <option key={t.id} value={t.name} />)}
                                    </datalist>
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-bold text-gray-500 mb-1 block">Subtopic</label>
                                    <input
                                      value={topicEditValue.subtopic_title}
                                      onChange={e => setTopicEditValue(prev => ({ ...prev, subtopic_title: e.target.value }))}
                                      list={`subtopics-${index}`}
                                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    />
                                    <datalist id={`subtopics-${index}`}>
                                      {(topics.find(t => t.name.toLowerCase() === topicEditValue.topic_title.toLowerCase())?.subtopics ?? [])
                                        .map(s => <option key={s.id} value={s.name} />)}
                                    </datalist>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => applyTopicEdit(index)} className="text-xs font-bold px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-500">✓ Apply</button>
                                  <button onClick={() => setEditingTopicIdx(null)} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-400">
                                  Topic: <span className="text-gray-600 font-medium">{q.topic_title || match?.topic?.name || '—'}</span>
                                  {(q.subtopic_title || match?.subtopic?.name) && <> → <span className="text-gray-600 font-medium">{q.subtopic_title || match?.subtopic?.name}</span></>}
                                </p>
                                <button
                                  onClick={() => {
                                    setEditingTopicIdx(index)
                                    setTopicEditValue({
                                      topic_title:    q.topic_title    || match?.topic?.name    || '',
                                      subtopic_title: q.subtopic_title || match?.subtopic?.name || '',
                                    })
                                  }}
                                  className="text-[11px] text-violet-500 hover:text-violet-700 font-bold"
                                >✏️ Edit topic</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Sticky pre-save bar */}
                {visibleQs.length > 0 && (
                  <div className="sticky bottom-4 z-10 space-y-2">
                    {/* Pre-save flags */}
                    {(() => {
                      const pendingIllustrations = visibleQs.filter(q =>
                        q.explanation?.illustration_prompt &&
                        !(svgDrafts[q._importIdx ?? 0] ?? '').trim().toLowerCase().startsWith('<svg')
                      )
                      const mismatchedVisible    = visibleQs.filter(q => q._mismatch)
                      const disagreementsVisible = visibleQs.filter(q => q._answerDisagreement)
                      const optMismatchVisible   = visibleQs.filter(q => q._optionCountMismatch)
                      if (!pendingIllustrations.length && !mismatchedVisible.length && !disagreementsVisible.length && !optMismatchVisible.length) return null
                      return (
                        <div className="space-y-1.5">
                          {disagreementsVisible.length > 0 && (
                            <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs">
                              <span className="text-base flex-shrink-0">🔍</span>
                              <div>
                                <p className="font-black text-amber-800">{disagreementsVisible.length} unresolved answer disagreement{disagreementsVisible.length !== 1 ? 's' : ''}</p>
                                <p className="text-amber-700 mt-0.5">Scroll up to review each one. Claude's answer is saved by default — override where MyQuest is correct.</p>
                              </div>
                            </div>
                          )}
                          {mismatchedVisible.length > 0 && (
                            <div className="flex items-start gap-2 px-4 py-2.5 bg-red-50 border border-red-300 rounded-xl text-xs">
                              <span className="text-base flex-shrink-0">⚠️</span>
                              <div>
                                <p className="font-black text-red-700">{mismatchedVisible.length} question{mismatchedVisible.length !== 1 ? 's' : ''} have explanation mismatches</p>
                                <p className="text-red-600 mt-0.5">These are highlighted red above. Review them before saving or hide the ones you're not sure about.</p>
                              </div>
                            </div>
                          )}
                          {optMismatchVisible.length > 0 && (
                            <div className="flex items-start gap-2 px-4 py-2.5 bg-orange-50 border border-orange-300 rounded-xl text-xs">
                              <span className="text-base flex-shrink-0">🔢</span>
                              <div>
                                <p className="font-black text-orange-800">{optMismatchVisible.length} question{optMismatchVisible.length !== 1 ? 's' : ''} have option count mismatches</p>
                                <p className="text-orange-700 mt-0.5">MyQuest and the enrichment returned different numbers of options. Check these are correct before saving.</p>
                              </div>
                            </div>
                          )}
                          {pendingIllustrations.length > 0 && (
                            <div className="flex items-start gap-2 px-4 py-2.5 bg-violet-50 border border-violet-300 rounded-xl text-xs">
                              <span className="text-base flex-shrink-0">🎨</span>
                              <div>
                                <p className="font-black text-violet-700">{pendingIllustrations.length} illustration{pendingIllustrations.length !== 1 ? 's' : ''} have no SVG yet</p>
                                <p className="text-violet-600 mt-0.5">
                                  These questions will save with their illustration prompts intact — you can add the SVG later in Past Questions.
                                  Scroll up to add them now if you prefer.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    <button
                      onClick={() => handleSave(visibleQs)}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white text-sm font-black rounded-2xl hover:bg-green-500 disabled:opacity-40 transition-colors shadow-lg"
                    >
                      {saving ? <><Spinner size="sm" /> Saving…</> : `✓ Save all ${visibleQs.length} questions`}
                    </button>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── STEP 5: DONE ─────────────────────────────────────────────── */}
          {enrichStep === 5 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
              <Alert type="success">
                🎉 Import complete! <strong>{importResult?.saved ?? 0} questions</strong> saved to your question bank.
              </Alert>
              {importResult && <ImportResult result={importResult} />}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEnrichStep(1)
                    setFetchedQuestions([])
                    setParsedQuestions([])
                    setPasteText('')
                    setParseError(null)
                    setEnrichPrompt('')
                    setImportResult(null)
                    setHiddenIndexes(new Set())
                    setSvgDrafts({})
                  }}
                  className="px-5 py-2.5 bg-violet-600 text-white text-sm font-black rounded-xl hover:bg-violet-500 transition-colors"
                >
                  ← Import another batch
                </button>
                <Link href="/admin/past-questions" className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                  Go to Past Questions →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HELD TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'held' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-black text-gray-900 mb-1">Held — questions with diagram references</h2>
            <p className="text-xs text-gray-500">These questions were fetched but held back because they reference external diagram images. Add the diagram manually, then send them through enrichment.</p>
          </div>

          {heldGroups.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">No held questions yet.</p>
              <p className="text-xs mt-1">Questions with diagram images will appear here when you import a batch.</p>
            </div>
          )}

          {/* Active enrichment flow for held group */}
          {heldSendStep && (() => {
            const group = heldGroups.find(g => g.key === heldSendGroupKey)
            if (!group) return null
            return (
              <div className="bg-white border border-violet-200 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-violet-900">{group.subject} · {group.exam} · {group.year} — Enrichment</p>
                  <button onClick={() => { setHeldSendStep(null); setHeldSendGroupKey(null) }} className="text-xs text-gray-400 hover:text-gray-600">✕ Cancel</button>
                </div>

                {heldSendStep === 'prompt' && (
                  <>
                    <p className="text-xs text-gray-500">Copy this prompt and paste it into Claude. Include any diagram descriptions you&apos;ve manually added to the questions.</p>
                    <div className="border border-violet-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-violet-50 border-b border-violet-200">
                        <span className="text-xs font-black text-violet-700">Enrichment prompt · {group.questions?.length} questions</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(heldSendPrompt); setHeldCopied(true); setTimeout(() => setHeldCopied(false), 2000) }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${heldCopied ? 'bg-green-100 text-green-700' : 'bg-violet-600 text-white hover:bg-violet-500'}`}
                        >{heldCopied ? '✓ Copied' : '📋 Copy'}</button>
                      </div>
                      <textarea readOnly value={heldSendPrompt} className="w-full text-xs font-mono text-gray-600 bg-white p-4 resize-none" rows={8} />
                    </div>
                    <button onClick={() => setHeldSendStep('paste')} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-black rounded-xl hover:bg-violet-500 transition-colors">
                      → Paste AI response
                    </button>
                  </>
                )}

                {heldSendStep === 'paste' && (
                  <>
                    <textarea
                      value={heldPasteText}
                      onChange={e => { setHeldPasteText(e.target.value); setHeldParseError(null) }}
                      placeholder="Paste the AI JSON array here…"
                      className="w-full h-48 text-xs font-mono border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    {heldParseError && <p className="text-xs text-red-600 font-mono">{heldParseError}</p>}
                    <button onClick={() => handleHeldParsePaste(group)} disabled={!heldPasteText.trim()} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-black rounded-xl hover:bg-violet-500 disabled:opacity-40 transition-colors">
                      → Parse &amp; review
                    </button>
                  </>
                )}

                {heldSendStep === 'review' && heldParsedQs.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">{heldParsedQs.length} questions ready to save.</p>
                    {heldParseError && <p className="text-xs text-red-600">{heldParseError}</p>}
                    <button
                      onClick={() => handleHeldSave(group)}
                      disabled={heldSaving}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white text-sm font-black rounded-2xl hover:bg-green-500 disabled:opacity-40 transition-colors shadow-lg"
                    >
                      {heldSaving ? <><Spinner size="sm" /> Saving…</> : `✓ Save all ${heldParsedQs.length} questions`}
                    </button>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Held group list */}
          {!heldSendStep && heldGroups.map(group => (
            <div key={group.key} className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-200">
                <div>
                  <p className="text-sm font-black text-amber-900">{group.subject} · {group.exam} · {group.year}</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">{group.questions?.length ?? 0} question{group.questions?.length !== 1 ? 's' : ''} · saved {new Date(group.savedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => buildHeldPrompt(group)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-500 transition-colors">
                    → Enrich &amp; Import
                  </button>
                  <button onClick={() => { if (confirm('Delete this entire group?')) deleteHeldGroup(group.key) }} className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-lg px-2 py-1">
                    🗑 Delete
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {(group.questions ?? []).map((q, qi) => {
                  const isEditing = heldEditTarget?.groupKey === group.key && heldEditTarget?.questionIndex === qi
                  return (
                    <div key={qi} className="px-5 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-800 leading-snug flex-1">{q.question}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              if (isEditing) { setHeldEditTarget(null); setHeldEditText(''); setHeldEditError(null) }
                              else { setHeldEditTarget({ groupKey: group.key, questionIndex: qi }); setHeldEditText(JSON.stringify(q, null, 2)); setHeldEditError(null) }
                            }}
                            className="text-xs text-violet-500 hover:text-violet-700 border border-violet-100 rounded-lg px-2 py-1"
                          >{isEditing ? 'Cancel' : '✏️ Edit'}</button>
                          <button onClick={() => { if (confirm('Remove this question?')) deleteHeldQuestion(group.key, qi) }} className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-lg px-2 py-1">✕</button>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="space-y-2 mt-2">
                          <p className="text-[11px] text-gray-500">Edit the JSON. Add an <code className="bg-gray-100 px-1 rounded">image_description</code> field to describe the diagram.</p>
                          <textarea
                            value={heldEditText}
                            onChange={e => setHeldEditText(e.target.value)}
                            className="w-full h-48 text-xs font-mono text-gray-700 border border-violet-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                          />
                          {heldEditError && <p className="text-xs text-red-600 font-mono">{heldEditError}</p>}
                          <button onClick={() => saveHeldEdit(group.key, qi)} className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-500 transition-colors">✓ Save edit</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── HOW IT WORKS TAB ────────────────────────────────────────────── */}
      {activeTab === 'guide' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
          <h2 className="text-base font-black text-gray-900">How the MyQuest import works</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Select subject + exam + year', body: 'Choose the ExamPrep subject. The system maps it to the MyQuest subject slug automatically (e.g. "English Language" → use-of-english). The exam type is sent as "WAEC" or "JAMB" directly — unlike SdashAPI which uses "wassce"/"utme".' },
              { step: '2', title: 'Preview before committing', body: 'Click "Preview 5 questions" to verify what MyQuest returns before running a full fetch.' },
              { step: '3', title: 'Fetch & build enrichment prompt', body: 'Fetches up to 50 questions. Questions with image references are held back. The rest go into the enrichment prompt — the same prompt format used by SdashAPI, since you\'re sending to the same Claude pipeline.' },
              { step: '4', title: 'Copy prompt → Claude → paste response', body: 'Copy the generated prompt and paste it into Claude.ai. Claude returns a JSON array with topic tags, explanations, and difficulty. Paste it back here.' },
              { step: '5', title: 'Review & save', body: 'Review the enriched questions. Edit topic assignments if needed. Save — questions go into the same database as SdashAPI imports, with full deduplication.' },
              { step: '6', title: 'Bulk import (no enrichment)', body: 'Use year-range mode to import multiple years at once without going through enrichment. Questions are saved without AI-generated explanations — useful for quickly filling the question bank.' },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">{step}</div>
                <div>
                  <p className="text-sm font-black text-gray-900">{title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide">MyQuest subject slug reference</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {Object.entries(MYQUEST_SLUG_MAP).filter(([k]) => !k.includes(' ')).map(([name, slug]) => (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600 capitalize">{name}</span>
                  <span className="text-gray-300">→</span>
                  <span className="font-mono text-violet-600">{slug}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-violet-100 rounded-xl p-4 bg-violet-50">
            <p className="text-xs font-black text-violet-800 mb-2">🔑 Environment variable required</p>
            <p className="text-xs text-violet-700">Add <code className="bg-violet-100 px-1 rounded font-mono">MYQUEST_API_KEY</code> to your <code className="bg-violet-100 px-1 rounded font-mono">.env.local</code> file. Get your key from the MyQuest developer portal.</p>
          </div>
        </div>
      )}
    </div>
  )
}