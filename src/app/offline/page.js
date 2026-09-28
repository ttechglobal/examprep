// src/app/offline/page.js
// Shown by the service worker (public/sw.js) when a page is opened offline
// that isn't saved on the phone yet. The main student pages are saved, so
// "Back to home" works offline.
//
// v2: the old text promised downloaded practice questions, which don't exist yet.

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
            This page isn&apos;t saved on your phone yet. The main pages of the app still work,
            so go back home and carry on. Questions need internet to load.
          </p>
        </div>
        <a
          href="/student/home"
          className="block w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors text-center"
        >
          Back to home
        </a>
      </div>
    </div>
  )
}