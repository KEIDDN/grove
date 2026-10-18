import { useEffect, useRef, type ReactNode } from 'react'
import { animate, motion } from 'motion/react'
import { useGrove } from '../game/store'
import { CloseIcon } from './icons'
import { spring, useIsWide } from './motion'

/** Distancia (px) o velocidad (px/ms) a partir de la cual soltar el panel lo cierra. */
const CLOSE_DISTANCE = 110
const CLOSE_VELOCITY = 0.6

/**
 * Arrastrar para cerrar, como en iOS: el panel sigue al dedo 1:1 desde el asa, la cabecera o el
 * contenido cuando ya está arriba del todo. Si el contenido tiene scroll, primero se desplaza él.
 * Usa la propiedad `translate` para no pelearse con la animación de entrada y salida (transform).
 */
function useDragToClose(ref: React.RefObject<HTMLElement | null>, enabled: boolean, close: () => void) {
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    let y0 = 0
    let x0 = 0
    let base = 0
    let offset = 0
    let dragging = false
    let decided = false
    let scroller: HTMLElement | null = null
    let samples: Array<{ y: number; t: number }> = []
    let settle: { stop: () => void } | null = null

    const set = (v: number) => {
      offset = v
      el.style.translate = `0 ${v}px`
    }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length > 1) return
      const t = e.touches[0]
      const target = e.target as HTMLElement
      // Campos de texto y filas con scroll horizontal se quedan sus gestos
      if (target.closest('textarea, input, [data-no-sheet-drag]')) {
        decided = true
        dragging = false
        return
      }
      settle?.stop()
      y0 = t.clientY
      x0 = t.clientX
      dragging = false
      decided = false
      scroller = target.closest('.sheet-body')
      samples = [{ y: t.clientY, t: e.timeStamp }]
    }

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      const dy = t.clientY - y0
      const dx = t.clientX - x0
      if (!decided) {
        if (Math.hypot(dx, dy) < 6) return
        decided = true
        const atTop = !scroller || scroller.scrollTop <= 0
        dragging = dy > 0 && Math.abs(dy) > Math.abs(dx) && atTop
        base = dy
      }
      if (!dragging) return
      e.preventDefault()
      const d = dy - base
      // Hacia arriba apenas cede; hacia abajo va pegado al dedo
      set(d >= 0 ? d : d * 0.12)
      samples.push({ y: t.clientY, t: e.timeStamp })
      if (samples.length > 6) samples.shift()
    }

    const onEnd = () => {
      if (!dragging) return
      dragging = false
      const first = samples[0]
      const last = samples[samples.length - 1]
      const v = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0
      if (offset > CLOSE_DISTANCE || v > CLOSE_VELOCITY) {
        closeRef.current()
        return
      }
      settle = animate(offset, 0, { type: 'spring', stiffness: 520, damping: 40, velocity: v * 1000, onUpdate: set })
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      settle?.stop()
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [ref, enabled])
}

/**
 * Panel de cristal. En móvil sale desde abajo y se cierra arrastrándolo hacia abajo;
 * en desktop aparece flotando a la derecha.
 */
export function Sheet({ eyebrow, title, aside, children, onClose }: { eyebrow: string; title: string; aside?: ReactNode; children: ReactNode; onClose?: () => void }) {
  const setTab = useGrove((s) => s.setTab)
  const wide = useIsWide()
  const ref = useRef<HTMLElement>(null)
  const close = onClose ?? (() => setTab('garden'))
  useDragToClose(ref, !wide, close)

  const hidden = wide ? { opacity: 0, x: 48, scale: 0.98 } : { opacity: 0, y: 80, scale: 0.97 }

  return (
    <motion.section
      ref={ref}
      className="sheet glass"
      aria-label={title}
      initial={hidden}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ ...hidden, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
      transition={spring}
    >
      {!wide && <div className="sheet-grab" aria-hidden="true" />}
      <div className="sheet-body">
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <motion.h2 key={title} className="title" style={{ marginTop: 4 }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
              {title}
            </motion.h2>
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
        {children}
      </div>
    </motion.section>
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
