import { useState } from 'react'
import { ARTICLES, type Article } from '../../content/articles'
import { useGrove } from '../../game/store'
import { iriStyle } from '../glyphs'
import { CheckIcon, ChevronIcon, HeartIcon, SproutIcon } from '../icons'
import { Page } from '../Page'
import { SwapIn } from '../Sheet'

const dateLabel = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' })
const parseDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Aviso de cuidado: siempre visible en las lecturas. */
export function CareNote({ compact }: { compact?: boolean }) {
  return (
    <aside className="care-note" aria-label="Aviso importante">
      <span style={{ flex: 'none', color: '#C2453F', marginTop: 1 }}>
        <HeartIcon size={18} strokeWidth={2} />
      </span>
      <div>
        <strong style={{ display: 'block', marginBottom: 2 }}>Esto no sustituye a la ayuda profesional</strong>
        {compact ? (
          'Son reflexiones para acompañarte, no consejos médicos ni psicológicos.'
        ) : (
          <>
            No somos profesionales de la salud mental: estas lecturas son reflexiones para acompañarte, no consejos médicos ni
            psicológicos. Si lo estás pasando mal, habla con alguien de confianza o busca ayuda profesional. Si estás en España y
            tienes pensamientos de hacerte daño, llama al <strong>024</strong> (gratuito, 24 h). En una emergencia, llama al{' '}
            <strong>112</strong>.
          </>
        )}
      </div>
    </aside>
  )
}

export function ReadSheet() {
  const setTab = useGrove((s) => s.setTab)
  const [open, setOpen] = useState<string | null>(null)
  const article = ARTICLES.find((a) => a.id === open)
  return (
    <Page eyebrow={article ? article.category : 'Lecturas breves'} title={article ? 'Leer' : 'Brotes'} accent="read" onClose={() => setTab('garden')}>
      <SwapIn id={open ?? 'list'}>{article ? <Reader article={article} onBack={() => setOpen(null)} /> : <List onOpen={setOpen} />}</SwapIn>
    </Page>
  )
}

function List({ onOpen }: { onOpen: (id: string) => void }) {
  const read = useGrove((s) => s.articlesRead)
  const [featured, ...rest] = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date))

  if (!featured) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          Pronto habrá aquí pequeñas lecturas para acompañarte.
        </p>
        <CareNote compact />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        Lecturas de dos o tres minutos para hacer una pausa. Terminar una también cuenta como día cuidándote.
      </p>

      <button
        className="iri press"
        onClick={() => onOpen(featured.id)}
        style={{ ...iriStyle(3), borderRadius: 30, padding: 24, minHeight: 280, textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10 }}
      >
        <span aria-hidden="true" style={{ position: 'absolute', right: -26, top: -18, zIndex: 1, opacity: 0.1, color: '#1B1F1C' }}>
          <SproutIcon size={190} />
        </span>
        <span className="eyebrow" style={{ position: 'relative', zIndex: 2, color: '#5D645E' }}>
          Nuevo · {featured.category}
        </span>
        <span style={{ position: 'relative', zIndex: 2, fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.04, color: '#1B1F1C' }}>{featured.title}</span>
        <span style={{ position: 'relative', zIndex: 2, fontSize: 14, lineHeight: 1.45, color: '#5D645E' }}>{featured.subtitle}</span>
        <Meta article={featured} read={read.includes(featured.id)} />
      </button>

      {rest.map((a) => (
        <button key={a.id} className="row-card press" onClick={() => onOpen(a.id)} style={{ textAlign: 'left', width: '100%' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">{a.category}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>{a.title}</div>
            <Meta article={a} read={read.includes(a.id)} />
          </div>
          <ChevronIcon size={16} strokeWidth={2.2} style={{ transform: 'rotate(-90deg)', flex: 'none', opacity: 0.5 }} />
        </button>
      ))}

      <CareNote compact />
    </div>
  )
}

function Meta({ article, read }: { article: Article; read: boolean }) {
  return (
    <span style={{ position: 'relative', zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 650, color: '#5D645E' }}>
      {article.minutes} min · {dateLabel.format(parseDay(article.date))}
      {read && (
        <>
          {' · '}
          <CheckIcon size={13} strokeWidth={2.6} /> Leído
        </>
      )}
    </span>
  )
}

function Reader({ article, onBack }: { article: Article; onBack: () => void }) {
  const read = useGrove((s) => s.articlesRead.includes(article.id))
  const markRead = useGrove((s) => s.markArticleRead)
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <button className="press muted" onClick={onBack} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}>
        <ChevronIcon size={15} strokeWidth={2.4} style={{ transform: 'rotate(90deg)' }} /> Todas las lecturas
      </button>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05 }}>{article.title}</h1>
        <p className="muted" style={{ margin: 0, fontSize: 16, lineHeight: 1.45 }}>
          {article.subtitle}
        </p>
        <span className="eyebrow">
          {article.minutes} min de lectura · {dateLabel.format(parseDay(article.date))}
        </span>
      </header>

      <div className="article-body">
        {article.blocks.map((b, i) => {
          if (b.type === 'h') return <h3 key={i}>{b.text}</h3>
          if (b.type === 'quote') return <blockquote key={i}>{b.text}</blockquote>
          if (b.type === 'list')
            return (
              <ul key={i}>
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            )
          return <p key={i}>{b.text}</p>
        })}
      </div>

      <button className="pill pill-dark press" disabled={read} onClick={() => markRead(article.id)} style={{ height: 52, fontSize: 15 }}>
        {read ? (
          <>
            <CheckIcon size={16} strokeWidth={2.4} /> Leído
          </>
        ) : (
          'He terminado de leer'
        )}
      </button>
      <CareNote />
    </article>
  )
}
