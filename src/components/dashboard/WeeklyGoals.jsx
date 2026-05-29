'use client'
// src/components/dashboard/WeeklyGoals.jsx
//
// Dashboard card: shows progress ring + first 3 goals.
// "Manage goals" opens a fullscreen bottom-sheet modal with:
//   - SMART goal suggestions
//   - Full goal list with checkboxes
//   - Add / edit / delete
//   - Progress bar

import { useState, useRef, useEffect, useCallback } from 'react'

// ─── SMART suggestions ────────────────────────────────────────────────────────
const SMART_SUGGESTIONS = [
  { emoji: '📝', text: 'Complete 20 practice questions in Biology' },
  { emoji: '📖', text: 'Revise 3 topics in Chemistry this week' },
  { emoji: '⏱', text: 'Finish 2 timed practice tests' },
  { emoji: '🎯', text: 'Score 70%+ on a Physics mock exam' },
  { emoji: '📚', text: 'Complete 5 lessons across all subjects' },
  { emoji: '✏️', text: 'Solve 30 Maths questions without hints' },
]

// ─── SVG ring ─────────────────────────────────────────────────────────────────
function Ring({ pct, size = 52, stroke = 5 }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, pct / 100)) * circ
  const done = pct >= 100

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={done ? '#16a34a' : '#6366f1'} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  )
}

// ─── Single goal row (used in both card and modal) ────────────────────────────
function GoalRow({ goal, onToggle, onEdit, onDelete, compact = false }) {
  const [editing, setEditing]   = useState(false)
  const [text, setText]         = useState(goal.text)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function handleSave() {
    setEditing(false)
    if (text.trim() && text.trim() !== goal.text) onEdit(goal.id, text.trim())
    else setText(goal.text)
  }

  return (
    <div className={`group flex items-start gap-3 ${compact ? 'py-1.5' : 'py-2.5'}`}>
      {/* Circle checkbox */}
      <button
        onClick={() => onToggle(goal.id, goal.completed)}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          goal.completed
            ? 'bg-indigo-600 border-indigo-600'
            : 'border-gray-300 hover:border-indigo-400'
        }`}
      >
        {goal.completed && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setText(goal.text) } }}
            className="w-full text-sm bg-transparent border-b-2 border-indigo-400 focus:outline-none text-gray-900 font-medium py-0.5"
          />
        ) : (
          <p
            className={`text-sm leading-snug ${goal.completed ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}
            onDoubleClick={() => setEditing(true)}
          >
            {goal.text}
          </p>
        )}
      </div>

      {/* Actions */}
      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => setEditing(true)} className="p-1.5 text-gray-300 hover:text-gray-500 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.5-6.5a2 2 0 112.828 2.828L11.828 13.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
            </svg>
          </button>
          <button onClick={() => onDelete(goal.id)} className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Full-screen goals modal ───────────────────────────────────────────────────
