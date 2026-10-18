import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { audio } from '../../audio/engine'
import { emotionsFor, FACTORS, MOOD_COLORS, moodColor, moodLabel, type Mood } from '../../game/mood'
import { GROUP_NAMES, questionsFor } from '../../game/questions'
import { useGrove, type RootAnswer, type RootEntry } from '../../game/store'
import { dayKey } from '../../game/time'
import { CheckIcon, ChevronIcon, EditIcon, LockIcon } from '../icons'
import { Segments, Sheet, SwapIn } from '../Sheet'

const longDate = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'short' })

const parseDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export function RootsSheet() {
  const [view, setView] = useState<'today' | 'journal'>('today')
  const [openDay, setOpenDay] = useState<string | null>(null)
  // Tocar un día escrito de la semana abre esa página (hoy, en la pestaña Hoy)
  const pickDay = (date: string) => {
    if (date === dayKey()) {
      setView('today')
      return
    }
    setOpenDay(date)
    setView('journal')
  }
  return (
    <Sheet eyebrow={longDate.format(new Date())} title="Raíces" accent="roots" hero={<WeekStrip onPick={pickDay} />}>
      <Segments
        id="roots"
        items={[
          { id: 'today', label: 'Hoy' },
          { id: 'journal', label: 'Diario' },
        ]}
        value={view}
        onChange={(v) => {
          setOpenDay(null)
          setView(v)
        }}
      />
      <SwapIn id={view}>{view === 'today' ? <Today /> : <Journal open={openDay} setOpen={setOpenDay} />}</SwapIn>
    </Sheet>
  )
}

function Today() {
  const entries = useGrove((s) => s.entries)
  const save = useGrove((s) => s.saveRoot)
  const today = entries.find((e) => e.date === dayKey())
  // El ánimo ocupa el sitio de la pregunta de "Cómo estás": quedan dos preguntas y la reflexión
  const questions = questionsFor(dayKey()).filter((q) => q.group !== 'feel')
  const [editing, setEditing] = useState(!today)
  const [mood, setMood] = useState<Mood | null>(today?.mood ?? null)
  const [answers, setAnswers] = useState<string[]>(() => questions.map((q) => today?.answers.find((a) => a.question === q.text)?.text ?? ''))
  const [reflection, setReflection] = useState(today?.reflection ?? '')
  const answered = answers.filter((a) => a.trim()).length

  if (today && !editing) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Page entry={today} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="pill pill-ghost press" onClick={() => setEditing(true)} style={{ height: 40 }}>
            <EditIcon size={15} strokeWidth={2} /> Editar
          </button>
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
            Mañana tendrás tres preguntas nuevas.
          </span>
        </div>
        <Privacy />
      </div>
    )
  }

  const submit = () => {
    const list: RootAnswer[] = questions.map((q, i) => ({ question: q.text, group: q.group, text: answers[i] }))
    save(list, reflection, mood ?? undefined)
    setEditing(false)
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <MoodStep mood={mood} onChange={setMood} />
      {questions.map((q, i) => (
        <div key={q.text} className="q-card">
          <div className="q-head">
            <span className="q-num">{String(i + 1).padStart(2, '0')}</span>
            <span className={answers[i].trim() ? 'q-check on' : 'q-check'} aria-hidden="true">
              <CheckIcon size={12} strokeWidth={2.6} />
            </span>
          </div>
          <div className="eyebrow">{GROUP_NAMES[q.group]}</div>
          <label htmlFor={`q-${i}`}>{q.text}</label>
          <AutoArea id={`q-${i}`} value={answers[i]} onChange={(v) => setAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))} placeholder="Escribe con calma…" />
        </div>
      ))}

      <div className="q-card">
        <div className="eyebrow">Reflexión libre · opcional</div>
        <label htmlFor="reflection" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-soft)' }}>
          Cualquier cosa que quieras dejar escrita hoy.
        </label>
        <AutoArea id="reflection" value={reflection} onChange={setReflection} placeholder="Hoy…" />
      </div>

      <div className="save-row">
        <button className="pill pill-dark press" disabled={!answered && !reflection.trim() && !mood} onClick={submit} style={{ height: 54, fontSize: 15 }}>
          {today ? 'Guardar cambios' : `Guardar en Raíces${answered ? ` · ${answered}/${questions.length}` : ''}`}
        </button>
      </div>
      <Privacy />
    </div>
  )
}

