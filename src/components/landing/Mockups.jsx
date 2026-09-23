// src/components/landing/Mockups.jsx
// Code-built versions of real app screens for the marketing pages.
// No hooks, so they render on the server. Swap for real screenshots any time.

import m from './mockups.module.css'

export function Phone({ children, label }) {
  return (
    <div className={m.phone} role="img" aria-label={label}>
      {children}
    </div>
  )
}

export function BattleScreen() {
  const tiles = [
    { l: 'A', t: 'Mitochondrion', c: '#3B82F6', shadow: '#2563eb', picked: true },
    { l: 'B', t: 'Ribosome',      c: '#22C55E', shadow: '#16a34a' },
    { l: 'C', t: 'Nucleus',       c: '#F97316', shadow: '#ea580c' },
    { l: 'D', t: 'Vacuole',       c: '#8B5CF6', shadow: '#7c3aed' },
  ]
  return (
    <div className={`${m.screen} ${m.battle}`}>
      <div className={m.bTop}><span>⚔️ Battle · Biology</span><span>Q 4 / 10</span></div>
      <div className={m.vs}>
        <span className={m.vsSide}>You<span className={m.vsScore}>30</span></span>
        <span className={m.vsMid}>VS</span>
        <span className={m.vsSide}>Computer<span className={m.vsScore}>20</span></span>
      </div>
      <div className={m.bRow}>
        <span className={m.timer}>⏱ 0:12</span>
        <span className={m.thinking}>Computer is thinking <i /><i /><i /></span>
      </div>
      <div className={m.card}>
        <span className={m.cardTag}>JAMB 2021</span>
        Which organelle is known as the powerhouse of the cell?
      </div>
      <div className={m.tiles}>
        {tiles.map(t => (
          <div key={t.l} className={`${m.tile} ${t.picked ? m.tilePicked : ''}`} style={{ background: t.c, boxShadow: `0 5px 0 ${t.shadow}` }}>
            {t.picked && <span className={m.plus}>+10</span>}
            <span className={m.tileLetter}>{t.l}</span>{t.t}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ExplanationScreen() {
  return (
    <div className={`${m.screen} ${m.light}`}>
      <div className={m.top}>
        <div className={m.topRow}><span>Physics · Study Practice</span><span className={m.muted}>3/5</span></div>
        <div className={m.bar}><span /></div>
      </div>
      <div className={m.body}>
        <span className={m.tag}>WAEC 2019 · Waves</span>
        <p className={m.q}>A wave has a frequency of 50 Hz and a wavelength of 2 m. What is its speed?</p>
        <div className={`${m.opt} ${m.right}`}><span className={m.optL}>✓</span>100 m/s</div>
        <div className={`${m.opt} ${m.wrong}`}><span className={m.optL}>✗</span>25 m/s</div>
        <div className={m.opt}><span className={m.optL}>C</span>52 m/s</div>
        <div className={m.explain}>
          <div className={m.explainTitle}>💡 Why it’s 100 m/s</div>
          <div className={m.stepRow}><span className={m.stepNum}>1</span><span>Every wave obeys v = f × λ.</span></div>
          <div className={m.stepRow}><span className={m.stepNum}>2</span><span>v = 50 × 2 = 100 m/s.</span></div>
          <div className={m.stepRow}><span className={m.stepNum}>3</span><span>25 m/s comes from dividing instead of multiplying.</span></div>
        </div>
      </div>
    </div>
  )
}

export function ProgressScreen() {
  const subjects = [
    { icon: '📐', name: 'Mathematics', pct: 74, color: '#FFB800' },
    { icon: '⚗️', name: 'Chemistry',   pct: 58, color: '#9b7ae0' },
    { icon: '🧬', name: 'Biology',     pct: 81, color: '#4ade80' },
    { icon: '⚡', name: 'Physics',     pct: 63, color: '#18B7F2' },
  ]
  return (
    <div className={`${m.screen} ${m.dark}`}>
      <div>
        <div className={m.hello}>Good evening, Tolu</div>
        <div className={m.helloSub}>JAMB · 4 subjects</div>
      </div>
      <div className={m.stats}>
        <div><strong>🔥 9</strong>day streak</div>
        <div><strong>✦ 1,240</strong>XP</div>
        <div><strong>⚔️ 6</strong>wins</div>
      </div>
      {subjects.map(s => (
        <div key={s.name} className={m.subj}>
          <span>{s.icon}</span>
          <span className={m.subjName}>{s.name}</span>
          <span className={m.subjBar}><span style={{ width: `${s.pct}%`, background: s.color }} /></span>
          <span className={m.pct} style={{ color: s.color }}>{s.pct}%</span>
        </div>
      ))}
      <div className={m.weakTitle}>Work on these next</div>
      <div>
        <span className={m.weak}>Mole concept</span>
        <span className={m.weak}>Quadratic equations</span>
        <span className={m.weak}>Electrolysis</span>
      </div>
    </div>
  )
}

export function LeaderboardCard({ label = 'This week · SS3 Science A' }) {
  const podium = [
    { n: 'Amaka', xp: '1,856', size: 40, h: 46, bg: 'linear-gradient(135deg,#0ea5e9,#818cf8)', medal: '🥈' },
    { n: 'Temi',  xp: '2,340', size: 50, h: 70, bg: 'linear-gradient(135deg,#18B7F2,#1264E5)', medal: '🥇' },
    { n: 'Chidi', xp: '1,620', size: 38, h: 34, bg: 'linear-gradient(135deg,#4ade80,#22c55e)', medal: '🥉' },
  ]
  return (
    <div className={m.board} role="img" aria-label="Weekly class leaderboard with a daily challenge">
      <div className={m.boardHead}>
        <div className={m.boardLabel}>{label}</div>
        <div className={m.tabs}><span className={m.tabOn}>School</span><span>National</span><span>All time</span></div>
        <div className={m.podium}>
          {podium.map(p => (
            <div key={p.n} className={m.pod}>
              <div className={m.avatar} style={{ width: p.size, height: p.size, background: p.bg, fontSize: p.size / 2.6 }}>{p.n[0]}</div>
              <span className={m.podName}>{p.n}</span>
              <span className={m.podXp}>{p.xp} XP</span>
              <div className={m.podBar} style={{ height: p.h }}>{p.medal}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={m.rows}>
        <div className={m.row}><span className={m.rank}>4</span><span className={m.rowName}>Ola</span><span className={m.rowXp}>1,245 XP</span></div>
        <div className={`${m.row} ${m.rowMe}`}><span className={m.rank}>5</span><span className={m.rowName}>You</span><span className={m.rowXp}>1,190 XP</span></div>
      </div>
      <div className={m.challenge}>
        <div className={m.challengeTop}>📅 Daily challenge <small>3 of 5 done</small></div>
        <div className={m.cBar}><span /></div>
      </div>
    </div>
  )
}

export function SchoolDashboard() {
  const subjects = [
    { n: 'Biology',   p: 79, c: '#22c55e' },
    { n: 'Physics',   p: 74, c: '#f59e0b' },
    { n: 'Chemistry', p: 61, c: '#ef4444' },
  ]
  const topics = [
    { n: 'Mole concept',     p: 38 },
    { n: 'Logarithms',       p: 44 },
    { n: 'Chemical bonding', p: 51 },
  ]
  const week = [34, 52, 47, 68, 61, 80, 72]
  return (
    <div className={m.dash} role="img" aria-label="School dashboard showing class performance by subject and topic">
      <div className={m.dashHead}>
        <div><div className={m.dashTitle}>SS3 Science A</div><div className={m.dashMeta}>34 students · this week</div></div>
        <span className={m.live}>Live</span>
      </div>
      <div className={m.kpis}>
        <div className={m.kpi}><div className={m.kpiNum}>28</div><div className={m.kpiLabel}>Practised this week</div></div>
        <div className={m.kpi}><div className={m.kpiNum} style={{ color: '#059669' }}>71%</div><div className={m.kpiLabel}>Class average</div></div>
        <div className={m.kpi}><div className={m.kpiNum} style={{ color: '#dc2626' }}>6</div><div className={m.kpiLabel}>Need support</div></div>
      </div>
      <div className={m.dashSub}>Daily practice</div>
      <div className={m.eng} aria-hidden="true">{week.map((h, i) => <div key={i} style={{ height: `${h}%` }} />)}</div>
      <div className={m.dashSub}>By subject</div>
      {subjects.map(s => (
        <div key={s.n} className={m.dRow}><span>{s.n}</span><span className={m.track}><span style={{ width: `${s.p}%`, background: s.c }} /></span><span className={m.dPct} style={{ color: s.c }}>{s.p}%</span></div>
      ))}
      <div className={m.dashSub} style={{ marginTop: 8 }}>Topics needing attention</div>
      {topics.map(t => (
        <div key={t.n} className={m.dRow}><span>{t.n}</span><span className={m.track}><span style={{ width: `${t.p}%`, background: '#ef4444' }} /></span><span className={m.dPct} style={{ color: '#dc2626' }}>{t.p}%</span></div>
      ))}
      <div className={m.alert}>🚨 <span><strong>Mole concept</strong> is the weakest topic: 38% class average</span></div>
    </div>
  )
}