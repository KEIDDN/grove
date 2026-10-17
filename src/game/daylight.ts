// Luz y cielo según la hora real del día. Sin dependencias de 3D: solo colores y números.

export interface Daylight {
  skyTop: string
  skyBottom: string
  sunColor: string
  sunIntensity: number
  /** Ángulo del sol sobre el horizonte, en radianes. */
  sunElevation: number
  /** Dirección del sol alrededor del jardín, en radianes. */
  sunAzimuth: number
  hemiIntensity: number
  /** 0 = pleno día, 1 = noche cerrada. */
  night: number
  label: 'Madrugada' | 'Amanecer' | 'Mañana' | 'Mediodía' | 'Tarde' | 'Atardecer' | 'Noche'
}

interface Key {
  h: number
  top: string
  bottom: string
  sun: string
  sunI: number
  hemi: number
  night: number
}

const KEYS: Key[] = [
  { h: 0, top: '#1C2546', bottom: '#3A3D69', sun: '#9FB4FF', sunI: 0.35, hemi: 0.35, night: 1 },
  { h: 5, top: '#2C3762', bottom: '#77699A', sun: '#B8B4FF', sunI: 0.4, hemi: 0.45, night: 0.8 },
  { h: 6.5, top: '#F2C3A6', bottom: '#FCE7D4', sun: '#FFC596', sunI: 1.2, hemi: 0.8, night: 0.15 },
  { h: 8.5, top: '#CFE5F4', bottom: '#FFF4E6', sun: '#FFE9C9', sunI: 1.8, hemi: 1.1, night: 0 },
  { h: 13, top: '#BEDFF6', bottom: '#FBF8F1', sun: '#FFF4E2', sunI: 2.1, hemi: 1.25, night: 0 },
  { h: 17.5, top: '#F2D3B4', bottom: '#FFF1DE', sun: '#FFD7A6', sunI: 1.7, hemi: 1.05, night: 0 },
  { h: 19.5, top: '#8F86C8', bottom: '#F6B790', sun: '#FF9C68', sunI: 1.1, hemi: 0.75, night: 0.3 },
  { h: 21, top: '#373C69', bottom: '#69598C', sun: '#A9B4FF', sunI: 0.45, hemi: 0.45, night: 0.85 },
  { h: 24, top: '#1C2546', bottom: '#3A3D69', sun: '#9FB4FF', sunI: 0.35, hemi: 0.35, night: 1 },
]

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (t: number) => t * t * (3 - 2 * t)

function labelFor(h: number): Daylight['label'] {
  if (h < 5) return 'Madrugada'
  if (h < 7.5) return 'Amanecer'
  if (h < 12) return 'Mañana'
  if (h < 15) return 'Mediodía'
  if (h < 18.5) return 'Tarde'
  if (h < 20.5) return 'Atardecer'
  return 'Noche'
}

/** Hora decimal (0–24) → luz. `seasonTint` tiñe un poco el cielo con el color de la estación. */
export function daylightAt(hour: number, seasonTint?: string): Daylight {
  const h = ((hour % 24) + 24) % 24
  const i = KEYS.findIndex((k) => k.h > h)
  const a = KEYS[i - 1]
  const b = KEYS[i]
  const t = smooth((h - a.h) / (b.h - a.h))
  const tint = (c: string) => (seasonTint ? mix(c, seasonTint, 0.18) : c)
  // El sol sale a las 7, culmina a las 13:30 y se pone a las 20
  const dayT = Math.min(1, Math.max(0, (h - 7) / 13))
  return {
    skyTop: tint(mix(a.top, b.top, t)),
    skyBottom: tint(mix(a.bottom, b.bottom, t)),
    sunColor: mix(a.sun, b.sun, t),
    sunIntensity: lerp(a.sunI, b.sunI, t),
    sunElevation: 0.25 + Math.sin(dayT * Math.PI) * 0.95,
    sunAzimuth: -1.2 + dayT * 2.4,
    hemiIntensity: lerp(a.hemi, b.hemi, t),
    night: lerp(a.night, b.night, t),
    label: labelFor(h),
  }
}

export function hourOf(date = new Date()): number {
  return date.getHours() + date.getMinutes() / 60
}
