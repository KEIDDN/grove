import type { ReactNode } from 'react'
import { SEASON_ORDER, SEASONS } from '../game/seasons'
import { useGrove } from '../game/store'
import { DEMOS } from './demos'
import { addCoins, addDays, loadDemo, restoreRealGarden, setDevMode, simulateAway, testCelebration, useDev } from './devMode'

const HOURS: Array<[string, number | null]> = [
  ['Real', null],
  ['Amanecer', 6.8],
  ['Día', 12],
  ['Atardecer', 19.4],
  ['Noche', 23],
]

/** Panel del modo desarrollador, al principio de Ajustes. Solo lo ve quien lo ha activado. */
export function DevPanel() {
  const demo = useDev((s) => s.demo)
  const seasonOverride = useGrove((s) => s.seasonOverride)
  const hourOverride = useGrove((s) => s.hourOverride)
  const setHour = useGrove((s) => s.setHourOverride)

  return (
    <section className="dev-panel" aria-label="Modo desarrollador">
      <div className="dev-head">
        <span className="eyebrow">Modo desarrollador</span>
        <button className="dev-off press" onClick={() => setDevMode(false)}>
          Desactivar
        </button>
      </div>

      <Group label="Jardín demo" hint={demo ? `Viendo: ${DEMOS.find((d) => d.id === demo)?.label}. Tu jardín real está a salvo.` : 'Tu jardín real se guarda aparte mientras tanto.'}>
        {DEMOS.map((d) => (
          <Chip key={d.id} on={demo === d.id} onClick={() => loadDemo(d.id)}>
            {d.label}
          </Chip>
        ))}
        {demo && (
          <Chip strong onClick={restoreRealGarden}>
            Volver a mi jardín
          </Chip>
        )}
      </Group>

      <Group label="Estación">
        <Chip on={seasonOverride === null} onClick={() => useGrove.setState({ seasonOverride: null })}>
          Real
        </Chip>
        {SEASON_ORDER.map((s) => (
          <Chip key={s} on={seasonOverride === s} onClick={() => useGrove.setState({ seasonOverride: s })}>
            {SEASONS[s].name}
          </Chip>
        ))}
      </Group>

      <Group label="Hora">
        {HOURS.map(([label, h]) => (
          <Chip key={label} on={hourOverride === h} onClick={() => setHour(h)}>
            {label}
          </Chip>
        ))}
      </Group>

      <Group label="Celebraciones">
        <Chip onClick={() => testCelebration('small')}>Pequeña</Chip>
        <Chip onClick={() => testCelebration('medium')}>Mediana</Chip>
        <Chip onClick={() => testCelebration('first')}>Primera vez</Chip>
        <Chip onClick={() => testCelebration('big')}>Grande</Chip>
        <Chip onClick={() => testCelebration('plant')}>Planta adulta</Chip>
        <Chip onClick={() => simulateAway(9)}>Mientras no estabas</Chip>
      </Group>

      <Group label="Progreso">
        <Chip onClick={() => addCoins(100)}>+100 monedas</Chip>
        <Chip onClick={() => addCoins(1000)}>+1000</Chip>
        <Chip onClick={() => addDays(1)}>+1 día</Chip>
        <Chip onClick={() => addDays(7)}>+7 días</Chip>
      </Group>
    </section>
  )
}

function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="dev-group">
      <div className="dev-label">{label}</div>
      <div className="dev-chips">{children}</div>
      {hint && <div className="muted dev-hint">{hint}</div>}
    </div>
  )
}

function Chip({ on, strong, onClick, children }: { on?: boolean; strong?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button className={strong ? 'pill pill-dark press dev-chip' : 'pill pill-ghost press dev-chip'} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  )
}
