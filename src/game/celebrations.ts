import type { ItemKind } from './garden'
import type { VisitorType } from './visitors'

/**
 * Tres niveles de celebración, según lo importante que sea lo que ha pasado:
 * - small: un aviso arriba con icono (misión, plantar, regalo suelto).
 * - medium: una tarjeta con la cifra grande y lo que ha pasado en el jardín (sesión, Raíz, lectura).
 * - big: pantalla completa para lo que se recuerda (parcelas, logros, la primera planta adulta).
 * La primera vez que pasa algo mediano se celebra con más fuerza (`first`).
 */
export type CelebrationLevel = 'small' | 'medium' | 'big'

export type CelebrationIcon = 'coin' | 'focus' | 'roots' | 'read' | 'parcel' | 'trophy' | 'mission' | 'plant' | 'visitor'

export interface CelebrationLine {
  text: string
  kind?: ItemKind
  color?: string
  visitor?: VisitorType
}

export interface Celebration {
  id: number
  level: Exclude<CelebrationLevel, 'small'>
  icon: CelebrationIcon
  eyebrow: string
  title: string
  detail?: string
  /** Lo que ha pasado en el jardín, una línea por cosa. */
  lines?: CelebrationLine[]
  coins?: number
  /** Objeto al que mira la cámara mientras dura la celebración. */
  focus?: { kind: ItemKind; color?: string; x: number; z: number }
  /** La primera vez: partículas y un poco más de ceremonia. */
  first?: boolean
  /** Botón secundario. */
  action?: 'tend' | 'expand' | 'album'
}

/** Momentos que se celebran a lo grande solo la primera vez. */
export type FirstKey = 'session' | 'root' | 'read' | 'plant' | 'away'
