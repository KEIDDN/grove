import { CATALOG } from '../../game/catalog'
import { useGrove } from '../../game/store'
import { paletteFor } from '../../game/variants'
import { iriStyle, KindGlyph } from '../glyphs'
import { CoinIcon } from '../icons'
import { Sheet } from '../Sheet'

export function NurserySheet() {
  const coins = useGrove((s) => s.coins)
  const buy = useGrove((s) => s.buy)
  const limited = CATALOG.filter((c) => c.limited)
  const regular = CATALOG.filter((c) => !c.limited)

  return (
    <Sheet eyebrow="Tienda" title="Vivero">
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {limited.map((c) => (
          <button key={c.id} className="iri press" onClick={() => buy(c.id)} style={{ ...iriStyle(1), borderRadius: 26, padding: 18, display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' }}>
            <KindGlyph kind={c.kind} color={paletteFor(c.kind, c.color)?.[0]} size={76} />
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="eyebrow" style={{ color: '#9A5B22' }}>
                Edición limitada · {c.limited}
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{c.name}</span>
              <Price price={c.price} afford={coins >= c.price} />
            </div>
          </button>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {regular.map((c, i) => (
            <button
              key={c.id}
              className="iri press"
              onClick={() => buy(c.id)}
              aria-label={`${c.name}, ${c.price} monedas`}
              style={{ ...iriStyle(i), borderRadius: 22, padding: '16px 14px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, textAlign: 'left' }}
            >
              <KindGlyph kind={c.kind} color={paletteFor(c.kind, c.color)?.[0]} size={56} />
              <span style={{ fontSize: 15, fontWeight: 700, position: 'relative', zIndex: 2 }}>{c.name}</span>
              <Price price={c.price} afford={coins >= c.price} />
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

function Price({ price, afford }: { price: number; afford: boolean }) {
  return (
    <span style={{ position: 'relative', zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: afford ? 'var(--ink)' : 'var(--ink-faint)' }}>
      <CoinIcon size={15} />
      {price}
    </span>
  )
}
