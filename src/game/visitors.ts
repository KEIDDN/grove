import type { ItemKind } from './garden'
import type { Season } from './seasons'

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
