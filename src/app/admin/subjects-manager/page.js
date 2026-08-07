'use client'
// src/app/admin/subjects-manager/page.js
//
// Data model: one DB row per exam per subject.
//   e.g. Mathematics WAEC + Mathematics JAMB = two rows, same name, different exam_type.
//
// UI model: subjects are GROUPED by name.
//   Each group shows all exam variants as sibling badges.
//   "Add exam" button on a group lets you add WAEC/JAMB/IGCSE to that name quickly.
//   "+ New Subject" creates a brand-new name.

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

const ALL_EXAMS = ['WAEC', 'JAMB', 'IGCSE']

const EXAM_STYLE = {
  WAEC:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dark: '#1e40af' },
  JAMB:  { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe', dark: '#6d28d9' },
  IGCSE: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', dark: '#166534' },
}

function ExamBadge({ exam, size = 'sm' }) {
  if (!exam) return null
  const s = EXAM_STYLE[exam] ?? { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' }
  return (
    <span style={{
      fontSize: size === 'xs' ? 9 : 11,
      fontWeight: 800,
      padding: size === 'xs' ? '1px 6px' : '3px 8px',
      borderRadius: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      letterSpacing: '0.02em',
    }}>
      {exam}
    </span>
  )
}

// ── Single subject row (one exam variant) ─────────────────────────────────────
function SubjectVariantRow({ subject, onUpdate, onDelete, siblings }) {
  const [editing, setEditing] = useState(false)
  const [name,    setName]    = useState(subject.name)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  // When editing name, only editing name — exam_type is fixed per row
  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/admin/subjects/${subject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      onUpdate({ ...subject, name: name.trim(), slug: data.slug })
      setEditing(false)
    } catch { setError('Save failed — try again') }
    finally { setSaving(false) }
  }

  const handleToggleActive = async () => {
    const res = await fetch(`/api/admin/subjects/${subject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !subject.is_active }),
    })
    const data = await res.json()
    if (!data.error) onUpdate({ ...subject, is_active: !subject.is_active })
  }

  const handleDelete = async () => {
    const label = `${subject.name} (${subject.exam_type})`
    if (!confirm(`Delete "${label}"?\n\nThis will also delete all its topics, subtopics, and questions.`)) return
    const res = await fetch(`/api/admin/subjects/${subject.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    onDelete(subject.id)
  }

  const s = EXAM_STYLE[subject.exam_type] ?? EXAM_STYLE.WAEC

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: subject.is_active ? '#fff' : '#fafafa',
      opacity: subject.is_active ? 1 : 0.6,
      borderBottom: '1px solid #f3f4f6',
      flexWrap: 'wrap',
    }}>
      {/* Exam badge */}
      <div style={{ width: 56, flexShrink: 0 }}>
        <ExamBadge exam={subject.exam_type} size="xs" />
      </div>

      {/* Name or edit input */}
      {editing ? (
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setName(subject.name); setEditing(false) } }}
          autoFocus
          style={{ flex: 1, minWidth: 120, padding: '5px 10px', border: '1.5px solid #6366f1', borderRadius: 8, fontSize: 13, outline: 'none' }}
        />
      ) : (
        <div style={{ flex: 1, minWidth: 120 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{subject.name}</p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, marginTop: 1 }}>
            {subject.topic_count ?? 0} topics · {subject.subtopic_count ?? 0} subtopics
          </p>
          {error && <p style={{ fontSize: 11, color: '#dc2626', margin: 0, marginTop: 2 }}>{error}</p>}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
        {editing ? (
          <>
            <button onClick={() => { setName(subject.name); setEditing(false); setError(null) }}
              style={btn('#f9fafb', '#6b7280', '#e5e7eb')}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !name.trim()}
              style={btn('#4f46e5', '#fff', '#4f46e5', saving || !name.trim())}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        ) : (
          <>
            {(subject.topic_count ?? 0) > 0 && (
              <Link href={`/admin/curriculum/${subject.slug}`}
                style={{ ...btn('#f9fafb', '#374151', '#e5e7eb'), textDecoration: 'none', display: 'inline-block' }}>
                Topics
              </Link>
            )}
            <button onClick={() => setEditing(true)} style={btn('#eef2ff', '#4f46e5', '#e0e7ff')}>Edit</button>
            <button onClick={handleToggleActive}
              style={btn('#f9fafb', subject.is_active ? '#6b7280' : '#16a34a', '#e5e7eb')}>
              {subject.is_active ? 'Hide' : 'Show'}
            </button>
            <button onClick={handleDelete} style={btn('#fef2f2', '#dc2626', '#fecaca')}>Delete</button>
          </>
        )}
      </div>
    </div>
  )
}

