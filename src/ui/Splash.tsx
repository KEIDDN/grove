import { motion } from 'motion/react'
import { useGrove } from '../game/store'
import { Wordmark } from './Wordmark'
import { t } from '../i18n'

/** Pantalla de inicio: el jardín de fondo, el nombre y un toque para entrar. */
export function Splash() {
  const dismiss = useGrove((s) => s.dismissSplash)
  const userName = useGrove((s) => s.userName)
  const onboarded = useGrove((s) => s.onboarded)
  const hour = new Date().getHours()
  const greeting = t(hour < 6 ? 'Buenas noches' : hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches')

  return (
    <motion.button
      className="layer splash"
      onClick={dismiss}
      aria-label={t("Entrar al jardín")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)', transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } }}
    >
      <div className="splash-top">
        <span className="splash-word">
          <Wordmark size={88} animate />
        </span>
        <span className="muted splash-tag">
          {onboarded ? `${greeting}${userName ? `, ${userName}` : ''}. ${t('Tu jardín te esperaba.')}` : t('Un pequeño jardín que crece cuando te cuidas.')}
        </span>
      </div>
      <span className="pill glass splash-cta">{onboarded ? t('Entrar a tu jardín') : t('Empezar')}</span>
    </motion.button>
  )
}
