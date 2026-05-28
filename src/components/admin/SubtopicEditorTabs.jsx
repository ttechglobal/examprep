'use client'

// src/components/admin/SubtopicEditorTabs.jsx
// Thin tab wrapper that shows:
// Tab 1: Lesson (existing LessonEditorClient)
// Tab 2: Practice Questions (new GeneratedQuestionsPanel)
// This avoids modifying LessonEditorClient directly.

import { useState } from 'react'
import dynamic from 'next/dynamic'
import GeneratedQuestionsPanel from './GeneratedQuestionsPanel'

// Lazy-load the existing lesson editor to keep bundle splits clean
const LessonEditorClient = dynamic(() => import('./LessonEditorClient'), { ssr: false })

export default function SubtopicEditorTabs({ subject, topic, subtopic, generatedCount }) {
  const [tab, setTab] = useState('lesson')

  const isLive = subtopic.lesson_status === 'published'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{subtopic.name}</h1>
          <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${
            isLive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isLive ? 'Live ✅' : subtopic.lesson_status ?? 'No Lesson Yet'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setTab('lesson')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors whitespace-nowrap ${
            tab === 'lesson'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Lesson {isLive ? '✓' : ''}
        </button>
        <button
          onClick={() => setTab('questions')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors whitespace-nowrap ${
            tab === 'questions'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Practice Questions
          {generatedCount > 0
            ? <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">{generatedCount}</span>
            : <span className="ml-1.5 text-xs text-gray-400">0</span>
          }
        </button>
      </div>

      {/* Tab content */}
      {tab === 'lesson' && (
        <LessonEditorClient
          subject={subject}
          topic={topic}
          subtopic={subtopic}
        />
      )}

      {tab === 'questions' && (
        <GeneratedQuestionsPanel
          subject={subject}
          topic={topic}
          subtopic={subtopic}
        />
      )}
    </div>
  )
}