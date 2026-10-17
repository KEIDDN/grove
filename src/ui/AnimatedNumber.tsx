import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'

/** Número que cuenta hasta su nuevo valor y da un pequeño salto al cambiar. */
export function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => Math.round(v).toString())
  const first = useRef(true)
  const bump = useMotionValue(1)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const a = animate(mv, value, { duration: 0.8, ease: [0.2, 0.8, 0.2, 1] })
    void animate(bump, [1, 1.18, 1], { duration: 0.45 })
    return () => a.stop()
  }, [value, mv, bump])
  return <motion.span style={{ display: 'inline-block', scale: bump, fontVariantNumeric: 'tabular-nums' }}>{text}</motion.span>
}
