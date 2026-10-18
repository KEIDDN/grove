import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { KIND_NAMES } from '../../game/catalog'
import { ECONOMY } from '../../game/config'
import { paletteFor } from '../../game/variants'
import { KindGlyph } from '../glyphs'
import { useGrove } from '../../game/store'
import { formatClock, TIME_SCALE } from '../../game/time'
import { CoinIcon, MoonIcon } from '../icons'
import { spring } from '../motion'
import { RollingNumber } from '../RollingNumber'
import { Sheet } from '../Sheet'
import { useNow } from '../useNow'

const DURATIONS: Array<number | null> = [10, 25, 45, 60, null]

/** Segundos transcurridos y restantes de la sesión activa (null si no hay). */
export function useSessionClock() {
  const session = useGrove((s) => s.session)
  const now = useNow(!!session)
  if (!session) return null
  const elapsed = ((now - session.startedAt) / 1000) * TIME_SCALE
  const target = session.targetMinutes === null ? null : session.targetMinutes * 60
  return { elapsed, remaining: target === null ? null : Math.max(0, target - elapsed), target, progress: target ? Math.min(1, elapsed / target) : (elapsed % 3600) / 3600 }
}

export function TendSheet() {
  const session = useGrove((s) => s.session)
  const reward = useGrove((s) => s.lastReward)
  return (
    <Sheet eyebrow={session ? 'Sesión en curso' : 'Concentración'} title="Cultivar">
      {session ? <Running /> : reward ? <Done /> : <Setup />}
    </Sheet>
  )
}

const MIN_CUSTOM = 5
const MAX_CUSTOM = 180
const clampMinutes = (m: number) => Math.min(MAX_CUSTOM, Math.max(MIN_CUSTOM, Math.round(m / 5) * 5))

