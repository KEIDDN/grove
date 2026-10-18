import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, BufferAttribute, type BufferGeometry, Color, Group, IcosahedronGeometry, InstancedMesh, type Material, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import { mix } from '../game/daylight'
import type { SeasonTheme } from '../game/seasons'

/**
 * Modelos 3D (CC0, de Quaternius y Kenney) repintados con la paleta de Grove.
 *
 * Cada material del modelo trae un nombre ("Green", "Wood", "stone", "colorRed"…). Ese nombre
 * decide a qué "hueco" de color va (hojas, madera, piedra, acento…) y el hueco se rellena con la
 * variante que haya elegido el usuario o con los colores de la estación. Así un mismo modelo sirve
 * para todas las variantes y cambia con las estaciones.
 */

export type Slot = 'leaf' | 'leaf2' | 'moss' | 'wood' | 'wood2' | 'woodLight' | 'bark' | 'stone' | 'stone2' | 'accent' | 'accent2' | 'soil' | 'keep'

/** Hueco de color de cada nombre de material de los packs. */
const SLOT_BY_NAME: Record<string, Slot> = {
  // Quaternius
  Green: 'leaf',
  DarkGreen: 'leaf2',
  Wood: 'wood',
  White: 'bark',
  Black: 'keep',
  Rock: 'stone',
  Berry: 'accent',
  Pink: 'accent',
  Yellow: 'accent2',
  Cyan: 'accent',
  // Kenney Nature Kit
  grass: 'leaf',
  leafsGreen: 'leaf',
  leafsDark: 'leaf2',
  leafsFall: 'accent',
  woodBark: 'wood',
  woodBarkDark: 'wood2',
  woodBirch: 'bark',
  woodInner: 'woodLight',
  wood: 'woodLight',
  woodDark: 'wood',
  stone: 'stone',
  stoneDark: 'stone2',
  dirt: 'soil',
  colorRed: 'accent',
  colorRedDark: 'accent2',
  _defaultMat: 'keep',
}

export interface Paint {
  /** Tonos para las hojas: cada cara toma uno, para que las copas no sean de un solo color. */
  leaves: string[]
  leaf: string
  leaf2: string
  /** Musgo de rocas y troncos: sigue al césped, no a las hojas (no se pone naranja en otoño). */
  moss: string
  wood: string
  wood2: string
  woodLight: string
  bark: string
  stone: string
  stone2: string
  accent: string
  accent2: string
  soil: string
}

export interface ModelDef {
  url: string
  /** Altura que debe tener el modelo, en las mismas unidades que las piezas hechas con código. */
  height?: number
  /** O bien la anchura máxima (para cosas planas, como caminos o hogueras). */
  width?: number
  /** Cambia el hueco de color de algún material concreto de este modelo (o le fija un color). */
  slots?: Record<string, Slot | `#${string}`>
  /** Giro base, si el modelo viene orientado de otra forma. */
  yaw?: number
  /** Detalles repartidos por la copa: manzanas, bayas, flores… (tamaño en unidades del jardín). */
  dots?: { colors: string[]; count: number; size: number }
}

/** Colores por defecto; la variante o la estación los sobrescriben. */
export function paintFor(theme: SeasonTheme, palette: string[] | undefined, use: 'foliage' | 'wood' | 'stone' | 'accent' | 'none', tint?: string, tintAmount = 0.42): Paint {
  // Cada especie tiñe los colores de la estación con su propio tono: siguen cambiando con el año,
  // pero un abedul y un sauce ya no son del mismo verde
  const seasonal = tint ? theme.leaf.map((c) => mix(c, tint, tintAmount)) : theme.leaf
  const leaves = use === 'foliage' && palette?.length ? palette : seasonal
  const base: Paint = {
    leaves,
    leaf: leaves[0],
    leaf2: leaves[3] ?? leaves[1] ?? leaves[0],
    moss: theme.grass[3] ?? theme.grass[0],
    wood: '#8A6244',
    wood2: '#74513A',
    woodLight: '#C9A27A',
    bark: '#EFE9DD',
    stone: '#BDBBB3',
    stone2: '#A7A59D',
    accent: '#E0605A',
    accent2: '#F0CF6E',
    soil: '#9A7150',
  }
  if (use === 'wood' && palette?.length) {
    base.woodLight = palette[0]
    base.wood = palette[1] ?? palette[0]
  }
  if (use === 'stone' && palette?.length) {
    base.stone = palette[0]
    base.stone2 = palette[1] ?? palette[0]
  }
  if (use === 'accent' && palette?.length) {
    base.accent = palette[0]
    base.accent2 = palette[1] ?? palette[0]
  }
  return base
}

