import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing'
import type { Group, OrthographicCamera } from 'three'
import { plotBounds, type GardenItem, type Plot } from '../game/garden'
import { useGrove, usePlots, useSeason } from '../game/store'
import { SEASONS, type SeasonTheme } from '../game/seasons'
import { breath } from './breath'
import { Visitors } from './Visitors'
import { useWeather, WeatherLayer } from './Weather'
import { framing, resetView, stepView, view } from './camera'
import { Gestures } from './Gestures'
import { useSheetExpanded } from '../ui/Sheet'
import { Clouds } from './Clouds'
import { CloudSea } from './CloudSea'
import { Decor } from './Decor'
import { EditLayer } from './EditLayer'
import { Floors } from './Floors'
import { Island } from './Island'
import { PlacedItem } from './items'
import { Life } from './Life'
import { Particles } from './Particles'
import { Sky } from './Sky'
import { SkyGlow } from './SkyGlow'
import { useDaylight } from './useDaylight'

/** Móvil o tablet: pantalla táctil, GPU más modesta. */
const COARSE = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/**
 * Encuadre: el jardín siempre centrado y a buen tamaño. En pantallas estrechas, cuando
 * se abre un panel desde abajo, sube y se encoge para seguir viéndose entero. Encima de ese
 * encuadre automático van el giro, el zoom y el desplazamiento de los gestos (camera.ts).
 */
function CameraRig({ size }: { size: number }) {
  const { camera, size: viewport } = useThree()
  const sheetOpen = useGrove((s) => !s.splash && !s.restMode && (s.tab !== 'garden' || !s.onboarded))
  const rest = useGrove((s) => s.restMode)
  const splash = useGrove((s) => s.splash)
  const onboarding = useGrove((s) => !s.splash && !s.onboarded)
  const offset = useRef(0)
  const auto = useRef(0)
  useEffect(() => {
    view.halfSpan = size / 2
  }, [size])
  // Al abrir un panel o volver a la portada, la vista vuelve a la inicial
  useEffect(() => {
    if (sheetOpen || splash || rest) resetView()
  }, [sheetOpen, splash, rest])
  useFrame((_, delta) => {
    const cam = camera as OrthographicCamera
    const { width, height } = viewport
    const narrow = width < 1000
    // En el inicio el jardín baja para dejar sitio al nombre
    // La bienvenida ocupa más pantalla: el jardín sube más y se hace más pequeño
    const lift = onboarding && framing.active ? height * framing.lift : splash ? -height * 0.1 : onboarding && narrow ? height * 0.34 : sheetOpen && narrow ? height * 0.3 : rest ? height * 0.07 : height * 0.02
    const factor = onboarding && framing.active ? framing.factor : splash ? 0.85 : onboarding && narrow ? 0.45 : sheetOpen && narrow ? 0.55 : 1
    const usable = Math.min(width, height * 0.78, 780)
    const targetZoom = ((usable * 0.9) / (size * 1.42 + 0.4)) * factor
    const k = 1 - Math.exp(-delta * 5)
    auto.current = auto.current === 0 ? cam.zoom : auto.current + (targetZoom - auto.current) * k
    offset.current += (lift - offset.current) * k

    stepView(delta)
    const r = 15
    const tx = view.panX
    const tz = view.panZ
    cam.position.set(tx + Math.cos(view.azimuth) * Math.sin(view.polar) * r, 0.15 + Math.cos(view.polar) * r, tz + Math.sin(view.azimuth) * Math.sin(view.polar) * r)
    cam.lookAt(tx, 0.15, tz)
    cam.zoom = auto.current * view.zoom
    cam.setViewOffset(width, height, 0, offset.current, width, height)
    cam.updateProjectionMatrix()
  })
  return null
}

/**
 * Mece el jardín arriba y abajo y lo mantiene centrado (se desliza al añadir parcelas).
 * En modo edición se queda quieto, para que lo que tocas esté donde lo ves.
 */
function Floating({ center, children, groupRef }: { center: [number, number]; children: React.ReactNode; groupRef: React.RefObject<Group | null> }) {
  const amp = useRef(1)
  const filled = useRef(0)
  useFrame(({ clock }, delta) => {
    const g = groupRef.current
    if (!g) return
    const k = Math.min(1, delta * 4)
    g.position.x += (-center[0] - g.position.x) * k
    g.position.z += (-center[1] - g.position.z) * k
    const still = useGrove.getState().editMode || view.held
    amp.current += ((still ? 0 : 1) - amp.current) * Math.min(1, delta * 3)
    // Al respirar en Calma la isla se hincha y se eleva un poco con cada inspiración
    filled.current += ((breath.active ? breath.fill : 0) - filled.current) * Math.min(1, delta * 6)
    g.scale.setScalar(1 + filled.current * 0.045)
    g.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.05 * amp.current * (breath.active ? 0.3 : 1) + filled.current * 0.12
  })
  return (
    <group ref={groupRef} position={[-center[0], 0, -center[1]]}>
      {children}
    </group>
  )
}

