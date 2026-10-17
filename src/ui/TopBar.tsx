import { useState } from 'react'
import { nextMilestone } from '../game/config'
import { SEASONS } from '../game/seasons'
import { useGrove, useGridSize, useSeason } from '../game/store'
import { weekdayIndex } from '../game/time'
import { ChevronIcon, CoinIcon, CycleIcon, EditIcon } from './icons'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function TopBar() {
  const coins = useGrove((s) => s.coins)
  const totalDays = useGrove((s) => s.totalDays)
  const season = SEASONS[useSeason()]
  const [open, setOpen] = useState(false)
  const editMode = useGrove((s) => s.editMode)
  const setEditMode = useGrove((s) => s.setEditMode)
  const placing = useGrove((s) => s.placing)
  const selected = useGrove((s) => s.selectedId)
  const painting = useGrove((s) => s.editTool === 'paint')

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="press" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ textAlign: 'left' }}>
          <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {season.name} · Día {totalDays}
            <ChevronIcon size={13} strokeWidth={2.4} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }} />
          </span>
          <h1 className="title" style={{ marginTop: 4 }}>
            Tu jardín
          </h1>
        </button>
        {open && <WeekCard />}
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

function Coins({ coins }: { coins: number }) {
  return (
    <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 15px 0 11px', borderRadius: 999, fontWeight: 700, fontSize: 15 }}>
      <CoinIcon />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{coins}</span>
      <span className="sr-only">monedas</span>
    </div>
  )
}

function WeekCard() {
  const weekDays = useGrove((s) => s.weekDays)
  const weekGoal = useGrove((s) => s.weekGoal)
  const totalDays = useGrove((s) => s.totalDays)
  const cycleSeason = useGrove((s) => s.cycleSeason)
  const season = SEASONS[useSeason()]
  const size = useGridSize()
  const today = weekdayIndex()
  const done = weekDays.filter(Boolean).length
  const next = nextMilestone(totalDays)
  const left = next ? next.days - totalDays : 0

  return (
    <section className="glass fade-in" aria-label="Tu semana" style={{ width: 300, borderRadius: 26, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          ? `${left === 1 ? 'Falta 1 día' : `Faltan ${left} días`} para que tu jardín crezca a ${next.size}×${next.size}.`
          : `Tu jardín es ${size}×${size}, su tamaño máximo.`}
      </p>
      <button className="pill pill-ghost press" onClick={cycleSeason} style={{ alignSelf: 'flex-start', height: 36, fontSize: 13 }}>
        <CycleIcon size={14} strokeWidth={2.2} />
        {season.name} · cambiar (demo)
      </button>
    </section>
  )
}
