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
  | 'birch'
  | 'willow'
  | 'berrybush'
  | 'fern'
  | 'wheat'
  | 'log'
  | 'logpile'
  | 'campfire'
  | 'tent'
  | 'planter'
  | 'sign'
  | 'stones'
  | 'roundtree'
  | 'tallpine'
  | 'palm'
  | 'cactus'
  | 'tallgrass'
  | 'corn'
  | 'carrots'
  | 'melon'
  | 'boulder'
  | 'menhir'
  | 'column'
  | 'stonehead'
  | 'boardwalk'
  | 'canoe'
  | 'fountain'
  | 'cart'
  | 'stall'

export interface GardenItem {
  id: string
  kind: ItemKind
  /** Celda de la esquina del objeto (0 … tamaño×2 − 1). */
  x: number
  z: number
  /** Giro en cuartos de vuelta (0–3). */
  rot: number
  color?: string
  /** Si es una planta que aún está creciendo: cuánto necesita y cuánto lleva. */
  growth?: Growth
}

export interface Growth {
  by: 'focus' | 'roots'
  /** Minutos de Cultivar o entradas de Raíces necesarias. */
  need: number
  progress: number
}

/** Un objeto que tienes pero no está colocado. */
export interface InventoryItem {
  id: string
  kind: ItemKind
  color?: string
  growth?: Growth
}

export const CELLS_PER_TILE = 2
export const CELL = 1 / CELLS_PER_TILE
export const FLOWER_COLORS = ['#EBA3B8', '#B9A5DB', '#F0CF6E', '#F2B48A']

const LARGE: ItemKind[] = ['tree', 'pine', 'pond', 'birch', 'willow', 'tent', 'roundtree', 'tallpine', 'palm', 'fountain', 'stall']

export function footprint(kind: ItemKind): number {
  return LARGE.includes(kind) ? 2 : 1
}

export function newId(kind: ItemKind): string {
  return `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

// ——— Parcelas ———
// El jardín es un conjunto de parcelas de 1×1 casilla que se pueden añadir pegadas
// a las que ya tienes, así que su forma es libre.

export type Plot = [number, number]
export const MAX_PLOTS = 49
export const plotKey = (tx: number, tz: number) => `${tx},${tz}`

export function starterPlots(side = 3): Plot[] {
  const out: Plot[] = []
  for (let x = 0; x < side; x++) for (let z = 0; z < side; z++) out.push([x, z])
  return out
}

export function plotSet(plots: Plot[]): Set<string> {
  return new Set(plots.map(([x, z]) => plotKey(x, z)))
}

export function cellOwned(owned: Set<string>, x: number, z: number): boolean {
  return owned.has(plotKey(Math.floor(x / CELLS_PER_TILE), Math.floor(z / CELLS_PER_TILE)))
}

/** Huecos donde se puede añadir una parcela nueva (pegados por un lado). */
export function plotSlots(plots: Plot[]): Plot[] {
  const owned = plotSet(plots)
  const seen = new Set<string>()
  const out: Plot[] = []
  for (const [x, z] of plots) {
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const k = plotKey(x + dx, z + dz)
      if (!owned.has(k) && !seen.has(k)) {
        seen.add(k)
        out.push([x + dx, z + dz])
      }
    }
  }
  return out
}

export interface Bounds {
  /** Centro del jardín en el mundo, para encuadrarlo. */
  cx: number
  cz: number
  /** Lado mayor en casillas. */
  span: number
}

export function plotBounds(plots: Plot[]): Bounds {
  const xs = plots.map((p) => p[0])
  const zs = plots.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs) + 1
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs) + 1
  return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, span: Math.max(maxX - minX, maxZ - minZ) }
}

/** Celdas ocupadas por objetos, como "x,z". */
export function occupied(items: GardenItem[], ignoreId?: string): Set<string> {
  const set = new Set<string>()
  for (const it of items) {
    if (it.id === ignoreId) continue
    const fp = footprint(it.kind)
    for (let a = 0; a < fp; a++) for (let b = 0; b < fp; b++) set.add(`${it.x + a},${it.z + b}`)
  }
  return set
}

export function canPlace(items: GardenItem[], plots: Plot[], kind: ItemKind, x: number, z: number, ignoreId?: string): boolean {
  const fp = footprint(kind)
  const owned = plotSet(plots)
  const taken = occupied(items, ignoreId)
  for (let a = 0; a < fp; a++)
    for (let b = 0; b < fp; b++) {
      if (!cellOwned(owned, x + a, z + b) || taken.has(`${x + a},${z + b}`)) return false
    }
  return true
}

/** Busca el hueco libre más cercano al centro para un objeto nuevo. */
export function findSpot(items: GardenItem[], plots: Plot[], kind: ItemKind): [number, number] | null {
  const fp = footprint(kind)
  const { cx, cz } = plotBounds(plots)
  const spots: Array<[number, number]> = []
  for (const [tx, tz] of plots)
    for (let a = 0; a < CELLS_PER_TILE; a++) for (let b = 0; b < CELLS_PER_TILE; b++) spots.push([tx * CELLS_PER_TILE + a, tz * CELLS_PER_TILE + b])
  const dist = ([x, z]: [number, number]) => Math.hypot((x + fp / 2) * CELL - cx, (z + fp / 2) * CELL - cz)
  spots.sort((p, q) => dist(p) - dist(q))
  return spots.find(([x, z]) => canPlace(items, plots, kind, x, z)) ?? null
}

export function autoPlace(items: GardenItem[], plots: Plot[], kind: ItemKind, color?: string, extra?: Partial<GardenItem>): GardenItem[] | null {
  const spot = findSpot(items, plots, kind)
  if (!spot) return null
  return [...items, { id: newId(kind), kind, color, x: spot[0], z: spot[1], rot: 0, ...extra }]
}

/** Centro en el mundo 3D de un objeto colocado en (x, z). */
export function cellToWorld(x: number, z: number, kind: ItemKind): [number, number] {
  const fp = footprint(kind)
  return [(x + fp / 2) * CELL, (z + fp / 2) * CELL]
}

/** Celda de esquina para que el objeto quede centrado bajo el punto (wx, wz). */
export function worldToCell(wx: number, wz: number, kind: ItemKind): [number, number] {
  const fp = footprint(kind)
  return [Math.round(wx / CELL - fp / 2), Math.round(wz / CELL - fp / 2)]
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
