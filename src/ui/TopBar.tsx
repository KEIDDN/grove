import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { AnimatedNumber } from './AnimatedNumber'
import { spring } from './motion'
import { nextDayReward } from '../game/config'
import { SEASONS } from '../game/seasons'
import { parcelsAllowed, useGrove, useSeason } from '../game/store'
import { weekdayIndex } from '../game/time'
import { ChevronIcon, CoinIcon, CycleIcon, EditIcon } from './icons'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const HOURS: Array<[string, number | null]> = [
  ['Real', null],
  ['Amanecer', 6.8],
  ['Día', 12],
  ['Atardecer', 19.4],
  ['Noche', 23],
]

export function TopBar() {
  const coins = useGrove((s) => s.coins)
  const totalDays = useGrove((s) => s.totalDays)
  const season = SEASONS[useSeason()]
  const [open, setOpen] = useState(false)
  const gardenName = useGrove((s) => s.gardenName)
  const editMode = useGrove((s) => s.editMode)
  const setEditMode = useGrove((s) => s.setEditMode)
  const placing = useGrove((s) => s.placing)
  const selected = useGrove((s) => s.selectedId)
  const painting = useGrove((s) => s.editTool === 'paint')
  const done = useGrove((s) => s.weekDays.filter(Boolean).length)
  const weekGoal = useGrove((s) => s.weekGoal)

  if (editMode) {
    return (
      <div className="topbar">
        <div>
          <span className="eyebrow">{painting ? 'Pintando suelo' : placing ? 'Colocando' : selected ? 'Objeto seleccionado' : 'Toca un objeto para editarlo'}</span>
          <h1 className="title" style={{ marginTop: 4 }}>
            Editar jardín
          </h1>
        </div>
        <Coins coins={coins} />
      </div>
    )
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h1 className="title garden-title" style={{ fontSize: gardenName.length > 14 ? 24 : 30 }}>
          {gardenName}
        </h1>
        <button className="week-chip glass press" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Tu semana: ${done} de ${weekGoal} días`}>
          <WeekRing done={done} goal={weekGoal} />
          <span>
            {season.name} · Día {totalDays}
          </span>
          <ChevronIcon size={12} strokeWidth={2.6} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .3s var(--ease)', opacity: 0.6 }} />
        </button>
        <AnimatePresence>
          {open && (
            <>
              {/* Tocar fuera cierra el panel */}
              <motion.div key="scrim" className="week-scrim" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              <WeekCard key="week" />
            </>
          )}
        </AnimatePresence>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="glass press"
          onClick={() => setEditMode(true)}
          aria-label="Editar jardín"
          style={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center' }}
        >
          <EditIcon size={18} strokeWidth={2} />
        </button>
        <Coins coins={coins} />
      </div>
    </div>
  )
}

/** Anillo pequeño con los días cumplidos de la semana frente al objetivo. */
function WeekRing({ done, goal }: { done: number; goal: number }) {
  const r = 7.5
  const c = 2 * Math.PI * r
  const ratio = Math.min(1, done / Math.max(1, goal))
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={2.6} />
      <motion.circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke={ratio >= 1 ? '#3FA066' : 'currentColor'}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={false}
        animate={{ strokeDashoffset: c * (1 - ratio) }}
        transition={spring}
        transform="rotate(-90 10 10)"
      />
    </svg>
  )
}

/**
 * Contador de monedas. Las que aún vuelan hacia aquí no se cuentan todavía: el número sube a
 * medida que llegan y el contador da un pequeño salto con cada una.
 */
function Coins({ coins }: { coins: number }) {
  const held = useGrove((s) => s.coinsHeld)
  const controls = useAnimationControls()
  useEffect(() => {
    const pop = () => void controls.start({ scale: [1, 1.12, 1], transition: { duration: 0.28, ease: 'easeOut' } })
    window.addEventListener('coin-land', pop)
    return () => window.removeEventListener('coin-land', pop)
  }, [controls])
  return (
    <motion.div
      data-coin-target
      animate={controls}
      className="glass"
      style={{ display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 15px 0 11px', borderRadius: 999, fontWeight: 700, fontSize: 15 }}
    >
      <CoinIcon />
      <AnimatedNumber value={Math.max(0, coins - held)} />
      <span className="sr-only">monedas</span>
    </motion.div>
  )
}

function WeekCard() {
  const weekDays = useGrove((s) => s.weekDays)
  const weekGoal = useGrove((s) => s.weekGoal)
  const totalDays = useGrove((s) => s.totalDays)
  const cycleSeason = useGrove((s) => s.cycleSeason)
  const hourOverride = useGrove((s) => s.hourOverride)
  const setHour = useGrove((s) => s.setHourOverride)
  const season = SEASONS[useSeason()]
  const freeParcels = useGrove((s) => parcelsAllowed(s) - s.plots.length)
  const today = weekdayIndex()
  const done = weekDays.filter(Boolean).length
  const next = nextDayReward(totalDays)
  const left = next ? next.days - totalDays : 0

  return (
    <motion.section
      className="glass"
      aria-label="Tu semana"
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.15 } }}
      transition={spring}
      style={{ position: 'absolute', top: 'calc(100% + 10px)', left: 0, zIndex: 2, transformOrigin: 'top left', width: 'min(300px, calc(100vw - 44px))', borderRadius: 26, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="display" style={{ fontSize: 44 }}>
          {done}
          <span style={{ fontSize: 22, color: 'var(--ink-faint)' }}>/{weekGoal}</span>
        </span>
        <span className="muted" style={{ fontSize: 13 }}>
          días esta semana
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {DAY_LABELS.map((l, i) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: weekDays[i] ? 'var(--ink)' : i === today ? 'transparent' : 'rgba(27,31,28,0.07)',
                border: !weekDays[i] && i === today ? '1.5px dashed var(--ink)' : 'none',
              }}
            />
            <span style={{ fontSize: 10, fontWeight: i === today ? 800 : 600, color: i === today ? 'var(--ink)' : 'var(--ink-faint)' }}>{l}</span>
          </div>
        ))}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>
        {next
          ? `${freeParcels > 0 ? `Tienes ${freeParcels} parcela${freeParcels > 1 ? 's' : ''} para ampliar. ` : ''}${left === 1 ? 'Falta 1 día' : `Faltan ${left} días`} para ganar ${next.parcels} parcelas más.`
          : freeParcels > 0
            ? `Tienes ${freeParcels} parcelas para ampliar tu jardín.`
            : 'Sigue con misiones y logros para ganar parcelas.'}
      </p>
      <button className="pill pill-ghost press" onClick={cycleSeason} style={{ alignSelf: 'flex-start', height: 36, fontSize: 13 }}>
        <CycleIcon size={14} strokeWidth={2.2} />
        {season.name} · cambiar (demo)
      </button>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-label="Hora del día (demo)">
        {HOURS.map(([label, h]) => (
          <button key={label} className="pill pill-ghost press" aria-pressed={hourOverride === h} onClick={() => setHour(h)} style={{ height: 36, padding: '0 14px', fontSize: 12 }}>
            {label}
          </button>
        ))}
      </div>
    </motion.section>
  )
}
