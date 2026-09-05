'use client'
// src/app/admin/questions/page.js

import { useState, useEffect, useCallback, memo, useRef } from 'react'
import Link from 'next/link'

// ── Helpers ───────────────────────────────────────────────────────────────────
function Badge({ children, color = 'gray' }) {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-700',
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-green-100 text-green-700',
    amber:  'bg-amber-100 text-amber-700',
    red:    'bg-red-100 text-red-700',
    gray:   'bg-gray-100 text-gray-600',
    violet: 'bg-violet-100 text-violet-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  )
}

function Spinner({ size = 'md' }) {
  const sz = size === 'sm' ? 'w-4 h-4 border-2' : 'w-8 h-8 border-4'
  return <div className={`${sz} border-indigo-500 border-t-transparent rounded-full animate-spin`} />
}

// ── Student-facing explanation renderer ───────────────────────────────────────
function ExplanationPreview({ explanation, options, correctAnswer, question }) {
  const [picked, setPicked] = useState(null)
  const expl = typeof explanation === 'string' ? null : explanation
  const plainText = typeof explanation === 'string' ? explanation : explanation?.correct ?? null

  return (
    <div className="space-y-3">
      {/* Question text */}
      <p className="text-sm font-medium text-gray-800 leading-relaxed">{question}</p>

      {/* Options — interactive */}
      <div className="space-y-1.5">
        {Object.entries(options ?? {}).map(([k, v]) => {
          let cls = 'flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm border cursor-pointer transition-colors'
          if (picked) {
            if (k === picked && k === correctAnswer)  cls += ' bg-green-50 border-green-300 text-green-800'
            else if (k === picked)                    cls += ' bg-red-50 border-red-300 text-red-800'
            else if (k === correctAnswer)             cls += ' bg-green-50 border-green-200 text-green-700 opacity-70'
            else                                      cls += ' bg-gray-50 border-gray-100 text-gray-500'
          } else {
            cls += ' bg-gray-50 border-gray-100 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200'
          }
          return (
            <div key={k} className={cls} onClick={() => !picked && setPicked(k)}>
              <span className="font-black text-xs w-5 flex-shrink-0 mt-0.5">{k}.</span>
              <span className="leading-relaxed flex-1">{v}</span>
              {picked && k === correctAnswer && <span className="text-green-600 text-xs font-black flex-shrink-0 ml-auto">✓</span>}
              {picked && k === picked && k !== correctAnswer && <span className="text-red-500 text-xs font-black flex-shrink-0 ml-auto">✗</span>}
            </div>
          )
        })}
      </div>

      {/* Reset */}
      {picked && (
        <button onClick={() => setPicked(null)}
          className="text-xs text-gray-400 hover:text-gray-600 underline">
          Reset answer
        </button>
      )}

      {/* Result banner */}
      {picked && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
          picked === correctAnswer
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {picked === correctAnswer ? '✓ Correct!' : `✗ Wrong — the answer is ${correctAnswer}`}
        </div>
      )}

      {/* Explanation sections — only shown after answering */}
      {picked && expl && (
        <div className="space-y-2 pt-1">
          {/* Concept */}
          {expl.concept && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
              <span className="text-indigo-500 text-base flex-shrink-0">💡</span>
              <p className="text-xs text-indigo-800 font-medium leading-relaxed">{expl.concept}</p>
            </div>
          )}

          {/* Why picked option is wrong */}
          {picked !== correctAnswer && expl.wrong_options?.[picked] && (
            <div className="px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-wide mb-1">Why {picked} is wrong</p>
              <p className="text-xs text-amber-900 leading-relaxed">{expl.wrong_options[picked]}</p>
            </div>
          )}

          {/* Correct explanation */}
          {expl.correct && (
            <div className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1">
                {picked === correctAnswer ? "Why you're right" : `Why ${correctAnswer} is correct`}
              </p>
              <p className="text-xs text-gray-800 leading-relaxed">{expl.correct}</p>
            </div>
          )}

          {/* Workings */}
          {expl.workings?.length > 0 && (
            <div className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-2">Workings</p>
              <div className="space-y-1.5">
                {expl.workings.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                    <span className="text-xs font-mono text-gray-700 leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other wrong options */}
          {expl.wrong_options && (
            <div className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-2">Why other options are wrong</p>
              <div className="space-y-2">
                {Object.entries(expl.wrong_options)
                  .filter(([k]) => k !== correctAnswer)
                  .map(([k, reason]) => (
                    <div key={k} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg ${k === picked ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                      <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-black flex items-center justify-center flex-shrink-0">{k}</span>
                      <span className="text-xs text-gray-700 leading-relaxed">{reason}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fallback plain text explanation */}
      {picked && !expl && plainText && (
        <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-wide mb-1">Explanation</p>
          <p className="text-xs text-blue-800 leading-relaxed">{plainText}</p>
        </div>
      )}

      {/* No explanation */}
      {picked && !expl && !plainText && (
        <p className="text-xs text-gray-400 italic">No explanation saved for this question yet.</p>
      )}
    </div>
  )
}

// ── Topic tagger panel ────────────────────────────────────────────────────────
function TopicTagger({ question, onSave, onCancel }) {
  const [topics,      setTopics]      = useState([])
  const [loading,     setLoading]     = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [selectedTopic,    setSelectedTopic]    = useState(question.topic_id    ?? '')
  const [selectedSubtopic, setSelectedSubtopic] = useState(question.subtopic_id ?? '')
  const [saving,      setSaving]      = useState(false)
  const [subjectId,   setSubjectId]   = useState(question.subject_id ?? '')

  // Fetch subjects to pick one if not set
  const [subjects, setSubjects] = useState([])
  useEffect(() => {
    fetch('/api/admin/subjects?active=true')
      .then(r => r.json())
      .then(d => setSubjects(Array.isArray(d) ? d : []))
  }, [])

  // When subjectId changes, load curriculum
  useEffect(() => {
    if (!subjectId) { setTopics([]); setSuggestions([]); return }
    setLoading(true)
    fetch(`/api/admin/curriculum?subjectId=${subjectId}`)
      .then(r => r.json())
      .then(tree => {
        setTopics(Array.isArray(tree) ? tree : [])
        // Get AI suggestions
        return fetch('/api/admin/sdash/tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions: [{ id: question.id, question_text: question.question_text, options: question.options }],
            topics: Array.isArray(tree) ? tree : [],
          })
        }).then(r => r.json()).then(d => {
          setSuggestions(d.suggestions?.[0]?.matches ?? [])
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [subjectId, question.id, question.question_text, question.options])

  const subtopics = topics.find(t => t.id === selectedTopic)?.subtopics ?? []

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id:    selectedTopic    || null,
          subtopic_id: selectedSubtopic || null,
        })
      })
      if (!res.ok) throw new Error('Save failed')
      const updated = await res.json()
      onSave(updated)
    } catch (e) {
      alert('Failed to save: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-2">Tag to curriculum</p>
        <p className="text-xs text-gray-500 mb-3">
          {question.topic_id ? 'Already tagged — you can change it below.' : 'This question is untagged. Pick a topic and subtopic.'}
        </p>
      </div>

      {/* Subject picker */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Subject</label>
        <select value={subjectId} onChange={e => { setSubjectId(e.target.value); setSelectedTopic(''); setSelectedSubtopic('') }}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">Select subject…</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* AI suggestions */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wide mb-1.5">AI suggestions</p>
          <div className="space-y-1">
            {suggestions.map((s, i) => (
              <button key={i}
                onClick={() => { setSelectedTopic(s.topicId); setSelectedSubtopic(s.subtopicId ?? '') }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs border transition-colors ${
                  selectedTopic === s.topicId && selectedSubtopic === (s.subtopicId ?? '')
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                    : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200'
                }`}>
                <span className="font-medium">{s.topicName}</span>
                {s.subtopicName && <span className="text-gray-400"> → {s.subtopicName}</span>}
                <span className={`ml-2 text-[10px] font-black ${s.score >= 60 ? 'text-green-600' : s.score >= 30 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {s.score}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
      )}

      {/* Manual pickers */}
      {topics.length > 0 && (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Topic</label>
            <select value={selectedTopic} onChange={e => { setSelectedTopic(e.target.value); setSelectedSubtopic('') }}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Select topic…</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {subtopics.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Subtopic</label>
              <select value={selectedSubtopic} onChange={e => setSelectedSubtopic(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Select subtopic…</option>
                {subtopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {topics.length > 0 && !topics.some(t => t.subtopics?.length) && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
              No subtopics in this subject's curriculum yet.
            </p>
          )}
        </div>
      )}

      {subjectId && !loading && topics.length === 0 && (
        <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">
          No curriculum loaded for this subject yet. Add topics in{' '}
          <Link href="/admin/curriculum" className="text-indigo-600 underline">Curriculum →</Link>
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={!selectedTopic || saving}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition-colors">
          {saving ? 'Saving…' : 'Save tag'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Question drawer ───────────────────────────────────────────────────────────
// Replaces the old modal. Right-side slide-in with two tabs: Preview + Tag.
function QuestionDrawer({ question: initialQ, onClose, onUpdated }) {
  const [q,    setQ]    = useState(initialQ)
  const [tab,  setTab]  = useState('preview') // 'preview' | 'tag'
  const [saved, setSaved] = useState(false)

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleTagSaved(updated) {
    setQ(updated)
    setSaved(true)
    onUpdated?.(updated)
    setTab('preview')
    setTimeout(() => setSaved(false), 2000)
  }

  const opts = q.options ?? {}
  const diffColor = q.difficulty === 'hard' ? 'red' : q.difficulty === 'easy' ? 'green' : 'amber'
  const sourceLabel = q.source === 'past_paper' ? 'Past Paper' : 'AI'
  const sourceColor = q.source === 'past_paper' ? 'indigo' : 'violet'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {q.subjects?.name && <Badge color="indigo">{q.subjects.name}</Badge>}
            {q.topics?.name   && <Badge color="gray">{q.topics.name}</Badge>}
            {q.subtopics?.name && <Badge color="gray">{q.subtopics.name}</Badge>}
            <Badge color={diffColor}>{q.difficulty}</Badge>
            <Badge color={sourceColor}>{sourceLabel}</Badge>
            {q.year && <Badge color="gray">{q.year}</Badge>}
            {!q.subtopic_id          && <Badge color="red">Untagged</Badge>}
            {q.is_active === false   && <Badge color="amber">⊘ Inactive</Badge>}
            {q.is_flagged            && <Badge color="red">🚩 Flagged</Badge>}
            {saved && <Badge color="green">✓ Tagged!</Badge>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              title={q.is_active === false ? 'Reactivate question' : 'Remove from student pool'}
              onClick={async () => {
                const newVal = q.is_active === false ? true : false
                const res = await fetch(`/api/admin/questions/${q.id}`, {
                  method:'PATCH', headers:{'Content-Type':'application/json'},
                  body: JSON.stringify({ is_active: newVal }),
                })
                if (res.ok) { const u = await res.json(); setQ(u); onUpdated?.(u) }
              }}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors ${q.is_active === false ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100' : 'border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100'}`}>
              {q.is_active === false ? '✓ Reactivate' : '⊘ Remove'}
            </button>
            <button
              title={q.is_flagged ? 'Unflag' : 'Flag for review (missing instruction, unclear, etc.)'}
              onClick={async () => {
                const res = await fetch(`/api/admin/questions/${q.id}`, {
                  method:'PATCH', headers:{'Content-Type':'application/json'},
                  body: JSON.stringify({ is_flagged: !q.is_flagged }),
                })
                if (res.ok) { const u = await res.json(); setQ(u); onUpdated?.(u) }
              }}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors ${q.is_flagged ? 'border-red-300 text-red-700 bg-red-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {q.is_flagged ? '🚩 Flagged' : '⚑ Flag'}
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-lg font-light leading-none">
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 pb-0 flex-shrink-0 border-b border-gray-100">
          <button onClick={() => setTab('preview')}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${
              tab === 'preview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            👁 Student preview
          </button>
          <button onClick={() => setTab('tag')}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${
              tab === 'tag'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            🏷 Tag topic {q.subtopic_id ? '✓' : ''}
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'preview' ? (
            <ExplanationPreview
              question={q.question_text}
              options={opts}
              correctAnswer={q.correct_answer}
              explanation={q.explanation}
            />
          ) : (
            <TopicTagger
              question={q}
              onSave={handleTagSaved}
              onCancel={() => setTab('preview')}
            />
          )}
        </div>
      </div>
    </>
  )
}

// ── Question row ──────────────────────────────────────────────────────────────
const QuestionRow = memo(function QuestionRow({ question: q, onOpen }) {
  const diffColor   = q.difficulty === 'hard' ? 'red' : q.difficulty === 'easy' ? 'green' : 'amber'
  const sourceColor = q.source === 'past_paper' ? 'indigo' : 'violet'
  const sourceLabel = q.source === 'past_paper' ? 'Past Paper' : 'AI'

  return (
    <div
      className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => onOpen(q)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 leading-snug line-clamp-2">{q.question_text}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {q.subjects?.name  && <Badge color="gray">{q.subjects.name}</Badge>}
            {q.topics?.name    && <span className="text-[10px] text-gray-400">{q.topics.name}</span>}
            {q.subtopics?.name && <span className="text-[10px] text-gray-400">· {q.subtopics.name}</span>}
            <Badge color={diffColor}>{q.difficulty}</Badge>
            <Badge color={sourceColor}>{sourceLabel}</Badge>
            {q.year && <Badge color="gray">{q.year}</Badge>}
            {!q.subtopic_id          && <Badge color="red">Untagged</Badge>}
            {q.is_active === false   && <Badge color="amber">⊘ Inactive</Badge>}
            {q.is_flagged            && <Badge color="red">🚩 Flagged</Badge>}
          </div>
        </div>
        <span className="text-gray-300 text-xs flex-shrink-0 mt-1">›</span>
      </div>
    </div>
  )
})

// ── Batch history ─────────────────────────────────────────────────────────────
function BatchHistory() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/questions/batches')
      .then(r => r.json())
      .then(d => setBatches(d.batches ?? []))
      .catch(() => setBatches([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!batches.length) return (
    <div className="text-center py-10 text-gray-400 text-sm">
      No upload batches yet.{' '}
      <Link href="/admin/questions/upload" className="text-indigo-600 hover:underline">Upload your first batch →</Link>
    </div>
  )
  return (
    <div className="space-y-2">
      {batches.map(b => (
        <div key={b.id} className="flex items-center justify-between px-4 py-3.5 bg-white border border-gray-100 rounded-xl">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900">{b.subject_name ?? '—'}</p>
              <Badge color={b.exam_type === 'WAEC' ? 'indigo' : 'blue'}>{b.exam_type}</Badge>
              <Badge color="gray">{b.source === 'past_paper' ? 'Past Paper' : 'AI'}</Badge>
            </div>
            <p className="text-xs text-gray-400">
              {new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right ml-4 flex-shrink-0">
            <p className="text-sm font-black text-green-600">{b.saved ?? 0} saved</p>
            {(b.errors ?? 0) > 0 && <p className="text-xs text-red-500">{b.errors} errors</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Question list ─────────────────────────────────────────────────────────────
function QuestionList({ source, subjects }) {
  const [questions,      setQuestions]      = useState([])
  const [total,          setTotal]          = useState(0)
  const [loading,        setLoading]        = useState(true)
  const [page,           setPage]           = useState(1)
  const [topics,         setTopics]         = useState([])
  const [selected,       setSelected]       = useState(null)
  const [filterExam,     setFilterExam]     = useState('')
  const [filterSubject,  setFilterSubject]  = useState('')
  const [filterTopic,    setFilterTopic]    = useState('')
  const [filterDiff,     setFilterDiff]     = useState('')
  const [filterYear,     setFilterYear]     = useState('')
  const [filterUntagged, setFilterUntagged] = useState(false)
  const [filterInactive, setFilterInactive] = useState(false)
  const [filterFlagged,  setFilterFlagged]  = useState(false)
  const PER_PAGE = 25
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  // Load topics when subject changes
  useEffect(() => {
    if (!filterSubject) { setTopics([]); setFilterTopic(''); return }
    fetch(`/api/admin/curriculum?subjectId=${filterSubject}`)
      .then(r => r.json())
      .then(d => setTopics(Array.isArray(d) ? d : []))
      .catch(() => setTopics([]))
  }, [filterSubject])

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    p.set('source',  source)
    p.set('page',    String(page))
    p.set('perPage', String(PER_PAGE))
    if (filterExam)     p.set('examType',   filterExam)
    if (filterSubject)  p.set('subjectId',  filterSubject)
    if (filterTopic)    p.set('topicId',    filterTopic)
    if (filterDiff)     p.set('difficulty', filterDiff)
    if (filterYear)     p.set('year',       filterYear)
    if (filterUntagged) p.set('untagged',   'true')
    if (filterInactive) p.set('inactive',   'true')
    if (filterFlagged)  p.set('flagged',    'true')
    fetch(`/api/admin/questions?${p}`)
      .then(r => r.json())
      .then(d => { setQuestions(d.questions ?? []); setTotal(d.total ?? 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [source, page, filterExam, filterSubject, filterTopic, filterDiff, filterYear, filterUntagged, filterInactive, filterFlagged])

  useEffect(() => { load() }, [load])

  // When a question gets tagged, refresh that row in state
  function handleUpdated(updated) {
    setQuestions(qs => qs.map(q => q.id === updated.id ? updated : q))
    setSelected(updated)
  }

  const [yearCounts,    setYearCounts]    = useState({})
  const [deleting,      setDeleting]      = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Load year counts whenever subject + exam filters are set (to detect duplicates)
  useEffect(() => {
    if (!filterSubject || !filterExam) { setYearCounts({}); return }
    const p = new URLSearchParams()
    p.set('source', source)
    p.set('subjectId', filterSubject)
    p.set('examType', filterExam)
    p.set('yearCounts', 'true')
    fetch(`/api/admin/questions?${p}`)
      .then(r => r.json())
      .then(d => setYearCounts(d.yearCounts ?? {}))
      .catch(() => {})
  }, [filterSubject, filterExam, source])

  async function handleDeleteConfirmed() {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const p = new URLSearchParams()
      if (deleteConfirm.subjectId) p.set('subjectId', deleteConfirm.subjectId)
      if (deleteConfirm.examType)  p.set('examType',  deleteConfirm.examType)
      if (deleteConfirm.year)      p.set('year',       deleteConfirm.year)
      p.set('hard', 'true')
      const res = await fetch(`/api/admin/questions/bulk-delete?${p}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      setDeleteConfirm(null)
      setFilterYear(deleteConfirm.year ? '' : filterYear)
      load()
      setYearCounts(prev => {
        const next = { ...prev }
        if (deleteConfirm.year) delete next[deleteConfirm.year]
        return next
      })
    } catch (e) {
      alert('Delete failed: ' + e.message)
    } finally {
      setDeleting(false)
    }
  }

  const yearCountValues  = Object.values(yearCounts).filter(Boolean)
  const medianCount      = yearCountValues.length
    ? yearCountValues.slice().sort((a,b)=>a-b)[Math.floor(yearCountValues.length/2)]
    : 0
  const suspiciousYears  = Object.entries(yearCounts)
    .filter(([, c]) => c > medianCount * 1.7 && c > 30)
    .map(([y]) => y)

  return (
    <>
      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="text-3xl text-center">🗑️</div>
            <p className="font-black text-gray-900 text-center text-base">Delete {deleteConfirm.label}?</p>
            <p className="text-sm text-gray-500 text-center leading-relaxed">
              This will permanently delete <strong>{deleteConfirm.count} questions</strong>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteConfirmed} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-black disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Yes, delete all'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate year warning */}
      {suspiciousYears.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 items-start">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-amber-800">Possible duplicate import detected</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Year{suspiciousYears.length > 1 ? 's' : ''} <strong>{suspiciousYears.join(', ')}</strong> ha{suspiciousYears.length > 1 ? 've' : 's'} far more questions than other years — a year may have been imported twice. Filter by year below and delete the duplicates.
            </p>
          </div>
        </div>
      )}

      {/* Year count overview */}
      {Object.keys(yearCounts).length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-black text-gray-600 mb-2">Questions per year — click to filter · 🗑️ to delete all</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(yearCounts).sort((a,b) => b[0].localeCompare(a[0])).map(([y, c]) => {
              const isSusp = suspiciousYears.includes(y)
              return (
                <div key={y} className={`flex items-center rounded-lg border text-xs font-bold overflow-hidden ${
                  isSusp ? 'border-amber-300' : filterYear === y ? 'border-indigo-400' : 'border-gray-200'
                }`}>
                  <button onClick={() => { setFilterYear(prev => prev === y ? '' : y); setPage(1) }}
                    className={`px-2.5 py-1.5 flex items-center gap-1.5 ${
                      isSusp ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                             : filterYear === y ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}>
                    {y} <span className={`font-black ${isSusp ? 'text-amber-600' : 'text-gray-400'}`}>{c}</span>
                    {isSusp && <span>⚠️</span>}
                  </button>
                  <button
                    title={`Delete all ${c} questions for ${y}`}
                    onClick={() => setDeleteConfirm({ year: y, subjectId: filterSubject, examType: filterExam, count: c, label: `all ${y} questions` })}
                    className="px-2 py-1.5 border-l border-gray-200 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    🗑️
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

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

        <select value={filterDiff} onChange={e => { setFilterDiff(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        {source === 'past_paper' && (
          <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All years</option>
            {Array.from({ length: 25 }, (_, i) => 2025 - i).map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        )}

        <button onClick={() => { setFilterUntagged(u => !u); setPage(1) }}
          className={`text-xs px-3 py-2 rounded-xl border font-medium transition-colors ${
            filterUntagged ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}>
          {filterUntagged ? '✕ Untagged only' : 'Untagged only'}
        </button>
        <button onClick={() => { setFilterInactive(v => !v); setPage(1) }}
          className={`text-xs px-3 py-2 rounded-xl border font-medium transition-colors ${
            filterInactive ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}>
          {filterInactive ? '✕ Inactive only' : '⊘ Inactive'}
        </button>
        <button onClick={() => { setFilterFlagged(v => !v); setPage(1) }}
          className={`text-xs px-3 py-2 rounded-xl border font-medium transition-colors ${
            filterFlagged ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}>
          {filterFlagged ? '✕ Flagged only' : '🚩 Flagged'}
        </button>
      </div>

      {/* Count + delete current filter */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{total.toLocaleString()} question{total !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-3">
          {totalPages > 1 && <span>Page {page}/{totalPages}</span>}
          {total > 0 && filterSubject && filterExam && (
            <button
              onClick={() => setDeleteConfirm({
                year: filterYear || null,
                subjectId: filterSubject,
                examType: filterExam,
                count: total,
                label: filterYear
                  ? `all ${total} questions for ${filterYear}`
                  : `all ${total} questions matching current filters`,
              })}
              className="text-red-500 hover:text-red-700 font-bold border border-red-200 hover:border-red-400 rounded-lg px-2.5 py-1 transition-colors">
              🗑️ Delete {filterYear ? `${filterYear} (${total})` : `all (${total})`}
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-3xl">{source === 'past_paper' ? '📝' : '🤖'}</p>
            <p className="text-gray-500 text-sm">
              {source === 'past_paper' ? 'No past questions found.' : 'No AI-generated questions yet.'}
            </p>
          </div>
        ) : (
          questions.map(q => <QuestionRow key={q.id} question={q} onOpen={setSelected} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 font-medium">← Prev</button>
            <span className="text-xs text-gray-500 font-medium">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 font-medium">Next →</button>
          </div>
        </div>
      )}

      {/* Drawer */}
      {selected && (
        <QuestionDrawer
          question={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QuestionsPage() {
  const [tab,      setTab]      = useState('past')
  const [subjects, setSubjects] = useState([])

  useEffect(() => {
    fetch('/api/admin/subjects?active=true')
      .then(r => r.json())
      .then(data => setSubjects(Array.isArray(data) ? data.filter(s => s.is_active) : []))
  }, [])

  const tabs = [
    { id: 'past',    label: '📝 Past Questions' },
    { id: 'bank',    label: '🤖 AI Generated'   },
    { id: 'history', label: '📦 Upload History' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Questions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Click any question to preview how students see it, or tag it to a curriculum topic.
          </p>
        </div>
        <Link href="/admin/questions/upload"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors shadow-sm whitespace-nowrap">
          ⬆ Upload past questions
        </Link>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'past' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <p className="text-xs text-indigo-700 leading-relaxed">
              <strong>Past questions</strong> are extracted from official WAEC and JAMB exam papers.
              Click any question to preview it or tag it to a topic.
            </p>
          </div>
          <QuestionList source="past_paper" subjects={subjects} />
        </div>
      )}

      {tab === 'bank' && (
        <div className="space-y-4">
          <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
            <p className="text-xs text-violet-700 leading-relaxed">
              <strong>AI-generated questions</strong> supplement past papers for topics with low coverage.
              Click any question to preview it or tag it to a topic.
            </p>
          </div>
          <QuestionList source="ai_generated" subjects={subjects} />
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <BatchHistory />
        </div>
      )}
    </div>
  )
}