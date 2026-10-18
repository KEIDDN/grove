import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, type Group, type Mesh } from 'three'
import { canPlace, CELL, CELLS_PER_TILE, cellToWorld, footprint, plotKey, plotSlots, type Plot } from '../game/garden'
import type { SeasonTheme } from '../game/seasons'
import { parcelsAllowed, useGrove } from '../game/store'
import { GROUND_Y } from './Island'
import { ItemModel } from './items'
import { hashString } from './lowpoly'

/** Rejilla de celdas sobre cada parcela, visible al editar. */
function CellGrid({ plots }: { plots: Plot[] }) {
  const geo = useMemo(() => {
    const v: number[] = []
    for (const [tx, tz] of plots) {
      for (let k = 0; k <= CELLS_PER_TILE; k++) {
        const o = k * CELL
        v.push(tx + o, 0, tz, tx + o, 0, tz + 1, tx, 0, tz + o, tx + 1, 0, tz + o)
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(v, 3))
    return g
  }, [plots])
  return (
    <lineSegments geometry={geo} position={[0, GROUND_Y + 0.03, 0]}>
      <lineBasicMaterial color="#1B1F1C" transparent opacity={0.16} />
    </lineSegments>
  )
}

/** Marca bajo un objeto; se desliza suavemente de una celda a otra. */
function Footprint({ x, z, kind, color, opacity }: { x: number; z: number; kind: Parameters<typeof footprint>[0]; color: string; opacity: number }) {
  const ref = useRef<Mesh>(null)
  const [wx, wz] = cellToWorld(x, z, kind)
  const side = footprint(kind) * CELL - 0.04
  const start = useMemo<[number, number, number]>(() => [wx, GROUND_Y + 0.035, wz], [])
  useFrame((_, delta) => {
    const m = ref.current
    if (!m) return
    const k = 1 - Math.exp(-delta * 24)
    m.position.x += (wx - m.position.x) * k
    m.position.z += (wz - m.position.z) * k
  })
  return (
    <mesh ref={ref} position={start} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[side, side]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

/** Huecos donde se puede añadir una parcela: placas translúcidas que se tocan para ampliar. */
function PlotSlots({ plots }: { plots: Plot[] }) {
  const slots = useMemo(() => plotSlots(plots), [plots])
  return (
    <group>
      {slots.map(([tx, tz]) => (
        <mesh key={plotKey(tx, tz)} position={[tx + 0.5, GROUND_Y - 0.02, tz + 0.5]} raycast={() => null}>
          <boxGeometry args={[0.94, 0.04, 0.94]} />
          <meshStandardMaterial color="#FFFFFF" transparent opacity={0.45} />
        </mesh>
      ))}
    </group>
  )
}

/** Vista previa de lo que vas a colocar: sigue al dedo con un poco de inercia y flota. */
function Ghost({ x, z, children }: { x: number; z: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  const start = useMemo<[number, number, number]>(() => [x, GROUND_Y + 0.2, z], [])
  useFrame(({ clock }, delta) => {
    const g = ref.current
    if (!g) return
    const k = 1 - Math.exp(-delta * 20)
    g.position.x += (x - g.position.x) * k
    g.position.z += (z - g.position.z) * k
    g.position.y = GROUND_Y + 0.16 + Math.sin(clock.elapsedTime * 4) * 0.04
  })
  return (
    <group ref={ref} position={start}>
      {children}
    </group>
  )
}

/** Lo que se ve al editar: rejilla, huecos, vista previa y marcas. Los toques los gestiona Gestures. */
export function EditLayer({ plots, theme }: { plots: Plot[]; theme: SeasonTheme }) {
  const editMode = useGrove((s) => s.editMode)
  const placing = useGrove((s) => s.placing)
  const hoverCell = useGrove((s) => s.hoverCell)
  const items = useGrove((s) => s.items)
  const selectedId = useGrove((s) => s.selectedId)
  const tool = useGrove((s) => s.editTool)
  const paintFloor = useGrove((s) => s.paintFloor)
  const canExpand = useGrove((s) => s.plots.length < parcelsAllowed(s))

  if (!editMode) return null

  const ignore = placing?.from === 'garden' ? placing.itemId : undefined
  const valid = placing && hoverCell ? canPlace(items, plots, placing.kind, hoverCell[0], hoverCell[1], ignore) : false
  const selected = items.find((it) => it.id === selectedId)
  const ghost = placing && hoverCell ? cellToWorld(hoverCell[0], hoverCell[1], placing.kind) : null

  return (
    <group>
      <CellGrid plots={plots} />
      {tool === 'expand' && canExpand && <PlotSlots plots={plots} />}
      {tool === 'paint' && hoverCell && (
        <mesh position={[(hoverCell[0] + 0.5) * CELL, GROUND_Y + 0.07, (hoverCell[1] + 0.5) * CELL]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CELL - 0.03, CELL - 0.03]} />
          <meshBasicMaterial color={paintFloor === 'grass' ? '#7BD88F' : '#FFFFFF'} transparent opacity={0.6} depthWrite={false} />
        </mesh>
      )}

      {selected && !placing && <Footprint x={selected.x} z={selected.z} kind={selected.kind} color="#FFFFFF" opacity={0.9} />}

      {placing && hoverCell && (
        <>
          <Footprint x={hoverCell[0]} z={hoverCell[1]} kind={placing.kind} color={valid ? '#7BD88F' : '#F08A7E'} opacity={0.55} />
          {placing.from === 'inventory' && ghost && (
            <Ghost x={ghost[0]} z={ghost[1]}>
              <ItemModel kind={placing.kind} color={placing.color} seed={hashString(placing.invId)} theme={theme} growth={placing.growth} />
            </Ghost>
          )}
        </>
      )}
    </group>
  )
}
