import { AnimatePresence, motion } from 'motion/react'
import { KIND_NAMES } from '../game/catalog'
import { useGrove } from '../game/store'
import { paletteFor } from '../game/variants'
import { KindGlyph } from './glyphs'
import { CloseIcon } from './icons'
import { bouncy } from './motion'
import { t, tn } from '../i18n'

/** Cuánto le falta a algo que está creciendo, en palabras. */
function remaining(by: 'focus' | 'roots', left: number) {
  if (by === 'focus') return tn('Falta {n} min de Cultivar', 'Faltan {n} min de Cultivar', left)
  return tn('Falta {n} día escribiendo en Raíces', 'Faltan {n} días escribiendo en Raíces', left)
}

/**
 * Tarjeta que aparece al tocar algo del jardín: qué es y, si está creciendo, cuánto le queda,
 * con un atajo para seguir cuidándolo. Se cierra tocando fuera, con la X o al abrir otra sección.
 */
export function InspectCard() {
  const item = useGrove((s) => (s.inspectId ? s.items.find((i) => i.id === s.inspectId) : undefined))
  const inspect = useGrove((s) => s.inspect)
  const setTab = useGrove((s) => s.setTab)
  const setEditMode = useGrove((s) => s.setEditMode)
  const select = useGrove((s) => s.select)

  const g = item?.growth
  const ratio = g ? Math.min(1, g.progress / g.need) : 1
  const left = g ? Math.max(0, Math.ceil(g.need - g.progress)) : 0

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key={item.id}
          className="inspect glass"
          role="dialog"
          aria-label={KIND_NAMES[item.kind]}
          initial={{ opacity: 0, y: 24, scale: 0.94, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: 16, scale: 0.96, x: '-50%', transition: { duration: 0.16 } }}
          transition={bouncy}
        >
          <span className="inspect-glyph">
            <KindGlyph kind={item.kind} color={paletteFor(item.kind, item.color)?.[0]} size={46} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">{g ? (ratio >= 1 ? t('Ya ha crecido') : t('Creciendo')) : t('Decoración')}</div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 2 }}>{t(KIND_NAMES[item.kind])}</div>
            {g ? (
              <>
                <div className="progress" style={{ marginTop: 10 }}>
                  <span style={{ width: `${ratio * 100}%` }} />
                </div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>
                  {left > 0 ? remaining(g.by, left) : t('Ha terminado de crecer')}
                </div>
              </>
            ) : (
              <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                Puedes moverla, girarla o cambiarle el color.
              </div>
            )}
          </div>
          <div className="inspect-actions">
            <button className="icon-btn press hit" onClick={() => inspect(null)} aria-label={t("Cerrar")}>
              <CloseIcon size={15} strokeWidth={2.4} />
            </button>
            {g && left > 0 ? (
              <button className="pill pill-dark press" onClick={() => setTab(g.by === 'focus' ? 'tend' : 'roots')} style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
                {g.by === 'focus' ? t('Cultivar') : t('Escribir')}
              </button>
            ) : (
              !g && (
                <button
                  className="pill pill-ghost press"
                  onClick={() => {
                    setEditMode(true)
                    select(item.id)
                  }}
                  style={{ height: 36, padding: '0 14px', fontSize: 13 }}
                >
                  {t('Editar')}
                </button>
              )
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