/** Suelos y matas: se suscriben ellos mismos, para que pintar no vuelva a dibujar todo el jardín. */
function GroundLayers({ plots, theme, items }: { plots: Plot[]; theme: SeasonTheme; items: GardenItem[] }) {
  const floors = useGrove((s) => s.floors)
  return (
    <>
      <Floors floors={floors} plots={plots} />
      <Decor plots={plots} theme={theme} items={items} floors={floors} />
    </>
  )
}

export function GardenCanvas() {
  const items = useGrove((s) => s.items)
  const plots = usePlots()
  const bounds = useMemo(() => plotBounds(plots), [plots])
  const size = bounds.span
  const theme = SEASONS[useSeason()]
  const visible = items
  const light = useDaylight()
  const weather = useWeather()
  // Con lluvia, nieve o niebla el sol se apaga un poco: la luz se vuelve más suave
  const overcast = weather === 'clear' ? 1 : weather === 'fog' ? 0.78 : 0.7
  // Calidad adaptativa en un solo sentido: si el dispositivo va justo, bajamos la calidad una vez y no
  // volvemos a subirla. Alternar resolución o efectos obliga a recrear buffers y shaders, y eso se ve
  // como parpadeos en negro.
  const [low, setLow] = useState(false)
  const garden = useRef<Group>(null)
  // Con un panel a pantalla completa encima no se ve el jardín: no se dibuja y el móvil descansa
  const expanded = useSheetExpanded()
  // Durante la calma el espacio a pantalla completa tapa la isla: tampoco hace falta dibujarla
  const calming = useGrove((s) => !!s.calm)
  const paused = expanded || calming
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
      frameloop={paused ? 'never' : 'always'}
      dpr={low ? 1 : COARSE ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      camera={{ position: [9, 8.2, 9], zoom: 60, near: -50, far: 100 }}
    >
      <PerformanceMonitor ms={250} iterations={8} onDecline={degrade} onFallback={degrade} />
      <Gestures garden={garden} />
      <CameraRig size={size} />
      <Sky light={light} />
      <SkyGlow light={light} />
      <hemisphereLight args={[light.skyTop, '#B49470', light.hemiIntensity]} />
      <ambientLight intensity={0.22 + light.night * 0.1} color={light.night > 0.5 ? '#9FB0E0' : '#FFFFFF'} />
      <directionalLight
        position={sun}
        intensity={light.sunIntensity * overcast}
        color={light.sunColor}
        castShadow
        shadow-mapSize={COARSE ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0006}
        shadow-normalBias={0.025}
      />
      <directionalLight position={[-6, 4, -5]} intensity={0.35 + light.night * 0.25} color="#DCE8FF" />

      <Floating center={[bounds.cx, bounds.cz]} groupRef={garden}>
        <Island plots={plots} theme={theme} />
        <GroundLayers plots={plots} theme={theme} items={visible} />
        {visible.map((it) => (
          <PlacedItem key={it.id} item={it} theme={theme} />
        ))}
        <EditLayer plots={plots} theme={theme} />
        <Visitors plots={plots} />
      </Floating>
      <Clouds size={size} />
      <CloudSea size={size} skyBottom={light.skyBottom} night={light.night} />
      <Particles theme={theme} spread={size} />
      <WeatherLayer weather={weather} spread={size} />
      <Life theme={theme} size={size} night={light.night} />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        {/* Si el dispositivo va justo se quitan la oclusión y el antialiasing: es lo que más cuesta */}
        <>{!low && <N8AO aoRadius={0.45} distanceFalloff={0.6} intensity={2.4} halfRes quality={COARSE ? 'performance' : 'medium'} color="#3A2E22" />}</>
        <Bloom mipmapBlur luminanceThreshold={0.82} luminanceSmoothing={0.2} intensity={0.35 + light.night * 0.6} />
        <Vignette offset={0.32} darkness={0.32} />
        <>{!low && <SMAA />}</>
      </EffectComposer>
    </Canvas>
  )
}
