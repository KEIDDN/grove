import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, type InstancedMesh } from 'three'
import type { SeasonTheme } from '../game/seasons'
import { seeded } from './lowpoly'

const COUNT = 36

/** Pétalos, polen, hojas o nieve según la estación. Pocas y lentas, para no distraer. */
export function Particles({ theme, spread }: { theme: SeasonTheme; spread: number }) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const seeds = useMemo(() => {
    const rand = seeded(42)
    return Array.from({ length: COUNT }, () => ({
      x: (rand() - 0.5) * spread * 1.6,
      z: (rand() - 0.5) * spread * 1.6,
      y: rand() * 4,
      speed: 0.12 + rand() * 0.18,
      drift: rand() * Math.PI * 2,
      spin: (rand() - 0.5) * 2,
    }))
  }, [spread])

  const rising = theme.particleKind === 'pollen'

  useFrame(({ clock }, delta) => {
    const mesh = ref.current
    if (!mesh) return
    const t = clock.elapsedTime
    seeds.forEach((p, i) => {
      p.y += (rising ? 1 : -1) * p.speed * delta
      if (p.y < -1.5) p.y = 3.2
      if (p.y > 3.2) p.y = -1.5
      dummy.position.set(p.x + Math.sin(t * 0.5 + p.drift) * 0.4, p.y, p.z + Math.cos(t * 0.4 + p.drift) * 0.3)
      dummy.rotation.set(t * p.spin, t * p.spin * 0.7, 0)
      dummy.scale.setScalar(theme.particleKind === 'snow' || rising ? 0.6 : 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]}>
      {theme.particleKind === 'snow' || rising ? <icosahedronGeometry args={[0.035, 0]} /> : <planeGeometry args={[0.08, 0.05]} />}
      <meshStandardMaterial
        color={theme.particle}
        flatShading
        side={2}
        emissive={rising ? theme.particle : '#000000'}
        emissiveIntensity={rising ? 0.8 : 0}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  )
}
