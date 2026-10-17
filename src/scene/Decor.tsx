import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type BufferGeometry, Color, ConeGeometry, DodecahedronGeometry, IcosahedronGeometry, Object3D, type InstancedMesh } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CELL, cellToWorld, plotKey, type GardenItem, type Plot } from '../game/garden'
import { cellKey, type FloorKind } from '../game/floors'
import type { SeasonTheme } from '../game/seasons'
import { GROUND_Y, TILE } from './Island'
import { hashString, seeded } from './lowpoly'

/** Un mechón de hierba: tres briznas inclinadas en una sola geometría. */
function makeTuft() {
  const blades = [
    { h: 0.16, x: 0, z: 0, rx: 0.12, rz: 0.05 },
    { h: 0.12, x: 0.025, z: 0.01, rx: -0.1, rz: -0.35 },
    { h: 0.11, x: -0.022, z: -0.012, rx: 0.2, rz: 0.4 },
  ].map((b) => {
    const g = new ConeGeometry(0.014, b.h, 3)
    g.translate(0, b.h / 2, 0)
    g.rotateX(b.rx)
    g.rotateZ(b.rz)
    g.translate(b.x, 0, b.z)
    return g
  })
  return mergeGeometries(blades)
}

interface Scatter {
  x: number
  z: number
  rot: number
  scale: number
  color: string
}

/** Reparte detalles por cada parcela; la semilla depende de la parcela, así ampliar no reordena lo que ya había. */
function scatter(perTile: number, plots: Plot[], salt: number, colors: string[], blocked: Array<[number, number]>, scaleRange: [number, number]) {
  const out: Scatter[] = []
  for (const [tx, tz] of plots) {
    const rand = seeded(hashString(plotKey(tx, tz)) + salt)
    for (let i = 0; i < perTile; i++) {
      const x = tx + 0.03 + rand() * (TILE - 0.06)
      const z = tz + 0.03 + rand() * (TILE - 0.06)
      const rot = rand() * Math.PI * 2
      const scale = scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0])
      const color = colors[Math.floor(rand() * colors.length)]
      if (blocked.some(([bx, bz]) => Math.hypot(x - bx, z - bz) < 0.46)) continue
      out.push({ x, z, rot, scale, color })
    }
  }
  return out
}

/** Tiempo compartido por todo lo que se mece con el viento. */
const windTime = { value: 0 }

/** Inyecta en el material un vaivén que crece con la altura de cada vértice. */
function addWind(shader: { uniforms: Record<string, { value: unknown }>; vertexShader: string }) {
  shader.uniforms.uWind = windTime
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uWind;')
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 root = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float sway = sin(uWind * 1.7 + root.x * 2.3 + root.z * 1.7) + 0.4 * sin(uWind * 3.1 + root.z * 4.0);
      transformed.x += sway * transformed.y * 0.35;
      transformed.z += cos(uWind * 1.3 + root.x * 1.9) * transformed.y * 0.2;`,
    )
}

function Instances({ geometry, items, y = 0, wind }: { geometry: BufferGeometry; items: Scatter[]; y?: number; wind?: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    const c = new Color()
    items.forEach((it, i) => {
      o.position.set(it.x, GROUND_Y + y, it.z)
      o.rotation.set(0, it.rot, 0)
      o.scale.setScalar(it.scale)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, c.set(it.color))
    })
    mesh.count = items.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items, y])

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, Math.max(1, items.length)]} castShadow receiveShadow>
      <meshStandardMaterial flatShading roughness={0.9} onBeforeCompile={wind ? addWind : undefined} />
    </instancedMesh>
  )
}

/** Hierba, florecillas y piedrecitas repartidas por el jardín, fuera del agua. */
export function Decor({ plots, theme, items, floors }: { plots: Plot[]; theme: SeasonTheme; items: GardenItem[]; floors: Record<string, FloorKind> }) {
  const tuft = useMemo(makeTuft, [])
  useFrame((_, delta) => {
    windTime.value += delta
  })
  const speck = useMemo(() => new IcosahedronGeometry(0.022, 0), [])
  const pebble = useMemo(() => new DodecahedronGeometry(0.035, 0), [])

  const ponds = useMemo(
    () => items.filter((it) => it.kind === 'pond').map((it) => cellToWorld(it.x, it.z, it.kind)),
    [items],
  )

  const allTufts = useMemo(() => scatter(22, plots, 11, theme.tuft, ponds, [0.8, 1.5]), [plots, theme, ponds])
  const allSpecks = useMemo(() => scatter(9, plots, 23, theme.speck, ponds, [0.7, 1.2]), [plots, theme, ponds])
  const allPebbles = useMemo(() => scatter(2, plots, 37, ['#B9B8B1', '#A6A59E', '#C8C7C0'], ponds, [0.7, 1.4]), [plots, ponds])

  // La hierba solo crece donde sigue habiendo césped
  const onGrass = (list: Scatter[]) =>
    list.filter((p) => !floors[cellKey(Math.floor(p.x / CELL), Math.floor(p.z / CELL))])
  const tufts = useMemo(() => onGrass(allTufts), [allTufts, floors])
  const specks = useMemo(() => onGrass(allSpecks), [allSpecks, floors])
  const pebbles = useMemo(() => onGrass(allPebbles), [allPebbles, floors])

  return (
    <group>
      <Instances geometry={tuft} items={tufts} wind />
      <Instances geometry={speck} items={specks} y={0.03} />
      <Instances geometry={pebble} items={pebbles} y={0.012} />
    </group>
  )
}
