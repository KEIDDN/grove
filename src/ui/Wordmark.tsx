import { motion } from 'motion/react'

/**
 * El nombre de la app, "tendu", con su propia letra (Fraunces suave y en negrita: orgánica y
 * cálida) y una hojita que brota de la "t". Con `animate`, las letras suben una a una y la hoja
 * crece al final, como algo que nace.
 */
export function Wordmark({ size = 40, animate = false, delay = 0 }: { size?: number; animate?: boolean; delay?: number }) {
  const letters = 'tendu'.split('')
  return (
    <span className="wordmark" style={{ fontSize: size }} aria-label="tendu" role="img">
      {letters.map((l, i) => (
        <motion.span
          key={i}
          className="wordmark-letter"
          aria-hidden="true"
          initial={animate ? { opacity: 0, y: '0.35em' } : false}
          animate={{ opacity: 1, y: '0em' }}
          transition={{ type: 'spring', duration: 0.9, bounce: 0.25, delay: delay + i * 0.07 }}
        >
          {l}
          {i === 0 && (
            <motion.svg
              className="wordmark-leaf"
              viewBox="0 0 24 24"
              aria-hidden="true"
              initial={animate ? { scale: 0, rotate: -40 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.8, bounce: 0.45, delay: delay + 0.55 }}
            >
              <path d="M3 21c0-9 6-16 18-18-1 11-8 17-18 18z" fill="currentColor" />
              <path d="M3 21C8 15 12 11 17 7" fill="none" stroke="var(--wordmark-vein, rgba(255,255,255,0.55))" strokeWidth="1.4" strokeLinecap="round" />
            </motion.svg>
          )}
        </motion.span>
      ))}
    </span>
  )
}
