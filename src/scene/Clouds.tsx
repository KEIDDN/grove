import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { IcosahedronGeometry, type Group } from 'three'
import { jitter } from './lowpoly'

function Cloud({ position, scale, seed }: { position: [number, number, number]; scale: number; seed: number }) {
  const ref = useRef<Group>(null)
  const puffs = useMemo(
    () =>
      [
        { r: 0.32, p: [0, 0, 0] },
        { r: 0.24, p: [0.36, -0.06, 0.05] },
        { r: 0.22, p: [-0.34, -0.07, -0.02] },
        { r: 0.18, p: [0.12, 0.14, -0.08] },
      ].map((b, i) => ({ geo: jitter(new IcosahedronGeometry(b.r, 1), b.r * 0.12, seed + i), p: b.p as [number, number, number] })),
    [seed],
  )
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * 0.12 + seed
    ref.current.position.x = position[0] + Math.sin(t) * 0.5
    ref.current.position.y = position[1] + Math.sin(t * 1.7) * 0.06
  })
  return (
    <group ref={ref} position={position} scale={[scale, scale * 0.72, scale]}>
      {puffs.map(({ geo, p }, i) => (
        <mesh key={i} geometry={geo} position={p}>
          <meshStandardMaterial color="#FFFFFF" flatShading roughness={1} emissive="#FFFFFF" emissiveIntensity={0.08} />
        </mesh>
      ))}
    </group>
  )
}

/** Dos nubes que flotan por detrás del jardín. */
export function Clouds({ size }: { size: number }) {
  const s = size / 3
  return (
    <group>
      <Cloud position={[-2.1 * s, 1.2, -0.6 * s]} scale={0.75 * Math.sqrt(s)} seed={5} />
      <Cloud position={[0.6 * s, 1.7, -2.3 * s]} scale={0.6 * Math.sqrt(s)} seed={17} />
    </group>
  )
}
