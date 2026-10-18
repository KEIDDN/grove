// Suelos que se pintan celda a celda. El césped es el suelo por defecto.

import { localize } from '../i18n'

export type FloorKind = 'grass' | 'lawn' | 'path' | 'gravel' | 'sand' | 'deck' | 'moss'

export interface FloorStyle {
  id: FloorKind
  name: string
  /** Tonos para la base y los detalles. */
  colors: string[]
}

export const FLOORS: FloorStyle[] = [
  { id: 'grass', name: 'Césped', colors: ['#A6D47C'] },
  // Mismo verde que el césped, pero sin hierbas altas: para jardines limpios (zen, japonés…)
  { id: 'lawn', name: 'Corto', colors: ['#B9DE95'] },
  { id: 'path', name: 'Piedra', colors: ['#D8D3C8', '#C6C0B3', '#E4E0D7'] },
  { id: 'gravel', name: 'Grava', colors: ['#D9CDB4', '#CFC2A6', '#E2D7C1'] },
  { id: 'sand', name: 'Arena', colors: ['#EAD9AE', '#E2CF9F', '#F0E2BE'] },
  { id: 'deck', name: 'Madera', colors: ['#C49A6C', '#B08658', '#D2AA7E'] },
  { id: 'moss', name: 'Musgo', colors: ['#6E9E55', '#5E8E48', '#7DAE62'] },
]

export const cellKey = (x: number, z: number) => `${x},${z}`

localize(FLOORS, ['name'])
