import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { audio } from '../audio/engine'
import { CATALOG, growthLabel } from '../game/catalog'
import { cellToWorld, findSpot, plotBounds, type GardenItem, type ItemKind } from '../game/garden'
import { useGrove } from '../game/store'
import { paletteFor } from '../game/variants'
import { breath, sceneFx } from '../scene/breath'
import { craneIn, focusOn, framing, view } from '../scene/camera'
import { iriStyle, KindGlyph } from './glyphs'
import { CalmIcon, JournalIcon, SproutIcon, TimerIcon } from './icons'
import { NumericText } from './NumericText'

/**
 * Bienvenida cinematográfica. Primero cuatro escenas que enseñan el juego en directo sobre la isla
 * (la cámara se mueve, una semilla crece, brotan flores, la isla respira, caen objetos) y luego lo
 * personal: tu nombre, qué quieres cuidar, tu ritmo y tu primera semilla. Termina con el jardín
 * naciendo delante de ti.
 */

const AREAS = ['Estrés', 'Concentración', 'Descanso', 'Relaciones', 'Autoestima', 'Hábitos', 'Ansiedad', 'Creatividad']
const FIRST_SEEDS = ['flower', 'bush', 'pine']
const EASE = [0.2, 0.8, 0.2, 1] as const

type SceneId = 'intro' | 'focus' | 'roots' | 'calm' | 'yours' | 'promise' | 'name' | 'care' | 'rhythm' | 'gift'

// El guion: cercano, en segunda persona, sin prisa. Cada escena cuenta qué hace esa parte de la
// app y por qué te cuida, con la metáfora del jardín: tú eres lo que crece.
const SCENES: Array<{ id: SceneId; eyebrow?: string; title: string; body: string; chip?: { label: string; icon: ReactNode } }> = [
  {
    id: 'intro',
    eyebrow: 'Grove',
    title: 'Cuídate.\nMira cómo florece.',
    body: 'Sabemos que a veces cuesta parar. Por eso esta isla es tuya: crece cada vez que te regalas un rato, por pequeño que sea.',
  },
  {
    id: 'focus',
    title: 'Siembra tu tiempo.',
    body: 'Cuando tengas algo entre manos, pon un temporizador y quédate ahí un rato. Cada minuto riega tus semillas: hoy un brote, mañana un árbol.',
    chip: { label: 'Cultivar', icon: <TimerIcon size={14} /> },
  },
  {
    id: 'roots',
    title: 'Echa raíces.',
    body: '¿Qué tal estás, de verdad? Aquí puedes contarlo sin filtros. Cada día te haremos un par de preguntas para escucharte, y cada página hace florecer algo. Solo lo lees tú.',
    chip: { label: 'Raíces', icon: <JournalIcon size={14} /> },
  },
  {
    id: 'calm',
    title: 'Respira.',
    body: 'Hay días que van demasiado rápido. Para un minuto y respira con tu isla. Eso también cuenta, y también la hace crecer.',
    chip: { label: 'Calma', icon: <CalmIcon size={14} /> },
  },
  {
    id: 'yours',
    title: 'Hazlo tuyo.',
    body: 'Con lo que ganas, decórala a tu manera. Y mientras estás fuera, alguien pasará a verte y te dejará un detalle.',
    chip: { label: 'Tu jardín', icon: <SproutIcon size={14} /> },
  },
  {
    id: 'promise',
    title: 'Aquí nada\nse marchita.',
    body: 'Si un día no puedes venir, no pasa nada. Tu jardín te espera tal y como lo dejaste. Vuelve cuando lo necesites.',
  },
]
const STORY = SCENES.length

/** Coloca un objeto de muestra en el sitio libre más cercano al centro. */
function addDemo(kind: ItemKind, extra: Partial<GardenItem> = {}): GardenItem | null {
  const s = useGrove.getState()
  const spot = findSpot(s.items, s.plots, kind)
  if (!spot) return null
  const item: GardenItem = { id: `ob-${kind}-${Math.random().toString(36).slice(2, 7)}`, kind, x: spot[0], z: spot[1], rot: 0, ...extra }
  useGrove.setState({ items: [...s.items, item] })
  return item
}

/** Desliza la cámara hacia un objeto: despacio, sin cortes, como un travelling. */
function look(item: GardenItem | null, zoom: number) {
  if (!item) return
  const b = plotBounds(useGrove.getState().plots)
  const [wx, wz] = cellToWorld(item.x, item.z, item.kind)
  focusOn(wx - b.cx, wz - b.cz, zoom)
  view.speed = 1.15
}

/** Vuelve al plano general con la misma suavidad. */
function wide(zoom = 1) {
  view.targetZoom = zoom
  view.targetPanX = 0
  view.targetPanZ = 0
  view.speed = 1.15
}

