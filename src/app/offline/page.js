// src/app/offline/page.js
// Shown by the service worker when navigation fails and no cache is available.
// This should almost never be seen — the SW caches navigation pages.

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto">
          <span className="text-3xl">📶</span>
        </div>
        <div>
          <h1 className="text-xl font-black text-primary mb-2">You're offline</h1>
          <p className="text-secondary text-sm leading-relaxed">
            No internet connection right now. Your downloaded practice questions are still available
            — go back to the dashboard to keep studying.
          </p>
        </div>
        <a
          href="/student/dashboard"
          className="block w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors text-center"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  )
}