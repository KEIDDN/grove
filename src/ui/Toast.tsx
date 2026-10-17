import { useEffect, useState } from 'react'
import { useGrove } from '../game/store'

export function Toast() {
  const toast = useGrove((s) => s.toast)
  const [visible, setVisible] = useState<typeof toast>(null)
  useEffect(() => {
    if (!toast) return
    setVisible(toast)
    const id = setTimeout(() => setVisible(null), 2800)
    return () => clearTimeout(id)
  }, [toast])
  if (!visible) return null
  return (
    <div key={visible.id} className="toast glass" role="status">
      {visible.text}
    </div>
  )
}
