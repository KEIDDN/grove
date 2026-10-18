import { useRef } from 'react'
import { AnimatePresence, motion, type Variants } from 'motion/react'

/**
 * Cifras "mantequilla", como el texto numérico de iOS: solo se mueven las cifras que cambian. La
 * nueva entra desde abajo (o desde arriba si el número baja) mientras la vieja sale por el lado
 * contrario, las dos con un leve desenfoque y un muelle sin rebote. Cuando cambian varias, van en
 * cascada de derecha a izquierda, como un contador real.
 */

type Dir = 1 | -1

const variants: Variants = {
  enter: (d: Dir) => ({ y: d > 0 ? '0.36em' : '-0.36em', opacity: 0, filter: 'blur(5px)', scale: 0.94 }),
  center: { y: '0em', opacity: 1, filter: 'blur(0px)', scale: 1 },
  exit: (d: Dir) => ({ y: d > 0 ? '-0.36em' : '0.36em', opacity: 0, filter: 'blur(5px)', scale: 0.94 }),
}

export function NumericText({
  value,
  direction,
  fast,
}: {
  value: string | number
  /** Fuerza el sentido (la cuenta atrás siempre baja). Si no, se deduce comparando con el anterior. */
  direction?: Dir
  /** Para cambios muy seguidos (al arrastrar o contar), un muelle más corto. */
  fast?: boolean
}) {
  const text = String(value)
  const prev = useRef(text)
  const dir = useRef<Dir>(1)
  if (prev.current !== text) {
    const a = Number(prev.current.replace(/\D/g, ''))
    const b = Number(text.replace(/\D/g, ''))
    dir.current = direction ?? (b >= a ? 1 : -1)
    prev.current = text
  }
  const d = direction ?? dir.current
  const chars = text.split('')
  const duration = fast ? 0.32 : 0.6
  return (
    <span className="numeric-text" aria-label={text}>
      <AnimatePresence initial={false} mode="popLayout">
        {chars.map((c, i) => {
          // Cada hueco se identifica por su posición desde la derecha: las unidades siempre son las unidades
          const slot = chars.length - i
          return (
            <motion.span key={`s${slot}`} layout="position" className="nt-slot" transition={{ type: 'spring', duration, bounce: 0 }} aria-hidden="true">
              <AnimatePresence initial={false} mode="popLayout" custom={d}>
                <motion.span
                  key={c}
                  custom={d}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', duration, bounce: 0, delay: fast ? 0 : (slot - 1) * 0.035 }}
                  className="nt-char"
                >
                  {c}
                </motion.span>
              </AnimatePresence>
            </motion.span>
          )
        })}
      </AnimatePresence>
    </span>
  )
}
