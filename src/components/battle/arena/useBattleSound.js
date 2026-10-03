'use client'
import { useBattleExperience } from '../BattleExperience'
export default function useBattleSound() {
  return useBattleExperience()?.play ?? (() => {})
}