/** Lleva la luz a una hora poco a poco (o de vuelta a la real con `null`). */
function tweenHour(to: number | null, ms = 2600): () => void {
  const from = useGrove.getState().hourOverride ?? new Date().getHours() + new Date().getMinutes() / 60
  const target = to ?? new Date().getHours() + new Date().getMinutes() / 60
  const t0 = performance.now()
  let raf = 0
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms)
    const e = 0.5 - Math.cos(k * Math.PI) / 2
    useGrove.getState().setHourOverride(k >= 1 && to === null ? null : from + (target - from) * e)
    // Unos 15 pasos por segundo bastan para que la luz cambie suave
    if (k < 1) raf = window.setTimeout(step, 66)
  }
  step()
  return () => clearTimeout(raf)
}

const clearDemos = () => useGrove.setState((s) => ({ items: s.items.filter((it) => !it.id.startsWith('ob-')) }))

/** Lo que pasa en la isla en cada escena. Devuelve cómo pararlo. */
function playScene(id: SceneId): () => void {
  const timers: number[] = []
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms))
  breath.active = false
  // Cada escena enseña lo suyo: lo de la anterior se retira (y volver atrás no lo duplica)
  clearDemos()
  if (id === 'intro') {
    framing.lift = 0.16
    framing.factor = 0.82
    craneIn()
  } else if (id === 'focus') {
    framing.lift = 0.2
    framing.factor = 0.78
    // Una semilla de pino que crece en directo: montículo, brote y árbol
    const seed = addDemo('pine', { growth: { by: 'focus', need: 60, progress: 0 } })
    later(() => look(seed, 1.45), 150)
    let progress = 0
    // Pocas etapas bien marcadas (montículo, brote, arbolito, árbol): cada cambio es visible y barato
    const grow = () => {
      progress += 15
      if (!seed) return
      useGrove.setState((s) => ({
        items: s.items.map((it) => (it.id === seed.id ? { ...it, growth: progress >= 60 ? undefined : { by: 'focus', need: 60, progress } } : it)),
      }))
      if (progress < 60) audio.sfx('tick', progress)
      if (progress >= 60) audio.sfx('medium')
      else later(grow, 700)
    }
    later(grow, 1100)
  } else if (id === 'roots') {
    framing.lift = 0.2
    framing.factor = 0.78
    // Flores que brotan una a una, como al guardar una página
    const blooms: Array<[ItemKind, string | undefined]> = [
      ['tulips', undefined],
      ['flower', '#EBA3B8'],
      ['flower', '#B9A5DB'],
      ['tulips', undefined],
      ['flower', '#F0CF6E'],
    ]
    blooms.forEach(([kind, color], i) =>
      later(() => {
        const f = addDemo(kind, { color })
        if (i === 0) look(f, 1.85)
        audio.sfx('coin', i * 2)
      }, 700 + i * 380),
    )
  } else if (id === 'calm') {
    framing.lift = 0.18
    framing.factor = 0.8
    wide(1.05)
    // La luz baja hacia el atardecer mientras la isla respira: cuatro segundos para llenarse y cuatro para soltar
    const hourBefore = useGrove.getState().hourOverride
    const stopLight = tweenHour(19.1)
    breath.active = true
    const t0 = performance.now()
    let raf = 0
    const tick = () => {
      const t = ((performance.now() - t0) / 1000) % 8
      const p = t < 4 ? t / 4 : 1 - (t - 4) / 4
      breath.fill = 0.5 - Math.cos(p * Math.PI) / 2
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf)
      stopLight()
      tweenHour(hourBefore, 1400)
      breath.active = false
      breath.fill = 0
    }
  } else if (id === 'yours') {
    framing.lift = 0.2
    framing.factor = 0.78
    // Objetos que caen y aterrizan con su rebote
    let lantern: GardenItem | null = null
    later(() => {
      lantern = addDemo('lantern')
      look(lantern, 1.45)
      audio.sfx('small')
    }, 500)
    later(() => {
      addDemo('bench', { rot: 1 })
      audio.sfx('small')
    }, 1100)
    later(() => {
      addDemo('birdhouse')
      audio.sfx('small')
    }, 1700)
    // Y alguien viene de visita: así se entiende lo de los visitantes
    later(() => {
      useGrove.setState({ toast: { id: Date.now(), text: 'Una ardilla ha pasado a verte', icon: 'visitor' } })
    }, 2700)
  } else if (id === 'promise') {
    framing.lift = 0.14
    framing.factor = 0.84
    wide(0.92)
    // Hojas que caen despacio sobre la isla: el tiempo pasa y aquí no se pierde nada
    sceneFx.particles = 2.6
    return () => {
      timers.forEach(clearTimeout)
      sceneFx.particles = 1
    }
  } else {
    // Lo personal: tarjeta abajo y la isla más arriba y más pequeña
    framing.lift = 0.3
    framing.factor = 0.55
    wide()
  }
  return () => timers.forEach(clearTimeout)
}

