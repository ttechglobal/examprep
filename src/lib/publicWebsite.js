// Production domain confirmed by the owner on 1 November 2026.
const PRODUCTION_ORIGIN = 'https://www.examprepa1.online'
export function publicOrigin() {
  for (const value of [process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    try {
      const url = new URL(value)
      if (url.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !url.username && !url.password) return url.origin
    } catch { /* Production origin has not been configured. */ }
  }
  return PRODUCTION_ORIGIN
}

export function publicMetadata({ title, description, path }) {
  const origin = publicOrigin()
  return {
    title, description,
    ...(origin ? { metadataBase: new URL(origin), alternates: { canonical: `${origin}${path}` } } : {}),
    robots: { index: true, follow: true },
    openGraph: {
      title, description, type: 'website', locale: 'en_NG', siteName: 'ExamPrep A1',
      ...(origin ? { url: `${origin}${path}` } : {}),
      images: [{ url: origin ? `${origin}/opengraph-image.png` : '/opengraph-image.png', width: 1200, height: 630, alt: 'ExamPrep A1: Practise smarter. Build exam confidence.' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [origin ? `${origin}/opengraph-image.png` : '/opengraph-image.png'] },
  }
}

