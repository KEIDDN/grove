// Números de la economía y la progresión. Se ajustan aquí, sin tocar la lógica.

export const ECONOMY = {
  coinsPerMinute: 1,
  minMinutesForCoins: 10,
  dailyCoinCap: 120,
  startingCoins: 140,
  /** Calma da la mitad que Cultivar. */
  calmCoinsPerMinute: 0.5,
} as const

/** Visitantes que llegan mientras no estás. */
export const AWAY = {
  /** Horas fuera para que venga un visitante (hasta `maxVisitors`). */
  hoursPerVisitor: 4,
  maxVisitors: 3,
  /** Monedas que deja cada uno. No cuentan para el tope diario. */
  coinsPerVisitor: 4,
} as const

/**
 * Parcelas que se ganan por días acumulados cuidándote (además de las 9 iniciales y la de cada
 * logro). Ajustado con `devtools/economySim.ts` para una persona típica (4 días a la semana, 30 min):
 * ~16 parcelas el primer mes, ~25 a los tres meses y la isla completa (49) hacia el año.
 */
export const DAY_PARCELS = [
  { days: 15, parcels: 3 },
  { days: 40, parcels: 4 },
  { days: 70, parcels: 4 },
  { days: 95, parcels: 4 },
  { days: 125, parcels: 4 },
  { days: 160, parcels: 5 },
  { days: 200, parcels: 5 },
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
