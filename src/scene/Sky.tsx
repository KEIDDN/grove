import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Daylight } from '../game/daylight'
import { seeded } from './lowpoly'

const W = 512
const H = 1024

/** Fondo de cielo: degradado vertical, un halo cálido detrás del jardín y estrellas de noche. */
export function Sky({ light }: { light: Daylight }) {
  const scene = useThree((s) => s.scene)
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    return c
  }, [])
  const texture = useMemo(() => {
    const t = new CanvasTexture(canvas)
    t.colorSpace = SRGBColorSpace
    return t
  }, [canvas])

  const nightLevel = Math.round(light.night * 20) / 20

  useEffect(() => {
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, light.skyTop)
    grad.addColorStop(0.75, light.skyBottom)
    grad.addColorStop(1, light.skyBottom)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Halo suave detrás del jardín
    const glow = ctx.createRadialGradient(W / 2, H * 0.48, 0, W / 2, H * 0.48, W * 0.75)
    glow.addColorStop(0, `rgba(255,255,255,${0.35 * (1 - nightLevel)})`)
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    if (nightLevel > 0.2) {
      const rand = seeded(7)
      for (let i = 0; i < 160; i++) {
        const x = rand() * W
        const y = rand() * H * 0.7
        const r = rand() < 0.1 ? 1.6 : 0.9
        ctx.fillStyle = `rgba(255,255,255,${(0.3 + rand() * 0.7) * (nightLevel - 0.2)})`
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    texture.needsUpdate = true
  }, [canvas, texture, light.skyTop, light.skyBottom, nightLevel])

  useEffect(() => {
    scene.background = texture
    return () => {
      scene.background = null
    }
  }, [scene, texture])

  return null
}
