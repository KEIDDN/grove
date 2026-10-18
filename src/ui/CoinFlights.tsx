import { motion } from 'motion/react'
import { create } from 'zustand'
import { audio } from '../audio/engine'
import { useGrove } from '../game/store'
import { CoinIcon } from './icons'

/**
 * Monedas que vuelan hasta el contador de arriba. Da igual cuántas ganes: vuelan unas pocas y
 * cada una lleva una parte. El contador resta las que aún están en el aire (`coinsHeld`) y sube
 * al ritmo en que van llegando, con un pequeño pop y un "tin" que sube de nota.
 */

interface Flight {
  id: number
  from: { x: number; y: number }
  to: { x: number; y: number }
  /** Hacia dónde se abre antes de ir al contador. */
  burst: { x: number; y: number }
  delay: number
  value: number
  index: number
}

const useFlights = create<{ flights: Flight[] }>(() => ({ flights: [] }))
let flightId = 0

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Contador de monedas de la barra superior (lo marca `data-coin-target`). */
function target() {
  const el = document.querySelector<HTMLElement>('[data-coin-target]')
  if (!el) return null
  const r = el.getBoundingClientRect()
  // El icono está a la izquierda del contador
  return { x: r.left + 21, y: r.top + r.height / 2 }
}

/** Lanza `amount` monedas desde un punto de la pantalla (o desde un elemento). */
export function flyCoins(from: HTMLElement | { x: number; y: number } | null, amount: number) {
  if (amount <= 0) return
  const to = target()
  let start = from instanceof HTMLElement ? centerOf(from) : from
  if (!to || reduced()) return useGrove.getState().releaseCoins(amount)
  start ??= { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  const n = Math.max(3, Math.min(9, Math.round(amount / 8)))
  const base = Math.floor(amount / n)
  const flights: Flight[] = Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2 + Math.random() * 0.6
    const radius = 26 + Math.random() * 26
    return {
      id: ++flightId,
      from: start!,
      to,
      burst: { x: start!.x + Math.cos(angle) * radius, y: start!.y + Math.sin(angle) * radius * 0.8 - 14 },
      delay: i * 0.055,
      // La última moneda se lleva el resto, para que sumen exacto
      value: i === n - 1 ? amount - base * (n - 1) : base,
      index: i,
    }
  })
  useFlights.setState((s) => ({ flights: [...s.flights, ...flights] }))
}

function centerOf(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

function land(f: Flight) {
  useFlights.setState((s) => ({ flights: s.flights.filter((x) => x.id !== f.id) }))
  useGrove.getState().releaseCoins(f.value)
  audio.sfx('coin', f.index)
  window.dispatchEvent(new CustomEvent('coin-land'))
}

export function CoinFlights() {
  const flights = useFlights((s) => s.flights)
  return (
    <div className="coin-flights" aria-hidden="true">
      {flights.map((f) => (
        <motion.div
          key={f.id}
          className="coin-flight"
          initial={{ x: f.from.x, y: f.from.y, scale: 0.3, opacity: 0 }}
          animate={{
            x: [f.from.x, f.burst.x, f.to.x],
            y: [f.from.y, f.burst.y, f.to.y],
            scale: [0.3, 1.15, 0.62],
            opacity: [0, 1, 1],
          }}
          transition={{ duration: 0.95, delay: f.delay, times: [0, 0.32, 1], ease: [0.45, 0, 0.2, 1] }}
          onAnimationComplete={() => land(f)}
        >
          <CoinIcon size={26} />
        </motion.div>
      ))}
    </div>
  )
}
