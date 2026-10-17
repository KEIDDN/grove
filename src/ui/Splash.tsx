import { useGrove } from '../game/store'
import { SproutIcon } from './icons'

/** Pantalla de inicio: el jardín de fondo, el nombre y un toque para entrar. */
export function Splash() {
  const dismiss = useGrove((s) => s.dismissSplash)
  const userName = useGrove((s) => s.userName)
  const onboarded = useGrove((s) => s.onboarded)
  const hour = new Date().getHours()
  const greeting = hour < 6 ? 'Buenas noches' : hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <button className="layer splash" onClick={dismiss} aria-label="Entrar al jardín">
      <div className="splash-top">
        <span className="splash-mark" aria-hidden="true">
          <SproutIcon size={22} strokeWidth={2} />
        </span>
        <span className="splash-word">Grove</span>
        <span className="muted splash-tag">
          {onboarded ? `${greeting}${userName ? `, ${userName}` : ''}.` : 'Un pequeño jardín que crece con el tiempo que te dedicas.'}
        </span>
      </div>
      <span className="pill glass splash-cta">{onboarded ? 'Entrar a tu jardín' : 'Empezar'}</span>
    </button>
  )
}
