import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { CanvasTexture, Fog, SRGBColorSpace } from 'three'
import type { Daylight } from '../game/daylight'
import { seeded } from './lowpoly'

const W = 512

/**
 * Fondo de cielo: degradado vertical, halo detrás del jardín y estrellas de noche. El sol y la
 * luna no se dibujan aquí (se quedarían pegados a la pantalla al girar): son un resplandor en
 * la escena, ver SkyGlow. También pone la niebla que funde el mar de nubes con el horizonte.
 */
export function Sky({ light }: { light: Daylight }) {
  const scene = useThree((s) => s.scene)
  const viewport = useThree((s) => s.size)
  // El lienzo tiene la proporción de la pantalla, para que el sol sea redondo
  const H = Math.round(W * Math.min(2.4, Math.max(0.5, viewport.height / Math.max(1, viewport.width))))
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    return c
  }, [H])
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
    grad.addColorStop(0.72, light.skyBottom)
    grad.addColorStop(1, light.skyBottom)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    if (nightLevel > 0.2) {
      const rand = seeded(7)
      const count = Math.round(170 * (H / 1024))
      for (let i = 0; i < count; i++) {
        const x = rand() * W
        const y = rand() * H * 0.62
        const big = rand() < 0.08
        const alpha = (0.25 + rand() * 0.75) * (nightLevel - 0.2) * (1 - y / (H * 0.7))
        if (big) {
          // Algunas estrellas con un pequeño brillo alrededor
          const g = ctx.createRadialGradient(x, y, 0, x, y, 5)
          g.addColorStop(0, `rgba(255,255,255,${alpha})`)
          g.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.fillStyle = g
          ctx.fillRect(x - 5, y - 5, 10, 10)
        }
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, big ? 1.4 : 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Halo suave detrás del jardín
    const glow = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.75)
    glow.addColorStop(0, `rgba(255,255,255,${0.3 * (1 - nightLevel)})`)
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)
    texture.needsUpdate = true
  }, [canvas, texture, H, light.skyTop, light.skyBottom, nightLevel])

  useEffect(() => {
    scene.background = texture
    return () => {
      scene.background = null
    }
  }, [scene, texture])

  // Niebla del color del horizonte: lo lejano (el mar de nubes) se funde con el cielo
  useEffect(() => {
    scene.fog = new Fog(light.skyBottom, 18, 30)
    return () => {
      scene.fog = null
    }
  }, [scene, light.skyBottom])

  return null
}
