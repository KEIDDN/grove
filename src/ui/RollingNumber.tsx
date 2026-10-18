import { AnimatePresence, motion } from 'motion/react'

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
