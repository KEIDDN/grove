import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { CELL, CELLS_PER_TILE, cellToWorld, occupied, type GardenItem, type Plot } from '../game/garden'
import { dayKey } from '../game/time'
import { useGrove } from '../game/store'
import { hashString } from '../game/hash'
import { GROUND_Y } from './Island'

/**
 * Los visitantes que han pasado hoy, vivos en la isla: cada uno con su modelo low poly y su forma
 * de moverse. Los pájaros dan saltitos y picotean, el pato flota en el estanque, la rana salta
 * cerca del agua, el erizo camina despacio, la ardilla corretea y se sienta, y el zorro pasea.
 * Su posición se publica en `visitorSpots` para que la cámara pueda ir hacia ellos.
 */

/** Dónde está cada visitante ahora (coordenadas del jardín), para llevar la cámara. */
export const visitorSpots = new Map<string, { x: number; z: number }>()

type Gait = 'hop' | 'walk' | 'swim'

interface Species {
  gait: Gait
  /** Unidades por segundo al moverse. */
  speed: number
  /** Altura y duración de cada salto (si salta). */
  hop?: number
  scale: number
  model: () => ReactNode
}

const M = ({ c, rough = 0.85 }: { c: string; rough?: number }) => <meshStandardMaterial color={c} flatShading roughness={rough} />

function Bird({ body, breast, head, wing }: { body: string; breast: string; head: string; wing: string }) {
  return (
    <group>
      <mesh position={[0, 0.11, 0]} scale={[1.25, 0.95, 1]} castShadow>
        <icosahedronGeometry args={[0.1, 0]} />
        <M c={body} />
      </mesh>
      <mesh position={[0.07, 0.1, 0]} scale={[0.7, 0.8, 0.85]}>
        <icosahedronGeometry args={[0.09, 0]} />
        <M c={breast} />
      </mesh>
      <group name="head" position={[0.1, 0.2, 0]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.068, 0]} />
          <M c={head} />
        </mesh>
        <mesh position={[0.07, -0.005, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.018, 0.05, 4]} />
          <M c="#E8B04E" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.04, 0.02, 0.045 * s]}>
            <icosahedronGeometry args={[0.012, 0]} />
            <M c="#1B1F1C" rough={0.3} />
          </mesh>
        ))}
      </group>
      <mesh position={[-0.12, 0.14, 0]} rotation={[0, 0, 0.5]} scale={[1, 0.25, 0.6]}>
        <boxGeometry args={[0.12, 0.06, 0.1]} />
        <M c={wing} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.01, 0.12, 0.08 * s]} rotation={[0.3 * s, 0, 0.2]} scale={[1, 0.35, 0.3]}>
          <icosahedronGeometry args={[0.08, 0]} />
          <M c={wing} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.01, 0.03, 0.035 * s]}>
          <cylinderGeometry args={[0.006, 0.006, 0.06, 3]} />
          <M c="#C08A4A" />
        </mesh>
      ))}
    </group>
  )
}

function Duck() {
  return (
    <group>
      <mesh position={[0, 0.07, 0]} scale={[1.4, 0.8, 1]} castShadow>
        <icosahedronGeometry args={[0.13, 0]} />
        <M c="#F2EDE2" />
      </mesh>
      <mesh position={[-0.17, 0.11, 0]} rotation={[0, 0, 0.6]}>
        <coneGeometry args={[0.05, 0.1, 4]} />
        <M c="#E6DFD0" />
      </mesh>
      <group name="head" position={[0.14, 0.2, 0]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.075, 0]} />
          <M c="#3E7F5A" />
        </mesh>
        <mesh position={[0.08, -0.02, 0]} scale={[1.6, 0.5, 1]}>
          <boxGeometry args={[0.05, 0.03, 0.05]} />
          <M c="#E8A23E" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.04, 0.02, 0.05 * s]}>
            <icosahedronGeometry args={[0.012, 0]} />
            <M c="#1B1F1C" rough={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Frog() {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} scale={[1.3, 0.7, 1.1]} castShadow>
        <icosahedronGeometry args={[0.09, 0]} />
        <M c="#7FB36C" />
      </mesh>
      <group name="head" position={[0.06, 0.1, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[0, 0, 0.045 * s]}>
            <mesh>
              <icosahedronGeometry args={[0.03, 0]} />
              <M c="#8CC27A" />
            </mesh>
            <mesh position={[0.015, 0.01, 0]}>
              <icosahedronGeometry args={[0.014, 0]} />
              <M c="#1B1F1C" rough={0.3} />
            </mesh>
          </group>
        ))}
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.06, 0.03, 0.08 * s]} scale={[1.4, 0.5, 0.7]}>
          <icosahedronGeometry args={[0.04, 0]} />
          <M c="#6AA05A" />
        </mesh>
      ))}
    </group>
  )
}

