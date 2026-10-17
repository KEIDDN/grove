import { motion } from 'motion/react'
import { useGrove } from '../game/store'
import { formatClock } from '../game/time'
import { useSessionClock } from './sheets/TendSheet'

/** Solo el jardín y el tiempo: para dejar el móvil boca arriba sin tocarlo. */
export function RestMode() {
  const setRest = useGrove((s) => s.setRestMode)
  const clock = useSessionClock()
  if (!clock) return null
  const free = clock.remaining === null
  return (
    <motion.button
      className="layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={() => setRest(false)}
      aria-label="Salir del modo reposo"
      style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 'calc(var(--safe-bottom) + 56px)', gap: 10 }}
    >
      <span className="eyebrow">{free ? 'Cultivando' : 'Quedan'}</span>
      <span className="display" style={{ fontSize: 'clamp(72px, 18vw, 120px)' }}>
        {formatClock(free ? clock.elapsed : (clock.remaining ?? 0))}
      </span>
      <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
        Toca para volver
      </span>
    </motion.button>
  )
}
