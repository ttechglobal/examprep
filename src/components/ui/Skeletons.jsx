// src/components/ui/Skeletons.jsx
// Reusable skeleton loader components used across all pages while data loads.
// Import the one matching the page's content structure.

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-7 w-36" />
        </div>
      </div>
      {/* Goals card */}
      <div className="skeleton h-32 w-full rounded-3xl" />
      {/* Practice CTA */}
      <div className="skeleton h-16 w-full rounded-3xl" />
      {/* Subject grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
      </div>
      {/* Study plan */}
      <div className="skeleton h-48 w-full rounded-3xl" />
    </div>
  )
}

export function LearnHubSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1.5">
        <div className="skeleton h-7 w-32" />
        <div className="skeleton h-4 w-48" />
      </div>
      <div className="skeleton h-9 w-24 rounded-full" />
      {/* Study plan */}
      <div className="skeleton h-44 w-full rounded-3xl" />
      {/* Subject grid */}
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
    </div>
  )
}

export function SubjectPageSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="skeleton h-4 w-16" />
      <div className="skeleton h-28 w-full rounded-3xl" />
      <div className="skeleton h-14 w-full rounded-2xl" />
      <div className="skeleton h-10 w-full rounded-2xl" />
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-16 w-full rounded-2xl" />)}
    </div>
  )
}

export function PracticePageSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-1.5">
        <div className="skeleton h-7 w-36" />
        <div className="skeleton h-4 w-52" />
      </div>
      <div className="skeleton h-9 w-40 rounded-2xl" />
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 w-full rounded-2xl" />)}
    </div>
  )
}

export function VideoPageSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-1.5">
        <div className="skeleton h-7 w-36" />
        <div className="skeleton h-4 w-60" />
      </div>
      <div className="skeleton h-10 w-full rounded-2xl" />
      <div className="flex gap-2">
        {[1,2,3].map(i => <div key={i} className="skeleton h-8 w-20 rounded-full" />)}
      </div>
      {[1,2,3].map(i => <div key={i} className="skeleton h-32 w-full rounded-2xl" />)}
    </div>
  )
}

export function CommunityPageSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-1.5">
        <div className="skeleton h-7 w-36" />
        <div className="skeleton h-4 w-52" />
      </div>
      <div className="flex gap-2">
        {[1,2,3].map(i => <div key={i} className="skeleton h-12 flex-1 rounded-2xl" />)}
      </div>
      <div className="skeleton h-24 w-full rounded-2xl" />
      {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-14 w-full rounded-2xl" />)}
    </div>
  )
}

export function CardSkeleton({ className = '' }) {
  return <div className={`skeleton rounded-2xl ${className}`} />
}

export function ListSkeleton({ rows = 4, rowHeight = 'h-14' }) {
  return (
    <div className="space-y-2 animate-in fade-in duration-300">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`skeleton w-full rounded-2xl ${rowHeight}`} />
      ))}
    </div>
  )
}