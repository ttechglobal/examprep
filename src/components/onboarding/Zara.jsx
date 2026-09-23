'use client'
// src/components/onboarding/Zara.jsx
// Zara, the ExamPrep study buddy. Used on the sign-up screen and the
// profile setup prompt. Falls back to a lettered badge if the image is missing.

import { useState } from 'react'

export default function Zara({ size = 96, className, style }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <div
        className={className}
        aria-label="Zara, your study buddy"
        style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#1264E5,#062A78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.42, fontWeight: 900, color: '#FFB800', ...style,
        }}
      >Z</div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/zara_studybuddy.png"
      alt="Zara, your study buddy"
      width={size}
      height={size}
      onError={() => setBroken(true)}
      className={className}
      style={{ objectFit: 'contain', flexShrink: 0, ...style }}
    />
  )
}
