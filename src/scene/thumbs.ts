import { DirectionalLight, HemisphereLight, OrthographicCamera, Scene, Sphere, Box3, SRGBColorSpace, WebGLRenderer } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { SeasonTheme } from '../game/seasons'
import { MODEL_KINDS, paintFor, prepareModel } from './models'

/**
 * Miniaturas de los objetos para el Vivero y el Inventario: se renderiza el mismo modelo del
 * jardín, ya repintado, desde la vista isométrica. Se hace una vez por objeto y color y se guarda.
 */

const SIZE = 192
const cache = new Map<string, string>()
const pending = new Map<string, Promise<string>>()
const loader = new GLTFLoader()
let renderer: WebGLRenderer | null = null
let queue = Promise.resolve()

function setup() {
  if (renderer) return renderer
  renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(SIZE, SIZE, false)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  return renderer
}

export function thumbKey(kind: string, color: string | undefined, theme: SeasonTheme) {
  return `${kind}|${color ?? ''}|${theme.name}`
}

export function cachedThumb(key: string) {
  return cache.get(key)
}

/** Miniatura (data URL) de un objeto; null si ese objeto no usa modelo. */
export function thumbnail(kind: string, color: string | undefined, theme: SeasonTheme): Promise<string> | null {
  const entry = MODEL_KINDS[kind]
  if (!entry) return null
  const key = thumbKey(kind, color, theme)
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)
  const running = pending.get(key)
  if (running) return running
  // De una en una: un solo contexto WebGL pequeño, sin competir con el jardín
  const job = new Promise<string>((resolve, reject) => {
    queue = queue.then(async () => {
      try {
        const gltf = await loader.loadAsync(entry.def.url)
        const object = prepareModel(gltf.scene, entry.def, paintFor(theme, color ? [color] : undefined, entry.use, entry.tint, entry.tintAmount))
        const scene = new Scene()
        scene.add(object)
        scene.add(new HemisphereLight('#EAF2FF', '#B49470', 1.6))
        const sun = new DirectionalLight('#FFF4E2', 2.2)
        sun.position.set(4, 8, 3)
        scene.add(sun)
        const sphere = new Box3().setFromObject(object).getBoundingSphere(new Sphere())
        const r = sphere.radius * 0.86
        const camera = new OrthographicCamera(-r, r, r, -r, -50, 50)
        camera.position.set(sphere.center.x + 6, sphere.center.y + 5.5, sphere.center.z + 6)
        camera.lookAt(sphere.center)
        const gl = setup()
        gl.render(scene, camera)
        const url = gl.domElement.toDataURL('image/png')
        cache.set(key, url)
        resolve(url)
      } catch (e) {
        reject(e)
      } finally {
        pending.delete(key)
      }
    })
  })
  pending.set(key, job)
  return job
}
