import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CloseIcon } from './icons'
import { spring } from './motion'
import { useDragToClose } from './Sheet'

/** Pantallas completas abiertas ahora mismo. Mientras haya alguna, el jardín 3D deja de dibujarse. */
let openPages = 0
const listeners = new Set<(n: number) => void>()
const notify = () => listeners.forEach((l) => l(openPages))

export function useFullPageOpen() {
  const [n, setN] = useState(openPages)
  useEffect(() => {
    listeners.add(setN)
    return () => void listeners.delete(setN)
  }, [])
  return n > 0
}

export type PageAccent = 'roots' | 'read' | 'album'

/**
 * Pantalla completa para lo inmersivo (escribir en Raíces, leer, el Álbum). Sube desde abajo con
 * muelle, tiene un título grande que al hacer scroll se compacta en una barra, como en iOS, y se
 * cierra con la X o arrastrando hacia abajo desde arriba del todo.
 */
export function Page({
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
  /** Color del aura de la cabecera: cada pantalla tiene el suyo. */
  accent?: PageAccent
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)
  useDragToClose(ref, true, onClose)

  useEffect(() => {
    openPages++
    notify()
    return () => {
      // Se avisa cuando la pantalla ya ha salido, para que el jardín no aparezca congelado
      setTimeout(() => {
        openPages--
        notify()
      }, 60)
    }
  }, [])

  const host = document.querySelector('.app') ?? document.body
  return createPortal(
    <motion.section
      ref={ref}
      className={accent ? `page page--${accent}` : 'page'}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%', transition: { type: 'spring', stiffness: 380, damping: 40 } }}
      transition={{ type: 'spring', stiffness: 330, damping: 36, mass: 0.9 }}
    >
      <div className={compact ? 'page-bar compact' : 'page-bar'}>
        {/* Asa: indica que se puede cerrar deslizando hacia abajo */}
        <span className="page-grab" aria-hidden="true" />
        <span className="page-bar-title">{title}</span>
        <div className="page-bar-actions">
          {aside}
          <button className="page-close press hit" onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={17} strokeWidth={2.4} />
          </button>
        </div>
      </div>
      <div ref={scroller} className="page-body sheet-body" onScroll={(e) => setCompact(e.currentTarget.scrollTop > 56)}>
        <div className="page-inner">
          <div className="page-aura" aria-hidden="true">
            <span />
            <span />
          </div>
          <header className="page-header">
            <div className="eyebrow">{eyebrow}</div>
            <motion.h1 key={title} className="page-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
              {title}
            </motion.h1>
            {hero && (
              <motion.div className="page-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.08 }}>
                {hero}
              </motion.div>
            )}
          </header>
          {children}
        </div>
      </div>
    </motion.section>,
    host,
  )
}

/** Pantalla completa que se abre desde dentro de otra (por ejemplo, el Álbum desde Tú). */
export function PageLayer({ open, children }: { open: boolean; children: ReactNode }) {
  return <AnimatePresence>{open && children}</AnimatePresence>
}
