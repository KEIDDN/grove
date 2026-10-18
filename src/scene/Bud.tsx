import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { BufferGeometry, Color, Float32BufferAttribute, Group, MeshStandardMaterial } from 'three'

/**
 * El capullo del ánimo: una flor low poly que se abre con el nivel (0 cerrada, 1 abierta del todo).
 * Tres capas de pétalos que se abren a destiempo, el color pasa del lavanda al melocotón y, con el
 * ánimo bajo, la cabeza se inclina un poco: descansa, no se marchita. Todo va suavizado por
 * fotograma, así que deslizar se siente continuo.
 */

/** Pétalo facetado: ancho en el centro, punta afilada y curvado como una cuchara. */
function petalGeometry(length: number, width: number, cup: number) {
  const rows = 5
  const pos: number[] = []
  const ring = (t: number) => {
    const w = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.75) * width * (t < 0.15 ? 0.6 + t * 2.6 : 1)
    const y = t * length
    // Se curva hacia fuera al subir y hace cuenco a lo ancho
    const z = Math.sin(t * Math.PI * 0.8) * length * 0.12
    return [
      [-w, y, z + cup * w * w * 4],
      [0, y, z - cup * 0.06],
      [w, y, z + cup * w * w * 4],
    ]
  }
  for (let r = 0; r < rows; r++) {
    const a = ring(r / rows)
    const b = ring((r + 1) / rows)
    for (let c = 0; c < 2; c++) {
      pos.push(...a[c], ...b[c], ...a[c + 1])
      pos.push(...a[c + 1], ...b[c], ...b[c + 1])
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

const CLOSED = new Color('#ada4e3')
const OPEN = new Color('#f6b089')
const CLOSED_INNER = new Color('#d2cbf4')
const OPEN_INNER = new Color('#ffd9bf')

const LAYERS = [
  { count: 5, length: 0.62, width: 0.2, closed: 0.12, open: 0.55, delay: 0.25, inner: true, offset: 0 },
  { count: 5, length: 0.78, width: 0.25, closed: 0.18, open: 1.0, delay: 0.1, inner: false, offset: Math.PI / 5 },
  { count: 7, length: 0.86, width: 0.24, closed: 0.26, open: 1.38, delay: 0, inner: false, offset: 0.2 },
]

const ease = (x: number) => x * x * (3 - 2 * x)

function Flower({ value }: { value: number }) {
  const head = useRef<Group>(null)
  const petals = useRef<Group[][]>(LAYERS.map(() => []))
  const shown = useRef(value)
  const materials = useMemo(
    () => LAYERS.map((l) => new MeshStandardMaterial({ flatShading: true, roughness: 0.65, metalness: 0, color: l.inner ? CLOSED_INNER.clone() : CLOSED.clone() })),
    [],
  )
  const geos = useMemo(() => LAYERS.map((l) => petalGeometry(l.length, l.width, 0.9)), [])
  const leafGeo = useMemo(() => petalGeometry(0.7, 0.2, 0.5), [])
  const center = useRef<Group>(null)

  useFrame(({ clock }, delta) => {
    // Muelle exponencial: sigue al dedo sin saltos y se asienta solo
    shown.current += (value - shown.current) * (1 - Math.exp(-delta * 7))
    const v = shown.current
    LAYERS.forEach((l, li) => {
      const t = ease(Math.min(1, Math.max(0, (v - l.delay) / (1 - l.delay))))
      const tilt = l.closed + (l.open - l.closed) * t
      petals.current[li].forEach((p) => p && (p.rotation.x = tilt))
      const mat = materials[li]
      mat.color.copy(l.inner ? CLOSED_INNER : CLOSED).lerp(l.inner ? OPEN_INNER : OPEN, ease(v))
      mat.emissive.copy(mat.color).multiplyScalar(0.08 + v * 0.12)
    })
    if (head.current) {
      const time = clock.elapsedTime
      // Con el ánimo bajo la cabeza se inclina; siempre se mece un poco
      head.current.rotation.x = (1 - v) * 0.38 + Math.sin(time * 0.9) * 0.025
      head.current.rotation.z = Math.sin(time * 0.7) * 0.03
      head.current.rotation.y = time * 0.12
    }
    if (center.current) center.current.scale.setScalar(0.4 + ease(v) * 0.7)
  })

  return (
    <group position={[0, -1.05, 0]}>
      {/* Tallo y hojas */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 1.1, 5]} />
        <meshStandardMaterial color="#6f9f6a" flatShading roughness={0.8} />
      </mesh>
      <mesh geometry={leafGeo} position={[0, 0.35, 0]} rotation={[1.0, 0.4, 0]}>
        <meshStandardMaterial color="#86b77a" flatShading roughness={0.8} side={2} />
      </mesh>
      <mesh geometry={leafGeo} position={[0, 0.55, 0]} rotation={[1.1, 0.4 + Math.PI, 0]} scale={0.8}>
        <meshStandardMaterial color="#7aae70" flatShading roughness={0.8} side={2} />
      </mesh>
      <group ref={head} position={[0, 1.1, 0]}>
        {/* Cáliz */}
        <mesh position={[0, 0.02, 0]}>
          <coneGeometry args={[0.13, 0.16, 6]} />
          <meshStandardMaterial color="#6f9f6a" flatShading roughness={0.8} />
        </mesh>
        {LAYERS.map((l, li) =>
          Array.from({ length: l.count }, (_, i) => (
            <group key={`${li}-${i}`} rotation={[0, (i / l.count) * Math.PI * 2 + l.offset, 0]}>
              <group ref={(g) => void (g && (petals.current[li][i] = g))} position={[0, 0.06, 0]}>
                <mesh geometry={geos[li]} material={materials[li]} material-side={2} />
              </group>
            </group>
          )),
        )}
        <group ref={center} position={[0, 0.16, 0]}>
          <mesh>
            <icosahedronGeometry args={[0.1, 0]} />
            <meshStandardMaterial color="#f6c66e" flatShading roughness={0.5} emissive="#f2b24a" emissiveIntensity={0.25} />
          </mesh>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[Math.cos((i / 7) * Math.PI * 2) * 0.1, 0.06, Math.sin((i / 7) * Math.PI * 2) * 0.1]}>
              <icosahedronGeometry args={[0.022, 0]} />
              <meshStandardMaterial color="#fbe3a0" flatShading />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

/** `value` de 0 a 1. */
export function Bud({ value, height = 230 }: { value: number; height?: number }) {
  return (
    <div style={{ height, width: '100%' }} aria-hidden="true">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.75, 3.9], fov: 32 }} gl={{ antialias: true, alpha: true }} onCreated={({ camera }) => camera.lookAt(0, 0.12, 0)}>
        <hemisphereLight args={['#fff4ea', '#c9b8e8', 1.1]} />
        <directionalLight position={[2.5, 3.5, 2.5]} intensity={1.5} color="#fff1e2" />
        <directionalLight position={[-2.5, 1.2, -2]} intensity={0.6} color="#d7cbff" />
        <Flower value={value} />
      </Canvas>
    </div>
  )
}
