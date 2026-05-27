'use client'

import { useState, useCallback } from 'react'
import { deriveTopicExamType } from '@/lib/curriculumMerger'
import Link from 'next/link'

const TAG_STYLES = {
  WAEC: 'bg-blue-100 text-blue-700 border-blue-200',
  JAMB: 'bg-purple-100 text-purple-700 border-purple-200',
  BOTH: 'bg-green-100 text-green-700 border-green-200',
}

const TAG_LABELS = {
  WAEC: '🟠 WAEC only',
  JAMB: '🔵 JAMB only',
  BOTH: '🟢 Both exams',
}

function SubtopicMergeRow({ subtopic, topicIndex, subIndex, onRetag }) {
  const needsReview = subtopic.needsReview
  const [open, setOpen] = useState(false)

  return (
    <div className={`border-b border-gray-50 last:border-0 ${needsReview ? 'bg-amber-50/50' : ''}`}>
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="text-xs text-gray-300 mt-0.5 flex-shrink-0 w-4">{subIndex + 1}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-900">{subtopic.title}</p>
            {needsReview && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                ⚠ Review suggested
              </span>
            )}
          </div>

          {/* Objectives toggle */}
          {subtopic.objectives?.length > 0 && (
            <button
              onClick={() => setOpen(o => !o)}
              className="text-xs text-indigo-500 hover:underline mt-0.5"
            >
              {open ? 'Hide' : 'Show'} objectives ({subtopic.objectives.length})
            </button>
          )}
          {open && (
            <ul className="mt-1 space-y-0.5">
              {subtopic.objectives.map((obj, oi) => (
                <li key={oi} className="text-xs text-gray-400 flex gap-1.5">
                  <span className="text-indigo-300 flex-shrink-0">·</span>{obj}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tag selector */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {['WAEC', 'BOTH', 'JAMB'].map(tag => (
            <button
              key={tag}
              onClick={() => onRetag(topicIndex, subIndex, tag)}
              className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                subtopic.exam_type === tag
                  ? TAG_STYLES[tag]
                  : 'border-gray-100 text-gray-400 hover:border-gray-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MergeReviewUI({
  subjectId,
  subjectName,
  mergeResult,
  affectedLessons,
  onDone,
}) {
  const [topics, setTopics] = useState(mergeResult.topics)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveResult, setSaveResult] = useState(null)
  const [filter, setFilter] = useState('all')

  // Retag a subtopic and recalculate parent topic's exam_type
  const handleRetag = useCallback((topicIndex, subIndex, newTag) => {
    setTopics(prev => {
      const next = prev.map((topic, ti) => {
        if (ti !== topicIndex) return topic
        const newSubs = topic.subtopics.map((sub, si) => {
          if (si !== subIndex) return sub
          return { ...sub, exam_type: newTag, needsReview: false }
        })
        return {
          ...topic,
          subtopics: newSubs,
          exam_type: deriveTopicExamType(newSubs),
          needsReview: newSubs.some(s => s.needsReview),
        }
      })
      return next
    })
  }, [])

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, mergedTopics: topics }),
      })
      const data = await res.json()
      setSaveResult(data)
      setSaved(true)
    } catch {
      setSaveResult({ errors: ['Network error — try again'] })
    } finally {
      setSaving(false)
    }
  }

  const flaggedCount = topics.reduce(
    (a, t) => a + t.subtopics.filter(s => s.needsReview).length, 0
  )

  const totalSubtopics = topics.reduce((a, t) => a + t.subtopics.length, 0)
  const waecOnly = topics.reduce((a, t) => a + t.subtopics.filter(s => s.exam_type === 'WAEC').length, 0)
  const jambOnly = topics.reduce((a, t) => a + t.subtopics.filter(s => s.exam_type === 'JAMB').length, 0)
  const both     = topics.reduce((a, t) => a + t.subtopics.filter(s => s.exam_type === 'BOTH').length, 0)

  // If saved — show result
  if (saved) {
    return (
      <div className="max-w-3xl">
        <div className="text-center py-8 space-y-4">
          <div className="text-5xl">🎉</div>
          <h2 className="text-2xl font-black text-gray-900">Curricula merged!</h2>
          <p className="text-gray-500 text-sm">
            {saveResult?.topics_saved} topics and {saveResult?.subtopics_saved} subtopics saved.
          </p>

          {saveResult?.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left">
              <p className="text-xs font-bold text-red-700 mb-1">Some errors occurred:</p>
              {saveResult.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">· {e}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-center pt-2">
            <Link
              href={`/admin/curriculum/${subjectId}`}
              className="px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors"
            >
              View merged curriculum →
            </Link>
            <button
              onClick={onDone}
              className="px-6 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Upload another subject
            </button>
          </div>
        </div>
      </div>
    )
  }

  const filteredTopics = topics.filter(topic => {
    if (filter === 'all') return true
    if (filter === 'review') return topic.needsReview || topic.subtopics.some(s => s.needsReview)
    if (filter === 'WAEC') return topic.exam_type === 'WAEC' || topic.subtopics.some(s => s.exam_type === 'WAEC')
    if (filter === 'JAMB') return topic.exam_type === 'JAMB' || topic.subtopics.some(s => s.exam_type === 'JAMB')
    if (filter === 'BOTH') return topic.exam_type === 'BOTH'
    return true
  })

  return (
    <div className="max-w-4xl space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-gray-900">Merge Review — {subjectName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review how WAEC and JAMB curricula were merged. Re-tag subtopics if needed, then confirm.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total subtopics', value: totalSubtopics, color: 'text-gray-800', bg: 'bg-gray-50' },
          { label: '🟢 Both exams', value: both, color: 'text-green-700', bg: 'bg-green-50' },
          { label: '🟠 WAEC only', value: waecOnly, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: '🔵 JAMB only', value: jambOnly, color: 'text-purple-700', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Review warning */}
      {flaggedCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4">
          <p className="text-sm font-bold text-amber-800">
            ⚠️ {flaggedCount} subtopic{flaggedCount > 1 ? 's' : ''} need your review
          </p>
          <p className="text-xs text-amber-600 mt-1">
            These were auto-matched with lower confidence. Check they're tagged correctly before confirming.
          </p>
          <button
            onClick={() => setFilter('review')}
            className="text-xs font-bold text-amber-700 hover:underline mt-1"
          >
            Show only flagged subtopics →
          </button>
        </div>
      )}

      {/* Affected lessons warning */}
      {affectedLessons > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <p className="text-xs text-indigo-700">
            <span className="font-bold">ℹ️ {affectedLessons} subtopics already have lessons.</span>{' '}
            Their lesson content will be preserved. Only their exam tags will be updated.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: `All (${totalSubtopics})` },
          { id: 'BOTH', label: `Both (${both})` },
          { id: 'WAEC', label: `WAEC only (${waecOnly})` },
          { id: 'JAMB', label: `JAMB only (${jambOnly})` },
          ...(flaggedCount > 0 ? [{ id: 'review', label: `⚠ Review (${flaggedCount})` }] : []),
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              filter === f.id
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Topic list */}
      <div className="space-y-2">
        {filteredTopics.map((topic, ti) => {
          const realIndex = topics.findIndex(t => t.title === topic.title)
          const filteredSubs = filter === 'all' ? topic.subtopics :
            filter === 'review' ? topic.subtopics.filter(s => s.needsReview) :
            filter === 'BOTH' ? topic.subtopics.filter(s => s.exam_type === 'BOTH') :
            filter === 'WAEC' ? topic.subtopics.filter(s => s.exam_type === 'WAEC') :
            filter === 'JAMB' ? topic.subtopics.filter(s => s.exam_type === 'JAMB') :
            topic.subtopics

          if (filteredSubs.length === 0) return null

          return (
            <div key={ti} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Topic header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-black flex items-center justify-center flex-shrink-0">
                  {topic.order_index ?? realIndex + 1}
                </span>
                <p className="flex-1 text-sm font-black text-gray-900">{topic.title}</p>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${TAG_STYLES[topic.exam_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {TAG_LABELS[topic.exam_type] ?? topic.exam_type}
                </span>
                <span className="text-xs text-gray-400">
                  {topic.subtopics.length} subtopics
                </span>
              </div>

              {/* Subtopics */}
              <div>
                {filteredSubs.map((sub, si) => {
                  const realSubIndex = topic.subtopics.findIndex(s => s.title === sub.title)
                  return (
                    <SubtopicMergeRow
                      key={si}
                      subtopic={sub}
                      topicIndex={realIndex}
                      subIndex={realSubIndex}
                      onRetag={handleRetag}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirm button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-0 py-4">
        {flaggedCount > 0 && (
          <p className="text-xs text-amber-600 text-center mb-3">
            {flaggedCount} subtopic{flaggedCount > 1 ? 's' : ''} still flagged for review. You can still confirm.
          </p>
        )}
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="w-full py-4 bg-green-600 text-white text-base font-black rounded-2xl disabled:opacity-50 hover:bg-green-500 transition-colors shadow-lg shadow-green-200"
        >
          {saving ? 'Saving merged curriculum...' : `Confirm & save merged curriculum →`}
        </button>
      </div>

    </div>
  )
}