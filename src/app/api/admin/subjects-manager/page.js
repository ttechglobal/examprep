'use client'

import { useState, useEffect } from 'react'

const EXAM_TYPES = ['WAEC', 'JAMB', 'BOTH']

const EXAM_COLORS = {
  WAEC: 'bg-blue-100 text-blue-700',
  JAMB: 'bg-purple-100 text-purple-700',
  BOTH: 'bg-indigo-100 text-indigo-700',
}

function SubjectRow({ subject, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(subject.name)
  const [examType, setExamType] = useState(subject.exam_type)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/subjects/${subject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, exam_type: examType }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      onUpdate(data)
      setEditing(false)
    } catch {
      setError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    const res = await fetch(`/api/admin/subjects/${subject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !subject.is_active }),
    })
    const data = await res.json()
    if (!data.error) onUpdate(data)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${subject.name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/subjects/${subject.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    onDelete(subject.id)
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
      subject.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
    }`}>
      {editing ? (
        <div className="p-4 space-y-3">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex gap-2">
            {EXAM_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setExamType(t)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-colors ${
                  examType === t
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(false); setName(subject.name); setExamType(subject.exam_type) }}
              className="flex-1 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 py-2 text-sm bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-indigo-500 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 px-4 py-3.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-900 truncate">{subject.name}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EXAM_COLORS[subject.exam_type]}`}>
                {subject.exam_type}
              </span>
              {!subject.is_active && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  Inactive
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-400">{subject.topic_count} topics</span>
              <span className="text-xs text-gray-400">{subject.subtopic_count} subtopics</span>
              {subject.lessons_published > 0 && (
                <span className="text-xs text-green-600">
                  {subject.lessons_published} lessons live
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleToggleActive}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                subject.is_active
                  ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  : 'border-green-200 text-green-600 hover:bg-green-50'
              }`}
            >
              {subject.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SubjectsManagerPage() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newExamType, setNewExamType] = useState('BOTH')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(data => { setSubjects(data); setLoading(false) })
  }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          exam_type: newExamType,
          order_index: subjects.length + 1,
        }),
      })
      const data = await res.json()
      if (data.error) { setAddError(data.error); return }
      setSubjects(prev => [...prev, { ...data, topic_count: 0, subtopic_count: 0, lessons_published: 0 }])
      setNewName('')
      setNewExamType('BOTH')
      setShowAddForm(false)
    } catch {
      setAddError('Failed to add subject')
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = (updated) => {
    setSubjects(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
  }

  const handleDelete = (id) => {
    setSubjects(prev => prev.filter(s => s.id !== id))
  }

  const filtered = subjects.filter(s => {
    if (filter === 'active') return s.is_active
    if (filter === 'inactive') return !s.is_active
    if (filter === 'WAEC') return s.exam_type === 'WAEC'
    if (filter === 'JAMB') return s.exam_type === 'JAMB'
    if (filter === 'BOTH') return s.exam_type === 'BOTH'
    return true
  })

  const totalTopics = subjects.reduce((a, s) => a + s.topic_count, 0)
  const totalSubtopics = subjects.reduce((a, s) => a + s.subtopic_count, 0)
  const totalLessons = subjects.reduce((a, s) => a + s.lessons_published, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage subjects across WAEC and JAMB
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(s => !s)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors"
        >
          + Add Subject
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Subjects', value: subjects.length },
          { label: 'Topics', value: totalTopics },
          { label: 'Subtopics', value: totalSubtopics },
          { label: 'Live Lessons', value: totalLessons },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add subject form */}
      {showAddForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-4">Add new subject</h3>
          {addError && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{addError}</p>
          )}
          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Subject name (e.g. Further Mathematics)"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Exam scope</label>
              <div className="flex gap-2">
                {EXAM_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setNewExamType(t)}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl border-2 transition-colors ${
                      newExamType === t
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowAddForm(false); setNewName(''); setAddError(null) }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !newName.trim()}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 hover:bg-indigo-500 transition-colors"
              >
                {adding ? 'Adding...' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'active', 'inactive', 'WAEC', 'JAMB', 'BOTH'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
              filter === f
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Subject list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No subjects found.
          </div>
        ) : (
          filtered.map(subject => (
            <SubjectRow
              key={subject.id}
              subject={subject}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

    </div>
  )
}