import test from 'node:test'
import assert from 'node:assert/strict'
import { planStatus, featureAccess, practiceFeature, isFreeTopic, priceLabel, FEATURES } from '../src/lib/plans.js'

const NOW = Date.parse('2026-10-05T12:00:00Z')
const days = n => new Date(NOW + n * 86_400_000).toISOString()

test('a new account is on the 7-day trial', () => {
  const status = planStatus({ plan: 'free', trial_ends_at: days(7) }, NOW)
  assert.equal(status.premium, true)
  assert.equal(status.source, 'trial')
  assert.equal(status.daysLeft, 7)
})

test('after the trial the account is Free and says the trial ended', () => {
  const status = planStatus({ plan: 'free', trial_ends_at: days(-1) }, NOW)
  assert.deepEqual([status.premium, status.source, status.trialEnded], [false, 'free', true])
})

test('paid Premium counts until it expires; no expiry means no end (school slots)', () => {
  assert.equal(planStatus({ plan: 'premium', plan_expires_at: days(30), trial_ends_at: days(-20) }, NOW).source, 'paid')
  assert.equal(planStatus({ plan: 'premium', plan_expires_at: null }, NOW).premium, true)
  const lapsed = planStatus({ plan: 'premium', plan_expires_at: days(-1), trial_ends_at: days(-60) }, NOW)
  assert.deepEqual([lapsed.premium, lapsed.source], [false, 'free'])
})

test('a lapsed paid plan still gets an unexpired trial', () => {
  assert.equal(planStatus({ plan: 'premium', plan_expires_at: days(-1), trial_ends_at: days(2) }, NOW).source, 'trial')
})

test('guests are Free', () => {
  assert.deepEqual([planStatus({ isGuest: true }).premium, planStatus(null).source], [false, 'guest'])
})

const FREE = planStatus({ plan: 'free', trial_ends_at: days(-1) }, NOW)
const PREMIUM = planStatus({ plan: 'premium' }, NOW)

test('Free: mock and friend battles are Premium only', () => {
  for (const feature of ['mock', 'battle_friends']) {
    assert.deepEqual(featureAccess(FREE, feature), { allowed: false, reason: 'premium', limit: 0, remaining: 0 })
    assert.equal(featureAccess(PREMIUM, feature).allowed, true)
  }
})

test('Free: 1 custom session and 2 battles a day', () => {
  assert.deepEqual(featureAccess(FREE, 'custom', 0), { allowed: true, reason: null, limit: 1, remaining: 1 })
  assert.deepEqual(featureAccess(FREE, 'custom', 1), { allowed: false, reason: 'limit', limit: 1, remaining: 0 })
  assert.equal(featureAccess(FREE, 'battle', 1).remaining, 1)
  assert.equal(featureAccess(FREE, 'battle', 2).allowed, false)
  assert.equal(featureAccess(PREMIUM, 'battle', 99).allowed, true)
})

test('Free: Quick 5 and anything not listed are open', () => {
  assert.equal(featureAccess(FREE, 'quick5').allowed, true)
  assert.equal(featureAccess(FREE, 'flashcards').allowed, true)
})

test('the first five topics of a subject are free', () => {
  assert.deepEqual([0, 4, 5, -1].map(isFreeTopic), [true, true, false, false])
})

test('the server classifies requests; study and speed share custom', () => {
  assert.equal(practiceFeature({ mode: 'mock' }), 'mock')
  assert.equal(practiceFeature({ mode: 'battle', topicId: 'x' }), 'battle')
  assert.equal(practiceFeature({ mode: 'quick5' }), 'quick5')
  assert.equal(practiceFeature({ mode: 'practice', topicId: 'x' }), 'topic')
  for (const mode of ['practice', 'study', 'timed', 'mixed', 'weak', undefined]) {
    assert.equal(practiceFeature({ mode }), 'custom', String(mode))
  }
})

test('every limited feature has a name, and prices format as naira', () => {
  for (const [key, rule] of Object.entries(FEATURES)) assert.ok(rule.name, key)
  assert.equal(priceLabel(5000), '₦5,000')
})

test('a lapsed paid plan reports when it ended; an active one does not', () => {
  const lapsed = planStatus({ plan: 'premium', plan_expires_at: days(-3), trial_ends_at: days(-90) }, NOW)
  assert.equal(lapsed.paidEnded, days(-3))
  assert.equal(planStatus({ plan: 'premium', plan_expires_at: days(3) }, NOW).paidEnded, null)
  assert.equal(planStatus({ plan: 'free', trial_ends_at: days(-1) }, NOW).paidEnded, null)
})

test('a paid plan near its end counts its days left for the renewal reminder', () => {
  const status = planStatus({ plan: 'premium', plan_expires_at: days(6.5) }, NOW)
  assert.deepEqual([status.source, status.daysLeft], ['paid', 7])
})
