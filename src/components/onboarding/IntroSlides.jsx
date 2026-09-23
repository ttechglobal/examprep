'use client'
// src/components/onboarding/IntroSlides.jsx
// First-launch slides: fun → battle → practice modes → leaderboard → Get started.
// Swipe, tap the progress bar, or use the arrow keys to move between slides.

import { useEffect, useRef, useState } from 'react'
import Zara from './Zara'
import s from './onboarding.module.css'

function HeroArt() {
  return (
    <div className={s.hero} aria-hidden="true">
      <div className={s.heroGlow} />
      <Zara size={170} />
      <div className={`${s.sticker} ${s.stickerA}`}><span>🔥</span><span>5-day streak<small>Keep it going</small></span></div>
      <div className={`${s.sticker} ${s.stickerB}`}><span>⚡</span><span>+20 XP</span></div>
      <div className={`${s.sticker} ${s.stickerC}`}><span>🏆</span><span>Top of your class</span></div>
    </div>
  )
}

function BattleArt() {
  const tiles = [
    { l: 'A', t: 'Mitochondrion', bg: '#3B82F6', edge: '#2563eb', picked: true },
    { l: 'B', t: 'Ribosome',      bg: '#22C55E', edge: '#16a34a' },
    { l: 'C', t: 'Nucleus',       bg: '#F97316', edge: '#ea580c' },
    { l: 'D', t: 'Vacuole',       bg: '#8B5CF6', edge: '#7c3aed' },
  ]
  return (
    <div className={s.battle} aria-hidden="true">
      <div className={s.vs}>
        <div className={s.fighter}>
          <div className={`${s.avatar} ${s.avatarYou}`}>You</div>
          <div><div className={s.fighterName}>You</div><div className={s.score}>7</div></div>
          <span className={s.plus}>+10</span>
        </div>
        <div className={s.vsBadge}>VS</div>
        <div className={`${s.fighter} ${s.fighterRight}`}>
          <div><div className={s.fighterName}>Computer</div><div className={s.score}>5</div></div>
          <div className={`${s.avatar} ${s.avatarBot}`}>🤖</div>
        </div>
      </div>
      <div className={s.timer}><span /></div>
      <p className={s.question}>Which part of the cell releases energy during respiration?</p>
      <div className={s.tiles}>
        {tiles.map(t => (
          <div key={t.l} className={`${s.tile} ${t.picked ? s.tilePicked : ''}`}
            style={{ background: t.bg, boxShadow: `0 4px 0 ${t.edge}` }}>
            <b>{t.l}</b>{t.t}
          </div>
        ))}
      </div>
    </div>
  )
}

const MODES = [
  { icon: '⚔️', name: 'Battle',      hint: 'You vs the computer', bg: 'rgba(18,100,229,.14)', edge: '#9dbcf0' },
  { icon: '⚡', name: 'Quick 5',     hint: 'Five fast questions',  bg: 'rgba(34,197,94,.15)',  edge: '#a6e3bb' },
  { icon: '⏱',  name: 'Speed Round', hint: 'Beat the clock',       bg: 'rgba(255,106,0,.14)',  edge: '#f7c29d' },
  { icon: '🎯', name: 'Topic',       hint: 'Drill one topic',      bg: 'rgba(24,183,242,.15)', edge: '#a3dcf3' },
  { icon: '📖', name: 'Study',       hint: 'Learn as you go',      bg: 'rgba(155,122,224,.16)', edge: '#cdbdf0' },
  { icon: '📝', name: 'Mock Exam',   hint: 'The real thing',       bg: 'rgba(255,184,0,.18)',  edge: '#f3d98a' },
]

function ModesArt() {
  return (
    <div className={s.modes} aria-hidden="true">
      {MODES.map(m => (
        <div key={m.name} className={s.mode} style={{ '--mode-bg': m.bg, '--mode-edge': m.edge }}>
          <div className={s.modeIcon}>{m.icon}</div>
          <div className={s.modeName}>{m.name}</div>
          <div className={s.modeHint}>{m.hint}</div>
        </div>
      ))}
    </div>
  )
}

function BoardArt() {
  const rows = [
    { r: 1, i: 'AO', n: 'Amaka',  xp: '2,340' },
    { r: 2, i: '⭐', n: 'You',    xp: '2,180', you: true, up: '▲ 3' },
    { r: 3, i: 'TB', n: 'Tunde',  xp: '2,050' },
    { r: 4, i: 'CE', n: 'Chidi',  xp: '1,890' },
  ]
  return (
    <div className={s.board} aria-hidden="true">
      <span className={s.xpBurst}>+120 XP</span>
      <div className={s.boardHead}>Your class this week</div>
      {rows.map(row => (
        <div key={row.r} className={`${s.row} ${row.you ? s.rowYou : ''}`}>
          <span className={s.rank}>{row.r}</span>
          <span className={s.face}>{row.i}</span>
          <span>{row.n}{row.up && <span className={s.up}>{row.up}</span>}</span>
          <span className={s.xp}>{row.xp}</span>
        </div>
      ))}
    </div>
  )
}

const SLIDES = [
  { art: HeroArt,   title: 'What if practice could be fun?', body: 'Real WAEC and JAMB past questions, built like a game you actually want to play.' },
  { art: BattleArt, title: 'You vs the computer',            body: 'Answer before the timer, and before the computer does. Every correct answer wins you points.' },
  { art: ModesArt,  title: 'A way to practise for every mood', body: 'Five minutes on the bus or a full mock exam on Saturday. Pick what fits.' },
  { art: BoardArt,  title: 'Earn points. Climb the board.',  body: 'Every question you practise earns XP. Rise up your class and national leaderboards.' },
]

export default function IntroSlides({ onDone }) {
  const [index, setIndex] = useState(0)
  const last = index === SLIDES.length - 1
  const start = useRef(null)

  const go = i => setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)))
  const next = () => (last ? onDone() : go(index + 1))

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') setIndex(i => Math.min(SLIDES.length - 1, i + 1))
      if (e.key === 'ArrowLeft')  setIndex(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onPointerDown(e) { start.current = { x: e.clientX, y: e.clientY } }
  function onPointerUp(e) {
    if (!start.current) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    start.current = null
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1))
  }

  return (
    <>
      <div className={s.top}>
        <div className={s.brand}>
          <div className={s.brandMark}>EX</div>
          <span className={s.brandName}>ExamPrep A1</span>
        </div>
        {!last && <button className={s.textButton} onClick={onDone}>Skip</button>}
      </div>

      <div
        className={s.track}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { start.current = null }}
        aria-roledescription="carousel"
      >
        <div className={s.slides} style={{ transform: `translateX(-${index * 100}%)` }}>
          {SLIDES.map((slide, i) => {
            const Art = slide.art
            return (
              <section
                key={slide.title}
                className={s.slide}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${SLIDES.length}`}
                aria-hidden={i !== index}
              >
                <div className={s.stage}><Art /></div>
                <div className={s.copy}>
                  <h1 className={s.title}>{slide.title}</h1>
                  <p className={s.body}>{slide.body}</p>
                </div>
              </section>
            )
          })}
        </div>
      </div>

      <div className={s.footer}>
        <div className={s.progress}>
          {SLIDES.map((slide, i) => (
            <button
              key={slide.title}
              className={`${s.seg} ${i <= index ? s.segOn : ''}`}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? 'step' : undefined}
            />
          ))}
        </div>
        <button className={s.cta} onClick={next}>{last ? 'Get started' : 'Next'}</button>
      </div>
    </>
  )
}
