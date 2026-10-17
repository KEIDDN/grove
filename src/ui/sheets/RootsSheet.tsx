import { useState } from 'react'
import { questionFor } from '../../game/questions'
import { useGrove } from '../../game/store'
import { dayKey } from '../../game/time'
import { LockIcon } from '../icons'
import { Sheet } from '../Sheet'

const dateLabel = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

export function RootsSheet() {
  const entries = useGrove((s) => s.entries)
  const save = useGrove((s) => s.saveRoot)
  const [text, setText] = useState('')
  const todays = entries.find((e) => e.date === dayKey())
  const past = entries.filter((e) => e.date !== dayKey()).slice(0, 3)

  return (
    <Sheet eyebrow={dateLabel.format(new Date())} title="Raíces">
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="eyebrow">Pregunta de hoy</div>
        <p style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.25 }}>{todays?.question ?? questionFor()}</p>

        {todays ? (
          <div className="iri" style={{ borderRadius: 22, padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 15, lineHeight: 1.5, position: 'relative', zIndex: 2 }}>{todays.text}</div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600, position: 'relative', zIndex: 2 }}>
              Guardado · ha florecido algo en tu jardín. Mañana, una pregunta nueva.
            </div>
          </div>
        ) : (
          <>
            <label htmlFor="root-answer" className="sr-only">
              Tu respuesta
            </label>
            <textarea
              id="root-answer"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe con calma. Nadie más lo verá."
              rows={4}
              style={{
                resize: 'none',
                width: '100%',
                border: '1px solid var(--line)',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.65)',
                padding: 16,
                font: 'inherit',
                fontSize: 15,
                lineHeight: 1.5,
                color: 'var(--ink)',
              }}
            />
            <button className="pill pill-dark press" disabled={!text.trim()} onClick={() => save(text)} style={{ height: 52, fontSize: 15 }}>
              Guardar en Raíces
            </button>
          </>
        )}

        <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
          <LockIcon size={14} strokeWidth={2} />
          Tu diario vive solo en este dispositivo. Nunca se comparte.
        </div>

        {past.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <div className="eyebrow">Días anteriores</div>
            {past.map((e) => (
              <div key={e.date} style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(27,31,28,0.04)', fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{e.question}</div>
                <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  )
}
