// src/components/admin/ExamTypeSelector.jsx
// Replaces every place in the admin UI that had a WAEC / JAMB / BOTH dropdown.
//
// Usage (single select — for filters, profile settings):
//   <ExamTypeSelector value={examType} onChange={setExamType} />
//
// Usage (multi-select — for question / subtopic edit forms):
//   <ExamTypeSelector
//     value={examTypes}          // string[] e.g. ['WAEC', 'JAMB']
//     onChange={setExamTypes}
//     multi
//   />

'use client'

const EXAMS = [
  { id: 'WAEC', label: 'WAEC', color: 'indigo' },
  { id: 'JAMB', label: 'JAMB', color: 'violet' },
  // Future: { id: 'IGCSE', label: 'IGCSE', color: 'emerald' },
]

const COLORS = {
  indigo: {
    active:   'bg-indigo-600 text-white border-indigo-600',
    inactive: 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300',
  },
  violet: {
    active:   'bg-violet-600 text-white border-violet-600',
    inactive: 'bg-white text-gray-700 border-gray-200 hover:border-violet-300',
  },
  emerald: {
    active:   'bg-emerald-600 text-white border-emerald-600',
    inactive: 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300',
  },
}

export default function ExamTypeSelector({ value, onChange, multi = false, className = '' }) {
  // Normalise: multi mode always works with string[], single mode with string
  const selected = multi
    ? (Array.isArray(value) ? value : [value].filter(Boolean))
    : value

  const isSelected = (id) => multi ? selected.includes(id) : selected === id

  const toggle = (id) => {
    if (multi) {
      const next = isSelected(id)
        ? selected.filter(e => e !== id)
        : [...selected, id]
      // Always keep at least one selected
      if (next.length === 0) return
      onChange(next)
    } else {
      onChange(id)
    }
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {EXAMS.map(exam => {
        const active = isSelected(exam.id)
        const { active: activeClass, inactive: inactiveClass } = COLORS[exam.color]
        return (
          <button
            key={exam.id}
            type="button"
            onClick={() => toggle(exam.id)}
            className={`
              px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all
              ${active ? activeClass : inactiveClass}
            `}
          >
            {multi && (
              <span className="mr-1.5">{active ? '☑' : '☐'}</span>
            )}
            {exam.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Utility: convert legacy exam_type string to exam_types array.
 * Use when reading from DB rows that may still have the old format.
 */
export function legacyToArray(examType) {
  if (!examType) return ['WAEC']
  if (examType === 'BOTH') return ['WAEC', 'JAMB']
  return [examType]
}

/**
 * Utility: summarise exam_types[] for display (badge text).
 * ['WAEC', 'JAMB'] → 'WAEC · JAMB'
 */
export function examTypesLabel(examTypes) {
  if (!Array.isArray(examTypes) || examTypes.length === 0) return '—'
  return examTypes.join(' · ')
}