import type { ComponentType } from 'react'
import { pendingRewards, useGrove, type Tab } from '../game/store'
import { BagIcon, JournalIcon, SproutIcon, TimerIcon, UserIcon } from './icons'

const TABS: Array<{ id: Tab; label: string; Icon: ComponentType<{ size?: number }> }> = [
  { id: 'garden', label: 'Jardín', Icon: SproutIcon },
  { id: 'tend', label: 'Cultivar', Icon: TimerIcon },
  { id: 'roots', label: 'Raíces', Icon: JournalIcon },
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
    <nav className="dock glass" aria-label="Secciones">
      {index >= 0 && <span className="dock-bubble" aria-hidden="true" style={{ transform: `translateX(${index * 62}px)` }} />}
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className="dock-item" onClick={() => setTab(id)} aria-current={id === tab ? 'page' : undefined}>
          <Icon size={21} />
          {label}
          {id === 'you' && pending > 0 && <span className="badge" aria-label={`${pending} recompensas por recoger`}>{pending}</span>}
          {id === 'tend' && session && (
            <span aria-label="Sesión en curso" style={{ position: 'absolute', top: 9, right: 17, width: 7, height: 7, borderRadius: '50%', background: '#3FA066' }} />
          )}
        </button>
      ))}
    </nav>
  )
}
