import { useState } from 'react'
import { ARTICLES, type Article } from '../../content/articles'
import { useGrove } from '../../game/store'
import { iriStyle } from '../glyphs'
import { CheckIcon, ChevronIcon, HeartIcon, SproutIcon } from '../icons'
import { Sheet, SwapIn } from '../Sheet'
import { locale, t, useLang } from '../../i18n'

const dateLabel = { format: (d: Date) => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long' }).format(d) }
const parseDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Aviso de cuidado: siempre visible en las lecturas. */
export function CareNote({ compact }: { compact?: boolean }) {
  return (
    <aside className="care-note" aria-label={t("Aviso importante")}>
      <span style={{ flex: 'none', color: '#C2453F', marginTop: 1 }}>
        <HeartIcon size={18} strokeWidth={2} />
      </span>
      <div>
        <strong style={{ display: 'block', marginBottom: 2 }}>{t('Esto no sustituye a la ayuda profesional')}</strong>
        {compact ? (
          t('Son reflexiones para acompañarte, no consejos médicos ni psicológicos.')
        ) : useLang.getState().lang === 'en' ? (
          <>
            We're not mental health professionals: these readings are reflections to keep you company, not medical or psychological
            advice. If you're having a hard time, talk to someone you trust or seek professional help. If you have thoughts of
            harming yourself, contact a local crisis line. In an emergency, call your local emergency number (<strong>112</strong> in
            Europe).
          </>
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

/** Lecturas breves: una sección propia, con edición nueva cada pocas semanas. */
export function ReadSheet() {
  const [open, setOpen] = useState<string | null>(null)
  const article = ARTICLES.find((a) => a.id === open)
  return (
    <Sheet eyebrow={article ? t(article.category) : t('Lecturas breves')} title={article ? t('Leer') : t('Brotes')} accent="read">
      <SwapIn id={open ?? 'list'}>{article ? <Reader article={article} onBack={() => setOpen(null)} /> : <List onOpen={setOpen} />}</SwapIn>
    </Sheet>
  )
}

function List({ onOpen }: { onOpen: (id: string) => void }) {
  const read = useGrove((s) => s.articlesRead)
  const [featured, ...rest] = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date))

  if (!featured) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          {t('Pronto habrá aquí pequeñas lecturas para acompañarte.')}
        </p>
        <CareNote compact />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        {t('Lecturas de dos o tres minutos para hacer una pausa. Terminar una también cuenta como día cuidándote.')}
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
          {t('Nuevo')} · {t(featured.category)}
        </span>
        <span style={{ position: 'relative', zIndex: 2, fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.04, color: '#1B1F1C' }}>{t(featured.title)}</span>
        <span style={{ position: 'relative', zIndex: 2, fontSize: 14, lineHeight: 1.45, color: '#5D645E' }}>{t(featured.subtitle)}</span>
        <Meta article={featured} read={read.includes(featured.id)} />
      </button>

      {rest.map((a) => (
        <button key={a.id} className="row-card press" onClick={() => onOpen(a.id)} style={{ textAlign: 'left', width: '100%' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">{t(a.category)}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>{t(a.title)}</div>
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
          <CheckIcon size={13} strokeWidth={2.6} /> {t('Leído')}
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
        <ChevronIcon size={15} strokeWidth={2.4} style={{ transform: 'rotate(90deg)' }} /> {t('Todas las lecturas')}
      </button>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05 }}>{t(article.title)}</h1>
        <p className="muted" style={{ margin: 0, fontSize: 16, lineHeight: 1.45 }}>
          {t(article.subtitle)}
        </p>
        <span className="eyebrow">
          {t('{n} min de lectura', { n: article.minutes })} · {dateLabel.format(parseDay(article.date))}
        </span>
      </header>

      <div className="article-body">
        {article.blocks.map((b, i) => {
          if (b.type === 'h') return <h3 key={i}>{t(b.text)}</h3>
          if (b.type === 'quote') return <blockquote key={i}>{t(b.text)}</blockquote>
          if (b.type === 'list')
            return (
              <ul key={i}>
                {b.items.map((it) => (
                  <li key={it}>{t(it)}</li>
                ))}
              </ul>
            )
          return <p key={i}>{t(b.text)}</p>
        })}
      </div>

      <button className="pill pill-dark press" disabled={read} onClick={() => markRead(article.id)} style={{ height: 52, fontSize: 15 }}>
        {read ? (
          <>
            <CheckIcon size={16} strokeWidth={2.4} /> {t('Leído')}
          </>
        ) : (
          t('He terminado de leer')
        )}
      </button>
      <CareNote />
    </article>
  )
}
