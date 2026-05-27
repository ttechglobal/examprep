'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const EXAM_TYPES = ['WAEC', 'JAMB', 'BOTH']

const EXAM_COLORS = {
  WAEC: 'bg-blue-100 text-blue-700 border-blue-200',
  JAMB: 'bg-purple-100 text-purple-700 border-purple-200',
  BOTH: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

function UploadStatusBadges({ subject }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {subject.waec_uploaded ? (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
          WAEC ✓
        </span>
      ) : (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100">
          WAEC —
        </span>
      )}
      {subject.jamb_uploaded ? (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
          JAMB ✓
        </span>
      ) : (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100">
          JAMB —
        </span>
      )}
      {subject.merged && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
          Merged ✓
        </span>
      )}
    </div>
  )
}

function SubjectRow({ subject, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(subject.name)
  const [examType, setExamType] = useState(subject.exam_type)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    if (!name.trim()) return
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
      onUpdate({ ...subject, ...data })
      setEditing(false)
    } catch {
      setError('Save failed — try again')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setName(subject.name)
    setExamType(subject.exam_type)
    setEditing(false)
    setError(null)
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
    if (!confirm(`Delete "${subject.name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/subjects/${subject.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    onDelete(subject.id)
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border-2 border-indigo-300 shadow-sm p-4 space-y-3">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Subject name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Exam scope</label>
          <div className="flex gap-2">
            {EXAM_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setExamType(t)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-colors ${
                  examType === t
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleCancel}
            className="flex-1 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-2 text-sm bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-indigo-500 transition-colors"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${
      subject.is_active ? 'border-gray-200' : 'border-gray-100 opacity-50'
    }`}>
      <div className="flex items-start gap-4 px-4 py-4">

        {/* Left: info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-gray-900">{subject.name}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${EXAM_COLORS[subject.exam_type]}`}>
              {subject.exam_type}
            </span>
            {!subject.is_active && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                Inactive
              </span>
            )}
          </div>

          {/* Upload status */}
          <UploadStatusBadges subject={subject} />

          {/* Stats */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {subject.topic_count} topic{subject.topic_count !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-200">·</span>
            <span className="text-xs text-gray-400">
              {subject.subtopic_count} subtopic{subject.subtopic_count !== 1 ? 's' : ''}
            </span>
            {subject.lessons_published > 0 && (
              <>
                <span className="text-gray-200">·</span>
                <span className="text-xs text-green-600 font-medium">
                  {subject.lessons_published} lesson{subject.lessons_published !== 1 ? 's' : ''} live
                </span>
              </>
            )}
            {subject.lessons_generated > subject.lessons_published && (
              <>
                <span className="text-gray-200">·</span>
                <span className="text-xs text-amber-600 font-medium">
                  {subject.lessons_generated - subject.lessons_published} in review
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {subject.subtopic_count > 0 && (
            <Link
              href={`/admin/curriculum/${subject.slug}`}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium transition-colors"
            >
              View
            </Link>
          )}
          <Link
            href={`/admin/curriculum/upload`}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 font-medium transition-colors"
          >
            Upload
          </Link>
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleToggleActive}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
              subject.is_active
                ? 'border-gray-200 text-gray-400 hover:bg-gray-50'
                : 'border-green-200 text-green-600 hover:bg-green-50'
            }`}
          >
            {subject.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={handleDelete}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
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
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(data => { setSubjects(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
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
          name: newName.trim(),
          exam_type: newExamType,
          order_index: subjects.length + 1,
        }),
      })
      const data = await res.json()
      if (data.error) { setAddError(data.error); return }
      setSubjects(prev => [...prev, {
        ...data,
        topic_count: 0,
        subtopic_count: 0,
        lessons_generated: 0,
        lessons_published: 0,
        waec_uploaded: false,
        jamb_uploaded: false,
        merged: false,
      }])
      setNewName('')
      setNewExamType('BOTH')
      setShowAddForm(false)
    } catch {
      setAddError('Failed to add subject — try again')
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = (updated) => {
    setSubjects(prev => prev.map(s => s.id === updated.id ? updated : s))
  }

  const handleDelete = (id) => {
    setSubjects(prev => prev.filter(s => s.id !== id))
  }

  const filtered = subjects.filter(s => {
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'active' ? s.is_active :
      filter === 'inactive' ? !s.is_active :
      filter === 'no_curriculum' ? (!s.waec_uploaded && !s.jamb_uploaded) :
      filter === 'partial' ? ((s.waec_uploaded || s.jamb_uploaded) && !s.merged) :
      filter === 'merged' ? s.merged :
      s.exam_type === filter

    const matchesSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const totalTopics    = subjects.reduce((a, s) => a + s.topic_count, 0)
  const totalSubtopics = subjects.reduce((a, s) => a + s.subtopic_count, 0)
  const totalLive      = subjects.reduce((a, s) => a + s.lessons_published, 0)
  const mergedCount    = subjects.filter(s => s.merged).length
  const noContent      = subjects.filter(s => !s.waec_uploaded && !s.jamb_uploaded).length

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
            Manage subjects and track curriculum upload status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/curriculum/upload"
            className="px-4 py-2 border border-indigo-200 text-indigo-600 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Upload Curriculum
          </Link>
          <button
            onClick={() => setShowAddForm(s => !s)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors"
          >
            + Add Subject
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Subjects',    value: subjects.length,  color: 'text-gray-800',   bg: 'bg-gray-50' },
          { label: 'Topics',      value: totalTopics,      color: 'text-gray-800',   bg: 'bg-gray-50' },
          { label: 'Subtopics',   value: totalSubtopics,   color: 'text-gray-800',   bg: 'bg-gray-50' },
          { label: 'Live Lessons',value: totalLive,        color: 'text-green-700',  bg: 'bg-green-50' },
          { label: 'Merged',      value: mergedCount,      color: 'text-indigo-700', bg: 'bg-indigo-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* No curriculum alert */}
      {noContent > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <p className="text-sm font-bold text-amber-800">
                {noContent} subject{noContent > 1 ? 's' : ''} have no curriculum uploaded yet
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Upload the syllabus to generate lessons and enable student learning paths.
              </p>
            </div>
          </div>
          <Link
            href="/admin/curriculum/upload"
            className="text-xs font-bold text-amber-700 hover:underline flex-shrink-0 ml-4"
          >
            Upload now →
          </Link>
        </div>
      )}

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
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Subject name (e.g. Further Mathematics)"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
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

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search subjects..."
          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: 'all',           label: 'All' },
            { id: 'active',        label: 'Active' },
            { id: 'inactive',      label: 'Inactive' },
            { id: 'merged',        label: 'Merged' },
            { id: 'partial',       label: 'Partial' },
            { id: 'no_curriculum', label: 'No content' },
            { id: 'WAEC',          label: 'WAEC' },
            { id: 'JAMB',          label: 'JAMB' },
            { id: 'BOTH',          label: 'Both' },
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
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400">
        Showing {filtered.length} of {subjects.length} subjects
      </p>

      {/* Subject list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-sm">No subjects found.</p>
            {search && (
              <button onClick={() => setSearch('')} className="text-xs text-indigo-500 hover:underline mt-1">
                Clear search
              </button>
            )}
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