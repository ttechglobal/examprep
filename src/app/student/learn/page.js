import { Suspense } from 'react'
import LearnPage from './LearnPage'

export default function LearnRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LearnPage />
    </Suspense>
  )
}