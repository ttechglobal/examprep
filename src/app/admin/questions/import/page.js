'use client'
// src/app/admin/questions/import/page.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// SdashAPI Import Engine — Admin UI
//
// Flow:
//   1. Pick subject + exam type + year
//   2. Fetch questions from SdashAPI (preview 5, then fetch full batch)
//   3. Generate enrichment prompt → copy to Claude/ChatGPT
//   4. Paste AI response back → same Tag Review as existing upload flow
//   5. Save
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { buildSdashEnrichPrompt, parseEnrichment, mergeSdashEnrichment, matchTopicSubtopic } from '@/lib/questionParser'
import { MathText } from '@/lib/mathRenderer'

// ── Sdash slug map: ExamPrep subject name → SdashAPI slug ────────────────────
// Covers every ExamPrep subject name variant. Lookup is case-insensitive.
// SdashAPI slugs: accounting, agriculture, arabic, biology, chemistry, civiledu,
// commerce, computer, crk, currentaffairs, economics, english, englishlit,
// fineart, geography, government, hausa, history, igbo, insurance, irk,
// mathematics, physics, yoruba
const SDASH_SLUG_MAP = {
  // Accounting
  'accounting':                   'accounting',
  // Agriculture (ExamPrep uses "Agricultural Science")
  'agriculture':                  'agriculture',
  'agricultural science':         'agriculture',
  'agric science':                'agriculture',
  'agric':                        'agriculture',
  // Arabic
  'arabic':                       'arabic',
  'arabic studies':               'arabic',
  // Biology
  'biology':                      'biology',
  // Chemistry
  'chemistry':                    'chemistry',
  // Civic Education
  'civic education':              'civiledu',
  'civic':                        'civiledu',
  // Commerce
  'commerce':                     'commerce',
  // Computer
  'computer':                     'computer',
  'computer studies':             'computer',
  'computer science':             'computer',
  // CRK
  'crk':                          'crk',
  'christian religious knowledge':'crk',
  'christian religious studies':  'crk',
  // Current Affairs
  'current affairs':              'currentaffairs',
  // Economics
  'economics':                    'economics',
  // English
  'english':                      'english',
  'english language':             'english',
  // English Literature / Literature in English
  'english literature':           'englishlit',
  'literature':                   'englishlit',
  'literature in english':        'englishlit',
  // Fine Art
  'fine art':                     'fineart',
  'visual art':                   'fineart',
  // Geography
  'geography':                    'geography',
  // Government
  'government':                   'government',
  // Hausa
  'hausa':                        'hausa',
  // History
  'history':                      'history',
  // Igbo
  'igbo':                         'igbo',
  // Insurance
  'insurance':                    'insurance',
  // IRK
  'irk':                          'irk',
  'islamic religious knowledge':  'irk',
  'islamic studies':              'irk',
  // Mathematics (Further Maths maps to mathematics — closest available)
  'mathematics':                  'mathematics',
  'maths':                        'mathematics',
  'further mathematics':          'mathematics',
  'further maths':                'mathematics',
  'add maths':                    'mathematics',
  // Physics
  'physics':                      'physics',
  // Yoruba
  'yoruba':                       'yoruba',
}

// SdashAPI exam type slugs
const SDASH_TYPE_MAP = {
  WAEC: 'wassce',
  JAMB: 'utme',
}

// Subjects with no SdashAPI equivalent (show warning instead of null)
const NO_SDASH_EQUIVALENT = new Set([])

function slugForSubject(name) {
  if (!name) return null
  const key = name.toLowerCase().trim()
  return SDASH_SLUG_MAP[key] ?? null
}

// Extract base subject name (strip " WAEC" / " JAMB" suffix if present)
function baseSubjectName(name) {
  return (name ?? '').replace(/\s*(WAEC|JAMB|NECO|IGCSE)\s*$/i, '').trim()
}

// ── Small UI components ───────────────────────────────────────────────────────

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

