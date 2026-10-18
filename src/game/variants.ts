import type { ItemKind } from './garden'
import { localize } from '../i18n'

/** Una variante de color: `colors` son los tonos que usa el modelo (de claro a oscuro). */
export interface Variant {
  id: string
  name: string
  colors: string[]
}

const FOLIAGE: Variant[] = [
  { id: 'season', name: 'Estación', colors: [] },
  { id: 'spring', name: 'Verde', colors: ['#8CC66A', '#6DB25A', '#A9D47A', '#5A9E4C'] },
  { id: 'cherry', name: 'Cerezo', colors: ['#F7C9D6', '#F4B6C8', '#FBD9E3', '#EFA3BA'] },
  { id: 'maple', name: 'Arce', colors: ['#E8774A', '#D9573B', '#F08A5B', '#C84530'] },
  { id: 'golden', name: 'Dorado', colors: ['#F5D46E', '#F0C24E', '#F8E08A', '#E3AE3A'] },
  { id: 'lilac', name: 'Glicina', colors: ['#CBBBE6', '#B9A5DB', '#D8CCEE', '#A48FCF'] },
]

const STONE: Variant[] = [
  { id: 'grey', name: 'Gris', colors: ['#C2C1BA', '#ABAAA3', '#B7B6AF'] },
  { id: 'sand', name: 'Arenisca', colors: ['#E0C9A2', '#CBB08A', '#D6BE96'] },
  { id: 'slate', name: 'Pizarra', colors: ['#8E959B', '#7A8187', '#868D93'] },
]

const WOOD: Variant[] = [
  { id: 'oak', name: 'Roble', colors: ['#B98A5E', '#9C7149'] },
  { id: 'white', name: 'Blanco', colors: ['#F2EEE6', '#D9D3C7'] },
  { id: 'sage', name: 'Salvia', colors: ['#9FB79A', '#7F9A7A'] },
  { id: 'walnut', name: 'Nogal', colors: ['#7A5640', '#5E4130'] },
]

export const VARIANTS: Partial<Record<ItemKind, Variant[]>> = {
  tree: FOLIAGE,
  bush: FOLIAGE,
  birch: FOLIAGE,
  roundtree: FOLIAGE,
  cherry: FOLIAGE,
  palm: FOLIAGE,
  willow: FOLIAGE,
  berrybush: FOLIAGE,
  tent: [
    { id: 'red', name: 'Roja', colors: ['#D9604C', '#C24C3A'] },
    { id: 'sage', name: 'Salvia', colors: ['#9DB596', '#839E7C'] },
    { id: 'sand', name: 'Arena', colors: ['#E6CFA3', '#D2B887'] },
    { id: 'sky', name: 'Cielo', colors: ['#8FB3D6', '#7598BE'] },
  ],
  pine: [
    { id: 'green', name: 'Verde', colors: ['#4FA066', '#3F8F5B', '#5DAA70', '#357E4F'] },
    { id: 'blue', name: 'Abeto azul', colors: ['#78A6A6', '#5E8F92', '#8BB6B4', '#4F7F82'] },
    { id: 'dark', name: 'Bosque', colors: ['#3A7A55', '#2E6A48', '#468A62', '#245C3D'] },
  ],
  flower: [
    { id: 'pink', name: 'Rosa', colors: ['#EBA3B8'] },
    { id: 'lilac', name: 'Lila', colors: ['#B9A5DB'] },
    { id: 'sun', name: 'Sol', colors: ['#F0CF6E'] },
    { id: 'peach', name: 'Melocotón', colors: ['#F2B48A'] },
    { id: 'white', name: 'Blanca', colors: ['#F7F4EE'] },
    { id: 'red', name: 'Roja', colors: ['#E0605A'] },
  ],
  tulips: [
    { id: 'red', name: 'Rojos', colors: ['#E0605A'] },
    { id: 'pink', name: 'Rosas', colors: ['#EBA3B8'] },
    { id: 'yellow', name: 'Amarillos', colors: ['#F0CF6E'] },
    { id: 'white', name: 'Blancos', colors: ['#F7F4EE'] },
    { id: 'purple', name: 'Morados', colors: ['#9A7BC8'] },
  ],
  mushroom: [
    { id: 'red', name: 'Roja', colors: ['#D9604C'] },
    { id: 'brown', name: 'Parda', colors: ['#B07A50'] },
    { id: 'violet', name: 'Violeta', colors: ['#9A7BC8'] },
    { id: 'white', name: 'Blanca', colors: ['#EFE7DA'] },
  ],
  rock: STONE,
  boulder: STONE,
  menhir: STONE,
  column: STONE,
  stonehead: STONE,
  pumpkin: [
    { id: 'orange', name: 'Naranja', colors: ['#E58A3A', '#CC7330', '#EE9A4C'] },
    { id: 'white', name: 'Blanca', colors: ['#F1ECE0', '#DDD5C4', '#F7F3EA'] },
    { id: 'green', name: 'Verde', colors: ['#8FAE6A', '#789A55', '#A2BE7E'] },
  ],
  lantern: [
    { id: 'warm', name: 'Cálida', colors: ['#F6C766'] },
    { id: 'rose', name: 'Rosa', colors: ['#F4A8C0'] },
    { id: 'moon', name: 'Luna', colors: ['#BFD8F2'] },
  ],
  bench: WOOD,
  fence: WOOD,
  birdhouse: WOOD,
  sign: WOOD,
  canoe: WOOD,
  boardwalk: WOOD,
  logpile: WOOD,
}

/** Tonos de un objeto según su variante; vacío si usa los de la estación. */
export function paletteFor(kind: ItemKind, color?: string): string[] | undefined {
  if (color?.startsWith('#')) return [color] // compatibilidad: flores con color directo
  const list = VARIANTS[kind]
  if (!list) return undefined
  const v = list.find((x) => x.id === color) ?? list[0]
  return v.colors.length ? v.colors : undefined
}

export function variantName(kind: ItemKind, color?: string): string | undefined {
  return VARIANTS[kind]?.find((x) => x.id === color)?.name
}

// El pino alto usa los tonos del pino, pero por defecto el de bosque, más oscuro
VARIANTS.tallpine = [...VARIANTS.pine!].sort((a, b) => (a.id === 'dark' ? -1 : b.id === 'dark' ? 1 : 0))

for (const list of Object.values(VARIANTS)) if (list) localize(list, ['name'])
