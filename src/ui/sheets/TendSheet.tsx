import { audio } from '../../audio/engine'
import { useEffect, useRef, useState } from 'react'
import { animate, AnimatePresence, motion, useMotionValue } from 'motion/react'
import { KIND_NAMES } from '../../game/catalog'
import { ECONOMY } from '../../game/config'
import { paletteFor } from '../../game/variants'
import { KindGlyph } from '../glyphs'
import { useGrove } from '../../game/store'
import { formatClock, TIME_SCALE } from '../../game/time'
import { MoonIcon } from '../icons'
import { spring } from '../motion'
import { NumericText } from '../NumericText'
import { Odometer, RollingNumber } from '../RollingNumber'
import { Sheet } from '../Sheet'
import { useNow } from '../useNow'
import { t } from '../../i18n'

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
  return (
    <Sheet eyebrow={session ? t('Sesión en curso') : t('Concentración')} title={t('Cultivar')}>
      {session ? <Running /> : <Setup />}
    </Sheet>
  )
}

const MIN_CUSTOM = 5
const MAX_CUSTOM = 180
const clampMinutes = (m: number) => Math.min(MAX_CUSTOM, Math.max(MIN_CUSTOM, Math.round(m)))
/** Píxeles de arrastre por minuto: fino al principio y más rápido cuanto más lejos llevas el dedo. */
const PX_PER_MINUTE = 7

