import { publicOrigin } from '@/lib/publicWebsite'

export default function sitemap() {
  const origin = publicOrigin()
  if (!origin) return []
  return ['/', '/download', '/schools', '/ambassador', '/terms', '/privacy'].map(path => ({ url: `${origin}${path}` }))
}
