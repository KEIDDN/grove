import { useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useTransform, type MotionValue } from 'motion/react'

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
// Muelle rápido y sin rebote: al arrastrar, cada cifra sigue al dedo sin quedarse atrás
const roll = { type: 'spring', stiffness: 520, damping: 40, mass: 0.6 } as const

/** Una columna de 0 a 9 que se desliza hasta la cifra, como un contador mecánico. */
function Digit({ value }: { value: number }) {
  return (
    <span style={{ display: 'inline-block', height: '1em', overflow: 'hidden', lineHeight: 1 }}>
      <motion.span style={{ display: 'flex', flexDirection: 'column' }} initial={false} animate={{ y: `${-value}em` }} transition={roll}>
        {DIGITS.map((d) => (
          <span key={d} style={{ height: '1em', lineHeight: 1 }}>
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

/**
 * Número grande en el que cada cifra rueda hasta la nueva al cambiar. Las cifras se identifican
 * por su posición desde la derecha, así pasar de 25 a 45 solo hace rodar las decenas. Si cambia el
 * número de cifras, la que sobra o falta entra o sale con un fundido. `null` muestra ∞.
 */
export function RollingNumber({ value }: { value: number | null }) {
  const digits = value === null ? [] : String(value).split('').map(Number)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }} aria-label={value === null ? 'sin límite' : String(value)}>
      <AnimatePresence initial={false} mode="popLayout">
        {value === null ? (
          <motion.span key="inf" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={roll}>
            ∞
          </motion.span>
        ) : (
          digits.map((d, i) => {
            const fromRight = digits.length - i
            return (
              <motion.span
                key={`d${fromRight}`}
                layout
                initial={{ opacity: 0, y: '0.3em' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '-0.3em' }}
                transition={roll}
                style={{ display: 'inline-block' }}
                aria-hidden="true"
              >
                <Digit value={d} />
              </motion.span>
            )
          })
        )}
      </AnimatePresence>
    </span>
  )
}

const STRIP = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

/** Posición continua (0–10) de la columna `k` (0 = unidades) para un valor con decimales. */
function columnPosition(v: number, k: number) {
  const unit = 10 ** k
  if (k === 0) return ((v % 10) + 10) % 10
  // Una columna solo rueda mientras las de su derecha pasan de 9 a 0, como un cuentakilómetros
  const below = v % unit
  const carry = Math.max(0, below - (unit - 1))
  return (Math.floor(v / unit) % 10) + carry
}

function OdometerColumn({ value, k }: { value: MotionValue<number>; k: number }) {
  const y = useTransform(value, (v) => `${-columnPosition(v, k)}em`)
  return (
    <span style={{ display: 'inline-block', height: '1em', overflow: 'hidden', lineHeight: 1 }}>
      <motion.span style={{ display: 'flex', flexDirection: 'column', y }}>
        {STRIP.map((d, i) => (
          <span key={i} style={{ height: '1em', lineHeight: 1 }}>
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

/**
 * Número que rueda de forma continua siguiendo un valor con decimales: al arrastrar, las cifras
 * se mueven pegadas al dedo y, al soltar, se asientan con un muelle. Las cifras de la izquierda que
 * aparecen o desaparecen (9 → 10) entran con un fundido.
 */
export function Odometer({ value }: { value: MotionValue<number> }) {
  const digits = (v: number) => String(Math.max(0, Math.floor(v + 0.0001))).length
  const [len, setLen] = useState(() => digits(value.get()))
  useMotionValueEvent(value, 'change', (v) => {
    const n = digits(v)
    if (n !== len) setLen(n)
  })
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }} aria-hidden="true">
      <AnimatePresence initial={false} mode="popLayout">
        {Array.from({ length: len }, (_, i) => len - 1 - i).map((k) => (
          <motion.span
            key={`k${k}`}
            layout
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.25 }}
            style={{ display: 'inline-block' }}
          >
            <OdometerColumn value={value} k={k} />
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  )
}
