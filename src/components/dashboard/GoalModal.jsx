'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const WAEC_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6']
const JAMB_SCORE_MAX = 400

export default function GoalModal({ profile, onClose }) {
  const supabase = createClient()
  const [tab, setTab] = useState('WAEC')
  const [course, setCourse] = useState(profile.university_course ?? '')
  const [dontKnow, setDontKnow] = useState(!profile.university_course)
  const [waecGrades, setWaecGrades] = useState(profile.waec_target_grades ?? {})
  const [jambScores, setJambScores] = useState(profile.jamb_target_scores ?? {})
  const [jambTotal, setJambTotal] = useState(profile.jamb_total_target ?? 250)
  const [saving, setSaving] = useState(false)

  const subjects = profile.subjects ?? []
  const examType = profile.exam_type ?? 'WAEC'

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        university_course: dontKnow ? null : course,
        goals_set: true,
        waec_target_grades: waecGrades,
        jamb_target_scores: jambScores,
        jamb_total_target: jambTotal,
      })
      .eq('id', profile.id)

    setSaving(false)
    if (!error) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-3xl px-6 py-6 text-white">
          <p className="text-2xl mb-1">🎯</p>
          <h2 className="text-xl font-black">Set your goals</h2>
          <p className="text-indigo-200 text-sm mt-1">
            Tell us what you're aiming for — we'll help you get there
          </p>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* University course */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              What do you want to study in university?
            </label>
            <input
              type="text"
              value={dontKnow ? '' : course}
              onChange={e => { setCourse(e.target.value); setDontKnow(false) }}
              disabled={dontKnow}
              placeholder="e.g. Medicine, Law, Engineering..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="button"
              onClick={() => setDontKnow(d => !d)}
              className={`mt-2 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                dontKnow
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-600 font-medium'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              {dontKnow ? "✓ I don't know yet" : "I don't know yet"}
            </button>
          </div>

          {/* Target scores */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-3">
              What scores are you aiming for?
            </label>

            {/* Tabs if BOTH */}
            {examType === 'BOTH' && (
              <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl">
                {['WAEC', 'JAMB'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                      tab === t
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* WAEC grades */}
            {(examType === 'WAEC' || (examType === 'BOTH' && tab === 'WAEC')) && (
              <div className="space-y-3">
                {subjects.map(subject => (
                  <div key={subject} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 flex-1">{subject}</span>
                    <select
                      value={waecGrades[subject] ?? 'A1'}
                      onChange={e => setWaecGrades(prev => ({ ...prev, [subject]: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      {WAEC_GRADES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* JAMB scores */}
            {(examType === 'JAMB' || (examType === 'BOTH' && tab === 'JAMB')) && (
              <div className="space-y-3">
                {subjects.map(subject => (
                  <div key={subject} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 flex-1">{subject}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={jambScores[subject] ?? 60}
                        onChange={e => setJambScores(prev => ({ ...prev, [subject]: parseInt(e.target.value) }))}
                        className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <span className="text-xs text-gray-400">/100</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">Total JAMB target</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={100}
                      max={400}
                      value={jambTotal}
                      onChange={e => setJambTotal(parseInt(e.target.value))}
                      className="w-20 text-sm border border-indigo-300 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-indigo-700"
                    />
                    <span className="text-xs text-gray-400">/400</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-base font-black rounded-2xl hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving...' : "Let's go! 🚀"}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}