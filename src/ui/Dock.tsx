import type { ComponentType } from 'react'
import { useGrove, type Tab } from '../game/store'
import { AlbumIcon, BagIcon, JournalIcon, SproutIcon, TimerIcon } from './icons'

const TABS: Array<{ id: Tab; label: string; Icon: ComponentType<{ size?: number }> }> = [
  { id: 'garden', label: 'Jardín', Icon: SproutIcon },
  { id: 'tend', label: 'Cultivar', Icon: TimerIcon },
  { id: 'roots', label: 'Raíces', Icon: JournalIcon },
  { id: 'nursery', label: 'Vivero', Icon: BagIcon },
  { id: 'album', label: 'Álbum', Icon: AlbumIcon },
]

export function Dock() {
  const tab = useGrove((s) => s.tab)
  const setTab = useGrove((s) => s.setTab)
  const session = useGrove((s) => s.session)
  const index = TABS.findIndex((t) => t.id === tab)

  return (
    <nav className="dock glass" aria-label="Secciones">
      <span className="dock-bubble" aria-hidden="true" style={{ transform: `translateX(${index * 62}px)` }} />
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className="dock-item" onClick={() => setTab(id)} aria-current={id === tab ? 'page' : undefined}>
          <Icon size={21} />
          {label}
          {id === 'tend' && session && (
            <span aria-label="Sesión en curso" style={{ position: 'absolute', top: 9, right: 17, width: 7, height: 7, borderRadius: '50%', background: '#3FA066' }} />
          )}
        </button>
      ))}
    </nav>
  )
}
