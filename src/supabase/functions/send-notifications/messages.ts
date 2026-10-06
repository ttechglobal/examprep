// supabase/functions/send-notifications/messages.ts
//
// What each student is told, and when. Pure functions (no Deno, no network) so
// they can be run and tested anywhere.
//
// The three daily reminders go out at 12:00, 16:00 and 20:00 Lagos time. Each
// student's message depends on who they are and what they have done:
//
//   1. Weekly missions (battle mode; Monday to Sunday), where they are open
//        Mon 12:00  "your missions are live"
//        Wed 16:00  midweek check, only if some are still open
//        Fri 16:00  three days left, only if some are still open
//        Sun 16:00  closes tonight, only if some are still open
//   2. 20:00: a streak of 2+ days that hasn't been practised today is at risk
//   3. 12:00 and 16:00: a streak of 2+ days that hasn't been practised today
//   4. Otherwise a reminder from the slot's pool, rotating by day and student so
//      neighbours don't all get the same line. A student who has already
//      practised today is not nagged (they get nothing from this step).
//
// Guests and devices not linked to an account get only the pool reminder.
//
// Voice: no emojis, ever. Short, direct, upbeat and a little game-like (XP,
// streaks, ranks, missions, the arena), never guilt-tripping, and never a
// statistic we don't have. Titles stay under about 40 characters and bodies
// under about 110 so they aren't cut off on a phone.

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

/** "{name}" in a custom message becomes the student's first name, or "there". */
export function fillName(text: string, firstName: string | null | undefined): string {
  return text.replace(/\{name\}/gi, firstName?.trim() || 'there')
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

// ── 1. Missions ─────────────────────────────────────────────────────────────
function missionMessage(slot: Slot, weekday: number, c: Context): Message | null {
  const name = c.first_name ? `${c.first_name}, ` : ''
  const waiting = c.missions_total === 0   // hasn't opened Battle this week, so none made yet
  const open = c.missions_open
  const topic = c.next_topic
  const make = (title: string, body: string): Message => ({ title, body, url: BATTLE, tag: 'ep-missions' })

  if (slot === 'noon' && weekday === 0) {
    return make(
      `${name}your weekly missions are live`,
      `Three new missions, built on the topics that appear most in past papers. ${MISSION_XP} XP for each one you clear.`,
    )
  }
  if (slot !== 'afternoon') return null
  if (!waiting && open === 0) return null   // everything done: nothing to nudge

  if (weekday === 2) {   // Wednesday
    return waiting
      ? make('Your missions are waiting', `Three battle missions are ready for you. ${MISSION_XP} XP for each one you clear.`)
      : make(`Midweek check: ${open} ${plural(open, 'mission', 'missions')} to go`,
          `${topic ? `${topic} is next. ` : ''}Clear each one for ${MISSION_XP} XP.`)
  }
  if (weekday === 4) {   // Friday
    return waiting
      ? make('Your missions close in 3 days', `Open Battle to see them. ${MISSION_XP} XP for each one.`)
      : make('3 days left on your missions',
          `${open} still open. Clear ${plural(open, 'it', 'them')} by Sunday to claim ${MISSION_XP} XP each.`)
  }
  if (weekday === 6) {   // Sunday
    return waiting
      ? make('Missions close tonight', `One short battle per mission is all it takes. ${MISSION_XP} XP each.`)
      : make(`${name}missions close tonight`,
          `${topic ? `${topic} is next. ` : ''}Finish ${plural(open, 'it', 'them')} before midnight to claim your XP.`)
  }
  return null
}

// ── 4. Reminder pools ───────────────────────────────────────────────────────
const POOLS: Record<Slot, Array<{ title: string; body: string }>> = {
  noon: [
    { title: 'Five-minute drill',              body: 'Five questions before lunch ends. Small wins add up to rank.' },
    { title: 'XP is waiting',                  body: 'Every correct answer earns 5 XP. Start a Quick 5 and bank some.' },
    { title: 'The arena is open',              body: 'Battle the computer on real past questions. A win earns 10 bonus XP.' },
    { title: 'Move up the board',              body: 'A few correct answers today can lift your place on this week’s leaderboard.' },
    { title: 'Real exam questions',            body: 'Pick a topic and see how many you get right.' },
    { title: 'Fix one weak topic today',       body: 'Choose the topic that worries you most and clear it.' },
  ],
  afternoon: [
    { title: 'Study hour',                     body: 'Pick one subject and answer ten questions. That is a strong afternoon.' },
    { title: 'Level up',                       body: 'Every session moves you closer to your next rank. Open ExamPrep.' },
    { title: 'Beat the computer',              body: 'Win a battle for 10 bonus XP on top of your correct answers.' },
    { title: 'Try a timed session',            body: 'Practise against the clock now so exam day feels familiar.' },
    { title: 'One topic, ten minutes',         body: 'Choose it, finish it, and tick it off.' },
    { title: 'Chase a higher score',           body: 'Beat your last result on a topic you have already tried.' },
  ],
  evening: [
    { title: 'Last session of the day',        body: 'Ten questions before bed. Finish the day with some XP.' },
    { title: 'End the day on a win',           body: 'Take on the computer in a quick battle.' },
    { title: 'Revise before you sleep',        body: 'A short review tonight helps it stick. Keep it brief.' },
    { title: 'Add to today’s total',           body: 'A few more correct answers before midnight, each worth 5 XP.' },
    { title: 'Small steps still count',        body: 'Five questions tonight beat none. Open ExamPrep.' },
    { title: 'Your next rank is close',        body: 'One more session and you are a step nearer the next level.' },
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
      title: `Protect your ${ctx.streak_days}-day streak`,
      body: `${name} short session before midnight keeps it alive.`,
      url: PRACTICE, tag: 'ep-streak',
    }
  }

  // Already practised today: no reminder.
  if (ctx?.practiced_today) return null

  if (ctx && slot !== 'evening' && ctx.streak_days >= 2) {
    return {
      title: `Make it ${ctx.streak_days + 1} days in a row`,
      body: 'A few questions today extends your streak.',
      url: PRACTICE, tag: `ep-${slot}`,
    }
  }

  const pool = POOLS[slot] ?? POOLS.noon
  const pick = pool[(day + key) % pool.length]
  return { ...pick, url: PRACTICE, tag: `ep-${slot}` }
}
