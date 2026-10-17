// Lógica del jardín: qué hay y dónde. No sabe nada de 3D ni de React.
//
// El suelo se divide en celdas de media casilla (2×2 por casilla) para poder
// colocar las cosas con libertad. Los objetos grandes ocupan 2×2 celdas.

export type ItemKind =
  | 'tree'
  | 'pine'
  | 'pond'
  | 'sapling'
  | 'flower'
  | 'bush'
  | 'rock'
  | 'mushroom'
  | 'pumpkin'
  | 'lantern'
  | 'bench'
  | 'fence'
  | 'stump'
  | 'birdhouse'
  | 'tulips'
  | 'reeds'

export interface GardenItem {
  id: string
  kind: ItemKind
  /** Celda de la esquina del objeto (0 … tamaño×2 − 1). */
  x: number
  z: number
  /** Giro en cuartos de vuelta (0–3). */
  rot: number
  color?: string
}

/** Un objeto que tienes pero no está colocado. */
export interface InventoryItem {
  id: string
  kind: ItemKind
  color?: string
}

export const CELLS_PER_TILE = 2
export const CELL = 1 / CELLS_PER_TILE
export const FLOWER_COLORS = ['#EBA3B8', '#B9A5DB', '#F0CF6E', '#F2B48A']

const LARGE: ItemKind[] = ['tree', 'pine', 'pond']

export function footprint(kind: ItemKind): number {
  return LARGE.includes(kind) ? 2 : 1
}

export function newId(kind: ItemKind): string {
  return `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function occupied(items: GardenItem[], ignoreId?: string): Set<string> {
  const set = new Set<string>()
  for (const it of items) {
    if (it.id === ignoreId) continue
    const fp = footprint(it.kind)
    for (let a = 0; a < fp; a++) for (let b = 0; b < fp; b++) set.add(`${it.x + a},${it.z + b}`)
  }
  return set
}

export function canPlace(items: GardenItem[], size: number, kind: ItemKind, x: number, z: number, ignoreId?: string): boolean {
  const fp = footprint(kind)
  const cells = size * CELLS_PER_TILE
  if (x < 0 || z < 0 || x + fp > cells || z + fp > cells) return false
  const taken = occupied(items, ignoreId)
  for (let a = 0; a < fp; a++) for (let b = 0; b < fp; b++) if (taken.has(`${x + a},${z + b}`)) return false
  return true
}

/** Busca el hueco libre más cercano al centro para un objeto nuevo. */
export function findSpot(items: GardenItem[], size: number, kind: ItemKind): [number, number] | null {
  const fp = footprint(kind)
  const cells = size * CELLS_PER_TILE
  const c = cells / 2
  const spots: Array<[number, number]> = []
  for (let x = 0; x + fp <= cells; x++) for (let z = 0; z + fp <= cells; z++) spots.push([x, z])
  spots.sort((p, q) => Math.hypot(p[0] + fp / 2 - c, p[1] + fp / 2 - c) - Math.hypot(q[0] + fp / 2 - c, q[1] + fp / 2 - c))
  return spots.find(([x, z]) => canPlace(items, size, kind, x, z)) ?? null
}

export function autoPlace(items: GardenItem[], size: number, kind: ItemKind, color?: string): GardenItem[] | null {
  const spot = findSpot(items, size, kind)
  if (!spot) return null
  return [...items, { id: newId(kind), kind, color, x: spot[0], z: spot[1], rot: 0 }]
}

/** Centro en el mundo 3D de un objeto colocado en (x, z). */
export function cellToWorld(x: number, z: number, kind: ItemKind, size: number): [number, number] {
  const fp = footprint(kind)
  return [(x + fp / 2) * CELL - size / 2, (z + fp / 2) * CELL - size / 2]
}

/** Celda de esquina para que el objeto quede centrado bajo el punto (wx, wz). */
export function worldToCell(wx: number, wz: number, kind: ItemKind, size: number): [number, number] {
  const fp = footprint(kind)
  return [Math.round((wx + size / 2) / CELL - fp / 2), Math.round((wz + size / 2) / CELL - fp / 2)]
}

export const STARTER_GARDEN: GardenItem[] = [
  { id: 'starter-tree', kind: 'tree', x: 2, z: 2, rot: 0 },
  { id: 'starter-pine', kind: 'pine', x: 0, z: 0, rot: 0 },
  { id: 'starter-pond', kind: 'pond', x: 4, z: 4, rot: 0 },
  { id: 'starter-rock', kind: 'rock', x: 5, z: 2, rot: 1 },
  { id: 'starter-bush', kind: 'bush', x: 4, z: 1, rot: 0 },
  { id: 'starter-flower-1', kind: 'flower', x: 0, z: 5, rot: 0, color: FLOWER_COLORS[0] },
  { id: 'starter-flower-2', kind: 'flower', x: 1, z: 4, rot: 0, color: FLOWER_COLORS[1] },
]
