// src/components/student/learn/content.js
// ─────────────────────────────────────────────────────────────────────────────
// Copy and artwork for the Learn page, kept out of the components so it can
// change without touching layout code.
// ─────────────────────────────────────────────────────────────────────────────

// The character in the hero. Replace with the final illustration when ready:
// transparent PNG/WebP, ~2x of 340×316, character facing left toward the text.
export const HERO_CHARACTER = '/images/zara_studybuddy.png'

// Each slide promotes a live feature. `cards` are the floating study cards;
// `face` picks the icon drawn on each (see HeroCards in LearnSections.jsx).
export const HERO_SLIDES = [
  {
    id: 'flashcards',
    eyebrow: 'Learn smarter',
    title: 'Master key concepts with',
    accent: 'Flashcards',
    body: 'Quick, effective and interactive flashcards to help you remember key concepts for WAEC, JAMB and more.',
    cta: 'Start Flashcards',
    href: '/student/learn/flashcards',
    note: ['Small cards', 'Big results!'],
    cards: [
      { label: 'Newton’s Laws', face: 'atom' },
      { label: 'Photosynthesis', face: 'sprout' },
      { label: 'Chemical Bonding', face: 'flask' },
    ],
  },
  {
    id: 'world',
    eyebrow: 'Learn by doing',
    title: 'Explore the EXL',
    accent: 'Learning World',
    body: 'Interactive lessons where you learn by doing. Chemistry and Physics are live now.',
    cta: 'Explore Learning World',
    href: '/student/learn/world',
    note: ['Try it,', 'then get it!'],
    cards: [
      { label: 'Electric Circuits', face: 'bolt' },
      { label: 'Atomic Structure', face: 'atom' },
      { label: 'Rates of Reaction', face: 'flask' },
    ],
  },
  {
    id: 'practice',
    eyebrow: 'Practise smarter',
    title: 'Ace your exams with',
    accent: 'Past Questions',
    body: 'Real WAEC and JAMB past questions with explanations that show you how to think, not just the answer.',
    cta: 'Start Practising',
    href: '/student/practice',
    note: ['Real questions', 'Real results!'],
    cards: [
      { label: 'WAEC Past Papers', face: 'paper' },
      { label: 'Cell Biology', face: 'sprout' },
      { label: 'JAMB Past Papers', face: 'paper' },
    ],
  },
]

export const TIPS = [
  'Use flashcards daily to improve your recall and score higher in your exams.',
  'Try to answer before you flip. Pulling an answer from memory is what makes it stick.',
  'Review cards you got wrong the next day, then again three days later.',
  'Study in short bursts: 20 focused minutes beats an hour of rereading.',
  'Mix subjects in one session. Switching topics helps you tell similar ideas apart.',
  'Explain a concept out loud in your own words. If you can’t, flip back and review it.',
]
