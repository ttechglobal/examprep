import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata = {
  title: 'ExamPrep',
  description: 'Prepare for WAEC and JAMB with confidence',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-jakarta antialiased">
        {children}
      </body>
    </html>
  )
}