function Setup() {
  const [minutes, setMinutes] = useState<number | null>(25)
  const [custom, setCustom] = useState(false)
  const coinsToday = useGrove((s) => s.coinsToday)
  const start = useGrove((s) => s.startSession)
  const drag = useRef<{ y: number; base: number } | null>(null)
  // Valor con decimales que siguen las cifras: pegado al dedo al arrastrar y con muelle al elegir
  const shown = useMotionValue(minutes ?? 25)
  // Arrastrando, las cifras ruedan pegadas al dedo; el resto del tiempo cambian como en iOS
  const [dragging, setDragging] = useState(false)
  useEffect(() => {
    if (minutes !== null && !drag.current) shown.set(minutes)
  }, [minutes, shown])

  /** Elegir una duración desde los botones: suena un "tic" y las cifras ruedan hasta ella. */
  const choose = (d: number | null, isCustom = false) => {
    setCustom(isCustom)
    if (d !== minutes) audio.sfx('tick', d ?? 0)
    setMinutes(d)
  }

  // Arrastrar el número grande hacia arriba o abajo: las cifras siguen al dedo y suena un "tic" en cada minuto
  const onPointerDown = (e: React.PointerEvent) => {
    if (minutes === null) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, base: minutes }
    shown.set(minutes)
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dy = drag.current.y - e.clientY
    // Aceleración suave: con recorridos largos se avanza más deprisa, sin perder la precisión cerca
    const delta = Math.sign(dy) * (Math.abs(dy) / PX_PER_MINUTE + Math.max(0, Math.abs(dy) - 120) / 18)
    const exact = Math.min(MAX_CUSTOM, Math.max(MIN_CUSTOM, drag.current.base + delta))
    shown.set(exact)
    const next = clampMinutes(exact)
    if (next !== minutes) {
      setMinutes(next)
      setCustom(!DURATIONS.includes(next))
      audio.sfx('tick', next)
    }
  }
  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    // Al soltar, la cifra se asienta en el minuto más cercano y luego vuelven las cifras de iOS
    if (minutes === null) return setDragging(false)
    void animate(shown, minutes, { type: 'spring', duration: 0.35, bounce: 0 }).then(() => {
      if (!drag.current) setDragging(false)
    })
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
          {minutes === null ? <RollingNumber value={null} /> : dragging ? <Odometer value={shown} /> : <NumericText value={minutes} />}
          <span className="sr-only">{minutes ?? t('sin límite')}</span>
        </span>
        <motion.span key={minutes ? 'min' : 'free'} className="muted" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring} style={{ fontSize: 16, fontWeight: 600 }}>
          {minutes ? t('minutos') : t('modo libre')}
        </motion.span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {DURATIONS.map((d) => (
          <button
            key={d ?? 'free'}
            className="pill pill-ghost press"
            aria-pressed={!custom && minutes === d}
            onClick={() => choose(d)}
            style={{ height: 40 }}
          >
            {d ? `${d} min` : t('Libre')}
          </button>
        ))}
        <button
          className="pill pill-ghost press"
          aria-pressed={custom}
          onClick={() => choose(minutes ?? 30, true)}
          style={{ height: 40 }}
        >
          {t('Otra')}
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
              <button className="stepper-btn press" aria-label={t("Menos")} onClick={() => { setMinutes(clampMinutes(minutes - 1)); audio.sfx('tick', minutes - 1) }}>
                −
              </button>
              <input
                type="range"
                min={MIN_CUSTOM}
                max={MAX_CUSTOM}
                step={1}
                value={minutes}
                onChange={(e) => {
                  setMinutes(Number(e.target.value))
                  audio.sfx('tick', Number(e.target.value))
                }}
                aria-label={t("Minutos")}
                style={{ '--fill': `${((minutes - MIN_CUSTOM) / (MAX_CUSTOM - MIN_CUSTOM)) * 100}%` } as React.CSSProperties}
              />
              <button className="stepper-btn press" aria-label={t("Más")} onClick={() => { setMinutes(clampMinutes(minutes + 1)); audio.sfx('tick', minutes + 1) }}>
                +
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
        {t('Las monedas llegan al completar la sesión, a partir de {min} min. Hoy llevas {today}/{cap}. Puedes bloquear el móvil: tu sesión sigue.', { min: ECONOMY.minMinutesForCoins, today: coinsToday, cap: ECONOMY.dailyCoinCap })}
      </p>
      <button className="pill pill-dark press" onClick={() => start(minutes)} style={{ height: 54, fontSize: 16 }}>
        {t('Empezar a cultivar')}
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
        {t('Planta semillas del Vivero: crecerán con los minutos que dediques aquí.')}
      </p>
    )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {waiting.length > 0 && (
        <>
          <div className="eyebrow">{t('Sin plantar')}</div>
          {waiting.map((it) => (
            <div key={it.id} className="row-card" style={{ padding: 12, gap: 12 }}>
              <KindGlyph kind={it.kind} color={paletteFor(it.kind, it.color)?.[0]} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{KIND_NAMES[it.kind]}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {t('Crece con {n} min de Cultivar', { n: it.growth!.need })}
                </div>
              </div>
              <button className="pill pill-dark press" onClick={() => startPlacing(it.id)} style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
                {t('Plantar')}
              </button>
            </div>
          ))}
        </>
      )}
      {growing.length > 0 && <div className="eyebrow" style={{ marginTop: waiting.length ? 8 : 0 }}>{t('Creciendo con tu tiempo')}</div>}
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
        <NumericText value={formatClock(free ? clock.elapsed : (clock.remaining ?? 0))} direction={free ? 1 : -1} />
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(27,31,28,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${clock.progress * 100}%`, background: 'var(--ink)', transition: 'width .25s linear' }} />
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
        {free ? t('Modo libre: termina cuando quieras.') : t('De {n} minutos.', { n: session.targetMinutes ?? 0 })} {t('Bloquea el móvil o deja el modo reposo: el tiempo sigue contando.')}
        {TIME_SCALE > 1 && ` ${t('(Modo rápido: 1 s = 1 min)')}`}
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="pill pill-dark press" onClick={() => setRest(true)} style={{ flex: 1, height: 50 }}>
          <MoonIcon size={17} />
          {t('Modo reposo')}
        </button>
        {free && (
          <button className="pill pill-ghost press" onClick={complete} style={{ flex: 1, height: 50 }}>
            {t('Terminar')}
          </button>
        )}
      </div>
      <button className="press muted" onClick={cancel} style={{ alignSelf: 'center', fontSize: 14, fontWeight: 600, height: 40 }}>
        {t('Abandonar sesión')}
      </button>
    </div>
  )
}

export function SessionWatcher() {
  const clock = useSessionClock()
  const complete = useGrove((s) => s.completeSession)
  const finished = clock?.remaining === 0
  useEffect(() => {
    if (finished) complete()
  }, [finished, complete])
  return null
}
