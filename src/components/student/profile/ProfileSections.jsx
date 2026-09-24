'use client'
// src/components/student/profile/ProfileSections.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Presentational sections of the profile page. Each takes plain props and
// callbacks; data loading and sheet state live in app/student/profile/page.js.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { useId, useState } from 'react'
import s from './profile.module.css'
import {
  ArrowRight, ChevronRight, Pencil, RankMedal, HeroArt, Crown, Compass, Parents,
  CareerArt, ReportArt, SubjectGlyph, StatBook, StatTarget, StatBolt, StatBars,
  SmallBars, GoalCap, GoalBook, GoalTarget, SetPalette, SetBell, SetGlobe, SetShield,
} from './icons'
import { getRankProgress, initialsOf, subjectsFor, formatDuration } from './profileModel'

// ── Hero ─────────────────────────────────────────────────────────────────────
export function ProfileHero({ profile, xp, isGuest, onEdit }) {
  const name = profile?.full_name || profile?.username || 'Student'
  const { rank, next, pct, xpToNext } = getRankProgress(xp)
  // "Silver II" → 2, "Gold I" → 1; single-step ranks get a star.
  const medal = / II$/.test(rank.name) ? '2' : / I$/.test(rank.name) ? '1' : '★'

  return (
    <section className={s.hero} aria-label="Your profile">
      <div className={s.heroArt}><HeroArt /></div>

      <div className={s.avatarWrap}>
        <div className={s.avatar} aria-hidden="true">{initialsOf(name)}</div>
        <button type="button" className={s.avatarEdit} onClick={onEdit} aria-label="Edit your details">
          <Pencil size={15} />
        </button>
      </div>

      <div className={s.heroBody}>
        <h1 className={s.heroName}>{name}</h1>
        {profile?.username && <p className={s.heroHandle}>@{profile.username}</p>}
        {isGuest && <p className={s.guestNote}>Guest: progress is saved on this device</p>}

        <div className={s.rankRow}>
          <RankMedal label={medal} />
          <span>{rank.name}</span>
          {next && (
            <>
              <span
                className={s.rankBar}
                role="progressbar"
                aria-label={`Progress to ${next.name}`}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
              >
                <span style={{ width: `${pct}%` }} />
              </span>
              <span className={s.rankNext} suppressHydrationWarning>
                {xpToNext.toLocaleString()} XP to {next.name}
              </span>
            </>
          )}
        </div>
      </div>

      <button type="button" className={s.heroEdit} onClick={onEdit}>
        <Pencil size={16} /> Edit Profile
      </button>
    </section>
  )
}

// ── Plan status ──────────────────────────────────────────────────────────────
export function PlanCard({ plan, onSeePlans }) {
  return (
    <section className={`${s.card} ${s.plan}`} aria-label="Plan status">
      <div className={s.planIcon}><Crown /></div>
      <div>
        <p className={s.planLabel}>Plan Status</p>
        <p className={s.planTitle}>{plan.title}</p>
        <p className={s.planDetail}>{plan.detail}</p>
      </div>
      <button type="button" className={s.outlineBtn} onClick={onSeePlans}>See Plans</button>
      {plan.pct != null && (
        <div className={s.planBar} role="progressbar" aria-label="Trial used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={plan.pct}>
          <span style={{ width: `${plan.pct}%` }} />
        </div>
      )}
    </section>
  )
}

// ── Career Quest / Parents Report ────────────────────────────────────────────
const FEATURE_ART = { career: CareerArt, parents: ReportArt }
const FEATURE_ICON = { career: Compass, parents: Parents }

export function FeatureCard({ kind, title, text, onOpen }) {
  const Icon = FEATURE_ICON[kind]
  const Art  = FEATURE_ART[kind]
  return (
    <button type="button" className={`${s.card} ${s.feature}`} onClick={onOpen}>
      <span className={s.featureIcon}><Icon /></span>
      <span className={s.featureBody}>
        <span className={s.featureTitle} style={{ display: 'block' }}>{title}</span>
        <span className={s.featureText} style={{ display: 'block' }}>{text}</span>
      </span>
      <span className={s.featureChevron}><ChevronRight /></span>
      <span className={s.featureArt}><Art /></span>
    </button>
  )
}

// ── Exams & Subjects ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'WAEC', label: 'WAEC' },
  { id: 'JAMB', label: 'JAMB' },
  { id: 'ALL',  label: 'All Subjects' },
]

