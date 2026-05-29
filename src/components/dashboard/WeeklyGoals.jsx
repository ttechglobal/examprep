'use client'
// src/components/dashboard/WeeklyGoals.jsx
// Unified Level + Weekly Goals card.
// XP bar fills as goals are completed. Students set their own goals.
// "Manage" → bottom-sheet modal with SMART suggestions.

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

const XP_PER_GOAL = 40
const XP_PER_LEVEL = 300

const SMART_SUGGESTIONS = [
  { emoji: '📝', text: 'Complete 20 practice questions in Biology' },
  { emoji: '📖', text: 'Revise 3 topics in Chemistry this week' },
  { emoji: '⏱', text: 'Finish 2 timed practice tests' },
  { emoji: '🎯', text: 'Score 70%+ on a Physics mock exam' },
  { emoji: '📚', text: 'Complete 5 lessons across all subjects' },
  { emoji: '✏️', text: 'Solve 30 Maths questions without hints' },
]

// ─── Modal ────────────────────────────────────────────────────────────────────
function GoalsModal({ goals, onClose, onToggle, onAdd, onEdit, onDelete }) {
  const [newText, setNewText]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText]   = useState('')
  const inputRef = useRef(null)
  const editRef  = useRef(null)

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => { if (showInput) inputRef.current?.focus() }, [showInput])
  useEffect(() => { if (editingId) editRef.current?.focus() }, [editingId])

  const done  = goals.filter(g => g.completed).length
  const total = goals.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  async function handleAdd(text) {
    if (!text?.trim() || saving) return
    setSaving(true)
    await onAdd(text.trim())
    setNewText('')
    setShowInput(false)
    setSaving(false)
  }

  function startEdit(goal) { setEditingId(goal.id); setEditText(goal.text) }
  function saveEdit() {
    if (editText.trim() && editText.trim() !== goals.find(g => g.id === editingId)?.text) {
      onEdit(editingId, editText.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="mt-auto bg-card rounded-t-3xl w-full max-w-lg mx-auto max-h-[88vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-subtle" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-primary">Weekly Goals</h2>
            <p className="text-xs text-secondary mt-0.5">
              {total === 0 ? 'Set goals to earn XP and level up'
                : `${done}/${total} done · resets Monday`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-subtle text-secondary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="px-5 mb-3 flex-shrink-0">
            <div className="h-2.5 bg-subtle rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: pct >= 100 ? '#16a34a' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-secondary">{pct}% this week</span>
              {pct >= 100 && <span className="text-xs font-black text-green-600">🏆 Week complete!</span>}
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 min-h-0">
          {/* Goal rows */}
          {goals.length > 0 ? (
            <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
              {goals.map(g => (
                <div key={g.id} className="group flex items-start gap-3 py-3">
                  <button
                    onClick={() => onToggle(g.id, g.completed)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      g.completed ? 'bg-indigo-600 border-indigo-600' : 'border-default hover:border-indigo-400'
                    }`}
                  >
                    {g.completed && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  {editingId === g.id ? (
                    <input ref={editRef} value={editText} onChange={e => setEditText(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      className="flex-1 text-sm bg-transparent border-b-2 border-indigo-400 focus:outline-none text-primary font-medium py-0.5" />
                  ) : (
                    <span className={`flex-1 text-sm font-medium cursor-pointer ${g.completed ? 'line-through text-tertiary' : 'text-primary'}`}
                      onDoubleClick={() => startEdit(g)}>{g.text}</span>
                  )}
                  {editingId !== g.id && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(g)} className="p-1.5 text-tertiary hover:text-secondary rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.5-6.5a2 2 0 112.828 2.828L11.828 13.828A2 2 0 0110.414 14H8v-2.414a2 2 0 01.586-1.414z" />
                        </svg>
                      </button>
                      <button onClick={() => onDelete(g.id)} className="p-1.5 text-tertiary hover:text-red-400 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-3xl mb-2">🎯</p>
              <p className="text-sm font-bold text-primary">No goals yet</p>
              <p className="text-xs text-secondary mt-1">Set goals to earn XP as you complete them</p>
            </div>
          )}

          {/* Add input */}
          {showInput ? (
            <div className="mt-3 mb-2 flex items-center gap-2 rounded-2xl px-4 py-3 border-2 border-indigo-400 bg-subtle">
              <input ref={inputRef} value={newText} onChange={e => setNewText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(newText); if (e.key === 'Escape') { setShowInput(false); setNewText('') } }}
                placeholder="Type your goal…" maxLength={100}
                className="flex-1 bg-transparent text-sm focus:outline-none text-primary font-medium placeholder:text-tertiary" />
              <button onClick={() => handleAdd(newText)} disabled={saving || !newText.trim()}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors">
                {saving ? '…' : 'Add'}
              </button>
            </div>
          ) : goals.length < 10 ? (
            <button onClick={() => setShowInput(true)}
              className="mt-3 mb-2 w-full flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-2xl text-secondary hover:border-indigo-400 hover:text-indigo-500 transition-colors"
              style={{ borderColor: 'var(--border-default)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-semibold">Add a goal</span>
            </button>
          ) : null}

          {/* SMART suggestions */}
          <div className="mt-4 mb-2">
            <p className="text-xs font-black text-tertiary uppercase tracking-wide mb-2">Suggested goals</p>
            <div className="space-y-2">
              {SMART_SUGGESTIONS.filter(s => !goals.some(g => g.text === s.text)).slice(0, 4).map(s => (
                <button key={s.text} onClick={() => onAdd(s.text)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-subtle rounded-2xl text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700">
                  <span className="text-lg flex-shrink-0">{s.emoji}</span>
                  <span className="text-sm text-primary font-medium flex-1">{s.text}</span>
                  <span className="text-xs font-bold text-indigo-500 flex-shrink-0">+ Add</span>
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

// ─── Main card ────────────────────────────────────────────────────────────────
export default function WeeklyGoals({ bonusXP = 0 }) {
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
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: !current }),
      })
    } catch { setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: current } : g)) }
  }, [])

  const addGoal = useCallback(async (text) => {
    try {
      const res = await fetch('/api/student/weekly-goals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, text }),
      })
    } catch { fetchGoals() }
  }, [])

  const deleteGoal = useCallback(async (id) => {
    setGoals(prev => prev.filter(g => g.id !== id))
    try {
      await fetch('/api/student/weekly-goals', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch { fetchGoals() }
  }, [])

  const done  = goals.filter(g => g.completed).length
  const total = goals.length

  // XP calculation: each completed goal = XP_PER_GOAL + bonusXP from lessons/practice
  const xp        = done * XP_PER_GOAL + bonusXP
  const level     = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpInLevel = xp % XP_PER_LEVEL
  const xpPct     = Math.min(100, Math.round((xpInLevel / XP_PER_LEVEL) * 100))
  const goalPct   = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone   = total > 0 && done === total

  const preview = goals.slice(0, 3)

  return (
    <>
      <div className="bg-card rounded-3xl border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>

        {/* XP / Level bar */}
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 px-5 pt-4 pb-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Level {level}</p>
              <p className="text-white font-black text-xl leading-tight">{xp} XP</p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs">Weekly goals</p>
              <p className="text-white font-black text-base">{done}/{total || '–'}</p>
            </div>
          </div>

          {/* Combined XP + goals bar */}
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            {total > 0 ? (
              <div className="h-full rounded-full transition-all duration-700 bg-white"
                style={{ width: `${goalPct}%` }} />
            ) : (
              <div className="h-full rounded-full transition-all duration-700 bg-white/50"
                style={{ width: `${xpPct}%` }} />
            )}
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <p className="text-white/60 text-xs">
              {total > 0
                ? allDone ? '🎉 Week complete!' : `${total - done} goals left this week`
                : `${xpInLevel}/${XP_PER_LEVEL} XP to Level ${level + 1}`}
            </p>
            <button onClick={() => setModalOpen(true)}
              className="text-white/80 text-xs font-bold hover:text-white transition-colors underline underline-offset-2">
              Manage goals
            </button>
          </div>
        </div>

        {/* Goals preview */}
        {!loading && preview.length > 0 && (
          <div className="px-5 py-3 space-y-2.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
            {preview.map(goal => (
              <div key={goal.id} className="flex items-center gap-3">
                <button onClick={() => toggleGoal(goal.id, goal.completed)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    goal.completed ? 'bg-indigo-600 border-indigo-600' : 'border-default hover:border-indigo-400'
                  }`}>
                  {goal.completed && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className={`text-sm font-medium flex-1 ${goal.completed ? 'line-through text-tertiary' : 'text-primary'}`}>
                  {goal.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="px-5 py-4 space-y-2.5 border-b" style={{ borderColor: 'var(--border-default)' }}>
            {[1,2].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-subtle animate-pulse flex-shrink-0" />
                <div className="h-3 bg-subtle rounded animate-pulse flex-1" />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between">
          {total === 0 && !loading ? (
            <button onClick={() => setModalOpen(true)} className="text-xs font-bold text-indigo-500 hover:text-indigo-400 transition-colors">
              + Set your first goal
            </button>
          ) : total > 3 ? (
            <button onClick={() => setModalOpen(true)} className="text-xs font-bold text-indigo-500 hover:text-indigo-400 transition-colors">
              View all {total} goals →
            </button>
          ) : <span />}
          {total > 0 && !allDone && (
            <span className="text-xs text-tertiary">Each goal = +{XP_PER_GOAL} XP</span>
          )}
          {allDone && <span className="text-xs font-black text-green-600">All done! 🏆</span>}
        </div>
      </div>

      {modalOpen && (
        <GoalsModal goals={goals} onClose={() => setModalOpen(false)}
          onToggle={toggleGoal} onAdd={addGoal} onEdit={editGoal} onDelete={deleteGoal} />
      )}
    </>
  )
}