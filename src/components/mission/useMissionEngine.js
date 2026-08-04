'use client'
// src/components/mission/useMissionEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// The brain of the mission system.
// Manages: lives, XP, question index, answer state, win/fail conditions.
//
// GAME RULES:
//   3 lives per mission. Each wrong answer costs 1 life.
//   0 lives → mission failed → redirect to fail screen.
//   All questions answered → mission complete → redirect to complete screen.
//
//   XP per question:
//     Easy:   10 XP
//     Medium: 15 XP
//     Hard:   25 XP
//   Bonus XP on complete: lives_remaining × 10
//
//   Stars (0-3) based on wrong answers:
//     0 wrong → 3 stars
//     1 wrong → 3 stars
//     2-3 wrong → 2 stars
//     4+ wrong → 1 star
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'

const XP_MAP = { easy: 10, medium: 15, hard: 25 }

export function useMissionEngine({ questions = [], onComplete, onFail }) {
  const [state, setState] = useState({
    idx:       0,
    lives:     3,
    xp:        0,
    correct:   0,
    wrong:     0,
    answered:  false,
    selected:  null,  // key A/B/C/D
    results:   [],    // [{ correct: bool, xp: number }] per question
    phase:     'playing', // 'playing' | 'answering' | 'complete' | 'failed'
  })

  const currentQuestion = questions[state.idx] ?? null

  const pick = useCallback((key) => {
    if (state.answered || !currentQuestion) return
    const isRight = key === currentQuestion.correct_answer
    const diff    = (currentQuestion.difficulty ?? 'easy').toLowerCase()
    const xpGain  = isRight ? (XP_MAP[diff] ?? 10) : 0

    setState(s => {
      const newLives  = isRight ? s.lives : s.lives - 1
      const newXP     = s.xp + xpGain
      const newCorrect= isRight ? s.correct + 1 : s.correct
      const newWrong  = isRight ? s.wrong : s.wrong + 1
      const newResults= [...s.results, { correct: isRight, xp: xpGain }]

      // Check fail first
      if (newLives <= 0) {
        setTimeout(() => onFail?.({
          correct: newCorrect, wrong: newWrong,
          xp: newXP, lives: 0,
        }), 1100)
        return { ...s, answered: true, selected: key, lives: 0,
          xp: newXP, correct: newCorrect, wrong: newWrong, results: newResults, phase: 'failed' }
      }

      return { ...s, answered: true, selected: key,
        lives: newLives, xp: newXP,
        correct: newCorrect, wrong: newWrong,
        results: newResults, phase: 'answering' }
    })
  }, [state.answered, currentQuestion, onFail])

  const next = useCallback(() => {
    setState(s => {
      const nextIdx = s.idx + 1
      if (nextIdx >= questions.length) {
        // Mission complete
        const stars = s.wrong === 0 ? 3 : s.wrong === 1 ? 3 : s.wrong <= 3 ? 2 : 1
        const bonus = s.lives * 10
        const totalXP = s.xp + bonus
        setTimeout(() => onComplete?.({
          correct: s.correct, wrong: s.wrong,
          xp: totalXP, lives: s.lives, stars, bonus,
        }), 50)
        return { ...s, phase: 'complete' }
      }
      return { ...s, idx: nextIdx, answered: false, selected: null, phase: 'playing' }
    })
  }, [questions.length, onComplete])

  const reset = useCallback(() => {
    setState({
      idx: 0, lives: 3, xp: 0, correct: 0, wrong: 0,
      answered: false, selected: null, results: [], phase: 'playing',
    })
  }, [])

  return {
    question:     currentQuestion,
    idx:          state.idx,
    total:        questions.length,
    lives:        state.lives,
    xp:           state.xp,
    correct:      state.correct,
    wrong:        state.wrong,
    answered:     state.answered,
    selected:     state.selected,
    results:      state.results,
    phase:        state.phase,
    pick,
    next,
    reset,
  }
}
