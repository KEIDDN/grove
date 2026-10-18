// El mundo "ahora": cuánto le queda a la estación y qué evento viene. Hemisferio norte.

import type { Season } from './seasons'

/** Mes (0–11) en que empieza cada estación. */
const SEASON_START: Record<Season, number> = { spring: 2, summer: 5, autumn: 8, winter: 11 }

const DAY = 86_400_000

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Días que quedan para que cambie la estación del calendario. */
export function daysLeftInSeason(season: Season, now = new Date()): number {
  const next = (SEASON_START[season] + 3) % 12
  let end = new Date(now.getFullYear(), next, 1)
  if (end <= now) end = new Date(now.getFullYear() + 1, next, 1)
  return Math.round((end.getTime() - startOfDay(now).getTime()) / DAY)
}

/** Eventos que vuelven cada año. */
export const EVENTS: Array<{ name: string; month: number; day: number }> = [
  { name: 'San Valentín', month: 1, day: 14 },
  { name: 'Primavera', month: 2, day: 20 },
  { name: 'Verano', month: 5, day: 21 },
  { name: 'Halloween', month: 9, day: 31 },
  { name: 'Navidad', month: 11, day: 25 },
]

/** El próximo evento si queda menos de `within` días (hoy cuenta como 0). */
export function upcomingEvent(now = new Date(), within = 40): { name: string; days: number } | null {
  const today = startOfDay(now).getTime()
  const next = EVENTS.map((e) => {
    let d = new Date(now.getFullYear(), e.month, e.day).getTime()
    if (d < today) d = new Date(now.getFullYear() + 1, e.month, e.day).getTime()
    return { name: e.name, days: Math.round((d - today) / DAY) }
  }).sort((a, b) => a.days - b.days)[0]
  return next && next.days <= within ? next : null
}
