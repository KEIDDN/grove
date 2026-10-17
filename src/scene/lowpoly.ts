import type { BufferGeometry } from 'three'

/** Generador pseudoaleatorio con semilla: el mismo id siempre da la misma forma. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Desplaza cada vértice un poco para que la geometría parezca tallada a mano.
 * Los vértices que comparten posición se mueven juntos, así no se abren huecos.
 */
export function jitter<T extends BufferGeometry>(
  geo: T,
  amount: number,
  seed = 1,
  keep?: (x: number, y: number, z: number) => boolean,
): T {
  const rand = seeded(seed)
  const pos = geo.attributes.position
  const offsets = new Map<string, [number, number, number]>()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    if (keep?.(x, y, z)) continue
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`
    let o = offsets.get(key)
    if (!o) {
      o = [(rand() - 0.5) * 2 * amount, (rand() - 0.5) * 2 * amount, (rand() - 0.5) * 2 * amount]
      offsets.set(key, o)
    }
    pos.setXYZ(i, x + o[0], y + o[1], z + o[2])
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

export function pick<T>(list: readonly T[], seed: number): T {
  return list[seed % list.length]
}