function Setup() {
  const [minutes, setMinutes] = useState<number | null>(25)
  const [custom, setCustom] = useState(false)
  const coinsToday = useGrove((s) => s.coinsToday)
  const start = useGrove((s) => s.startSession)
  const drag = useRef<{ y: number; base: number } | null>(null)

  // Arrastrar el número grande hacia arriba o abajo cambia los minutos de 5 en 5
  const onPointerDown = (e: React.PointerEvent) => {
    if (minutes === null) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, base: minutes }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const steps = Math.round((drag.current.y - e.clientY) / 14)
    const next = clampMinutes(drag.current.base + steps * 5)
    if (next !== minutes) {
      setMinutes(next)
      setCustom(!DURATIONS.includes(next))
    }
  }
  const onPointerUp = () => {
    drag.current = null
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div
        style={{ display: 'flex', alignItems: 'baseline', gap: 8, touchAction: 'none', cursor: minutes === null ? 'default' : 'ns-resize' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-no-sheet-drag=""
      >
        <span className="display" style={{ fontSize: 96 }}>
          <RollingNumber value={minutes} />
        </span>
        <motion.span key={minutes ? 'min' : 'free'} className="muted" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring} style={{ fontSize: 16, fontWeight: 600 }}>
          {minutes ? 'minutos' : 'modo libre'}
        </motion.span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {DURATIONS.map((d) => (
          <button
            key={d ?? 'free'}
            className="pill pill-ghost press"
            aria-pressed={!custom && minutes === d}
            onClick={() => {
              setCustom(false)
              setMinutes(d)
            }}
            style={{ height: 40 }}
          >
            {d ? `${d} min` : 'Libre'}
          </button>
        ))}
        <button
          className="pill pill-ghost press"
          aria-pressed={custom}
          onClick={() => {
            setCustom(true)
            if (minutes === null) setMinutes(30)
          }}
          style={{ height: 40 }}
        >
          Otra
        </button>
      </div>
      <AnimatePresence initial={false}>
        {custom && minutes !== null && (
          <motion.div
            key="custom"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring}
            style={{ overflow: 'hidden' }}
          >
            <div className="stepper" data-no-sheet-drag="">
              <button className="stepper-btn press" aria-label="Menos" onClick={() => setMinutes(clampMinutes(minutes - 5))}>
                −
              </button>
              <input
                type="range"
                min={MIN_CUSTOM}
                max={MAX_CUSTOM}
                step={5}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                aria-label="Minutos"
                style={{ '--fill': `${((minutes - MIN_CUSTOM) / (MAX_CUSTOM - MIN_CUSTOM)) * 100}%` } as React.CSSProperties}
              />
              <button className="stepper-btn press" aria-label="Más" onClick={() => setMinutes(clampMinutes(minutes + 5))}>
                +
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
        Las monedas llegan al completar la sesión, a partir de {ECONOMY.minMinutesForCoins} min. Hoy llevas {coinsToday}/{ECONOMY.dailyCoinCap}. Puedes bloquear el
        móvil: tu sesión sigue.
      </p>
      <button className="pill pill-dark press" onClick={() => start(minutes)} style={{ height: 54, fontSize: 16 }}>
        Empezar a cultivar
      </button>
      <Growing />
    </div>
  )
}

/** Semillas que crecen con Cultivar: cada sesión completada las riega todas a la vez. */
function Growing() {
  const items = useGrove((s) => s.items)
  const inventory = useGrove((s) => s.inventory)
  const startPlacing = useGrove((s) => s.startPlacing)
  const growing = items.filter((it) => it.growth?.by === 'focus')
  // Semillas compradas que aún esperan en el inventario
  const waiting = inventory.filter((it) => it.growth?.by === 'focus')
  if (!growing.length && !waiting.length)
    return (
      <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
        Planta semillas del Vivero: crecerán con los minutos que dediques aquí.
      </p>
    )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {waiting.length > 0 && (
        <>
          <div className="eyebrow">Sin plantar</div>
          {waiting.map((it) => (
            <div key={it.id} className="row-card" style={{ padding: 12, gap: 12 }}>
              <KindGlyph kind={it.kind} color={paletteFor(it.kind, it.color)?.[0]} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{KIND_NAMES[it.kind]}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  Crece con {it.growth!.need} min de Cultivar
                </div>
              </div>
              <button className="pill pill-dark press" onClick={() => startPlacing(it.id)} style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
                Plantar
              </button>
            </div>
          ))}
        </>
      )}
      {growing.length > 0 && <div className="eyebrow" style={{ marginTop: waiting.length ? 8 : 0 }}>Creciendo con tu tiempo</div>}
      {growing.map((it) => {
        const g = it.growth!
        return (
          <div key={it.id} className="row-card" style={{ padding: 12, gap: 12 }}>
            <KindGlyph kind={it.kind} color={paletteFor(it.kind, it.color)?.[0]} size={36} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                <span>{KIND_NAMES[it.kind]}</span>
                <span className="muted">
                  {Math.floor(g.progress)}/{g.need} min
                </span>
              </div>
              <div className="progress">
                <span style={{ width: `${(g.progress / g.need) * 100}%` }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Running() {
  const clock = useSessionClock()
  const session = useGrove((s) => s.session)
  const complete = useGrove((s) => s.completeSession)
  const cancel = useGrove((s) => s.cancelSession)
  const setRest = useGrove((s) => s.setRestMode)

  if (!clock || !session) return null
  const free = session.targetMinutes === null
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="display" style={{ fontSize: 88 }}>
        {formatClock(free ? clock.elapsed : (clock.remaining ?? 0))}
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(27,31,28,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${clock.progress * 100}%`, background: 'var(--ink)', transition: 'width .25s linear' }} />
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
        {free ? 'Modo libre: termina cuando quieras.' : `De ${session.targetMinutes} minutos.`} Bloquea el móvil o deja el modo reposo: el tiempo sigue contando.
        {TIME_SCALE > 1 && ' (Modo rápido: 1 s = 1 min)'}
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="pill pill-dark press" onClick={() => setRest(true)} style={{ flex: 1, height: 50 }}>
          <MoonIcon size={17} />
          Modo reposo
        </button>
        {free && (
          <button className="pill pill-ghost press" onClick={complete} style={{ flex: 1, height: 50 }}>
            Terminar
          </button>
        )}
      </div>
      <button className="press muted" onClick={cancel} style={{ alignSelf: 'center', fontSize: 14, fontWeight: 600, height: 40 }}>
        Abandonar sesión
      </button>
    </div>
  )
}

function Done() {
  const reward = useGrove((s) => s.lastReward)
  const clear = useGrove((s) => s.clearReward)
  const setTab = useGrove((s) => s.setTab)
  if (!reward) return null
  const message = !reward.grew
    ? `Las sesiones de menos de ${ECONOMY.minMinutesForCoins} minutos cuentan para ti, pero no dan monedas.`
    : reward.capped
      ? 'Has llegado al tope de monedas de hoy. Tu tiempo sigue contando.'
      : 'Tu tiempo ha regado las semillas que tienes plantadas.'
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <CoinIcon size={44} />
        <span className="display" style={{ fontSize: 88 }}>
          +{reward.coins}
        </span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700 }}>{reward.minutes} minutos dedicados a ti</div>
      <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="pill pill-dark press" onClick={() => { clear(); setTab('garden') }} style={{ flex: 1, height: 50 }}>
          Ver mi jardín
        </button>
        <button className="pill pill-ghost press" onClick={clear} style={{ flex: 1, height: 50 }}>
          Otra sesión
        </button>
      </div>
    </div>
  )
}

/** Vigila la sesión desde fuera del panel: se completa aunque el panel esté cerrado. */
export function SessionWatcher() {
  const clock = useSessionClock()
  const complete = useGrove((s) => s.completeSession)
  const finished = clock?.remaining === 0
  useEffect(() => {
    if (finished) complete()
  }, [finished, complete])
  return null
}
