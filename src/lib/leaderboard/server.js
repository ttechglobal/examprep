// src/lib/leaderboard/server.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// Shared by /api/leaderboard/national and /api/leaderboard/school.
//
// buildLeaderboard(service, opts) → {
//   leaderboard: Row[],          top `limit` students
//   me:          Row | null,     the caller, with their true rank even if
//                                they're outside the top `limit`
//   window:      { from, to } | null,
//   fallback:    boolean,        true when a time window had no activity and
//                                all-time XP was shown instead
// }
//
// Row: { rank, student_id, name, class_level, school, location, xp, level, level_tier,
//        level_numeral, accuracy, questions, is_me }
//
// XP for time windows = 10 per correct answer (unchanged).
// All-time XP         = profiles.total_points (unchanged).
//
// v3: rankings come from student_daily_stats (one row per student per day,
// maintained by a database trigger) via the leaderboard_top / leaderboard_me
// functions. v2 downloaded every answer in the window — ~200,000 rows a
// request at 2,000 weekly students. Now a request reads ~25 rows.
//
// Days are Nigerian calendar days (Africa/Lagos), matching the database.
// The top list is identical for every viewer, so it is memoised per server
// instance for a short time; only the caller's own row is per-request.
// ─────────────────────────────────────────────────────────────────────────────

import { getLevel } from '@/lib/levels'
import { PERIODS, periodWindow } from './periods'
import { appDay, addDays, mondayOfDay, monthStartOfDay } from '@/lib/dates'

export { PERIODS, periodWindow }

// ── Tiny per-instance memo for the shared top list ───────────────────────────
const memo = new Map()      // key → { at, ttl, value }
const MEMO_MAX = 200

async function remember(key, ttlMs, compute) {
  const hit = memo.get(key)
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value
  const value = await compute()
  if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value)
  memo.set(key, { at: Date.now(), ttl: ttlMs, value })
  return value
}

// ── Display helpers ──────────────────────────────────────────────────────────
// Other students appear as "Favour A." — enough to recognise a classmate
// without publishing full names nationally. The caller sees their own in full.
export function publicName(fullName, isMe) {
  const name = (fullName || '').trim()
  if (!name) return 'Student'
  if (isMe) return name
  const [first, ...rest] = name.split(/\s+/)
  const last = rest.at(-1)
  return last ? `${first} ${last[0].toUpperCase()}.` : first
}

const PROFILE_COLS = 'id, full_name, class_level, school_name, student_school_name, total_points, schools(name, city, state)'

async function loadProfiles(service, ids) {
  if (!ids.length) return {}
  let { data, error } = await service.from('profiles').select(PROFILE_COLS).in('id', ids)
  if (error) {
    // Older schemas: no student_school_name / schools relation.
    ;({ data } = await service.from('profiles')
      .select('id, full_name, class_level, school_name, total_points').in('id', ids))
  }
  const map = {}
  for (const p of data ?? []) map[p.id] = p
  return map
}

function toRow({ id, rank, xp, answered, correct, profile, callerId }) {
  const isMe  = id === callerId
  const level = getLevel(profile?.total_points ?? 0)
  return {
    rank,
    student_id:    id,
    name:          publicName(profile?.full_name, isMe),
    class_level:   profile?.class_level ?? null,
    // Linked school first, then the name the student typed in on their profile.
    school:        profile?.schools?.name || profile?.student_school_name || profile?.school_name || null,
    location:      profile?.schools?.city || profile?.schools?.state || null,
    xp:            Number(xp) || 0,
    level:         level.name,
    level_tier:    level.tier,
    level_numeral: level.numeral,
    accuracy:      answered > 0 ? Math.round((correct / answered) * 100) : null,
    questions:     Number(answered) || 0,
    is_me:         isMe,
  }
}

/** The period as a range of Nigerian calendar days, or null for all-time. */
export function periodDays(period, { weeksAgo = 0, today = appDay() } = {}) {
  if (period === 'all') return null
  if (period === 'month') return { fromDay: monthStartOfDay(today), toDay: today, past: false }
  const back   = period === 'lastWeek' ? 1 : weeksAgo
  const monday = addDays(mondayOfDay(today), -7 * back)
  return { fromDay: monday, toDay: back === 0 ? today : addDays(monday, 6), past: back > 0 }
}

// ── All-time board from profiles.total_points ────────────────────────────────
async function allTimeTop(service, { studentIds, limit }) {
  const { data, error } = await service.rpc('alltime_top', { p_limit: limit, p_student_ids: studentIds ?? null })
  if (error) throw error
  return (data ?? []).map(r => ({ id: r.student_id, xp: Number(r.total_points) || 0 }))
}

