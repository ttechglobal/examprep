'use client'
// src/app/admin/questions/page.js
// Rebuilt question bank with:
// 1. Student-view preview (renders QuestionCard exactly as students see it)
// 2. Inline edit (question text, options, correct answer, image, difficulty, topic mapping)
// 3. Delete (hard delete with confirmation)
// 4. Archive (soft delete — existing behaviour)
// 5. All existing filters preserved

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import QuestionCard from '@/components/quiz/QuestionCard'

// ── Colour maps ───────────────────────────────────────────────────────────────
const DIFFICULTY_COLORS = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-red-100 text-red-700',
}
const EXAM_COLORS = {
  WAEC: 'bg-blue-100 text-blue-700',
  JAMB: 'bg-purple-100 text-purple-700',
  BOTH: 'bg-indigo-100 text-indigo-700',
}

// ── Confirmation modal ────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel, danger = false }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <p className="text-sm font-bold text-gray-900 leading-snug">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black text-white transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Inline edit form ──────────────────────────────────────────────────────────
function EditForm({ question, topics, onSave, onCancel }) {
  const [form, setForm] = useState({
    question_text:  question.question_text ?? '',
    options:        { ...question.options },
    correct_answer: question.correct_answer ?? 'A',
    difficulty:     question.difficulty ?? 'medium',
    exam_type:      question.exam_type ?? 'BOTH',
    topic_id:       question.topic_id ?? '',
    subtopic_id:    question.subtopic_id ?? '',
    image_url:      question.image_url ?? '',
    has_image:      question.has_image ?? false,
    explanation_correct: question.explanation?.correct ?? '',
  })
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState(null)
  const [subtopics, setSubtopics] = useState([])

  // Load subtopics when topic changes
  useEffect(() => {
    if (!form.topic_id) { setSubtopics([]); return }
    fetch(`/api/admin/subtopics?topicId=${form.topic_id}`)
      .then(r => r.json())
      .then(data => setSubtopics(Array.isArray(data) ? data : []))
  }, [form.topic_id])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const setOption = (key, value) => setForm(f => ({ ...f, options: { ...f.options, [key]: value } }))

  async function handleSave() {
    if (!form.question_text.trim()) { setError('Question text is required'); return }
    const opts = form.options
    if (!opts.A || !opts.B || !opts.C || !opts.D) { setError('All four options (A–D) are required'); return }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text:  form.question_text.trim(),
          options:        form.options,
          correct_answer: form.correct_answer,
          difficulty:     form.difficulty,
          exam_type:      form.exam_type,
          topic_id:       form.topic_id   || null,
          subtopic_id:    form.subtopic_id || null,
          image_url:      form.image_url  || null,
          has_image:      form.has_image,
          explanation: {
            ...question.explanation,
            correct: form.explanation_correct,
          },
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      onSave(data)
    } catch {
      setError('Save failed — try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50 px-5 py-5 space-y-4">
      <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Edit Question</p>

      {/* Question text */}
      <div>
        <label className="text-xs font-bold text-gray-600 block mb-1">Question text</label>
        <textarea
          value={form.question_text}
          onChange={e => set('question_text', e.target.value)}
          rows={3}
          className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
      </div>

      {/* Options */}
      <div>
        <label className="text-xs font-bold text-gray-600 block mb-2">Options</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {['A', 'B', 'C', 'D'].map(key => (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 ${
                form.correct_answer === key
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>{key}</span>
              <input
                value={form.options[key] ?? ''}
                onChange={e => setOption(key, e.target.value)}
                className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                placeholder={`Option ${key}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Correct answer + metadata row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Correct</label>
          <select value={form.correct_answer} onChange={e => set('correct_answer', e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            {['A','B','C','D'].map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Difficulty</label>
          <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            {['easy','medium','hard'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Exam</label>
          <select value={form.exam_type} onChange={e => set('exam_type', e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            {['WAEC','JAMB','BOTH'].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Has image?</label>
          <select value={form.has_image ? 'yes' : 'no'} onChange={e => set('has_image', e.target.value === 'yes')}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
      </div>

      {/* Image URL */}
      {form.has_image && (
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Image URL</label>
          <input
            value={form.image_url}
            onChange={e => set('image_url', e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="https://..."
          />
          {form.image_url && (
            <img src={form.image_url} alt="" className="mt-2 rounded-xl max-h-32 object-contain border border-gray-200" />
          )}
        </div>
      )}

      {/* Topic + subtopic */}
      {topics.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Topic</label>
            <select value={form.topic_id} onChange={e => { set('topic_id', e.target.value); set('subtopic_id', '') }}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">— Select topic —</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Subtopic</label>
            <select value={form.subtopic_id} onChange={e => set('subtopic_id', e.target.value)}
              disabled={!subtopics.length}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40">
              <option value="">— Select subtopic —</option>
              {subtopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Correct explanation */}
      <div>
        <label className="text-xs font-bold text-gray-600 block mb-1">Correct answer explanation</label>
        <textarea
          value={form.explanation_correct}
          onChange={e => set('explanation_correct', e.target.value)}
          rows={2}
          className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          placeholder="Why is this the correct answer?"
        />
      </div>

      {error && <p className="text-xs text-red-600 font-medium">⚠ {error}</p>}

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-500 disabled:opacity-40 transition-colors">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

// ── Single question row ───────────────────────────────────────────────────────
function QuestionRow({ question, topics, onUpdate, onDelete, onArchive }) {
  const [mode, setMode] = useState('collapsed') // collapsed | preview | edit
  const [confirm, setConfirm] = useState(null)  // null | 'archive' | 'delete'

  function handleUpdate(updated) {
    setMode('collapsed')
    onUpdate(updated)
  }

  function handleArchive() {
    setConfirm(null)
    onArchive(question.id)
  }

  function handleDelete() {
    setConfirm(null)
    onDelete(question.id)
  }

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${
      question.is_flagged ? 'border-amber-300' : 'border-gray-200'
    }`}>
      {/* ── Header row ── */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Question text + meta — clicking toggles preview */}
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => setMode(m => m === 'preview' ? 'collapsed' : 'preview')}
        >
          <p className="text-sm text-gray-800 leading-snug line-clamp-2 font-medium">
            {question.question_text}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[question.difficulty] ?? 'bg-gray-100 text-gray-500'}`}>
              {question.difficulty}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXAM_COLORS[question.exam_type] ?? 'bg-gray-100 text-gray-500'}`}>
              {question.exam_type}
            </span>
            {question.year && <span className="text-xs text-gray-400">{question.year}</span>}
            {question.topics?.name && (
              <span className="text-xs text-gray-500 truncate max-w-[120px]">{question.topics.name}</span>
            )}
            {question.subtopics?.name && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400 truncate max-w-[120px]">{question.subtopics.name}</span>
              </>
            )}
            {!question.subtopic_id && (
              <span className="text-xs text-red-500 font-bold">⚠ Untagged</span>
            )}
            {question.has_image && !question.image_url && (
              <span className="text-xs text-amber-600 font-bold">⚠ Missing image</span>
            )}
            {question.has_image && question.image_url && (
              <span className="text-xs text-purple-600 font-medium">🖼 Image</span>
            )}
          </div>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setMode(m => m === 'preview' ? 'collapsed' : 'preview')}
            title="Student preview"
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              mode === 'preview' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
          >
            {/* Eye icon */}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={() => setMode(m => m === 'edit' ? 'collapsed' : 'edit')}
            title="Edit question"
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              mode === 'edit' ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
          >
            {/* Pencil icon */}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => setConfirm('archive')}
            title="Archive (hide from students)"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
          >
            {/* Archive icon */}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>
          <button
            onClick={() => setConfirm('delete')}
            title="Delete permanently"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            {/* Trash icon */}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Student preview mode ── */}
      {mode === 'preview' && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-3">Student view</p>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <QuestionCard
              question={question}
              selectedAnswer={null}
              revealed={false}
              onAnswer={() => {}}
              showExplanation={false}
            />
          </div>
          {/* Also show the explanation below so admin can review it */}
          {(question.explanation?.correct || question.explanation?.workings?.length > 0) && (
            <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-2">
              <p className="text-xs font-black text-indigo-700">
                ✓ {question.correct_answer} — Explanation
              </p>
              <p className="text-xs text-gray-700 leading-relaxed">
                {question.explanation.correct}
              </p>
              {question.explanation.workings?.length > 0 && (
                <div className="bg-white rounded-lg p-2 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Workings</p>
                  {question.explanation.workings.map((w, i) => (
                    <p key={i} className="text-xs text-gray-600 font-mono">
                      {i + 1}. {typeof w === 'string' ? w : w.instruction}
                    </p>
                  ))}
                </div>
              )}
              {question.explanation.wrong_options && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Why other options are wrong</p>
                  {Object.entries(question.explanation.wrong_options)
                    .filter(([k]) => k !== question.correct_answer)
                    .map(([k, reason]) => (
                      <p key={k} className="text-xs text-gray-600">
                        <span className="font-bold text-red-500">{k}:</span> {reason}
                      </p>
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Edit mode ── */}
      {mode === 'edit' && (
        <EditForm
          question={question}
          topics={topics}
          onSave={handleUpdate}
          onCancel={() => setMode('collapsed')}
        />
      )}

      {/* ── Confirm modal ── */}
      {confirm === 'archive' && (
        <ConfirmModal
          message="Archive this question? It will no longer appear for students but will not be deleted."
          onConfirm={handleArchive}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmModal
          message="Permanently delete this question? This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
          danger
        />
      )}
    </div>
  )
}

// ── Coverage tab (unchanged) ──────────────────────────────────────────────────
function CoverageTab({ subjects }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id ?? '')
  const [coverage, setCoverage]                   = useState([])
  const [loading,  setLoading]                    = useState(false)

  useEffect(() => {
    if (!selectedSubjectId) return
    setLoading(true)
    fetch(`/api/admin/questions/coverage?subjectId=${selectedSubjectId}`)
      .then(r => r.json())
      .then(data => { setCoverage(data ?? []); setLoading(false) })
  }, [selectedSubjectId])

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {subjects.map(s => (
          <button key={s.id} onClick={() => setSelectedSubjectId(s.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              selectedSubjectId === s.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-gray-200 text-gray-600 hover:border-indigo-300'
            }`}>
            {s.name}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {coverage.map(item => (
            <div key={item.topic_id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-900">{item.topic_name}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  item.count > 10 ? 'bg-green-100 text-green-700' :
                  item.count > 0  ? 'bg-amber-100 text-amber-700' :
                                    'bg-red-100 text-red-700'
                }`}>
                  {item.count} questions
                </span>
              </div>
              {item.subtopics?.map(sub => (
                <div key={sub.subtopic_id} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-gray-500">{sub.subtopic_name}</span>
                  <span className={sub.count > 0 ? 'text-green-600 font-medium' : 'text-red-400'}>
                    {sub.count}
                  </span>
                </div>
              ))}
            </div>
          ))}
          {coverage.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No coverage data yet</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Batch history tab ─────────────────────────────────────────────────────────
function BatchHistoryTab() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/questions/batches')
      .then(r => r.json())
      .then(data => { setBatches(data ?? []); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-2">
      {batches.length === 0
        ? <p className="text-center text-gray-400 text-sm py-8">No upload batches yet</p>
        : batches.map(b => (
          <div key={b.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">{b.subject_name} — {b.exam_type}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-green-600">{b.saved} saved</p>
              {b.errors > 0 && <p className="text-xs text-red-500">{b.errors} errors</p>}
            </div>
          </div>
        ))
      }
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QuestionsPage() {
  const [tab,              setTab]             = useState('bank')
  const [questions,        setQuestions]       = useState([])
  const [total,            setTotal]           = useState(0)
  const [loading,          setLoading]         = useState(true)
  const [page,             setPage]            = useState(1)
  const [subjects,         setSubjects]        = useState([])
  const [topics,           setTopics]          = useState([])

  // Filters
  const [filterExam,        setFilterExam]       = useState('')
  const [filterSubject,     setFilterSubject]    = useState('')
  const [filterTopic,       setFilterTopic]      = useState('')
  const [filterDifficulty,  setFilterDifficulty] = useState('')
  const [filterUntagged,    setFilterUntagged]   = useState(false)
  const [filterMissingImage,setFilterMissingImage] = useState(false)
  const [search,            setSearch]           = useState('')

  // Load subjects + topics for filters and edit form
  useEffect(() => {
    fetch('/api/admin/subjects?active=true')
      .then(r => r.json())
      .then(data => setSubjects(Array.isArray(data) ? data.filter(s => s.is_active) : []))
  }, [])

  useEffect(() => {
    if (!filterSubject) { setTopics([]); return }
    fetch(`/api/admin/curriculum?subjectId=${filterSubject}`)
      .then(r => r.json())
      .then(data => setTopics(Array.isArray(data) ? data : []))
  }, [filterSubject])

  // Check URL params on mount for direct links from dashboard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('untagged') === 'true')       setFilterUntagged(true)
    if (params.get('missing_image') === 'true')  setFilterMissingImage(true)
  }, [])

  const loadQuestions = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterExam)         params.set('exam', filterExam)
    if (filterSubject)      params.set('subject', filterSubject)
    if (filterTopic)        params.set('topic', filterTopic)
    if (filterDifficulty)   params.set('difficulty', filterDifficulty)
    if (filterUntagged)     params.set('untagged', 'true')
    if (filterMissingImage) params.set('missing_image', 'true')
    if (search)             params.set('search', search)
    params.set('page', String(page))

    fetch(`/api/admin/questions?${params}`)
      .then(r => r.json())
      .then(data => {
        setQuestions(data.questions ?? [])
        setTotal(data.total ?? 0)
        setLoading(false)
      })
  }, [filterExam, filterSubject, filterTopic, filterDifficulty, filterUntagged, filterMissingImage, search, page])

  useEffect(() => { loadQuestions() }, [loadQuestions])

  function handleUpdate(updated) {
    setQuestions(prev => prev.map(q => q.id === updated.id ? { ...q, ...updated } : q))
  }

  async function handleArchive(id) {
    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
    loadQuestions()
  }

  async function handleDelete(id) {
    await fetch(`/api/admin/questions/${id}?hard=true`, { method: 'DELETE' })
    loadQuestions()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Question Bank</h1>
          <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} questions</p>
        </div>
        <Link href="/admin/questions/upload"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors">
          + Upload Questions
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'bank',     label: `Bank (${total})` },
          { id: 'coverage', label: 'Coverage' },
          { id: 'history',  label: 'History' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BANK TAB ── */}
      {tab === 'bank' && (
        <div className="space-y-4">
          {/* Search */}
          <input type="text" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search questions..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select value={filterExam} onChange={e => { setFilterExam(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All exams</option>
              <option value="WAEC">WAEC</option>
              <option value="JAMB">JAMB</option>
              <option value="BOTH">BOTH</option>
            </select>
            <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setFilterTopic(''); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {topics.length > 0 && (
              <select value={filterTopic} onChange={e => { setFilterTopic(e.target.value); setPage(1) }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">All topics</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <select value={filterDifficulty} onChange={e => { setFilterDifficulty(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button onClick={() => { setFilterUntagged(u => !u); setPage(1) }}
              className={`text-xs px-3 py-2 rounded-xl border font-medium transition-colors ${
                filterUntagged ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}>
              {filterUntagged ? '✓ ' : ''}Untagged only
            </button>
            <button onClick={() => { setFilterMissingImage(u => !u); setPage(1) }}
              className={`text-xs px-3 py-2 rounded-xl border font-medium transition-colors ${
                filterMissingImage ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}>
              {filterMissingImage ? '✓ ' : ''}Missing images
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400">{total} questions — click a row to preview, pencil to edit</p>
              <div className="space-y-2">
                {questions.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                    <p className="text-3xl mb-2">📝</p>
                    <p className="text-gray-500 text-sm mb-3">No questions found.</p>
                    <Link href="/admin/questions/upload" className="text-sm font-bold text-indigo-600 hover:underline">
                      Upload your first batch →
                    </Link>
                  </div>
                ) : (
                  questions.map(q => (
                    <QuestionRow
                      key={q.id}
                      question={q}
                      topics={topics}
                      onUpdate={handleUpdate}
                      onArchive={handleArchive}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-2 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 font-medium">
                    ← Prev
                  </button>
                  <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-2 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 font-medium">
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'coverage' && subjects.length > 0 && <CoverageTab subjects={subjects} />}
      {tab === 'history'  && <BatchHistoryTab />}
    </div>
  )
}