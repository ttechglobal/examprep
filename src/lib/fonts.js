// src/lib/fonts.js
// Display fonts shared across screens. next/font downloads them at build time
// and serves them from our own domain, so they're cached like any other file.
//
//   playfulFont  Baloo 2 ExtraBold: the rounded, playful headings
//                ("Let's practice!", "How do you want to practice?")

import { Baloo_2 } from 'next/font/google'

export const playfulFont = Baloo_2({ subsets: ['latin'], weight: ['800'], display: 'swap' })
