'use client'
// src/components/dashboard/WeeklyGoals.jsx
// Polish pass:
// - No card border/outline — cleaner look
// - Edit + delete always visible (not hover-only) — mobile friendly
// - Modal backdrop: solid dark overlay, NOT blurred, so content is readable
// - Inline quick-add stays; Manage still available
// - Simpler header: just gradient bar + goals count

import { useState, useRef, useEffect, useCallback } from 'react'

const SMART_SUGGESTIONS = [
  { emoji: '📝', text: 'Complete 20 practice questions in Biology' },
  { emoji: '📖', text: 'Revise 3 topics in Chemistry this week' },
  { emoji: '⏱', text: 'Finish 2 timed practice tests' },
  { emoji: '🎯', text: 'Score 70%+ on a Physics mock exam' },
  { emoji: '📚', text: 'Complete 5 lessons across all subjects' },
  { emoji: '✏️', text: 'Solve 30 Maths questions without hints' },
]

// ─── Goals management modal ───────────────────────────────────────────────────
function GoalsModal({ goals, onClose, onToggle, onAdd, onEdit, onDelete }) {
  const [newText, setNewText]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText]   = useState('')
  const inputRef = useRef(null)
  const editRef  = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  useEffect(() => { if (showInput)  inputRef.current?.focus() }, [showInput])
  useEffect(() => { if (editingId)  editRef.current?.focus()  }, [editingId])

  const done  = goals.filter(g => g.completed).length
  const total = goals.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  async function handleAdd(text) {
    if (!text?.trim() || saving) return
    setSaving(true)
    await onAdd(text.trim())
    setNewText(''); setShowInput(false); setSaving(false)
  }

  function startEdit(g) { setEditingId(g.id); setEditText(g.text) }
  function saveEdit() {
    if (editText.trim() && editText !== goals.find(g => g.id === editingId)?.text)
      onEdit(editingId, editText.trim())
    setEditingId(null)
  }

  return (
    // Solid overlay — NOT blurred, readable backdrop
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="mt-auto bg-card rounded-t-3xl w-full max-w-lg mx-auto max-h-[82vh] flex flex-col shadow-2xl pb-24"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-subtle" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 flex items-center justify-between flex-shrink-0 border-b border-default">
          <div>
            <h2 className="text-lg font-black text-primary">Weekly Goals</h2>
            <p className="text-xs text-secondary mt-0.5">
              {total === 0 ? 'Set goals to track your week' : `${done}/${total} done · resets Monday`}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-subtle flex items-center justify-center text-secondary hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="px-5 py-3 flex-shrink-0">
            <div className="h-2 bg-subtle rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: pct >= 100 ? '#16a34a' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-secondary">{pct}% complete</span>
              {pct >= 100 && <span className="text-xs font-black text-green-600">🏆 All done!</span>}
            </div>
          </div>
        )}

        {/* Goal list */}
        <div className="flex-1 overflow-y-auto px-5 min-h-0">
          {goals.length === 0 && !showInput && (
            <div className="py-8 text-center">
              <p className="text-3xl mb-2">🎯</p>
              <p className="text-sm font-bold text-primary">No goals yet</p>
              <p className="text-xs text-secondary mt-1">Add a goal or pick a suggestion below</p>
            </div>
          )}

          {goals.length > 0 && (
            <div className="space-y-1 py-2">
              {goals.map(g => (
                <div key={g.id} className="flex items-start gap-3 py-2.5 px-1">
                  {/* Checkbox */}
                  <button onClick={() => onToggle(g.id, g.completed)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      g.completed ? 'bg-indigo-600 border-indigo-600' : 'border-default hover:border-indigo-400'
                    }`}>
                    {g.completed && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Text / edit input */}
                  {editingId === g.id ? (
                    <input ref={editRef} value={editText} onChange={e => setEditText(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      className="flex-1 text-sm bg-subtle border border-indigo-400 rounded-lg px-2 py-1 focus:outline-none text-primary" />
                  ) : (
                    <span className={`flex-1 text-sm leading-relaxed ${g.completed ? 'line-through text-tertiary' : 'text-primary'}`}>
                      {g.text}
                    </span>
                  )}

                  {/* Action buttons — ALWAYS visible on mobile */}
                  {editingId !== g.id && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(g)}
                        className="w-8 h-8 rounded-lg bg-subtle flex items-center justify-center text-secondary hover:text-primary hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.5-6.5a2 2 0 112.828 2.828L11.828 13.828A2 2 0 0110.414 14H8v-2.414a2 2 0 01.586-1.414z" />
                        </svg>
                      </button>
                      <button onClick={() => onDelete(g.id)}
                        className="w-8 h-8 rounded-lg bg-subtle flex items-center justify-center text-secondary hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick add input */}
          {showInput ? (
            <div className="mt-2 mb-3 flex items-center gap-2 rounded-2xl px-4 py-3 border-2 border-indigo-400 bg-subtle">
              <input ref={inputRef} value={newText} onChange={e => setNewText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(newText); if (e.key === 'Escape') { setShowInput(false); setNewText('') } }}
                placeholder="What's your goal this week?" maxLength={100}
                className="flex-1 bg-transparent text-sm focus:outline-none text-primary placeholder:text-tertiary" />
              <button onClick={() => handleAdd(newText)} disabled={saving || !newText.trim()}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-indigo-500">
                {saving ? '…' : 'Add'}
              </button>
            </div>
          ) : goals.length < 10 ? (
            <button onClick={() => setShowInput(true)}
              className="mt-2 mb-3 w-full flex items-center gap-2 px-4 py-3 rounded-2xl text-secondary hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors border border-dashed border-default">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-semibold">Add a goal</span>
            </button>
          ) : null}

          {/* Suggestions */}
          <div className="mb-4">
            <p className="text-xs font-black text-tertiary uppercase tracking-wide mb-2">Suggested goals</p>
            <div className="space-y-1.5">
              {SMART_SUGGESTIONS.filter(s => !goals.some(g => g.text === s.text)).slice(0, 4).map(s => (
                <button key={s.text} onClick={() => onAdd(s.text)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-subtle rounded-2xl text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors">
                  <span className="text-lg flex-shrink-0">{s.emoji}</span>
                  <span className="text-sm text-primary flex-1">{s.text}</span>
                  <span className="text-xs font-bold text-indigo-500 flex-shrink-0">+ Add</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main card ─────────────────────────────────────────────────────────────────
export default function WeeklyGoals() {
  const [goals, setGoals]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [quickAdd, setQuickAdd]   = useState(false)
  const [quickText, setQuickText] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)
  const quickRef = useRef(null)

  useEffect(() => { fetchGoals() }, [])
  useEffect(() => { if (quickAdd) quickRef.current?.focus() }, [quickAdd])

  async function fetchGoals() {
    setLoading(true)
    try { const res = await fetch('/api/student/weekly-goals'); const d = await res.json(); setGoals(d.goals ?? []) }
    catch {}
    finally { setLoading(false) }
  }

  const toggleGoal = useCallback(async (id, current) => {
    setGoals(p => p.map(g => g.id === id ? { ...g, completed: !current } : g))
    try {
      await fetch('/api/student/weekly-goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, completed: !current }) })
    } catch { setGoals(p => p.map(g => g.id === id ? { ...g, completed: current } : g)) }
  }, [])

  const addGoal = useCallback(async (text) => {
    try {
      const res = await fetch('/api/student/weekly-goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      const d = await res.json()
      if (d.goal) setGoals(p => [...p, d.goal])
    } catch {}
  }, [])

  const editGoal = useCallback(async (id, text) => {
    setGoals(p => p.map(g => g.id === id ? { ...g, text } : g))
    try { await fetch('/api/student/weekly-goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, text }) }) }
    catch { fetchGoals() }
  }, [])

  const deleteGoal = useCallback(async (id) => {
    setGoals(p => p.filter(g => g.id !== id))
    try { await fetch('/api/student/weekly-goals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }) }
    catch { fetchGoals() }
  }, [])

  async function handleQuickAdd() {
    if (!quickText.trim() || quickSaving) return
    setQuickSaving(true)
    await addGoal(quickText.trim())
    setQuickText(''); setQuickAdd(false); setQuickSaving(false)
  }

  const done    = goals.filter(g => g.completed).length
  const total   = goals.length
  const goalPct = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total
  const preview = goals.slice(0, 3)

  return (
    <>
      {/* No border — removed outline */}
      <div className="bg-card rounded-3xl overflow-hidden">

        {/* Gradient header */}
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 px-5 pt-4 pb-5">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">This week</p>
              <p className="text-white font-black text-xl leading-tight">
                {total === 0 ? 'Set your goals' : allDone ? 'All done! 🎉' : `${done} of ${total} done`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Weekly goals</p>
              <p className="text-white font-black text-lg">{total === 0 ? '—' : `${done}/${total}`}</p>
            </div>
          </div>

          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: total === 0 ? '0%' : `${goalPct}%`, background: allDone ? '#4ade80' : '#ffffff' }} />
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <p className="text-white/60 text-xs">
              {total === 0 ? 'Tap + to add your first goal'
                : allDone ? '🏆 Week complete!'
                : `${total - done} goal${total - done !== 1 ? 's' : ''} left`}
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuickAdd(q => !q)}
                className="text-white/80 text-xs font-bold hover:text-white transition-colors flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
              <span className="text-white/30">·</span>
              <button onClick={() => setModalOpen(true)}
                className="text-white/80 text-xs font-bold hover:text-white transition-colors underline underline-offset-2">
                Manage
              </button>
            </div>
          </div>
        </div>

        {/* Quick-add inline */}
        {quickAdd && (
          <div className="px-5 py-3 border-b border-default flex items-center gap-2">
            <input ref={quickRef} value={quickText} onChange={e => setQuickText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); if (e.key === 'Escape') { setQuickAdd(false); setQuickText('') } }}
              placeholder="What's your goal this week?" maxLength={100}
              className="flex-1 text-sm bg-transparent focus:outline-none text-primary placeholder:text-tertiary" />
            <button onClick={handleQuickAdd} disabled={quickSaving || !quickText.trim()}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-indigo-500">
              {quickSaving ? '…' : 'Add'}
            </button>
            <button onClick={() => { setQuickAdd(false); setQuickText('') }}
              className="p-1.5 text-tertiary hover:text-secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Preview goals */}
        {!loading && preview.length > 0 && (
          <div className="px-5 py-3 space-y-2.5 border-b border-default">
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
                <span className={`text-sm flex-1 leading-snug ${goal.completed ? 'line-through text-tertiary' : 'text-primary'}`}>
                  {goal.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="px-5 py-4 space-y-2.5 border-b border-default animate-pulse">
            {[1,2].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-subtle flex-shrink-0" />
                <div className="h-3 bg-subtle rounded flex-1" />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between">
          {total === 0 && !loading
            ? <button onClick={() => setQuickAdd(true)} className="text-xs font-bold text-indigo-500 hover:text-indigo-400">+ Set your first goal</button>
            : total > 3
            ? <button onClick={() => setModalOpen(true)} className="text-xs font-bold text-indigo-500 hover:text-indigo-400">View all {total} goals →</button>
            : <span />}
          {allDone && total > 0 && <span className="text-xs font-black text-green-600">All done! 🏆</span>}
          {!allDone && total > 0 && <span className="text-xs text-tertiary">Resets Monday</span>}
        </div>
      </div>

      {modalOpen && (
        <GoalsModal goals={goals} onClose={() => setModalOpen(false)}
          onToggle={toggleGoal} onAdd={addGoal} onEdit={editGoal} onDelete={deleteGoal} />
      )}
    </>
  )
}