const materials = new Map<string, MeshStandardMaterial>()

/** Material plano compartido por color: cien flores rosas usan el mismo. */
function flatMaterial(color: string) {
  let m = materials.get(color)
  if (!m) {
    m = new MeshStandardMaterial({ color: new Color(color), flatShading: true, roughness: 0.88, metalness: 0 })
    materials.set(color, m)
  }
  return m
}

const foliageMaterial = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 })
const tintedGeometries = new Map<string, BufferGeometry>()

/**
 * Copa con varios tonos: cada triángulo toma un color de la lista. Se guarda por geometría y
 * colores, así todos los árboles iguales comparten la misma.
 */
function foliageGeometry(geo: BufferGeometry, tones: string[]) {
  const key = `${geo.uuid}|${tones.join(',')}`
  let g = tintedGeometries.get(key)
  if (g) return g
  g = geo.index ? geo.toNonIndexed() : geo.clone()
  const count = g.attributes.position.count
  const colors = new Float32Array(count * 3)
  const c = new Color()
  for (let t = 0; t < count / 3; t++) {
    // Mezcla determinista: el mismo árbol siempre se ve igual
    c.set(tones[(t * 7 + (t >> 2)) % tones.length])
    for (let v = 0; v < 3; v++) c.toArray(colors, (t * 3 + v) * 3)
  }
  g.setAttribute('color', new BufferAttribute(colors, 3))
  tintedGeometries.set(key, g)
  return g
}

function recolor(root: Object3D, paint: Paint, slots?: ModelDef['slots']) {
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return
    o.castShadow = true
    o.receiveShadow = true
    const single = !Array.isArray(o.material)
    const swap = (m: Material) => {
      const slot = slots?.[m.name] ?? SLOT_BY_NAME[m.name]
      if (!slot || slot === 'keep') return m
      if (slot.startsWith('#')) return flatMaterial(slot)
      // Hojas con varios tonos (solo si la malla tiene un único material, para no mezclar partes)
      if (slot === 'leaf' && single && paint.leaves.length > 1) {
        o.geometry = foliageGeometry(o.geometry, paint.leaves)
        return foliageMaterial
      }
      return flatMaterial(paint[slot as Exclude<Slot, 'keep'>])
    }
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material)
  })
}

const box = new Box3()
const size = new Vector3()
const center = new Vector3()

/** Copia del modelo repintada, a su tamaño, centrada y apoyada en y = 0. */
export function prepareModel(scene: Object3D, def: ModelDef, paint: Paint): Object3D {
  const object = scene.clone(true)
  recolor(object, paint, def.slots)
  box.setFromObject(scene)
  box.getSize(size)
  box.getCenter(center)
  const scale = def.width ? def.width / Math.max(size.x, size.z) : (def.height ?? 1) / size.y
  object.scale.setScalar(scale)
  object.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)
  if (def.dots) addDots(object, def, scale)
  const wrap = new Group()
  wrap.rotation.y = def.yaw ?? 0
  wrap.add(object)
  return wrap
}

const dotGeometry = new IcosahedronGeometry(1, 0)
const dotMaterials = new Map<string, MeshStandardMaterial>()

