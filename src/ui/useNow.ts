import { useEffect, useState } from 'react'

/** Devuelve la hora actual y se refresca cada `ms` mientras `active` sea true. */
export function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [active, ms])
  return now
}
