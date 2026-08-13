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
import { buildSdashEnrichPrompt, parseQuestions, matchTopicSubtopic } from '@/lib/questionParser'

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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SdashImportPage() {
  const [subjects,       setSubjects]       = useState([])
  const [subjectId,      setSubjectId]      = useState('')
  const [subjectName,    setSubjectName]    = useState('')
  const [examType,       setExamType]       = useState('WAEC')
  const [year,           setYear]           = useState(String(new Date().getFullYear() - 1))
  const [mode,           setMode]           = useState('single')   // 'single' | 'range'
  const [yearRange,      setYearRange]      = useState({ from: '2015', to: String(new Date().getFullYear() - 1) })
  const [preview,        setPreview]        = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError,   setPreviewError]   = useState(null)
  const [importing,      setImporting]      = useState(false)
  const [importResult,   setImportResult]   = useState(null)
  const [importLog,      setImportLog]      = useState([])
  const [activeTab,      setActiveTab]      = useState('import')

  // ── Enrichment flow state ─────────────────────────────────────────────────
  const [fetchedQuestions,  setFetchedQuestions]  = useState([])  // raw SdashAPI batch
  const [topics,            setTopics]            = useState([])   // curriculum tree for subject
  const [enrichStep,        setEnrichStep]        = useState(1)    // 1=fetch 2=prompt 3=paste 4=review 5=done
  const [enrichPrompt,      setEnrichPrompt]       = useState('')
  const [pasteText,         setPasteText]          = useState('')
  const [parsedQuestions,   setParsedQuestions]    = useState([])  // after AI paste-back
  const [parseError,        setParseError]         = useState(null)
  const [copiedPrompt,      setCopiedPrompt]       = useState(false)
  const [saving,            setSaving]             = useState(false)
  const pasteRef = useRef(null)

  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear; y >= 2001; y--) years.push(y)

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

  const selectedSubject = subjects.find(s => s.id === subjectId)
  const sdashSlug = selectedSubject
    ? slugForSubject(baseSubjectName(selectedSubject.name))
    : null
  const sdashType = SDASH_TYPE_MAP[examType] ?? 'wassce'

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

      setFetchedQuestions(qs)
      // Build the enrichment prompt with the full curriculum tree
      const prompt = buildSdashEnrichPrompt(
        qs,
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

  // ── Parse the AI paste-back ────────────────────────────────────────────────
  function handleParsePaste() {
    setParseError(null)
    const result = parseQuestions(pasteText)
    if (!result.valid) {
      setParseError(result.errors.join('\n'))
      return
    }
    // Auto-run topic matching against curriculum
    const enriched = result.questions.map(q => {
      const match = matchTopicSubtopic(q, topics)
      return { ...q, _topicMatch: match }
    })
    setParsedQuestions(enriched)
    setEnrichStep(4)
  }

  // ── Save the reviewed questions ────────────────────────────────────────────
  async function handleSave(questionsToSave) {
    setSaving(true)
    try {
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
          questions: questionsToSave,
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

  return (
    <div className="space-y-6 max-w-4xl">
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

      {/* API key warning */}
      {!process.env.SDASH_API_KEY && (
        <Alert type="warning">
          ⚠️ <strong>SDASH_API_KEY</strong> is not set in your environment variables.
          Add it to <code>.env.local</code> to enable imports.
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'import', label: '⬆ Import' },
          { id: 'guide',  label: '📖 How it works' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
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
              { n: 2, label: 'Fetch' },
              { n: 3, label: 'Copy Prompt' },
              { n: 4, label: 'Paste AI' },
              { n: 5, label: 'Review' },
              { n: 6, label: 'Done' },
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

          {/* ── STEP 2: FETCHED — show raw count + go to prompt ───────── */}
          {enrichStep === 2 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-gray-700">Step 2 — Questions fetched</p>
                <button onClick={() => setEnrichStep(1)} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
              </div>

              <Alert type="success">
                ✅ Fetched <strong>{fetchedQuestions.length} questions</strong> for {selectedSubject?.name} · {examType} · {year}
              </Alert>

              {/* Raw preview */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Raw SdashAPI data (first 3)</p>
                </div>
                <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                  {fetchedQuestions.slice(0, 3).map((q, i) => (
                    <div key={i} className="px-4 py-3">
                      <p className="text-xs text-gray-700 font-medium line-clamp-2">{q.question}</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Answer: <span className="font-bold text-green-600">{q.answer?.toUpperCase()}</span>
                        {q.solution
                          ? <span className="ml-2 text-gray-400">· Solution: {q.solution.slice(0, 60)}…</span>
                          : <span className="ml-2 text-amber-500">· No solution</span>
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>Next:</strong> copy the enrichment prompt and paste it into Claude or ChatGPT
                along with these questions. The AI will write proper explanations and suggest topic tags.
              </div>

              <button
                onClick={() => setEnrichStep(3)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors shadow-sm"
              >
                → Get enrichment prompt
              </button>
            </div>
          )}

          {/* ── STEP 3: COPY PROMPT ────────────────────────────────────── */}
          {enrichStep === 3 && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-gray-700">Step 3 — Copy prompt to Claude / ChatGPT</p>
                <button onClick={() => setEnrichStep(2)} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
                <p className="font-black">How to use this:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Click <strong>Copy prompt</strong> below</li>
                  <li>Open Claude.ai or ChatGPT in a new tab</li>
                  <li>Paste the prompt and send</li>
                  <li>Come back here and paste the AI&apos;s JSON response</li>
                </ol>
              </div>

              {/* Copy box */}
              <div className="border border-indigo-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
                    Enrichment Prompt — {fetchedQuestions.length} questions · {selectedSubject?.name} {examType} {year}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(enrichPrompt)
                      setCopiedPrompt(true)
                      setTimeout(() => setCopiedPrompt(false), 2500)
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                      copiedPrompt ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
                  >
                    {copiedPrompt ? '✓ Copied!' : 'Copy prompt'}
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
                <p className="text-sm font-black text-gray-700">Step 4 — Paste the AI response</p>
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

          {/* ── STEP 5: TAG REVIEW ────────────────────────────────────── */}
          {enrichStep === 4 && parsedQuestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-gray-900">Step 5 — Review topic tags</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {parsedQuestions.length} questions ready · check tags then save
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setParsedQuestions([]); setEnrichStep(4) }}
                    className="text-xs text-gray-400 hover:text-gray-600">← Re-paste</button>
                  <button
                    onClick={() => handleSave(parsedQuestions)}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-500 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    {saving ? <><Spinner size="sm" /> Saving…</> : `✓ Save all ${parsedQuestions.length} questions`}
                  </button>
                </div>
              </div>

              {parseError && <Alert type="error">{parseError}</Alert>}

              <div className="space-y-3">
                {parsedQuestions.map((q, i) => {
                  const match = q._topicMatch
                  const hasMatch = match && match.confidence > 0.1
                  return (
                    <div key={i} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-900 font-medium leading-snug flex-1 line-clamp-3">{q.question_text}</p>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <Badge color={q.difficulty === 'easy' ? 'green' : q.difficulty === 'hard' ? 'red' : 'amber'}>
                            {q.difficulty}
                          </Badge>
                          <Badge color="gray">{q.year || year}</Badge>
                        </div>
                      </div>

                      {/* Topic match */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                        hasMatch
                          ? match.confidence >= 0.7 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <span className="font-black">
                          {hasMatch ? (match.confidence >= 0.7 ? '✓' : '~') : '⚠'}
                        </span>
                        <span className={hasMatch ? 'text-gray-700' : 'text-red-600'}>
                          {hasMatch
                            ? `${match.topic?.name ?? '—'} → ${match.subtopic?.name ?? '(topic only)'} · ${Math.round(match.confidence * 100)}%`
                            : `Untagged — topic_title: "${q.topic_title || 'missing'}"`
                          }
                        </span>
                      </div>

                      {/* Explanation preview */}
                      {q.explanation?.correct && (
                        <p className="text-xs text-gray-500 italic line-clamp-2">{q.explanation.correct}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => handleSave(parsedQuestions)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white text-sm font-black rounded-xl hover:bg-green-500 disabled:opacity-40 transition-colors shadow-sm"
              >
                {saving ? <><Spinner size="sm" /> Saving…</> : `✓ Save all ${parsedQuestions.length} questions`}
              </button>
            </div>
          )}

          {/* ── STEP 6: DONE ──────────────────────────────────────────── */}
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
                body: 'SdashAPI doesn\'t provide difficulty ratings. The import engine classifies each question as easy / medium / hard based on keyword patterns in the question text (e.g. "define" → easy, "calculate" → hard). You can adjust this in the question editor.',
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