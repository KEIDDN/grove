import { useState } from 'react'
import { GROUP_NAMES, questionsFor } from '../../game/questions'
import { useGrove, type RootAnswer, type RootEntry } from '../../game/store'
import { dayKey } from '../../game/time'
import { ChevronIcon, EditIcon, LockIcon } from '../icons'
import { Segments, Sheet, SwapIn } from '../Sheet'

const longDate = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'short' })

const parseDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function RootsSheet() {
  const [view, setView] = useState<'today' | 'journal'>('today')
  return (
    <Sheet eyebrow={longDate.format(new Date())} title="Raíces">
      <Segments
        id="roots"
        items={[
          { id: 'today', label: 'Hoy' },
          { id: 'journal', label: 'Diario' },
        ]}
        value={view}
        onChange={setView}
      />
      <SwapIn id={view}>{view === 'today' ? <Today /> : <Journal />}</SwapIn>
    </Sheet>
  )
}

const areaStyle = {
  resize: 'none',
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 18,
  background: 'rgba(255,255,255,0.6)',
  padding: 14,
  font: 'inherit',
  fontSize: 15,
  lineHeight: 1.5,
  color: 'var(--ink)',
} as const

function Today() {
  const entries = useGrove((s) => s.entries)
  const save = useGrove((s) => s.saveRoot)
  const today = entries.find((e) => e.date === dayKey())
  const questions = questionsFor(dayKey())
  const [editing, setEditing] = useState(!today)
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
    save(list, reflection)
    setEditing(false)
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {questions.map((q, i) => (
        <div key={q.text} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="eyebrow">
            {i + 1} · {GROUP_NAMES[q.group]}
          </div>
          <label htmlFor={`q-${i}`} style={{ fontSize: 19, fontWeight: 650, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
            {q.text}
          </label>
          <textarea
            id={`q-${i}`}
            rows={2}
            value={answers[i]}
            onChange={(e) => setAnswers((prev) => prev.map((a, j) => (j === i ? e.target.value : a)))}
            placeholder="Escribe con calma…"
            style={areaStyle}
          />
        </div>
      ))}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="eyebrow">Reflexión libre · opcional</div>
        <label htmlFor="reflection" className="muted" style={{ fontSize: 13 }}>
          Cualquier cosa que quieras dejar escrita hoy.
        </label>
        <textarea id="reflection" rows={3} value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Hoy…" style={areaStyle} />
      </div>

      <button className="pill pill-dark press" disabled={!answered && !reflection.trim()} onClick={submit} style={{ height: 52, fontSize: 15 }}>
        {today ? 'Guardar cambios' : `Guardar en Raíces${answered ? ` · ${answered}/3` : ''}`}
      </button>
      <Privacy />
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

function Journal() {
  const entries = useGrove((s) => s.entries)
  const [open, setOpen] = useState<string | null>(null)
  const selected = entries.find((e) => e.date === open)

  if (selected) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button className="press muted" onClick={() => setOpen(null)} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}>
          <ChevronIcon size={15} strokeWidth={2.4} style={{ transform: 'rotate(90deg)' }} /> Todas las páginas
        </button>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'capitalize' }}>{longDate.format(parseDay(selected.date))}</div>
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
                <div style={{ width: 44, flex: 'none', textAlign: 'center' }}>
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
