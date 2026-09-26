// src/lib/pvp/constants.js
// 1v1 constants shared by server and client code. Must match the engine
// (20260928_pvp_engine.sql: pvp_new_code, pvp_create checks).

// 4 characters from 31 symbols with no look-alikes (no 0/O, 1/I/L).
export const PVP_CODE_RE    = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/
export const PVP_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export const PVP_TIMER_OPTIONS = [
  { v: 10, l: 'Blitz' }, { v: 15, l: 'Quick' },  { v: 20, l: 'Brisk' },
  { v: 30, l: 'Normal' }, { v: 45, l: 'Relaxed' }, { v: 60, l: 'Chill' },
]
