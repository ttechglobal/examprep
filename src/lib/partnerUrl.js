// Honour a canonical URL, but never share a development host from a live site.
export function partnerReferralBase(configured, origin) {
  const local = host => host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '[::1]'
  try {
    const url = new URL(configured)
    if (!['http:', 'https:'].includes(url.protocol)) return origin
    if (origin && local(url.hostname) && !local(new URL(origin).hostname)) return origin
    return url.origin
  } catch { return origin }
}
