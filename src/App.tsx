import type { CSSProperties } from 'react'
import { SEASONS } from './game/seasons'
import { useGrove, useSeason } from './game/store'
import { GardenCanvas } from './scene/GardenCanvas'
import { Dock } from './ui/Dock'
import { EditBar } from './ui/EditBar'
import { RestMode } from './ui/RestMode'
import { AlbumSheet } from './ui/sheets/AlbumSheet'
import { InventorySheet } from './ui/sheets/InventorySheet'
import { NurserySheet } from './ui/sheets/NurserySheet'
import { RootsSheet } from './ui/sheets/RootsSheet'
import { SessionWatcher, TendSheet } from './ui/sheets/TendSheet'
import { Toast } from './ui/Toast'
import { TopBar } from './ui/TopBar'

export function App() {
  const tab = useGrove((s) => s.tab)
  const rest = useGrove((s) => s.restMode)
  const editMode = useGrove((s) => s.editMode)
  const theme = SEASONS[useSeason()]

  return (
    <div className="app" style={{ '--bg': theme.bg, '--bg-deep': theme.bgDeep } as CSSProperties}>
      <GardenCanvas />
      <SessionWatcher />
      {rest ? (
        <RestMode />
      ) : (
        <div className="layer">
          <TopBar />
          {tab === 'tend' && <TendSheet />}
          {tab === 'roots' && <RootsSheet />}
          {tab === 'nursery' && <NurserySheet />}
          {tab === 'album' && <AlbumSheet />}
          {tab === 'inventory' && <InventorySheet />}
          {editMode ? <EditBar /> : <Dock />}
        </div>
      )}
      <Toast />
    </div>
  )
}
