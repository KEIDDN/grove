// Clima: de vez en cuando llueve, nieva o hay niebla, según la estación. No usa la ubicación ni el
// tiempo real: cada día tiene su tiempo (estable para todo el día) y dura solo unas horas.

import { hashString } from './hash'
import type { Season } from './seasons'
import { dayKey } from './time'

export type Weather = 'clear' | 'rain' | 'snow' | 'fog'

export const WEATHER_NAMES: Record<Weather, string> = { clear: 'Despejado', rain: 'Lluvia suave', snow: 'Nieve', fog: 'Niebla' }

/** Probabilidad de cada tiempo en un día, por estación (lo que sobra es despejado). */
const CHANCES: Record<Season, Partial<Record<Weather, number>>> = {
  spring: { rain: 0.26, fog: 0.08 },
  summer: { rain: 0.12 },
  autumn: { rain: 0.28, fog: 0.16 },
  winter: { snow: 0.36, fog: 0.14 },
}

export interface DayWeather {
  weather: Weather
  /** Horas en que dura (de `from` a `to`, hora local). */
  from: number
  to: number
}

export function weatherForDay(date: Date, season: Season): DayWeather {
  const h = hashString(`weather:${dayKey(date)}`)
  const roll = (h % 1000) / 1000
  let acc = 0
  let weather: Weather = 'clear'
  for (const [w, p] of Object.entries(CHANCES[season]) as Array<[Weather, number]>) {
    acc += p
    if (roll < acc) {
      weather = w
      break
    }
  }
  // Un rato de entre 3 y 7 horas, empezando en algún momento entre las 7 y las 18
  const from = 7 + ((h >>> 10) % 12)
  const to = Math.min(24, from + 3 + ((h >>> 16) % 5))
  return { weather, from, to }
}

/** El tiempo ahora mismo. */
export function weatherAt(date: Date, season: Season): Weather {
  const d = weatherForDay(date, season)
  const hour = date.getHours() + date.getMinutes() / 60
  return hour >= d.from && hour < d.to ? d.weather : 'clear'
}
