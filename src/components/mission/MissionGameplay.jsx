'use client'
// src/components/mission/MissionGameplay.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The active mission play screen.
//
// LAYOUT (full viewport, no scroll on outer shell):
//   ① MissionHUD — 72px, fixed, never scrolls
//   ② Scroll zone — flex:1, contains question card + options + feedback
//   ③ Bottom action bar — fixed 72px, always same height (no layout jump)
//      Before answering: hint row + disabled Next
//      After answering:  verdict + XP gain + Next button (active)
//
// Question card = white content card with subject accent border (light mode).
// In dark mode: dark card with lighter accent border.
// Options: full-width tap targets, clear correct/wrong states.
// Feedback: inline below options, slides up on answer.
//
// XP float: +NNN ✦ floats up from XP pill on correct answer.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useIsDark } from '@/lib/useIsDark'
import MissionHUD from './MissionHUD'
import { MathText, injectMathStyles } from '@/lib/mathRenderer'

function safeJson(val, fb) {
  if (!val) return fb
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return fb }
}

// ── XP float animation ─────────────────────────────────────────────────────────
function XPFloat({ trigger, amount }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!trigger) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 900)
    return () => clearTimeout(t)
  }, [trigger])
  if (!visible) return null
  return (
    <span style={{
      position: 'absolute', top: -20, right: 0,
      fontSize: 11, fontWeight: 800, color: '#b45309',
      animation: 'xpfloat 0.9s ease-out forwards',
      pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
    }}>
      +{amount} ✦
      <style>{`
        @keyframes xpfloat {
          0%   { transform: translateY(0);    opacity: 1; }
          80%  { transform: translateY(-28px); opacity: 1; }
          100% { transform: translateY(-36px); opacity: 0; }
        }
      `}</style>
    </span>
  )
}

// ── Option button ───────────────────────────────────────────────────────────────
function OptionBtn({ optKey, text, answered, selected, correctKey, accent, isDark, onPick }) {
  const isSelected = selected === optKey
  const isCorrect  = answered && optKey === correctKey
  const isWrong    = answered && isSelected && !isCorrect
  const isDisabled = answered

  let bg, border, color, boxShadow
  if (isCorrect) {
    bg     = isDark ? 'rgba(74,222,128,.14)' : '#f0fdf4'
    border = isDark ? 'rgba(74,222,128,.45)' : '#22c55e'
    color  = isDark ? '#4ade80' : '#15803d'
    boxShadow = '0 3px 0 rgba(34,197,94,.15)'
  } else if (isWrong) {
    bg     = isDark ? 'rgba(248,113,113,.12)' : '#fef2f2'
    border = isDark ? 'rgba(248,113,113,.45)' : '#ef4444'
    color  = isDark ? '#f87171' : '#b91c1c'
    boxShadow = '0 3px 0 rgba(239,68,68,.15)'
  } else if (isSelected) {
    bg     = isDark ? `${accent}18` : `${accent}0f`
    border = accent
    color  = isDark ? 'rgba(255,255,255,.9)' : '#0a0d1a'
    boxShadow = `0 3px 0 ${accent}22`
  } else {
    bg     = isDark ? 'rgba(255,255,255,.03)' : '#fff'
    border = isDark ? 'rgba(255,255,255,.09)' : '#dde0f0'
    color  = isDark ? 'rgba(255,255,255,.7)' : '#0a0d1a'
    boxShadow = isDark ? 'none' : '0 1px 3px rgba(10,13,26,.04)'
  }

  const dotContent = isCorrect ? '✓' : isWrong ? '✗' : optKey
  let dotBg, dotColor
  if (isCorrect) { dotBg = '#22c55e'; dotColor = '#fff' }
  else if (isWrong) { dotBg = '#ef4444'; dotColor = '#fff' }
  else if (isSelected) { dotBg = accent; dotColor = '#fff' }
  else { dotBg = isDark ? 'rgba(255,255,255,.07)' : '#f3f4f6'; dotColor = isDark ? 'rgba(255,255,255,.45)' : '#6b7280' }

  return (
    <button
      onClick={() => !isDisabled && onPick(optKey)}
      style={{
        width: '100%', textAlign: 'left',
        padding: '13px 14px',
        borderRadius: 20, border: `2px solid ${border}`,
        background: bg, color, cursor: isDisabled ? 'default' : 'pointer',
        boxShadow, transition: 'all .15s ease',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        transform: isDisabled ? 'none' : undefined,
      }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 10, flexShrink: 0, marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isCorrect || isWrong ? 13 : 11, fontWeight: 900,
        background: dotBg, color: dotColor,
        boxShadow: (isCorrect || isWrong) ? '0 2px 0 rgba(0,0,0,.12)' : 'none',
        border: (!isCorrect && !isWrong && !isSelected)
          ? `1px solid ${isDark ? 'rgba(255,255,255,.1)' : '#e5e7eb'}`
          : 'none',
        transition: 'all .15s',
      }}>
        {dotContent}
      </span>
      <MathText text={String(text ?? '')} className="flex-1 text-sm leading-snug" as="span" />
    </button>
  )
}

