import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { CanvasTexture, Fog, SRGBColorSpace } from 'three'
import type { Daylight } from '../game/daylight'
import { seeded } from './lowpoly'

const W = 512

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/**
 * Posición en pantalla de un astro que cruza el cielo de izquierda a derecha.
 * `t` va de 0 (sale) a 1 (se pone); a mitad de recorrido está en lo más alto.
 */
function arc(t: number, h: number): [number, number] {
  return [W * (0.1 + 0.8 * t), h * (0.36 - 0.24 * Math.sin(t * Math.PI))]
}

/** Visibilidad al salir y al ponerse: aparece y desaparece suave, nunca de golpe. */
const edgeFade = (t: number) => clamp01(Math.min(t, 1 - t) / 0.08)

function drawSun(ctx: CanvasRenderingContext2D, h: number, hour: number, color: string) {
  const t = (hour - 6.6) / (20.2 - 6.6)
  if (t <= 0 || t >= 1) return
  const a = edgeFade(t)
  const [x, y] = arc(t, h)
  // Halo amplio y cálido, luego el disco con el borde suave
  const halo = ctx.createRadialGradient(x, y, 0, x, y, W * 0.42)
  halo.addColorStop(0, rgba(color, 0.55 * a))
  halo.addColorStop(0.25, rgba(color, 0.18 * a))
  halo.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, W, h)
  const r = W * 0.05
  const disc = ctx.createRadialGradient(x, y, 0, x, y, r * 1.25)
  disc.addColorStop(0, `rgba(255,253,246,${a})`)
  disc.addColorStop(0.78, `rgba(255,250,236,${a})`)
  disc.addColorStop(1, 'rgba(255,250,236,0)')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(x, y, r * 1.25, 0, Math.PI * 2)
  ctx.fill()
}

function drawMoon(ctx: CanvasRenderingContext2D, h: number, hour: number) {
  // La luna cruza de las 19:30 a las 7
  const t = (((hour - 19.5 + 24) % 24) / 11.5)
  if (t <= 0 || t >= 1) return
  const a = edgeFade(t)
  const [x, y] = arc(t, h)
  const halo = ctx.createRadialGradient(x, y, 0, x, y, W * 0.3)
  halo.addColorStop(0, `rgba(200,212,255,${0.32 * a})`)
  halo.addColorStop(1, 'rgba(200,212,255,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, W, h)
  // Creciente: un disco al que se le recorta otro desplazado, en un lienzo aparte
  const r = W * 0.04
  const off = document.createElement('canvas')
  off.width = off.height = Math.ceil(r * 2 + 4)
  const o = off.getContext('2d')!
  const c = off.width / 2
  o.fillStyle = '#F6F2E8'
  o.beginPath()
  o.arc(c, c, r, 0, Math.PI * 2)
  o.fill()
  o.globalCompositeOperation = 'destination-out'
  o.beginPath()
  o.arc(c + r * 0.55, c - r * 0.3, r * 0.92, 0, Math.PI * 2)
  o.fill()
  ctx.globalAlpha = a
  ctx.drawImage(off, x - c, y - c)
  ctx.globalAlpha = 1
}

/**
 * Fondo de cielo: degradado vertical, halo detrás del jardín, sol o luna que cruzan con la hora
 * real y estrellas de noche. También pone la niebla que funde el mar de nubes con el horizonte.
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
  // Redibujar como mucho cada pocos minutos de "hora"
  const hourStep = Math.round(light.hour * 12) / 12

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

    drawSun(ctx, H, hourStep, light.sunColor)
    drawMoon(ctx, H, hourStep)

    // Halo suave detrás del jardín
    const glow = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.75)
    glow.addColorStop(0, `rgba(255,255,255,${0.3 * (1 - nightLevel)})`)
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)
    texture.needsUpdate = true
  }, [canvas, texture, H, light.skyTop, light.skyBottom, light.sunColor, nightLevel, hourStep])

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
