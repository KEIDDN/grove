import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, type Group, type Mesh } from 'three'
import { Html } from '@react-three/drei'
import { CELL, cellToWorld, footprint, type GardenItem, type Growth, type ItemKind } from '../game/garden'
import { useGrove } from '../game/store'
import { paletteFor } from '../game/variants'
import type { SeasonTheme } from '../game/seasons'
import { GROUND_Y } from './Island'
import { hashString, jitter, pick, seeded } from './lowpoly'
import { Model, MODEL_KINDS, paintFor } from './models'
import { useDaylight } from './useDaylight'

/** Lo vivo: se sacude al tocarlo y suelta hojas. */
const ORGANIC: ItemKind[] = ['tree', 'pine', 'birch', 'willow', 'roundtree', 'cherry', 'tallpine', 'palm', 'bush', 'berrybush', 'fern', 'flower', 'tulips', 'reeds', 'wheat', 'tallgrass', 'corn', 'cactus']
/** Altura (en el mundo) de la copa, de donde caen las hojas al tocar. */
const CANOPY: Partial<Record<ItemKind, number>> = { tree: 1.35, birch: 1.45, willow: 1.15, roundtree: 1.3, cherry: 1.35, palm: 1.5, pine: 1.1, tallpine: 1.5, bush: 0.5, berrybush: 0.5 }

/** Escala global de los objetos respecto a la casilla. */
const ITEM_SCALE = 1.3
const STEM = '#6E9A5A'
const WATER = '#4DB3B0'

interface PartProps {
  theme: SeasonTheme
  seed: number
  /** Tonos de la variante elegida; si no hay, se usan los de la estación. */
  palette?: string[]
}

/** Material plano común a todo el jardín. */
function Mat({ color, emissive, doubleSide }: { color: string; emissive?: string; doubleSide?: boolean }) {
  return (
    <meshStandardMaterial
      color={color}
      flatShading
      roughness={0.88}
      side={doubleSide ? DoubleSide : undefined}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissive ? 0.9 : 0}
    />
  )
}

/** Balanceo suave, como si hubiera brisa. */
function Sway({ seed, strength = 0.035, children }: { seed: number; strength?: number; children: ReactNode }) {
  const ref = useRef<Group>(null)
  const phase = (seed % 1000) / 160
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * 0.9 + phase
    ref.current.rotation.z = Math.sin(t) * strength
    ref.current.rotation.x = Math.cos(t * 0.8) * strength * 0.6
  })
  return <group ref={ref}>{children}</group>
}

