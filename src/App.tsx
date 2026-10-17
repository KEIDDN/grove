import type { CSSProperties } from 'react'
import { SEASONS } from './game/seasons'
import { useGrove, useSeason } from './game/store'
import { AudioController } from './audio/AudioController'
import { GardenCanvas } from './scene/GardenCanvas'
import { useDaylight } from './scene/useDaylight'
import { Dock } from './ui/Dock'
import { EditBar } from './ui/EditBar'
import { RestMode } from './ui/RestMode'
import { InventorySheet } from './ui/sheets/InventorySheet'
import { NurserySheet } from './ui/sheets/NurserySheet'
import { RootsSheet } from './ui/sheets/RootsSheet'
import { SessionWatcher, TendSheet } from './ui/sheets/TendSheet'
import { YouSheet } from './ui/sheets/YouSheet'
import { Toast } from './ui/Toast'
import { TopBar } from './ui/TopBar'

export function App() {
  const tab = useGrove((s) => s.tab)
  const rest = useGrove((s) => s.restMode)
  const editMode = useGrove((s) => s.editMode)
  const theme = SEASONS[useSeason()]
  const night = useDaylight().night > 0.55

  return (
    <div className={night ? 'app night' : 'app'} style={{ '--bg': theme.bg, '--bg-deep': theme.bgDeep } as CSSProperties}>
      <GardenCanvas />
      <SessionWatcher />
      <AudioController />
      {rest ? (
        <RestMode />
      ) : (
        <div className="layer">
          <TopBar />
          {tab === 'tend' && <TendSheet />}
          {tab === 'roots' && <RootsSheet />}
          {tab === 'nursery' && <NurserySheet />}
          {tab === 'you' && <YouSheet />}
          {tab === 'inventory' && <InventorySheet />}
          {editMode ? <EditBar /> : <Dock />}
        </div>
      )}
      <Toast />
    </div>
  )
}
