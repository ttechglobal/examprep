'use client'
// Saves the referral code on this device as soon as the invite page opens, so it
// survives the intro slides, an app install or a later visit (30 days).

import { useEffect } from 'react'
import { saveReferral } from '@/lib/referral'

export default function RememberReferral({ code }) {
  useEffect(() => { saveReferral(code) }, [code])
  return null
}
