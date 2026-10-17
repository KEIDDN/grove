import type { ItemKind } from './garden'

export interface CatalogEntry {
  id: string
  kind: ItemKind
  name: string
  price: number
  /** Variante de color inicial (ver variants.ts). */
  color?: string
  /** Etiqueta de edición limitada, p. ej. "Otoño 2026". */
  limited?: string
}

export const CATALOG: CatalogEntry[] = [
  { id: 'pumpkin', kind: 'pumpkin', name: 'Calabaza', price: 120, limited: 'Otoño 2026' },
  { id: 'flower', kind: 'flower', name: 'Flor', price: 40, color: 'pink' },
  { id: 'tulips', kind: 'tulips', name: 'Tulipanes', price: 70, color: 'red' },
  { id: 'reeds', kind: 'reeds', name: 'Juncos', price: 60 },
  { id: 'rock', kind: 'rock', name: 'Rocas', price: 50 },
  { id: 'mushroom', kind: 'mushroom', name: 'Seta', price: 60 },
  { id: 'stump', kind: 'stump', name: 'Tocón', price: 70 },
  { id: 'bush', kind: 'bush', name: 'Arbusto', price: 80 },
  { id: 'fence', kind: 'fence', name: 'Valla', price: 40 },
  { id: 'bench', kind: 'bench', name: 'Banco', price: 140 },
  { id: 'lantern', kind: 'lantern', name: 'Farol', price: 150 },
  { id: 'birdhouse', kind: 'birdhouse', name: 'Casita de pájaros', price: 160 },
  { id: 'pine', kind: 'pine', name: 'Pino', price: 220 },
  { id: 'pond', kind: 'pond', name: 'Estanque', price: 260 },
  { id: 'tree', kind: 'tree', name: 'Árbol', price: 300 },
]
