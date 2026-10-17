import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing'
import type { Group, OrthographicCamera } from 'three'
import { plotBounds } from '../game/garden'
import { useGrove, usePlots, useSeason } from '../game/store'
import { SEASONS } from '../game/seasons'
import { Clouds } from './Clouds'
import { Decor } from './Decor'
import { EditLayer } from './EditLayer'
import { Floors } from './Floors'
import { Island } from './Island'
import { PlacedItem } from './items'
import { Life } from './Life'
import { Particles } from './Particles'
import { Sky } from './Sky'
import { useDaylight } from './useDaylight'

/**
 * Encuadre: el jardín siempre centrado y a buen tamaño. En pantallas estrechas, cuando
 * se abre un panel desde abajo, sube y se encoge para seguir viéndose entero.
 */
function CameraRig({ size }: { size: number }) {
  const { camera, size: viewport } = useThree()
  const sheetOpen = useGrove((s) => !s.splash && !s.restMode && (s.tab !== 'garden' || !s.onboarded))
  const rest = useGrove((s) => s.restMode)
  const splash = useGrove((s) => s.splash)
  const onboarding = useGrove((s) => !s.splash && !s.onboarded)
  const offset = useRef(0)
  useFrame((_, delta) => {
    const cam = camera as OrthographicCamera
    const { width, height } = viewport
    const narrow = width < 1000
    // En el inicio el jardín baja para dejar sitio al nombre
    // La bienvenida ocupa más pantalla: el jardín sube más y se hace más pequeño
    const lift = splash ? -height * 0.1 : onboarding && narrow ? height * 0.34 : sheetOpen && narrow ? height * 0.27 : rest ? height * 0.07 : height * 0.02
    const factor = splash ? 0.85 : onboarding && narrow ? 0.45 : sheetOpen && narrow ? 0.6 : 1
    const usable = Math.min(width, height * 0.78, 780)
    const targetZoom = ((usable * 0.9) / (size * 1.42 + 0.4)) * factor
    const k = Math.min(1, delta * 4)
    cam.zoom += (targetZoom - cam.zoom) * k
    offset.current += (lift - offset.current) * k
    cam.setViewOffset(width, height, 0, offset.current, width, height)
    cam.updateProjectionMatrix()
  })
  return null
}

/** Mece el jardín arriba y abajo y lo mantiene centrado (se desliza al añadir parcelas). */
function Floating({ center, children }: { center: [number, number]; children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }, delta) => {
    const g = ref.current
    if (!g) return
    const k = Math.min(1, delta * 4)
    g.position.x += (-center[0] - g.position.x) * k
    g.position.z += (-center[1] - g.position.z) * k
    g.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.05
  })
  return (
    <group ref={ref} position={[-center[0], 0, -center[1]]}>
      {children}
    </group>
  )
}

export function GardenCanvas() {
  const items = useGrove((s) => s.items)
  const floors = useGrove((s) => s.floors)
  const painting = useGrove((s) => s.editMode && s.editTool === 'paint')
  const plots = usePlots()
  const bounds = useMemo(() => plotBounds(plots), [plots])
  const size = bounds.span
  const theme = SEASONS[useSeason()]
  const visible = items
  const light = useDaylight()
  // Calidad adaptativa en un solo sentido: si el dispositivo va justo, bajamos la calidad una vez y no
  // volvemos a subirla. Alternar resolución o efectos obliga a recrear buffers y shaders, y eso se ve
  // como parpadeos en negro.
  const [low, setLow] = useState(false)
  const degrade = () => setLow(true)
  const sunDistance = 10
  const sun: [number, number, number] = [
    Math.cos(light.sunAzimuth) * Math.cos(light.sunElevation) * sunDistance,
    Math.sin(light.sunElevation) * sunDistance,
    Math.sin(light.sunAzimuth) * Math.cos(light.sunElevation) * sunDistance,
  ]

  return (
    <Canvas
      className="garden-canvas"
      shadows
      orthographic
      dpr={low ? 1 : [1, 1.75]}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      camera={{ position: [9, 8.2, 9], zoom: 60, near: -50, far: 100 }}
    >
      <PerformanceMonitor ms={1000} iterations={6} onDecline={degrade} onFallback={degrade} />
      <CameraRig size={size} />
      <Sky light={light} />
      <hemisphereLight args={[light.skyTop, '#B49470', light.hemiIntensity]} />
      <ambientLight intensity={0.22 + light.night * 0.1} color={light.night > 0.5 ? '#9FB0E0' : '#FFFFFF'} />
      <directionalLight
        position={sun}
        intensity={light.sunIntensity}
        color={light.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0006}
        shadow-normalBias={0.025}
      />
      <directionalLight position={[-6, 4, -5]} intensity={0.35 + light.night * 0.25} color="#DCE8FF" />

      <Floating center={[bounds.cx, bounds.cz]}>
        <Island plots={plots} theme={theme} />
        <Floors floors={floors} plots={plots} />
        <Decor plots={plots} theme={theme} items={visible} floors={floors} />
        {visible.map((it) => (
          <PlacedItem key={it.id} item={it} theme={theme} />
        ))}
        <EditLayer plots={plots} theme={theme} />
      </Floating>
      <Clouds size={size} />
      <Particles theme={theme} spread={size} />
      <Life theme={theme} size={size} night={light.night} />

      <OrbitControls
        target={[0, 0.15, 0]}
        enabled={!painting}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.92}
        maxPolarAngle={1.02}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
      />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <N8AO aoRadius={0.45} distanceFalloff={0.6} intensity={low ? 1.4 : 2.4} halfRes quality="medium" color="#3A2E22" />
        <Bloom mipmapBlur luminanceThreshold={0.82} luminanceSmoothing={0.2} intensity={0.35 + light.night * 0.6} />
        <Vignette offset={0.32} darkness={0.32} />
        <SMAA />
      </EffectComposer>
    </Canvas>
  )
}
