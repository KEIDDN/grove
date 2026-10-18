import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FLOORS } from '../game/floors'
import { ISLAND_STYLES } from '../game/island'
import { parcelsAllowed, useGrove } from '../game/store'
import { VARIANTS } from '../game/variants'
import { BagIcon, BoxIcon, BrushIcon, CheckIcon, CloseIcon, ExpandIcon, MoveIcon, PaletteIcon, RotateIcon } from './icons'
import { bouncy, spring, tap } from './motion'
import { t, tn } from '../i18n'

function Action({ label, onClick, children, strong, active }: { label: string; onClick: () => void; children: ReactNode; strong?: boolean; active?: boolean }) {
  return (
    <button
      className="dock-item press"
      onClick={() => {
        tap()
        onClick()
      }}
      aria-pressed={active}
      style={
        strong
          ? { background: 'var(--ink)', color: 'var(--strong-ink, #fff)', borderRadius: 999, width: 70 }
          : { color: 'var(--ink)', background: active ? 'rgba(255,255,255,0.85)' : undefined, borderRadius: 999 }
      }
    >
      {children}
      {label}
    </button>
  )
}

/** Muestra de color: degradado con los tonos de la variante (o los de la estación). */
function Swatch({ colors, label, selected, onClick, index }: { colors: string[]; label: string; selected: boolean; onClick: () => void; index: number }) {
  const fill = colors.length ? `linear-gradient(135deg, ${colors.join(', ')})` : 'conic-gradient(#9BD47A, #F0BE62, #E8774A, #9EC0B2, #9BD47A)'
  return (
    <motion.button
      className="press"
      onClick={() => {
        tap()
        onClick()
      }}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...bouncy, delay: index * 0.025 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 54 }}
    >
      <motion.span
        animate={{ scale: selected ? 1.12 : 1 }}
        transition={bouncy}
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
    </motion.button>
  )
}

const barMotion = {
  initial: { opacity: 0, y: 24, scale: 0.96, x: '-50%' },
  animate: { opacity: 1, y: 0, scale: 1, x: '-50%' },
  exit: { opacity: 0, y: 16, scale: 0.97, x: '-50%', transition: { duration: 0.14 } },
  transition: spring,
}

function Bar({ label, children }: { label: string; children: ReactNode }) {
  return (
    <motion.nav className="dock glass" aria-label={label} style={{ gap: 2 }} {...barMotion}>
      {children}
    </motion.nav>
  )
}

function SwatchRow({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="swatches glass"
      role="group"
      initial={{ opacity: 0, y: 20, scale: 0.95, x: '-50%' }}
      animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
      exit={{ opacity: 0, y: 12, scale: 0.96, x: '-50%', transition: { duration: 0.15 } }}
      transition={spring}
    >
      {children}
    </motion.div>
  )
}