/** Disco facetado: anillos concéntricos con un poco de ruido para el agua. */
function discGeometry(radius: number, rings: number, segments: number, seed: number, wobble: number) {
  const rand = seeded(seed)
  const edge = Array.from({ length: segments }, () => 1 + (rand() - 0.5) * wobble)
  const point = (ring: number, s: number): [number, number, number] => {
    if (ring === 0) return [0, 0, 0]
    const a = ((s % segments) / segments) * Math.PI * 2
    const r = (ring / rings) * radius * edge[s % segments]
    return [Math.cos(a) * r, ring === rings ? 0 : (rand() - 0.5) * 0.012, Math.sin(a) * r]
  }
  const grid: Array<Array<[number, number, number]>> = []
  for (let ring = 0; ring <= rings; ring++) {
    grid.push(Array.from({ length: segments }, (_, s) => point(ring, s)))
  }
  const verts: number[] = []
  for (let ring = 0; ring < rings; ring++) {
    for (let s = 0; s < segments; s++) {
      const a = grid[ring][s]
      const b = grid[ring][(s + 1) % segments]
      const c = grid[ring + 1][s]
      const d = grid[ring + 1][(s + 1) % segments]
      if (ring === 0) verts.push(...a, ...d, ...c)
      else verts.push(...a, ...d, ...c, ...a, ...b, ...d)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(verts, 3))
  g.computeVertexNormals()
  return g
}

function Pond({ seed, theme }: PartProps) {
  const water = useMemo(() => discGeometry(0.4, 3, 12, seed, 0.18), [seed])
  const waterRef = useRef<Mesh>(null)
  const base = useMemo(() => Float32Array.from(water.attributes.position.array), [water])
  // Ondas suaves: cada vértice sube y baja según su posición (el borde queda fijo)
  useFrame(({ clock }) => {
    const mesh = waterRef.current
    if (!mesh) return
    const pos = mesh.geometry.attributes.position
    const t = clock.elapsedTime
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]
      const z = base[i * 3 + 2]
      const r = Math.hypot(x, z)
      const edge = Math.max(0, 1 - r / 0.36)
      pos.setY(i, base[i * 3 + 1] + Math.sin(t * 1.4 + x * 14 + z * 9) * 0.01 * edge)
    }
    pos.needsUpdate = true
    mesh.geometry.computeVertexNormals()
  })
  const bank = useMemo(() => discGeometry(0.46, 1, 12, seed, 0.18), [seed])
  const frozen = theme.particleKind === 'snow'
  const pads = useMemo(() => {
    const rand = seeded(seed + 3)
    return Array.from({ length: 3 }, (_, k) => {
      const a = rand() * Math.PI * 2
      const r = 0.1 + rand() * 0.17
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.045 + rand() * 0.025, flower: k === 0 }
    })
  }, [seed])
  return (
    <group scale={1 / ITEM_SCALE}>
      <mesh geometry={bank} position={[0, 0.006, 0]} receiveShadow>
        <Mat color="#8F6E4E" />
      </mesh>
      <mesh ref={waterRef} geometry={water} position={[0, 0.016, 0]} receiveShadow>
        <meshStandardMaterial color={frozen ? '#CFE4EC' : WATER} flatShading roughness={0.25} metalness={0.1} />
      </mesh>
      {!frozen &&
        pads.map((p, i) => (
          <group key={i} position={[p.x, 0.022, p.z]}>
            <mesh>
              <cylinderGeometry args={[p.s, p.s, 0.006, 7]} />
              <Mat color="#6FAF5A" />
            </mesh>
            {p.flower && (
              <mesh position={[0, 0.016, 0]}>
                <dodecahedronGeometry args={[0.02, 0]} />
                <Mat color="#F2A7C3" />
              </mesh>
            )}
          </group>
        ))}
    </group>
  )
}

function Sapling({ theme, seed }: PartProps) {
  return (
    <Sway seed={seed} strength={0.08}>
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.02, 0.28, 4]} />
        <Mat color={STEM} />
      </mesh>
      <mesh position={[-0.07, 0.24, 0]} rotation={[0, 0, 0.9]} scale={[1, 0.45, 0.7]} castShadow>
        <tetrahedronGeometry args={[0.1, 0]} />
        <Mat color={pick(theme.leaf, seed)} />
      </mesh>
      <mesh position={[0.07, 0.3, 0]} rotation={[0, 0, -0.9]} scale={[1, 0.45, 0.7]} castShadow>
        <tetrahedronGeometry args={[0.09, 0]} />
        <Mat color={pick(theme.leaf, seed + 1)} />
      </mesh>
    </Sway>
  )
}

function Lantern({ palette }: PartProps) {
  const light = palette?.[0] ?? '#F6C766'
  const { night } = useDaylight()
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.05, 0.6, 0.05]} />
        <Mat color="#5E4A3A" />
      </mesh>
      <mesh position={[0, 0.66, 0]}>
        <boxGeometry args={[0.18, 0.18, 0.18]} />
        <meshStandardMaterial color={light} emissive={light} emissiveIntensity={0.6 + night * 2.4} flatShading toneMapped />
      </mesh>
      {/* La luz está siempre montada (apagada de día): añadir o quitar luces obliga a recompilar todos los materiales */}
      <pointLight position={[0, 0.66, 0]} color={light} intensity={night > 0.3 ? night * 1.2 : 0} distance={1.6} decay={1.6} />
      <mesh position={[0, 0.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.17, 0.12, 4]} />
        <Mat color="#3E3128" />
      </mesh>
    </group>
  )
}


const WOOD = ['#B98A5E', '#9C7149']

