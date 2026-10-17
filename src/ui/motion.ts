import { useEffect, useState } from 'react'
import type { Transition } from 'motion/react'

// Muelles compartidos: todo en la interfaz se mueve con la misma "física".
export const spring: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }
export const softSpring: Transition = { type: 'spring', stiffness: 260, damping: 30 }
export const bouncy: Transition = { type: 'spring', stiffness: 520, damping: 22 }

/** true en pantallas anchas (desktop), donde los paneles salen por la derecha. */
export function useIsWide(min = 1000) {
  const query = `(min-width: ${min}px)`
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return wide
}

/** Vibración mínima en móviles que lo permiten (Android); en el resto no hace nada. */
export function tap(ms = 8) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(ms)
}