/**
 * Reparte bolitas (manzanas, bayas, flores) por la superficie de la copa: se eligen vértices de la
 * malla de hojas que miran hacia fuera y se coloca una un poco por encima. Siempre las mismas para el
 * mismo modelo, así no "bailan" al volver a dibujarse.
 */
function addDots(object: Object3D, def: ModelDef, scale: number) {
  const dots = def.dots!
  const leaves: Mesh[] = []
  object.traverse((o) => {
    if (o instanceof Mesh && (o.material === foliageMaterial || (o.material as Material).name === 'Green' || (o.material as Material).name === 'DarkGreen')) leaves.push(o)
  })
  const mesh = leaves.sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count)[0]
  if (!mesh) return
  const pos = mesh.geometry.attributes.position
  const nor = mesh.geometry.attributes.normal
  const candidates: number[] = []
  for (let i = 0; i < pos.count; i += 3) if (!nor || nor.getY(i) > -0.25) candidates.push(i)
  const radius = dots.size / scale
  const o = new Object3D()
  dots.colors.forEach((color, ci) => {
    let mat = dotMaterials.get(color)
    if (!mat) {
      mat = new MeshStandardMaterial({ color: new Color(color), flatShading: true, roughness: 0.7 })
      dotMaterials.set(color, mat)
    }
    const n = Math.ceil(dots.count / dots.colors.length)
    const inst = new InstancedMesh(dotGeometry, mat, n)
    for (let k = 0; k < n; k++) {
      const i = candidates[Math.floor((((k * dots.colors.length + ci) * 2654435761) >>> 0) % candidates.length)]
      o.position.set(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (nor) o.position.addScaledVector(new Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)), radius * 0.6)
      o.scale.setScalar(radius * (0.8 + ((k * 37) % 10) / 25))
      o.updateMatrix()
      inst.setMatrixAt(k, o.matrix)
    }
    inst.castShadow = true
    mesh.add(inst)
  })
}

/** Un modelo de un pack, a su tamaño, apoyado en el suelo, centrado y con los colores de Grove. */
export function Model({ def, paint }: { def: ModelDef; paint: Paint }) {
  const gltf = useGLTF(def.url)
  const key = JSON.stringify(paint)
  // La pintura se compara por valor: así no se clona el modelo en cada render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const object = useMemo(() => prepareModel(gltf.scene, def, paint), [gltf, def, key])
  return <primitive object={object} />
}

export type Use = Parameters<typeof paintFor>[2]

/**
 * Objetos que usan un modelo de un pack. Las medidas están en las mismas unidades que las piezas
 * hechas con código (luego ItemModel aplica la escala común), así todo convive a la misma escala.
 */
