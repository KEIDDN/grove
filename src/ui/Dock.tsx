import type { ComponentType } from 'react'
import { motion } from 'motion/react'
import { pendingRewards, useGrove, type Tab } from '../game/store'
import { BagIcon, BookIcon, CalmIcon, JournalIcon, SproutIcon, TimerIcon, UserIcon } from './icons'
import { spring, tap } from './motion'
import { t, tn } from '../i18n'

const TABS: Array<{ id: Tab; label: string; Icon: ComponentType<{ size?: number; active?: boolean }> }> = [
  { id: 'garden', label: 'Jardín', Icon: SproutIcon },
  { id: 'tend', label: 'Cultivar', Icon: TimerIcon },
  { id: 'calm', label: 'Calma', Icon: CalmIcon },
  { id: 'roots', label: 'Raíces', Icon: JournalIcon },
  { id: 'read', label: 'Leer', Icon: BookIcon },
  { id: 'nursery', label: 'Vivero', Icon: BagIcon },
  { id: 'you', label: 'Tú', Icon: UserIcon },
]

export function Dock() {
  const tab = useGrove((s) => s.tab)
  const setTab = useGrove((s) => s.setTab)
  const session = useGrove((s) => s.session)
  const pending = useGrove(pendingRewards)
  const index = TABS.findIndex((t) => t.id === tab)

  return (
    <motion.nav
      className="dock glass"
      aria-label={t("Secciones")}
      initial={{ opacity: 0, y: 30, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 30, x: '-50%', transition: { duration: 0.18 } }}
      transition={spring}
    >
      {index >= 0 && (
        <motion.span className="dock-bubble" aria-hidden="true" initial={false} animate={{ x: `${index * 100}%`, scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
      )}
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className="dock-item press" onClick={() => { tap(); setTab(id) }} aria-current={id === tab ? 'page' : undefined}>
          <Icon size={22} active={id === tab} />
          {t(label)}
          {id === 'you' && pending > 0 && <span className="badge" aria-label={tn('{n} recompensa por recoger', '{n} recompensas por recoger', pending)}>{pending}</span>}
          {id === 'tend' && session && (
            <span aria-label={t("Sesión en curso")} style={{ position: 'absolute', top: 9, right: 17, width: 7, height: 7, borderRadius: '50%', background: '#3FA066' }} />
          )}
        </button>
      ))}
    </motion.nav>
  )
}
