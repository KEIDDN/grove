import { useEffect, useRef, useState, type ComponentType } from 'react'
import { animate, AnimatePresence, motion } from 'motion/react'
import { audio } from '../audio/engine'
import type { Celebration, CelebrationIcon, CelebrationLine } from '../game/celebrations'
import { cellToWorld, plotBounds } from '../game/garden'
import { useGrove } from '../game/store'
import { focusOn, resetView } from '../scene/camera'
import { flyCoins } from './CoinFlights'
import { iriStyle, KindGlyph, VisitorGlyph } from './glyphs'
import { BookIcon, CalmIcon, CheckIcon, CoinIcon, ExpandIcon, HeartIcon, JournalIcon, SproutIcon, TimerIcon, TrophyIcon } from './icons'
import { bouncy, softSpring, spring } from './motion'
import { NumericText } from './NumericText'

export const CELEBRATION_ICONS: Record<CelebrationIcon, ComponentType<{ size?: number }>> = {
  coin: CoinIcon,
  focus: TimerIcon,
  roots: JournalIcon,
  read: BookIcon,
  parcel: ExpandIcon,
  trophy: TrophyIcon,
  mission: CheckIcon,
  plant: SproutIcon,
  visitor: HeartIcon,
  calm: CalmIcon,
}

const ACTION_LABELS = { tend: 'Otra sesión', expand: 'Ampliar ahora', album: 'Ver el álbum', calm: 'Otra vez' } as const

/** Enseña de una en una las celebraciones medianas y grandes que hay en cola. */
export function Celebrations() {
  const current = useGrove((s) => s.celebrations[0])
  return <AnimatePresence mode="wait">{current && (current.level === 'big' ? <BigMoment key={current.id} c={current} /> : <MediumCard key={current.id} c={current} />)}</AnimatePresence>
}

/** Mientras dura la celebración, la cámara se acerca a lo que ha pasado y luego vuelve. */
function useCameraFocus(c: Celebration, zoom: number) {
  useEffect(() => {
    const plots = useGrove.getState().plots
    const b = plotBounds(plots)
    let id: ReturnType<typeof setTimeout>
    if (c.focus) {
      const [wx, wz] = cellToWorld(c.focus.x, c.focus.z, c.focus.kind)
      // Un instante para que el panel termine de cerrarse antes de empezar el plano
      id = setTimeout(() => focusOn(wx - b.cx, wz - b.cz, zoom), 280)
    } else if (c.level === 'big') id = setTimeout(() => focusOn(0, 0, 1.15), 200)
    return () => {
      clearTimeout(id)
      resetView(2.4)
    }
  }, [c, zoom])
}

function useDismiss() {
  const dismiss = useGrove((s) => s.dismissCelebration)
  const setTab = useGrove((s) => s.setTab)
  const openYou = useGrove((s) => s.openYou)
  const setEditMode = useGrove((s) => s.setEditMode)
  const setEditTool = useGrove((s) => s.setEditTool)
  return (c: Celebration, action?: Celebration['action']) => {
    // Si se cierra antes de que salgan sus monedas, se suman de golpe: el contador no se queda corto
    if (c.coins && !launched.has(c.id)) useGrove.getState().releaseCoins(c.coins)
    dismiss()
    if (action === 'tend') setTab('tend')
    if (action === 'calm') setTab('calm')
    if (action === 'album') openYou('album')
    if (action === 'expand') {
      setEditMode(true)
      setEditTool('expand')
    }
  }
}

/** Celebraciones cuyas monedas ya han salido volando. */
const launched = new Set<number>()

/** Las monedas que trae la celebración salen volando desde su cifra al poco de aparecer. */
function useCoinLaunch(c: Celebration, from: React.RefObject<HTMLElement | null>, delay: number) {
  useEffect(() => {
    if (!c.coins || launched.has(c.id)) return
    const id = setTimeout(() => {
      launched.add(c.id)
      flyCoins(from.current, c.coins!)
    }, delay)
    return () => clearTimeout(id)
  }, [c, from, delay])
}

// ——— Mediana: tarjeta abajo, con la cifra grande y lo que ha pasado ———

