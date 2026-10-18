/**
 * Estado de la cámara del jardín, fuera de React: los gestos lo escriben y CameraRig lo lee en
 * cada fotograma. Así girar o hacer zoom nunca provoca renders.
 *
 * Giro libre con inercia; al soltar, la cámara encaja suave en la vista isométrica más cercana.
 */

/** Vista inicial (la de siempre: 45°) y paso entre vistas "bonitas". */
export const HOME_AZIMUTH = Math.PI / 4
const STEP = Math.PI / 2
const HOME_POLAR = 1.0
const MIN_POLAR = 0.9
const MAX_POLAR = 1.12
export const MIN_ZOOM = 0.85
export const MAX_ZOOM = 2.6

export const view = {
  azimuth: HOME_AZIMUTH,
  targetAzimuth: HOME_AZIMUTH,
  polar: HOME_POLAR,
  targetPolar: HOME_POLAR,
  /** Multiplicador del zoom automático del encuadre. */
  zoom: 1,
  targetZoom: 1,
  /** Desplazamiento del punto mirado, en coordenadas del jardín (solo con zoom). */
  panX: 0,
  panZ: 0,
  targetPanX: 0,
  targetPanZ: 0,
  /** true mientras un dedo arrastra la cámara: la sigue sin suavizado. */
  held: false,
  velocity: 0,
  lastMove: 0,
  /** Mitad del lado del jardín, para limitar el desplazamiento. */
  halfSpan: 2,
  /** Rapidez con la que la cámara llega a su objetivo; las celebraciones la mueven más despacio. */
  speed: 9,
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function grab() {
  view.speed = 9
  view.held = true
  view.velocity = 0
  view.targetAzimuth = view.azimuth
  view.targetPolar = view.polar
}

/** dx, dy en píxeles; el giro es proporcional al ancho para que se sienta igual en cualquier pantalla. */
export function rotateBy(dx: number, dy: number, width: number) {
  const now = performance.now()
  const da = (-dx / width) * Math.PI * 1.15
  view.azimuth += da
  view.targetAzimuth = view.azimuth
  view.polar = clamp(view.polar - (dy / width) * 1.2, MIN_POLAR, MAX_POLAR)
  view.targetPolar = view.polar
  const dt = Math.max(1, now - view.lastMove)
  // Velocidad suavizada (rad/ms) para lanzar la inercia al soltar
  view.velocity = view.velocity * 0.6 + (da / dt) * 0.4
  view.lastMove = now
}

/** Al soltar: proyecta la inercia y encaja en la vista isométrica más cercana a donde acabaría. */
export function release() {
  view.held = false
  const idle = performance.now() - view.lastMove > 80
  const fling = idle ? 0 : clamp(view.velocity * 260, -Math.PI, Math.PI)
  const projected = view.azimuth + fling
  view.targetAzimuth = HOME_AZIMUTH + Math.round((projected - HOME_AZIMUTH) / STEP) * STEP
  view.targetPolar = HOME_POLAR
  view.velocity = 0
}

export function zoomBy(factor: number) {
  view.speed = 9
  view.targetZoom = clamp(view.targetZoom * factor, MIN_ZOOM, MAX_ZOOM)
  view.zoom = view.targetZoom
  clampPan()
}

/** Desplaza el punto mirado (dx, dz en unidades del jardín). */
export function panBy(dx: number, dz: number) {
  view.speed = 9
  view.targetPanX += dx
  view.targetPanZ += dz
  clampPan()
  view.panX = view.targetPanX
  view.panZ = view.targetPanZ
}

function clampPan() {
  // Sin zoom no hay desplazamiento; con zoom, como mucho hasta el borde del jardín
  const room = view.halfSpan * Math.max(0, 1 - 1 / view.targetZoom)
  view.targetPanX = clamp(view.targetPanX, -room, room)
  view.targetPanZ = clamp(view.targetPanZ, -room, room)
}

/** Acerca la cámara despacio a un punto del jardín (relativo a su centro), como un plano de cine. */
export function focusOn(x: number, z: number, zoom = 1.8) {
  view.speed = 2.4
  view.targetZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM)
  view.targetPanX = x
  view.targetPanZ = z
  clampPan()
}

/** Doble toque: vuelve a la vista inicial, desde la vista isométrica más cercana. */
export function resetView(speed = 9) {
  view.speed = speed
  view.targetAzimuth = HOME_AZIMUTH + Math.round((view.azimuth - HOME_AZIMUTH) / STEP) * STEP
  view.targetPolar = HOME_POLAR
  view.targetZoom = 1
  view.targetPanX = 0
  view.targetPanZ = 0
}

/** Avanza los valores hacia su objetivo (muelle exponencial, independiente de los fps). */
export function stepView(delta: number) {
  if (view.held) return
  const k = 1 - Math.exp(-delta * view.speed)
  view.azimuth += (view.targetAzimuth - view.azimuth) * k
  view.polar += (view.targetPolar - view.polar) * k
  view.zoom += (view.targetZoom - view.zoom) * k
  view.panX += (view.targetPanX - view.panX) * k
  view.panZ += (view.targetPanZ - view.panZ) * k
}
