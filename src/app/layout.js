import { Plus_Jakarta_Sans } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { ThemeProvider }  from '@/contexts/ThemeContext'
import { PointsProvider } from '@/contexts/PointsContext'

const jakarta = Plus_Jakarta_Sans({
  subsets:  ['latin'],
  variable: '--font-jakarta',
  weight:   ['400', '500', '600', '700', '800'],
  display:  'swap',
})

export const metadata = {
  title:       'ExamPrep A1',
  description: 'Prepare for WAEC and JAMB with confidence',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'black-translucent',
    title:           'ExamPrep',
  },
  icons: {
    icon:  '/images/examprep_logo.png',
    apple: '/images/examprep_logo.png',
  },
}

export const viewport = {
  themeColor:    '#062A78',
  width:         'device-width',
  initialScale:  1,
  maximumScale:  1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <head>
        {/* Theme script moved to next/script beforeInteractive below */}
      </head>
      <body className="font-jakarta antialiased bg-base text-primary">
        <ThemeProvider>
          {/*
            PointsProvider lives here so XP is available to any part of the app.
            The student/layout.js also wraps in PointsProvider — React dedupes
            context providers, so the inner one (student) shadows the outer one
            for student pages. Non-student pages (admin, onboarding) get the
            outer provider with a zero default, which is fine.
          */}
          <PointsProvider>
            {children}
          </PointsProvider>
        </ThemeProvider>

        {/* Prevent flash of wrong theme — runs before first paint */}
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function(){try{var s=localStorage.getItem('ep-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();
        `}</Script>

        {/* Register service worker for PWA / offline support */}
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .catch(function(err) { console.warn('[SW] Registration failed:', err); });
            });
          }
        `}</Script>
      </body>
    </html>
  )
}