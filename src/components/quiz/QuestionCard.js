'use client'

import { useState } from 'react'

const DIFFICULTY_COLORS = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-red-100 text-red-700',
}

export default function QuestionCard({
  question,
  onAnswer,
  showExplanation = true,
  color,
}) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const isCorrect = selected === question.correct_answer

  const handleSelect = (key) => {
    if (revealed) return
    setSelected(key)
    setRevealed(true)
    onAnswer?.({
      questionId: question.id,
      selected: key,
      isCorrect: key === question.correct_answer,
      subtopicId: question.subtopic_id,
      topicId: question.topic_id,
    })
  }

  return (
    <div className="space-y-4">

      {/* Image if present */}
      {question.has_image && question.image_url && (
        <div className="rounded-2xl overflow-hidden bg-gray-50">
          <img src={question.image_url} alt={question.image_description ?? 'Question diagram'} className="w-full object-contain max-h-48" />
          {question.image_description && (
            <p className="text-xs text-gray-500 text-center px-3 py-2 italic">{question.image_description}</p>
          )}
        </div>
      )}

      {/* Question text */}
      <p className="text-base font-semibold text-gray-900 leading-relaxed">
        {question.question_text}
      </p>

      {/* Options */}
      <div className="space-y-2.5">
        {Object.entries(question.options ?? {}).map(([key, text]) => {
          let style = 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'

          if (revealed) {
            if (key === question.correct_answer) {
              style = 'border-green-400 bg-green-50 text-green-800'
            } else if (key === selected) {
              style = 'border-red-300 bg-red-50 text-red-700'
            } else {
              style = 'border-gray-100 bg-gray-50 text-gray-400'
            }
          } else if (key === selected) {
            style = `border-indigo-400 bg-indigo-50 text-indigo-800`
          }

          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-all ${style} ${!revealed ? 'active:scale-[0.99]' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${
                  revealed && key === question.correct_answer
                    ? 'border-green-400 bg-green-100 text-green-700'
                    : revealed && key === selected
                    ? 'border-red-300 bg-red-100 text-red-600'
                    : 'border-current'
                }`}>
                  {revealed && key === question.correct_answer ? '✓' :
                   revealed && key === selected ? '✗' : key}
                </span>
                <span className="leading-snug flex-1">{text}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Explanation card */}
      {revealed && showExplanation && (
        <div className={`rounded-2xl overflow-hidden border ${isCorrect ? 'border-green-200' : 'border-orange-200'}`}>

          {/* Result header */}
          <div className={`px-4 py-3 ${isCorrect ? 'bg-green-50' : 'bg-orange-50'}`}>
            <p className={`font-black text-sm ${isCorrect ? 'text-green-700' : 'text-orange-700'}`}>
              {isCorrect ? '🎉 Correct! Well done.' : '🤔 Not quite — let\'s understand why.'}
            </p>
          </div>

          <div className="bg-white px-4 py-4 space-y-4">
            {/* Correct answer explanation */}
            <div>
              <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">
                ✓ {question.correct_answer} is correct because:
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {question.explanation?.correct}
              </p>
            </div>

            {/* Workings */}
            {question.explanation?.workings?.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Step-by-step working
                </p>
                <div className="space-y-2">
                  {question.explanation.workings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        {w.step}
                      </span>
                      <p className="text-sm text-gray-700 leading-relaxed font-mono">
                        {w.instruction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wrong options */}
            {question.explanation?.wrong_options && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Why the other options are wrong:
                </p>
                <div className="space-y-2">
                  {Object.entries(question.explanation.wrong_options)
                    .filter(([key]) => key !== question.correct_answer)
                    .map(([key, reason]) => (
                      <div key={key} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          {key}
                        </span>
                        <p className="text-xs text-gray-600 leading-relaxed">{reason}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}