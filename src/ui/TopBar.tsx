import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { AnimatedNumber } from './AnimatedNumber'
import { spring } from './motion'
import { daysLeftInSeason, upcomingEvent } from '../game/calendar'
import { DAY_PARCELS, nextDayReward } from '../game/config'
import { missionsFor } from '../game/goals'
import { moodColor, moodLabel } from '../game/mood'
import { VISITORS } from '../game/visitors'
import { WEATHER_NAMES, weatherForDay } from '../game/weather'
import { useWeather } from '../scene/Weather'
import { SEASONS } from '../game/seasons'
import { parcelsAllowed, useGrove, useSeason } from '../game/store'
import { dayKey, weekdayIndex } from '../game/time'
import { VisitorGlyph } from './glyphs'
import { CheckIcon, ChevronIcon, CoinIcon, EditIcon } from './icons'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
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
              <WeekCard key="week" onClose={() => setOpen(false)} />
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

/**
 * "Tu semana": de un vistazo, qué llevas, qué puedes hacer hoy y qué está pasando en el mundo.
 * Los días, las misiones de hoy, el próximo hito y la estación, los eventos y quién está de visita.
 */
function WeekCard({ onClose }: { onClose: () => void }) {
  const weekDays = useGrove((s) => s.weekDays)
  const weekGoal = useGrove((s) => s.weekGoal)
  const totalDays = useGrove((s) => s.totalDays)
  const daily = useGrove((s) => s.daily)
  const claimed = useGrove((s) => s.missionsClaimed)
  const claim = useGrove((s) => s.claimMission)
  const openYou = useGrove((s) => s.openYou)
  const recent = useGrove((s) => s.recentVisitors)
  const seasonId = useSeason()
  const realSeason = useGrove((s) => s.seasonOverride === null)
  const season = SEASONS[seasonId]
  const freeParcels = useGrove((s) => parcelsAllowed(s) - s.plots.length)
  const setEditMode = useGrove((s) => s.setEditMode)
  const setEditTool = useGrove((s) => s.setEditTool)
  const setTab = useGrove((s) => s.setTab)
  const today = weekdayIndex()
  const done = weekDays.filter(Boolean).length
  const next = nextDayReward(totalDays)
  const prev = [...DAY_PARCELS].reverse().find((m) => m.days <= totalDays)?.days ?? 0
  const missions = missionsFor(daily.day)
  const event = upcomingEvent()
  const weather = useWeather()
  const weatherOverride = useGrove((s) => s.weatherOverride)
  const visitors = recent.day === dayKey() ? VISITORS.filter((v) => recent.ids.includes(v.id)) : []

  return (
    <motion.section
      className="glass week-card"
      aria-label="Tu semana"
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.15 } }}
      transition={spring}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="display" style={{ fontSize: 44 }}>
          {done}
          <span style={{ fontSize: 22, color: 'var(--ink-faint)' }}>/{weekGoal}</span>
        </span>
        <span className="muted" style={{ fontSize: 13 }}>
          {done >= weekGoal ? 'semana cumplida' : 'días esta semana'}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {DAY_LABELS.map((l, i) => (
          <div key={l} className={weekDays[i] ? 'wk-dot done' : i === today ? 'wk-dot today' : 'wk-dot'}>
            <i />
            <span>{l}</span>
          </div>
        ))}
      </div>

      <div className="week-block">
        <div className="week-label">Hoy</div>
        {missions.map((m) => {
          const value = Math.min(m.target, Math.floor(m.value(daily)))
          const ready = value >= m.target
          const got = claimed.includes(m.id)
          return (
            <button
              key={m.id}
              className={got ? 'week-mission got press' : ready ? 'week-mission ready press' : 'week-mission press'}
              onClick={() => (ready && !got ? claim(m.id) : (onClose(), openYou('today')))}
            >
              <span className="week-check">{(got || ready) && <CheckIcon size={11} strokeWidth={3} />}</span>
              <span className="week-mission-title">{m.title}</span>
              <span className="week-mission-meta">
                {got ? 'Hecho' : ready ? 'Recoger' : `${value}/${m.target}`}
                {!got && (
                  <>
                    <CoinIcon size={12} />
                    {m.reward.coins}
                  </>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <div className="week-block">
        <div className="week-label">Próximo hito</div>
        {next ? (
          <>
            <div className="week-bar">
              <motion.span initial={{ width: 0 }} animate={{ width: `${((totalDays - prev) / (next.days - prev)) * 100}%` }} transition={{ ...spring, delay: 0.15 }} />
            </div>
            <div className="week-row-text">
              <span>
                Día {totalDays} de {next.days}
              </span>
              <span className="muted">+{next.parcels} parcelas</span>
            </div>
          </>
        ) : (
          <div className="week-row-text muted">Tu isla ya tiene todas sus parcelas.</div>
        )}
        {freeParcels > 0 && (
          <button
            className="pill pill-ghost press"
            style={{ height: 34, fontSize: 12, alignSelf: 'flex-start' }}
            onClick={() => {
              onClose()
              setEditMode(true)
              setEditTool('expand')
            }}
          >
            {freeParcels === 1 ? 'Tienes 1 parcela para ampliar' : `Tienes ${freeParcels} parcelas para ampliar`}
          </button>
        )}
      </div>

      <div className="week-block">
        <div className="week-label">Ahora en tu isla</div>
        <div className="week-row-text">
          <span>{season.name}</span>
          <span className="muted">{realSeason ? `quedan ${daysLeftInSeason(seasonId)} días` : 'tu favorita'}</span>
        </div>
        {weather !== 'clear' && (
          <div className="week-row-text">
            <span>{WEATHER_NAMES[weather]}</span>
            <span className="muted">{weatherOverride ? 'ahora' : `hasta las ${weatherForDay(new Date(), seasonId).to}:00`}</span>
          </div>
        )}
        {event && (
          <div className="week-row-text">
            <span>{event.name}</span>
            <span className="muted">{event.days === 0 ? 'es hoy' : event.days === 1 ? 'mañana' : `en ${event.days} días`}</span>
          </div>
        )}
        <TodayMood onOpen={() => (onClose(), setTab('roots'))} />
        <div className="week-visitors">
          {visitors.length ? (
            visitors.map((v) => (
              <span key={v.id} className="week-visitor">
                <VisitorGlyph type={v.type} size={20} />
                {v.name}
              </span>
            ))
          ) : (
            <span className="muted" style={{ fontSize: 12 }}>
              Nadie de visita ahora mismo. Vuelven mientras no estás.
            </span>
          )}
        </div>
      </div>
    </motion.section>
  )
}

/** Tu ánimo de hoy, si ya lo has apuntado; si no, una invitación a hacerlo en Raíces. */
function TodayMood({ onOpen }: { onOpen: () => void }) {
  const mood = useGrove((s) => s.entries.find((e) => e.date === dayKey())?.mood)
  return (
    <button className="week-mood press" onClick={onOpen}>
      <span className="week-mood-dot" style={{ background: mood ? moodColor(mood.level) : undefined }} />
      <span style={{ flex: 1, textAlign: 'left' }}>{mood ? `Hoy te sientes: ${moodLabel(mood.level).toLowerCase()}` : '¿Cómo te sientes hoy?'}</span>
      <ChevronIcon size={13} strokeWidth={2.4} style={{ transform: 'rotate(-90deg)', opacity: 0.5 }} />
    </button>
  )
}
