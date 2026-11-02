import localFont from 'next/font/local'

export const jakarta = localFont({
  src: [
    { path: './Jakarta-400.ttf', weight: '400', style: 'normal' },
    { path: './Jakarta-500.ttf', weight: '500', style: 'normal' },
    { path: './Jakarta-600.ttf', weight: '600', style: 'normal' },
    { path: './Jakarta-700.ttf', weight: '700', style: 'normal' },
    { path: './Jakarta-800.ttf', weight: '800', style: 'normal' },
  ],
  variable: '--font-jakarta',
  display: 'swap',
})
export const baloo = localFont({ src: './Baloo-800.ttf', weight: '800', variable: '--font-baloo', display: 'swap' })