/** Sustituye al dock mientras editas el jardín. Cada estado tiene su barra y cambian con un muelle. */
export function EditBar() {
  const selected = useGrove((s) => s.items.find((i) => i.id === s.selectedId))
  const placing = useGrove((s) => s.placing)
  const inventory = useGrove((s) => s.inventory)
  const tool = useGrove((s) => s.editTool)
  const paintFloor = useGrove((s) => s.paintFloor)
  const setEditMode = useGrove((s) => s.setEditMode)
  const setEditTool = useGrove((s) => s.setEditTool)
  const setPaintFloor = useGrove((s) => s.setPaintFloor)
  const islandStyleId = useGrove((s) => s.islandStyle)
  const setIslandStyle = useGrove((s) => s.setIslandStyle)
  const setTab = useGrove((s) => s.setTab)
  const tab = useGrove((s) => s.tab)
  const rotate = useGrove((s) => s.rotateSelected)
  const store = useGrove((s) => s.storeSelected)
  const recolor = useGrove((s) => s.recolorSelected)
  const startMove = useGrove((s) => s.startMove)
  const cancelPlacing = useGrove((s) => s.cancelPlacing)
  const select = useGrove((s) => s.select)
  const freeParcels = useGrove((s) => parcelsAllowed(s) - s.plots.length)
  const [colorOpenFor, setColorOpenFor] = useState<string | null>(null)

  const variants = selected ? VARIANTS[selected.kind] : undefined
  const colorOpen = !!selected && colorOpenFor === selected.id && !!variants && !placing

  const mode = tool === 'paint' ? 'paint' : tool === 'expand' ? 'expand' : placing ? 'placing' : selected ? 'selected' : 'main'

  let swatches: ReactNode = null
  if (mode === 'paint') {
    swatches = (
      <SwatchRow key="floors">
        {FLOORS.map((f, i) => (
          <Swatch key={f.id} index={i} colors={f.colors} label={f.name} selected={paintFloor === f.id} onClick={() => setPaintFloor(f.id)} />
        ))}
      </SwatchRow>
    )
  } else if (mode === 'expand') {
    swatches = (
      <SwatchRow key="island">
        {ISLAND_STYLES.map((st, i) => (
          <Swatch key={st.id} index={i} colors={st.rock.slice(0, 3)} label={st.name} selected={islandStyleId === st.id} onClick={() => setIslandStyle(st.id)} />
        ))}
      </SwatchRow>
    )
  } else if (colorOpen && variants && selected) {
    swatches = (
      <SwatchRow key={`colors-${selected.id}`}>
        {variants.map((v, i) => (
          <Swatch key={v.id} index={i} colors={v.colors} label={v.name} selected={(selected.color ?? variants[0].id) === v.id} onClick={() => recolor(v.id)} />
        ))}
      </SwatchRow>
    )
  }

  let bar: ReactNode
  if (mode === 'paint') {
    bar = (
      <Bar key="paint" label={t("Pintar suelo")}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 13, fontWeight: 650, maxWidth: 190 }}>{t("Toca o arrastra para pintar")}</div>
        <Action label={t("Listo")} onClick={() => setEditTool('select')} strong>
          <CheckIcon size={20} />
        </Action>
      </Bar>
    )
  } else if (mode === 'expand') {
    bar = (
      <Bar key="expand" label={t("Isla")}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 14px', maxWidth: 200 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{freeParcels > 0 ? t('Toca un hueco para ampliar') : t('Elige la roca')}</span>
          <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>
            {freeParcels > 0 ? tn('Te queda {n} parcela', 'Te quedan {n} parcelas', freeParcels) : t('No te quedan parcelas')}
          </span>
        </div>
        <Action label={t("Listo")} onClick={() => setEditTool('select')} strong>
          <CheckIcon size={20} />
        </Action>
      </Bar>
    )
  } else if (mode === 'placing') {
    bar = (
      <Bar key="placing" label={t("Colocar")}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 13, fontWeight: 650 }}>{t("Toca dónde colocarlo")}</div>
        <Action label={t("Cancelar")} onClick={cancelPlacing}>
          <CloseIcon size={20} />
        </Action>
      </Bar>
    )
  } else if (mode === 'selected' && selected) {
    bar = (
      <Bar key="selected" label={t("Objeto seleccionado")}>
        <Action label={t("Mover")} onClick={startMove}>
          <MoveIcon size={20} />
        </Action>
        <Action label={t("Girar")} onClick={rotate}>
          <RotateIcon size={20} />
        </Action>
        {variants && (
          <Action label={t("Color")} onClick={() => setColorOpenFor(colorOpen ? null : selected.id)} active={colorOpen}>
            <PaletteIcon size={20} />
          </Action>
        )}
        <Action label={t("Guardar")} onClick={store}>
          <BoxIcon size={20} />
        </Action>
        <Action label={t("Listo")} onClick={() => select(null)} strong>
          <CheckIcon size={20} />
        </Action>
      </Bar>
    )
  } else {
    bar = (
      <Bar key="main" label={t("Edición")}>
        <Action label={`${t('Objetos')}${inventory.length ? ` · ${inventory.length}` : ''}`} onClick={() => setTab(tab === 'inventory' ? 'garden' : 'inventory')} active={tab === 'inventory'}>
          <BoxIcon size={20} />
        </Action>
        <Action label={t("Vivero")} onClick={() => setTab(tab === 'nursery' ? 'garden' : 'nursery')} active={tab === 'nursery'}>
          <BagIcon size={20} />
        </Action>
        <Action label={t("Suelos")} onClick={() => setEditTool('paint')}>
          <BrushIcon size={20} />
        </Action>
        <Action label={t("Isla")} onClick={() => setEditTool('expand')}>
          <ExpandIcon size={20} />
          {freeParcels > 0 && <span className="badge">{freeParcels}</span>}
        </Action>
        <Action label={t("Listo")} onClick={() => setEditMode(false)} strong>
          <CheckIcon size={20} />
        </Action>
      </Bar>
    )
  }

  return (
    <>
      <AnimatePresence>{swatches}</AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        {bar}
      </AnimatePresence>
    </>
  )
}
