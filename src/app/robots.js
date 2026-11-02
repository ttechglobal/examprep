import { publicOrigin } from '@/lib/publicWebsite'

export default function robots() {
  const origin = publicOrigin()
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/reviewer', '/school/', '/student/'] },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  }
}
