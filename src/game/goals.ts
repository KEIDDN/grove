import { hashString } from './hash'

/** Contadores totales que alimentan los logros. */
export interface Stats {
  sessions: number
  focusMinutes: number
  roots: number
  seedsPlanted: number
  plantsGrown: number
  decorPlaced: number
  weeksCompleted: number
  visitors: number
}

/** Contadores del día que alimentan las misiones diarias. */
export interface DailyStats {
  day: string
  focusMinutes: number
  sessions: number
  roots: number
  planted: number
  placed: number
  painted: number
  recolored: number
}

export interface Reward {
  coins?: number
  parcels?: number
}

export interface Mission {
  id: string
  title: string
  target: number
  value: (d: DailyStats) => number
  reward: Reward
  group: 'focus' | 'care' | 'create'
}

export const MISSIONS: Mission[] = [
  { id: 'focus15', title: 'Cultiva 15 minutos', target: 15, value: (d) => d.focusMinutes, reward: { coins: 20 }, group: 'focus' },
  { id: 'focus30', title: 'Cultiva 30 minutos', target: 30, value: (d) => d.focusMinutes, reward: { coins: 35 }, group: 'focus' },
  { id: 'session', title: 'Completa una sesión de Cultivar', target: 1, value: (d) => d.sessions, reward: { coins: 20 }, group: 'focus' },
  { id: 'roots', title: 'Escribe en Raíces', target: 1, value: (d) => d.roots, reward: { coins: 20 }, group: 'care' },
  { id: 'plant', title: 'Planta una semilla', target: 1, value: (d) => d.planted, reward: { coins: 15 }, group: 'create' },
  { id: 'decorate', title: 'Coloca algo en tu jardín', target: 1, value: (d) => d.placed, reward: { coins: 15 }, group: 'create' },
  { id: 'paint', title: 'Pinta 3 celdas de camino', target: 3, value: (d) => d.painted, reward: { coins: 10 }, group: 'create' },
  { id: 'recolor', title: 'Cambia el color de algo', target: 1, value: (d) => d.recolored, reward: { coins: 10 }, group: 'create' },
]

/** Tres misiones del día: una de concentración, una de cuidado y una creativa. Siempre las mismas para un mismo día. */
export function missionsFor(day: string): Mission[] {
  const h = hashString(day)
  const pick = (group: Mission['group'], salt: number) => {
    const list = MISSIONS.filter((m) => m.group === group)
    return list[(h + salt) % list.length]
  }
  const care = MISSIONS.filter((m) => m.group === 'care' || m.id === 'session')
  return [pick('focus', 0), care[(h >> 3) % care.length], pick('create', 7)].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
}

export interface Achievement {
  id: string
  title: string
  detail: string
  target: number
  value: (s: Stats) => number
  reward: Reward
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-session', title: 'Primera sesión', detail: 'Completa tu primera sesión de Cultivar', target: 1, value: (s) => s.sessions, reward: { parcels: 1 } },
  { id: 'sessions-10', title: 'Constancia', detail: 'Completa 10 sesiones', target: 10, value: (s) => s.sessions, reward: { parcels: 2 } },
  { id: 'focus-300', title: 'Cinco horas para ti', detail: 'Acumula 300 minutos de Cultivar', target: 300, value: (s) => s.focusMinutes, reward: { parcels: 3, coins: 100 } },
  { id: 'roots-1', title: 'Primera raíz', detail: 'Escribe tu primera entrada en Raíces', target: 1, value: (s) => s.roots, reward: { parcels: 1 } },
  { id: 'roots-7', title: 'Raíces profundas', detail: 'Escribe en Raíces 7 días', target: 7, value: (s) => s.roots, reward: { parcels: 2 } },
  { id: 'roots-30', title: 'Un mes contigo', detail: 'Escribe en Raíces 30 días', target: 30, value: (s) => s.roots, reward: { parcels: 3 } },
  { id: 'grow-1', title: 'Primera cosecha', detail: 'Haz crecer tu primera planta', target: 1, value: (s) => s.plantsGrown, reward: { parcels: 1 } },
  { id: 'grow-10', title: 'Mano verde', detail: 'Haz crecer 10 plantas', target: 10, value: (s) => s.plantsGrown, reward: { parcels: 2 } },
  { id: 'decor-10', title: 'Paisajista', detail: 'Coloca 10 objetos de decoración', target: 10, value: (s) => s.decorPlaced, reward: { coins: 50 } },
  { id: 'week-1', title: 'Semana cumplida', detail: 'Cumple tu objetivo semanal', target: 1, value: (s) => s.weeksCompleted, reward: { parcels: 2 } },
  { id: 'visitors-5', title: 'Jardín acogedor', detail: 'Recibe 5 visitantes distintos', target: 5, value: (s) => s.visitors, reward: { parcels: 2 } },
]

export function rewardLabel(r: Reward): string {
  const parts: string[] = []
  if (r.parcels) parts.push(`${r.parcels} parcela${r.parcels > 1 ? 's' : ''}`)
  if (r.coins) parts.push(`${r.coins} monedas`)
  return parts.join(' · ')
}

export const emptyDaily = (day: string): DailyStats => ({ day, focusMinutes: 0, sessions: 0, roots: 0, planted: 0, placed: 0, painted: 0, recolored: 0 })

export const emptyStats = (): Stats => ({ sessions: 0, focusMinutes: 0, roots: 0, seedsPlanted: 0, plantsGrown: 0, decorPlaced: 0, weeksCompleted: 0, visitors: 1 })
