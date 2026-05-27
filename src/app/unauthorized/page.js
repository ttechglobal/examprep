import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access denied</h1>
        <p className="text-gray-500 text-sm mb-6">
          You don't have permission to view this page.
        </p>
        <Link
          href="/login"
          className="text-sm text-indigo-600 font-medium hover:underline"
        >
          Back to login
        </Link>
      </div>
    </div>
  )
}