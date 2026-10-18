import { useEffect, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import { Plane, Raycaster, Vector2, Vector3, type Group, type Object3D } from 'three'
import { canPlace, CELL, cellToWorld, findSpot, footprint, plotKey, plotSlots, worldToCell } from '../game/garden'
import { useGrove } from '../game/store'
import { GROUND_Y } from './Island'
import { grab, panBy, release, resetView, rotateBy, view, zoomBy } from './camera'

/**
 * Todos los gestos sobre el jardín pasan por aquí, en vez de repartirse entre la cámara y cada objeto.
 * Así un mismo dedo nunca hace dos cosas a la vez:
 *
 * - Un dedo sobre el césped gira la cámara (y al soltar encaja en la vista más cercana).
 * - Dos dedos: pellizco para el zoom y, con zoom, desplazar.
 * - Doble toque: vuelta a la vista inicial.
 * - En edición, un dedo sobre un objeto lo arrastra; el objeto va un poco por encima del dedo para
 *   que se vea. Tocar un objeto lo selecciona y tocar una celda coloca lo que estés moviendo.
 * - Al pintar, un dedo pinta y la cámara se mueve con dos.
 */

/** Distancia (px) a partir de la cual un toque pasa a ser un arrastre. Un dedo nunca está quieto. */
const SLOP_TOUCH = 10
const SLOP_MOUSE = 4
/** Cuánto sube (px) lo que arrastras por encima del dedo. */
const LIFT_TOUCH = 56
const DOUBLE_TAP_MS = 300

type Intent =
  | { kind: 'camera'; onTap: () => void }
  | { kind: 'item'; itemId: string; onTap: () => void }
  | { kind: 'placing'; offset: [number, number] }
  | { kind: 'paint' }

interface Pointer {
  x: number
  y: number
}

export function Gestures({ garden }: { garden: RefObject<Group | null> }) {
  const { gl, camera, size } = useThree()

  useEffect(() => {
    const el = gl.domElement
    const store = useGrove
    const pointers = new Map<number, Pointer>()
    const raycaster = new Raycaster()
    const ndc = new Vector2()
    const hit = new Vector3()
    const plane = new Plane(new Vector3(0, 1, 0), 0)

    let intent: Intent | null = null
    let start = { x: 0, y: 0, t: 0 }
    let active = false // el gesto de un dedo ya ha superado el umbral
    let multi = false
    let pinch = { dist: 0, cx: 0, cy: 0 }
    let lastTap = { t: 0, x: 0, y: 0 }
    let lastPainted: [number, number] | null = null
    let liftPx = 0

    const rect = () => el.getBoundingClientRect()

    const setRay = (x: number, y: number) => {
      const r = rect()
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
    }

    /** Punto del suelo bajo la pantalla (x, y), en coordenadas del jardín. */
    const ground = (x: number, y: number): [number, number] | null => {
      const g = garden.current
      if (!g) return null
      setRay(x, y)
      plane.constant = -(g.position.y + GROUND_Y)
      if (!raycaster.ray.intersectPlane(plane, hit)) return null
      return [hit.x - g.position.x, hit.z - g.position.z]
    }

    /** Objeto bajo el dedo: primero su malla y, si no, la celda que ocupa (más fácil de acertar). */
    const itemAt = (x: number, y: number): string | null => {
      const g = garden.current
      if (!g) return null
      setRay(x, y)
      for (const h of raycaster.intersectObject(g, true)) {
        let o: Object3D | null = h.object
        while (o && o !== g) {
          if (o.userData.itemId) return o.userData.itemId as string
          o = o.parent
        }
      }
      const p = ground(x, y)
      if (!p) return null
      const cx = Math.floor(p[0] / CELL)
      const cz = Math.floor(p[1] / CELL)
      const it = store.getState().items.find((i) => {
        const fp = footprint(i.kind)
        return cx >= i.x && cx < i.x + fp && cz >= i.z && cz < i.z + fp
      })
      return it?.id ?? null
    }

    const setHover = (c: [number, number]) => {
      const h = store.getState().hoverCell
      if (!h || h[0] !== c[0] || h[1] !== c[1]) store.getState().setHoverCell(c)
    }

    /** Celda donde caería lo que arrastras, con el dedo en (x, y). */
    const placingCell = (x: number, y: number, offset: [number, number]): [number, number] | null => {
      const placing = store.getState().placing
      const p = ground(x, y - liftPx)
      if (!placing || !p) return null
      return worldToCell(p[0] + offset[0], p[1] + offset[1], placing.kind)
    }

    /** Pinta las celdas entre la anterior y la actual, para que un arrastre rápido no deje huecos. */
    const paintAt = (x: number, y: number) => {
      const p = ground(x, y)
      if (!p) return
      const to: [number, number] = [Math.floor(p[0] / CELL), Math.floor(p[1] / CELL)]
      const s = store.getState()
      setHover(to)
      const from = lastPainted ?? to
      const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]))
      for (let i = 1; i <= steps; i++) s.paintCell(Math.round(from[0] + ((to[0] - from[0]) * i) / steps), Math.round(from[1] + ((to[1] - from[1]) * i) / steps))
      s.paintCell(to[0], to[1])
      lastPainted = to
    }

    /** Qué hará este dedo según dónde toque y en qué modo está el jardín. */
    const decide = (x: number, y: number): Intent => {
      const s = store.getState()
      const tapGround = (fn: (p: [number, number]) => void) => () => {
        const p = ground(x, y)
        if (p) fn(p)
      }
      if (!s.editMode) return { kind: 'camera', onTap: () => {} }
      if (s.editTool === 'paint') return { kind: 'paint' }
      if (s.editTool === 'expand')
        return {
          kind: 'camera',
          onTap: tapGround(([px, pz]) => {
            const tx = Math.floor(px)
            const tz = Math.floor(pz)
            if (plotSlots(s.plots).some(([a, b]) => plotKey(a, b) === plotKey(tx, tz))) s.addPlot(tx, tz)
          }),
        }
      const placing = s.placing
      if (placing) {
        // ¿Ha cogido lo que está colocando? Entonces se arrastra desde donde lo ha cogido.
        const p = ground(x, y)
        const h = s.hoverCell
        if (p && h) {
          const [wx, wz] = cellToWorld(h[0], h[1], placing.kind)
          const reach = (footprint(placing.kind) * CELL) / 2 + CELL * 0.5
          const onIt = Math.abs(p[0] - wx) < reach && Math.abs(p[1] - wz) < reach
          if (onIt) return { kind: 'placing', offset: [wx - p[0], wz - p[1]] }
        }
        return {
          kind: 'camera',
          onTap: tapGround(([px, pz]) => {
            const c = worldToCell(px, pz, placing.kind)
            setHover(c)
            s.placeAt(c[0], c[1])
          }),
        }
      }
      const id = itemAt(x, y)
      if (id) {
        const selected = s.selectedId === id
        return { kind: 'item', itemId: id, onTap: () => s.select(selected ? null : id) }
      }
      return { kind: 'camera', onTap: () => s.selectedId && s.select(null) }
    }

    /** Un objeto del jardín pasa a moverse con el dedo. */
    const beginItemDrag = (itemId: string) => {
      const s = store.getState()
      const it = s.items.find((i) => i.id === itemId)
      if (!it) return null
      s.select(itemId)
      s.startMove()
      store.getState().setHoverCell([it.x, it.z])
      const p = ground(start.x, start.y)
      const [wx, wz] = cellToWorld(it.x, it.z, it.kind)
      return p ? ([wx - p[0], wz - p[1]] as [number, number]) : ([0, 0] as [number, number])
    }

    /** Suelta lo que se arrastraba: si cabe se coloca; si no, vuelve a su sitio (o espera otra celda). */
    const drop = () => {
      const s = store.getState()
      const p = s.placing
      const h = s.hoverCell
      if (!p || !h) return
      const ignore = p.from === 'garden' ? p.itemId : undefined
      if (canPlace(s.items, s.plots, p.kind, h[0], h[1], ignore)) s.placeAt(h[0], h[1])
      else if (p.from === 'garden') {
        s.cancelPlacing()
        s.select(p.itemId)
      }
    }

    const onDown = (e: PointerEvent) => {
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // Puntero ya liberado (o sintético): seguimos sin captura
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 1) {
        start = { x: e.clientX, y: e.clientY, t: performance.now() }
        active = false
        multi = false
        liftPx = 0
        lastPainted = null
        intent = decide(e.clientX, e.clientY)
        return
      }
      // Segundo dedo: cámara (salvo que ya esté arrastrando un objeto, que sigue con el primero)
      if (active && (intent?.kind === 'item' || intent?.kind === 'placing')) return
      if (active && intent?.kind === 'camera') release()
      multi = true
      active = true
      grab()
      pinch = twoFinger()
    }

    const twoFinger = () => {
      const [a, b] = [...pointers.values()]
      return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
    }

    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY

      if (multi) {
        if (pointers.size < 2) return
        const now = twoFinger()
        if (pinch.dist > 0) zoomBy(now.dist / pinch.dist)
        const mx = now.cx - pinch.cx
        const my = now.cy - pinch.cy
        if (view.targetZoom > 1.05) panScreen(mx, my)
        else rotateBy(mx, 0, size.width)
        pinch = now
        return
      }
      if (!intent) return

      const touch = e.pointerType === 'touch'
      if (!active) {
        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
        if (moved < (touch ? SLOP_TOUCH : SLOP_MOUSE)) return
        active = true
        if (intent.kind === 'camera') grab()
        if (intent.kind === 'item') {
          const offset = beginItemDrag(intent.itemId)
          intent = offset ? { kind: 'placing', offset } : { kind: 'camera', onTap: () => {} }
          if (intent.kind === 'camera') grab()
        }
        if (intent.kind === 'paint') paintAt(start.x, start.y)
      }

      if (intent.kind === 'camera') rotateBy(dx, dy, size.width)
      else if (intent.kind === 'paint') paintAt(e.clientX, e.clientY)
      else if (intent.kind === 'placing') {
        // El objeto sube poco a poco por encima del dedo, para que no salte al cogerlo
        if (touch) liftPx = Math.min(LIFT_TOUCH, liftPx + Math.hypot(dx, dy) * 0.8)
        const c = placingCell(e.clientX, e.clientY, intent.offset)
        if (c) setHover(c)
      }
    }

    /** Arrastrar con dos dedos desplaza el jardín bajo ellos. */
    const panScreen = (dx: number, dy: number) => {
      const z = (camera as { zoom: number }).zoom
      const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
      const fwd = new Vector3().setFromMatrixColumn(camera.matrixWorld, 2).negate()
      right.y = 0
      fwd.y = 0
      right.normalize()
      fwd.normalize()
      const ground = 1 / Math.max(0.3, Math.cos(view.polar))
      panBy((-right.x * dx + fwd.x * dy * ground) / z, (-right.z * dx + fwd.z * dy * ground) / z)
    }

    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.delete(e.pointerId)
      if (pointers.size > 0) {
        // Sigue un dedo tras un pellizco: no lo convertimos en giro, se espera a que se suelten todos
        if (multi) pinch = { dist: 0, cx: 0, cy: 0 }
        return
      }
      const cancelled = e.type === 'pointercancel'
      if (multi) release()
      else if (intent && !active && !cancelled) {
        const now = performance.now()
        if (intent.kind === 'paint') paintAt(start.x, start.y)
        else if (intent.kind === 'camera' || intent.kind === 'item') {
          const double = now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(start.x - lastTap.x, start.y - lastTap.y) < 30
          if (double && !store.getState().editMode) resetView()
          else intent.onTap()
          lastTap = double ? { t: 0, x: 0, y: 0 } : { t: now, x: start.x, y: start.y }
        }
      } else if (intent?.kind === 'camera') release()
      else if (intent?.kind === 'placing') drop()
      intent = null
      active = false
      multi = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // Trackpad: pellizco llega como rueda con ctrl
      zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })

    // Al empezar a colocar algo, la vista previa aparece ya en un hueco libre (en móvil no hay "hover")
    const unsub = store.subscribe((s, prev) => {
      if (!s.placing || prev.placing === s.placing || s.hoverCell) return
      if (s.placing.from === 'garden') {
        const id = s.placing.itemId
        const it = s.items.find((i) => i.id === id)
        if (it) s.setHoverCell([it.x, it.z])
        return
      }
      const spot = findSpot(s.items, s.plots, s.placing.kind)
      if (spot) s.setHoverCell(spot)
    })

    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
      unsub()
    }
  }, [gl, camera, size.width, garden])

  return null
}