// ── Question preview card ─────────────────────────────────────────────────────
function QuestionPreviewCard({ q }) {
  const options = q.option ?? {}
  return (
    <div className="border border-gray-100 rounded-xl bg-gray-50 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge color="indigo">{q.examtype ?? '?'}</Badge>
        <Badge color="gray">{q.examyear ?? '?'}</Badge>
        {q.image && <Badge color="blue">🖼 Has image</Badge>}
        {q.section && <Badge color="amber">📄 Passage</Badge>}
        <span className="text-[11px] text-gray-400 ml-auto">ID #{q.id}</span>
      </div>

      {q.section && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-wide mb-1">Passage</p>
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{q.section}</p>
        </div>
      )}

      <p className="text-sm text-gray-900 font-medium leading-relaxed">{q.question}</p>

      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(options).map(([key, val]) => (
          <div
            key={key}
            className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${
              key === q.answer
                ? 'border-green-300 bg-green-50 text-green-800 font-medium'
                : 'border-gray-100 bg-white text-gray-600'
            }`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 ${
              key === q.answer ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>{key.toUpperCase()}</span>
            <span className="leading-snug">{val}</span>
          </div>
        ))}
      </div>

      {q.solution && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
          <p className="text-[11px] font-black text-indigo-600 uppercase tracking-wide mb-1">Solution</p>
          <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">{q.solution}</p>
        </div>
      )}
    </div>
  )
}

// ── Import result panel ───────────────────────────────────────────────────────
function ImportResult({ result }) {
  if (!result) return null

  // noData: SdashAPI 404 — no questions for this combo
  if (result.noData) {
    return (
      <Alert type="warning">
        ⚠️ {result.message ?? 'SdashAPI has no questions for this subject/type/year combination.'}{' '}
        Try a different year — WAEC (wassce) typically has best coverage from 2010 to 2023.
      </Alert>
    )
  }

  const { fetched, new: isNew, duplicate, saved, errors } = result

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Fetched from SdashAPI', value: fetched, color: 'text-gray-900' },
          { label: 'New (not in DB)',        value: isNew,   color: 'text-indigo-700' },
          { label: 'Duplicates skipped',     value: duplicate, color: 'text-amber-700' },
          { label: 'Saved to database',      value: saved,   color: 'text-green-700' },
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
          They are now in your question bank — go to{' '}
          <Link href="/admin/past-questions" className="underline font-bold">Past Questions</Link>{' '}
          to tag them to topics.
        </Alert>
      )}

      {duplicate > 0 && (
        <Alert type="info">
          ℹ️ {duplicate} duplicate{duplicate !== 1 ? 's' : ''} were detected and skipped —
          these questions already exist in your database for this subject and exam type.
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
                {e.sdash_id ? `[ID ${e.sdash_id}] ` : ''}{e.reason}
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
  for (let y = currentYear; y >= 2001; y--) years.push(y)

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

// ── Stable year constant — computed once at module level to avoid SSR/client mismatch ──
const CURRENT_YEAR = new Date().getFullYear()
const DEFAULT_YEAR = String(CURRENT_YEAR - 1)

// ── Illustration SVG Panel ────────────────────────────────────────────────────
// Shown on any question card whose explanation has an illustration_prompt.
// Admin copies the prompt, generates SVG externally, pastes it back here,
// sees a live preview, then the SVG is saved into explanation.svg_diagram.
function IllustrationPanel({ questionIdx, prompt, svgCode, onChange }) {
  const [copied, setCopied] = useState(false)
  const [tab, setTab]       = useState('prompt') // 'prompt' | 'paste' | 'preview'

  const hasValidSvg = svgCode && svgCode.trim().toLowerCase().startsWith('<svg')

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-violet-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-100 border-b border-violet-200">
        <span className="text-base">🎨</span>
        <span className="text-xs font-black text-violet-800 uppercase tracking-wide flex-1">
          Illustration needed
        </span>
        {hasValidSvg && (
          <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">
            ✓ SVG ready
          </span>
        )}
      </div>

      {/* Tab bar */}
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
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-3 bg-white border-t border-violet-100 space-y-3">

        {/* Step 1: show the illustration_prompt */}
        {tab === 'prompt' && (
          <>
            <p className="text-[11px] text-violet-700 leading-relaxed">
              Copy this prompt → open an SVG generator or Claude → paste and generate → come back to paste the SVG code in the next tab.
            </p>
            <div className="border border-violet-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-violet-50 border-b border-violet-100">
                <span className="text-[10px] font-black text-violet-600 uppercase tracking-wide">Illustration Prompt</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                    copied ? 'bg-green-100 text-green-700' : 'bg-violet-600 text-white hover:bg-violet-500'
                  }`}
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <p className="text-[11px] text-gray-700 px-3 py-2.5 leading-relaxed font-mono bg-white">
                {prompt}
              </p>
            </div>
            <button
              onClick={() => setTab('paste')}
              className="w-full py-2 bg-violet-600 text-white text-[11px] font-bold rounded-lg hover:bg-violet-500 transition-colors"
            >
              → I have the SVG — paste it now
            </button>
          </>
        )}

        {/* Step 2: paste SVG code */}
        {tab === 'paste' && (
          <>
            <p className="text-[11px] text-violet-700 leading-relaxed">
              Paste the raw SVG code below. It must start with <code className="bg-gray-100 px-1 rounded">&lt;svg</code>.
            </p>
            <textarea
              value={svgCode}
              onChange={e => onChange(e.target.value)}
              placeholder={'<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">\n  ...\n</svg>'}
              className="w-full h-36 text-[11px] font-mono text-gray-700 border border-violet-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
              spellCheck={false}
            />
            {svgCode && !hasValidSvg && (
              <p className="text-[11px] text-red-600 font-medium">⚠ Doesn&apos;t look like SVG — make sure it starts with &lt;svg</p>
            )}
            {hasValidSvg && (
              <button
                onClick={() => setTab('preview')}
                className="w-full py-2 bg-green-600 text-white text-[11px] font-bold rounded-lg hover:bg-green-500 transition-colors"
              >
                → Preview SVG
              </button>
            )}
          </>
        )}

        {/* Step 3: live SVG preview */}
        {tab === 'preview' && hasValidSvg && (
          <>
            <div className="rounded-lg border border-violet-200 bg-white overflow-hidden">
              <div className="px-3 py-1.5 bg-violet-50 border-b border-violet-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-violet-600 uppercase tracking-wide">Preview</span>
                <button
                  onClick={() => setTab('paste')}
                  className="text-[10px] text-violet-500 hover:text-violet-700 font-bold"
                >
                  ✏️ Edit SVG
                </button>
              </div>
              <div
                className="flex justify-center p-4 overflow-x-auto"
                dangerouslySetInnerHTML={{
                  __html: svgCode
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/\son\w+="[^"]*"/gi, '')
                }}
              />
            </div>
            <p className="text-[10px] text-green-700 font-bold text-center">
              ✓ This SVG will be saved with the question and shown to students in the explanation.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SdashImportPage() {
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
  // Gate env-dependent UI behind mount so SSR and client render the same HTML
  const [mounted,        setMounted]        = useState(false)

  // ── Enrichment flow state ─────────────────────────────────────────────────
  const [fetchedQuestions,  setFetchedQuestions]  = useState([])  // raw SdashAPI batch
  const [topics,            setTopics]            = useState([])   // curriculum tree for subject
  const [enrichStep,        setEnrichStep]        = useState(1)    // 1=fetch 2=prompt 3=paste 4=review 5=done
  const [enrichPrompt,      setEnrichPrompt]       = useState('')
  const [pasteText,         setPasteText]          = useState('')
  const [parsedQuestions,   setParsedQuestions]    = useState([])  // after AI paste-back
  const [parseError,        setParseError]         = useState(null)
  const [diagramQuestions,  setDiagramQuestions]   = useState([])  // held back — need diagram images
  const [copiedPrompt,      setCopiedPrompt]       = useState(false)
  const [saving,            setSaving]             = useState(false)
  const pasteRef = useRef(null)

  // ── Per-question UI state (review step) ───────────────────────────────────
  const [hiddenIndexes,     setHiddenIndexes]      = useState(new Set())  // questions user hid in this session
  const [previewQuestion,   setPreviewQuestion]    = useState(null)       // question to show in modal
  const [editingTopicIdx,   setEditingTopicIdx]    = useState(null)       // question index being topic-edited
  const [svgDrafts,         setSvgDrafts]          = useState({})         // { [questionIndex]: svgCode } — illustration SVGs pasted by admin
  const [svgExpandedIdx,    setSvgExpandedIdx]     = useState(null)       // which question's SVG editor is open
  const [topicEditValue,    setTopicEditValue]     = useState({ topic_title: '', subtopic_title: '' })

  // ── Held (diagram) questions management ───────────────────────────────────
  const [heldGroups,        setHeldGroups]         = useState([])   // all groups from localStorage
  const [heldEditTarget,    setHeldEditTarget]      = useState(null) // { groupKey, questionIndex }
  const [heldEditText,      setHeldEditText]        = useState('')   // JSON edit textarea
  const [heldEditError,     setHeldEditError]       = useState(null)
  const [heldSendPrompt,    setHeldSendPrompt]      = useState('')   // enrichment prompt for held group
  const [heldPasteText,     setHeldPasteText]       = useState('')
  const [heldParseError,    setHeldParseError]      = useState(null)
  const [heldSendGroupKey,  setHeldSendGroupKey]    = useState(null) // which group we're re-sending
  const [heldSendStep,      setHeldSendStep]        = useState(null) // 'prompt'|'paste'|'review'
  const [heldParsedQs,      setHeldParsedQs]        = useState([])
  const [heldSaving,        setHeldSaving]          = useState(false)
  const [heldCopied,        setHeldCopied]          = useState(false)

  // Mark as mounted (client-only) so env-dependent content renders correctly
  useEffect(() => { setMounted(true) }, [])

  // Load held (diagram) questions from localStorage
  function loadHeldGroups() {
    try {
      const held = JSON.parse(localStorage.getItem('ep_diagram_held') ?? '[]')
      setHeldGroups(Array.isArray(held) ? held : [])
    } catch { setHeldGroups([]) }
  }

  useEffect(() => { if (mounted) loadHeldGroups() }, [mounted])

  const years = []
  for (let y = CURRENT_YEAR; y >= 2001; y--) years.push(y)

  // ── Group subjects by name (Mathematics, not "Mathematics WAEC" + "Mathematics JAMB")
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
        const list = (Array.isArray(d) ? d : (d.subjects ?? []))
        setSubjects(list)
        if (list[0]) {
          setSubjectName(list[0].name)
          setSubjectId(list[0].id)
          if (list[0].exam_type === 'JAMB') setExamType('JAMB')
        }
      })
      .catch(() => {})
  }, [])

  // Auto-sync examType from selected subject's available exams
  useEffect(() => {
    const group = groupedSubjects.find(g => g.name === subjectName)
    if (!group) return
    // If current examType doesn't exist for this subject, switch to what's available
    if (!group.exams[examType]) {
      const available = Object.keys(group.exams)[0]
      if (available) setExamType(available)
    }
  }, [subjectName, groupedSubjects]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load curriculum tree for selected subject (used in enrichment prompt)
  useEffect(() => {
    if (!subjectId) return
    fetch(`/api/admin/curriculum?subjectId=${subjectId}`)
      .then(r => r.json())
      .then(d => setTopics(Array.isArray(d) ? d : []))
      .catch(() => setTopics([]))
  }, [subjectId])

  // useMemo so Turbopack treats these as stable reactive values in useCallback deps
  const selectedSubject = useMemo(
    () => subjects.find(s => s.id === subjectId),
    [subjects, subjectId]
  )
  const sdashSlug = useMemo(() => {
    if (!selectedSubject) return null
    return slugForSubject(baseSubjectName(selectedSubject.name))
  }, [selectedSubject])
  const sdashType = useMemo(() => SDASH_TYPE_MAP[examType] ?? 'wassce', [examType])

  const canImport = subjectId && sdashSlug && year

  // ── Fetch full batch + build enrichment prompt ─────────────────────────────
  async function fetchAndBuildPrompt() {
    if (!canImport) return
    setImporting(true)
    setPreviewError(null)
    try {
      // Fetch up to 50 questions from SdashAPI
      const params = new URLSearchParams({
        mode: 'questions',
        subject: sdashSlug,
        type: sdashType,
        year,
        limit: '50',
      })
      // Use the preview route but without the 5-question limit
      const res = await fetch(`/api/admin/sdash/fetchbatch?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Fetch failed')
      if (data.noData) {
        setPreviewError(
          `SdashAPI has no ${examType} questions for "${sdashSlug}" in ${year}. ` +
          `Try a different year.`
        )
        return
      }

      const qs = data.questions ?? []
      if (!qs.length) {
        setPreviewError('No questions returned. Try a different year.')
        return
      }

      // ── Separate diagram questions from processable ones ──────────────────
      // Questions with q.image truthy reference a diagram we don't have.
      // They should NOT enter the question bank — hold them back and
      // save them to localStorage so they can be revisited later.
      const diagramQs   = qs.filter(q => q.image)
      const cleanQs     = qs.filter(q => !q.image)

      if (diagramQs.length) {
        try {
          const key  = `ep_diagram_hold_${sdashSlug}_${sdashType}_${year}`
          const held = JSON.parse(localStorage.getItem('ep_diagram_held') ?? '[]')
          const newEntry = { key, subject: selectedSubject?.name, exam: examType, year, questions: diagramQs, savedAt: new Date().toISOString() }
          const updated  = [...held.filter(h => h.key !== key), newEntry]
          localStorage.setItem('ep_diagram_held', JSON.stringify(updated))
        } catch {}
      }

      setFetchedQuestions(cleanQs)
      setDiagramQuestions(diagramQs)

      if (!cleanQs.length) {
        setPreviewError(`All ${qs.length} questions reference diagrams we don't have yet. They've been saved for later — try a different year.`)
        return
      }

      // Build the enrichment prompt with the full curriculum tree
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
  // AI returns a lean enrichment-only array (index + explanation + topic tags).
  // We merge it back onto fetchedQuestions to get the full question objects.
  function handleParsePaste() {
    setParseError(null)
    const result = parseEnrichment(pasteText)
    if (!result.valid) {
      setParseError(result.errors.join('\n'))
      return
    }
    const merged = mergeSdashEnrichment(
      fetchedQuestions,
      result.enrichments,
      examType,
      selectedSubject?.name ?? 'Unknown Subject'
    )
    // Auto-match topics against loaded curriculum.
    // _importIdx is a stable identity for each question across filtering —
    // used to key svgDrafts so SVG edits survive the "hide question" action.
    const withMatches = merged.map((q, idx) => {
      const match = matchTopicSubtopic(q, topics)
      return { ...q, _topicMatch: match, _importIdx: idx }
    })
    setParsedQuestions(withMatches)
    setSvgDrafts({})   // reset SVG drafts for new batch
    setEnrichStep(4)  // step 4 = Review panel; step 5 = Done (set after save)
  }

  // ── Save the reviewed questions ────────────────────────────────────────────
  async function handleSave(questionsToSave) {
    setSaving(true)
    try {
      // Resolve topic_id and subtopic_id from _topicMatch before saving.
      // The API stores topic_id (UUID) not topic_title (string) — this was
      // the bug causing all questions to save as untagged.
      const questionsWithIds = questionsToSave.map(q => {
        const match = q._topicMatch
        // Priority: explicit topic_id (from manual/suggestion edit) > AI match > null
        const topicId    = q.topic_id    ?? match?.topic?.id    ?? null
        const subtopicId = q.subtopic_id ?? match?.subtopic?.id ?? null

        // Merge any SVG the admin pasted for this question into explanation.svg_diagram.
        // svgDrafts is keyed by the question's _importIdx (set during parse), which
        // survives filtering (hidden questions removed) without index drift.
        const svgCode = q._importIdx != null ? (svgDrafts[q._importIdx] ?? '') : ''
        const explanation = svgCode.trim()
          ? { ...(q.explanation ?? {}), svg_diagram: svgCode.trim() }
          : q.explanation

        return {
          ...q,
          explanation,
          topic_id:      topicId,
          subtopic_id:   subtopicId,
          topic_title:    q.topic_title    || match?.topic?.name    || '',
          subtopic_title: q.subtopic_title || match?.subtopic?.name || '',
        }
      })

      // Create batch record
      const batchRes = await fetch('/api/admin/questions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType,
          subjectId,
          total: questionsToSave.length,
        }),
      })
      const batch = await batchRes.json()
      const batchId = batch.id ?? null

      // Save questions through existing route
      const saveRes = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questionsWithIds,
          examType,
          subjectId,
          defaultYear: year,
          batchId,
          source: 'past_paper',
        }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error ?? 'Save failed')

      setEnrichStep(5)
      setImportResult({
        saved: saveData.saved,
        errors: saveData.errors ?? [],
      })
    } catch (err) {
      setParseError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  const loadPreview = useCallback(async () => {
    if (!sdashSlug || !year) return
    setPreviewLoading(true)
    setPreviewError(null)
    setPreview([])
    try {
      const params = new URLSearchParams({
        mode:    'questions',
        subject: sdashSlug,
        type:    sdashType,
        year,
      })
      const res  = await fetch(`/api/admin/sdash/preview?${params}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Preview failed')
      }
      if (data.noData) {
        setPreviewError(
          `SdashAPI has no ${examType} questions for "${sdashSlug}" in ${year}. ` +
          `Try a different year — wassce (WAEC) typically has best coverage 2010–2023, ` +
          `utme (JAMB) goes back to 2001.`
        )
      } else if (!data.questions?.length) {
        setPreviewError(`No questions returned. Try a different year.`)
      } else {
        setPreview(data.questions)
      }
    } catch (err) {
      setPreviewError(err.message)
    } finally {
      setPreviewLoading(false)
    }
  }, [sdashSlug, sdashType, year])

  // ── Single year import ─────────────────────────────────────────────────────
  async function runImport() {
    if (!canImport) return
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/admin/sdash/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdashSubject: sdashSlug,
          sdashType,
          year,
          subjectId,
          examType,
          limit: 50,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Import failed')
      }
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
        const res = await fetch('/api/admin/sdash/import', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sdashSubject: sdashSlug,
            sdashType,
            year:      yr,
            subjectId,
            examType,
            limit: 50,
          }),
        })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error ?? 'Import failed')

        totalSaved += data.saved ?? 0
        totalDupe  += data.duplicate ?? 0

        setImportLog(prev =>
          prev.map(entry =>
            entry.year === yr
              ? { year: yr, status: 'done', fetched: data.fetched, saved: data.saved, duplicate: data.duplicate, errors: data.errors?.length ?? 0 }
              : entry
          )
        )
      } catch (err) {
        setImportLog(prev =>
          prev.map(entry =>
            entry.year === yr
              ? { year: yr, status: 'error', error: err.message }
              : entry
          )
        )
      }

      // Small delay between requests to be polite to the API
      if (yr !== String(toY)) {
        await new Promise(r => setTimeout(r, 600))
      }
    }

    setImportResult({
      fetched:   yearsToImport.length,
      new:       totalSaved,
      duplicate: totalDupe,
      saved:     totalSaved,
      errors:    [],
      isBulk:    true,
    })
    setImporting(false)
  }

  // ── Held questions helpers ─────────────────────────────────────────────────

  function deleteHeldGroup(key) {
    try {
      const held = JSON.parse(localStorage.getItem('ep_diagram_held') ?? '[]')
      const updated = held.filter(h => h.key !== key)
      localStorage.setItem('ep_diagram_held', JSON.stringify(updated))
      setHeldGroups(updated)
    } catch {}
  }

  function deleteHeldQuestion(groupKey, qIndex) {
    try {
      const held = JSON.parse(localStorage.getItem('ep_diagram_held') ?? '[]')
      const updated = held.map(h => {
        if (h.key !== groupKey) return h
        const qs = [...h.questions]
        qs.splice(qIndex, 1)
        return { ...h, questions: qs }
      }).filter(h => h.questions.length > 0)
      localStorage.setItem('ep_diagram_held', JSON.stringify(updated))
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
      const held = JSON.parse(localStorage.getItem('ep_diagram_held') ?? '[]')
      const updated = held.map(h => {
        if (h.key !== groupKey) return h
        const qs = [...h.questions]
        qs[qIndex] = { ...qs[qIndex], ...parsed }
        return { ...h, questions: qs }
      })
      localStorage.setItem('ep_diagram_held', JSON.stringify(updated))
      setHeldGroups(updated)
      setHeldEditTarget(null)
      setHeldEditText('')
    } catch (e) { setHeldEditError(e.message) }
  }

  function buildHeldPrompt(group) {
    // Build the same enrichment prompt for these formerly-held questions
    const prompt = buildSdashEnrichPrompt(
      group.questions,
      group.exam,
      group.subject,
      topics
    )
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
    const merged = mergeSdashEnrichment(
      group.questions,
      result.enrichments,
      group.exam,
      group.subject
    )
    const withMatches = merged.map(q => {
      const match = matchTopicSubtopic(q, topics)
      return { ...q, _topicMatch: match }
    })
    setHeldParsedQs(withMatches)
    setHeldSendStep('review')
  }

  async function handleHeldSave(group) {
    setHeldSaving(true)
    try {
      // find the right subjectId — look it up from loaded subjects by name
      const matchedSubject = subjects.find(s =>
        s.name.toLowerCase().includes(group.subject?.toLowerCase?.() ?? '') &&
        s.exam_type === group.exam
      ) ?? subjects.find(s => s.exam_type === group.exam)

      const saveSubjectId = matchedSubject?.id ?? subjectId
      if (!saveSubjectId) throw new Error('Cannot find subject ID — please re-select the subject on the Import tab first')

      const batchRes = await fetch('/api/admin/questions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examType: group.exam, subjectId: saveSubjectId, total: heldParsedQs.length }),
      })
      const batch = await batchRes.json()

      const saveRes = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: heldParsedQs,
          examType: group.exam,
          subjectId: saveSubjectId,
          defaultYear: group.year,
          batchId: batch.id ?? null,
          source: 'past_paper',
        }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error ?? 'Save failed')

      // Remove this group from held
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

  // ── Hide a question (saves to DB, removes from save batch) ───────────────
  async function hideQuestion(q, index) {
    // Optimistically mark as hidden in the UI immediately
    setHiddenIndexes(prev => new Set([...prev, index]))
    try {
      await fetch('/api/admin/questions/hidden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text:  q.question_text,
          options:        q.options,
          correct_answer: q.correct_answer,
          explanation:    q.explanation,
          subject_name:   q.subject ?? selectedSubject?.name,
          exam_type:      q.exam ?? examType,
          year:           q.year || year,
          topic_title:    q.topic_title ?? '',
          subtopic_title: q.subtopic_title ?? '',
          hide_reason:    'manual_review',
          sdash_id:       q.sdash_id ?? null,
        }),
      })
    } catch {
      // Non-fatal: hide is still reflected in UI, can re-save later from Hidden tab
    }
  }

  function unhideQuestion(index) {
    setHiddenIndexes(prev => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
  }

  // Update topic/subtopic on a question in parsedQuestions
  // Preserves IDs from AI suggestions (_topicId / _subtopicId) or falls back to
  // re-matching by name so the question saves with the correct topic_id UUID.
  function applyTopicEdit(index) {
    const topicId    = topicEditValue._topicId    ?? null
    const subtopicId = topicEditValue._subtopicId ?? null

    // If IDs not provided (manual text edit), try to find matching topic by name
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
      i === index ? {
        ...q,
        topic_title:    topicEditValue.topic_title,
        subtopic_title: topicEditValue.subtopic_title,
        topic_id:       resolvedTopicId,
        subtopic_id:    resolvedSubtopicId,
        _topicMatch:    null,   // cleared so handleSave uses the explicit ids above
      } : q
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
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">Student View</span>
              <span className="text-xs text-gray-400">{q.exam ?? examType} · {q.year || year}</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none">×</button>
          </div>

          <div className="p-5 space-y-5">
            {/* Passage (if any) */}
            {q.passage_text && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wide mb-2">Passage / Context</p>
                <p className="text-sm text-gray-700 leading-relaxed">{q.passage_text}</p>
              </div>
            )}

            {/* Question */}
            <MathText text={q.question_text} as="p" className="text-base font-semibold text-gray-900 leading-relaxed" />

            {/* Options */}
            <div className="space-y-2">
              {Object.entries(opts).map(([k, v]) => {
                const isCorrect = k.toUpperCase() === (q.correct_answer ?? '').toUpperCase()
                return (
                  <div key={k} className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-sm transition-colors ${
                    isCorrect ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'
                  }`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${
                      isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>{k.toUpperCase()}</span>
                    <MathText text={String(v)} as="span" className={`leading-snug ${isCorrect ? 'text-green-800 font-medium' : 'text-gray-700'}`} />
                    {isCorrect && <span className="ml-auto text-green-600 font-black flex-shrink-0">✓</span>}
                  </div>
                )
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-gray-200 pt-4">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-wide mb-3">Explanation (as student sees it)</p>

              {/* Concept chip */}
              {exp.concept && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold mb-3">
                  💡 {exp.concept}
                </div>
              )}

              {/* Intro */}
              {exp.intro && <MathText text={exp.intro} as="p" className="text-sm text-gray-700 mb-3" />}

              {/* Steps */}
              {steps.length > 0 && (
                <div className="space-y-3 mb-3">
                  {steps.map((step, si) => {
                    const lines = Array.isArray(step.lines) ? step.lines : (step.instruction ? [step.instruction] : [String(step)])
                    return (
                      <div key={si} className="rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b border-gray-200">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">{si+1}</span>
                          <span className="text-xs font-black text-gray-700">{step.title ?? `Step ${si+1}`}</span>
                        </div>
                        <div className="px-4 py-2 space-y-1">
                          {lines.map((line, li) => (
                            <MathText key={li} text={line} as="p" className="text-sm font-mono text-gray-800 leading-relaxed" />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Answer note */}
              {(exp.answer_note || exp.correct) && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <MathText text={exp.answer_note ?? exp.correct} as="p" className="text-sm text-green-800 leading-relaxed" />
                </div>
              )}

              {/* Study tip */}
              {exp.study_tip && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide mb-1">💡 Study tip</p>
                  <MathText text={exp.study_tip} as="p" className="text-sm text-amber-800" />
                </div>
              )}

              {/* SVG diagram — if the admin has already pasted one for this question */}
              {(() => {
                const idx = q._importIdx
                const svg = idx != null ? (svgDrafts[idx] ?? '') : ''
                const validSvg = svg.trim().toLowerCase().startsWith('<svg') ? svg : null
                if (!validSvg) return null
                return (
                  <div className="mt-3 rounded-xl border border-violet-200 overflow-hidden">
                    <div className="px-3 py-1.5 bg-violet-50 border-b border-violet-100">
                      <span className="text-[10px] font-black text-violet-600 uppercase tracking-wide">Diagram</span>
                    </div>
                    <div
                      className="flex justify-center p-4 bg-white overflow-x-auto"
                      dangerouslySetInnerHTML={{
                        __html: validSvg
                          .replace(/<script[\s\S]*?<\/script>/gi, '')
                          .replace(/\son\w+="[^"]*"/gi, '')
                      }}
                    />
                  </div>
                )
              })()}
            </div>

            {/* Topic tag */}
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
      {/* Preview Modal */}
      {previewQuestion && <PreviewModal q={previewQuestion} onClose={() => setPreviewQuestion(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/past-questions" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Past Questions
            </Link>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Import from SdashAPI</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fetch past questions directly from SdashAPI into your question bank.
            Questions are deduped automatically. Tag them to topics after import.
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
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── IMPORT TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'import' && (
        <div className="space-y-6">

          {/* ── STEP INDICATOR ─────────────────────────────────────────── */}
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
                    n === enrichStep ? 'bg-indigo-600 text-white' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {n < enrichStep ? '✓' : n}
                  </div>
                  <span className={`text-[10px] mt-1 hidden sm:block whitespace-nowrap ${
                    n === enrichStep ? 'text-indigo-600 font-bold' : 'text-gray-400'
                  }`}>{label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 ${n < enrichStep ? 'bg-green-400' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>

          {/* ── STEP 1: SELECT ─────────────────────────────────────────── */}
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
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                      SdashAPI →{' '}
                      {sdashSlug
                        ? <>subject=<span className="font-mono text-indigo-600 font-bold">{sdashSlug}</span>{' '}type=<span className="font-mono text-indigo-600 font-bold">{sdashType}</span></>
                        : <span className="text-red-500 font-bold">⚠ No SdashAPI slug for &quot;{baseSubjectName(selectedSubject.name)}&quot;</span>
                      }
                    </p>
                  )}
                </div>

                {/* Exam type — filtered to what this subject actually has */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Exam Type</label>
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                    {(() => {
                      const group = groupedSubjects.find(g => g.name === subjectName)
                      const available = group ? Object.keys(group.exams) : ['WAEC', 'JAMB']
                      return ['WAEC', 'JAMB', 'IGCSE'].filter(et => available.includes(et)).map(et => (
                        <button key={et}
                          onClick={() => { setExamType(et); setPreview([]); setImportResult(null) }}
                          className={`flex-1 px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                            examType === et ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >{et}</button>
                      ))
                    })()}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Only shows exam types this subject has</p>
                </div>
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Year</label>
                <select value={year} onChange={e => setYear(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {Array.from({ length: new Date().getFullYear() - 2000 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  WAEC (wassce) best coverage: 2010–2023 · JAMB (utme): 2001–2025
                </p>
              </div>

              {previewError && <Alert type="error">{previewError}</Alert>}

              {/* ── Preview (5 questions) before committing ─────────────── */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wide">
                    Preview — see 5 questions before fetching all
                  </p>
                  <button
                    onClick={loadPreview}
                    disabled={!sdashSlug || !year || previewLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    {previewLoading ? <><Spinner size="sm" /> Loading…</> : '👁 Preview 5 questions'}
                  </button>
                </div>

                {preview.length > 0 && (
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {preview.map((q, i) => (
                      <div key={i} className="px-4 py-3 space-y-1.5">
                        <p className="text-xs text-gray-800 font-medium leading-snug">{q.question}</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(q.option ?? {}).map(([k, v]) => (
                            <span key={k} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              k === q.answer ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {k.toUpperCase()}: {String(v).slice(0, 30)}{String(v).length > 30 ? '…' : ''}
                            </span>
                          ))}
                        </div>
                        {q.solution && (
                          <p className="text-[11px] text-indigo-600 italic line-clamp-1">💡 {q.solution}</p>
                        )}
                        {!q.solution && (
                          <p className="text-[11px] text-amber-500">⚠ No solution provided</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!previewLoading && preview.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-5">
                    Click &quot;Preview 5 questions&quot; to check quality before importing
                  </p>
                )}
              </div>

              <button
                onClick={fetchAndBuildPrompt}
                disabled={!canImport || importing}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-sm"
              >
                {importing ? <><Spinner size="sm" /> Fetching…</> : '→ Fetch all & build prompt'}
              </button>
            </div>
          )}

          {/* ── STEP 2: COPY PROMPT (questions embedded inside) ──────── */}
          {enrichStep === 2 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-gray-700">Step 2 — Copy the prompt &amp; send to Claude or ChatGPT</p>
                <button onClick={() => setEnrichStep(1)} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
              </div>

              <Alert type="success">
                ✅ Fetched <strong>{fetchedQuestions.length} questions</strong> ready for enrichment for {selectedSubject?.name} · {examType} · {year}
              </Alert>

              {/* Diagram hold-back notice */}
              {diagramQuestions.length > 0 && (
                <div className="border border-amber-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
                    <span className="text-base">🖼️</span>
                    <div className="flex-1">
                      <span className="text-xs font-black text-amber-800">
                        {diagramQuestions.length} question{diagramQuestions.length !== 1 ? 's' : ''} held back — need diagrams
                      </span>
                      <p className="text-[11px] text-amber-700 mt-0.5">These reference diagrams we don&apos;t have yet. They&apos;re saved in your browser — not sent to the AI, not saved to the database.</p>
                    </div>
                  </div>
                  <div className="divide-y divide-amber-50 max-h-40 overflow-y-auto bg-white">
                    {diagramQuestions.map((q, i) => (
                      <div key={i} className="px-4 py-2.5">
                        <p className="text-xs text-gray-700 leading-snug line-clamp-2">
                          <span className="font-bold text-amber-700 mr-1">⚠</span>
                          {q.question}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-blue-800 uppercase tracking-wide">How to use this</p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-blue-800">
                  <li>Click <strong>Copy prompt</strong> below — the questions are already inside it</li>
                  <li>Open <strong>Claude.ai or ChatGPT</strong> in a new tab</li>
                  <li>Paste and send — one message, everything included</li>
                  <li>Come back here and paste the AI&apos;s JSON response in the next step</li>
                </ol>
              </div>

              {/* Single copy box — prompt with questions embedded */}
              <div className="border border-indigo-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
                  <div>
                    <span className="text-xs font-black text-indigo-700 uppercase tracking-wide">
                      Prompt · {fetchedQuestions.length} questions · {selectedSubject?.name} {examType} {year}
                    </span>
                    <p className="text-[11px] text-indigo-500 mt-0.5">Questions are embedded inside — copy and paste the whole thing</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(enrichPrompt)
                      setCopiedPrompt(true)
                      setTimeout(() => setCopiedPrompt(false), 2500)
                    }}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                      copiedPrompt ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
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
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors shadow-sm"
              >
                → I&apos;ve got the AI response — paste it now
              </button>
            </div>
          )}

                    {/* ── STEP 4: PASTE AI RESPONSE ──────────────────────────────── */}
          {enrichStep === 4 && parsedQuestions.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-gray-700">Step 4 — Paste the AI&apos;s JSON response</p>
                <button onClick={() => setEnrichStep(3)} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
              </div>

              <p className="text-sm text-gray-500">
                Paste the JSON array the AI returned. It should start with <code className="bg-gray-100 px-1 rounded text-xs">[</code> and end with <code className="bg-gray-100 px-1 rounded text-xs">]</code>.
              </p>

              <textarea
                ref={pasteRef}
                value={pasteText}
                onChange={e => { setPasteText(e.target.value); setParseError(null) }}
                placeholder={'[\n  {\n    "question_text": "...",\n    ...\n  }\n]'}
                className="w-full h-64 text-xs font-mono text-gray-700 border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-sm"
              >
                → Parse and review
              </button>
            </div>
          )}

          {/* ── STEP 4 (review): FULL QUESTION PREVIEW ───────────────── */}
          {enrichStep === 4 && parsedQuestions.length > 0 && (
            <div className="space-y-5">
              {/* Header */}
              {/* Mismatch summary */}
              {parsedQuestions.some(q => q._mismatch) && (() => {
                const mismatchCount = parsedQuestions.filter(q => q._mismatch).length
                const allMismatch   = mismatchCount === parsedQuestions.length
                return (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <span className="text-xl flex-shrink-0">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-black text-red-700">
                        {mismatchCount} possible explanation mismatch{mismatchCount !== 1 ? 'es' : ''} detected
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {allMismatch
                          ? 'All explanations appear mismatched — the AI likely returned explanations in the wrong order. Go back and re-send the prompt to Claude.'
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
                )
              })()}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-black text-gray-900">Step 4 — Preview every question before saving</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {parsedQuestions.length} questions · check the explanation quality, then save
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => { setParsedQuestions([]); setEnrichStep(4) }}
                    className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                  >
                    ← Re-paste
                  </button>
                  <button
                    onClick={() => handleSave(parsedQuestions.filter((_, i) => !hiddenIndexes.has(i)))}
                    disabled={saving || parsedQuestions.filter((_, i) => !hiddenIndexes.has(i)).length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-500 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    {saving ? <><Spinner size="sm" /> Saving…</> : `✓ Save ${parsedQuestions.filter((_, i) => !hiddenIndexes.has(i)).length} questions`}
                  </button>
                </div>
              </div>

              {parseError && <Alert type="error">{parseError}</Alert>}

              {/* Per-question cards */}
              <div className="space-y-4">
                {parsedQuestions.map((q, i) => {
                  const match = q._topicMatch
                  const hasMatch = match && match.confidence > 0.1
                  const exp = q.explanation ?? {}
                  const wrongOpts = exp.wrong_options ?? {}
                  const steps = Array.isArray(exp.steps) ? exp.steps : []
                  const workings = Array.isArray(exp.workings) ? exp.workings : []
                  const opts = q.options ?? {}
                  const letters = ['A','B','C','D','E']
                  const isHidden = hiddenIndexes.has(i)
                  const isEditingTopic = editingTopicIdx === i

                  return (
                    <div key={i} className={`rounded-2xl shadow-sm overflow-hidden border-2 transition-opacity ${
                      isHidden ? 'opacity-40 border-gray-200' : q._mismatch ? 'border-red-400' : 'border-gray-200'
                    } bg-white`}>
                      {/* Mismatch warning */}
                      {q._mismatch && !isHidden && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-200">
                          <span className="text-base">⚠️</span>
                          <div>
                            <span className="text-xs font-black text-red-700">Explanation mismatch detected</span>
                            <p className="text-xs text-red-600 mt-0.5">The explanation below may belong to a different question. Review carefully or hide this question.</p>
                          </div>
                        </div>
                      )}
                      {/* Card header */}
                      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                            Q{i + 1}
                          </span>
                          {exp.concept && !isHidden && (
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{exp.concept}</span>
                          )}
                          {isHidden && <span className="text-xs text-gray-400 italic">Hidden — will not be saved</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge color="gray">{q.year || year}</Badge>
                          {!isHidden && (
                            <button
                              onClick={() => setPreviewQuestion(q)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              👁 Preview
                            </button>
                          )}
                          {isHidden ? (
                            <button
                              onClick={() => unhideQuestion(i)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              ↩ Unhide
                            </button>
                          ) : (
                            <button
                              onClick={() => hideQuestion(q, i)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                              title="Hide — won't be saved, stored in Hidden Questions for later"
                            >
                              🚫 Hide
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Body — collapsed when hidden */}
                      {!isHidden && (
                        <div className="p-5 space-y-4">
                          <MathText text={q.question_text} as="p" className="text-sm font-semibold text-gray-900 leading-relaxed" />
                          {exp.concept && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
                              q._mismatch ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-indigo-50 border border-indigo-100 text-indigo-700'
                            }`}>
                              <span>{q._mismatch ? '⚠️' : '💡'}</span>
                              <span>Concept: <em>{exp.concept}</em> — does this match the question above?</span>
                            </div>
                          )}

                          {/* Options */}
                          {Object.keys(opts).length > 0 && (
                            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                              {(Array.isArray(opts) ? opts.map((v, idx) => [letters[idx], v]) : Object.entries(opts)).map(([k, v]) => {
                                const isCorrect = k.toUpperCase() === (q.correct_answer ?? '').toUpperCase()
                                return (
                                  <div key={k} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${
                                    isCorrect ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-100 bg-gray-50 text-gray-600'
                                  }`}>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 ${
                                      isCorrect ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>{k.toUpperCase()}</span>
                                    <MathText text={String(v)} as="span" className="leading-snug" />
                                    {isCorrect && <span className="ml-auto font-black text-green-600 flex-shrink-0">✓</span>}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Explanation */}
                          <div className="rounded-xl border border-indigo-100 bg-indigo-50 overflow-hidden">
                            <div className="px-4 py-2 border-b border-indigo-100 bg-indigo-100/50">
                              <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wide">Explanation</span>
                            </div>
                            <div className="p-4 space-y-3">
                              {(exp.answer_note || exp.correct) && (
                                <div>
                                  <p className="text-[11px] font-black text-green-700 uppercase tracking-wide mb-1">✓ Answer</p>
                                  <MathText text={exp.answer_note ?? exp.correct} as="p" className="text-xs text-gray-700 leading-relaxed" />
                                </div>
                              )}
                              {steps.length > 0 && (
                                <div>
                                  <p className="text-[11px] font-black text-indigo-700 uppercase tracking-wide mb-1.5">Working ({steps.length} step{steps.length !== 1 ? 's' : ''})</p>
                                  <div className="space-y-2">
                                    {steps.map((step, si) => {
                                      const lines = Array.isArray(step.lines) ? step.lines : [String(step)]
                                      return (
                                        <div key={si} className="rounded-lg bg-white border border-indigo-100 overflow-hidden">
                                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100/40 border-b border-indigo-100">
                                            <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-black">{si+1}</span>
                                            <span className="text-[11px] font-bold text-indigo-700">{step.title ?? `Step ${si+1}`}</span>
                                          </div>
                                          <div className="px-3 py-2 space-y-0.5">
                                            {lines.map((line, li) => (
                                              <MathText key={li} text={line} as="p" className="text-xs font-mono text-gray-800 leading-relaxed" />
                                            ))}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                              {steps.length === 0 && workings.length > 0 && (
                                <div>
                                  <p className="text-[11px] font-black text-indigo-700 uppercase tracking-wide mb-1.5">Working</p>
                                  <div className="space-y-1">
                                    {workings.map((step, si) => (
                                      <div key={si} className="flex gap-2 text-xs text-gray-700">
                                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-[9px] font-black mt-0.5">{si + 1}</span>
                                        <span className="leading-relaxed font-mono">{typeof step === 'string' ? step : step?.instruction ?? JSON.stringify(step)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {Object.keys(wrongOpts).length > 0 && (
                                <div>
                                  <p className="text-[11px] font-black text-red-600 uppercase tracking-wide mb-1.5">Why wrong answers are wrong</p>
                                  <div className="space-y-1.5">
                                    {Object.entries(wrongOpts).map(([letter, reason]) => (
                                      <div key={letter} className="flex gap-2 text-xs">
                                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[9px] font-black mt-0.5">{letter.toUpperCase()}</span>
                                        <MathText text={reason} as="span" className="text-gray-600 leading-relaxed" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Illustration panel — shown when AI provided an illustration_prompt */}
                          {q.explanation?.illustration_prompt && (
                            <IllustrationPanel
                              questionIdx={q._importIdx ?? i}
                              prompt={q.explanation.illustration_prompt}
                              svgCode={svgDrafts[q._importIdx ?? i] ?? ''}
                              onChange={code => setSvgDrafts(prev => ({ ...prev, [q._importIdx ?? i]: code }))}
                            />
                          )}

                          {/* Topic tag — editable with AI suggestions */}
                          {isEditingTopic ? (
                            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-2">
                              <p className="text-[11px] font-black text-indigo-700 uppercase tracking-wide">Edit topic tag</p>

                              {/* AI suggestions from matchTopicSubtopic */}
                              {q._topicMatch?.suggestions?.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide">AI suggestions — click to apply:</p>
                                  {q._topicMatch.suggestions.map((s, si) => (
                                    <button key={si}
                                      onClick={() => {
                                        setTopicEditValue({ topic_title: s.topic.name, subtopic_title: s.subtopic.name, _topicId: s.topic.id, _subtopicId: s.subtopic.id })
                                      }}
                                      className={`w-full text-left text-[11px] px-3 py-2 rounded-lg border transition-colors ${
                                        topicEditValue.topic_title === s.topic.name && topicEditValue.subtopic_title === s.subtopic.name
                                          ? 'bg-indigo-600 text-white border-indigo-600'
                                          : 'bg-white text-indigo-700 border-indigo-100 hover:bg-indigo-50'
                                      }`}
                                    >
                                      <span className="font-bold">{s.topic.name}</span>
                                      <span className="text-indigo-400 mx-1">→</span>
                                      {s.subtopic.name}
                                      <span className="ml-2 text-[10px] opacity-60">{Math.round(s.score * 100)}% match</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide pt-1">Or search manually:</p>
                              <input type="text" placeholder="Topic (e.g. Forces and Motion)"
                                value={topicEditValue.topic_title}
                                onChange={e => setTopicEditValue(v => ({ ...v, topic_title: e.target.value, _topicId: null }))}
                                className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                              />
                              <input type="text" placeholder="Subtopic (e.g. Newton's Laws)"
                                value={topicEditValue.subtopic_title}
                                onChange={e => setTopicEditValue(v => ({ ...v, subtopic_title: e.target.value, _subtopicId: null }))}
                                className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                              />
                              {/* Filtered curriculum list for manual search */}
                              {topics.length > 0 && topicEditValue.topic_title && (
                                <div className="max-h-28 overflow-y-auto space-y-0.5 border border-indigo-100 rounded-lg bg-white p-1">
                                  {topics
                                    .filter(t => t.name.toLowerCase().includes(topicEditValue.topic_title.toLowerCase()))
                                    .slice(0, 12)
                                    .map(t => (
                                      <button key={t.id}
                                        onClick={() => setTopicEditValue(v => ({ ...v, topic_title: t.name, _topicId: t.id }))}
                                        className="block w-full text-left text-[11px] px-2 py-1 rounded hover:bg-indigo-50 text-indigo-700 truncate">
                                        {t.name}
                                      </button>
                                    ))
                                  }
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button onClick={() => applyTopicEdit(i)}
                                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition-colors">✓ Apply</button>
                                <button onClick={() => setEditingTopicIdx(null)}
                                  className="px-3 py-1.5 border border-gray-200 text-xs font-bold text-gray-600 rounded-lg hover:bg-gray-50">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer group hover:shadow-sm transition-shadow ${
                                hasMatch ? (match.confidence >= 0.7 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200') : 'bg-red-50 border-red-200'
                              }`}
                              onClick={() => { setEditingTopicIdx(i); setTopicEditValue({ topic_title: q.topic_title ?? '', subtopic_title: q.subtopic_title ?? '' }) }}
                            >
                              <span className="font-black flex-shrink-0">{hasMatch ? (match.confidence >= 0.7 ? '✓' : '~') : '⚠'}</span>
                              <span className={`${hasMatch ? 'text-gray-700' : 'text-red-600'} min-w-0 flex-1 truncate`}>
                                {q.topic_title
                                  ? `${q.topic_title}${q.subtopic_title ? ' → ' + q.subtopic_title : ''}${hasMatch ? ' · ' + Math.round(match.confidence * 100) + '%' : ' (manual)'}`
                                  : 'Untagged — click to add topic'}
                              </span>
                              <span className="text-gray-400 group-hover:text-indigo-600 flex-shrink-0 ml-auto text-[11px] font-bold">✏️ Edit</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Sticky save bar at the bottom */}
              <div className="sticky bottom-4 z-10 space-y-2">
                {/* Pre-save flags */}
                {(() => {
                  const visibleQs = parsedQuestions.filter((_, i) => !hiddenIndexes.has(i))
                  const pendingIllustrations = visibleQs.filter(q =>
                    q.explanation?.illustration_prompt &&
                    !(svgDrafts[q._importIdx ?? 0] ?? '').trim().toLowerCase().startsWith('<svg')
                  )
                  const mismatchedVisible = visibleQs.filter(q => q._mismatch)
                  if (!pendingIllustrations.length && !mismatchedVisible.length) return null
                  return (
                    <div className="space-y-1.5">
                      {mismatchedVisible.length > 0 && (
                        <div className="flex items-start gap-2 px-4 py-2.5 bg-red-50 border border-red-300 rounded-xl text-xs">
                          <span className="text-base flex-shrink-0">&#9888;&#65039;</span>
                          <div>
                            <p className="font-black text-red-700">{mismatchedVisible.length} question{mismatchedVisible.length !== 1 ? 's' : ''} have explanation mismatches</p>
                            <p className="text-red-600 mt-0.5">These are highlighted red above. Review them before saving or hide the ones you are not sure about.</p>
                          </div>
                        </div>
                      )}
                      {pendingIllustrations.length > 0 && (
                        <div className="flex items-start gap-2 px-4 py-2.5 bg-violet-50 border border-violet-300 rounded-xl text-xs">
                          <span className="text-base flex-shrink-0">&#127912;</span>
                          <div>
                            <p className="font-black text-violet-700">{pendingIllustrations.length} illustration{pendingIllustrations.length !== 1 ? 's' : ''} have no SVG yet</p>
                            <p className="text-violet-600 mt-0.5">These questions will save without a diagram. You can add the SVG later in Past Questions. Scroll up to add them now if you prefer.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
                {hiddenIndexes.size > 0 && (
                  <div className="text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                    {hiddenIndexes.size} question{hiddenIndexes.size !== 1 ? 's' : ''} hidden — they will not be saved. Find them in Hidden Questions later.
                  </div>
                )}
                <button
                  onClick={() => handleSave(parsedQuestions.filter((_, i) => !hiddenIndexes.has(i)))}
                  disabled={saving || parsedQuestions.filter((_, i) => !hiddenIndexes.has(i)).length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white text-sm font-black rounded-2xl hover:bg-green-500 disabled:opacity-40 transition-colors shadow-lg"
                >
                  {saving
                    ? <><Spinner size="sm" /> Saving questions…</>
                    : `✓ Save ${parsedQuestions.filter((_, i) => !hiddenIndexes.has(i)).length} of ${parsedQuestions.length} questions`
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: DONE ──────────────────────────────────────────── */}
          {enrichStep === 5 && importResult && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
              <Alert type="success">
                ✅ {importResult.saved} question{importResult.saved !== 1 ? 's' : ''} saved to the question bank.
              </Alert>
              {importResult.errors?.length > 0 && (
                <Alert type="warning">{importResult.errors.length} questions had errors and were skipped.</Alert>
              )}
              <div className="flex gap-3 flex-wrap">
                <Link href="/admin/past-questions?untagged=true"
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors">
                  View in Past Questions →
                </Link>
                <button
                  onClick={() => {
                    setEnrichStep(1); setFetchedQuestions([]); setEnrichPrompt('')
                    setPasteText(''); setParsedQuestions([]); setImportResult(null); setPreviewError(null)
                  }}
                  className="px-4 py-2 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Import another year
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HELD (DIAGRAM) QUESTIONS TAB ───────────────────────────────── */}
      {activeTab === 'held' && (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-black text-gray-700">Questions waiting for diagram images</p>
            <p className="text-xs text-gray-500 mt-1">
              These questions were held back during import because they reference a diagram.
              Edit them to add context, then send them through the enrichment flow and save them.
            </p>
          </div>

          {heldGroups.length === 0 && (
            <Alert type="info">No held questions. When questions with diagrams are filtered during import, they&apos;ll appear here.</Alert>
          )}

          {/* If we're in send-prompt or review mode for a group */}
          {heldSendStep && (() => {
            const group = heldGroups.find(g => g.key === heldSendGroupKey)
            if (!group) return null
            return (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-gray-700">
                    {heldSendStep === 'prompt' ? 'Copy prompt → send to Claude or ChatGPT' : 'Review and save'}
                  </p>
                  <button onClick={() => { setHeldSendStep(null); setHeldSendGroupKey(null); setHeldParsedQs([]) }}
                    className="text-xs text-gray-400 hover:text-gray-600">← Back to list</button>
                </div>

                <Alert type="info">
                  {group.subject} · {group.exam} · {group.year} · {group.questions.length} questions
                </Alert>

                {heldSendStep === 'prompt' && (
                  <>
                    <div className="border border-indigo-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
                        <span className="text-xs font-black text-indigo-700 uppercase tracking-wide">Enrichment Prompt</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(heldSendPrompt); setHeldCopied(true); setTimeout(() => setHeldCopied(false), 2500) }}
                          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${heldCopied ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                        >{heldCopied ? '✓ Copied!' : '📋 Copy prompt'}</button>
                      </div>
                      <textarea readOnly value={heldSendPrompt}
                        className="w-full text-xs font-mono text-gray-600 bg-white p-4 resize-none focus:outline-none" rows={8} />
                    </div>
                    <button onClick={() => setHeldSendStep('paste')}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors shadow-sm">
                      → I&apos;ve got the AI response — paste it now
                    </button>
                  </>
                )}

                {heldSendStep === 'paste' && heldParsedQs.length === 0 && (
                  <>
                    <textarea
                      value={heldPasteText}
                      onChange={e => { setHeldPasteText(e.target.value); setHeldParseError(null) }}
                      placeholder={'[\n  {\n    "index": 1,\n    ...\n  }\n]'}
                      className="w-full h-48 text-xs font-mono text-gray-700 border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    {heldParseError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <pre className="text-xs text-red-600 whitespace-pre-wrap">{heldParseError}</pre>
                      </div>
                    )}
                    <button onClick={() => handleHeldParsePaste(group)} disabled={!heldPasteText.trim()}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-sm">
                      → Parse and review
                    </button>
                  </>
                )}

                {heldSendStep === 'review' && heldParsedQs.length > 0 && (
                  <div className="space-y-4">
                    {heldParsedQs.some(q => q._mismatch) && (
                      <Alert type="error">
                        ⚠️ {heldParsedQs.filter(q => q._mismatch).length} possible explanation mismatch(es) detected. Review each highlighted question carefully.
                      </Alert>
                    )}
                    {heldParseError && <Alert type="error">{heldParseError}</Alert>}
                    <div className="space-y-3">
                      {heldParsedQs.map((q, i) => (
                        <div key={i} className={`rounded-xl border-2 p-4 space-y-2 ${q._mismatch ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}>
                          {q._mismatch && <p className="text-xs font-black text-red-600">⚠️ Explanation mismatch — verify this one</p>}
                          <MathText text={q.question_text} as="p" className="text-sm font-semibold text-gray-900" />
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(q.options ?? {}).map(([k, v]) => (
                              <span key={k} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${k === q.correct_answer ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-100 text-gray-500'}`}>
                                {k}: {String(v).slice(0, 40)}
                              </span>
                            ))}
                          </div>
                          {q.explanation?.answer_note && (
                            <p className="text-xs text-indigo-700 italic">{q.explanation.answer_note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => handleHeldSave(group)} disabled={heldSaving}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white text-sm font-black rounded-2xl hover:bg-green-500 disabled:opacity-40 transition-colors shadow-lg">
                      {heldSaving ? <><Spinner size="sm" /> Saving…</> : `✓ Save all ${heldParsedQs.length} questions`}
                    </button>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Group list */}
          {!heldSendStep && heldGroups.map(group => (
            <div key={group.key} className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Group header */}
              <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-200">
                <div>
                  <p className="text-sm font-black text-amber-900">
                    {group.subject} · {group.exam} · {group.year}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    {group.questions?.length ?? 0} question{group.questions?.length !== 1 ? 's' : ''} · saved {new Date(group.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => buildHeldPrompt(group)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition-colors"
                  >
                    → Enrich &amp; Import
                  </button>
                  <button onClick={() => { if (confirm('Delete this entire group?')) deleteHeldGroup(group.key) }}
                    className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-lg px-2 py-1">
                    🗑 Delete group
                  </button>
                </div>
              </div>

              {/* Question list */}
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
                              if (isEditing) {
                                setHeldEditTarget(null)
                                setHeldEditText('')
                                setHeldEditError(null)
                              } else {
                                setHeldEditTarget({ groupKey: group.key, questionIndex: qi })
                                setHeldEditText(JSON.stringify(q, null, 2))
                                setHeldEditError(null)
                              }
                            }}
                            className="text-xs text-indigo-500 hover:text-indigo-700 border border-indigo-100 rounded-lg px-2 py-1"
                          >{isEditing ? 'Cancel' : '✏️ Edit'}</button>
                          <button onClick={() => { if (confirm('Remove this question from the held queue?')) deleteHeldQuestion(group.key, qi) }}
                            className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-lg px-2 py-1">
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Option pills */}
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(q.option ?? {}).map(([k, v]) => (
                          <span key={k} className={`text-[11px] px-2 py-0.5 rounded-full ${k === q.answer ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-100 text-gray-500'}`}>
                            {k.toUpperCase()}: {String(v ?? '').slice(0, 35)}
                          </span>
                        ))}
                        <Badge color="blue">🖼 Has image</Badge>
                      </div>

                      {/* Edit textarea */}
                      {isEditing && (
                        <div className="space-y-2 mt-2">
                          <p className="text-[11px] text-gray-500">Edit the question JSON — you can update the text, options, or answer. Add an <code className="bg-gray-100 px-1 rounded">image_description</code> field to describe the diagram so the AI can explain it.</p>
                          <textarea
                            value={heldEditText}
                            onChange={e => setHeldEditText(e.target.value)}
                            className="w-full h-48 text-xs font-mono text-gray-700 border border-indigo-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                          {heldEditError && <p className="text-xs text-red-600 font-mono">{heldEditError}</p>}
                          <button onClick={() => saveHeldEdit(group.key, qi)}
                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition-colors">
                            ✓ Save edit
                          </button>
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

      {/* ── HOW IT WORKS TAB ───────────────────────────────────────────── */}
      {activeTab === 'guide' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
          <h2 className="text-base font-black text-gray-900">How the import engine works</h2>

          <div className="space-y-4">
            {[
              {
                step: '1',
                title: 'Select subject + exam + year',
                body: 'Choose the ExamPrep subject you want to fill. The system maps your subject name to the correct SdashAPI slug automatically (e.g. "Mathematics WAEC" → slug: mathematics, type: wassce).',
              },
              {
                step: '2',
                title: 'Preview before committing',
                body: 'Click "Preview 5 questions" to see exactly what SdashAPI returns — question text, options, answer, and solution. This lets you verify quality before saving anything.',
              },
              {
                step: '3',
                title: 'Import runs deduplication',
                body: 'Before saving, the engine checks your database for matching sdash_id values and question text prefixes. Already-imported questions are silently skipped — you can safely re-run an import and it won\'t create duplicates.',
              },
              {
                step: '4',
                title: 'Questions land in the bank untagged',
                body: 'Imported questions have no topic or subtopic assigned. Go to Past Questions → filter "Untagged" to see them and assign them to curriculum topics. The AI Tagger tool (coming soon) can suggest the top 3 closest matching topics automatically.',
              },
              {
                step: '5',
                title: 'Bulk import for full coverage',
                body: 'Use "Year range" mode to import multiple years at once (e.g. 2015–2024). The engine processes each year sequentially with a short delay between requests. The log shows live progress per year.',
              },
              {
                step: '6',
                title: 'Difficulty is inferred automatically',
                body: 'Questions are automatically tagged to topics and subtopics from the curriculum tree.',
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">{title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide">SdashAPI subject slug reference</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {Object.entries(SDASH_SLUG_MAP).filter(([k]) => !k.includes(' ')).map(([name, slug]) => (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600 capitalize">{name}</span>
                  <span className="text-gray-300">→</span>
                  <span className="font-mono text-indigo-600">{slug}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}