import { ECONOMY } from './config'

export interface FocusSession {
  startedAt: number
  /** Minutos objetivo, o null en modo libre (cronómetro). */
  targetMinutes: number | null
}

export interface SessionReward {
  minutes: number
  coins: number
  capped: boolean
  grew: boolean
}

/**
 * Recompensa al completar una sesión. En modo temporizador solo se llega aquí si se
 * cumple el tiempo; abandonar no da nada (pero tampoco quita nada).
 */
export function rewardFor(minutes: number, coinsEarnedToday: number): SessionReward {
  const counts = minutes >= ECONOMY.minMinutesForCoins
  const wanted = counts ? minutes * ECONOMY.coinsPerMinute : 0
  const coins = Math.max(0, Math.min(wanted, ECONOMY.dailyCoinCap - coinsEarnedToday))
  return { minutes, coins, capped: counts && coins < wanted, grew: counts }
}
