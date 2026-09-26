// src/components/session/SessionUtils.js
// Shared constants and pure helper functions used across all session types.

export const NAVY   = '#062A78'
export const BLUE   = '#1264E5'
export const CYAN   = '#18B7F2'
export const GREEN  = '#22c55e'
export const RED    = '#f43f5e'
export const GOLD   = '#FFB800'
export const ORANGE = '#FF6A00'
export const PURPLE = '#7c3aed'

export { LETTERS, normaliseOptions, checkCorrect } from '@/lib/answers'

export function pct(a, b)    { return b > 0 ? Math.round((a / b) * 100) : 0 }
export function msToSecs(ms) { return Math.round(ms / 1000) }

