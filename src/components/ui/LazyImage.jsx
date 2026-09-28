'use client'
// src/components/ui/LazyImage.jsx
// Decorative artwork that never holds the page up.
//
//   • The page renders without it: the parent paints its own fallback
//     (a gradient, a colour) and reserves the space, so nothing jumps.
//   • It downloads lazily and at low priority, then fades in.
//   • If it fails (offline, bad network, missing file) it simply stays hidden.
//
// Caching: files under /images are cached by the browser and the service
// worker, so a student downloads each one once. Because of that, never
// replace an image in place — give the new version a new name (or bump ?v=).
//
// Props: src, alt ('' for decoration), className, style (positioning),
//        eager (true only for artwork that must start loading immediately),
//        onLoaded (called once the image shows, for parents whose fallback
//        must step aside, e.g. a gradient pedestal under transparent art).
//
// v2: onLoaded.

import { useEffect, useState } from 'react'

export default function LazyImage({ src, alt = '', className, style, eager = false, onLoaded }) {
  const [state, setState] = useState('loading')   // loading | loaded | failed
  useEffect(() => { if (state === 'loaded') onLoaded?.() }, [state]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!src || state === 'failed') return null

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static, pre-sized art served straight from /images so it caches as one file
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'auto' : 'low'}
      draggable={false}
      // Cached images can finish before React attaches onLoad.
      ref={img => { if (img?.complete && img.naturalWidth && state === 'loading') setState('loaded') }}
      onLoad={() => setState('loaded')}
      onError={() => setState('failed')}
      style={{ ...style, opacity: state === 'loaded' ? 1 : 0, transition: 'opacity .35s ease' }}
    />
  )
}