export default function MissionGameplay({
  question,
  idx,
  total,
  lives,
  xp,
  results,
  answered,
  selected,
  accent,
  subjectName,
  topicName,
  subjectIcon,
  onPick,
  onNext,
  onBack,
  phase,        // 'playing' | 'answering' | 'failed' | 'complete'
}) {
  const isDark = useIsDark()
  const [xpFloatTrigger, setXpFloatTrigger] = useState(0)
  const [lastXP, setLastXP] = useState(0)

  useEffect(() => { injectMathStyles() }, [])

  // Trigger XP float on correct answer
  useEffect(() => {
    if (answered && selected === question?.correct_answer) {
      const diff = (question?.difficulty ?? 'easy').toLowerCase()
      const gain = { easy: 10, medium: 15, hard: 25 }[diff] ?? 10
      setLastXP(gain)
      setXpFloatTrigger(t => t + 1)
    }
  }, [answered, selected, question])

  if (!question) return null

  const options    = safeJson(question.options, {})
  const explanation= safeJson(question.explanation, {})
  const isCorrect  = answered && selected === question.correct_answer
  const isWrong    = answered && selected !== question.correct_answer

  // Feedback text
  const feedbackTitle = isCorrect
    ? `✓ Correct! +${lastXP} XP`
    : `✗ Incorrect — ${question.correct_answer} is right`
  const feedbackDetail = isCorrect
    ? (explanation.why_correct || explanation.correct || '')
    : (explanation.wrong_options?.[selected] || explanation.misconception || explanation.correct || '')

  const feedbackBg     = isCorrect
    ? (isDark ? 'rgba(74,222,128,.1)'   : '#f0fdf4')
    : (isDark ? 'rgba(248,113,113,.1)'  : '#fef2f2')
  const feedbackBorder = isCorrect
    ? (isDark ? 'rgba(74,222,128,.25)'  : '#bbf7d0')
    : (isDark ? 'rgba(248,113,113,.25)' : '#fecaca')
  const feedbackTitle_c= isCorrect
    ? (isDark ? '#4ade80' : '#15803d')
    : (isDark ? '#f87171' : '#b91c1c')

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', overflow: 'hidden',
      background: isDark
        ? 'radial-gradient(ellipse 100% 60% at 50% -10%, #100a22 0%, #0d1117 70%)'
        : 'radial-gradient(ellipse 100% 50% at 50% -10%, #f0eeff 0%, #f7f8fc 70%)',
    }}>

      {/* HUD */}
      <MissionHUD
        subjectName={subjectName}
        topicName={topicName}
        accent={accent}
        idx={idx}
        total={total}
        lives={lives}
        xp={xp}
        results={results}
        difficulty={question.difficulty}
        onBack={onBack}
      />

      {/* Question counter */}
      <div style={{
        padding: '8px 14px 4px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--text-tert)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Question {idx + 1} of {total}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-tert)' }}>
          {question.year && `WAEC ${question.year}`}
        </span>
      </div>

      {/* Scroll zone */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 0', minHeight: 0 }}>

        {/* Question card — white in light, dark-card in dark */}
        <div style={{
          background: isDark ? 'var(--bg-card)' : '#fff',
          border: `2.5px solid ${isDark ? `${accent}50` : accent}`,
          borderRadius: 22,
          padding: '18px',
          boxShadow: isDark ? 'none' : `0 10px 0 rgba(0,0,0,.05), 0 14px 30px ${accent}12`,
          marginBottom: 10,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
            letterSpacing: '0.5px', color: accent, marginBottom: 6,
          }}>
            {question.exam_type && `${question.exam_type} `}
            {question.year && `${question.year} · `}
            Q{idx + 1}
          </div>
          <MathText
            text={question.question_text ?? ''}
            className="text-base leading-relaxed font-medium"
            style={{ color: isDark ? 'var(--text-prim)' : '#0a0d1a' }}
            as="p"
          />
          {question.has_image && question.image_url && (
            <img
              src={question.image_url}
              alt="Question diagram"
              style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 10, marginTop: 10 }}
            />
          )}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {Object.entries(options).map(([key, text]) => (
            <OptionBtn
              key={key}
              optKey={key}
              text={text}
              answered={answered}
              selected={selected}
              correctKey={question.correct_answer}
              accent={accent}
              isDark={isDark}
              onPick={onPick}
            />
          ))}
        </div>

        {/* Feedback */}
        {answered && (
          <div style={{
            background: feedbackBg,
            border: `2px solid ${feedbackBorder}`,
            borderRadius: 18, padding: '13px',
            marginBottom: 12,
            animation: 'slide-in-up .22s ease',
          }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: feedbackTitle_c, marginBottom: feedbackDetail ? 5 : 0 }}>
              {feedbackTitle}
            </p>
            {feedbackDetail && (
              <MathText
                text={feedbackDetail}
                className="text-sm leading-relaxed"
                style={{ color: isDark ? 'var(--text-sec)' : '#374151' }}
                as="p"
              />
            )}
          </div>
        )}
        <div style={{ height: 80 }} />
      </div>

      {/* Bottom action bar — ALWAYS same height */}
      <div style={{
        flexShrink: 0,
        padding: '10px 14px',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        background: isDark ? 'rgba(13,17,23,.97)' : 'rgba(255,255,255,.97)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,.07)' : '#dde0f0'}`,
        boxShadow: isDark ? 'none' : '0 -4px 12px rgba(10,13,26,.05)',
        display: 'flex', flexDirection: 'column', gap: 8,
        position: 'relative',
      }}>
        {/* XP float */}
        <div style={{ position: 'absolute', top: -8, right: 20 }}>
          <XPFloat trigger={xpFloatTrigger} amount={lastXP} />
        </div>

        {!answered ? (
          /* Before answering — hint */
          <div style={{
            textAlign: 'center', padding: '13px 0',
            fontSize: 12, fontWeight: 600, color: 'var(--text-tert)',
          }}>
            Tap an answer to continue
          </div>
        ) : (
          /* After answering — Next button */
          <NextBtn onClick={onNext} isLast={idx + 1 >= total} />
        )}
      </div>

      <style>{`
        @keyframes slide-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function NextBtn({ onClick, isLast }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: '14px 0', borderRadius: 14,
        background: '#0b1330', color: '#fff',
        fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer',
        transform: p ? 'translateY(3px)' : 'none',
        boxShadow: p ? '0 2px 0 #05070f' : '0 5px 0 #05070f, 0 8px 20px rgba(0,0,0,.15)',
        transition: 'transform .1s, box-shadow .1s',
      }}
    >
      {isLast ? 'Finish Mission ✓' : 'Next →'}
    </button>
  )
}
