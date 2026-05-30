'use client'
// src/components/dashboard/WeeklyGoals.jsx
// All explicit Tailwind colors — no custom token dependencies.
// Fixes:
// 1. "Weekly Goals" title visible above gradient
// 2. Goal preview lines: SHORTENED (max-w, truncate) + DIMMED (text-gray-400/500)
// 3. Modal panel: bg-white dark:bg-gray-900 (solid, never transparent)
// 4. Modal buttons: visible in both light + dark
// 5. No counter, no Reset Monday, no Manage — only Add
// 6. Mount-reset bug fixed (module-level cache + fetchedRef)

import { useState, useRef, useEffect, useCallback } from 'react'

const SUGGESTIONS = [
  { emoji: '📝', text: 'Complete 20 practice questions in Biology' },
  { emoji: '📖', text: 'Revise 3 topics in Chemistry this week' },
  { emoji: '⏱',  text: 'Finish 2 timed practice tests' },
  { emoji: '🎯', text: 'Score 70%+ on a Physics mock exam' },
  { emoji: '📚', text: 'Complete 5 lessons across all subjects' },
  { emoji: '✏️', text: 'Solve 30 Maths questions without hints' },
]

// Module-level cache — survives remounts without refetch
let _cache = null

// ─── Goals Modal — solid background ───────────────────────────────────────────
function GoalsModal({ goals, onClose, onToggle, onAdd, onEdit, onDelete }) {
  const [newText,   setNewText]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [editText,  setEditText]  = useState('')
  const inputRef = useRef(null)
  const editRef  = useRef(null)

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => { if (showInput) inputRef.current?.focus() }, [showInput])
  useEffect(() => { if (editId)   editRef.current?.focus()  }, [editId])

  const done  = goals.filter(g => g.completed).length
  const total = goals.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  async function handleAdd() {
    if (!newText.trim() || saving) return
    setSaving(true); await onAdd(newText.trim()); setNewText(''); setShowInput(false); setSaving(false)
  }
  async function handleEdit(id) {
    if (!editText.trim()) return; await onEdit(id, editText.trim()); setEditId(null)
  }

  return (
    /* Solid semi-opaque backdrop */
    <div className="fixed inset-0 z-[200] flex items-end justify-center"
         style={{ background: 'rgba(0,0,0,0.6)' }}
         onClick={onClose}>
      {/* SOLID panel — bg-white in light, bg-gray-900 in dark */}
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-lg shadow-2xl pb-28 max-h-[88vh] flex flex-col"
           onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
          <div>
            <p className="font-black text-lg text-gray-900 dark:text-gray-100">Weekly Goals</p>
            {total > 0 && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{done} of {total} done</p>}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center
                       text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="px-5 pb-3 flex-shrink-0">
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Goals list */}
        <div className="flex-1 overflow-y-auto px-5 space-y-2 pb-2">
          {goals.length === 0 && !showInput && (
            <div className="py-8 text-center">
              <p className="text-4xl mb-3">🎯</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">No goals yet</p>
              <p className="text-xs text-gray-400 mt-1">Add your first goal for this week</p>
            </div>
          )}

          {goals.map(g => (
            <div key={g.id}
              className={`flex items-start gap-3 p-3 rounded-2xl transition-colors
                ${g.completed ? 'bg-green-50 dark:bg-green-950/30' : 'bg-gray-50 dark:bg-gray-800'}`}>
              {/* Checkbox */}
              <button onClick={() => onToggle(g.id, g.completed)}
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors
                  ${g.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'}`}>
                {g.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
              </button>

              {/* Text / edit */}
              {editId === g.id ? (
                <div className="flex-1 flex gap-2 min-w-0">
                  <input ref={editRef} value={editText} onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEdit(g.id); if (e.key === 'Escape') setEditId(null) }}
                    className="flex-1 min-w-0 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600
                               rounded-xl px-3 py-1.5 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <button onClick={() => handleEdit(g.id)}
                    className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex-shrink-0">Save</button>
                  <button onClick={() => setEditId(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">Cancel</button>
                </div>
              ) : (
                <p className={`flex-1 text-sm leading-snug min-w-0
                  ${g.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  {g.text}
                </p>
              )}

              {/* Actions */}
              {editId !== g.id && (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setEditId(g.id); setEditText(g.text) }}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600
                               flex items-center justify-center text-gray-400 hover:text-indigo-500
                               dark:text-gray-500 dark:hover:text-indigo-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button onClick={() => onDelete(g.id)}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600
                               flex items-center justify-center text-gray-400 hover:text-red-500
                               dark:text-gray-500 dark:hover:text-red-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add input */}
          {showInput && (
            <div className="flex gap-2">
              <input ref={inputRef} value={newText} onChange={e => setNewText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowInput(false) }}
                placeholder="What do you want to achieve this week?"
                className="flex-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-2xl px-4 py-2.5 text-gray-900 dark:text-gray-100
                           placeholder:text-gray-400 dark:placeholder:text-gray-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button onClick={handleAdd} disabled={saving || !newText.trim()}
                className="px-4 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-2xl
                           hover:bg-indigo-500 disabled:opacity-40 transition-colors flex-shrink-0">
                {saving ? '…' : 'Add'}
              </button>
            </div>
          )}

          {/* Suggestions */}
          {!showInput && goals.length < 6 && (
            <div className="pt-2">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Suggestions</p>
              <div className="space-y-1.5">
                {SUGGESTIONS.slice(0, 3).map((s, i) => (
                  <button key={i} onClick={() => { setNewText(s.text); setShowInput(true) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left transition-colors
                               bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40
                               border border-gray-100 dark:border-gray-700">
                    <span className="text-base flex-shrink-0">{s.emoji}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — Add button only */}
        {!showInput && goals.length < 10 && (
          <div className="px-5 pt-3 pb-2 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
            <button onClick={() => setShowInput(true)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black
                         rounded-2xl transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
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
  const [goals,      setGoals]     = useState(_cache ?? [])
  const [loading,    setLoading]   = useState(_cache === null)
  const [modalOpen,  setModal]     = useState(false)
  const fetchedRef = useRef(false)

  const fetchGoals = useCallback(async (force = false) => {
    if (!force && fetchedRef.current) return
    fetchedRef.current = true
    setLoading(true)
    try {
      const res  = await fetch('/api/student/weekly-goals')
      const d    = await res.json()
      const list = d.goals ?? []
      _cache = list; setGoals(list)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const toggleGoal = useCallback(async (id, current) => {
    const upd = p => p.map(g => g.id === id ? { ...g, completed: !current } : g)
    setGoals(p => { const n = upd(p); _cache = n; return n })
    try { await fetch('/api/student/weekly-goals', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, completed: !current }) }) }
    catch { const rev = p => p.map(g => g.id === id ? { ...g, completed: current } : g); setGoals(p => { const n = rev(p); _cache = n; return n }) }
  }, [])

  const addGoal = useCallback(async (text) => {
    try {
      const res = await fetch('/api/student/weekly-goals', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) })
      const d   = await res.json()
      if (d.goal) setGoals(p => { const n = [...p, d.goal]; _cache = n; return n })
    } catch {}
  }, [])

  const editGoal = useCallback(async (id, text) => {
    setGoals(p => { const n = p.map(g => g.id === id ? { ...g, text } : g); _cache = n; return n })
    try { await fetch('/api/student/weekly-goals', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, text }) }) }
    catch { fetchGoals(true) }
  }, [fetchGoals])

  const deleteGoal = useCallback(async (id) => {
    setGoals(p => { const n = p.filter(g => g.id !== id); _cache = n; return n })
    try { await fetch('/api/student/weekly-goals', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) }) }
    catch { fetchGoals(true) }
  }, [fetchGoals])

  const done    = goals.filter(g => g.completed).length
  const total   = goals.length
  const goalPct = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total
  const preview = goals.slice(0, 3)

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm">

        {/* "Weekly Goals" label */}
        <div className="px-5 pt-4">
          <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Weekly Goals</p>
        </div>

        {/* Gradient bar */}
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 mx-5 mt-2 rounded-2xl px-4 pt-3 pb-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-white font-black text-lg leading-tight">
              {total === 0 ? 'Set your goals' : allDone ? 'All done! 🎉' : `${done} of ${total} done`}
            </p>
            {/* Add — only button */}
            <button onClick={() => setModal(true)}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:bg-white/40
                         text-white text-xs font-black px-3 py-1.5 rounded-xl transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Add
            </button>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: total === 0 ? '0%' : `${goalPct}%`, background: allDone ? '#4ade80' : 'rgba(255,255,255,0.85)' }} />
          </div>
        </div>

        {/* Preview — SHORT + DIMMED lines */}
        <div className="mt-1 pb-1">
          {loading && (
            <div className="py-4 flex justify-center">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && goals.length === 0 && (
            <button onClick={() => setModal(true)}
              className="w-full py-4 text-center text-sm text-gray-400 hover:text-indigo-600
                         dark:text-gray-500 dark:hover:text-indigo-400 transition-colors">
              Tap to add your first goal →
            </button>
          )}

          {!loading && preview.map((g, i) => (
            <div key={g.id}
              className={`flex items-center gap-3 px-5 py-2.5 cursor-pointer
                          hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                          ${i < preview.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
              onClick={() => toggleGoal(g.id, g.completed)}>
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                ${g.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600'}`}>
                {g.completed && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                )}
              </div>
              {/* SHORT + DIMMED text */}
              <p className={`text-sm leading-snug truncate max-w-[200px]
                ${g.completed
                  ? 'line-through text-gray-300 dark:text-gray-600'
                  : 'text-gray-400 dark:text-gray-500'}`}>
                {g.text}
              </p>
            </div>
          ))}

          {!loading && total > 3 && (
            <button onClick={() => setModal(true)}
              className="w-full py-2.5 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400
                         hover:text-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              See all {total} goals →
            </button>
          )}
        </div>
      </div>

      {modalOpen && (
        <GoalsModal
          goals={goals}
          onClose={() => setModal(false)}
          onToggle={toggleGoal}
          onAdd={addGoal}
          onEdit={editGoal}
          onDelete={deleteGoal}
        />
      )}
    </>
  )
}