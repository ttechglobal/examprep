'use client'
// src/components/dashboard/WeeklyGoals.jsx

import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  'Solve 50 Practice Questions',
  'Complete 3 Lessons',
  'Revise Organic Chemistry',
  'Finish 1 Mock Exam',
  'Watch 2 Video Lessons',
]

export default function WeeklyGoals() {
  const [goals, setGoals]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [adding, setAdding]       = useState(false)
  const [newText, setNewText]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText]   = useState('')
  const inputRef = useRef(null)
  const editRef  = useRef(null)

  useEffect(() => { fetchGoals() }, [])
  useEffect(() => { if (adding) inputRef.current?.focus() }, [adding])
  useEffect(() => { if (editingId) editRef.current?.focus() }, [editingId])

  async function fetchGoals() {
    setLoading(true)
    try {
      const res  = await fetch('/api/student/weekly-goals')
      const data = await res.json()
      setGoals(data.goals ?? [])
    } catch { /* non-critical */ } finally { setLoading(false) }
  }

  async function addGoal(text) {
    if (!text?.trim() || saving) return
    setSaving(true)
    try {
      const res  = await fetch('/api/student/weekly-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const data = await res.json()
      if (data.goal) setGoals(prev => [...prev, data.goal])
    } finally { setSaving(false); setNewText(''); setAdding(false) }
  }

  async function toggleGoal(id, current) {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !current } : g))
    try {
      await fetch('/api/student/weekly-goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: !current }),
      })
    } catch {
      setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: current } : g))
    }
  }

  async function saveEdit(id) {
    if (!editText?.trim()) { setEditingId(null); return }
    const original = goals.find(g => g.id === id)?.text
    setGoals(prev => prev.map(g => g.id === id ? { ...g, text: editText.trim() } : g))
    setEditingId(null)
    try {
      await fetch('/api/student/weekly-goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, text: editText.trim() }),
      })
    } catch {
      setGoals(prev => prev.map(g => g.id === id ? { ...g, text: original } : g))
    }
  }

  async function deleteGoal(id) {
    setGoals(prev => prev.filter(g => g.id !== id))
    try {
      await fetch('/api/student/weekly-goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch { fetchGoals() }
  }

  const completed = goals.filter(g => g.completed).length
  const total     = goals.length
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
  const allDone   = total > 0 && completed === total

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-gray-900 text-sm">Weekly Goals</h3>
          {total > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {allDone ? '🎉 All done this week!' : `${completed} of ${total} complete`}
            </p>
          )}
        </div>
        {total < 8 && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            <span className="text-base leading-none">+</span> Add goal
          </button>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              allDone
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="w-5 h-5 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
              <div className="h-3 bg-gray-100 rounded animate-pulse flex-1" />
            </div>
          ))}
        </div>
      )}

      {/* Goals list */}
      {!loading && goals.length > 0 && (
        <div className="space-y-1">
          {goals.map(goal => (
            <div
              key={goal.id}
              className="group flex items-center gap-3 py-1.5 rounded-xl px-1 hover:bg-gray-50 transition-colors"
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleGoal(goal.id, goal.completed)}
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  goal.completed
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'border-gray-300 hover:border-indigo-400'
                }`}
              >
                {goal.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Text */}
              {editingId === goal.id ? (
                <input
                  ref={editRef}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveEdit(goal.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onBlur={() => saveEdit(goal.id)}
                  className="flex-1 text-sm bg-transparent border-b border-indigo-400 focus:outline-none py-0.5 text-gray-900"
                />
              ) : (
                <span className={`flex-1 text-sm leading-snug ${goal.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {goal.text}
                </span>
              )}

              {/* Actions on hover */}
              {editingId !== goal.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingId(goal.id); setEditText(goal.text) }}
                    className="p-1 text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state + suggestions */}
      {!loading && total === 0 && !adding && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            Set goals for this week — they reset every Monday. Try one:
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => addGoal(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 font-medium hover:bg-indigo-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add input */}
      {adding && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') addGoal(newText)
              if (e.key === 'Escape') { setAdding(false); setNewText('') }
            }}
            placeholder="e.g. Revise Trigonometry"
            maxLength={80}
            className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
          />
          <button
            onClick={() => addGoal(newText)}
            disabled={saving || !newText.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-500 disabled:opacity-40 transition-colors"
          >
            {saving ? '…' : 'Add'}
          </button>
          <button
            onClick={() => { setAdding(false); setNewText('') }}
            className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}