/** Banco de jardín de tablas. */
function Bench({ palette = WOOD }: PartProps) {
  const [wood, dark] = palette
  return (
    <group>
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.07, 0]} castShadow>
          <boxGeometry args={[0.04, 0.14, 0.16]} />
          <Mat color={dark} />
        </mesh>
      ))}
      {[-0.05, 0, 0.05].map((z) => (
        <mesh key={z} position={[0, 0.15, z]} castShadow receiveShadow>
          <boxGeometry args={[0.46, 0.025, 0.042]} />
          <Mat color={wood} />
        </mesh>
      ))}
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.22, -0.075]} castShadow>
          <boxGeometry args={[0.035, 0.16, 0.03]} />
          <Mat color={dark} />
        </mesh>
      ))}
      {[0.22, 0.28].map((y) => (
        <mesh key={y} position={[0, y, -0.08]} castShadow>
          <boxGeometry args={[0.46, 0.035, 0.02]} />
          <Mat color={wood} />
        </mesh>
      ))}
    </group>
  )
}

function Birdhouse({ palette = WOOD }: PartProps) {
  const [wood, dark] = palette
  return (
    <group>
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[0.04, 0.48, 0.04]} />
        <Mat color="#7A5640" />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <boxGeometry args={[0.18, 0.2, 0.16]} />
        <Mat color={wood} />
      </mesh>
      <mesh position={[0, 0.72, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.17, 0.13, 4]} />
        <Mat color={dark} />
      </mesh>
      <mesh position={[0, 0.6, 0.081]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.005, 8]} />
        <Mat color="#3A2C22" />
      </mesh>
      <mesh position={[0, 0.54, 0.1]}>
        <boxGeometry args={[0.012, 0.012, 0.05]} />
        <Mat color={dark} />
      </mesh>
    </group>
  )
}

function Tulips({ seed, palette }: PartProps) {
  const color = palette?.[0] ?? '#E0605A'
  const stems = useMemo(() => {
    const rand = seeded(seed)
    return Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * Math.PI * 2 + rand()
      const r = k === 0 ? 0 : 0.09
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: 0.22 + rand() * 0.08 }
    })
  }, [seed])
  return (
    <Sway seed={seed} strength={0.05}>
      {stems.map((st, i) => (
        <group key={i} position={[st.x, 0, st.z]}>
          <mesh position={[0, st.h / 2, 0]}>
            <cylinderGeometry args={[0.01, 0.012, st.h, 4]} />
            <Mat color={STEM} />
          </mesh>
          <mesh position={[0.03, 0.06, 0]} rotation={[0, 0, -0.5]} scale={[0.5, 1, 0.3]}>
            <coneGeometry args={[0.05, 0.16, 3]} />
            <Mat color="#7FB36C" />
          </mesh>
          <mesh position={[0, st.h + 0.035, 0]} rotation={[Math.PI, 0, 0]} castShadow>
            <coneGeometry args={[0.042, 0.09, 6]} />
            <Mat color={color} />
          </mesh>
        </group>
      ))}
    </Sway>
  )
}

const PARTS: Partial<Record<GardenItem['kind'], (p: PartProps) => ReactNode>> = {
  pond: Pond,
  sapling: Sapling,
  lantern: Lantern,
  bench: Bench,
  birdhouse: Birdhouse,
  tulips: Tulips,
}

/** Escala extra de los objetos pequeños, que ocupan media casilla. */
function kindScale(kind: ItemKind) {
  return footprint(kind) === 1 ? ITEM_SCALE * 0.8 : ITEM_SCALE
}

/** Montoncito de tierra con un brote: el aspecto de cualquier semilla recién plantada. */
function Seedling({ seed, theme }: { seed: number; theme: SeasonTheme }) {
  const mound = useMemo(() => jitter(new IcosahedronGeometry(0.11, 0), 0.015, seed), [seed])
  return (
    <group>
      <mesh geometry={mound} position={[0, 0.01, 0]} scale={[1.3, 0.35, 1.3]} receiveShadow>
        <Mat color="#8C6442" />
      </mesh>
      <group position={[0, 0.02, 0]} scale={0.7}>
        <Sapling theme={theme} seed={seed} />
      </group>
    </group>
  )
}

