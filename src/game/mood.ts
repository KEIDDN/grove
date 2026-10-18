import { t } from '../i18n'

// Estado de ánimo, al estilo de Salud del iPhone: un nivel de muy desagradable a muy agradable,
// las emociones que lo describen y lo que ha influido. Vive solo en el diario: el jardín nunca se
// pone triste.

export interface Mood {
  /** 1 (muy desagradable) … 7 (muy agradable). */
  level: number
  emotions: string[]
  factors: string[]
}

export const MOOD_LEVELS = ['Muy desagradable', 'Desagradable', 'Algo desagradable', 'Neutral', 'Algo agradable', 'Agradable', 'Muy agradable']

/** Del lavanda frío al melocotón cálido. Sin rojos: ningún día es "malo". */
export const MOOD_COLORS = ['#8F88CF', '#A39CDA', '#BBB2E3', '#D6CCE2', '#F1CDBE', '#F4B998', '#F29E72']

export const moodColor = (level: number) => MOOD_COLORS[Math.min(7, Math.max(1, Math.round(level))) - 1]
export const moodLabel = (level: number) => t(MOOD_LEVELS[Math.min(7, Math.max(1, Math.round(level))) - 1])

const UNPLEASANT = ['Cansado', 'Estresado', 'Preocupado', 'Triste', 'Abrumado', 'Frustrado', 'Irritable', 'Solo', 'Inquieto', 'Decepcionado']
const NEUTRAL = ['Tranquilo', 'Pensativo', 'Indiferente', 'Cansado', 'Distraído', 'Satisfecho']
const PLEASANT = ['Contento', 'Agradecido', 'En paz', 'Feliz', 'Ilusionado', 'Orgulloso', 'Con energía', 'Querido', 'Esperanzado', 'Relajado']

/** Las emociones que tiene sentido ofrecer para un nivel (como hace Salud). */
export function emotionsFor(level: number): string[] {
  if (level <= 3) return UNPLEASANT
  if (level === 4) return NEUTRAL
  return PLEASANT
}

export const FACTORS = ['Trabajo', 'Estudios', 'Familia', 'Pareja', 'Amistades', 'Salud', 'Sueño', 'Ejercicio', 'Tiempo libre', 'Dinero', 'El tiempo', 'Yo mismo']