function btn(bg, color, border, disabled = false) {
  return {
    padding: '5px 11px', borderRadius: 8, border: `1px solid ${border}`,
    fontSize: 12, fontWeight: 600, color, background: bg, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
}

// ── Subject group (one name, 1–3 exam variants) ───────────────────────────────
function SubjectGroup({ groupName, subjects, onUpdate, onDelete, onAddVariant }) {
  const [addingExam, setAddingExam] = useState(false)
  const [adding,     setAdding]     = useState(false)
  const [addError,   setAddError]   = useState(null)

  const existingExams = subjects.map(s => s.exam_type)
  const availableExams = ALL_EXAMS.filter(e => !existingExams.includes(e))

  const handleAddVariant = async (examType) => {
    setAdding(true); setAddError(null)
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, exam_type: examType }),
      })
      const data = await res.json()
      if (data.error) { setAddError(data.error); return }
      onAddVariant(data)
      setAddingExam(false)
    } catch { setAddError('Failed — try again') }
    finally { setAdding(false) }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* Group header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>{groupName}</p>
          <div style={{ display: 'flex', gap: 4 }}>
            {existingExams.map(e => <ExamBadge key={e} exam={e} size="xs" />)}
          </div>
        </div>

        {/* Add another exam variant */}
        {availableExams.length > 0 && (
          <div style={{ position: 'relative' }}>
            {addingExam ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {addError && <span style={{ fontSize: 11, color: '#dc2626' }}>{addError}</span>}
                {availableExams.map(e => {
                  const s = EXAM_STYLE[e]
                  return (
                    <button key={e} onClick={() => handleAddVariant(e)} disabled={adding}
                      style={{ padding: '4px 10px', borderRadius: 7, border: `1.5px solid ${s.border}`, background: s.bg, color: s.color, fontSize: 11, fontWeight: 800, cursor: 'pointer', opacity: adding ? 0.5 : 1 }}>
                      + {e}
                    </button>
                  )
                })}
                <button onClick={() => { setAddingExam(false); setAddError(null) }}
                  style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', fontSize: 11, cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingExam(true)}
                style={{ padding: '4px 10px', borderRadius: 7, border: '1px dashed #d1d5db', background: '#fff', color: '#6b7280', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                + Add exam
              </button>
            )}
          </div>
        )}
      </div>

      {/* Variant rows */}
      {subjects.map(s => (
        <SubjectVariantRow
          key={s.id}
          subject={s}
          siblings={subjects}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SubjectsManagerPage() {
  const [subjects,    setSubjects]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [newName,     setNewName]     = useState('')
  const [newExamType, setNewExamType] = useState('WAEC')
  const [adding,      setAdding]      = useState(false)
  const [addError,    setAddError]    = useState(null)
  const [search,      setSearch]      = useState('')
  const [filterExam,  setFilterExam]  = useState('all')

  useEffect(() => {
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(data => { setSubjects(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Group by name
  const groups = useMemo(() => {
    const filtered = subjects.filter(s => {
      const matchExam   = filterExam === 'all' || s.exam_type === filterExam
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
      return matchExam && matchSearch
    })
    const map = {}
    for (const s of filtered) {
      if (!map[s.name]) map[s.name] = []
      map[s.name].push(s)
    }
    // Sort each group's variants by exam order
    for (const name of Object.keys(map)) {
      map[name].sort((a, b) => ALL_EXAMS.indexOf(a.exam_type) - ALL_EXAMS.indexOf(b.exam_type))
    }
    return map
  }, [subjects, search, filterExam])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true); setAddError(null)
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), exam_type: newExamType }),
      })
      const data = await res.json()
      if (data.error) { setAddError(data.error); return }
      setSubjects(prev => [...prev, { ...data, topic_count: 0, subtopic_count: 0 }])
      setNewName(''); setNewExamType('WAEC'); setShowAdd(false)
    } catch { setAddError('Failed — try again') }
    finally { setAdding(false) }
  }

  const onUpdate = upd => setSubjects(prev => prev.map(x => x.id === upd.id ? { ...x, ...upd } : x))
  const onDelete = id  => setSubjects(prev => prev.filter(x => x.id !== id))
  const onAddVariant = newSubj => setSubjects(prev => [...prev, { ...newSubj, topic_count: 0, subtopic_count: 0 }])

  const totalTopics    = subjects.reduce((a, s) => a + (s.topic_count ?? 0), 0)
  const totalSubtopics = subjects.reduce((a, s) => a + (s.subtopic_count ?? 0), 0)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', marginBottom: 3 }}>Subjects</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Each subject–exam pair is independent. Maths WAEC and Maths JAMB have separate topic trees and question banks.
          </p>
        </div>
        <button onClick={() => setShowAdd(s => !s)}
          style={{ padding: '9px 18px', background: '#4f46e5', color: '#fff', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 0 #2d3a9e', whiteSpace: 'nowrap' }}>
          + New Subject
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {[
          { label: 'Subject groups', value: Object.keys(groups).length },
          { label: 'Total variants', value: subjects.length },
          { label: 'Topics',         value: totalTopics },
          { label: 'Subtopics',      value: totalSubtopics },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{s.value.toLocaleString()}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add new subject form */}
      {showAdd && (
        <div style={{ background: '#eef2ff', border: '1px solid #e0e7ff', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>Add new subject</h3>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
            To add another exam for an existing subject (e.g. adding JAMB to existing Maths WAEC), use the <strong>"+ Add exam"</strong> button on that subject's group below instead.
          </p>
          {addError && <p style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: 8, margin: 0 }}>{addError}</p>}
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Subject name (e.g. Further Mathematics)"
            style={{ padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 14, outline: 'none' }}
            autoFocus
          />
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Exam</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {ALL_EXAMS.map(e => {
                const s = EXAM_STYLE[e]
                const active = newExamType === e
                return (
                  <button key={e} onClick={() => setNewExamType(e)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: active ? s.bg : '#fff', color: active ? s.color : '#9ca3af',
                    border: `2px solid ${active ? s.border : '#e5e7eb'}`, transition: 'all .12s',
                  }}>{e}</button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowAdd(false); setNewName(''); setAddError(null) }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600, color: '#6b7280', cursor: 'pointer', background: '#fff' }}>
              Cancel
            </button>
            <button onClick={handleAdd} disabled={adding || !newName.trim()}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', background: '#4f46e5', opacity: (adding || !newName.trim()) ? 0.5 : 1 }}>
              {adding ? 'Adding…' : 'Add Subject'}
            </button>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search subjects…"
          style={{ flex: 1, minWidth: 180, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', ...ALL_EXAMS].map(f => (
            <button key={f} onClick={() => setFilterExam(f)} style={{
              padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filterExam === f ? '#4f46e5' : '#fff',
              color: filterExam === f ? '#fff' : '#6b7280',
              border: `1px solid ${filterExam === f ? '#4f46e5' : '#e5e7eb'}`,
            }}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#9ca3af' }}>
        {Object.keys(groups).length} subject{Object.keys(groups).length !== 1 ? 's' : ''} · {subjects.filter(s => filterExam === 'all' || s.exam_type === filterExam).length} variants
      </p>

      {/* Subject groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.keys(groups).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
            <p style={{ fontSize: 14 }}>No subjects found.</p>
          </div>
        ) : (
          Object.entries(groups).map(([groupName, groupSubjects]) => (
            <SubjectGroup
              key={groupName}
              groupName={groupName}
              subjects={groupSubjects}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddVariant={onAddVariant}
            />
          ))
        )}
      </div>
    </div>
  )
}