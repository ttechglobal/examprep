'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import StudySession from '@/components/student/flashcards/StudySession'
import { loadFlashcards } from '@/lib/flashcardCache'
import { FLASHCARD_PROGRESS_KEY } from '@/lib/flashcards'
import s from '../flashcards.module.css'

function Session() {
  const params = useSearchParams()
  const router = useRouter()
  const query = params.toString()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let cancelled = false
    const search = new URLSearchParams(query)
    const topic = { id: search.get('topicId'), name: search.get('topicName') || 'Flashcards' }
    const subject = { name: search.get('subjectName') || 'Your subject' }
    const ids = search.get('topicIds')
    const request = new URLSearchParams({ topicId: topic.id || '' })
    if (ids) { request.set('topicIds', ids); topic.topic_ids = ids.split(',') }
    if (!topic.id) { Promise.resolve().then(() => setError('Choose a topic from the flashcard library first.')); return }
    loadFlashcards('?' + request, { refresh: version > 0 }).then(result => {
      let progress = {}
      try { progress = JSON.parse(localStorage.getItem(FLASHCARD_PROGRESS_KEY) || '{}') || {} } catch {}
      if (!cancelled) { setData({ cards: result.cards || [], topic, subject, saved: progress[topic.id] }); setError(null) }
    }).catch(() => { if (!cancelled) setError('Could not load your cards. Connect to the internet and try again.') })
    return () => { cancelled = true }
  }, [query, version])
  function save(patch) {
    try {
      const progress = JSON.parse(localStorage.getItem(FLASHCARD_PROGRESS_KEY) || '{}') || {}
      progress[data.topic.id] = { ...patch, lastStudied: Date.now(), topicName: data.topic.name, subjectName: data.subject.name, topicObj: data.topic, subjectObj: data.subject }
      localStorage.setItem(FLASHCARD_PROGRESS_KEY, JSON.stringify(progress))
    } catch {}
  }
  const exit = () => router.push('/student/learn/flashcards')
  return <main className={`${s.page} ${s.focusPage}`}>
    {error ? <div className={s.empty}><h1>{error}</h1><button className={s.primary} onClick={() => setVersion(v => v + 1)}>Try again</button><button className={s.textLink} onClick={exit}>← All subjects</button></div> : !data ? <div className={s.loading} role="status">Preparing your cards…<br /><button className={s.textLink} onClick={exit}>← All subjects</button></div> : !data.cards.length ? <div className={s.empty}><h1>No cards available in this deck</h1><button className={s.textLink} onClick={exit}>← All subjects</button></div> : <StudySession key={`${data.topic.id}-${version}`} {...data} onSave={save} onBack={exit} onRefresh={() => { setData(null); setVersion(v => v + 1) }} />}
  </main>
}
export default function FlashcardSessionPage() {
  return <Suspense fallback={<p className={s.loading}>Preparing your cards…</p>}><Session /></Suspense>
}
