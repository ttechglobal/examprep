'use client'
// src/components/dashboard/WeeklyGoals.jsx
// Renamed "This Week" → "Weekly Learning Goals"
// Full light/dark: all hardcoded colors replaced with CSS token classes
// Divider lines dimmed; refined visual polish throughout

import { useState, useRef, useEffect, useCallback } from 'react'

const SMART_SUGGESTIONS = [
  { emoji: '📝', text: 'Complete 20 practice questions in Biology' },
  { emoji: '📖', text: 'Revise 3 topics in Chemistry this week' },
  { emoji: '⏱',  text: 'Finish 2 timed practice tests' },
  { emoji: '🎯', text: 'Score 70%+ on a Physics mock exam' },
  { emoji: '📚', text: 'Complete 5 lessons across all subjects' },
  { emoji: '✏️', text: 'Solve 30 Maths questions without hints' },
]

let _goalsCache = null

// ─── Bottom-sheet modal ────────────────────────────────────────────────────────
function GoalsModal({ goals, onClose, onToggle, onAdd, onEdit, onDelete }) {
  const [newText,   setNewText]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText,  setEditText]  = useState('')
  const inputRef = useRef(null)
  const editRef  = useRef(null)

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => { if (showInput) inputRef.current?.focus() }, [showInput])
  useEffect(() => { if (editingId) editRef.current?.focus() }, [editingId])

  const done  = goals.filter(g => g.completed).length
  const total = goals.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  async function handleAdd() {
    if (!newText.trim() || saving) return
    setSaving(true); await onAdd(newText.trim()); setNewText(''); setShowInput(false); setSaving(false)
  }
  async function handleEdit(id) {
    if (!editText.trim()) return
    await onEdit(id, editText.trim()); setEditingId(null)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="rounded-t-3xl w-full max-w-lg shadow-2xl pb-24 max-h-[88vh] flex flex-col bg-card" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-subtle" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
          <div>
            <p className="font-black text-lg text-primary">Weekly Learning Goals</p>
            {total > 0 && <p className="text-xs text-secondary mt-0.5">{done} of {total} done · {pct}%</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center text-secondary hover:text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        {total > 0 && (
          <div className="px-5 pb-3 flex-shrink-0">
            <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 space-y-2 pb-2">
          {goals.length === 0 && !showInput && (
            <div className="py-8 text-center">
              <p className="text-4xl mb-3">🎯</p>
              <p className="text-sm font-bold text-primary">No goals yet</p>
              <p className="text-xs text-secondary mt-1">Add your first goal for this week</p>
            </div>
          )}
          {goals.map(g => (
            <div key={g.id} className={`flex items-start gap-3 p-3 rounded-2xl transition-colors ${g.completed ? 'bg-subtle' : 'bg-card border border-default'}`}>
              <button onClick={() => onToggle(g.id, g.completed)}
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${g.completed ? 'bg-indigo-600 border-indigo-600' : 'border-default hover:border-indigo-400'}`}>
                {g.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
              </button>
              <div className="flex-1 min-w-0">
                {editingId === g.id ? (
                  <div className="flex gap-2">
                    <input ref={editRef} value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEdit(g.id)}
                      className="flex-1 text-sm border border-default rounded-xl px-3 py-1.5 bg-card text-primary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <button onClick={() => handleEdit(g.id)} className="text-xs font-black text-indigo-600 hover:text-indigo-500">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-secondary hover:text-primary">Cancel</button>
                  </div>
                ) : (
                  <p className={`text-sm leading-snug ${g.completed ? 'line-through text-tertiary' : 'text-primary'}`}>{g.text}</p>
                )}
              </div>
              {!editingId && (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setEditingId(g.id); setEditText(g.text) }} className="text-tertiary hover:text-secondary p-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button onClick={() => onDelete(g.id)} className="text-tertiary hover:text-red-500 p-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
          {showInput && (
            <div className="flex gap-2 mt-2">
              <input ref={inputRef} value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Type your goal…"
                className="flex-1 text-sm border border-default rounded-2xl px-4 py-2.5 bg-card text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button onClick={handleAdd} disabled={saving || !newText.trim()}
                className="px-4 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-40 transition-colors">
                {saving ? '…' : 'Add'}
              </button>
            </div>
          )}
          {!showInput && goals.length < 6 && (
            <div className="pt-2">
              <p className="text-xs font-bold text-tertiary uppercase tracking-wide mb-2">Suggestions</p>
              <div className="space-y-1.5">
                {SMART_SUGGESTIONS.slice(0, 3).map((s, i) => (
                  <button key={i} onClick={() => { setNewText(s.text); setShowInput(true) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-subtle hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-left transition-colors">
                    <span className="text-base flex-shrink-0">{s.emoji}</span>
                    <span className="text-xs text-secondary leading-snug">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {!showInput && goals.length < 10 && (
          <div className="px-5 pt-3 pb-2 border-t border-default flex-shrink-0">
            <button onClick={() => setShowInput(true)}
              className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              Add Goal
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── WeeklyGoals widget ────────────────────────────────────────────────────────
export default function WeeklyGoals() {
  const [goals,     setGoals]   = useState(_goalsCache ?? [])
  const [loading,   setLoading] = useState(_goalsCache === null)
  const [modalOpen, setModal]   = useState(false)
  const fetchedRef = useRef(false)

  const fetchGoals = useCallback(async (force = false) => {
    if (!force && fetchedRef.current) return
    fetchedRef.current = true
    setLoading(true)
    try {
      const res  = await fetch('/api/student/weekly-goals')
      const d    = await res.json()
      const list = d.goals ?? []
      _goalsCache = list; setGoals(list)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const toggleGoal = useCallback(async (id, current) => {
    const upd = p => p.map(g => g.id === id ? { ...g, completed: !current } : g)
    setGoals(p => { const n = upd(p); _goalsCache = n; return n })
    try { await fetch('/api/student/weekly-goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, completed: !current }) }) }
    catch { const rev = p => p.map(g => g.id === id ? { ...g, completed: current } : g); setGoals(p => { const n = rev(p); _goalsCache = n; return n }) }
  }, [])

  const addGoal = useCallback(async (text) => {
    try {
      const res = await fetch('/api/student/weekly-goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      const d   = await res.json()
      if (d.goal) setGoals(p => { const n = [...p, d.goal]; _goalsCache = n; return n })
    } catch {}
  }, [])

  const editGoal = useCallback(async (id, text) => {
    setGoals(p => { const n = p.map(g => g.id === id ? { ...g, text } : g); _goalsCache = n; return n })
    try { await fetch('/api/student/weekly-goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, text }) }) }
    catch { fetchGoals(true) }
  }, [fetchGoals])

  const deleteGoal = useCallback(async (id) => {
    setGoals(p => { const n = p.filter(g => g.id !== id); _goalsCache = n; return n })
    try { await fetch('/api/student/weekly-goals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }) }
    catch { fetchGoals(true) }
  }, [fetchGoals])

  const done    = goals.filter(g => g.completed).length
  const total   = goals.length
  const goalPct = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total
  const preview = goals.slice(0, 3)

  return (
    <>
      <div className="bg-card border border-default rounded-3xl shadow-sm overflow-hidden">
        {/* Header label — smaller, dimmed */}
        <div className="px-5 pt-4 pb-1 flex items-center justify-between">
          <p className="text-xs font-bold text-secondary tracking-wide">Weekly Learning Goals</p>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-1 text-xs font-bold text-indigo-500 hover:text-indigo-400 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Add
          </button>
        </div>

        {/* Gradient progress bar — compact */}
        <div className="mx-5 mt-2.5 mb-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-2xl px-4 pt-2.5 pb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-black text-base leading-tight">
              {total === 0 ? 'Set your goals' : allDone ? 'All done! 🎉' : `${done} of ${total} done`}
            </p>
            {total > 0 && <span className="text-white/70 text-xs font-bold">{goalPct}%</span>}
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: total === 0 ? '0%' : `${goalPct}%`, background: allDone ? '#4ade80' : 'rgba(255,255,255,0.85)' }} />
          </div>
        </div>

        {/* Preview rows */}
        <div className="pb-1">
          {loading && (
            <div className="py-3 flex justify-center">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && goals.length === 0 && (
            <button onClick={() => setModal(true)}
              className="w-full py-3.5 text-center text-sm text-secondary hover:text-indigo-500 hover:bg-subtle transition-colors rounded-b-2xl">
              Tap to add your first goal →
            </button>
          )}
          {!loading && preview.map((g, i) => (
            <div key={g.id} className="flex flex-col">
              <div className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-subtle transition-colors"
                onClick={() => toggleGoal(g.id, g.completed)}>
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                ${g.completed ? 'bg-indigo-600 border-indigo-600' : 'border-default'}`}>
                {g.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
              </div>
              <p className={`text-sm flex-1 truncate ${g.completed ? 'line-through text-tertiary' : 'text-secondary'}`}>{g.text}</p>
              </div>
              {i < preview.length - 1 && (
                <div className="mx-5 h-px bg-default opacity-20" />
              )}
            </div>
          ))}
          {!loading && total > 3 && (
            <button onClick={() => setModal(true)} className="w-full py-2.5 text-center text-xs text-tertiary hover:text-indigo-500 hover:bg-subtle transition-colors rounded-b-3xl">
              View all goals →
            </button>
          )}
        </div>
      </div>

      {modalOpen && (
        <GoalsModal goals={goals} onClose={() => setModal(false)}
          onToggle={toggleGoal} onAdd={addGoal} onEdit={editGoal} onDelete={deleteGoal} />
      )}
    </>
  )
}