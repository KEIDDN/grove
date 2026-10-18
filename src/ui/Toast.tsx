import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { audio } from '../audio/engine'
import { useGrove } from '../game/store'
import { CELEBRATION_ICONS } from './Celebrations'
import { flyCoins } from './CoinFlights'
import { CoinIcon } from './icons'
import { bouncy } from './motion'

/** Avisos con monedas que ya han lanzado sus monedas (en desarrollo los efectos se ejecutan dos veces). */
const launched = new Set<number>()

/** Aviso de arriba. Con icono es una celebración pequeña: suena y, si trae monedas, salen volando. */
export function Toast() {
  const toast = useGrove((s) => s.toast)
  const [visible, setVisible] = useState<typeof toast>(null)
  const coinsRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!toast) return
    setVisible(toast)
    if (toast.icon) audio.sfx('small')
    const coins = toast.coins
    let fly: ReturnType<typeof setTimeout> | undefined
    if (coins && !launched.has(toast.id)) {
      fly = setTimeout(() => {
        launched.add(toast.id)
        flyCoins(coinsRef.current ?? { x: window.innerWidth / 2, y: 110 }, coins)
      }, 380)
    }
    const id = setTimeout(() => setVisible(null), toast.icon ? 3200 : 2800)
    return () => {
      clearTimeout(id)
      if (fly) clearTimeout(fly)
      // Si llega otro aviso antes de que salgan, se suman sin vuelo
      if (coins && !launched.has(toast.id) && useGrove.getState().toast?.id !== toast.id) useGrove.getState().releaseCoins(coins)
    }
  }, [toast])
  const Icon = visible?.icon ? CELEBRATION_ICONS[visible.icon] : null
  return (
    <div className="toast-wrap" role="status">
      <AnimatePresence mode="popLayout">
        {visible && (
          <motion.div
            key={visible.id}
            className={Icon ? 'toast toast-rich glass' : 'toast glass'}
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } }}
            transition={bouncy}
          >
            {Icon && (
              <motion.span className="toast-icon" initial={{ scale: 0.3, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...bouncy, delay: 0.06 }}>
                <Icon size={15} />
              </motion.span>
            )}
            <span className="toast-text">{visible.text}</span>
            {!!visible.coins && (
              <span ref={coinsRef} className="toast-coins">
                <CoinIcon size={16} />+{visible.coins}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