export function SubjectsCard({ profile, defaultExam = 'WAEC', onViewAll, onOpenExam }) {
  const [tab, setTab] = useState(defaultExam)
  const panelId = useId()
  const subjects = subjectsFor(profile, tab === 'ALL' ? null : tab)

  function onTabKey(e) {
    const i = TABS.findIndex(t => t.id === tab)
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const nextTab = TABS[(i + step + TABS.length) % TABS.length]
    setTab(nextTab.id)
    e.currentTarget.parentElement.querySelector(`[data-tab="${nextTab.id}"]`)?.focus()
  }

  return (
    <section className={s.card} aria-labelledby={`${panelId}-h`}>
      <div className={s.cardHead}>
        <h2 id={`${panelId}-h`} className={s.cardTitle}>Exams &amp; Subjects</h2>
        <button type="button" className={s.textLink} onClick={onViewAll}>
          View all subjects <ArrowRight />
        </button>
      </div>

      <div className={s.tabs} role="tablist" aria-label="Exam">
        {TABS.map(t => (
          <button
            key={t.id} type="button" role="tab" data-tab={t.id}
            className={s.tab}
            aria-selected={tab === t.id}
            aria-controls={panelId}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={onTabKey}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id={panelId} role="tabpanel">
        {subjects.length ? (
          <div className={s.subjectGrid}>
            {subjects.map(name => (
              <button
                key={name} type="button" className={s.subject}
                onClick={() => onOpenExam(tab === 'ALL' ? null : tab)}
                aria-label={`${name}: edit ${tab === 'ALL' ? '' : `${tab} `}subjects`}
              >
                <span className={s.subjectIcon}><SubjectGlyph name={name} /></span>
                <span>{name}</span>
                <ChevronRight size={12} />
              </button>
            ))}
          </div>
        ) : (
          <div className={s.empty}>
            <span>
              {tab === 'ALL' ? 'You haven’t picked any subjects yet.' : `No ${tab} subjects yet.`}
            </span>
            <button type="button" className={s.primaryBtn} onClick={() => onOpenExam(tab === 'ALL' ? null : tab)}>
              Add subjects
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Your Activity ────────────────────────────────────────────────────────────
export function ActivityCard({ period, onPeriodChange, stats, loading }) {
  const id = useId()
  const tiles = [
    { Icon: StatBook,   bg: 'rgba(34,197,94,.12)', value: stats.questions.toLocaleString(), label: 'Questions Practiced' },
    { Icon: StatTarget, bg: 'rgba(244,63,94,.1)', value: `${stats.accuracy}%`,             label: 'Average Score' },
    { Icon: StatBolt,   bg: 'rgba(245,158,11,.14)', value: String(stats.streak),             label: 'Day Streak' },
    { Icon: StatBars,   bg: 'rgba(18,100,229,.09)', value: formatDuration(stats.timeSecs),   label: 'Time Spent' },
  ]

  return (
    <section className={s.card} aria-labelledby={`${id}-h`}>
      <div className={s.cardHead}>
        <h2 id={`${id}-h`} className={s.cardTitle}>Your Activity</h2>
        <select
          className={s.periodSelect}
          value={period}
          onChange={e => onPeriodChange(e.target.value)}
          aria-label="Activity period"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      <div className={s.stats} aria-busy={loading}>
        {tiles.map(({ Icon, bg, value, label }) => (
          <div key={label} className={s.stat}>
            <span className={s.statIcon} style={{ background: bg }}><Icon /></span>
            <div style={{ minWidth: 0 }}>
              <p className={s.statValue} data-loading={loading}>{value}</p>
              <p className={s.statLabel}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      <Link href="/student/progress" className={s.progressLink}>
        <SmallBars /> View detailed progress <ArrowRight />
      </Link>
    </section>
  )
}

// ── Row list (Goals + Settings) ──────────────────────────────────────────────
function Row({ Icon, label, value, onClick }) {
  return (
    <li>
      <button type="button" className={s.row} onClick={onClick}>
        <span className={s.rowIcon}><Icon /></span>
        <span className={s.rowLabel}>{label}</span>
        <span className={s.rowValue}>{value}</span>
        <span className={s.rowChevron}><ChevronRight /></span>
      </button>
    </li>
  )
}

export function GoalsCard({ goals, onEdit }) {
  const id = useId()
  return (
    <section className={s.card} aria-labelledby={`${id}-h`}>
      <div className={s.cardHead}>
        <h2 id={`${id}-h`} className={s.cardTitle}>Goals &amp; Targets</h2>
        <button type="button" className={s.textLink} onClick={() => onEdit(null)}>
          Edit Goals <ArrowRight />
        </button>
      </div>
      <ul className={`${s.list} ${s.goalsList}`}>
        <Row Icon={GoalCap}    label="University Goal"  value={goals.university || 'Not set'} onClick={() => onEdit('university')} />
        <Row Icon={GoalBook}   label="Preferred Course" value={goals.course     || 'Not set'} onClick={() => onEdit('university')} />
        <Row Icon={GoalTarget} label="JAMB Target"      value={goals.jamb ? `${goals.jamb} / 400` : 'Not set'} onClick={() => onEdit('jamb')} />
      </ul>
    </section>
  )
}

export function SettingsCard({ dark, notifications, onAppearance, onNotifications, onLanguage, onAccount }) {
  const id = useId()
  return (
    <section className={s.card} aria-labelledby={`${id}-h`}>
      <div className={s.cardHead}>
        <h2 id={`${id}-h`} className={s.cardTitle}>Settings</h2>
      </div>
      <ul className={`${s.list} ${s.settingsList}`}>
        <Row Icon={SetPalette} label="Appearance"         value={dark ? 'Dark Mode' : 'Light Mode'} onClick={onAppearance} />
        <Row Icon={SetBell}    label="Notifications"      value={notifications}                     onClick={onNotifications} />
        <Row Icon={SetGlobe}   label="Language"           value="English"                            onClick={onLanguage} />
        <Row Icon={SetShield}  label="Account & Security" value=""                                   onClick={onAccount} />
      </ul>
    </section>
  )
}

// ── Setup + guest banners ────────────────────────────────────────────────────
export function Banner({ tone = 'info', title, body, action }) {
  return (
    <div className={`${s.banner} ${tone === 'guest' ? s.bannerGuest : ''}`}>
      <div className={s.bannerText}>
        <p className={s.bannerTitle}>{title}</p>
        <p className={s.bannerBody}>{body}</p>
      </div>
      {action}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className={s.page} aria-busy="true" aria-label="Loading your profile">
      <div className={s.skeleton} style={{ height: 164 }} />
      <div className={s.featureRow}>
        {[0, 1, 2].map(i => <div key={i} className={s.skeleton} style={{ height: 130 }} />)}
      </div>
      <div className={s.mainGrid}>
        <div className={s.skeleton} style={{ height: 290 }} />
        <div className={s.skeleton} style={{ height: 290 }} />
      </div>
    </div>
  )
}

export { s as styles }
