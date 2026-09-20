import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { ThemeProvider }  from '@/contexts/ThemeContext'
import { PointsProvider } from '@/contexts/PointsContext'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import InstallPrompt from '@/components/ui/InstallPrompt'


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
        {/*
          Prevent flash of wrong theme: runs synchronously before first paint,
          before React hydrates. A plain <script> in <head> is the correct
          App Router pattern for this — next/script is not needed and causes
          a React warning with Turbopack when used for inline beforeInteractive.
        */}
        <script
          dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem('ep-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();` }}
        />
      </head>
      <body className="font-jakarta antialiased bg-base text-primary">
        {/*
          ServiceWorkerRegistration is a 'use client' component that registers
          the SW via useEffect — the correct App Router pattern, no next/script needed.
        */}
        <ServiceWorkerRegistration />
        <InstallPrompt />
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
      </body>
    </html>
  )
}