// La flor 3D se carga aparte: Raíces abre al momento y el capullo aparece en cuanto está listo
const Bud = lazy(() => import('../../scene/Bud').then((m) => ({ default: m.Bud })))

/**
 * Primer paso de la página: cómo te sientes hoy. Un capullo que se abre al deslizar (del lavanda
 * al melocotón) y, al elegir, las emociones que lo describen y lo que ha influido.
 */
function MoodStep({ mood, onChange }: { mood: Mood | null; onChange: React.Dispatch<React.SetStateAction<Mood | null>> }) {
  const [exact, setExact] = useState(mood?.level ?? 4)
  const level = Math.round(exact)
  const emotions = emotionsFor(level)
  /** Siempre sobre el último estado: dos toques seguidos no se pisan. */
  const toggleIn = (key: 'emotions' | 'factors', item: string) =>
    onChange((m) => {
      const base = m ?? { level, emotions: [], factors: [] }
      return { ...base, [key]: toggle(base[key], item) }
    })
  const onSlide = (v: number) => {
    setExact(v)
    const next = Math.round(v)
    if (next !== Math.round(exact)) audio.sfx('tick', next)
    // Al cambiar de lado (desagradable ↔ agradable) las emociones de antes ya no encajan
    onChange((m) => ({ level: next, emotions: m?.emotions.filter((e) => emotionsFor(next).includes(e)) ?? [], factors: m?.factors ?? [] }))
  }
  const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

  return (
    <div className="q-card mood-card" style={{ '--mood': moodColor(level) } as React.CSSProperties}>
      <div className="eyebrow">Cómo estás</div>
      <label htmlFor="mood" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>
        ¿Cómo te sientes hoy?
      </label>
      <div className="mood-bud">
        <div className="mood-glow" />
        <Suspense fallback={<div style={{ height: 220 }} />}>
          <Bud value={(exact - 1) / 6} height={220} />
        </Suspense>
      </div>
      <div className="mood-label" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={mood ? level : 'none'}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ type: 'spring', duration: 0.45, bounce: 0 }}
          >
            {mood ? moodLabel(level) : 'Desliza para elegir'}
          </motion.span>
        </AnimatePresence>
      </div>
      <input
        id="mood"
        className="mood-slider"
        type="range"
        min={1}
        max={7}
        step={0.01}
        value={exact}
        onChange={(e) => onSlide(Number(e.target.value))}
        // Al soltar se asienta en el nivel más cercano
        onPointerUp={() => setExact(level)}
        onTouchEnd={() => setExact(level)}
        aria-valuetext={moodLabel(level)}
        data-no-sheet-drag=""
        style={{ background: `linear-gradient(90deg, ${MOOD_COLORS.join(', ')})` }}
      />
      <div className="mood-ends muted">
        <span>Muy desagradable</span>
        <span>Muy agradable</span>
      </div>

      <AnimatePresence initial={false}>
        {mood && (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="mood-group">
              <div className="mood-group-title">¿Qué lo describe mejor?</div>
              <div className="mood-chips">
                {emotions.map((e) => (
                  <button key={e} className="mood-chip press" aria-pressed={mood.emotions.includes(e)} onClick={() => toggleIn('emotions', e)}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="mood-group">
              <div className="mood-group-title">¿Qué ha influido?</div>
              <div className="mood-chips">
                {FACTORS.map((f) => (
                  <button key={f} className="mood-chip press" aria-pressed={mood.factors.includes(f)} onClick={() => toggleIn('factors', f)}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Campo que crece con lo que escribes, sin barras de scroll dentro de la tarjeta. */
function AutoArea({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return <textarea ref={ref} id={id} rows={1} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
}

/** La semana de un vistazo: qué días has escrito. */
function WeekStrip({ onPick }: { onPick: (date: string) => void }) {
  const entries = useGrove((s) => s.entries)
  const written = new Set(entries.map((e) => e.date))
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
  const letters = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  return (
    <div className="week-strip" role="list" aria-label="Días escritos esta semana">
      {days.map((d, i) => {
        const key = dayKey(d)
        const done = written.has(key)
        const isToday = key === dayKey(today)
        return (
          <button
            key={key}
            role="listitem"
            className={`week-day press${done ? ' done' : ''}${isToday ? ' today' : ''}`}
            disabled={!done && !isToday}
            onClick={() => onPick(key)}
            aria-label={`${letters[i]} ${d.getDate()}: ${done ? 'ver lo que escribiste' : 'sin escribir'}`}
          >
            <i>{d.getDate()}</i>
            {letters[i]}
          </button>
        )
      })}
    </div>
  )
}

function Privacy() {
  return (
    <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
      <LockIcon size={14} strokeWidth={2} />
      Tu diario vive solo en este dispositivo. Nunca se comparte.
    </div>
  )
}

/** Una página del diario, en modo lectura. */
function Page({ entry }: { entry: RootEntry }) {
  return (
    <article className="iri" style={{ borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {entry.mood && (
        <div className="page-mood">
          <span className="page-mood-dot" style={{ background: moodColor(entry.mood.level) }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{moodLabel(entry.mood.level)}</div>
            {(entry.mood.emotions.length > 0 || entry.mood.factors.length > 0) && (
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {entry.mood.emotions.join(', ')}
                {entry.mood.emotions.length > 0 && entry.mood.factors.length > 0 && ' · '}
                {entry.mood.factors.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
      {entry.answers.map((a) => (
        <div key={a.question} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>{a.question}</div>
          <div style={{ fontSize: 16, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{a.text}</div>
        </div>
      ))}
      {entry.reflection && (
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 12, borderTop: '1px solid rgba(27,31,28,0.08)' }}>
          <div className="eyebrow">Reflexión</div>
          <div style={{ fontSize: 16, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{entry.reflection}</div>
        </div>
      )}
    </article>
  )
}

function Journal({ open, setOpen }: { open: string | null; setOpen: (date: string | null) => void }) {
  const entries = useGrove((s) => s.entries)
  const selected = entries.find((e) => e.date === open)

  if (selected) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button className="press muted" onClick={() => setOpen(null)} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}>
          <ChevronIcon size={15} strokeWidth={2.4} style={{ transform: 'rotate(90deg)' }} /> Todas las páginas
        </button>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{capitalize(longDate.format(parseDay(selected.date)))}</div>
        <Page entry={selected} />
      </div>
    )
  }

  if (!entries.length) {
    return (
      <p className="muted fade-in" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        Aquí irán quedando tus páginas, día a día. Escribe la primera en Hoy.
      </p>
    )
  }

  // Agrupadas por mes, de la más reciente a la más antigua
  const months = new Map<string, RootEntry[]>()
  for (const e of [...entries].sort((a, b) => b.date.localeCompare(a.date))) {
    const k = e.date.slice(0, 7)
    months.set(k, [...(months.get(k) ?? []), e])
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <MoodCalendar entries={entries} onOpen={setOpen} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="display" style={{ fontSize: 56 }}>
          {entries.length}
        </span>
        <span className="muted" style={{ fontSize: 13 }}>
          {entries.length === 1 ? 'página escrita' : 'páginas escritas'}
        </span>
      </div>
      {[...months.entries()].map(([month, list]) => (
        <section key={month} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="eyebrow">{monthLabel.format(parseDay(`${month}-01`))}</div>
          {list.map((e) => {
            const d = parseDay(e.date)
            const preview = e.answers.find((a) => a.text)?.text ?? e.reflection ?? ''
            return (
              <button key={e.date} className="row-card press" onClick={() => setOpen(e.date)} style={{ textAlign: 'left', width: '100%' }}>
                <div style={{ width: 44, flex: 'none', textAlign: 'center', position: 'relative' }}>
                  {e.mood && <span className="row-mood" style={{ background: moodColor(e.mood.level) }} />}
                  <div style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 1 }}>{d.getDate()}</div>
                  <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    {weekday.format(d).replace('.', '')}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {e.answers.length} respuesta{e.answers.length === 1 ? '' : 's'}
                    {e.reflection ? ' · reflexión' : ''}
                  </div>
                </div>
                <ChevronIcon size={16} strokeWidth={2.2} style={{ transform: 'rotate(-90deg)', flex: 'none', opacity: 0.5 }} />
              </button>
            )
          })}
        </section>
      ))}
    </div>
  )
}

const WEEK_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/**
 * Calendario de ánimo: el mes con cada día del color de cómo estuviste. Los días escritos sin
 * ánimo llevan un punto; al tocar uno se abre su página.
 */
function MoodCalendar({ entries, onOpen }: { entries: RootEntry[]; onOpen: (date: string) => void }) {
  const now = new Date()
  const [offset, setOffset] = useState(0)
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const byDay = new Map(entries.map((e) => [e.date, e]))
  const todayKey = dayKey(now)
  const oldest = entries.reduce((min, e) => (e.date < min ? e.date : min), todayKey)
  const canBack = dayKey(first) > oldest.slice(0, 8) + '01'
  const withMood = entries.filter((e) => e.date.startsWith(dayKey(first).slice(0, 7)) && e.mood)
  return (
    <section className="mood-cal" aria-label="Calendario de ánimo">
      <div className="mood-cal-head">
        <button className="mood-cal-nav press" disabled={!canBack} onClick={() => setOffset((o) => o - 1)} aria-label="Mes anterior">
          <ChevronIcon size={16} strokeWidth={2.4} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={offset}
            className="mood-cal-title"
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.3 }}
          >
            {capitalize(monthLabel.format(first))}
          </motion.div>
        </AnimatePresence>
        <button className="mood-cal-nav press" disabled={offset >= 0} onClick={() => setOffset((o) => o + 1)} aria-label="Mes siguiente">
          <ChevronIcon size={16} strokeWidth={2.4} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      </div>
      <div className="mood-cal-grid">
        {WEEK_LETTERS.map((l) => (
          <span key={l} className="mood-cal-letter">
            {l}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const key = dayKey(new Date(first.getFullYear(), first.getMonth(), i + 1))
          const entry = byDay.get(key)
          const color = entry?.mood ? moodColor(entry.mood.level) : undefined
          return (
            <motion.button
              key={key}
              className={`mood-cal-day${entry ? ' written' : ''}${key === todayKey ? ' today' : ''}`}
              disabled={!entry}
              onClick={() => entry && onOpen(key)}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.2, delay: i * 0.008 }}
              style={color ? { background: color } : undefined}
              aria-label={entry ? `${i + 1}: ${entry.mood ? moodLabel(entry.mood.level) : 'escrito'}` : `${i + 1}`}
            >
              {i + 1}
              {entry && !entry.mood && <i />}
            </motion.button>
          )
        })}
      </div>
      <div className="mood-cal-legend">
        <span className="muted">{withMood.length ? `${withMood.length} día${withMood.length === 1 ? '' : 's'} con ánimo` : 'Aún sin ánimo este mes'}</span>
        <span className="mood-cal-scale" style={{ background: `linear-gradient(90deg, ${MOOD_COLORS.join(', ')})` }} />
      </div>
    </section>
  )
}
