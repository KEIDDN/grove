// Números de la economía y la progresión. Se ajustan aquí, sin tocar la lógica.

export const ECONOMY = {
  coinsPerMinute: 1,
  minMinutesForCoins: 10,
  dailyCoinCap: 120,
  startingCoins: 140,
} as const

/** Visitantes que llegan mientras no estás. */
export const AWAY = {
  /** Horas fuera para que venga un visitante (hasta `maxVisitors`). */
  hoursPerVisitor: 4,
  maxVisitors: 3,
  /** Monedas que deja cada uno. No cuentan para el tope diario. */
  coinsPerVisitor: 4,
} as const

/** Parcelas que se ganan por días acumulados cuidándote (además de las 9 iniciales). */
export const DAY_PARCELS = [
  { days: 7, parcels: 7 },
  { days: 30, parcels: 9 },
  { days: 100, parcels: 24 },
] as const

export const STARTING_PARCELS = 9

export function parcelsFromDays(days: number): number {
  return DAY_PARCELS.filter((m) => days >= m.days).reduce((sum, m) => sum + m.parcels, 0)
}

export function nextDayReward(days: number) {
  return DAY_PARCELS.find((m) => m.days > days) ?? null
}

/** Tamaño del lado del jardín antiguo (cuadrado) según los días; solo para migrar partidas. */
export function legacySide(days: number): number {
  return days >= 100 ? 7 : days >= 30 ? 5 : days >= 7 ? 4 : 3
}
