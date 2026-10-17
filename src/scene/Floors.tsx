import { useMemo } from 'react'
import { CylinderGeometry } from 'three'
import { CELL } from '../game/garden'
import { FLOORS, type FloorKind } from '../game/floors'
import { GROUND_Y } from './Island'
import { hashString, jitter, pick, seeded } from './lowpoly'

const BY_ID = Object.fromEntries(FLOORS.map((f) => [f.id, f])) as Record<FloorKind, (typeof FLOORS)[number]>

function Slab({ color, h = 0.025 }: { color: string; h?: number }) {
  return (
    <mesh position={[0, h / 2, 0]} receiveShadow>
      <boxGeometry args={[CELL, h, CELL]} />
      <meshStandardMaterial color={color} flatShading roughness={0.95} />
    </mesh>
  )
}

/** Losas de piedra irregulares sobre una base de tierra clara. */
function StonePath({ seed, colors }: { seed: number; colors: string[] }) {
  const stones = useMemo(() => {
    const rand = seeded(seed)
    const offs: Array<[number, number, number]> = [
      [-0.11, -0.11, 0.1],
      [0.11, -0.1, 0.095],
      [-0.1, 0.11, 0.095],
      [0.11, 0.11, 0.1],
    ]
    return offs.map(([x, z, r], i) => ({
      x: x + (rand() - 0.5) * 0.03,
      z: z + (rand() - 0.5) * 0.03,
      geo: jitter(new CylinderGeometry(r, r, 0.03, 6), 0.012, seed + i),
      color: pick(colors, seed + i),
    }))
  }, [seed, colors])
  return (
    <group>
      <Slab color="#BFB49E" h={0.012} />
      {stones.map((s, i) => (
        <mesh key={i} geometry={s.geo} position={[s.x, 0.02, s.z]} rotation={[0, i, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={s.color} flatShading roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

function Deck({ colors }: { colors: string[] }) {
  return (
    <group>
      {[-0.1875, -0.0625, 0.0625, 0.1875].map((z, i) => (
        <mesh key={z} position={[0, 0.02, z]} castShadow receiveShadow>
          <boxGeometry args={[CELL - 0.01, 0.04, 0.118]} />
          <meshStandardMaterial color={colors[i % colors.length]} flatShading roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function Moss({ seed, colors }: { seed: number; colors: string[] }) {
  const bumps = useMemo(() => {
    const rand = seeded(seed)
    return Array.from({ length: 3 }, (_, i) => ({ x: (rand() - 0.5) * 0.3, z: (rand() - 0.5) * 0.3, r: 0.07 + rand() * 0.05, color: pick(colors, seed + i) }))
  }, [seed, colors])
  return (
    <group>
      <Slab color={colors[0]} h={0.03} />
      {bumps.map((b, i) => (
        <mesh key={i} position={[b.x, 0.03, b.z]} scale={[1, 0.4, 1]} castShadow>
          <icosahedronGeometry args={[b.r, 0]} />
          <meshStandardMaterial color={b.color} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

function FloorCell({ kind, x, z, size }: { kind: FloorKind; x: number; z: number; size: number }) {
  const style = BY_ID[kind]
  const seed = hashString(`${x},${z}`)
  const wx = (x + 0.5) * CELL - size / 2
  const wz = (z + 0.5) * CELL - size / 2
  return (
    <group position={[wx, GROUND_Y, wz]}>
      {kind === 'path' && <StonePath seed={seed} colors={style.colors} />}
      {kind === 'deck' && <Deck colors={style.colors} />}
      {kind === 'moss' && <Moss seed={seed} colors={style.colors} />}
      {(kind === 'gravel' || kind === 'sand') && <Slab color={pick(style.colors, seed)} />}
    </group>
  )
}

export function Floors({ floors, size }: { floors: Record<string, FloorKind>; size: number }) {
  const cells = size * 2
  return (
    <group>
      {Object.entries(floors).map(([key, kind]) => {
        const [x, z] = key.split(',').map(Number)
        if (x >= cells || z >= cells) return null
        return <FloorCell key={key} kind={kind} x={x} z={z} size={size} />
      })}
    </group>
  )
}