function MediumCard({ c }: { c: Celebration }) {
  const close = useDismiss()
  const number = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(0)
  useCameraFocus(c, 1.9)
  useCoinLaunch(c, number, 900)
  useEffect(() => {
    audio.sfx(c.first ? 'big' : 'medium')
    // La cifra cuenta desde cero en cuanto la tarjeta ha entrado: rápido al principio y frenando al final
    let stop: (() => void) | undefined
    const id = setTimeout(() => {
      const a = animate(0, c.coins ?? 0, { duration: Math.min(1.1, 0.45 + (c.coins ?? 0) / 90), ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setShown(Math.round(v)) })
      stop = () => a.stop()
    }, 320)
    return () => {
      clearTimeout(id)
      stop?.()
    }
  }, [c])

  const Icon = CELEBRATION_ICONS[c.icon]
  return (
    <>
      <motion.div className="celebrate-scrim" onClick={() => close(c)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.section
        className="celebrate-card glass"
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, y: 60, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97, transition: { duration: 0.22 } }}
        transition={spring}
      >
        {c.first && <Sparkles count={14} spread={150} />}
        <div className="celebrate-head">
          <motion.span className="celebrate-badge iri" style={iriStyle(c.id)} initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...bouncy, delay: 0.08 }}>
            <Icon size={18} />
          </motion.span>
          <span className="eyebrow">{c.eyebrow}</span>
        </div>

        {c.coins ? (
          <div className="celebrate-amount">
            <CoinIcon size={38} />
            <span ref={number} className="display" style={{ fontSize: 76 }}>
              <span className="celebrate-plus">+</span>
              <NumericText value={shown} direction={1} fast />
            </span>
          </div>
        ) : null}
        <div className={c.coins ? 'celebrate-title' : 'celebrate-title celebrate-title-big'}>{c.title}</div>
        {c.detail && <p className="muted celebrate-detail">{c.detail}</p>}

        {!!c.lines?.length && (
          <ul className="celebrate-lines">
            {c.lines.map((l, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...softSpring, delay: 0.45 + i * 0.08 }}>
                <LineGlyph line={l} />
                <span>{l.text}</span>
              </motion.li>
            ))}
          </ul>
        )}

        <div className="celebrate-actions">
          <button className="pill pill-dark press" onClick={() => close(c)} style={{ flex: 1, height: 50 }}>
            Seguir
          </button>
          {c.action && (
            <button className="pill pill-ghost press" onClick={() => close(c, c.action)} style={{ flex: 1, height: 50 }}>
              {ACTION_LABELS[c.action]}
            </button>
          )}
        </div>
      </motion.section>
    </>
  )
}

function LineGlyph({ line }: { line: CelebrationLine }) {
  if (line.visitor) return <span className="celebrate-glyph"><VisitorGlyph type={line.visitor} size={26} /></span>
  if (line.kind) return <span className="celebrate-glyph"><KindGlyph kind={line.kind} color={line.color} size={30} /></span>
  return (
    <span className="celebrate-glyph celebrate-check">
      <CheckIcon size={13} />
    </span>
  )
}

// ——— Grande: pantalla completa ———

function BigMoment({ c }: { c: Celebration }) {
  const close = useDismiss()
  const badge = useRef<HTMLDivElement>(null)
  const ready = useRef(false)
  useCameraFocus(c, 2.1)
  useCoinLaunch(c, badge, 1300)
  useEffect(() => {
    audio.sfx('big')
    // Un toque accidental justo al aparecer no la cierra
    const id = setTimeout(() => (ready.current = true), 900)
    return () => clearTimeout(id)
  }, [c])

  const Icon = CELEBRATION_ICONS[c.icon]
  return (
    <motion.div
      className="celebrate-big"
      role="dialog"
      aria-label={c.title}
      onClick={() => ready.current && close(c)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      transition={{ duration: 0.5 }}
    >
      <div className="celebrate-big-glow" />
      <div className="celebrate-big-body" onClick={(e) => e.stopPropagation()}>
        <div className="celebrate-big-badge-wrap">
          <motion.div className="celebrate-rays" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: 0.2 }} />
          <motion.div
            ref={badge}
            className="celebrate-big-badge iri"
            style={iriStyle(c.id + 1)}
            initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ ...bouncy, delay: 0.25 }}
          >
            {c.focus ? <KindGlyph kind={c.focus.kind} color={c.focus.color} size={88} /> : <Icon size={52} />}
          </motion.div>
          <Sparkles count={22} spread={190} delay={0.35} />
        </div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...softSpring, delay: 0.55 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <span className="eyebrow">{c.eyebrow}</span>
          <h2 className="display celebrate-big-title">{c.title}</h2>
          {c.detail && <p className="muted celebrate-big-detail">{c.detail}</p>}
          {!!c.coins && (
            <span className="celebrate-big-coins glass">
              <CoinIcon size={20} /> +{c.coins}
            </span>
          )}
        </motion.div>
        <motion.div className="celebrate-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...softSpring, delay: 0.8 }} style={{ width: '100%', maxWidth: 360 }}>
          {c.action && (
            <button className="pill pill-ghost press" onClick={() => close(c)} style={{ flex: 1, height: 52 }}>
              Más tarde
            </button>
          )}
          <button className="pill pill-dark press" onClick={() => close(c, c.action)} style={{ flex: 1, height: 52 }}>
            {c.action ? ACTION_LABELS[c.action] : 'Seguir'}
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ——— Destellos ———

const SPARK_COLORS = ['#F2D488', '#FDE4E8', '#E1E6FF', '#E3F3E6', '#FFF1D6', '#F2B48A']

/** Destellos que salen del centro, se frenan y caen un poco antes de apagarse. */
function Sparkles({ count, spread, delay = 0 }: { count: number; spread: number; delay?: number }) {
  const [sparks] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const dist = spread * (0.45 + Math.random() * 0.55)
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist * 0.75,
        size: 5 + Math.random() * 7,
        star: i % 3 === 0,
        color: SPARK_COLORS[i % SPARK_COLORS.length],
        d: 1.1 + Math.random() * 0.6,
        delay: delay + Math.random() * 0.12,
      }
    }),
  )
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
  return (
    <div className="sparkles" aria-hidden="true">
      {sparks.map((s, i) => (
        <motion.span
          key={i}
          className={s.star ? 'spark spark-star' : 'spark'}
          style={{ width: s.size, height: s.size, background: s.color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: [0, s.x, s.x * 1.05], y: [0, s.y, s.y + 26], scale: [0, 1, 0.2], opacity: [1, 1, 0] }}
          transition={{ duration: s.d, delay: s.delay, times: [0, 0.45, 1], ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}