export const MODEL_KINDS: Partial<Record<string, { def: ModelDef; use: Use; tint?: string; tintAmount?: number }>> = {
  tree: { def: { url: '/models/tree.glb', height: 1.35 }, use: 'foliage' },
  pine: { def: { url: '/models/pine.glb', height: 1.45 }, use: 'foliage' },
  birch: { def: { url: '/models/birch.glb', height: 1.5 }, use: 'foliage', tint: '#E4E27C' },
  willow: { def: { url: '/models/willow.glb', height: 1.2, slots: { DarkGreen: 'leaf' } }, use: 'foliage', tint: '#8EC4AE' },
  bush: { def: { url: '/models/bush.glb', width: 0.55 }, use: 'foliage', tint: '#86B85E' },
  berrybush: { def: { url: '/models/berrybush.glb', width: 0.55, dots: { colors: ['#4C5FB8', '#6A57A8'], count: 12, size: 0.022 } }, use: 'foliage', tint: '#4E8A4C' },
  fern: { def: { url: '/models/fern.glb', height: 0.42, slots: { DarkGreen: 'leaf' } }, use: 'foliage', tint: '#3F8F5B' },
  reeds: { def: { url: '/models/reeds.glb', height: 0.55 }, use: 'foliage' },
  wheat: { def: { url: '/models/wheat.glb', height: 0.55 }, use: 'none' },
  flower: { def: { url: '/models/flower.glb', height: 0.42 }, use: 'accent' },
  rock: { def: { url: '/models/rock.glb', width: 0.55, slots: { Green: 'moss' } }, use: 'stone' },
  stump: { def: { url: '/models/stump.glb', width: 0.5, slots: { Green: 'moss' } }, use: 'wood' },
  log: { def: { url: '/models/log.glb', width: 0.55, slots: { Green: 'moss', DarkGreen: 'moss' } }, use: 'wood' },
  mushroom: { def: { url: '/models/mushroom.glb', width: 0.42 }, use: 'accent' },
  pumpkin: { def: { url: '/models/pumpkin.glb', width: 0.45 }, use: 'accent' },
  fence: { def: { url: '/models/fence.glb', width: 0.5 }, use: 'wood' },
  logpile: { def: { url: '/models/logpile.glb', width: 0.5 }, use: 'wood' },
  campfire: { def: { url: '/models/campfire.glb', width: 0.42 }, use: 'none' },
  tent: { def: { url: '/models/tent.glb', width: 0.7 }, use: 'accent' },
  planter: { def: { url: '/models/planter.glb', width: 0.36 }, use: 'none' },
  sign: { def: { url: '/models/sign.glb', height: 0.45 }, use: 'wood' },
  stones: { def: { url: '/models/stones.glb', width: 0.48 }, use: 'stone' },
  roundtree: { def: { url: '/models/roundtree.glb', height: 1.3, dots: { colors: ['#D9483B', '#E8603F'], count: 16, size: 0.045 } }, use: 'foliage', tint: '#4F9446' },
  cherry: { def: { url: '/models/cherry.glb', height: 1.35, dots: { colors: ['#FFFFFF', '#FBD3E0'], count: 26, size: 0.032 } }, use: 'foliage', tint: '#F6B3C7', tintAmount: 0.82 },
  tallpine: { def: { url: '/models/tallpine.glb', height: 1.55 }, use: 'foliage' },
  palm: { def: { url: '/models/palm.glb', height: 1.6 }, use: 'foliage', tint: '#57B565' },
  cactus: { def: { url: '/models/cactus.glb', height: 0.6, slots: { leafsGreen: '#7FAF6A' } }, use: 'none' },
  tallgrass: { def: { url: '/models/tallgrass.glb', height: 0.5 }, use: 'foliage', tint: '#9CC46A' },
  corn: { def: { url: '/models/corn.glb', height: 0.75, slots: { Green: 'moss' } }, use: 'none' },
  carrots: { def: { url: '/models/carrots.glb', height: 0.35, slots: { grass: 'moss', leafsFall: 'keep' } }, use: 'none' },
  melon: { def: { url: '/models/melon.glb', width: 0.4, slots: { grass: 'moss', leafsDark: '#7FA85E', dirt: 'soil' } }, use: 'none' },
  boulder: { def: { url: '/models/boulder.glb', width: 0.6 }, use: 'stone' },
  menhir: { def: { url: '/models/menhir.glb', height: 0.7 }, use: 'stone' },
  column: { def: { url: '/models/column.glb', height: 0.85 }, use: 'stone' },
  stonehead: { def: { url: '/models/stonehead.glb', height: 0.75 }, use: 'stone' },
  boardwalk: { def: { url: '/models/boardwalk.glb', width: 0.5, slots: { dirt: 'woodLight', dirtDark: 'wood' } }, use: 'wood' },
  canoe: { def: { url: '/models/canoe.glb', width: 0.55, slots: { leafsFall: 'wood', wood: 'woodLight' } }, use: 'wood' },
  fountain: { def: { url: '/models/fountain.glb', width: 0.78 }, use: 'none' },
  cart: { def: { url: '/models/cart.glb', width: 0.55 }, use: 'none' },
  stall: { def: { url: '/models/stall.glb', width: 0.78 }, use: 'none' },
}
