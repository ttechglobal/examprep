'use client'
// src/components/games/engines/BuildEngine.jsx
// (renamed from BuildItEngine.jsx — fixes "Module not found" build error.
//  Logic unchanged from the original delivery.)
// ─────────────────────────────────────────────────────────────────────────────
// Manipulate sliders, observe computed output, read the insight.
// Ends with a short quiz (2-3 questions) to cement understanding.
//
// IMPORTANT: game.output.compute and game.insight are JS FUNCTIONS stored
// directly on the config object passed in from gameRegistry.js (e.g.
// ideal-gas, ohms-law). Functions only survive as long as the registry
// data stays as a live JS module import — never JSON.stringify/parse this
// config anywhere, or compute()/insight() will be lost. Worth confirming
// this on first load of Ideal Gas Law / Ohm's Law Explorer specifically.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function BuildEngine({ game, onComplete }) {
  const initialInputs = useMemo(() => {
    const init = {}
    game.inputs.forEach(inp => { init[inp.id] = inp.default })
    return init
  }, [game])

  const [inputs,       setInputs]       = useState(initialInputs)
  const [phase,        setPhase]        = useState('explore')
  const [quizItems,    setQuizItems]    = useState(() => shuffle(game.quiz ?? []))
  const [quizIdx,      setQuizIdx]      = useState(0)
  const [quizAnswers,  setQuizAnswers]  = useState([])
  const [selected,     setSelected]     = useState(null)
  const [revealed,     setRevealedQ]    = useState(false)

  const output  = useMemo(() => game.output.compute(inputs), [inputs, game])
  const insight = useMemo(() => game.insight(inputs, output), [inputs, output, game])

  const handleSlider = (id, value) => setInputs(prev => ({ ...prev, [id]: parseFloat(value) }))

  const handleStartQuiz = () => { setPhase('quiz'); setQuizIdx(0); setSelected(null); setRevealedQ(false) }

  const handleSelectAnswer = (option) => { if (revealed) return; setSelected(option); setRevealedQ(true) }

  const handleNextQuestion = () => {
    const current = quizItems[quizIdx]
    setQuizAnswers(prev => [...prev, { correct: selected === current.answer }])
    if (quizIdx + 1 >= quizItems.length) { setPhase('done') }
    else { setQuizIdx(qi => qi + 1); setSelected(null); setRevealedQ(false) }
  }

  const handleRetry = () => {
    setInputs(initialInputs); setPhase('explore'); setQuizItems(shuffle(game.quiz ?? []))
    setQuizIdx(0); setQuizAnswers([]); setSelected(null); setRevealedQ(false)
  }

  const quizCorrect = quizAnswers.filter(a => a.correct).length
  const solid = '#854f0b'
  const softBg = '#faeeda'
  const softText = '#633806'
  const cardBg = '#ffffff'
  const cardBorder = '#ede9e3'
  const trackBg = '#e2e8f0'

  if (phase === 'done') {
    const total = quizItems.length
    const pct   = total > 0 ? Math.round((quizCorrect / total) * 100) : 100
    const resultSolid = pct >= 80 ? '#3b6d11' : pct >= 50 ? '#854f0b' : '#a32d2d'
    const msg =
      pct === 100 ? 'Perfect quiz! The concept is solid. 🎉' :
      pct >= 50   ? 'Good — you understand the key idea. Review the ones you missed.' :
                    'Keep exploring the sandbox — the relationships will click!'

    return (
      <div className="space-y-5">
        <div className="rounded-2xl px-5 py-4 text-center" style={{ background: softBg, border: `1.5px solid #fac775` }}>
          <p className="text-xs font-black uppercase tracking-wide mb-1" style={{ color: softText, opacity: 0.8 }}>Formula</p>
          <p className="text-2xl font-black" style={{ color: softText }}>{game.formula}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-4xl font-black" style={{ color: resultSolid }}>{pct}%</p>
          <p className="text-sm font-bold text-secondary">{quizCorrect}/{total} quiz questions correct</p>
          <p className="text-sm text-primary text-center max-w-xs mt-1">{msg}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={handleRetry}
            className="flex-1 py-3.5 text-sm font-black rounded-2xl transition-colors active:scale-[0.98]"
            style={{ background: '#f3f4f6', color: '#111827' }}>
            Explore again
          </button>
          <button onClick={() => onComplete?.({ correct: quizCorrect, total, score: pct })}
            className="flex-1 py-3.5 text-sm font-black rounded-2xl text-white transition-colors active:scale-[0.98]"
            style={{ background: solid }}>
            Done →
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'quiz') {
    const current = quizItems[quizIdx]

    return (
      <div className="space-y-4">
        <p className="text-xs font-black text-secondary uppercase tracking-wide">
          Question {quizIdx + 1} of {quizItems.length}
        </p>

        <div className="rounded-2xl px-4 py-4" style={{ background: cardBg, border: `1.5px solid ${cardBorder}` }}>
          <p className="text-sm font-bold text-primary leading-relaxed">{current.question}</p>
        </div>

        <div className="space-y-2">
          {current.options.map(opt => {
            const isSelected = selected === opt
            const isCorrect  = opt === current.answer

            const style = !revealed
              ? (isSelected ? { background: softBg, border: `2px solid ${solid}` } : { background: cardBg, border: `2px solid ${cardBorder}` })
              : isCorrect
              ? { background: '#eaf3de', border: '2px solid #c0dd97' }
              : isSelected
              ? { background: '#fcebeb', border: '2px solid #f7c1c1' }
              : { background: cardBg, border: `2px solid ${cardBorder}`, opacity: 0.5 }

            return (
              <button
                key={opt}
                onClick={() => handleSelectAnswer(opt)}
                disabled={revealed}
                style={{ ...style, color: '#111827' }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all"
              >
                {revealed && isCorrect && <span className="mr-2" style={{ color: '#3b6d11' }}>✓</span>}
                {revealed && isSelected && !isCorrect && <span className="mr-2" style={{ color: '#a32d2d' }}>✗</span>}
                {opt}
              </button>
            )
          })}
        </div>

        {revealed && (
          <button
            onClick={handleNextQuestion}
            className="w-full py-3.5 text-sm font-black rounded-2xl text-white transition-colors active:scale-[0.98]"
            style={{ background: solid }}
          >
            {quizIdx + 1 >= quizItems.length ? 'See results →' : 'Next question →'}
          </button>
        )}
      </div>
    )
  }

  // ── EXPLORE SCREEN ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="rounded-2xl px-4 py-3" style={{ background: softBg, border: `1.5px solid #fac775` }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-black uppercase tracking-wide" style={{ color: softText, opacity: 0.85 }}>Formula</p>
          <span className="text-lg font-black" style={{ color: softText }}>{game.formula}</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: softText }}>{game.description}</p>
      </div>

      <div className="space-y-4">
        {game.inputs.map(inp => {
          const pct = ((inputs[inp.id] - inp.min) / (inp.max - inp.min)) * 100
          return (
            <div key={inp.id}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-black text-primary">{inp.label}</label>
                <span className="text-lg font-black tabular-nums" style={{ color: solid }}>
                  {inputs[inp.id]}{inp.unit}
                </span>
              </div>
              <input
                type="range"
                min={inp.min}
                max={inp.max}
                step={inp.step}
                value={inputs[inp.id]}
                onChange={(e) => handleSlider(inp.id, e.target.value)}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, ${solid} ${pct}%, ${trackBg} ${pct}%)` }}
              />
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-tertiary">{inp.min}{inp.unit}</span>
                <span className="text-[10px] text-tertiary">{inp.max}{inp.unit}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="rounded-2xl px-5 py-4 flex items-center justify-between"
        style={{ background: cardBg, border: `2px solid ${solid}` }}
      >
        <div>
          <p className="text-xs font-black text-secondary uppercase tracking-wide mb-0.5">{game.output.label}</p>
          <p className="text-xs text-tertiary">Result</p>
        </div>
        <p className="text-3xl font-black tabular-nums" style={{ color: solid }}>
          {output}<span className="text-base ml-1 font-bold text-secondary">{game.output.unit}</span>
        </p>
      </div>

      <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl" style={{ background: softBg, border: `1.5px solid #fac775` }}>
        <span className="text-base flex-shrink-0 mt-0.5">💡</span>
        <p className="text-sm leading-relaxed" style={{ color: softText }}>{insight}</p>
      </div>

      {game.quiz?.length > 0 && (
        <button
          onClick={handleStartQuiz}
          className="w-full py-4 text-sm font-black rounded-2xl text-white transition-all active:scale-[0.98]"
          style={{ background: solid }}
        >
          Test your understanding →
        </button>
      )}
    </div>
  )
}