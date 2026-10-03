import test from 'node:test'
import assert from 'node:assert/strict'
import { battleBackTarget } from '../src/lib/battleNavigation.js'

test('only the battle hub offers to leave the battle world', () => {
  assert.deepEqual(battleBackTarget('/student/battle'), { prompt: 'world' })
  for (const path of ['/student/battle/setup', '/student/battle/leaderboard', '/student/battle/session', '/student/battle/1v1/lobby']) {
    assert.notEqual(battleBackTarget(path).prompt, 'world', path)
  }
})

test('a match asks before leaving and returns to its own hub', () => {
  assert.deepEqual(battleBackTarget('/student/battle/session'), { prompt: 'match', to: '/student/battle' })
  assert.deepEqual(battleBackTarget('/student/battle/1v1/match'), { prompt: 'match', to: '/student/battle/1v1' })
})

test('other battle screens step back towards the hub without a prompt', () => {
  assert.deepEqual(battleBackTarget('/student/battle/setup'), { to: '/student/battle' })
  assert.deepEqual(battleBackTarget('/student/battle/leaderboard'), { to: '/student/battle' })
  assert.deepEqual(battleBackTarget('/student/battle/1v1'), { to: '/student/battle' })
  assert.deepEqual(battleBackTarget('/student/battle/1v1/create'), { to: '/student/battle/1v1' })
})
