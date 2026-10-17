import { useMemo } from 'react'
import { BufferAttribute, Color, PlaneGeometry } from 'three'
import { plotKey, type Plot } from '../game/garden'
import type { SeasonTheme } from '../game/seasons'
import { hashString, seeded } from './lowpoly'

export const TILE = 1
/** Altura de la superficie de césped: los objetos se apoyan aquí. */
export const GROUND_Y = 0
const RIM = 0.07
const SOIL_DEPTH = 0.42
const SOIL = '#A87A52'
const SOIL_DARK = '#8C6442'

/**
 * Césped facetado de una parcela: los vértices interiores se mueven un poco y cada
 * triángulo toma un verde distinto. Los bordes quedan rectos para que las parcelas
 * vecinas encajen sin costuras.
 */
function grassTop(seed: number, theme: SeasonTheme) {
  const segs = 4
  const half = TILE / 2
  const cell = TILE / segs
  const rand = seeded(seed)
  const indexed = new PlaneGeometry(TILE, TILE, segs, segs)
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
}

function PlotSlab({ plot, theme }: { plot: Plot; theme: SeasonTheme }) {
  const top = useMemo(() => grassTop(hashString(plotKey(plot[0], plot[1])), theme), [plot, theme])
  const [x, z] = [plot[0] + 0.5, plot[1] + 0.5]
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={top} receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} />
      </mesh>
      {/* Canto de césped y tierra: las parcelas vecinas se funden en un solo bloque */}
      <mesh position={[0, GROUND_Y - RIM / 2 - 0.001, 0]} receiveShadow castShadow>
        <boxGeometry args={[TILE, RIM, TILE]} />
        <meshStandardMaterial color={theme.grass[3]} flatShading roughness={0.95} />
      </mesh>
      <mesh position={[0, GROUND_Y - RIM - SOIL_DEPTH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[TILE, SOIL_DEPTH, TILE]} />
        <meshStandardMaterial color={SOIL} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, GROUND_Y - RIM - SOIL_DEPTH - 0.03, 0]} castShadow>
        <boxGeometry args={[TILE, 0.06, TILE]} />
        <meshStandardMaterial color={SOIL_DARK} flatShading roughness={1} />
      </mesh>
    </group>
  )
}

export function Island({ plots, theme }: { plots: Plot[]; theme: SeasonTheme }) {
  return (
    <group>
      {plots.map((p) => (
        <PlotSlab key={plotKey(p[0], p[1])} plot={p} theme={theme} />
      ))}
    </group>
  )
}
