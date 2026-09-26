'use client'
// src/app/student/battle/1v1/create/page.js
// Create a 1v1 battle: same setup flow as vs Computer, then a waiting room with the code.
import BattleSetup from '@/components/battle/BattleSetup'

export default function CreatePvpBattlePage() {
  return <BattleSetup opponent="friend"/>
}
