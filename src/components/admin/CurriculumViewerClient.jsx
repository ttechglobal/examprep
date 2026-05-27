'use client'

import { useState } from 'react'
import Link from 'next/link'
import { buildSingleTopicPrompt, parseSingleTopic } from '@/lib/curriculumParser'

const EXAM_COLORS = {
  WAEC: 'bg-blue-100 text-blue-700 border-blue-200',
  JAMB: 'bg-purple-100 text-purple-700 border-purple-200',
  BOTH: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

const STATUS_COLORS = {
  published: 'bg-green-100 text-green-700',
  in_review: 'bg-blue-100 text-blue-700',
  draft:     'bg-gray-100 text-gray-500',
}

function SingleTopicUploader({ subject, topic, examType, onSaved }) {
  const [rawJson, setRawJson] = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const prompt = buildSingleTopicPrompt(subject.name, examType ?? subject.exam_type, topic.name)

  const handlePaste = (value) => {
    setRawJson(value)
    if (value.trim().length > 10) {
      setParseResult(parseSingleTopic(value))
    } else {
      setParseResult(null)
    }
  }

  const handleSave = async () => {
    if (!parseResult?.valid) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/curriculum/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: subject.id,
          topicId: topic.id,
          topicTitle: topic.name,
          examType: examType ?? subject.exam_type,
          subtopics: parseResult.data.subtopics,
          orderIndex: topic.order_index,
        }),
      })
      const data = await res.json()
      if (data.subtopicsSaved > 0) {
        setSaved(true)
        onSaved?.(data)
      }
    } catch {
      // handle error
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
        <p className="text-sm font-bold text-green-700">✓ Topic uploaded successfully</p>
      </div>
    )
  }

  return (
    <div className="border border-indigo-200 rounded-2xl overflow-hidden bg-white">
      <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
            Upload: {topic.name}
          </p>
          <button
            onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              copied ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy Prompt'}
          </button>
        </div>
        <p className="text-xs text-indigo-600 mt-1">
          Copy the prompt → paste into Claude with the syllabus PDF → paste the JSON response below
        </p>
      </div>

      <div className="p-4 space-y-3">
        <textarea
          value={rawJson}
          onChange={e => handlePaste(e.target.value)}
          rows={6}
          className="w-full font-mono text-xs p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder='Paste JSON response here...'
          spellCheck={false}
        />

        {parseResult && (
          <div className={`p-2.5 rounded-lg text-xs ${
            parseResult.valid ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {parseResult.valid ? (
              <p className="font-bold">✓ {parseResult.stats.subtopicCount} subtopics ready</p>
            ) : (
              <ul className="space-y-0.5">
                {parseResult.errors.map((e, i) => <li key={i}>· {e}</li>)}
              </ul>
            )}
          </div>
        )}

        {parseResult?.valid && (
          <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-50 rounded-xl p-3">
            {parseResult.data.subtopics.map((sub, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="text-gray-400 flex-shrink-0">{i + 1}.</span>
                <span>{sub.title ?? sub.name}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !parseResult?.valid}
          className="w-full py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
        >
          {saving ? 'Saving...' : `Save ${parseResult?.stats?.subtopicCount ?? 0} subtopics →`}
        </button>
      </div>
    </div>
  )
}

export default function CurriculumViewerClient({ subject, topics: initialTopics }) {
  const [topics, setTopics] = useState(initialTopics)
  const [expandedTopics, setExpandedTopics] = useState(new Set())
  const [filterExam, setFilterExam] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterIssues, setFilterIssues] = useState(false)
  const [search, setSearch] = useState('')
  const [uploadingTopic, setUploadingTopic] = useState(null)

  const toggleTopic = (id) => {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const expandAll = () => setExpandedTopics(new Set(topics.map(t => t.id)))
  const collapseAll = () => setExpandedTopics(new Set())

  // Stats
  const allSubtopics = topics.flatMap(t => t.subtopics ?? [])
  const published   = allSubtopics.filter(s => s.lesson_status === 'published').length
  const inReview    = allSubtopics.filter(s => s.lesson_status === 'in_review').length
  const draft       = allSubtopics.filter(s => s.lesson_status === 'draft').length
  const pct = allSubtopics.length > 0
    ? Math.round((published / allSubtopics.length) * 100) : 0

  // Topics missing subtopics
  const topicsWithNoSubtopics = topics.filter(t => (t.subtopics ?? []).length === 0)
  const hasIssues = topicsWithNoSubtopics.length > 0

  // Filter
  const filteredTopics = topics
    .map(topic => {
      const filteredSubs = (topic.subtopics ?? []).filter(sub => {
        const matchExam   = filterExam === 'ALL' || sub.exam_type === filterExam
        const matchStatus = filterStatus === 'all' || sub.lesson_status === filterStatus
        const matchSearch = !search || sub.name.toLowerCase().includes(search.toLowerCase()) || topic.name.toLowerCase().includes(search.toLowerCase())
        return matchExam && matchStatus && matchSearch
      })
      return { ...topic, subtopics: filteredSubs }
    })
    .filter(topic => {
      if (filterIssues) return (topic.subtopics?.length ?? 0) === 0
      const examMatch = filterExam === 'ALL' || topic.exam_type === filterExam || topic.subtopics.length > 0
      const searchMatch = !search || topic.subtopics.length > 0 || topic.name.toLowerCase().includes(search.toLowerCase())
      return examMatch && searchMatch
    })

  const handleTopicSaved = (topicId, data) => {
    setUploadingTopic(null)
    // Reload page to reflect new subtopics
    window.location.reload()
  }

  return (
    <div className="space-y-5">

      {/* Subject header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-gray-900">{subject.name}</h2>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${EXAM_COLORS[subject.exam_type]}`}>
                {subject.exam_type}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {topics.length} topics · {allSubtopics.length} subtopics
            </p>
          </div>
          <Link
            href="/admin/curriculum/upload"
            className="text-xs font-bold px-3 py-2 border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Upload new
          </Link>
        </div>

        {/* Lesson completion */}
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-green-600 font-medium">✓ {published} published</span>
          {inReview > 0 && <span className="text-blue-600 font-medium">● {inReview} in review</span>}
          {draft > 0 && <span className="text-gray-400">○ {draft} draft</span>}
          <span className="ml-auto text-gray-400 font-bold">{pct}% lessons complete</span>
        </div>

        {/* Upload health */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          {hasIssues ? (
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-amber-700">
                ⚠ {topicsWithNoSubtopics.length} topic{topicsWithNoSubtopics.length > 1 ? 's' : ''} missing subtopics
              </p>
              <button
                onClick={() => setFilterIssues(true)}
                className="text-xs text-amber-700 hover:underline font-bold"
              >
                View issues →
              </button>
            </div>
          ) : allSubtopics.length > 0 ? (
            <p className="text-xs text-green-600 font-bold">
              ✅ Curriculum complete — {topics.length}/{topics.length} topics uploaded, ready for lesson generation
            </p>
          ) : (
            <p className="text-xs text-gray-400">No subtopics uploaded yet.</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search topics or subtopics..."
          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <div className="flex gap-2 flex-wrap">
          <select value={filterExam} onChange={e => setFilterExam(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="ALL">All exams</option>
            <option value="WAEC">WAEC only</option>
            <option value="JAMB">JAMB only</option>
            <option value="BOTH">Both</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="all">All status</option>
            <option value="published">Published</option>
            <option value="in_review">In review</option>
            <option value="draft">Draft</option>
          </select>
          <button
            onClick={() => setFilterIssues(f => !f)}
            className={`text-xs px-3 py-2.5 rounded-xl border font-medium transition-colors ${
              filterIssues
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {filterIssues ? '✓ ' : ''}Issues only
          </button>
        </div>
      </div>

      {/* Expand/collapse */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {filteredTopics.length} topics · {filteredTopics.reduce((a, t) => a + t.subtopics.length, 0)} subtopics
        </p>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs text-indigo-600 hover:underline font-medium">Expand all</button>
          <span className="text-gray-300">·</span>
          <button onClick={collapseAll} className="text-xs text-gray-400 hover:underline">Collapse all</button>
        </div>
      </div>

      {/* Topic list */}
      <div className="space-y-2">
        {filteredTopics.map((topic) => {
          const subtopicCount = topic.subtopics?.length ?? 0
          const pubCount = topic.subtopics?.filter(s => s.lesson_status === 'published').length ?? 0
          const hasMissingSubtopics = subtopicCount === 0
          const topicPct = subtopicCount > 0
            ? Math.round((pubCount / subtopicCount) * 100) : 0
          const isUploadingThis = uploadingTopic === topic.id

          return (
            <div key={topic.id} className={`bg-white rounded-2xl border overflow-hidden ${
              hasMissingSubtopics ? 'border-amber-300' : 'border-gray-200'
            }`}>

              {/* Topic header */}
              <button
                onClick={() => toggleTopic(topic.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-black flex items-center justify-center flex-shrink-0">
                  {topic.order_index}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-900 truncate">{topic.name}</p>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${EXAM_COLORS[topic.exam_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {topic.exam_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs mt-0.5">
                    {hasMissingSubtopics ? (
                      <span className="text-amber-600 font-bold">⚠ No subtopics</span>
                    ) : (
                      <>
                        <span className="text-gray-400">{subtopicCount} subtopics</span>
                        <span className="text-green-600 font-medium">{pubCount} published</span>
                        {subtopicCount - pubCount > 0 && (
                          <span className="text-amber-500">{subtopicCount - pubCount} pending</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasMissingSubtopics ? (
                    <button
                      onClick={e => { e.stopPropagation(); setUploadingTopic(isUploadingThis ? null : topic.id) }}
                      className="text-xs font-bold px-3 py-1.5 border border-amber-300 text-amber-700 rounded-xl hover:bg-amber-50 transition-colors"
                    >
                      {isUploadingThis ? 'Cancel' : 'Upload this topic →'}
                    </button>
                  ) : (
                    <>
                      <div className="w-12">
                        <div className="h-1.5 bg-gray-100 rounded-full">
                          <div
                            className={`h-full rounded-full ${topicPct === 100 ? 'bg-green-500' : 'bg-indigo-400'}`}
                            style={{ width: `${topicPct}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-xs font-bold ${topicPct === 100 ? 'text-green-600' : 'text-gray-400'}`}>
                        {topicPct}%
                      </span>
                    </>
                  )}
                  <span className={`text-gray-300 text-xs transition-transform duration-200 ${expandedTopics.has(topic.id) ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>

              {/* Single topic uploader */}
              {isUploadingThis && (
                <div className="border-t border-amber-100 p-4">
                  <SingleTopicUploader
                    subject={subject}
                    topic={topic}
                    examType={subject.exam_type}
                    onSaved={(data) => handleTopicSaved(topic.id, data)}
                  />
                </div>
              )}

              {/* Subtopics */}
              {expandedTopics.has(topic.id) && !hasMissingSubtopics && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {topic.subtopics.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4 italic">
                      No subtopics match your filters.
                    </p>
                  ) : (
                    topic.subtopics.map((subtopic) => (
                      <div key={subtopic.id} className="px-4 py-3.5 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-gray-300 mt-0.5 w-4 flex-shrink-0">
                            {subtopic.order_index}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-900">{subtopic.name}</p>
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${EXAM_COLORS[subtopic.exam_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                {subtopic.exam_type}
                              </span>
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[subtopic.lesson_status]}`}>
                                {subtopic.lesson_status}
                              </span>
                              {subtopic.lesson_generated
                                ? <span className="text-xs text-green-600 font-medium">Lesson ✅</span>
                                : <span className="text-xs text-amber-500">No lesson ⏳</span>
                              }
                            </div>
                            {subtopic.objectives?.length > 0 && (
                              <ul className="mt-1.5 space-y-0.5">
                                {subtopic.objectives.slice(0, 2).map((obj, oi) => (
                                  <li key={oi} className="text-xs text-gray-400 flex items-start gap-1.5">
                                    <span className="text-indigo-300 flex-shrink-0 mt-0.5">·</span>
                                    {obj}
                                  </li>
                                ))}
                                {subtopic.objectives.length > 2 && (
                                  <li className="text-xs text-gray-300 pl-3">
                                    +{subtopic.objectives.length - 2} more objectives
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>

                          <Link
                            href={`/admin/curriculum/${subject.slug}/${topic.slug}/${subtopic.id}`}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-colors flex-shrink-0 ${
                              subtopic.lesson_generated
                                ? 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                                : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            {subtopic.lesson_generated ? 'Edit' : 'Create lesson'}
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filteredTopics.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No topics match your filters.
          </div>
        )}
      </div>
    </div>
  )
}