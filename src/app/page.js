import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">

      {/* Nav */}
      <nav className="px-4 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <span className="text-xl font-black text-indigo-600">ExamPrep</span>
        <Link
          href="/login"
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <div className="max-w-2xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="inline-block bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
          Built for Nigerian secondary school students 🇳🇬
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-4">
          Ace your WAEC and JAMB exams
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed mb-10">
          Take a free diagnostic test, get a personalised study plan, and study smarter — topic by topic.
        </p>

        {/* Student CTA */}
        <div className="space-y-3 max-w-sm mx-auto">
          <Link
            href="/diagnostic"
            className="block w-full py-4 bg-indigo-600 text-white text-base font-black rounded-2xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-200"
          >
            Start free diagnostic test →
          </Link>
          <Link
            href="/login"
            className="block w-full py-3.5 bg-white text-gray-700 text-sm font-semibold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            I already have an account
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { emoji: '🎯', title: 'Personalised plan', desc: 'We find your weak areas and build a study path just for you' },
          { emoji: '📚', title: 'Topic-by-topic lessons', desc: 'Clear, structured lessons with inline checks to keep you engaged' },
          { emoji: '📊', title: 'Track your progress', desc: 'See how much you\'ve improved week by week' },
        ].map(f => (
          <div key={f.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <span className="text-3xl">{f.emoji}</span>
            <h3 className="font-black text-gray-900 mt-2 mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* School CTA */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white text-center">
          <p className="text-2xl mb-1">🏫</p>
          <h2 className="text-xl font-black mb-2">Are you a school?</h2>
          <p className="text-indigo-200 text-sm mb-5 leading-relaxed">
            Set up ExamPrep for your students. Track class performance,
            identify weak topics, and monitor engagement — all in one dashboard.
          </p>
          <Link
            href="/school/signup"
            className="inline-block px-8 py-3 bg-white text-indigo-600 text-sm font-black rounded-2xl hover:bg-indigo-50 transition-colors"
          >
            Set up your school →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-gray-400">
        © {new Date().getFullYear()} ExamPrep · Built for Nigerian students
      </div>
    </div>
  )
}