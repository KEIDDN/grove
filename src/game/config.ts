// Números de la economía y la progresión. Se ajustan aquí, sin tocar la lógica.

export const ECONOMY = {
  coinsPerMinute: 1,
  minMinutesForCoins: 10,
  dailyCoinCap: 120,
  startingCoins: 140,
} as const

// Tamaño del jardín según los días acumulados cuidándote.
export const GRID_MILESTONES = [
  { days: 0, size: 3 },
  { days: 7, size: 4 },
  { days: 30, size: 5 },
  { days: 100, size: 7 },
] as const

export function gridSizeForDays(days: number): number {
  let size: number = GRID_MILESTONES[0].size
  for (const m of GRID_MILESTONES) if (days >= m.days) size = m.size
  return size
}

export function nextMilestone(days: number) {
  return GRID_MILESTONES.find((m) => m.days > days) ?? null
}
