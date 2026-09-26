'use client'
// src/app/student/battle/setup/page.js
// Battle vs the computer: setup flow (shared with 1v1 — components/battle/BattleSetup.jsx).
import BattleSetup from '@/components/battle/BattleSetup'

export default function BattleSetupPage() {
  return <BattleSetup opponent="computer"/>
}
