import type { Growth, ItemKind } from './garden'

export interface CatalogEntry {
  id: string
  kind: ItemKind
  name: string
  price: number
  /** Variante de color inicial (ver variants.ts). */
  color?: string
  /** Etiqueta de edición limitada, p. ej. "Otoño 2026". */
  limited?: string
  /** Si es una semilla: qué la hace crecer. Lo que no es semilla se coloca ya hecho. */
  seed?: Pick<Growth, 'by' | 'need'>
}

// Lo vivo se compra como semilla y se cultiva; la decoración llega lista para colocar.
export const CATALOG: CatalogEntry[] = [
  { id: 'pumpkin', kind: 'pumpkin', name: 'Calabaza', price: 60, limited: 'Otoño 2026', seed: { by: 'focus', need: 40 } },

  { id: 'flower', kind: 'flower', name: 'Flor', price: 15, color: 'pink', seed: { by: 'focus', need: 15 } },
  { id: 'tulips', kind: 'tulips', name: 'Tulipanes', price: 30, color: 'red', seed: { by: 'roots', need: 2 } },
  { id: 'reeds', kind: 'reeds', name: 'Juncos', price: 20, seed: { by: 'focus', need: 20 } },
  { id: 'bush', kind: 'bush', name: 'Arbusto', price: 35, seed: { by: 'focus', need: 30 } },
  { id: 'pine', kind: 'pine', name: 'Pino', price: 70, seed: { by: 'focus', need: 60 } },
  { id: 'tree', kind: 'tree', name: 'Árbol', price: 100, seed: { by: 'focus', need: 120 } },
  { id: 'fern', kind: 'fern', name: 'Helecho', price: 25, seed: { by: 'focus', need: 20 } },
  { id: 'wheat', kind: 'wheat', name: 'Trigo', price: 30, seed: { by: 'roots', need: 3 } },
  { id: 'berrybush', kind: 'berrybush', name: 'Arbusto de bayas', price: 55, seed: { by: 'focus', need: 45 } },
  { id: 'birch', kind: 'birch', name: 'Abedul', price: 110, seed: { by: 'focus', need: 90 } },
  { id: 'willow', kind: 'willow', name: 'Sauce llorón', price: 180, seed: { by: 'focus', need: 150 } },

  { id: 'rock', kind: 'rock', name: 'Rocas', price: 50 },
  { id: 'mushroom', kind: 'mushroom', name: 'Seta', price: 60 },
  { id: 'stump', kind: 'stump', name: 'Tocón', price: 70 },
  { id: 'fence', kind: 'fence', name: 'Valla', price: 40 },
  { id: 'bench', kind: 'bench', name: 'Banco', price: 140 },
  { id: 'lantern', kind: 'lantern', name: 'Farol', price: 150 },
  { id: 'birdhouse', kind: 'birdhouse', name: 'Casita de pájaros', price: 160 },
  { id: 'pond', kind: 'pond', name: 'Estanque', price: 260 },
  { id: 'stones', kind: 'stones', name: 'Piedras de paso', price: 30 },
  { id: 'sign', kind: 'sign', name: 'Cartel', price: 45 },
  { id: 'planter', kind: 'planter', name: 'Maceta', price: 50 },
  { id: 'log', kind: 'log', name: 'Tronco con musgo', price: 60 },
  { id: 'logpile', kind: 'logpile', name: 'Leña', price: 80 },
  { id: 'campfire', kind: 'campfire', name: 'Hoguera', price: 180 },
  { id: 'tent', kind: 'tent', name: 'Tienda de campaña', price: 320 },
]

export const KIND_NAMES: Record<string, string> = { sapling: 'Brote', ...Object.fromEntries(CATALOG.map((c) => [c.kind, c.name])) }

export function growthLabel(g: Pick<Growth, 'by' | 'need'>): string {
  return g.by === 'focus' ? `${g.need} min de Cultivar` : `${g.need} días en Raíces`
}