async function allTimeBoard(service, { studentIds, limit, callerId, cacheKey }) {
  const top = await remember(`all:${cacheKey}:${limit}`, 60_000,
    () => allTimeTop(service, { studentIds, limit }))

  const ids    = top.map(r => r.id)
  const wanted = callerId && !ids.includes(callerId) ? [...ids, callerId] : ids
  const [profiles, lifetime] = await Promise.all([
    loadProfiles(service, wanted),
    wanted.length ? service.rpc('lifetime_stats', { p_student_ids: wanted }) : { data: [] },
  ])
  if (lifetime.error) throw lifetime.error
  const stats = {}
  for (const s of lifetime.data ?? []) stats[s.student_id] = s

  // Ties share a rank (same rule as the window boards).
  let rank = 0, prevXp = null
  const leaderboard = top.map((r, i) => {
    if (r.xp !== prevXp) { rank = i + 1; prevXp = r.xp }
    return toRow({
      id: r.id, rank, xp: profiles[r.id]?.total_points ?? r.xp,
      answered: stats[r.id]?.answered ?? 0, correct: stats[r.id]?.correct ?? 0,
      profile: profiles[r.id], callerId,
    })
  })

  let me = leaderboard.find(r => r.is_me) ?? null
  if (!me && callerId && profiles[callerId]) {
    const myXp = profiles[callerId].total_points ?? 0
    let myRank = null
    if (myXp > 0) {
      const { data, error } = await service.rpc('alltime_rank', {
        p_student: callerId, p_student_ids: studentIds ?? null,
      })
      if (error) throw error
      myRank = data == null ? null : Number(data)
    }
    me = toRow({
      id: callerId, rank: myRank, xp: myXp,
      answered: stats[callerId]?.answered ?? 0, correct: stats[callerId]?.correct ?? 0,
      profile: profiles[callerId], callerId,
    })
  }
  return { leaderboard, me }
}

// ── Main entry ───────────────────────────────────────────────────────────────
/**
 * @param service   service-role Supabase client
 * @param opts.studentIds  restrict to these students (school boards); null = national
 * @param opts.cacheKey    identifies the student set for memoising (e.g. 'national', 'school:<id>')
 */
export async function buildLeaderboard(service, {
  period = 'week', weeksAgo = 0, studentIds = null, limit = 20, callerId = null, strict = false,
  cacheKey = studentIds ? null : 'national',
} = {}) {
  if (studentIds && !studentIds.length) return { leaderboard: [], me: null, window: null, fallback: false }
  const key = cacheKey ?? `ids:${studentIds.length}:${studentIds[0]}`

  const days   = periodDays(period, { weeksAgo })
  const window = periodWindow(period, { weeksAgo })
  if (!days) {
    return { ...(await allTimeBoard(service, { studentIds, limit, callerId, cacheKey: key })), window: null, fallback: false }
  }

  const ids = studentIds ?? null
  // Past weeks never change; the current window refreshes every minute.
  const ttl = days.past ? 10 * 60_000 : 60_000
  const top = await remember(`win:${key}:${days.fromDay}:${days.toDay}:${limit}`, ttl, async () => {
    const { data, error } = await service.rpc('leaderboard_top', {
      p_from: days.fromDay, p_to: days.toDay, p_limit: limit, p_student_ids: ids,
    })
    if (error) throw error
    return data ?? []
  })

  // Nobody scored in this window. Champions (strict) show an empty podium;
  // the main board shows all-time XP, flagged so the UI can say so.
  if (!top.length) {
    if (strict) return { leaderboard: [], me: null, window, fallback: false }
    return { ...(await allTimeBoard(service, { studentIds, limit, callerId, cacheKey: key })), window, fallback: true }
  }

  const topIds = top.map(r => r.student_id)
  const inTop  = callerId && topIds.includes(callerId)
  const wanted = callerId && !inTop ? [...topIds, callerId] : topIds

  const [profiles, mine] = await Promise.all([
    loadProfiles(service, wanted),
    callerId && !inTop
      ? service.rpc('leaderboard_me', {
          p_student: callerId, p_from: days.fromDay, p_to: days.toDay, p_student_ids: ids,
        })
      : { data: null },
  ])
  if (mine.error) throw mine.error

  const leaderboard = top.map(r => toRow({
    id: r.student_id, rank: Number(r.rank), xp: r.xp, answered: r.answered, correct: r.correct,
    profile: profiles[r.student_id], callerId,
  }))

  let me = leaderboard.find(r => r.is_me) ?? null
  if (!me && callerId && profiles[callerId]) {
    const m = mine.data?.[0] ?? { xp: 0, answered: 0, correct: 0, rank: null }
    me = toRow({
      id: callerId, rank: m.rank == null ? null : Number(m.rank), xp: m.xp,
      answered: m.answered, correct: m.correct, profile: profiles[callerId], callerId,
    })
  }

  return { leaderboard, me, window, fallback: false }
}

export function parseBoardParams(searchParams) {
  const p = searchParams.get('period') ?? 'week'
  return {
    period:   PERIODS.includes(p) ? p : 'week',
    weeksAgo: Math.min(Math.max(parseInt(searchParams.get('weeks_ago') ?? '0', 10) || 0, 0), 12),
    limit:    Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 1), 50),
    strict:   searchParams.get('strict') === '1',
  }
}
