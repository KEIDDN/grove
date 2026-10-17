import { useState, type ReactNode } from 'react'
import { CATALOG, growthLabel } from '../game/catalog'
import { useGrove } from '../game/store'
import { paletteFor } from '../game/variants'
import { iriStyle, KindGlyph } from './glyphs'
import { JournalIcon, SproutIcon, TimerIcon } from './icons'

const AREAS = ['Estrés', 'Concentración', 'Descanso', 'Relaciones', 'Autoestima', 'Hábitos', 'Ansiedad', 'Creatividad']
const FIRST_SEEDS = ['flower', 'bush', 'pine']
const ALL_STEPS = 5

/** Primera vez: qué es Grove, cómo te llamas, qué quieres cuidar, tu ritmo y tu primera semilla. */
export function Onboarding() {
  const complete = useGrove((s) => s.completeOnboarding)
  const giftGiven = useGrove((s) => s.giftGiven)
  const [step, setStep] = useState(0)
  const [userName, setUserName] = useState('')
  const [gardenName, setGardenName] = useState('')
  const [areas, setAreas] = useState<string[]>([])
  const [weekGoal, setWeekGoal] = useState(3)
  const [seed, setSeed] = useState('flower')

  // Si ya recibiste la semilla de regalo, la bienvenida termina en el paso del ritmo
  const STEPS = giftGiven ? ALL_STEPS - 1 : ALL_STEPS
  const next = () => setStep((n) => Math.min(STEPS - 1, n + 1))
  const back = () => setStep((n) => Math.max(0, n - 1))
  const finish = () => complete({ userName, gardenName: gardenName || (userName ? `El jardín de ${userName.trim()}` : 'Tu jardín'), focusAreas: areas, weekGoal, firstSeed: seed })

  return (
    <section className="sheet glass onboarding" aria-label="Bienvenida" key={step}>
      <div className="sheet-body fade-in">
        <div className="steps" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} data-on={i <= step} />
          ))}
        </div>

        {step === 0 && (
          <Step eyebrow="Bienvenido" title="Esto es Grove">
            <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.55 }}>
              Un jardín que es tuyo y que crece con el tiempo que te dedicas. Sin rachas que castigan y sin prisas.
            </p>
            <Feature icon={<TimerIcon size={20} />} title="Cultivar" text="Concéntrate un rato: tus semillas crecen y ganas monedas." />
            <Feature icon={<JournalIcon size={20} />} title="Raíces" text="Tres preguntas al día para escucharte. Solo las ves tú." />
            <Feature icon={<SproutIcon size={20} />} title="Tu jardín" text="Decóralo, amplíalo y descubre quién viene de visita." />
          </Step>
        )}

        {step === 1 && (
          <Step eyebrow="Para empezar" title="¿Cómo te llamamos?">
            <Field label="Tu nombre (opcional)" value={userName} onChange={setUserName} placeholder="Tu nombre" autoFocus />
            <Field label="El nombre de tu jardín" value={gardenName} onChange={setGardenName} placeholder={userName ? `El jardín de ${userName}` : 'Tu jardín'} />
          </Step>
        )}

        {step === 2 && (
          <Step eyebrow="Tu bienestar" title="¿Qué te gustaría cuidar?">
            <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              Elige lo que quieras. Nos ayuda a hacerte mejores preguntas en Raíces.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {AREAS.map((a) => (
                <button key={a} className="pill pill-ghost press" aria-pressed={areas.includes(a)} onClick={() => setAreas((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]))} style={{ height: 40 }}>
                  {a}
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step eyebrow="Tu ritmo" title="¿Cuántos días a la semana?">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <button className="pill pill-ghost press" onClick={() => setWeekGoal((g) => Math.max(1, g - 1))} aria-label="Menos días" style={{ width: 48, height: 48, padding: 0, fontSize: 22 }}>
                −
              </button>
              <span className="display" style={{ fontSize: 96, minWidth: 70, textAlign: 'center' }}>
                {weekGoal}
              </span>
              <button className="pill pill-ghost press" onClick={() => setWeekGoal((g) => Math.min(7, g + 1))} aria-label="Más días" style={{ width: 48, height: 48, padding: 0, fontSize: 22 }}>
                +
              </button>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              Un día cuenta si cultivas 10 minutos o escribes en Raíces. Si una semana no llegas, no pasa nada: empiezas otra.
            </p>
          </Step>
        )}

        {step === 4 && (
          <Step eyebrow="Un regalo" title="Elige tu primera semilla">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {FIRST_SEEDS.map((id, i) => {
                const c = CATALOG.find((x) => x.id === id)!
                const on = seed === id
                return (
                  <button
                    key={id}
                    className="iri press"
                    onClick={() => setSeed(id)}
                    aria-pressed={on}
                    style={{ ...iriStyle(i), borderRadius: 22, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, outline: on ? '2px solid var(--ink)' : 'none', outlineOffset: 2 }}
                  >
                    <KindGlyph kind={c.kind} color={paletteFor(c.kind, c.color)?.[0]} size={52} />
                    <span style={{ fontSize: 14, fontWeight: 700, position: 'relative', zIndex: 2 }}>{c.name}</span>
                    <span className="muted" style={{ fontSize: 11, fontWeight: 600, position: 'relative', zIndex: 2, textAlign: 'center' }}>
                      {growthLabel(c.seed!)}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              La plantaremos en tu jardín. Crecerá con los minutos que dediques a Cultivar.
            </p>
          </Step>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {step > 0 && (
            <button className="pill pill-ghost press" onClick={back} style={{ height: 52 }}>
              Atrás
            </button>
          )}
          <button className="pill pill-dark press" onClick={step === STEPS - 1 ? finish : next} style={{ flex: 1, height: 52, fontSize: 15 }}>
            {step === 0 ? 'Empezar' : step === STEPS - 1 ? (giftGiven ? 'Entrar' : 'Plantar y entrar') : 'Siguiente'}
          </button>
        </div>
      </div>
    </section>
  )
}

function Step({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="title" style={{ marginTop: 4, fontSize: 32 }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="row-card" style={{ padding: 12 }}>
      <span style={{ width: 40, height: 40, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(63,160,102,0.14)', flex: 'none' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.4 }}>
          {text}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, autoFocus }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 24))}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{ height: 52, borderRadius: 16, border: '1px solid var(--line)', background: 'rgba(255,255,255,0.65)', padding: '0 16px', font: 'inherit', fontSize: 16, color: 'var(--ink)' }}
      />
    </label>
  )
}
