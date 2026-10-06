// supabase/functions/send-notifications/messages.ts
//
// What each student is told, and when. Pure functions (no Deno, no network) so
// they can be run and tested anywhere.
//
// The three daily reminders go out at 12:00, 16:00 and 20:00 Lagos time. Each
// student's message depends on who they are and what they have done:
//
//   1. Weekly missions (battle mode; Monday to Sunday), where they are open
//        Mon 12:00  "new missions are live"
//        Wed 16:00  midweek nudge, only if some are still open
//        Fri 16:00  three days left, only if some are still open
//        Sun 16:00  ends tonight, only if some are still open
//   2. 20:00: a streak of 2+ days that hasn't been practised today is at risk
//   3. Otherwise a reminder from the slot's pool, rotating by day and student so
//      neighbours don't all get the same line. A student who has already
//      practised today is not nagged (they get nothing from this step).
//
// Guests and devices not linked to an account get only step 3.
// Nothing here states a statistic we don't have: no invented percentages.

export type Slot = 'noon' | 'afternoon' | 'evening'

export interface Context {
  first_name: string | null
  streak_days: number
  practiced_today: boolean
  has_subjects: boolean
  missions_total: number     // missions this week (0 until they open Battle)
  missions_open: number      // not finished yet
  next_topic: string | null  // the open mission closest to done
}

export interface Message { title: string; body: string; url: string; tag: string }

const PRACTICE = '/student/practice'
const BATTLE   = '/student/battle'
const MISSION_XP = 50

// Monday = 0 … Sunday = 6, in Nigeria (UTC+1, no daylight saving).
export function lagosWeekday(now: Date = new Date()): number {
  return (new Date(now.getTime() + 3_600_000).getUTCDay() + 6) % 7
}

export function lagosDayNumber(now: Date = new Date()): number {
  return Math.floor((now.getTime() + 3_600_000) / 86_400_000)
}