function Hedgehog() {
  return (
    <group>
      <mesh position={[0, 0.08, 0]} scale={[1.35, 0.85, 1.05]} castShadow>
        <dodecahedronGeometry args={[0.11, 0]} />
        <M c="#8A6A4E" />
      </mesh>
      {/* Púas */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI - Math.PI / 2
        return (
          <mesh key={i} position={[-0.03 + Math.sin(a) * 0.06, 0.15 + Math.cos(a) * 0.02, Math.cos(a) * 0.07]} rotation={[Math.cos(a) * 0.8, 0, 0.6 + Math.sin(a) * 0.4]}>
            <coneGeometry args={[0.025, 0.08, 3]} />
            <M c="#6E5038" />
          </mesh>
        )
      })}
      <group name="head" position={[0.13, 0.07, 0]}>
        <mesh scale={[1.3, 0.9, 0.9]}>
          <coneGeometry args={[0.055, 0.12, 5]} />
          <M c="#E3CBA8" />
        </mesh>
      </group>
    </group>
  )
}

function Squirrel() {
  return (
    <group>
      <mesh position={[0, 0.1, 0]} scale={[1, 1.2, 0.9]} castShadow>
        <icosahedronGeometry args={[0.08, 0]} />
        <M c="#C46A32" />
      </mesh>
      {/* La cola, grande y curvada hacia arriba */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.09 - Math.sin(i * 0.6) * 0.04, 0.09 + i * 0.07, 0]} scale={1 - i * 0.08}>
          <icosahedronGeometry args={[0.065, 0]} />
          <M c={i % 2 ? '#D9813F' : '#C97538'} />
        </mesh>
      ))}
      <group name="head" position={[0.06, 0.21, 0]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.06, 0]} />
          <M c="#CF7438" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[-0.01, 0.06, 0.03 * s]}>
            <coneGeometry args={[0.016, 0.04, 3]} />
            <M c="#B85F2C" />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.04, 0.01, 0.035 * s]}>
            <icosahedronGeometry args={[0.011, 0]} />
            <M c="#1B1F1C" rough={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Fox() {
  return (
    <group>
      <mesh position={[0, 0.13, 0]} scale={[1.7, 0.85, 0.85]} castShadow>
        <icosahedronGeometry args={[0.09, 0]} />
        <M c="#D9783A" />
      </mesh>
      {[-1, 1].flatMap((s) =>
        [-1, 1].map((f) => (
          <mesh key={`${s}${f}`} position={[0.08 * f, 0.05, 0.04 * s]}>
            <cylinderGeometry args={[0.015, 0.012, 0.1, 4]} />
            <M c="#3A2A22" />
          </mesh>
        )),
      )}
      <mesh position={[-0.19, 0.15, 0]} rotation={[0, 0, 1.0]} scale={[0.8, 1.6, 0.8]}>
        <icosahedronGeometry args={[0.06, 0]} />
        <M c="#D9783A" />
      </mesh>
      <mesh position={[-0.27, 0.2, 0]}>
        <icosahedronGeometry args={[0.04, 0]} />
        <M c="#F6EFE6" />
      </mesh>
      <group name="head" position={[0.16, 0.21, 0]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.07, 0]} />
          <M c="#DE7E3E" />
        </mesh>
        <mesh position={[0.07, -0.02, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.035, 0.08, 4]} />
          <M c="#F6EFE6" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[-0.01, 0.07, 0.035 * s]}>
            <coneGeometry args={[0.025, 0.06, 3]} />
            <M c="#C9692F" />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.04, 0.02, 0.04 * s]}>
            <icosahedronGeometry args={[0.012, 0]} />
            <M c="#1B1F1C" rough={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

const SPECIES: Record<string, Species> = {
  robin: { gait: 'hop', speed: 0.55, hop: 0.07, scale: 0.85, model: () => <Bird body="#8A6A4E" breast="#E0743E" head="#8A6A4E" wing="#6E5440" /> },
  tit: { gait: 'hop', speed: 0.55, hop: 0.07, scale: 0.8, model: () => <Bird body="#7E9A5A" breast="#F0CF4E" head="#2A2A2A" wing="#5E7488" /> },
  duck: { gait: 'swim', speed: 0.12, scale: 0.85, model: () => <Duck /> },
  frog: { gait: 'hop', speed: 0.5, hop: 0.12, scale: 0.85, model: () => <Frog /> },
  hedgehog: { gait: 'walk', speed: 0.12, scale: 0.85, model: () => <Hedgehog /> },
  squirrel: { gait: 'hop', speed: 0.8, hop: 0.09, scale: 0.85, model: () => <Squirrel /> },
  fox: { gait: 'walk', speed: 0.3, scale: 0.9, model: () => <Fox /> },
}

/** Celdas libres de la isla donde puede ir un visitante. */
function freeCells(items: GardenItem[], plots: Plot[]): Array<[number, number]> {
  const taken = occupied(items)
  const cells: Array<[number, number]> = []
  for (const [tx, tz] of plots)
    for (let a = 0; a < CELLS_PER_TILE; a++)
      for (let b = 0; b < CELLS_PER_TILE; b++) {
        const x = tx * CELLS_PER_TILE + a
        const z = tz * CELLS_PER_TILE + b
        if (!taken.has(`${x},${z}`)) cells.push([x, z])
      }
  return cells
}

function Visitor({ id, items, plots }: { id: string; items: GardenItem[]; plots: Plot[] }) {
  const species = SPECIES[id]
  const ref = useRef<Group>(null)
  const pond = items.find((it) => it.kind === 'pond')
  const cells = useMemo(() => freeCells(items, plots), [items, plots])
  const rand = useMemo(() => {
    let s = hashString(id + dayKey())
    return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0) % 10000) / 10000
  }, [id])
  const pick = () => {
    const c = cells[Math.floor(rand() * cells.length)] ?? [0, 0]
    return { x: (c[0] + 0.5) * CELL, z: (c[1] + 0.5) * CELL }
  }
  const state = useRef<{ x: number; z: number; tx: number; tz: number; wait: number; heading: number; t: number; mode: 'idle' | 'move'; hopT: number } | null>(null)

  useFrame(({ clock }, delta) => {
    const g = ref.current
    if (!g || !species) return
    const dt = Math.min(delta, 0.05)
    if (!state.current) {
      const p = pick()
      state.current = { ...p, tx: p.x, tz: p.z, wait: 0.5 + rand() * 2, heading: rand() * Math.PI * 2, t: 0, mode: 'idle', hopT: 0 }
    }
    const s = state.current
    s.t += dt
    let y = GROUND_Y
    const head = g.getObjectByName('head')
    if (species.gait === 'swim' && pond) {
      // Da vueltas despacio por el estanque, meciéndose
      const [px, pz] = cellToWorld(pond.x, pond.z, 'pond')
      const a = clock.elapsedTime * 0.25 + (hashString(id) % 6)
      s.x = px + Math.cos(a) * 0.28
      s.z = pz + Math.sin(a) * 0.28
      s.heading = -a - Math.PI / 2
      y = GROUND_Y - 0.03 + Math.sin(clock.elapsedTime * 2) * 0.008
      if (head) head.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.12
    } else if (s.mode === 'idle') {
      s.wait -= dt
      // Quietos también están vivos: los pájaros picotean, los demás miran alrededor
      if (head) head.rotation.z = species.gait === 'hop' ? Math.max(0, Math.sin(s.t * 6)) * -0.6 * (Math.sin(s.t * 0.9) > 0.3 ? 1 : 0) : Math.sin(s.t * 0.8) * 0.15
      if (head) head.rotation.y = Math.sin(s.t * 0.5) * 0.4
      if (s.wait <= 0) {
        const p = pick()
        // Pasos cortos: no cruzan la isla de punta a punta
        const dx = p.x - s.x
        const dz = p.z - s.z
        const d = Math.hypot(dx, dz)
        const k = d > 1.2 ? 1.2 / d : 1
        s.tx = s.x + dx * k
        s.tz = s.z + dz * k
        s.mode = 'move'
        s.hopT = 0
      }
    } else {
      const dx = s.tx - s.x
      const dz = s.tz - s.z
      const d = Math.hypot(dx, dz)
      const target = Math.atan2(-dz, dx)
      // Gira hacia donde va con suavidad
      let diff = target - s.heading
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      s.heading += diff * Math.min(1, dt * 8)
      if (d < 0.02) {
        s.mode = 'idle'
        s.wait = 1.2 + rand() * 3.5
      } else {
        const step = Math.min(d, species.speed * dt)
        s.x += (dx / d) * step
        s.z += (dz / d) * step
        if (species.gait === 'hop') {
          s.hopT += dt * 3.2
          y = GROUND_Y + Math.abs(Math.sin(s.hopT * Math.PI)) * (species.hop ?? 0.06)
        } else {
          // Andar: un balanceo pequeño
          g.rotation.x = Math.sin(s.t * 10) * 0.04
        }
      }
      if (head) head.rotation.z = 0
    }
    g.position.set(s.x, y, s.z)
    g.rotation.y = s.heading
    visitorSpots.set(id, { x: s.x, z: s.z })
  })

  if (!species) return null
  return (
    // Un poco más grandes que en la realidad, como el resto de la isla: tienen que leerse de lejos
    <group ref={ref} scale={species.scale * 1.75}>
      {species.model()}
    </group>
  )
}

/** Los visitantes de hoy. Se montan dentro del grupo del jardín, así se mecen con la isla. */
export function Visitors({ plots }: { plots: Plot[] }) {
  const recent = useGrove((s) => s.recentVisitors)
  const items = useGrove((s) => s.items)
  const today = recent.day === dayKey() ? recent.ids : []
  return (
    <group>
      {today.map((id) => (
        <Visitor key={id} id={id} items={items} plots={plots} />
      ))}
    </group>
  )
}
