import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, Object3D, type Group, type InstancedMesh, type Mesh } from 'three'
import type { SeasonTheme } from '../game/seasons'
import { seeded } from './lowpoly'

const WING_COLORS = ['#F4B6C8', '#F0CF6E', '#B9A5DB', '#FFFFFF']

/** Una mariposa que revolotea siguiendo una curva suave sobre el jardín. */
function Butterfly({ seed, radius, color }: { seed: number; radius: number; color: string }) {
  const body = useRef<Group>(null)
  const left = useRef<Mesh>(null)
  const right = useRef<Mesh>(null)
  const phase = seed * 1.7
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.35 + phase
    if (!body.current) return
    const x = Math.sin(t) * radius * 0.6 + Math.sin(t * 2.3) * 0.25
    const z = Math.cos(t * 0.8) * radius * 0.6
    const y = 0.6 + Math.sin(t * 3.1) * 0.18
    const prev = body.current.position.clone()
    body.current.position.set(x, y, z)
    body.current.lookAt(prev.lerp(body.current.position, 2))
    const flap = Math.sin(clock.elapsedTime * 18 + phase) * 1.1
    if (left.current) left.current.rotation.z = 0.2 + flap
    if (right.current) right.current.rotation.z = -0.2 - flap
  })
  return (
    <group ref={body} scale={0.9}>
      <mesh ref={left} position={[0, 0, 0]}>
        <planeGeometry args={[0.07, 0.05]} />
        <meshStandardMaterial color={color} side={DoubleSide} flatShading />
      </mesh>
      <mesh ref={right} position={[0, 0, 0]}>
        <planeGeometry args={[0.07, 0.05]} />
        <meshStandardMaterial color={color} side={DoubleSide} flatShading />
      </mesh>
    </group>
  )
}

/** Luciérnagas: puntitos que brillan y se apagan despacio por la noche. */
function Fireflies({ size, night }: { size: number; night: number }) {
  const ref = useRef<InstancedMesh>(null)
  const count = 18
  const dummy = useMemo(() => new Object3D(), [])
  const flies = useMemo(() => {
    const rand = seeded(99)
    return Array.from({ length: count }, () => ({ x: (rand() - 0.5) * size, z: (rand() - 0.5) * size, y: 0.15 + rand() * 0.6, p: rand() * 10 }))
  }, [size])
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    const t = clock.elapsedTime
    flies.forEach((f, i) => {
      const blink = Math.max(0, Math.sin(t * 1.3 + f.p)) * night
      dummy.position.set(f.x + Math.sin(t * 0.4 + f.p) * 0.3, f.y + Math.sin(t * 0.9 + f.p) * 0.1, f.z + Math.cos(t * 0.35 + f.p) * 0.3)
      dummy.scale.setScalar(night > 0 ? 0.4 + blink : 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <icosahedronGeometry args={[0.02, 0]} />
      <meshStandardMaterial color="#FFF2A8" emissive="#FFE46B" emissiveIntensity={3} toneMapped={false} />
    </instancedMesh>
  )
}

/** Vida ambiental según la estación y la hora. Todo queda montado y solo se oculta, para no recompilar shaders. */
export function Life({ theme, size, night }: { theme: SeasonTheme; size: number; night: number }) {
  const warm = theme.particleKind === 'petal' || theme.particleKind === 'pollen'
  const day = night < 0.4
  return (
    <group>
      <group visible={warm && day}>
        {[0, 1, 2].map((i) => (
          <Butterfly key={i} seed={i + 1} radius={size * 0.7} color={WING_COLORS[i % WING_COLORS.length]} />
        ))}
      </group>
      <Fireflies size={size} night={theme.particleKind === 'snow' ? 0 : Math.max(0, night - 0.3) / 0.7} />
    </group>
  )
}
