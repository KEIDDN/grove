import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, type Group, type Mesh } from 'three'
import { canPlace, CELL, CELLS_PER_TILE, cellToWorld, footprint, plotBounds, plotKey, plotSlots, worldToCell, type Plot } from '../game/garden'
import type { SeasonTheme } from '../game/seasons'
import { parcelsAllowed, useGrove } from '../game/store'
import { GROUND_Y } from './Island'
import { ItemModel } from './items'
import { tap } from '../ui/motion'
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
  const addPlot = useGrove((s) => s.addPlot)
  const slots = useMemo(() => plotSlots(plots), [plots])
  return (
    <group>
      {slots.map(([tx, tz]) => (
        <mesh
          key={plotKey(tx, tz)}
          position={[tx + 0.5, GROUND_Y - 0.02, tz + 0.5]}
          onClick={(e) => {
            if (e.delta > 6) return
            e.stopPropagation()
            addPlot(tx, tz)
          }}
        >
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

/** Capa de interacción del modo edición: elegir celda, vista previa, pintar y ampliar. */
export function EditLayer({ plots, theme }: { plots: Plot[]; theme: SeasonTheme }) {
  const editMode = useGrove((s) => s.editMode)
  const placing = useGrove((s) => s.placing)
  const hoverCell = useGrove((s) => s.hoverCell)
  const items = useGrove((s) => s.items)
  const selectedId = useGrove((s) => s.selectedId)
  const setHoverCell = useGrove((s) => s.setHoverCell)
  const placeAt = useGrove((s) => s.placeAt)
  const select = useGrove((s) => s.select)
  const tool = useGrove((s) => s.editTool)
  const paintCell = useGrove((s) => s.paintCell)
  const paintFloor = useGrove((s) => s.paintFloor)
  const canExpand = useGrove((s) => s.plots.length < parcelsAllowed(s))
  const lastPainted = useRef<[number, number] | null>(null)
  const bounds = useMemo(() => plotBounds(plots), [plots])

  if (!editMode) return null

  const cellFor = (e: ThreeEvent<PointerEvent | MouseEvent>): [number, number] | null => {
    if (!placing) return null
    return worldToCell(e.point.x, e.point.z, placing.kind)
  }

  /** Celda de suelo (1×1) bajo el puntero. */
  const floorCell = (e: ThreeEvent<PointerEvent>): [number, number] => [Math.floor(e.point.x / CELL), Math.floor(e.point.z / CELL)]

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (tool !== 'paint') return
    e.stopPropagation()
    const [x, z] = floorCell(e)
    setHoverCell([x, z])
    paintCell(x, z)
    lastPainted.current = [x, z]
  }

  /** Pinta todas las celdas entre la anterior y la actual, para que un arrastre rápido no deje huecos. */
  const paintLine = (to: [number, number]) => {
    const from = lastPainted.current ?? to
    const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]))
    for (let i = 1; i <= steps; i++) {
      paintCell(Math.round(from[0] + ((to[0] - from[0]) * i) / steps), Math.round(from[1] + ((to[1] - from[1]) * i) / steps))
    }
    paintCell(to[0], to[1])
    lastPainted.current = to
  }

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (tool === 'paint') {
      const [x, z] = floorCell(e)
      if (!hoverCell || hoverCell[0] !== x || hoverCell[1] !== z) setHoverCell([x, z])
      if (e.buttons === 1) paintLine([x, z])
      else lastPainted.current = null
      return
    }
    const c = cellFor(e)
    if (c && (!hoverCell || c[0] !== hoverCell[0] || c[1] !== hoverCell[1])) setHoverCell(c)
  }

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (tool !== 'select' || e.delta > 6) return // fue un arrastre para girar la cámara
    e.stopPropagation()
    const c = cellFor(e)
    if (c) {
      setHoverCell(c)
      tap(12)
      placeAt(c[0], c[1])
    } else {
      select(null)
    }
  }

  const ignore = placing?.from === 'garden' ? placing.itemId : undefined
  const valid = placing && hoverCell ? canPlace(items, plots, placing.kind, hoverCell[0], hoverCell[1], ignore) : false
  const selected = items.find((it) => it.id === selectedId)
  const ghost = placing && hoverCell ? cellToWorld(hoverCell[0], hoverCell[1], placing.kind) : null
  const pad = 1.5

  return (
    <group>
      <CellGrid plots={plots} />
      {tool === 'expand' && canExpand && <PlotSlots plots={plots} />}
      <mesh
        position={[bounds.cx, GROUND_Y + 0.02, bounds.cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onClick={onClick}
      >
        <planeGeometry args={[bounds.span + pad, bounds.span + pad]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

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
