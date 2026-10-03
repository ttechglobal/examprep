import { Barlow_Condensed, Lilita_One } from 'next/font/google'

const body = Barlow_Condensed({ subsets: ['latin'], weight: ['500','600','700','800','900'], variable: '--game-body', display: 'swap' })
const display = Lilita_One({ subsets: ['latin'], weight: '400', variable: '--game-display', display: 'swap' })

export const gameFonts = `${body.variable} ${display.variable}`
