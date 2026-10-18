import { SEASONS } from '../../game/seasons'
import { useGrove } from '../../game/store'
import { VISITORS } from '../../game/visitors'
import { iriStyle, VisitorGlyph } from '../glyphs'

export function AlbumContent() {
  const seen = useGrove((s) => s.visitorsSeen)

  return (
    <>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="display" style={{ fontSize: 64 }}>
            {seen.length}
            <span style={{ fontSize: 28, color: 'var(--ink-faint)' }}>/{VISITORS.length}</span>
          </span>
          <span className="muted" style={{ fontSize: 13 }}>
            visitantes descubiertos
          </span>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          Mientras no estás, llegan visitantes atraídos por lo que hay en tu jardín. Cambian con cada estación.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {VISITORS.map((v, i) => {
            const known = seen.includes(v.id)
            const when = v.event ?? (v.seasons === 'all' ? 'Todo el año' : v.seasons.map((s) => SEASONS[s].name).join(' · '))
            return (
              <div
                key={v.id}
                className={known ? 'iri' : undefined}
                style={{
                  ...(known ? iriStyle(i) : { background: 'rgba(27,31,28,0.04)', border: '1px dashed rgba(27,31,28,0.12)' }),
                  borderRadius: 22,
                  padding: 14,
                  minHeight: 150,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ opacity: known ? 1 : 0.18, filter: known ? 'none' : 'grayscale(1) brightness(0.2)' }}>
                  <VisitorGlyph type={v.type} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, position: 'relative', zIndex: 2 }}>{known ? v.name : '¿?'}</span>
                <span className="muted" style={{ fontSize: 12, lineHeight: 1.35, position: 'relative', zIndex: 2 }}>
                  {known ? when : v.hint}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