// A small stable number from an id, so one student's pick differs from the next's.
export function userKey(id: string | null | undefined): number {
  let h = 0
  for (const ch of id ?? '') h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

// ── 1. Missions ─────────────────────────────────────────────────────────────
function missionMessage(slot: Slot, weekday: number, c: Context): Message | null {
  const name = c.first_name ? `${c.first_name}, ` : ''
  const waiting = c.missions_total === 0   // hasn't opened Battle this week, so none made yet
  const open = c.missions_open
  const topic = c.next_topic

  if (slot === 'noon' && weekday === 0) {
    return {
      title: `🎯 ${name}your new missions are live`,
      body: `3 battle missions on topics that show up most in past papers. ${MISSION_XP} XP for each one you finish this week.`,
      url: BATTLE, tag: 'ep-missions',
    }
  }
  if (slot !== 'afternoon') return null
  if (!waiting && open === 0) return null   // everything done: nothing to nudge

  if (weekday === 2) {   // Wednesday
    return waiting
      ? { title: '🎯 Your weekly missions are waiting', body: `3 battle missions picked for your subjects. ${MISSION_XP} XP each.`, url: BATTLE, tag: 'ep-missions' }
      : { title: `🎯 ${open} ${plural(open, 'mission', 'missions')} still open`,
          body: `${topic ? `${topic} is next. ` : ''}Each one is worth ${MISSION_XP} XP.`, url: BATTLE, tag: 'ep-missions' }
  }
  if (weekday === 4) {   // Friday
    return waiting
      ? { title: '⏳ 3 days left for this week’s missions', body: `Open Battle to see them. ${MISSION_XP} XP each.`, url: BATTLE, tag: 'ep-missions' }
      : { title: '⏳ 3 days left on your missions',
          body: `${open} still open. Finish ${plural(open, 'it', 'them')} by Sunday for ${MISSION_XP} XP each.`, url: BATTLE, tag: 'ep-missions' }
  }
  if (weekday === 6) {   // Sunday
    return waiting
      ? { title: '🔥 This week’s missions end tonight', body: `One short battle on each is all it takes. ${MISSION_XP} XP each.`, url: BATTLE, tag: 'ep-missions' }
      : { title: `🔥 ${name}missions end tonight`,
          body: `${open} ${plural(open, 'is', 'are')} still open${topic ? `, starting with ${topic}` : ''}. Finish before midnight to earn your XP.`, url: BATTLE, tag: 'ep-missions' }
  }
  return null
}

// ── 3. Reminder pools ───────────────────────────────────────────────────────
const POOLS: Record<Slot, Array<{ title: string; body: string }>> = {
  noon: [
    { title: '☀️ Lunch-break quiz',            body: 'Five questions, two minutes. Your future self says thanks.' },
    { title: '🎯 One topic before the afternoon', body: 'Pick a topic you’re shaky on and clear it now.' },
    { title: '⚔️ Beat the computer',           body: 'A quick battle is the fastest way to earn XP today.' },
    { title: '📈 Move up the leaderboard',     body: 'A few correct answers now can lift you up this week’s board.' },
    { title: '🧠 Past-question time',          body: 'Real WAEC and JAMB questions are waiting. Try a few.' },
    { title: '⚡ Quick 5',                      body: 'Short on time? A Quick 5 still counts for your streak.' },
  ],
  afternoon: [
    { title: '📖 Study hour',                  body: 'Choose one subject and do ten questions. That’s a good afternoon.' },
    { title: '🔬 Fix a weak topic',            body: 'Practise the topic you got wrong last time. It sticks the second time.' },
    { title: '⚔️ Battle break',                body: 'Take on the computer. Win for bonus XP.' },
    { title: '⭐ XP is waiting',               body: 'Every correct answer earns 5 XP. Ten right is 50.' },
    { title: '🎯 Try a timed practice',        body: 'See how you’d cope on exam day.' },
    { title: '🏅 Make today count',            body: 'One session now and your day is a win.' },
  ],
  evening: [
    { title: '🌙 Last session of the day',     body: 'Ten questions before bed? Easy.' },
    { title: '🔥 End the day strong',          body: 'A short practice now keeps your momentum going.' },
    { title: '⚔️ One more battle?',            body: 'Finish the day with a win.' },
    { title: '📚 Revise before sleep',         body: 'What you review tonight sticks better. Keep it short.' },
    { title: '🎯 Beat today’s total',          body: 'Add a few more correct answers before midnight.' },
    { title: '💪 Small steps count',           body: 'Five questions tonight beats none. Open ExamPrep.' },
  ],
}

export interface BuildOptions {
  slot: Slot
  weekday: number            // lagosWeekday()
  day: number                // lagosDayNumber()
  key: number                // userKey()
  ctx: Context | null        // null for a device with no account
}

/** The message for one student now, or null to send them nothing this time. */
export function buildMessage({ slot, weekday, day, key, ctx }: BuildOptions): Message | null {
  if (ctx?.has_subjects) {
    const mission = missionMessage(slot, weekday, ctx)
    if (mission) return mission
  }

  if (ctx && slot === 'evening' && ctx.streak_days >= 2 && !ctx.practiced_today) {
    const name = ctx.first_name ? `${ctx.first_name}, one` : 'One'
    return {
      title: `🔥 Your ${ctx.streak_days}-day streak ends tonight`,
      body: `${name} quick session before midnight keeps it alive.`,
      url: PRACTICE, tag: 'ep-streak',
    }
  }

  // Already practised today: no reminder.
  if (ctx?.practiced_today) return null

  if (ctx && slot !== 'evening' && ctx.streak_days >= 2) {
    return {
      title: `🔥 Keep your ${ctx.streak_days}-day streak going`,
      body: 'A few questions today is all it takes.',
      url: PRACTICE, tag: `ep-${slot}`,
    }
  }

  const pool = POOLS[slot] ?? POOLS.noon
  const pick = pool[(day + key) % pool.length]
  return { ...pick, url: PRACTICE, tag: `ep-${slot}` }
}
