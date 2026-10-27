import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { matchXp } from '../src/lib/pvp/results.js'

function finished(result = 'host') {
  return { me: 'host', match: { status: 'finished', result }, rounds: [
    { mine: { choice: 0, correct: true } },
    { mine: { choice: 1, correct: true } },
    { mine: { choice: 1, correct: false } },
    { mine: null },
  ] }
}

test('live results display the XP awarded by SQL for wins, draws and losses', () => {
  assert.equal(matchXp(finished('host')), 40)
  assert.equal(matchXp(finished('draw')), 30)
  assert.equal(matchXp(finished('guest')), 20)
  assert.equal(matchXp({ ...finished('guest'), me: 'guest' }), 40)
})

test('live XP uses played answers for early finishes and awards nothing before finish', () => {
  const state = finished()
  assert.equal(matchXp({ ...state, rounds: [] }), 20)
  assert.equal(matchXp({ ...state, match: { ...state.match, status: 'in_progress' } }), 0)
})

test('live display rates stay aligned with the SQL award and leaderboard functions', () => {
  const engine = readFileSync(new URL('../src/supabase/migrations/20260928_pvp_engine.sql', import.meta.url), 'utf8')
  const leaderboard = readFileSync(new URL('../src/supabase/migrations/20261003_battle_leaderboard.sql', import.meta.url), 'utf8')
  assert.match(engine, /v_xp\s*:= p\.correct \* 10 \+ case v_char when 'W' then 20 when 'D' then 10 else 0 end/)
  assert.match(leaderboard, /c\.correct \* 10 \+ case r\.ch when 'W' then 20 when 'D' then 10 else 0 end/)
})
