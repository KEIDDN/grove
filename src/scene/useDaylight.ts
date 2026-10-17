import { useEffect, useState } from 'react'
import { daylightAt, hourOf } from '../game/daylight'
import { SEASONS } from '../game/seasons'
import { useGrove, useSeason } from '../game/store'

/** Luz del momento: la hora real (se refresca cada minuto) o la fijada para probar. */
export function useDaylight() {
  const override = useGrove((s) => s.hourOverride)
  const season = SEASONS[useSeason()]
  const [hour, setHour] = useState(hourOf)
  useEffect(() => {
    const id = setInterval(() => setHour(hourOf()), 60_000)
    return () => clearInterval(id)
  }, [])
  return daylightAt(override ?? hour, season.bg)
}