/** Solo el modelo, sin posición: lo usan el jardín y la vista previa al colocar. */
export function ItemModel({ kind, color, seed, theme, growth }: { kind: ItemKind; color?: string; seed: number; theme: SeasonTheme; growth?: Growth }) {
  const Part = PARTS[kind]
  const ratio = growth ? Math.min(1, growth.progress / growth.need) : 1
  if (growth && ratio < 0.34) {
    return (
      <group scale={ITEM_SCALE * 0.8}>
        <Seedling seed={seed} theme={theme} />
      </group>
    )
  }
  // Mientras crece, la planta va ganando tamaño hasta el adulto
  const stage = growth ? 0.4 + ratio * 0.5 : 1
  // Cada planta es un poco distinta: más alta o más baja, más ancha o más estrecha
  const vary = ORGANIC.includes(kind) ? 0.88 + (seed % 25) / 100 : 1
  const squat = ORGANIC.includes(kind) ? 0.94 + ((seed >> 5) % 13) / 100 : 1
  const model = MODEL_KINDS[kind]
  const palette = paletteFor(kind, color)
  return (
    <group scale={[kindScale(kind) * stage * vary * squat, kindScale(kind) * stage * vary, kindScale(kind) * stage * vary * squat]}>
      {model ? (
        <Suspense fallback={null}>
          <Model def={model.def} paint={paintFor(theme, palette, model.use, model.tint, model.tintAmount)} />
        </Suspense>
      ) : (
        Part && <Part theme={theme} seed={seed} palette={palette} />
      )}
    </group>
  )
}

