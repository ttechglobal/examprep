'use client'

// src/components/admin/PrerequisiteMapEditor.jsx
// Admin UI for generating, reviewing, editing and approving the prerequisite map.
// Lives as a tab on the subject's curriculum page.
// Workflow: generate prompt → copy to Claude → paste JSON → review edges → edit → approve

import { useState, useEffect, useCallback } from 'react'
import { buildPrerequisiteMapPrompt } from '@/lib/prerequisitePrompt'

const STATUS_STYLES = {
  none:     { label: 'Not set up',  style: 'bg-gray-100 text-gray-600' },
  draft:    { label: 'Draft — needs approval', style: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved ✓', style: 'bg-green-100 text-green-700' },
}

// ── Prompt panel ──────────────────────────────────────────────────────────────
function PromptPanel({ subject, topics, onJsonPasted }) {
  const [copied, setCopied]     = useState(false)
  const [rawJson, setRawJson]   = useState('')
  const [parsing, setParsing]   = useState(false)
  const [parseError, setParseError] = useState(null)

  const prompt = buildPrerequisiteMapPrompt({
    subjectName: subject.name,
    examType:    subject.exam_type,
    topicsList:  topics,
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleParse = () => {
    setParsing(true)
    setParseError(null)
    try {
      let cleaned = rawJson.trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsed = JSON.parse(cleaned)
      const aiTopics = parsed.topics ?? (Array.isArray(parsed) ? parsed : null)
      if (!aiTopics?.length) throw new Error('No topics array found in response')
      onJsonPasted(aiTopics)
    } catch (err) {
      setParseError(err.message)
    } finally {
      setParsing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-black text-blue-800">Step 1 — Copy this prompt</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Paste into Claude or Gemini → copy the JSON response
            </p>
          </div>
          <button
            onClick={handleCopy}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-colors ${
              copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {copied ? 'Copied ✓' : 'Copy Prompt'}
          </button>
        </div>
        <pre className="text-xs text-blue-900 whitespace-pre-wrap font-mono leading-relaxed max-h-[200px] overflow-y-auto bg-white/70 rounded-xl p-3 border border-blue-200">
          {prompt}
        </pre>
      </div>

      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">Step 2 — Paste Claude's JSON response</p>
        <textarea
          value={rawJson}
          onChange={e => setRawJson(e.target.value)}
          rows={8}
          className="w-full font-mono text-xs p-4 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder={'{\n  "topics": [\n    { "name": "...", "foundational": true, "prerequisites": [] },\n    ...\n  ]\n}'}
          spellCheck={false}
        />
        {parseError && (
          <p className="text-xs text-red-600 mt-1.5">⚠ {parseError}</p>
        )}
        <button
          onClick={handleParse}
          disabled={!rawJson.trim() || parsing}
          className="mt-3 w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-40 transition-colors"
        >
          {parsing ? 'Parsing…' : 'Parse & Preview Map →'}
        </button>
      </div>
    </div>
  )
}

// ── Settings panel ────────────────────────────────────────────────────────────
function SettingsPanel({ subjectId, settings, onUpdated }) {
  const [depth, setDepth]         = useState(settings?.prereq_depth ?? 2)
  const [threshold, setThreshold] = useState(settings?.prereq_pass_threshold ?? 60)
  const [saving, setSaving]       = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/admin/prerequisites/${subjectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_settings', depth, threshold }),
    })
    onUpdated()
    setSaving(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      <h3 className="font-bold text-gray-900 text-sm">Prerequisite Settings</h3>

      <div>
        <label className="block text-xs font-bold text-gray-600 mb-2">
          Prerequisite check depth
          <span className="font-normal text-gray-400 ml-1">
            — how many levels back the system looks
          </span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3].map(d => (
            <button
              key={d}
              onClick={() => setDepth(d)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl border-2 transition-colors ${
                depth === d
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {d} {d === 1 ? 'level' : 'levels'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {depth === 1 && 'Only checks the direct prerequisites of the topic being opened.'}
          {depth === 2 && 'Checks prerequisites and their prerequisites. Recommended.'}
          {depth === 3 && 'Checks up to 3 levels deep. Use for subjects with long dependency chains.'}
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 mb-2">
          Mastery pass threshold
          <span className="font-normal text-gray-400 ml-1">— quiz score to mark a topic as mastered</span>
        </label>
        <div className="flex gap-2">
          {[50, 60, 70, 80].map(t => (
            <button
              key={t}
              onClick={() => setThreshold(t)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl border-2 transition-colors ${
                threshold === t
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t}%
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Students scoring ≥{threshold}% on a 10-question quiz are marked as having mastered that topic.
          Below {threshold}% they receive an advisory but can still proceed.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  )
}

// ── Edge list / map editor ────────────────────────────────────────────────────
function MapEditor({ subjectId, topics, edges, onRefresh }) {
  const [addingTo, setAddingTo]     = useState(null) // topicId we're adding a prereq to
  const [selectedPrereq, setSelectedPrereq] = useState('')
  const [saving, setSaving]         = useState(false)
  const [message, setMessage]       = useState(null)

  // Build map: topicId → list of required topic ids
  const prereqMap = {}
  for (const edge of edges) {
    if (!prereqMap[edge.topic_id]) prereqMap[edge.topic_id] = []
    prereqMap[edge.topic_id].push(edge)
  }

  const topicById = {}
  topics.forEach(t => { topicById[t.id] = t })

  const handleRemoveEdge = async (edgeId) => {
    setSaving(true)
    const res = await fetch(`/api/admin/prerequisites/${subjectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_edge', edgeId }),
    })
    const data = await res.json()
    if (data.success) {
      onRefresh()
    } else {
      setMessage({ type: 'error', text: data.error })
    }
    setSaving(false)
  }

  const handleAddEdge = async (topicId) => {
    if (!selectedPrereq) return
    setSaving(true)
    setMessage(null)
    const res = await fetch(`/api/admin/prerequisites/${subjectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_edge', topicId, requiresTopicId: selectedPrereq }),
    })
    const data = await res.json()
    if (data.success) {
      setAddingTo(null)
      setSelectedPrereq('')
      onRefresh()
    } else {
      setMessage({ type: 'error', text: data.error })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-2">
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm ${
          message.type === 'error'
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      <p className="text-xs text-gray-500 pb-1">
        {edges.length} prerequisite relationship{edges.length !== 1 ? 's' : ''} ·{' '}
        {topics.filter(t => !prereqMap[t.id]?.length).length} foundational topics
      </p>

      {topics.map(topic => {
        const topicEdges = prereqMap[topic.id] ?? []
        const isAdding = addingTo === topic.id
        // Topics that can be prerequisites (exclude self and any that already depend on this topic)
        const eligible = topics.filter(t =>
          t.id !== topic.id &&
          !topicEdges.find(e => e.requires_topic_id === t.id)
        )

        return (
          <div
            key={topic.id}
            className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{topic.name}</p>

                {topicEdges.length === 0 ? (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">
                    Foundational
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {topicEdges.map(edge => (
                      <span
                        key={edge.id}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full font-medium"
                      >
                        Requires: {topicById[edge.requires_topic_id]?.name ?? '—'}
                        <button
                          onClick={() => handleRemoveEdge(edge.id)}
                          disabled={saving}
                          className="ml-0.5 text-amber-500 hover:text-red-500 transition-colors font-black"
                          title="Remove this prerequisite"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => { setAddingTo(isAdding ? null : topic.id); setSelectedPrereq('') }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex-shrink-0 mt-0.5"
              >
                {isAdding ? 'Cancel' : '+ Add prereq'}
              </button>
            </div>

            {isAdding && (
              <div className="mt-3 flex gap-2">
                <select
                  value={selectedPrereq}
                  onChange={e => setSelectedPrereq(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Select prerequisite topic…</option>
                  {eligible.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleAddEdge(topic.id)}
                  disabled={!selectedPrereq || saving}
                  className="px-4 py-2 text-xs font-black bg-indigo-600 text-white rounded-xl disabled:opacity-40 hover:bg-indigo-500 transition-colors"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PrerequisiteMapEditor({ subject, topics }) {
  const [tab, setTab]         = useState('map')   // 'generate' | 'map' | 'settings'
  const [mapData, setMapData] = useState(null)    // { topics, edges, settings }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [message, setMessage] = useState(null)
  const [pendingAiTopics, setPendingAiTopics] = useState(null) // parsed but not yet saved

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/prerequisites/${subject.id}`)
    const data = await res.json()
    setMapData(data)
    setLoading(false)
  }, [subject.id])

  useEffect(() => { load() }, [load])

  const handleSaveAiMap = async () => {
    if (!pendingAiTopics) return
    setSaving(true)
    setMessage(null)
    const res = await fetch(`/api/admin/prerequisites/${subject.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topics: pendingAiTopics }),
    })
    const data = await res.json()
    if (data.errors?.length) {
      setMessage({ type: 'warning', text: `Saved with ${data.errors.length} unmatched topic(s). Review below.` })
    } else {
      setMessage({ type: 'success', text: `${data.saved} prerequisite relationship${data.saved !== 1 ? 's' : ''} saved. Now review and approve the map.` })
    }
    setPendingAiTopics(null)
    await load()
    setTab('map')
    setSaving(false)
  }

  const handleApprove = async () => {
    setSaving(true)
    await fetch(`/api/admin/prerequisites/${subject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    setMessage({ type: 'success', text: 'Prerequisite map approved ✓ — students will now see prerequisite checks.' })
    await load()
    setSaving(false)
  }

  const handleRevokeApproval = async () => {
    if (!confirm('Revoking approval will disable prerequisite checks for students until you re-approve. Continue?')) return
    setSaving(true)
    await fetch(`/api/admin/prerequisites/${subject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke_approval' }),
    })
    await load()
    setSaving(false)
  }

  const mapStatus = mapData?.settings?.prereq_map_status ?? 'none'
  const statusInfo = STATUS_STYLES[mapStatus] ?? STATUS_STYLES.none

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-5 py-4">
        <div>
          <p className="text-sm font-bold text-gray-900">Prerequisite Map</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.style}`}>
              {statusInfo.label}
            </span>
            {mapData?.settings?.prereq_reviewed_at && (
              <span className="text-xs text-gray-400">
                Approved {new Date(mapData.settings.prereq_reviewed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {mapStatus === 'draft' && (
            <button
              onClick={handleApprove}
              disabled={saving}
              className="px-4 py-2 text-sm font-black bg-green-600 text-white rounded-xl hover:bg-green-500 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Approving…' : 'Approve Map ✓'}
            </button>
          )}
          {mapStatus === 'approved' && (
            <button
              onClick={handleRevokeApproval}
              disabled={saving}
              className="px-3 py-2 text-xs font-bold border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors"
            >
              Revoke Approval
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          message.type === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-800' :
          'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {[
          { id: 'map',      label: `Map (${mapData?.edges?.length ?? 0} edges)` },
          { id: 'generate', label: '+ Generate from AI' },
          { id: 'settings', label: 'Settings' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Generate ── */}
      {tab === 'generate' && (
        <div className="space-y-4">
          <PromptPanel
            subject={subject}
            topics={topics}
            onJsonPasted={aiTopics => {
              setPendingAiTopics(aiTopics)
            }}
          />
          {pendingAiTopics && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-3">
              <p className="text-sm font-bold text-indigo-800">
                AI returned {pendingAiTopics.length} topics.
              </p>
              <p className="text-xs text-indigo-600">
                {pendingAiTopics.filter(t => !t.foundational).length} dependent topics with prerequisites.
                Saving this will replace any existing prerequisite map for {subject.name}.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveAiMap}
                  disabled={saving}
                  className="flex-1 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Map & Review →'}
                </button>
                <button
                  onClick={() => setPendingAiTopics(null)}
                  className="px-4 py-3 text-sm font-bold border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Map editor ── */}
      {tab === 'map' && (
        mapData?.topics?.length > 0 ? (
          <MapEditor
            subjectId={subject.id}
            topics={mapData.topics}
            edges={mapData.edges ?? []}
            onRefresh={load}
          />
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-3">🗺️</p>
            <p className="font-semibold text-gray-600">No map yet</p>
            <p className="text-sm mt-1">Use the Generate tab to create the prerequisite map from AI.</p>
            <button
              onClick={() => setTab('generate')}
              className="mt-4 text-sm text-indigo-600 font-bold hover:underline"
            >
              → Generate now
            </button>
          </div>
        )
      )}

      {/* ── Tab: Settings ── */}
      {tab === 'settings' && (
        <SettingsPanel
          subjectId={subject.id}
          settings={mapData?.settings}
          onUpdated={load}
        />
      )}
    </div>
  )
}