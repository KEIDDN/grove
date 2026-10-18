import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, IcosahedronGeometry, Object3D, type Group, type InstancedMesh } from 'three'
import { mix } from '../game/daylight'
import { useGrove } from '../game/store'
import { jitter, seeded } from './lowpoly'

const COARSE = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const COUNT = COARSE ? 110 : 170

/**
 * Mar de nubes bajo la isla: bolas low poly aplastadas en un anillo ancho que gira muy despacio.
 * Toman el color del horizonte (blancas de día, melocotón al atardecer, azuladas de noche) y la
 * niebla del cielo funde las lejanas con el fondo, así el jardín parece flotar sobre ellas.
 */
export function CloudSea({ size, skyBottom, night }: { size: number; skyBottom: string; night: number }) {
  const ref = useRef<InstancedMesh>(null)
  const group = useRef<Group>(null)
  const geo = useMemo(() => jitter(new IcosahedronGeometry(1, 1), 0.12, 31), [])

  // Muy por debajo de la isla, para que se vea que flota alto, y hasta el horizonte
  const puffs = useMemo(() => {
    const rand = seeded(91)
    const reach = 11 + size
    return Array.from({ length: COUNT }, () => {
      const a = rand() * Math.PI * 2
      const d = Math.sqrt(rand()) * reach
      const s = 0.45 + rand() * 0.65
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, y: -5.6 - rand() * 0.5, s, bob: rand() * Math.PI * 2 }
    })
  }, [size])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    puffs.forEach((p, i) => {
      o.position.set(p.x, p.y, p.z)
      o.scale.set(p.s, p.s * 0.45, p.s)
      o.rotation.set(0, p.bob, 0)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [puffs])

  // Deriva lentísima: se nota que está vivo, nunca distrae. Con un panel abierto el jardín se
  // aleja y las nubes llenarían la pantalla, así que bajan hasta quedar casi fuera de la vista.
  const sink = useRef(0)
  useFrame(({ clock }, delta) => {
    const g = group.current
    if (!g) return
    const s = useGrove.getState()
    const away = !s.splash && !s.restMode && s.onboarded && s.tab !== 'garden'
    sink.current += ((away ? -4 : 0) - sink.current) * (1 - Math.exp(-delta * 3))
    g.rotation.y = clock.elapsedTime * 0.006
    g.position.y = sink.current + Math.sin(clock.elapsedTime * 0.25) * 0.05
  })

  const color = useMemo(() => new Color(mix('#FFFFFF', skyBottom, 0.3 + night * 0.4)), [skyBottom, night])
  const glow = useMemo(() => new Color(mix('#FFFFFF', skyBottom, 0.5)), [skyBottom])

  return (
    <group ref={group}>
      <instancedMesh ref={ref} args={[geo, undefined, COUNT]} frustumCulled={false}>
        <meshStandardMaterial color={color} emissive={glow} emissiveIntensity={0.18 + (1 - night) * 0.12} flatShading roughness={1} />
      </instancedMesh>
    </group>
  )
}
