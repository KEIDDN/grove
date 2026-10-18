import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useMotionValue, usePresence, useTransform, type AnimationPlaybackControls } from 'motion/react'
import { useGrove } from '../game/store'
import { CloseIcon } from './icons'
import { spring, useIsWide } from './motion'

/* ——— Panel expandido: mientras hay uno a pantalla completa, el jardín 3D no se dibuja ——— */
let expandedCount = 0
const listeners = new Set<(n: number) => void>()
const setExpanded = (delta: number) => {
  expandedCount = Math.max(0, expandedCount + delta)
  listeners.forEach((l) => l(expandedCount))
}

export function useSheetExpanded() {
  const [n, setN] = useState(expandedCount)
  useEffect(() => {
    listeners.add(setN)
    return () => void listeners.delete(setN)
  }, [])
  return n > 0
}

/** Muelle de las alturas del panel: rápido y sin rebote exagerado, como las hojas de iOS. */
const detentSpring = { type: 'spring', stiffness: 420, damping: 42, mass: 0.9 } as const
/** Distancia (px) o velocidad (px/ms) para cerrar o cambiar de altura al soltar. */
const CLOSE_DISTANCE = 110
const PROJECT_MS = 180

interface Geometry {
  /** Desplazamiento del panel en altura media (en altura completa es 0). */
  medium: number
  /** Alto total del panel. */
  full: number
  /** Cuánto se recorta por abajo en altura media, para terminar justo encima del dock. */
  clipBottom: number
  /** Margen lateral en altura media. */
  side: number
}

/**
 * El panel de las secciones. En móvil sale sobre el dock a media altura y, deslizándolo hacia
 * arriba, se amplía a pantalla completa (tapando el dock); deslizándolo hacia abajo vuelve a media
 * altura o se cierra. Se queda montado al cambiar de sección: solo cambia el contenido.
 *
 * Todo el movimiento es `transform` + `clip-path` sobre un panel que siempre mide la pantalla entera,
 * así nada se vuelve a maquetar mientras se arrastra. En desktop flota a la derecha.
 */
export function SheetHost({ contentKey, children }: { contentKey: string; children: ReactNode }) {
  const wide = useIsWide()
  return wide ? <WideSheet>{children}</WideSheet> : <MobileSheet contentKey={contentKey}>{children}</MobileSheet>
}

