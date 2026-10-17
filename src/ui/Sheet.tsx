import type { ReactNode } from 'react'
import { motion, useDragControls, type PanInfo } from 'motion/react'
import { useGrove } from '../game/store'
import { CloseIcon } from './icons'
import { spring, useIsWide } from './motion'

/**
 * Panel de cristal. En móvil sale desde abajo y se cierra arrastrándolo hacia abajo
 * desde la cabecera; en desktop aparece flotando a la derecha.
 */
export function Sheet({ eyebrow, title, aside, children, onClose }: { eyebrow: string; title: string; aside?: ReactNode; children: ReactNode; onClose?: () => void }) {
  const setTab = useGrove((s) => s.setTab)
  const wide = useIsWide()
  const controls = useDragControls()
  const close = onClose ?? (() => setTab('garden'))

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 650) close()
  }

  const hidden = wide ? { opacity: 0, x: 48, scale: 0.98 } : { opacity: 0, y: 80, scale: 0.97 }

  return (
    <motion.section
      className="sheet glass"
      aria-label={title}
      initial={hidden}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ ...hidden, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
      transition={spring}
      drag={wide ? false : 'y'}
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.04, bottom: 0.7 }}
      onDragEnd={onDragEnd}
    >
      {!wide && <div className="sheet-grab" onPointerDown={(e) => controls.start(e)} aria-hidden="true" />}
      <div className="sheet-body">
        <header
          onPointerDown={(e) => !wide && controls.start(e)}
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20, touchAction: 'none' }}
        >
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <motion.h2 key={title} className="title" style={{ marginTop: 4 }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
              {title}
            </motion.h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {aside}
            <button
              className="press"
              onClick={close}
              onPointerDown={(e) => e.stopPropagation()}
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
