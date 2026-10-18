import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  type BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  type InstancedMesh,
  Object3D,
  PlaneGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { plotKey, type Plot } from '../game/garden'
import { islandStyle } from '../game/island'
import type { SeasonTheme } from '../game/seasons'
import { useGrove } from '../game/store'
import { hashString, jitter, seeded } from './lowpoly'

export const TILE = 1
/** Altura de la superficie de césped: los objetos se apoyan aquí. */
export const GROUND_Y = 0
const RIM = 0.07
const SOIL_DEPTH = 0.42
const SOIL_BOTTOM = GROUND_Y - RIM - SOIL_DEPTH
const SOIL = '#A87A52'
const SOIL_DARK = '#8C6442'
const SOIL_LOW = '#97704C'
const STONES = ['#B9B3A6', '#A39D91', '#C9C3B6']

type Side = [dx: number, dz: number]
const SIDES: Side[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

/** Pinta toda una geometría de un color (atributo de color por vértice) y la deja lista para fusionar. */
function tinted(geo: BufferGeometry, color: string | ((face: number) => string)): BufferGeometry {
  const flat = geo.index ? geo.toNonIndexed() : geo
  if (flat !== geo) geo.dispose()
  flat.deleteAttribute('uv')
  const count = flat.attributes.position.count
  const colors = new Float32Array(count * 3)
  const c = new Color()
  for (let t = 0; t < count / 3; t++) {
    c.set(typeof color === 'string' ? color : color(t))
    for (let v = 0; v < 3; v++) c.toArray(colors, t * 9 + v * 3)
  }
  flat.setAttribute('color', new BufferAttribute(colors, 3))
  flat.computeVertexNormals()
  return flat
}

/**
 * Césped facetado de una parcela: los vértices interiores se mueven un poco y cada
 * triángulo toma un verde distinto. Los bordes quedan rectos para que las parcelas
 * vecinas encajen sin costuras.
 */
function grassTop(plot: Plot, theme: SeasonTheme) {
  const segs = 4
  const half = TILE / 2
  const cell = TILE / segs
  const rand = seeded(hashString(plotKey(plot[0], plot[1])))
  const geo = new PlaneGeometry(TILE, TILE, segs, segs)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const edge = Math.abs(Math.abs(x) - half) < 1e-4 || Math.abs(Math.abs(z) - half) < 1e-4
    if (edge) continue
    pos.setXYZ(i, x + (rand() - 0.5) * cell * 0.5, (rand() - 0.5) * 0.035, z + (rand() - 0.5) * cell * 0.5)
  }
  geo.translate(plot[0] + 0.5, GROUND_Y, plot[1] + 0.5)
  return tinted(geo, () => theme.grass[Math.floor(rand() * theme.grass.length)])
}

/** Cuerpo de tierra en capas: canto de césped, tierra, una veta oscura y tierra más baja. */
function soilBody(plot: Plot, theme: SeasonTheme) {
  const [x, z] = [plot[0] + 0.5, plot[1] + 0.5]
  const layer = (h: number, top: number, color: string) => {
    const g = new BoxGeometry(TILE, h, TILE)
    g.translate(x, top - h / 2, z)
    return tinted(g, color)
  }
  let y = GROUND_Y - 0.001
  const parts = [
    layer(RIM, y, theme.grass[3]),
    layer(0.22, (y -= RIM), SOIL),
    layer(0.05, (y -= 0.22), SOIL_DARK),
    layer(SOIL_DEPTH - 0.27, (y -= 0.05), SOIL_LOW),
  ]
  return parts
}

/**
 * Base de roca bajo una parcela: una pirámide truncada facetada que se estrecha hacia abajo.
 * Es más honda cuanto más lejos está la parcela del borde, así el conjunto parece una isla flotante.
 */
function rockBase(plot: Plot, depthFromEdge: number, rock: string[]) {
  const rand = seeded(hashString(`rock:${plotKey(plot[0], plot[1])}`))
  const h = 0.5 + Math.min(depthFromEdge, 3) * 0.38 + rand() * 0.18
  const top = Math.SQRT1_2 * TILE
  const geo = new CylinderGeometry(top, top * (0.18 + rand() * 0.18), h, 4, 4)
  geo.rotateY(Math.PI / 4)
  geo.translate(0, -h / 2, 0)
  // La cara de arriba no se mueve: encaja con la tierra y con las parcelas vecinas
  jitter(geo, 0.085, hashString(plotKey(plot[0], plot[1])), (_, py) => py > -0.001)
  geo.translate(plot[0] + 0.5, SOIL_BOTTOM + 0.002, plot[1] + 0.5)
  return tinted(geo, (f) => rock[(f * 7 + Math.floor(rand() * 3)) % rock.length])
}

/** Distancia (en parcelas) de cada parcela al borde de la isla. */
function edgeDistance(plots: Plot[]) {
  const owned = new Set(plots.map(([x, z]) => plotKey(x, z)))
  const dist = new Map<string, number>()
  let frontier: Plot[] = []
  for (const [x, z] of plots) {
    if (SIDES.some(([dx, dz]) => !owned.has(plotKey(x + dx, z + dz)))) {
      dist.set(plotKey(x, z), 0)
      frontier.push([x, z])
    }
  }
  while (frontier.length) {
    const next: Plot[] = []
    for (const [x, z] of frontier) {
      const d = dist.get(plotKey(x, z))!
      for (const [dx, dz] of SIDES) {
        const k = plotKey(x + dx, z + dz)
        if (owned.has(k) && !dist.has(k)) {
          dist.set(k, d + 1)
          next.push([x + dx, z + dz])
        }
      }
    }
    frontier = next
  }
  return { owned, dist }
}

