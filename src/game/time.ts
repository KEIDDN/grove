// Fechas en hora local, como claves de texto fáciles de guardar.

export function dayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 0 = lunes … 6 = domingo */
export function weekdayIndex(date = new Date()): number {
  return (date.getDay() + 6) % 7
}

/** Clave del lunes de la semana de `date`. */
export function weekKey(date = new Date()): string {
  const monday = new Date(date)
  monday.setDate(date.getDate() - weekdayIndex(date))
  return dayKey(monday)
}

/** Para probar sin esperar: añade ?fast a la URL y cada segundo cuenta como un minuto. */
export const TIME_SCALE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('fast') ? 60 : 1

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
