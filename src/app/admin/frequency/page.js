'use client'
// src/app/admin/frequency/page.js
// Topic frequency: which topics of a subject appear most across past papers.
// Ranked by the number of distinct YEARS a topic appeared in (a topic with 40
// questions from one paper is not "frequent"), then by question count.
// The top topics are the pool that weekly battle missions draw from
// (lib/missions.js), so this page shows exactly what students will be given.

import { useState, useEffect, useMemo } from 'react'
import { MISSION_POOL_SIZE, MIN_TOPIC_QUESTIONS, eligibleTopics } from '@/lib/missions'

const EXAMS = ['WAEC', 'JAMB']

function Spinner() {
  return <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
}

export default function FrequencyPage() {
  const [subjects, setSubjects]   = useState([])
  const [exam, setExam]           = useState('WAEC')
  const [subjectId, setSubjectId] = useState('')
  const [result, setResult]       = useState({ key: '', data: null, error: null })
  const [subjectsError, setSubjectsError] = useState(null)

  useEffect(() => {
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(rows => setSubjects(Array.isArray(rows) ? rows.filter(s => s.is_active) : []))
      .catch(() => setSubjectsError('Could not load subjects'))
  }, [])

  const examSubjects = useMemo(() => subjects.filter(s => s.exam_type === exam), [subjects, exam])
  // The picked subject, or the exam's first when the pick belongs to the other exam.
  const activeId = examSubjects.some(s => s.id === subjectId) ? subjectId : (examSubjects[0]?.id ?? '')
  const key = activeId ? `${activeId}:${exam}` : ''

  useEffect(() => {
    if (!key) return
    let live = true
    fetch(`/api/admin/frequency?subjectId=${activeId}&examType=${exam}`)
      .then(async r => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.error || 'Could not load topic frequency')
        return body
      })
      .then(body => { if (live) setResult({ key, data: body, error: null }) })
      .catch(e => { if (live) setResult({ key, data: null, error: e.message }) })
    return () => { live = false }
  }, [key, activeId, exam])

  const loading = !!key && result.key !== key
  const data    = result.key === key ? result.data : null
  const error   = (result.key === key ? result.error : null) ?? subjectsError
  const topics  = useMemo(() => data?.topics ?? [], [data])
  // The pool missions draw from: the same rule as lib/missions.js eligibleTopics.
  const pool = useMemo(() => new Set(eligibleTopics(topics).map(t => t.topic_id)), [topics])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-extrabold text-gray-900">Topic Frequency</h1>
      <p className="text-sm text-gray-500 mt-1">
        How often each topic appears across past papers. Topics are ranked by the number of
        different years they appeared in. The top {MISSION_POOL_SIZE} (marked <b>Mission</b>) are the
        topics students are given as weekly battle missions.
      </p>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <div className="inline-flex rounded-xl bg-gray-100 p-1">
          {EXAMS.map(e => (
            <button key={e} onClick={() => setExam(e)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${exam === e ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
              {e}
            </button>
          ))}
        </div>
        <select value={activeId} onChange={e => setSubjectId(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 min-w-[200px]">
          {!examSubjects.length && <option value="">No {exam} subjects</option>}
          {examSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {data && !loading && (
        <p className="text-xs text-gray-500 mt-4">
          <b className="text-gray-800">{data.total_questions.toLocaleString()}</b> past-paper questions across{' '}
          <b className="text-gray-800">{data.total_years}</b> {data.total_years === 1 ? 'year' : 'years'} ·{' '}
          <b className="text-gray-800">{pool.size}</b> topics ready for missions
        </p>
      )}

      {loading && <div className="flex justify-center py-16"><Spinner /></div>}
      {error && !loading && <p className="mt-6 text-sm text-red-600" role="alert">{error}</p>}
      {data && !loading && !topics.length && <p className="mt-6 text-sm text-gray-500">This subject has no topics yet.</p>}

      {data && !loading && topics.length > 0 && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="hidden sm:grid grid-cols-[40px_1fr_190px_70px_60px_70px] gap-3 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100">
            <span>#</span><span>Topic</span><span>Years it appeared</span>
            <span className="text-right">Questions</span><span className="text-right">Share</span><span className="text-right">In bank</span>
          </div>
          {topics.map(t => {
            const pct = data.total_years ? (t.years_appeared / data.total_years) * 100 : 0
            const inPool = pool.has(t.topic_id)
            const thin = t.past_count > 0 && t.bank_count < MIN_TOPIC_QUESTIONS
            return (
              <div key={t.topic_id}
                className={`grid grid-cols-[32px_1fr] sm:grid-cols-[40px_1fr_190px_70px_60px_70px] gap-x-3 gap-y-1 items-center px-4 py-2.5 border-b border-gray-50 last:border-0 ${inPool ? 'bg-indigo-50/50' : ''}`}>
                <span className="text-xs font-extrabold text-gray-400 tabular-nums">{t.past_count > 0 ? t.rank : '–'}</span>
                <span className="min-w-0 text-sm font-semibold text-gray-800 truncate">
                  {t.topic_name}
                  {inPool && <span className="ml-2 align-middle rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-extrabold text-white">Mission</span>}
                  {thin && <span className="ml-2 align-middle rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800" title={`Needs ${MIN_TOPIC_QUESTIONS}+ questions in the bank`}>Too few questions</span>}
                </span>
                <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${inPool ? 'bg-indigo-500' : 'bg-gray-300'}`} style={{ width: `${t.years_appeared ? Math.max(pct, 3) : 0}%` }} />
                  </div>
                  <span className="w-12 text-right text-[11px] tabular-nums text-gray-500">{t.years_appeared}/{data.total_years}</span>
                </div>
                <span className="hidden sm:block text-right text-sm tabular-nums text-gray-700">{t.past_count}</span>
                <span className="hidden sm:block text-right text-sm tabular-nums text-gray-500">{t.share_pct}%</span>
                <span className="hidden sm:block text-right text-sm tabular-nums text-gray-500">{t.bank_count}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