function WideSheet({ children }: { children: ReactNode }) {
  return (
    <motion.section
      className="sheet glass"
      initial={{ opacity: 0, x: 48, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.98, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
      transition={spring}
    >
      <div className="sheet-body">{children}</div>
    </motion.section>
  )
}

function MobileSheet({ contentKey, children }: { contentKey: string; children: ReactNode }) {
  const setTab = useGrove((s) => s.setTab)
  const ref = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const geo = useRef<Geometry>({ medium: 400, full: 800, clipBottom: 400, side: 10 })
  const y = useMotionValue(2000)
  const [expanded, setExpandedState] = useState(false)
  const [isPresent, safeToRemove] = usePresence()
  const anim = useRef<AnimationPlaybackControls | null>(null)

  /** 0 en altura media (o por debajo), 1 a pantalla completa. */
  const progress = (v: number) => Math.min(1, Math.max(0, 1 - v / Math.max(1, geo.current.medium)))
  const clipPath = useTransform(y, (v) => {
    const p = progress(v)
    const { clipBottom, side } = geo.current
    const s = side * (1 - p)
    const r = 32 * (1 - p)
    return `inset(0px ${s}px ${clipBottom * (1 - p)}px ${s}px round 32px 32px ${r}px ${r}px)`
  })
  // A media altura el dock queda por encima (el panel se esconde tras él al cerrarse); al ampliarse lo tapa
  const zIndex = useTransform(y, (v) => (progress(v) > 0.01 ? 25 : 5))

  const measure = () => {
    const el = ref.current
    const host = el?.parentElement
    if (!el || !host) return
    const H = host.clientHeight
    const top = el.offsetTop
    const full = el.offsetHeight
    // Posición del dock sin contar su animación de entrada (offsetTop ignora los transform)
    const dock = document.querySelector<HTMLElement>('.dock')
    const visBottom = (dock ? dock.offsetTop : H - 90) - 10
    const visH = Math.min(H * 0.62, 560, visBottom - top - 60)
    const medium = visBottom - visH - top
    geo.current = { medium, full, clipBottom: full - visH, side: el.offsetWidth >= host.clientWidth - 1 ? 10 : 0 }
  }

  const goTo = (target: 'medium' | 'large' | 'closed', velocity = 0) => {
    anim.current?.stop()
    if (target === 'closed') {
      setTab('garden')
      return
    }
    const to = target === 'large' ? 0 : geo.current.medium
    anim.current = animate(y, to, { ...detentSpring, velocity })
    setExpandedState(target === 'large')
  }

  // Entrada: sube desde abajo hasta media altura
  useLayoutEffect(() => {
    measure()
    y.set(geo.current.full)
    anim.current = animate(y, geo.current.medium, detentSpring)
    const onResize = () => {
      const wasLarge = y.get() < 1
      measure()
      y.set(wasLarge ? 0 : geo.current.medium)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Salida: baja por detrás del dock y luego se desmonta
  useEffect(() => {
    if (isPresent) return
    anim.current?.stop()
    animate(y, geo.current.full + 40, { type: 'spring', stiffness: 380, damping: 40, restDelta: 2 }).then(() => safeToRemove?.())
  }, [isPresent])

  // Pausa el 3D a pantalla completa
  useEffect(() => {
    if (!expanded) return
    setExpanded(1)
    return () => setExpanded(-1)
  }, [expanded])

  // Al cambiar de sección, el contenido empieza arriba
  useEffect(() => {
    if (body.current) body.current.scrollTop = 0
  }, [contentKey])

  // Arrastre: hacia arriba amplía, hacia abajo vuelve a media altura o cierra
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let y0 = 0
    let x0 = 0
    let start = 0
    let base = 0
    let decided = false
    let dragging = false
    let handle = false
    let samples: Array<{ y: number; t: number }> = []

    const onStart = (e: TouchEvent) => {
      if (e.touches.length > 1 || !isPresent) return
      const t = e.touches[0]
      const target = e.target as HTMLElement
      decided = false
      dragging = false
      // Las filas con scroll horizontal se quedan sus gestos
      if (target.closest('[data-no-sheet-drag]')) {
        decided = true
        return
      }
      handle = !!target.closest('.sheet-grab, .sheet-head')
      y0 = t.clientY
      x0 = t.clientX
      start = y.get()
      samples = [{ y: t.clientY, t: e.timeStamp }]
    }

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      const dy = t.clientY - y0
      if (!decided) {
        const dx = t.clientX - x0
        if (Math.hypot(dx, dy) < 6) return
        decided = true
        if (Math.abs(dy) < Math.abs(dx)) return
        const large = start < 1
        const atTop = (body.current?.scrollTop ?? 0) <= 0
        // A pantalla completa solo se arrastra hacia abajo desde arriba del todo (si no, es scroll);
        // a media altura cualquier gesto vertical mueve el panel
        dragging = large ? dy > 0 && (atTop || handle) : true
        if (dragging) {
          anim.current?.stop()
          start = y.get()
          base = dy
        }
      }
      if (!dragging) return
      e.preventDefault()
      let next = start + (dy - base)
      // Por encima de pantalla completa apenas cede
      if (next < 0) next *= 0.12
      y.set(next)
      samples.push({ y: t.clientY, t: e.timeStamp })
      if (samples.length > 6) samples.shift()
    }

    const onEnd = () => {
      if (!dragging) return
      dragging = false
      const first = samples[0]
      const last = samples[samples.length - 1]
      const v = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0
      const now = y.get()
      const { medium } = geo.current
      const projected = now + v * PROJECT_MS
      if (now > medium + CLOSE_DISTANCE || (projected > medium + CLOSE_DISTANCE && start >= medium - 1)) goTo('closed')
      else if (projected < medium / 2) goTo('large', v * 1000)
      else goTo('medium', v * 1000)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [isPresent])

  return (
    <motion.section
      ref={ref}
      className={expanded ? 'sheet sheet-mobile expanded' : 'sheet sheet-mobile'}
      style={{ y, clipPath, WebkitClipPath: clipPath, zIndex }}
      // Al escribir se amplía, para que el teclado no tape la pregunta
      onFocus={(e) => (e.target as HTMLElement).matches('textarea, input') && !expanded && goTo('large')}
    >
      <button className="sheet-grab" onClick={() => goTo(expanded ? 'medium' : 'large')} aria-label={expanded ? 'Reducir panel' : 'Ampliar panel'} />
      <div ref={body} className="sheet-body" style={{ paddingBottom: expanded ? undefined : geo.current.clipBottom + 24 }}>
        {children}
      </div>
    </motion.section>
  )
}

/**
 * Cabecera y contenido de una sección dentro del panel. Al cambiar de sección entra con un fundido;
 * el panel no se mueve.
 */
export function Sheet({
  eyebrow,
  title,
  aside,
  hero,
  accent,
  children,
  onClose,
}: {
  eyebrow: string
  title: string
  aside?: ReactNode
  /** Algo propio bajo el título (la semana en Raíces, por ejemplo). */
  hero?: ReactNode
  /** Aura de color tras la cabecera. */
  accent?: 'roots' | 'read' | 'album' | 'calm'
  children: ReactNode
  onClose?: () => void
}) {
  const setTab = useGrove((s) => s.setTab)
  const close = onClose ?? (() => setTab('garden'))
  return (
    <motion.div className={accent ? `sheet-content accent--${accent}` : 'sheet-content'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
      {accent && (
        <div className="page-aura" aria-hidden="true">
          <span />
          <span />
        </div>
      )}
      <header className="sheet-head">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="title" style={{ marginTop: 4 }}>
            {title}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {aside}
          <button
            className="press hit"
            onClick={close}
            aria-label="Cerrar"
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(27,31,28,0.06)', display: 'grid', placeItems: 'center' }}
          >
            <CloseIcon size={16} strokeWidth={2.2} />
          </button>
        </div>
      </header>
      {hero && <div className="page-hero">{hero}</div>}
      {children}
    </motion.div>
  )
}

/** Contenido que cambia (pestañas dentro de un panel) con un fundido y un pequeño desplazamiento. */
export function SwapIn({ id, children }: { id: string; children: ReactNode }) {
  return (
    <motion.div key={id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={spring}>
      {children}
    </motion.div>
  )
}

/** Pestañas segmentadas con una píldora que se desliza hasta la elegida. */
export function Segments<T extends string>({ id, items, value, onChange }: { id: string; items: Array<{ id: T; label: string }>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="segments" role="tablist">
      {items.map((it) => (
        <button key={it.id} role="tab" aria-selected={value === it.id} onClick={() => onChange(it.id)}>
          {value === it.id && <motion.span layoutId={`seg-${id}`} className="segment-pill" transition={spring} />}
          <span style={{ position: 'relative' }}>{it.label}</span>
        </button>
      ))}
    </div>
  )
}
