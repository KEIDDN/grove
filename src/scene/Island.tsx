import { useMemo } from 'react'
import { BufferAttribute, Color, PlaneGeometry } from 'three'
import type { SeasonTheme } from '../game/seasons'
import { seeded } from './lowpoly'

export const TILE = 1
/** Altura de la superficie de césped: los objetos se apoyan aquí. */
export const GROUND_Y = 0
const RIM = 0.07
const SOIL = '#A87A52'
const SOIL_DARK = '#8C6442'

export function soilDepth(size: number) {
  return 0.3 + size * 0.04
}

/**
 * Césped de una pieza con facetas: los vértices interiores se mueven un poco y cada
 * triángulo toma un verde distinto, como en un diorama low poly hecho a mano.
 */
function useGrassTop(size: number, theme: SeasonTheme) {
  return useMemo(() => {
    const segs = size * 4
    const half = (size * TILE) / 2
    const cell = (size * TILE) / segs
    const rand = seeded(size * 977)
    const indexed = new PlaneGeometry(size * TILE, size * TILE, segs, segs)
    indexed.rotateX(-Math.PI / 2)
    const pos = indexed.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const edge = Math.abs(Math.abs(x) - half) < 1e-4 || Math.abs(Math.abs(z) - half) < 1e-4
      if (edge) continue
      pos.setXYZ(i, x + (rand() - 0.5) * cell * 0.5, (rand() - 0.5) * 0.035, z + (rand() - 0.5) * cell * 0.5)
    }
    const geo = indexed.toNonIndexed()
    indexed.dispose()
    const colors = new Float32Array(geo.attributes.position.count * 3)
    const c = new Color()
    for (let t = 0; t < colors.length / 9; t++) {
      c.set(theme.grass[Math.floor(rand() * theme.grass.length)])
      for (let v = 0; v < 3; v++) c.toArray(colors, t * 9 + v * 3)
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [size, theme])
}

export function Island({ size, theme }: { size: number; theme: SeasonTheme }) {
  const top = useGrassTop(size, theme)
  const depth = soilDepth(size)
  const width = size * TILE

  return (
    <group>
      <mesh geometry={top} receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} />
      </mesh>

      {/* Borde de césped que asoma por los lados */}
      <mesh position={[0, GROUND_Y - RIM / 2 - 0.001, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, RIM, width]} />
        <meshStandardMaterial color={theme.grass[3]} flatShading roughness={0.95} />
      </mesh>

      <mesh position={[0, GROUND_Y - RIM - depth / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, depth, width]} />
        <meshStandardMaterial color={SOIL} flatShading roughness={1} />
      </mesh>

      <mesh position={[0, GROUND_Y - RIM - depth - 0.03, 0]} castShadow>
        <boxGeometry args={[width, 0.06, width]} />
        <meshStandardMaterial color={SOIL_DARK} flatShading roughness={1} />
      </mesh>
    </group>
  )
}
