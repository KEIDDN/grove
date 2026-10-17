import { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import type { Group, OrthographicCamera } from 'three'
import { useGrove, useGridSize, useSeason } from '../game/store'
import { SEASONS } from '../game/seasons'
import { Clouds } from './Clouds'
import { Decor } from './Decor'
import { EditLayer } from './EditLayer'
import { Floors } from './Floors'
import { Island, soilDepth } from './Island'
import { PlacedItem } from './items'
import { Particles } from './Particles'

/**
 * Encuadre: el jardín siempre centrado y a buen tamaño. En pantallas estrechas, cuando
 * se abre un panel desde abajo, sube y se encoge para seguir viéndose entero.
 */
function CameraRig({ size }: { size: number }) {
  const { camera, size: viewport } = useThree()
  const sheetOpen = useGrove((s) => s.tab !== 'garden' && !s.restMode)
  const rest = useGrove((s) => s.restMode)
  const offset = useRef(0)
  useFrame((_, delta) => {
    const cam = camera as OrthographicCamera
    const { width, height } = viewport
    const narrow = width < 1000
    const lift = sheetOpen && narrow ? height * 0.27 : rest ? height * 0.07 : height * 0.02
    const factor = sheetOpen && narrow ? 0.6 : 1
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

function Floating({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.05
  })
  return <group ref={ref}>{children}</group>
}

export function GardenCanvas() {
  const items = useGrove((s) => s.items)
  const floors = useGrove((s) => s.floors)
  const painting = useGrove((s) => s.editMode && s.editTool === 'paint')
  const size = useGridSize()
  const theme = SEASONS[useSeason()]
  const visible = items
  const shadowY = -soilDepth(size) - 0.55

  return (
    <Canvas
      className="garden-canvas"
      shadows="soft"
      orthographic
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [9, 8.2, 9], zoom: 60, near: -50, far: 100 }}
    >
      <CameraRig size={size} />
      <hemisphereLight args={[theme.sky, '#B49470', 1.25]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[4, 9, 2.5]}
        intensity={2}
        color="#FFF1DC"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0006}
        shadow-normalBias={0.025}
      />
      <directionalLight position={[-6, 4, -5]} intensity={0.45} color="#DCE8FF" />

      <Floating>
        <Island size={size} theme={theme} />
        <Floors floors={floors} size={size} />
        <Decor size={size} theme={theme} items={visible} floors={floors} />
        {visible.map((it) => (
          <PlacedItem key={it.id} item={it} size={size} theme={theme} />
        ))}
        <EditLayer size={size} theme={theme} />
      </Floating>
      <ContactShadows position={[0, shadowY, 0]} scale={size * 2.6} blur={2.6} opacity={0.28} far={2.5} resolution={512} color="#4A3B2C" />
      <Clouds size={size} />
      <Particles theme={theme} spread={size} />

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
    </Canvas>
  )
}
