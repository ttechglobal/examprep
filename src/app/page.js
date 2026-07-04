// src/app/page.js — PUBLIC LANDING PAGE (server component, no 'use client')
// ─────────────────────────────────────────────────────────────────────────────
// Full light + dark via CSS tokens. Reads .dark class from ThemeProvider.
// Flat, game-inspired illustration style — emoji icons in tinted containers.
// EXL Navy brand throughout. "Start Practising →" → /onboarding
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'

// ── Shared inline style helpers ──────────────────────────────────────────────
// These are used in JSX style props — server-safe (no hooks, no client state)

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-base text-primary">

      {/* ════════════════════════════════════════
          HEADER
          ════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-card border-b border-default"
        style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="max-w-5xl mx-auto px-5 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{
              width: 30, height: 30, borderRadius: 9, background: '#0b1330',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff', boxShadow: '0 3px 0 #05070f',
            }}>E</div>
            <span className="text-sm font-black text-primary">
              Exam <span className="text-secondary font-medium">Prep</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="hidden sm:inline-flex px-3 py-1.5 text-sm font-bold text-secondary hover:text-primary hover:bg-subtle rounded-xl transition-colors">
              Sign in
            </Link>
            <Link href="/onboarding"
              className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-black text-white transition-all hover:-translate-y-px"
              style={{ background: '#0b1330', boxShadow: '0 4px 0 #05070f' }}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════
          HERO
          ════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-5 lg:px-8 pt-16 pb-14 text-center">
        {/* Exam badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-active border border-active text-active text-xs font-bold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-active inline-block"
            style={{ background: 'var(--active-text)' }} />
          Built for WAEC &amp; JAMB students in Nigeria
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-primary leading-[1.05] tracking-tight mb-5">
          Just practise.<br />
          <span style={{ color: '#3730a3' }}>Ace your exams.</span>
        </h1>

        <p className="text-base sm:text-lg text-secondary max-w-xl mx-auto leading-relaxed mb-8">
          Take a free diagnostic test. Get a practice plan built around your
          weak areas. Practise past questions every day. Watch your scores improve.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/onboarding"
            className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 rounded-2xl text-base font-black text-white transition-all hover:-translate-y-0.5"
            style={{ background: '#0b1330', boxShadow: '0 7px 0 #05070f, 0 10px 24px rgba(10,13,26,0.18)' }}>
            Take the free diagnostic →
          </Link>
          <Link href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 rounded-2xl text-base font-bold text-secondary bg-card border border-default hover:bg-subtle transition-colors"
            style={{ boxShadow: 'var(--shadow-sm)' }}>
            Sign in
          </Link>
        </div>

        <p className="text-xs text-tertiary mt-4">
          Free to start · No credit card · 2 minutes to get your plan
        </p>

        {/* Flat UI illustration — subject chips as visual decoration */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-10">
          {[
            { name: 'Chemistry', icon: '⚗️', bg: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: 'rgba(124,58,237,0.2)' },
            { name: 'Physics',   icon: '⚡', bg: 'rgba(219,39,119,0.08)', color: '#db2777', border: 'rgba(219,39,119,0.2)' },
            { name: 'Biology',   icon: '🧬', bg: 'rgba(5,150,105,0.08)',  color: '#059669', border: 'rgba(5,150,105,0.2)'  },
            { name: 'Mathematics', icon: '📐', bg: 'rgba(3,105,161,0.08)', color: '#0369a1', border: 'rgba(3,105,161,0.2)' },
            { name: 'Economics', icon: '📊', bg: 'rgba(180,83,9,0.08)',   color: '#b45309', border: 'rgba(180,83,9,0.2)'   },
            { name: 'Government', icon: '🏛️', bg: 'rgba(185,28,28,0.08)', color: '#b91c1c', border: 'rgba(185,28,28,0.2)' },
            { name: 'English',   icon: '📖', bg: 'rgba(124,58,237,0.06)', color: '#7c3aed', border: 'rgba(124,58,237,0.15)' },
            { name: 'Geography', icon: '🌍', bg: 'rgba(15,118,110,0.08)', color: '#0f766e', border: 'rgba(15,118,110,0.2)' },
          ].map(({ name, icon, bg, color, border }) => (
            <div key={name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: bg, color, border: `1px solid ${border}` }}>
              <span>{icon}</span>{name}
            </div>
          ))}
          <span className="text-xs text-tertiary px-2">+ more</span>
        </div>
      </section>

      {/* ════════════════════════════════════════
          HOW IT WORKS — flat illustration cards
          ════════════════════════════════════════ */}
      <section className="bg-subtle border-y border-default py-14">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <p className="text-[10px] font-black text-tertiary uppercase tracking-[0.12em] text-center mb-2">
            How it works
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-primary text-center tracking-tight mb-10">
            From start to exam-ready in 4 steps
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '01', icon: '🩺', label: 'Diagnostic test',
                desc: '5 questions per subject. We identify your weak topics instantly.',
                bg: 'rgba(67,56,202,0.08)', iconBg: 'rgba(67,56,202,0.12)', color: '#3730a3',
              },
              {
                step: '02', icon: '🎯', label: 'Personalised plan',
                desc: 'Your weakest, highest-frequency topics come first. Automatically.',
                bg: 'rgba(219,39,119,0.07)', iconBg: 'rgba(219,39,119,0.12)', color: '#db2777',
              },
              {
                step: '03', icon: '⚡', label: 'Practise every day',
                desc: 'Past questions, topic drills, timed sessions — in one place.',
                bg: 'rgba(180,83,9,0.07)', iconBg: 'rgba(180,83,9,0.12)', color: '#b45309',
              },
              {
                step: '04', icon: '📈', label: 'Track your mastery',
                desc: 'Watch your subject mastery grow. Know exactly where you stand.',
                bg: 'rgba(5,150,105,0.07)', iconBg: 'rgba(5,150,105,0.12)', color: '#059669',
              },
            ].map(({ step, icon, label, desc, bg, iconBg, color }) => (
              <div key={step}
                className="bg-card rounded-2xl border border-default p-5 space-y-3"
                style={{ boxShadow: 'var(--shadow-card)' }}>
                {/* Icon in tinted container — flat illustration style */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: iconBg }}>
                    {icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.1em]"
                    style={{ color }}>
                    Step {step}
                  </span>
                </div>
                <p className="font-black text-primary text-sm">{label}</p>
                <p className="text-secondary text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOR STUDENTS / PARENTS / SCHOOLS
          ════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-5 lg:px-8 py-14">
        <h2 className="text-2xl sm:text-3xl font-black text-primary text-center tracking-tight mb-10">
          Built for everyone involved in exam success
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: '🎓', who: 'For Students',
              color: '#3730a3', iconBg: 'rgba(67,56,202,0.1)',
              points: [
                'Personalised practice plan from day one',
                'Past questions tagged by topic and year',
                'See exactly which topics to focus on',
                'Track your improvement week by week',
              ],
            },
            {
              icon: '👪', who: 'For Parents',
              color: '#b45309', iconBg: 'rgba(180,83,9,0.1)',
              points: [
                'Weekly progress reports by email',
                'Know which subjects your child is practising',
                'See if your child is active daily',
                'No expensive tutoring needed',
              ],
            },
            {
              icon: '🏫', who: 'For Schools',
              color: '#059669', iconBg: 'rgba(5,150,105,0.1)',
              points: [
                'Class-wide topic performance data',
                'See which topics students struggle with most',
                'Weekly improvement trends per cohort',
                'Identify at-risk students early',
              ],
            },
          ].map(({ icon, who, color, iconBg, points }) => (
            <div key={who}
              className="bg-card rounded-2xl border border-default p-5 space-y-4"
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: iconBg }}>
                  {icon}
                </div>
                <p className="font-black text-primary text-sm">{who}</p>
              </div>
              <ul className="space-y-2">
                {points.map(p => (
                  <li key={p} className="flex items-start gap-2 text-xs text-secondary leading-relaxed">
                    <span className="mt-0.5 flex-shrink-0 font-black" style={{ color }}>✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          FINAL CTA
          ════════════════════════════════════════ */}
      <section className="bg-subtle border-t border-default py-16">
        <div className="max-w-xl mx-auto px-5 text-center space-y-5">
          {/* Flat illustration — target emoji in navy container */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto"
            style={{ background: '#0b1330' }}>
            🎯
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
            Ready to start practising?
          </h2>
          <p className="text-secondary text-sm leading-relaxed">
            Takes 2 minutes to get your personalised practice plan. Free to start.
          </p>
          <Link href="/onboarding"
            className="inline-flex items-center px-8 py-4 rounded-2xl text-base font-black text-white transition-all hover:-translate-y-0.5"
            style={{ background: '#0b1330', boxShadow: '0 7px 0 #05070f, 0 10px 24px rgba(10,13,26,0.18)' }}>
            Take the free diagnostic →
          </Link>
          <p className="text-xs text-tertiary">
            Already have an account?{' '}
            <Link href="/login" className="text-active font-bold hover:underline">Sign in</Link>
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════ */}
      <footer className="border-t border-default bg-card">
        <div className="max-w-5xl mx-auto px-5 lg:px-8 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div style={{
              width: 24, height: 24, borderRadius: 7, background: '#0b1330',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, color: '#fff',
            }}>E</div>
            <span className="text-xs font-bold text-secondary">Exam Prep</span>
          </div>
          <p className="text-xs text-tertiary">
            © 2025 EXL Exam Prep · For Nigerian secondary school students
          </p>
        </div>
      </footer>
    </div>
  )
}