function GoalsModal({ goals, onClose, onToggle, onAdd, onEdit, onDelete }) {
  const [newText, setNewText]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [showInput, setShowInput] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (showInput) inputRef.current?.focus() }, [showInput])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const done  = goals.filter(g => g.completed).length
  const total = goals.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  async function handleAdd(text) {
    if (!text.trim() || saving) return
    setSaving(true)
    await onAdd(text.trim())
    setNewText('')
    setShowInput(false)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={onClose}>
      <div
        className="mt-auto bg-white rounded-t-3xl w-full max-w-lg mx-auto max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-900">Weekly Goals</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {total === 0 ? 'Add your first goal for this week' : `${done} of ${total} complete · resets Monday`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="px-5 mb-4 flex-shrink-0">
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct >= 100 ? '#16a34a' : 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-400">{pct}% complete</span>
              {pct >= 100 && <span className="text-xs font-bold text-green-600">🏆 Week complete!</span>}
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 min-h-0">

          {/* Goals list */}
          {goals.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {goals.map(g => (
                <GoalRow key={g.id} goal={g} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-3xl mb-2">🎯</p>
              <p className="text-sm font-bold text-gray-600">No goals this week yet</p>
              <p className="text-xs text-gray-400 mt-1">Set goals to stay on track</p>
            </div>
          )}

          {/* Add input */}
          {showInput ? (
            <div className="mt-3 mb-2 flex items-center gap-2 bg-indigo-50 rounded-2xl px-4 py-3 border-2 border-indigo-200">
              <input
                ref={inputRef}
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(newText); if (e.key === 'Escape') { setShowInput(false); setNewText('') } }}
                placeholder="Type your goal…"
                maxLength={100}
                className="flex-1 bg-transparent text-sm focus:outline-none text-gray-900 font-medium placeholder:text-indigo-300"
              />
              <button onClick={() => handleAdd(newText)} disabled={saving || !newText.trim()}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors">
                {saving ? '…' : 'Add'}
              </button>
            </div>
          ) : goals.length < 8 && (
            <button
              onClick={() => setShowInput(true)}
              className="mt-3 mb-2 w-full flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-semibold">Add a goal</span>
            </button>
          )}

          {/* SMART suggestions */}
          <div className="mt-4 mb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Suggested goals</p>
            <div className="space-y-2">
              {SMART_SUGGESTIONS.filter(s => !goals.some(g => g.text === s.text)).slice(0, 4).map(s => (
                <button
                  key={s.text}
                  onClick={() => onAdd(s.text)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl text-left hover:bg-indigo-50 hover:border-indigo-100 border border-transparent transition-all"
                >
                  <span className="text-lg flex-shrink-0">{s.emoji}</span>
                  <span className="text-sm text-gray-700 font-medium flex-1">{s.text}</span>
                  <span className="text-indigo-400 text-xs font-bold flex-shrink-0">+ Add</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-6" />
        </div>
      </div>
    </div>
  )
}

// ─── Main exported component ──────────────────────────────────────────────────
export default function WeeklyGoals() {
  const [goals, setGoals]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { fetchGoals() }, [])

  async function fetchGoals() {
    setLoading(true)
    try {
      const res = await fetch('/api/student/weekly-goals')
      const d   = await res.json()
      setGoals(d.goals ?? [])
    } catch { /* non-critical */ }
    finally { setLoading(false) }
  }

  const toggleGoal = useCallback(async (id, current) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !current } : g))
    try {
      await fetch('/api/student/weekly-goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: !current }),
      })
    } catch { setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: current } : g)) }
  }, [])

  const addGoal = useCallback(async (text) => {
    try {
      const res = await fetch('/api/student/weekly-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const d = await res.json()
      if (d.goal) setGoals(prev => [...prev, d.goal])
    } catch { /* non-critical */ }
  }, [])

  const editGoal = useCallback(async (id, text) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, text } : g))
    try {
      await fetch('/api/student/weekly-goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, text }),
      })
    } catch { fetchGoals() }
  }, [])

  const deleteGoal = useCallback(async (id) => {
    setGoals(prev => prev.filter(g => g.id !== id))
    try {
      await fetch('/api/student/weekly-goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch { fetchGoals() }
  }, [])

  const done    = goals.filter(g => g.completed).length
  const total   = goals.length
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0
  const preview = goals.slice(0, 3)

  return (
    <>
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Header row */}
        <div className="flex items-center gap-4 px-5 pt-5 pb-4">
          {/* Ring */}
          <div className="relative flex-shrink-0">
            <Ring pct={pct} size={52} stroke={5} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-[11px] font-black ${pct >= 100 ? 'text-green-600' : 'text-indigo-600'}`}>
                {pct}%
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-gray-900">Weekly Goals</h3>
            <p className="text-xs text-gray-400 mt-0.5 leading-snug">
              {loading ? 'Loading…'
                : total === 0 ? 'No goals yet — tap to set some'
                : pct >= 100 ? '🎉 All done this week!'
                : `${done} of ${total} complete`}
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex-shrink-0 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-colors"
          >
            Manage
          </button>
        </div>

        {/* Preview goals — first 3 */}
        {!loading && preview.length > 0 && (
          <div className="px-5 pb-1 divide-y divide-gray-50">
            {preview.map(goal => (
              <GoalRow key={goal.id} goal={goal} onToggle={toggleGoal} onEdit={editGoal} onDelete={deleteGoal} compact />
            ))}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="px-5 pb-4 space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className="w-5 h-5 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                <div className="h-3 bg-gray-100 rounded animate-pulse flex-1" />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-50 px-5 py-3 flex items-center justify-between">
          {total > 3 ? (
            <button onClick={() => setModalOpen(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-500">
              View all {total} goals →
            </button>
          ) : total === 0 && !loading ? (
            <button onClick={() => setModalOpen(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-500">
              + Set your first goal
            </button>
          ) : <span />}

          {total > 0 && (
            <span className="text-xs text-gray-400">{done}/{total} done</span>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <GoalsModal
          goals={goals}
          onClose={() => setModalOpen(false)}
          onToggle={toggleGoal}
          onAdd={addGoal}
          onEdit={editGoal}
          onDelete={deleteGoal}
        />
      )}
    </>
  )
}