// Simulación de un año de juego para ajustar la economía. Usa las reglas reales (config, misiones,
// logros, recompensas) con una persona típica: 4 días a la semana, 30 min de Cultivar cada día que
// viene, Raíces 3 días por semana y un rato de Calma 2 días. Se lanza desde la consola en desarrollo:
//   (await import('/src/devtools/economySim.ts')).simulate()

import { calmRewardFor } from '../game/calm'
import { AWAY, DAY_PARCELS, ECONOMY, STARTING_PARCELS } from '../game/config'
import { MAX_PLOTS } from '../game/garden'
import { ACHIEVEMENTS, emptyDaily, emptyStats, missionsFor } from '../game/goals'
import { rewardFor } from '../game/session'
import { dayKey } from '../game/time'

export interface SimOptions {
  daysPerWeek?: number
  focusMinutes?: number
}

export function simulate({ daysPerWeek = 4, focusMinutes = 30 }: SimOptions = {}) {
  const pattern = [0, 2, 4, 6, 1, 3, 5].slice(0, daysPerWeek)
  const stats = emptyStats()
  const claimed = new Set<string>()
  let coins = ECONOMY.startingCoins
  let totalDays = 0
  let seedMinutes = 0
  const report: Array<Record<string, number>> = []
  const start = new Date(2026, 0, 5) // un lunes
  let weekDone = 0
  for (let d = 0; d < 365; d++) {
    const date = new Date(start)
    date.setDate(start.getDate() + d)
    const weekday = d % 7
    if (weekday === 0) weekDone = 0
    const active = pattern.includes(weekday)
    const daily = { ...emptyDaily(dayKey(date)), calmMinutes: 0 }
    let coinsToday = 0
    if (active) {
      totalDays++
      weekDone++
      // Cultivar
      const r = rewardFor(focusMinutes, coinsToday)
      coins += r.coins
      coinsToday += r.coins
      daily.focusMinutes += focusMinutes
      daily.sessions++
      stats.sessions++
      stats.focusMinutes += focusMinutes
      seedMinutes += focusMinutes
      // Una planta crece cada ~90 minutos de riego (mezcla de flores, arbustos y árboles)
      while (seedMinutes >= 90) {
        seedMinutes -= 90
        stats.plantsGrown++
        stats.seedsPlanted++
        daily.planted++
      }
      // Raíces 3 de cada 4 días
      if (weekday !== 6) {
        daily.roots++
        stats.roots++
      }
      // Calma algunos días
      if (weekday === 2 || weekday === 6) {
        const c = calmRewardFor(3, coinsToday)
        coins += c.coins
        coinsToday += c.coins
        daily.calmMinutes += 3
        stats.calmMinutes = (stats.calmMinutes ?? 0) + 3
      }
      if (d % 5 === 0) {
        daily.placed++
        stats.decorPlaced++
      }
      if (weekDone === daysPerWeek) stats.weeksCompleted++
      // Visitantes: uno nuevo cada pocos días hasta conocerlos a todos; siempre dejan monedas
      stats.visitors = Math.min(9, 1 + Math.floor(totalDays / 6))
      coins += AWAY.coinsPerVisitor * 2
      // Misiones del día que encajan con lo que ha hecho
      for (const m of missionsFor(daily.day)) if (m.value(daily) >= m.target) coins += m.reward.coins ?? 0
    }
    for (const a of ACHIEVEMENTS) {
      if (!claimed.has(a.id) && a.value(stats) >= a.target) {
        claimed.add(a.id)
        coins += a.reward.coins ?? 0
      }
    }
    const fromDays = DAY_PARCELS.filter((m) => totalDays >= m.days).reduce((n, m) => n + m.parcels, 0)
    const fromAch = ACHIEVEMENTS.filter((a) => claimed.has(a.id)).reduce((n, a) => n + (a.reward.parcels ?? 0), 0)
    const parcels = Math.min(MAX_PLOTS, STARTING_PARCELS + fromDays + fromAch)
    if ([7, 14, 30, 60, 90, 180, 270, 364].includes(d)) report.push({ dia: d + 1, diasCuidandote: totalDays, parcelas: parcels, deDias: fromDays, deLogros: fromAch, monedas: coins })
  }
  return report
}
