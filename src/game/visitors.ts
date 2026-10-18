import type { ItemKind } from './garden'
import type { Season } from './seasons'
import { AWAY } from './config'
import { hashString } from './hash'
import { localize } from '../i18n'

export type VisitorType = 'bird' | 'mammal' | 'insect' | 'amphibian'

export interface Visitor {
  id: string
  name: string
  type: VisitorType
  /** Objetos del jardín que le atraen. */
  likes: ItemKind[]
  seasons: Season[] | 'all'
  /** Pista que se muestra mientras aún no ha venido. */
  hint: string
  event?: string
}

// Cada objeto atrae a visitantes concretos. Llegan mientras no estás y quedan en el álbum.
export const VISITORS: Visitor[] = [
  { id: 'robin', name: 'Petirrojo', type: 'bird', likes: ['tree'], seasons: 'all', hint: 'Le gustan los árboles' },
  { id: 'duck', name: 'Pato', type: 'bird', likes: ['pond'], seasons: 'all', hint: 'Busca agua tranquila' },
  { id: 'butterfly', name: 'Mariposa', type: 'insect', likes: ['flower'], seasons: ['spring', 'summer'], hint: 'Viene a por flores en primavera' },
  { id: 'frog', name: 'Rana', type: 'amphibian', likes: ['pond'], seasons: ['spring', 'summer'], hint: 'Canta junto al agua cuando hace calor' },
  { id: 'fireflies', name: 'Luciérnagas', type: 'insect', likes: ['lantern'], seasons: ['summer'], hint: 'Las noches de verano y una luz cálida' },
  { id: 'hedgehog', name: 'Erizo', type: 'mammal', likes: ['bush'], seasons: ['spring', 'autumn'], hint: 'Se esconde entre arbustos' },
  { id: 'squirrel', name: 'Ardilla', type: 'mammal', likes: ['tree', 'pine'], seasons: ['autumn'], hint: 'Guarda provisiones en otoño' },
  { id: 'fox', name: 'Zorro', type: 'mammal', likes: ['pumpkin'], seasons: ['autumn'], hint: 'Curioso con lo naranja de otoño' },
  { id: 'tit', name: 'Carbonero', type: 'bird', likes: ['pine'], seasons: ['winter'], hint: 'Se refugia en los pinos con frío' },
  { id: 'reindeer', name: 'Reno', type: 'mammal', likes: ['pine', 'lantern'], seasons: ['winter'], hint: 'Solo por Navidad', event: 'Navidad' },
]

export interface AwayVisit {
  visitors: Visitor[]
  /** Los que vienen por primera vez y entran en el álbum. */
  fresh: string[]
  coins: number
}

/**
 * Quién ha pasado por el jardín mientras no estabas: uno cada pocas horas (hasta tres), elegidos
 * entre los que buscan algo que tienes y viven en esta estación. Cada uno deja unas monedas.
 * Es estable para la misma vuelta (la semilla es el momento en que te fuiste).
 */
export function visitWhileAway(kinds: Set<ItemKind>, season: Season, hoursAway: number, seen: string[], seed: number): AwayVisit | null {
  const count = Math.min(AWAY.maxVisitors, Math.floor(hoursAway / AWAY.hoursPerVisitor))
  if (count < 1) return null
  const pool = VISITORS.filter((v) => !v.event && (v.seasons === 'all' || v.seasons.includes(season)) && v.likes.some((k) => kinds.has(k)))
  if (!pool.length) return null
  // Barajado estable: los que aún no has visto tienen más papeletas
  const ranked = pool
    .map((v) => ({ v, r: (hashString(`${seed}:${v.id}`) % 1000) / 1000 - (seen.includes(v.id) ? 0 : 0.35) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, count)
    .map((x) => x.v)
  return {
    visitors: ranked,
    fresh: ranked.filter((v) => !seen.includes(v.id)).map((v) => v.id),
    coins: ranked.length * AWAY.coinsPerVisitor,
  }
}

localize(VISITORS, ['name', 'hint', 'event'])
