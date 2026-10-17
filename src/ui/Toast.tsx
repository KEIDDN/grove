import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useGrove } from '../game/store'
import { bouncy } from './motion'

export function Toast() {
  const toast = useGrove((s) => s.toast)
  const [visible, setVisible] = useState<typeof toast>(null)
  useEffect(() => {
    if (!toast) return
    setVisible(toast)
    const id = setTimeout(() => setVisible(null), 2800)
    return () => clearTimeout(id)
  }, [toast])
  return (
    <div className="toast-wrap" role="status">
      <AnimatePresence mode="popLayout">
        {visible && (
          <motion.div
            key={visible.id}
            className="toast glass"
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } }}
            transition={bouncy}
          >
            {visible.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