export function Onboarding() {
  const complete = useGrove((s) => s.completeOnboarding)
  const giftGiven = useGrove((s) => s.giftGiven)
  const [index, setIndex] = useState(0)
  const [userName, setUserName] = useState('')
  const [gardenName, setGardenName] = useState('')
  const [areas, setAreas] = useState<string[]>([])
  const [weekGoal, setWeekGoal] = useState(3)
  const [seed, setSeed] = useState('flower')
  const personal: SceneId[] = giftGiven ? ['name', 'care', 'rhythm'] : ['name', 'care', 'rhythm', 'gift']
  const order: SceneId[] = [...SCENES.map((s) => s.id), ...personal]
  const id = order[index]
  const last = index === order.length - 1

  // Al entrar: fuera lo que pudiera quedar de una bienvenida a medias, y la cámara manda la bienvenida
  useEffect(() => {
    clearDemos()
    // Sin portada: al terminar se entra directo al jardín
    useGrove.getState().dismissSplash()
    framing.active = true
    // La cámara no se para nunca: gira muy despacio alrededor de la isla durante toda la bienvenida
    let last = performance.now()
    let raf = 0
    const orbit = () => {
      const now = performance.now()
      view.targetAzimuth += ((now - last) / 1000) * 0.07
      last = now
      raf = requestAnimationFrame(orbit)
    }
    raf = requestAnimationFrame(orbit)
    return () => {
      cancelAnimationFrame(raf)
      framing.active = false
      breath.active = false
      sceneFx.particles = 1
    }
  }, [])

  useEffect(() => {
    // Un instante para que el encuadre automático no pise el primer plano
    let stop = () => {}
    const t = window.setTimeout(() => (stop = playScene(id)), 40)
    return () => {
      clearTimeout(t)
      stop()
    }
  }, [id])

  const next = () => {
    audio.unlock()
    if (last) return finish()
    // Al pasar a lo personal, lo enseñado se retira del jardín
    if (index === STORY - 1) clearDemos()
    setIndex((n) => n + 1)
  }
  const back = () => setIndex((n) => Math.max(0, n - 1))
  const skip = () => {
    audio.unlock()
    clearDemos()
    setIndex(STORY)
  }
  const finish = () => {
    clearDemos()
    complete({ userName, gardenName: gardenName || (userName ? `El jardín de ${userName.trim()}` : 'Tu jardín'), focusAreas: areas, weekGoal, firstSeed: seed })
  }

  // Con el teclado abierto (iPhone), todo sube para que la tarjeta no quede tapada
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.current?.style.setProperty('--kb', `${kb}px`)
    }
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', onResize)
    }
  }, [])

  // Deslizar a los lados en las escenas para avanzar o volver
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const story = index < STORY
  const scene = SCENES[index]

  return (
    <div
      ref={root}
      className={story ? 'ob ob-story' : 'ob ob-personal'}
      onPointerDown={(e) => story && (swipe.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const s = swipe.current
        swipe.current = null
        if (!s) return
        const dx = e.clientX - s.x
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) (dx < 0 ? next : back)()
      }}
    >
      <div className="ob-top">
        <div className="ob-progress" aria-hidden="true">
          {order.map((o, i) => (
            <span key={o} className={i < index ? 'done' : i === index ? 'on' : ''}>
              {i === index && <motion.i layoutId="ob-progress" transition={{ type: 'spring', duration: 0.5, bounce: 0 }} />}
            </span>
          ))}
        </div>
        {story && (
          <button className="ob-skip press" onClick={skip}>
            Saltar
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {story ? (
          <motion.section key={scene.id} className="ob-scene" initial="hidden" animate="shown" exit="gone" aria-live="polite">
            {scene.eyebrow ? (
              <motion.div className="ob-brand" variants={fade(0.2)}>
                <span className="ob-brand-mark">
                  <SproutIcon size={16} strokeWidth={2} />
                </span>
                {scene.eyebrow}
              </motion.div>
            ) : (
              scene.chip && (
                <motion.div className="ob-chip" variants={fade(0.1)}>
                  {scene.chip.icon}
                  {scene.chip.label}
                </motion.div>
              )
            )}
            <h1 className={scene.id === 'intro' ? 'ob-title ob-title-hero' : 'ob-title'}>
              {scene.title.split('\n').map((line, i) => (
                <motion.span key={i} variants={rise(0.25 + i * 0.18)}>
                  {line}
                </motion.span>
              ))}
            </h1>
            <motion.p className="ob-body" variants={fade(0.6)}>
              {scene.body}
            </motion.p>
          </motion.section>
        ) : (
          <motion.section
            key={id}
            className="ob-card glass"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', duration: 0.6, bounce: 0.1 }}
          >
            {id === 'name' && (
              <Personal eyebrow="Para empezar" title="¿Cómo te llamas?" hint="Para saludarte cuando vuelvas.">
                <Field label="Tu nombre (opcional)" value={userName} onChange={setUserName} placeholder="Tu nombre" />
                <Field label="El nombre de tu jardín" value={gardenName} onChange={setGardenName} placeholder={userName ? `El jardín de ${userName}` : 'Tu jardín'} />
              </Personal>
            )}
            {id === 'care' && (
              <Personal eyebrow="Tu bienestar" title="¿Qué te gustaría cuidar?" hint="No hay respuestas correctas. Elige lo que sientas hoy y tus preguntas serán más tuyas.">
                <div className="ob-areas">
                  {AREAS.map((a) => (
                    <button
                      key={a}
                      className="pill pill-ghost press"
                      aria-pressed={areas.includes(a)}
                      onClick={() => {
                        audio.sfx('tick', areas.length)
                        setAreas((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]))
                      }}
                      style={{ height: 40 }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </Personal>
            )}
            {id === 'rhythm' && (
              <Personal eyebrow="Tu ritmo" title="¿Cuántos días a la semana quieres venir?" hint="Elige algo que puedas cumplir. Si una semana no llegas, empiezas otra sin perder nada.">
                <div className="ob-rhythm">
                  <button className="pill pill-ghost press" onClick={() => (audio.sfx('tick', weekGoal - 1), setWeekGoal((g) => Math.max(1, g - 1)))} aria-label="Menos días">
                    −
                  </button>
                  <span className="display" style={{ fontSize: 92, minWidth: 80, textAlign: 'center' }}>
                    <NumericText value={weekGoal} />
                  </span>
                  <button className="pill pill-ghost press" onClick={() => (audio.sfx('tick', weekGoal + 1), setWeekGoal((g) => Math.min(7, g + 1)))} aria-label="Más días">
                    +
                  </button>
                </div>
              </Personal>
            )}
            {id === 'gift' && (
              <Personal eyebrow="Un regalo para empezar" title="Elige tu primera semilla" hint="La plantamos juntos ahora mismo. Crecerá con cada rato que te dediques.">
                <div className="ob-seeds">
                  {FIRST_SEEDS.map((sid, i) => {
                    const c = CATALOG.find((x) => x.id === sid)!
                    const on = seed === sid
                    return (
                      <button key={sid} className="iri press ob-seed" onClick={() => (audio.sfx('tick', i), setSeed(sid))} aria-pressed={on} style={iriStyle(i)}>
                        <motion.span animate={{ scale: on ? 1.08 : 1, y: on ? -2 : 0 }} transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }} style={{ position: 'relative', zIndex: 2 }}>
                          <KindGlyph kind={c.kind} color={paletteFor(c.kind, c.color)?.[0]} size={52} />
                        </motion.span>
                        <span style={{ fontSize: 14, fontWeight: 700, position: 'relative', zIndex: 2 }}>{c.name}</span>
                        <span className="muted" style={{ fontSize: 11, fontWeight: 600, position: 'relative', zIndex: 2, textAlign: 'center' }}>
                          {growthLabel(c.seed!)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Personal>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <div className="ob-actions">
        {index > 0 && (
          <button className="pill pill-ghost press ob-back" onClick={back} aria-label="Atrás">
            Atrás
          </button>
        )}
        <button className="pill pill-dark press ob-next" onClick={next}>
          {index === 0 ? 'Empezar' : last ? (giftGiven ? 'Entrar' : 'Plantar y entrar') : 'Continuar'}
        </button>
      </div>
    </div>
  )
}

// Solo opacidad y movimiento: el desenfoque animado en textos grandes es muy caro en el iPhone
const fade = (delay: number) => ({
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.8, delay, ease: EASE } },
  gone: { opacity: 0, transition: { duration: 0.25 } },
})

const rise = (delay: number) => ({
  hidden: { opacity: 0, y: 28 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.9, delay, ease: EASE } },
  gone: { opacity: 0, y: -10, transition: { duration: 0.25 } },
})

function Personal({ eyebrow, title, hint, children }: { eyebrow: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="title" style={{ marginTop: 4, fontSize: 30 }}>
          {title}
        </h2>
      </div>
      {hint && (
        <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 24))}
        placeholder={placeholder}
        className="ob-input"
      />
    </label>
  )
}
