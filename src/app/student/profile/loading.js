import { ListSkeleton } from '@/components/ui/Skeletons'
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-40 w-full rounded-3xl" />
      <div className="skeleton h-20 w-full rounded-2xl" />
      <ListSkeleton rows={5} rowHeight="h-14" />
    </div>
  )
}