/** Coloca un objeto en su celda y lo hace aparecer con un pequeño rebote. */
export function PlacedItem({ item, theme }: { item: GardenItem; theme: SeasonTheme }) {
  const ref = useRef<Group>(null)
  const born = useRef<number | null>(null)
  const landed = useRef<number | null>(null)
  const seed = hashString(item.id)
  const selected = useGrove((s) => s.selectedId === item.id)
  const moving = useGrove((s) => s.placing?.from === 'garden' && s.placing.itemId === item.id)
  // Solo el objeto que se mueve escucha la celda bajo el dedo; el resto no se vuelve a dibujar
  const hoverCell = useGrove((s) => (s.placing?.from === 'garden' && s.placing.itemId === item.id ? s.hoverCell : null))
  const inspected = useGrove((s) => s.inspectId === item.id)

  const [cx, cz] = moving && hoverCell ? hoverCell : [item.x, item.z]
  const [wx, wz] = cellToWorld(cx, cz, item.kind)
  const organic = ORGANIC.includes(item.kind)
  const yaw = item.kind === 'fence' ? 0 : (item.rot * Math.PI) / 2 + (organic ? (seed % 628) / 100 : 0)
  // La posición inicial solo se usa al montar; después el objeto se desliza hasta su sitio
  const initial = useMemo<[number, number, number]>(() => [wx, GROUND_Y, wz], [])
  const target = useRef({ x: wx, z: wz })
  const base = useRef(GROUND_Y)
  // Al tocarlo reacciona: las plantas se sacuden y sueltan unas hojas; lo demás da un saltito
  const poked = useRef<number | null>(null)
  const [burst, setBurst] = useState(0)
  useEffect(() => {
    if (!inspected) return
    poked.current = -1
    if (organic) setBurst((b) => b + 1)
  }, [inspected, organic])
  if (target.current.x !== wx || target.current.z !== wz) {
    target.current = { x: wx, z: wz }
    if (!moving) landed.current = -1 // marca un aterrizaje en el próximo fotograma
  }

  useFrame(({ clock }, delta) => {
    const g = ref.current
    if (!g) return
    const now = clock.elapsedTime
    if (born.current === null) born.current = now
    if (landed.current === -1) landed.current = now
    const t = Math.min(1, (now - born.current) / 0.7)
    // easeOutBack: crece, se pasa un poco y se asienta
    const k = 1.7
    let s = Math.max(0.001, 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2))
    let squash = 1
    if (landed.current !== null) {
      // Al soltarlo: se aplasta un poco y rebota, como algo que cae sobre la hierba
      const lt = now - landed.current
      if (lt < 0.6) squash = 1 - Math.sin(lt * 18) * Math.exp(-lt * 7) * 0.14
      else landed.current = null
    }
    if (selected && !moving) s *= 1.04
    let hop = 0
    let swayX = 0
    let swayZ = 0
    if (poked.current === -1) poked.current = now
    if (poked.current !== null) {
      const pt = now - poked.current
      if (pt > 1.2) poked.current = null
      else if (organic) {
        // Sacudida que se apaga sola, como una rama que alguien ha rozado
        const w = Math.exp(-pt * 4.5) * 0.11
        swayX = Math.sin(pt * 22) * w
        swayZ = Math.cos(pt * 17) * w * 0.7
      } else if (pt < 0.4) {
        hop = Math.sin((pt / 0.4) * Math.PI) * 0.12
        squash *= 1 + Math.sin((pt / 0.4) * Math.PI) * 0.06
      }
    }
    g.scale.set(s / Math.sqrt(squash), s * squash, s / Math.sqrt(squash))
    g.rotation.x = swayX
    g.rotation.z = swayZ
    const follow = 1 - Math.exp(-delta * (moving ? 22 : 12))
    g.position.x += (target.current.x - g.position.x) * follow
    g.position.z += (target.current.z - g.position.z) * follow
    // Lo seleccionado o en movimiento flota un poco
    const lift = selected || moving ? 0.16 + Math.sin(now * 4) * 0.04 : 0
    base.current += (GROUND_Y + lift - base.current) * (1 - Math.exp(-delta * 12))
    g.position.y = base.current + hop
    g.rotation.y += (yaw - g.rotation.y) * (1 - Math.exp(-delta * 10))
  })

  return (
    <group
      ref={ref}
      position={initial}
      rotation={[0, yaw, 0]}
      userData={{ itemId: item.id }}
    >
      {item.kind === 'fence' ? <ConnectedFence item={item} /> : <ItemModel kind={item.kind} color={item.color} seed={seed} theme={theme} growth={item.growth} />}
      {item.kind === 'campfire' && <Flame />}
      {burst > 0 && <LeafBurst key={burst} color={paletteFor(item.kind, item.color)?.[0] ?? theme.leaf[0]} top={CANOPY[item.kind] ?? 0.45} />}
      {item.growth && selected && (
        <Html position={[0, 0.75, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="growth-chip">
            <span className="growth-bar">
              <span style={{ width: `${Math.round((item.growth.progress / item.growth.need) * 100)}%` }} />
            </span>
            {item.growth.by === 'focus' ? `${Math.floor(item.growth.progress)}/${item.growth.need} min` : `${item.growth.progress}/${item.growth.need} días`}
          </div>
        </Html>
      )}
    </group>
  )
}

/** Unas hojas que se desprenden y caen girando al tocar una planta. */
function LeafBurst({ color, top }: { color: string; top: number }) {
  const group = useRef<Group>(null)
  const start = useRef<number | null>(null)
  const [done, setDone] = useState(false)
  const leaves = useMemo(() => {
    const rand = seeded(Math.floor(Math.random() * 1e6))
    return Array.from({ length: 9 }, () => ({
      x: (rand() - 0.5) * 0.7,
      z: (rand() - 0.5) * 0.7,
      y: top * (0.75 + rand() * 0.3),
      fall: 0.35 + rand() * 0.35,
      spin: (rand() - 0.5) * 9,
      drift: rand() * Math.PI * 2,
    }))
  }, [top])
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    if (start.current === null) start.current = clock.elapsedTime
    const t = clock.elapsedTime - start.current
    if (t > 1.8) {
      setDone(true)
      return
    }
    g.children.forEach((m, i) => {
      const l = leaves[i]
      m.position.set(l.x + Math.sin(t * 3 + l.drift) * 0.08, Math.max(0.02, l.y - l.fall * t * (1 + t * 0.6)), l.z + Math.cos(t * 2.5 + l.drift) * 0.06)
      m.rotation.set(t * l.spin, t * l.spin * 0.6, 0)
      const mat = (m as Mesh).material as { opacity: number }
      mat.opacity = Math.min(1, (1.8 - t) * 2)
    })
  })
  if (done) return null
  return (
    <group ref={group}>
      {leaves.map((l, i) => (
        <mesh key={i} position={[l.x, l.y, l.z]}>
          <planeGeometry args={[0.07, 0.045]} />
          <meshStandardMaterial color={color} side={DoubleSide} transparent flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** Llamas de la hoguera: parpadean siempre y de noche iluminan alrededor. */
function Flame() {
  const outer = useRef<Mesh>(null)
  const inner = useRef<Mesh>(null)
  const light = useRef<{ intensity: number } | null>(null)
  const { night } = useDaylight()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const f = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06
    outer.current?.scale.set(1, f, 1)
    inner.current?.scale.set(1, 1.05 + Math.sin(t * 11 + 1) * 0.1, 1)
    if (light.current) light.current.intensity = (0.25 + night * 1.6) * (0.9 + Math.sin(t * 9) * 0.1)
  })
  return (
    <group position={[0, 0.06, 0]}>
      <mesh ref={outer} position={[0, 0.09, 0]}>
        <coneGeometry args={[0.07, 0.2, 5]} />
        <meshStandardMaterial color="#F28A3C" emissive="#F2702C" emissiveIntensity={1.6} flatShading toneMapped={false} />
      </mesh>
      <mesh ref={inner} position={[0, 0.07, 0]}>
        <coneGeometry args={[0.04, 0.13, 5]} />
        <meshStandardMaterial color="#FFD86B" emissive="#FFC94A" emissiveIntensity={2} flatShading toneMapped={false} />
      </mesh>
      <pointLight ref={light as never} position={[0, 0.2, 0]} color="#FF9A4D" distance={2.4} decay={1.6} />
    </group>
  )
}

const FENCE_DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

/**
 * Valla que se une sola con sus vecinas: un poste en el centro y travesaños hacia cada valla de al
 * lado. Sin vecinas, es un tramo recto en la dirección en que la hayas girado.
 */
function ConnectedFence({ item }: { item: GardenItem }) {
  // Máscara de vecinas (bit por dirección): solo cambia cuando se pone o quita una valla al lado
  const mask = useGrove((s) =>
    FENCE_DIRS.reduce((m, [dx, dz], i) => (s.items.some((o) => o.kind === 'fence' && o.x === item.x + dx && o.z === item.z + dz) ? m | (1 << i) : m), 0),
  )
  const [light, dark] = paletteFor('fence', item.color) ?? ['#B98A5E', '#9C7149']
  const along = item.rot % 2 === 0 ? [0, 1] : [2, 3]
  const arms = mask ? FENCE_DIRS.map((_, i) => i).filter((i) => mask & (1 << i)) : along
  const half = CELL / 2
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.055, 0.3, 0.055]} />
        <Mat color={dark} />
      </mesh>
      <mesh position={[0, 0.305, 0]} castShadow>
        <boxGeometry args={[0.07, 0.025, 0.07]} />
        <Mat color={light} />
      </mesh>
      {arms.map((i) => {
        const [dx, dz] = FENCE_DIRS[i]
        return (
          <group key={i} position={[(dx * half) / 2, 0, (dz * half) / 2]} rotation={[0, dx !== 0 ? 0 : Math.PI / 2, 0]}>
            {[0.11, 0.22].map((y) => (
              <mesh key={y} position={[0, y, 0]} castShadow>
                <boxGeometry args={[half + 0.02, 0.04, 0.028]} />
                <Mat color={light} />
              </mesh>
            ))}
            {/* Poste del extremo, para que un tramo suelto no acabe en el aire */}
            {!(mask & (1 << i)) && (
              <mesh position={[(dx !== 0 ? dx : -dz) * (half / 2), 0.13, 0]} castShadow>
                <boxGeometry args={[0.045, 0.26, 0.045]} />
                <Mat color={dark} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}
