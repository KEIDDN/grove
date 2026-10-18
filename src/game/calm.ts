// Calma: respirar y meditar. Riegan las semillas igual que Cultivar, cuentan como día cumplido y
// dan la mitad de monedas (con el mismo tope diario), para que no sea la forma rápida de ganarlas.

import { ECONOMY } from './config'
import { localize, localizeRecord } from '../i18n'

export type CalmKind = 'breath' | 'meditate'
export type BreathPhase = 'in' | 'hold' | 'out' | 'rest'
export type BreathPatternId = 'box' | '478' | 'coherence'

export interface BreathPattern {
  id: BreathPatternId
  name: string
  hint: string
  phases: Array<{ phase: BreathPhase; seconds: number }>
}

export const BREATH_PATTERNS: BreathPattern[] = [
  {
    id: 'box',
    name: 'Caja',
    hint: 'Para centrarte',
    phases: [
      { phase: 'in', seconds: 4 },
      { phase: 'hold', seconds: 4 },
      { phase: 'out', seconds: 4 },
      { phase: 'rest', seconds: 4 },
    ],
  },
  {
    id: '478',
    name: '4 · 7 · 8',
    hint: 'Para dormir mejor',
    phases: [
      { phase: 'in', seconds: 4 },
      { phase: 'hold', seconds: 7 },
      { phase: 'out', seconds: 8 },
    ],
  },
  {
    id: 'coherence',
    name: 'Coherencia',
    hint: 'Para equilibrarte',
    phases: [
      { phase: 'in', seconds: 5 },
      { phase: 'out', seconds: 5 },
    ],
  },
]

export const PHASE_LABELS: Record<BreathPhase, string> = localizeRecord({ in: 'Inspira', hold: 'Mantén', out: 'Suelta', rest: 'Espera' })

export interface CalmSession {
  kind: CalmKind
  pattern?: BreathPatternId
  startedAt: number
  minutes: number
}

export interface PhaseState {
  phase: BreathPhase
  /** Fase dentro del ciclo y número de ciclo, para saber cuándo cambia. */
  index: number
  cycle: number
  seconds: number
  /** 0 → 1 dentro de la fase. */
  progress: number
  /** Segundos que quedan de la fase (redondeado hacia arriba, para la cuenta atrás). */
  left: number
  /** Cuánto está "lleno" el pecho: 0 vacío, 1 lleno. Mueve el círculo y la isla. */
  fill: number
}

export function phaseAt(pattern: BreathPattern, elapsed: number): PhaseState {
  const cycleLength = pattern.phases.reduce((sum, p) => sum + p.seconds, 0)
  const cycle = Math.floor(elapsed / cycleLength)
  let t = elapsed - cycle * cycleLength
  let index = 0
  while (index < pattern.phases.length - 1 && t >= pattern.phases[index].seconds) {
    t -= pattern.phases[index].seconds
    index++
  }
  const { phase, seconds } = pattern.phases[index]
  const progress = Math.min(1, t / seconds)
  const ease = 0.5 - Math.cos(progress * Math.PI) / 2
  const fill = phase === 'in' ? ease : phase === 'out' ? 1 - ease : phase === 'hold' ? 1 : 0
  return { phase, index, cycle, seconds, progress, left: Math.max(1, Math.ceil(seconds - t)), fill }
}

export interface CalmReward {
  minutes: number
  coins: number
  capped: boolean
}

/** La mitad de monedas que Cultivar (1 cada 2 minutos), dentro del tope común del día. */
export function calmRewardFor(minutes: number, coinsEarnedToday: number): CalmReward {
  const wanted = Math.floor(minutes * ECONOMY.calmCoinsPerMinute)
  const coins = Math.max(0, Math.min(wanted, ECONOMY.dailyCoinCap - coinsEarnedToday))
  return { minutes, coins, capped: coins < wanted }
}

localize(BREATH_PATTERNS, ['name', 'hint'])
