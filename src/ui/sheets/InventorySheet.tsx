import { CATALOG } from '../../game/catalog'
import { useGrove } from '../../game/store'
import { paletteFor } from '../../game/variants'
import { iriStyle, KindGlyph } from '../glyphs'
import { Sheet } from '../Sheet'

const NAMES: Record<string, string> = { sapling: 'Brote', ...Object.fromEntries(CATALOG.map((c) => [c.kind, c.name])) }

export function InventorySheet() {
  const inventory = useGrove((s) => s.inventory)
  const startPlacing = useGrove((s) => s.startPlacing)

  return (
    <Sheet eyebrow="Tus objetos" title="Inventario">
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {inventory.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            Aquí se guardan los objetos que retiras del jardín y lo que no cabe. Ahora mismo está vacío.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {inventory.map((it, i) => (
              <button
                key={it.id}
                className="iri press"
                onClick={() => startPlacing(it.id)}
                style={{ ...iriStyle(i), borderRadius: 22, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, textAlign: 'left' }}
              >
                <KindGlyph kind={it.kind} color={paletteFor(it.kind, it.color)?.[0]} size={52} />
                <span style={{ fontSize: 14, fontWeight: 700, position: 'relative', zIndex: 2 }}>{NAMES[it.kind] ?? it.kind}</span>
                <span className="muted" style={{ fontSize: 12, fontWeight: 600, position: 'relative', zIndex: 2 }}>
                  Toca para colocar
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  )
}
