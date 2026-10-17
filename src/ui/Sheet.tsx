import type { ReactNode } from 'react'
import { useGrove } from '../game/store'
import { CloseIcon } from './icons'

export function Sheet({ eyebrow, title, aside, children }: { eyebrow: string; title: string; aside?: ReactNode; children: ReactNode }) {
  const setTab = useGrove((s) => s.setTab)
  return (
    <section className="sheet glass" aria-label={title}>
      <div className="sheet-body">
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="title" style={{ marginTop: 4 }}>
              {title}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {aside}
            <button
              className="press"
              onClick={() => setTab('garden')}
              aria-label="Cerrar"
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(27,31,28,0.06)', display: 'grid', placeItems: 'center' }}
            >
              <CloseIcon size={16} strokeWidth={2.2} />
            </button>
          </div>
        </header>
        {children}
      </div>
    </section>
  )
}
