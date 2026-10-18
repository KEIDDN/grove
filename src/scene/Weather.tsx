import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, CanvasTexture, IcosahedronGeometry, MeshBasicMaterial, Object3D, SpriteMaterial, type InstancedMesh, type Sprite } from 'three'
import { useGrove, useSeason } from '../game/store'
import { weatherAt, type Weather } from '../game/weather'
import { seeded } from './lowpoly'

const COARSE = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const DROPS = COARSE ? 220 : 320
const FLAKES = COARSE ? 120 : 180
const MISTS = 9

/** El tiempo ahora: el real del día o el fijado en el modo desarrollador. Se revisa cada minuto. */
export function useWeather(): Weather {
  const override = useGrove((s) => s.weatherOverride)
  const season = useSeason()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  return override ?? weatherAt(now, season)
}

/** Sube o baja una intensidad (0–1) poco a poco: el clima entra y se va con calma. */
function useFade(on: boolean, seconds = 2.5) {
  const v = useRef(0)
  useFrame((_, delta) => {
    v.current += ((on ? 1 : 0) - v.current) * Math.min(1, delta / seconds * 2.2)
  })
  return v
}

/**
 * Lluvia fina, nieve o niebla, siempre sutiles: no tapan la isla. Las tres capas están siempre
 * montadas y entran y salen con un fundido, así el cambio de tiempo nunca es brusco.
 */
export function WeatherLayer({ weather, spread }: { weather: Weather; spread: number }) {
  return (
    <group>
      <Rain on={weather === 'rain'} spread={spread} />
      <Snow on={weather === 'snow'} spread={spread} />
      <Mist on={weather === 'fog'} spread={spread} />
    </group>
  )
}

function Rain({ on, spread }: { on: boolean; spread: number }) {
  const ref = useRef<InstancedMesh>(null)
  const fade = useFade(on)
  const dummy = useMemo(() => new Object3D(), [])
  const geo = useMemo(() => new BoxGeometry(0.011, 0.42, 0.011), [])
  const mat = useMemo(() => new MeshBasicMaterial({ color: '#8fa3be', transparent: true, opacity: 0, depthWrite: false }), [])
  const drops = useMemo(() => {
    const rand = seeded(7)
    const reach = spread * 1.2 + 5
    return Array.from({ length: DROPS }, () => ({ x: (rand() - 0.5) * reach * 2, z: (rand() - 0.5) * reach * 2, y: rand() * 9 - 3, speed: 6 + rand() * 3 }))
  }, [spread])
  useFrame((_, delta) => {
    const mesh = ref.current
    if (!mesh) return
    mat.opacity = fade.current * 0.5
    mesh.visible = fade.current > 0.01
    if (!mesh.visible) return
    drops.forEach((d, i) => {
      d.y -= d.speed * delta
      if (d.y < -3.5) d.y = 6
      // Un poco inclinada, como si hubiera una brisa
      dummy.position.set(d.x + d.y * 0.06, d.y, d.z)
      dummy.rotation.set(0, 0, 0.06)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, DROPS]} frustumCulled={false} />
}

function Snow({ on, spread }: { on: boolean; spread: number }) {
  const ref = useRef<InstancedMesh>(null)
  const fade = useFade(on, 3)
  const dummy = useMemo(() => new Object3D(), [])
  const geo = useMemo(() => new IcosahedronGeometry(0.03, 0), [])
  const mat = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }), [])
  const flakes = useMemo(() => {
    const rand = seeded(13)
    const reach = spread * 0.9 + 3
    return Array.from({ length: FLAKES }, () => ({ x: (rand() - 0.5) * reach * 2, z: (rand() - 0.5) * reach * 2, y: rand() * 7 - 2, speed: 0.35 + rand() * 0.35, drift: rand() * Math.PI * 2, s: 0.6 + rand() * 0.9 }))
  }, [spread])
  useFrame(({ clock }, delta) => {
    const mesh = ref.current
    if (!mesh) return
    mat.opacity = fade.current * 0.9
    mesh.visible = fade.current > 0.01
    if (!mesh.visible) return
    const t = clock.elapsedTime
    flakes.forEach((f, i) => {
      f.y -= f.speed * delta
      if (f.y < -2.2) f.y = 5
      dummy.position.set(f.x + Math.sin(t * 0.6 + f.drift) * 0.35, f.y, f.z + Math.cos(t * 0.5 + f.drift) * 0.3)
      dummy.scale.setScalar(f.s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, FLAKES]} frustumCulled={false} />
}

/** Bancos de niebla suaves a la altura de la base de la isla, que derivan muy despacio. */
function Mist({ on, spread }: { on: boolean; spread: number }) {
  const fade = useFade(on, 3.5)
  const refs = useRef<Array<Sprite | null>>([])
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.5, 'rgba(255,255,255,0.45)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
    return new CanvasTexture(c)
  }, [])
  const mats = useMemo(() => Array.from({ length: MISTS }, () => new SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, color: '#f4f1ec' })), [texture])
  const banks = useMemo(() => {
    const rand = seeded(29)
    return Array.from({ length: MISTS }, (_, i) => {
      const a = (i / MISTS) * Math.PI * 2 + rand() * 0.4
      const d = spread * 0.55 + 0.6 + rand() * 1.6
      return { a, d, y: -1.1 + rand() * 1.1, s: 3.2 + rand() * 2.6, speed: 0.02 + rand() * 0.03 }
    })
  }, [spread])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    banks.forEach((b, i) => {
      const sp = refs.current[i]
      if (!sp) return
      const a = b.a + t * b.speed
      sp.position.set(Math.cos(a) * b.d, b.y + Math.sin(t * 0.2 + i) * 0.08, Math.sin(a) * b.d)
      sp.scale.set(b.s * 1.6, b.s * 0.7, 1)
      mats[i].opacity = fade.current * 0.75
      sp.visible = fade.current > 0.01
    })
  })
  return (
    <group>
      {banks.map((_, i) => (
        <sprite key={i} ref={(s) => void (refs.current[i] = s)} material={mats[i]} />
      ))}
    </group>
  )
}
