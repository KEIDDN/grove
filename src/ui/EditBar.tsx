import { useState, type ReactNode } from 'react'
import { FLOORS } from '../game/floors'
import { parcelsAllowed, useGrove } from '../game/store'
import { VARIANTS } from '../game/variants'
import { BagIcon, BoxIcon, BrushIcon, CheckIcon, CloseIcon, ExpandIcon, MoveIcon, PaletteIcon, RotateIcon } from './icons'

function Action({ label, onClick, children, strong, active }: { label: string; onClick: () => void; children: ReactNode; strong?: boolean; active?: boolean }) {
  return (
    <button
      className="dock-item press"
      onClick={onClick}
      aria-pressed={active}
      style={
        strong
          ? { background: 'var(--ink)', color: '#fff', borderRadius: 999, width: 70 }
          : { color: 'var(--ink)', background: active ? 'rgba(255,255,255,0.85)' : undefined, borderRadius: 999 }
      }
    >
      {children}
      {label}
    </button>
  )
}

/** Muestra de color: degradado con los tonos de la variante (o los de la estación). */
function Swatch({ colors, label, selected, onClick }: { colors: string[]; label: string; selected: boolean; onClick: () => void }) {
  const fill = colors.length ? `linear-gradient(135deg, ${colors.join(', ')})` : 'conic-gradient(#9BD47A, #F0BE62, #E8774A, #9EC0B2, #9BD47A)'
  return (
    <button className="press" onClick={onClick} aria-label={label} aria-pressed={selected} title={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 54 }}>
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: fill,
          boxShadow: selected ? '0 0 0 2px #fff, 0 0 0 4px var(--ink)' : 'inset 0 0 0 1px rgba(27,31,28,0.12)',
          transition: 'box-shadow .2s',
        }}
      />
      <span style={{ fontSize: 10, fontWeight: 650, color: selected ? 'var(--ink)' : 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

function SwatchRow({ children }: { children: ReactNode }) {
  return (
    <div className="swatches glass fade-in" role="group">
      {children}
    </div>
  )
}

/** Sustituye al dock mientras editas el jardín. */
export function EditBar() {
  const selectedId = useGrove((s) => s.selectedId)
  const selected = useGrove((s) => s.items.find((i) => i.id === s.selectedId))
  const placing = useGrove((s) => s.placing)
  const inventory = useGrove((s) => s.inventory)
  const tool = useGrove((s) => s.editTool)
  const paintFloor = useGrove((s) => s.paintFloor)
  const setEditMode = useGrove((s) => s.setEditMode)
  const setEditTool = useGrove((s) => s.setEditTool)
  const setPaintFloor = useGrove((s) => s.setPaintFloor)
  const setTab = useGrove((s) => s.setTab)
  const rotate = useGrove((s) => s.rotateSelected)
  const store = useGrove((s) => s.storeSelected)
  const recolor = useGrove((s) => s.recolorSelected)
  const startMove = useGrove((s) => s.startMove)
  const cancelPlacing = useGrove((s) => s.cancelPlacing)
  const select = useGrove((s) => s.select)
  const [colorOpenFor, setColorOpenFor] = useState<string | null>(null)
  const freeParcels = useGrove((s) => parcelsAllowed(s) - s.plots.length)

  const variants = selected ? VARIANTS[selected.kind] : undefined
  const colorOpen = !!selected && colorOpenFor === selected.id && !!variants

  if (tool === 'paint') {
    return (
      <>
        <SwatchRow>
          {FLOORS.map((f) => (
            <Swatch key={f.id} colors={f.colors} label={f.name} selected={paintFloor === f.id} onClick={() => setPaintFloor(f.id)} />
          ))}
        </SwatchRow>
        <nav className="dock glass" aria-label="Pintar suelo" style={{ gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 13, fontWeight: 650, maxWidth: 190 }}>Toca o arrastra para pintar</div>
          <Action label="Listo" onClick={() => setEditTool('select')} strong>
            <CheckIcon size={20} />
          </Action>
        </nav>
      </>
    )
  }

  if (tool === 'expand') {
    return (
      <nav className="dock glass" aria-label="Ampliar jardín" style={{ gap: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 14px', maxWidth: 200 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Toca un hueco para ampliar</span>
          <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>
            {freeParcels > 0 ? `Te quedan ${freeParcels} parcela${freeParcels > 1 ? 's' : ''}` : 'No te quedan parcelas'}
          </span>
        </div>
        <Action label="Listo" onClick={() => setEditTool('select')} strong>
          <CheckIcon size={20} />
        </Action>
      </nav>
    )
  }

  if (placing) {
    return (
      <nav className="dock glass" aria-label="Colocar" style={{ gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 13, fontWeight: 650 }}>Toca dónde colocarlo</div>
        <Action label="Cancelar" onClick={cancelPlacing}>
          <CloseIcon size={20} />
        </Action>
      </nav>
    )
  }

  if (selectedId && selected) {
    return (
      <>
        {colorOpen && variants && (
          <SwatchRow>
            {variants.map((v) => (
              <Swatch key={v.id} colors={v.colors} label={v.name} selected={(selected.color ?? variants[0].id) === v.id} onClick={() => recolor(v.id)} />
            ))}
          </SwatchRow>
        )}
        <nav className="dock glass" aria-label="Objeto seleccionado" style={{ gap: 2 }}>
          <Action label="Mover" onClick={startMove}>
            <MoveIcon size={20} />
          </Action>
          <Action label="Girar" onClick={rotate}>
            <RotateIcon size={20} />
          </Action>
          {variants && (
            <Action label="Color" onClick={() => setColorOpenFor(colorOpen ? null : selected.id)} active={colorOpen}>
              <PaletteIcon size={20} />
            </Action>
          )}
          <Action label="Guardar" onClick={store}>
            <BoxIcon size={20} />
          </Action>
          <Action label="Listo" onClick={() => select(null)} strong>
            <CheckIcon size={20} />
          </Action>
        </nav>
      </>
    )
  }

  return (
    <nav className="dock glass" aria-label="Edición" style={{ gap: 2 }}>
      <Action label={`Objetos${inventory.length ? ` · ${inventory.length}` : ''}`} onClick={() => setTab('inventory')}>
        <BoxIcon size={20} />
      </Action>
      <Action label="Vivero" onClick={() => setTab('nursery')}>
        <BagIcon size={20} />
      </Action>
      <Action label="Suelos" onClick={() => setEditTool('paint')}>
        <BrushIcon size={20} />
      </Action>
      <Action label="Ampliar" onClick={() => setEditTool('expand')}>
        <ExpandIcon size={20} />
        {freeParcels > 0 && <span className="badge">{freeParcels}</span>}
      </Action>
      <Action label="Listo" onClick={() => setEditMode(false)} strong>
        <CheckIcon size={20} />
      </Action>
    </nav>
  )
}
