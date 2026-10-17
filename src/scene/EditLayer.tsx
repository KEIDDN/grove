import { useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { canPlace, CELL, CELLS_PER_TILE, cellToWorld, footprint, worldToCell } from '../game/garden'
import type { SeasonTheme } from '../game/seasons'
import { useGrove } from '../game/store'
import { GROUND_Y } from './Island'
import { ItemModel } from './items'
import { hashString } from './lowpoly'

/** Rejilla de celdas que aparece al editar. */
function CellGrid({ size }: { size: number }) {
  const geo = useMemo(() => {
    const cells = size * CELLS_PER_TILE
    const half = size / 2
    const v: number[] = []
    for (let k = 1; k < cells; k++) {
      const p = k * CELL - half
      v.push(p, 0, -half, p, 0, half, -half, 0, p, half, 0, p)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(v, 3))
    return g
  }, [size])
  return (
    <lineSegments geometry={geo} position={[0, GROUND_Y + 0.03, 0]}>
      <lineBasicMaterial color="#1B1F1C" transparent opacity={0.16} />
    </lineSegments>
  )
}

function Footprint({ x, z, kind, size, color, opacity }: { x: number; z: number; kind: Parameters<typeof footprint>[0]; size: number; color: string; opacity: number }) {
  const [wx, wz] = cellToWorld(x, z, kind, size)
  const side = footprint(kind) * CELL - 0.04
  return (
    <mesh position={[wx, GROUND_Y + 0.035, wz]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[side, side]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

/** Capa de interacción del modo edición: elegir celda, vista previa y selección. */
export function EditLayer({ size, theme }: { size: number; theme: SeasonTheme }) {
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
  const lastPainted = useRef<[number, number] | null>(null)

  if (!editMode) return null

  const cellFor = (e: ThreeEvent<PointerEvent | MouseEvent>): [number, number] | null => {
    if (!placing) return null
    const cells = size * CELLS_PER_TILE
    const fp = footprint(placing.kind)
    const [x, z] = worldToCell(e.point.x, e.point.z, placing.kind, size)
    return [Math.min(cells - fp, Math.max(0, x)), Math.min(cells - fp, Math.max(0, z))]
  }

  /** Celda de suelo (1×1) bajo el puntero. */
  const floorCell = (e: ThreeEvent<PointerEvent>): [number, number] => {
    const cells = size * CELLS_PER_TILE
    const clamp = (v: number) => Math.min(cells - 1, Math.max(0, v))
    return [clamp(Math.floor((e.point.x + size / 2) / CELL)), clamp(Math.floor((e.point.z + size / 2) / CELL))]
  }

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
    if (tool === 'paint' || e.delta > 6) return // fue un arrastre para girar la cámara
    e.stopPropagation()
    const c = cellFor(e)
    if (c) {
      setHoverCell(c)
      placeAt(c[0], c[1])
    } else {
      select(null)
    }
  }

  const ignore = placing?.from === 'garden' ? placing.itemId : undefined
  const valid = placing && hoverCell ? canPlace(items, size, placing.kind, hoverCell[0], hoverCell[1], ignore) : false
  const selected = items.find((it) => it.id === selectedId)
  const ghost = placing && hoverCell ? cellToWorld(hoverCell[0], hoverCell[1], placing.kind, size) : null

  return (
    <group>
      <CellGrid size={size} />
      <mesh position={[0, GROUND_Y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={onDown} onPointerMove={onMove} onClick={onClick}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {tool === 'paint' && hoverCell && (
        <mesh position={[(hoverCell[0] + 0.5) * CELL - size / 2, GROUND_Y + 0.07, (hoverCell[1] + 0.5) * CELL - size / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CELL - 0.03, CELL - 0.03]} />
          <meshBasicMaterial color={paintFloor === 'grass' ? '#7BD88F' : '#FFFFFF'} transparent opacity={0.6} depthWrite={false} />
        </mesh>
      )}

      {selected && !placing && <Footprint x={selected.x} z={selected.z} kind={selected.kind} size={size} color="#FFFFFF" opacity={0.9} />}

      {placing && hoverCell && (
        <>
          <Footprint x={hoverCell[0]} z={hoverCell[1]} kind={placing.kind} size={size} color={valid ? '#7BD88F' : '#F08A7E'} opacity={0.55} />
          {placing.from === 'inventory' && ghost && (
            <group position={[ghost[0], GROUND_Y + 0.1, ghost[1]]}>
              <ItemModel kind={placing.kind} color={placing.color} seed={hashString(placing.invId)} theme={theme} />
            </group>
          )}
        </>
      )}
    </group>
  )
}
