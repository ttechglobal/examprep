'use client'
// src/components/student/WeekActivityCard.jsx
// The week chart card: questions per day (Mon–Sun, today in orange with a
// "12 Qs" label), then questions, streak and total XP.
// Used by Home ("This Week") and Practice ("Practice Streak"); both feed it
// from hooks/useStudentActivity.js. Styles: ./WeekActivityCard.module.css.
//
// Props: title · link { href, label } · days [{ date, label, count }] ·
//        today 'YYYY-MM-DD' · questions · questionsLabel · streak · xp

import Link from 'next/link'
import s from './WeekActivityCard.module.css'

const cx = (...names) => names.filter(Boolean).join(' ')

export default function WeekActivityCard({ title, link, days, today, questions, questionsLabel = 'Questions', streak, xp }) {
  const max = Math.max(1, ...days.map(d => d.count))

  return (
    <section className={s.card} aria-label={title}>
      <div className={s.head}>
        <h2 className={s.title}>{title}</h2>
        {link && <Link href={link.href} className={s.link}>{link.label}</Link>}
      </div>

      <div className={s.bars}>
        {days.map(d => {
          const isToday = d.date === today
          return (
            <div key={d.date} className={s.barCol}>
              <div className={s.barTrack}>
                {isToday && d.count > 0 && (
                  <span className={s.bubble} style={{ bottom: `${Math.max(8, (d.count / max) * 100)}%` }}>{d.count} Qs</span>
                )}
                <div
                  className={cx(s.bar, isToday ? s.barToday : d.count === 0 && s.barEmpty)}
                  style={{ height: d.count ? `${Math.max(12, (d.count / max) * 100)}%` : 6 }}
                  title={`${d.label}: ${d.count} questions`}
                />
              </div>
              <span className={cx(s.dayLabel, isToday && s.dayToday)}>{d.label}</span>
            </div>
          )
        })}
      </div>

      <div className={s.stats}>
        <div className={cx(s.stat, s.statQuestions)}>
          <span className={cx(s.statIcon, s.statIconBlue)} aria-hidden="true"><CalendarIcon /></span>
          <div style={{ minWidth: 0 }}>
            <div className={s.statValue}>{questions.toLocaleString()}</div>
            <div className={s.statLabel}>{questionsLabel}</div>
          </div>
        </div>
        <div className={s.stat}>
          <span className={s.statIcon} aria-hidden="true">🔥</span>
          <div style={{ minWidth: 0 }}>
            <div className={s.statValue}>{streak} {streak === 1 ? 'Day' : 'Days'}</div>
            <div className={s.statLabel}>Practice Streak</div>
          </div>
        </div>
        <div className={cx(s.stat, s.statXp)}>
          <span className={s.statIcon} aria-hidden="true">⚡</span>
          <div style={{ minWidth: 0 }}>
            <div className={s.statValue} suppressHydrationWarning>{xp.toLocaleString()}</div>
            <div className={s.statLabel}>Total XP</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="currentColor" opacity=".2" />
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 14h2M12 14h2M8 17h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