interface Instance {
  p: [number, number, number]
  s: [number, number, number]
  r: number
}

/** Coloca muchas copias de una pieza pequeña en una sola llamada de dibujo. */
function Scatter({ geometry, items, color, vertexColors }: { geometry: BufferGeometry; items: Instance[]; color?: string; vertexColors?: string[] }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    const c = new Color()
    items.forEach((it, i) => {
      o.position.set(...it.p)
      o.scale.set(...it.s)
      o.rotation.set(0, it.r, 0)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      if (vertexColors) mesh.setColorAt(i, c.set(vertexColors[i % vertexColors.length]))
    })
    mesh.count = items.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items, vertexColors])
  if (!items.length) return null
  return (
    <instancedMesh key={items.length} ref={ref} args={[geometry, undefined, items.length]} castShadow receiveShadow>
      <meshStandardMaterial color={color ?? '#ffffff'} flatShading roughness={1} />
    </instancedMesh>
  )
}

/**
 * Isla flotante: césped facetado, tierra en capas con piedras incrustadas, un borde de césped que
 * cae un poco por los lados y una base de roca con musgo. Todo va fusionado en
 * pocas mallas para que sea ligero en el móvil.
 */
export function Island({ plots, theme }: { plots: Plot[]; theme: SeasonTheme }) {
  const style = islandStyle(useGrove((s) => s.islandStyle))
  const { top, body, rock, drips, stones, moss } = useMemo(() => {
    const { owned, dist } = edgeDistance(plots)
    const tops: BufferGeometry[] = []
    const bodies: BufferGeometry[] = []
    const rocks: BufferGeometry[] = []
    const drips: Instance[] = []
    const stones: Instance[] = []
    const moss: Instance[] = []

    for (const plot of plots) {
      const [px, pz] = plot
      tops.push(grassTop(plot, theme))
      bodies.push(...soilBody(plot, theme))
      rocks.push(rockBase(plot, dist.get(plotKey(px, pz)) ?? 0, style.rock))

      const rand = seeded(hashString(`edge:${plotKey(px, pz)}`))
      for (const [dx, dz] of SIDES) {
        if (owned.has(plotKey(px + dx, pz + dz))) continue
        // Punto del borde exterior a lo largo del lado (t de 0 a 1)
        const at = (t: number, y: number, push = 0.004): [number, number, number] => {
          const cx = px + 0.5 + dx * (0.5 + push)
          const cz = pz + 0.5 + dz * (0.5 + push)
          const along = t - 0.5
          return [cx + (dz !== 0 ? along : 0), y, cz + (dx !== 0 ? along : 0)]
        }
        // Flecos de césped colgando del canto
        for (let i = 0; i < 5; i++) {
          if (rand() < 0.25) continue
          const len = 0.03 + rand() * rand() * 0.14
          const w = 0.6 + rand() * 0.9
          drips.push({ p: at((i + 0.15 + rand() * 0.7) / 5, GROUND_Y - RIM - len / 2 + 0.01), s: [w, len, w], r: rand() * Math.PI })
        }
        // Piedras medio enterradas en la tierra
        const n = 1 + Math.floor(rand() * 3)
        for (let i = 0; i < n; i++) {
          const r = 0.03 + rand() * 0.035
          stones.push({ p: at(0.1 + rand() * 0.8, GROUND_Y - RIM - 0.06 - rand() * 0.3, -r * 0.35), s: [r, r * 0.8, r], r: rand() * Math.PI })
        }
        // Musgo donde la tierra se junta con la roca
        for (let i = 0; i < Math.round(2 * style.moss); i++) {
          const r = 0.05 + rand() * 0.05
          moss.push({ p: at(rand(), SOIL_BOTTOM - 0.01, -0.02), s: [r, r * 0.45, r], r: rand() * Math.PI })
        }
      }
    }

    const merge = (list: BufferGeometry[]) => {
      const g = mergeGeometries(list)
      list.forEach((l) => l.dispose())
      return g
    }
    return { top: merge(tops), body: merge(bodies), rock: merge(rocks), drips, stones, moss }
  }, [plots, theme, style])

  const drip = useMemo(() => {
    const g = new ConeGeometry(0.03, 1, 4)
    g.rotateX(Math.PI)
    return g
  }, [])
  const stone = useMemo(() => new DodecahedronGeometry(1, 0), [])
  const mossGeo = useMemo(() => jitter(new IcosahedronGeometry(1, 0), 0.15, 3), [])

  useLayoutEffect(
    () => () => {
      top.dispose()
      body.dispose()
      rock.dispose()
    },
    [top, body, rock],
  )

  return (
    <group>
      <mesh geometry={top} receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} />
      </mesh>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </mesh>
      <mesh geometry={rock} castShadow receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </mesh>
      <Scatter geometry={drip} items={drips} color={theme.grass[3]} />
      <Scatter geometry={stone} items={stones} vertexColors={STONES} />
      <Scatter geometry={mossGeo} items={moss} color={theme.grass[2]} />
    </group>
  )
}
