import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, Color, ShaderMaterial, Vector2 } from 'three'
import type { Daylight } from '../game/daylight'
import { useGrove } from '../game/store'
import { HOME_AZIMUTH, view } from './camera'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
/** Aparece y desaparece suave al salir y al ponerse. */
const edgeFade = (t: number) => (t <= 0 || t >= 1 ? 0 : clamp01(Math.min(t, 1 - t) / 0.12))

/**
 * Dónde cae un astro en la pantalla. Vive detrás de la isla en la vista inicial y se desplaza de
 * izquierda a derecha con la hora; al girar el jardín, se mueve con él y acaba saliendo de la vista.
 * Devuelve [x, y] en coordenadas de pantalla (-1..1) y cuánto se ve (0..1).
 */
function place(t: number, out: Vector2): number {
  const azimuth = HOME_AZIMUTH + Math.PI + (t - 0.5) * 1.5
  const rel = azimuth - view.azimuth - Math.PI
  const facing = Math.cos(rel)
  out.set(Math.sin(rel) * 1.1, 0.05 + Math.sin(t * Math.PI) * 0.55)
  return edgeFade(t) * smoothstep(-0.1, 0.7, facing)
}

const vertexShader = /* glsl */ `
  varying vec2 vNdc;
  void main() {
    vNdc = position.xy;
    // Pegado al fondo: lo que hay en la escena lo tapa (el sol puede quedar detrás del árbol)
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec2 uSun;
  uniform vec3 uSunColor;
  uniform float uSunA;
  uniform vec2 uMoon;
  uniform float uMoonA;
  uniform float uAspect;
  varying vec2 vNdc;

  float glow(vec2 p, float r) {
    vec2 d = (vNdc - p) * vec2(uAspect, 1.0);
    return exp(-dot(d, d) / (r * r));
  }

  void main() {
    // Sin disco: un resplandor amplio y un núcleo suave, como luz detrás de una neblina
    float s = glow(uSun, 0.6) * 0.14 + glow(uSun, 0.2) * 0.22 + glow(uSun, 0.06) * 0.4;
    float m = glow(uMoon, 0.5) * 0.12 + glow(uMoon, 0.05) * 0.55;
    vec3 col = uSunColor * s * uSunA + vec3(0.8, 0.85, 1.0) * m * uMoonA;
    gl_FragColor = vec4(col, 1.0);
  }
`

/** Sol y luna como luz en el cielo, no como dibujos: cambian con la hora y se mueven al girar. */
export function SkyGlow({ light }: { light: Daylight }) {
  const size = useThree((s) => s.size)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uSun: { value: new Vector2() },
          uSunColor: { value: new Color() },
          uSunA: { value: 0 },
          uMoon: { value: new Vector2() },
          uMoonA: { value: 0 },
          uAspect: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )

  const shown = useRef(1)
  useFrame((_, delta) => {
    const u = material.uniforms
    // Con un panel abierto el jardín sube y se encoge: el resplandor se apaga para no quedar suelto
    const st = useGrove.getState()
    const away = !st.splash && !st.restMode && st.onboarded && st.tab !== 'garden'
    shown.current += ((away ? 0 : 1) - shown.current) * (1 - Math.exp(-delta * 4))
    const h = light.hour
    // Día de 6:36 a 20:12; noche de 19:30 a 7:00
    const sunA = place((h - 6.6) / (20.2 - 6.6), u.uSun.value)
    const moonA = place(((h - 19.5 + 24) % 24) / 11.5, u.uMoon.value)
    // Más intenso y cálido al amanecer y al atardecer, más tenue a mediodía sobre el cielo claro
    const low = 1 - Math.sin(clamp01((h - 6.6) / 13.6) * Math.PI)
    u.uSunA.value = sunA * (0.6 + low * 0.9) * (1 - light.night * 0.7) * shown.current
    u.uSunColor.value.set(light.sunColor)
    u.uMoonA.value = moonA * light.night * shown.current
    u.uAspect.value = size.width / Math.max(1, size.height)
  })

  return (
    <mesh material={material} frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
