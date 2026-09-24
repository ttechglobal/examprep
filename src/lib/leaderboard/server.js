// src/lib/leaderboard/server.js
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
// Row: { rank, student_id, name, class_level, location, xp, level, level_tier,
//        level_numeral, accuracy, questions, is_me }
//
// XP for time windows = 10 per correct answer in question_attempts (as before).
// All-time XP = profiles.total_points (as before).
//
// v1 of the routes read question_attempts in a single query, which Supabase
// caps at 1,000 rows, so busy weeks were ranked on partial data. Reads here
// are paginated.
// ─────────────────────────────────────────────────────────────────────────────

import { getLevel } from '@/lib/levels'
import { PERIODS, periodWindow } from './periods'

export { PERIODS, periodWindow }

const PAGE     = 1000
const MAX_ROWS = 200_000   // hard stop so a runaway window can't hang the route

// ── Paginated reads ──────────────────────────────────────────────────────────
async function readAll(makeQuery) {
  const rows = []
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const { data, error } = await makeQuery().range(offset, offset + PAGE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return rows
}

// Supabase .in() filters go in the URL; chunk long id lists.
function chunk(list, size = 300) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
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

const PROFILE_COLS = 'id, full_name, class_level, school_name, student_school_name, total_points, schools(city, state)'

async function loadProfiles(service, ids) {
  const map = {}
  for (const part of chunk(ids)) {
    let { data, error } = await service.from('profiles').select(PROFILE_COLS).in('id', part)
    if (error) {
      // Older schemas: no student_school_name / schools relation.
      ;({ data } = await service.from('profiles')
        .select('id, full_name, class_level, school_name, total_points').in('id', part))
    }
    for (const p of data ?? []) map[p.id] = p
  }
  return map
}

// All-time accuracy + questions from practice_sessions (far fewer rows than
// question_attempts). Missing table → empty stats, never an error.
async function sessionStats(service, ids) {
  const stats = {}
  try {
    for (const part of chunk(ids)) {
      const rows = await readAll(() => service.from('practice_sessions')
        .select('student_id, questions_count, correct_count').in('student_id', part))
      for (const r of rows) {
        const s = (stats[r.student_id] ??= { answered: 0, correct: 0 })
        s.answered += Number(r.questions_count) || 0
        s.correct  += Number(r.correct_count)   || 0
      }
    }
  } catch { /* stats are decoration; the board still renders */ }
  return stats
}

function toRow({ id, rank, xp, answered, correct, profile, callerId }) {
  const isMe  = id === callerId
  const level = getLevel(profile?.total_points ?? 0)
  return {
    rank,
    student_id:    id,
    name:          publicName(profile?.full_name, isMe),
    class_level:   profile?.class_level ?? null,
    location:      profile?.schools?.city || profile?.schools?.state || profile?.student_school_name || profile?.school_name || null,
    xp,
    level:         level.name,
    level_tier:    level.tier,
    level_numeral: level.numeral,
    accuracy:      answered > 0 ? Math.round((correct / answered) * 100) : null,
    questions:     answered,
    is_me:         isMe,
  }
}

// ── All-time board from profiles.total_points ────────────────────────────────
async function allTimeBoard(service, { studentIds, limit, callerId }) {
  let q = service.from('profiles').select('id').gt('total_points', 0)
    .order('total_points', { ascending: false }).limit(limit)
  if (studentIds) q = q.in('id', studentIds)
  const { data: top, error } = await q
  if (error) throw error

  const ids = (top ?? []).map(r => r.id)
  const wanted = callerId && !ids.includes(callerId) ? [...ids, callerId] : ids
  const [profiles, stats] = await Promise.all([loadProfiles(service, wanted), sessionStats(service, wanted)])

  const row = (id, rank) => toRow({
    id, rank, xp: profiles[id]?.total_points ?? 0,
    answered: stats[id]?.answered ?? 0, correct: stats[id]?.correct ?? 0,
    profile: profiles[id], callerId,
  })

  const leaderboard = ids.map((id, i) => row(id, i + 1))
  let me = leaderboard.find(r => r.is_me) ?? null

  if (!me && callerId && profiles[callerId]) {
    const myXp = profiles[callerId].total_points ?? 0
    let rank = null
    if (myXp > 0) {
      let cq = service.from('profiles').select('id', { count: 'exact', head: true }).gt('total_points', myXp)
      if (studentIds) cq = cq.in('id', studentIds)
      const { count } = await cq
      rank = (count ?? 0) + 1
    }
    me = row(callerId, rank)
  }
  return { leaderboard, me }
}

// ── Main entry ───────────────────────────────────────────────────────────────
export async function buildLeaderboard(service, {
  period = 'week', weeksAgo = 0, studentIds = null, limit = 20, callerId = null, strict = false,
} = {}) {
  if (studentIds && !studentIds.length) return { leaderboard: [], me: null, window: null, fallback: false }

  const window = periodWindow(period, { weeksAgo })
  if (!window) return { ...(await allTimeBoard(service, { studentIds, limit, callerId })), window: null, fallback: false }

  // Aggregate the window. Scoped boards filter by student; national reads all.
  const agg = {}
  const add = rows => {
    for (const a of rows) {
      const s = (agg[a.student_id] ??= { xp: 0, answered: 0, correct: 0 })
      s.answered++
      if (a.is_correct) { s.correct++; s.xp += 10 }
    }
  }
  const windowQuery = part => () => {
    let q = service.from('question_attempts').select('student_id, is_correct')
      .gte('created_at', window.from.toISOString()).lte('created_at', window.to.toISOString())
      .order('created_at', { ascending: true })   // stable order for paging
    return part ? q.in('student_id', part) : q
  }
  if (studentIds) for (const part of chunk(studentIds)) add(await readAll(windowQuery(part)))
  else add(await readAll(windowQuery(null)))

  const ranked = Object.entries(agg).filter(([, s]) => s.xp > 0).sort(([, a], [, b]) => b.xp - a.xp)

  // Nobody scored in this window. Champions (strict) show an empty podium;
  // the main board shows all-time XP, flagged so the UI can say so.
  if (!ranked.length) {
    if (strict) return { leaderboard: [], me: null, window, fallback: false }
    return { ...(await allTimeBoard(service, { studentIds, limit, callerId })), window, fallback: true }
  }

  const topIds = ranked.slice(0, limit).map(([id]) => id)
  const wanted = callerId && !topIds.includes(callerId) ? [...topIds, callerId] : topIds
  const profiles = await loadProfiles(service, wanted)

  const row = (id, rank) => toRow({
    id, rank, xp: agg[id]?.xp ?? 0, answered: agg[id]?.answered ?? 0, correct: agg[id]?.correct ?? 0,
    profile: profiles[id], callerId,
  })

  const leaderboard = topIds.map((id, i) => row(id, i + 1))
  let me = leaderboard.find(r => r.is_me) ?? null
  if (!me && callerId && profiles[callerId]) {
    const myXp = agg[callerId]?.xp ?? 0
    me = row(callerId, myXp > 0 ? ranked.findIndex(([id]) => id === callerId) + 1 : null)
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
