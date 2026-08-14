import { Plus_Jakarta_Sans } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata = {
  title: 'ExamPrep A1',
  description: 'Prepare for WAEC and JAMB with confidence',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ExamPrep',
  },
  icons: {
    icon: '/images/examprep_logo.png',
    apple: '/images/examprep_logo.png',
  },
}

export const viewport = {
  themeColor: '#062A78',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme — must run before first paint */}
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function() {
            try {
              var stored = localStorage.getItem('ep-theme');
              var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (dark) document.documentElement.classList.add('dark');
            } catch(e) {}
          })();
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
      </head>
      <body className="font-jakarta antialiased bg-base text-primary">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}