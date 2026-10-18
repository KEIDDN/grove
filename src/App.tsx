import type { CSSProperties } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { SEASONS } from './game/seasons'
import { useGrove, useSeason } from './game/store'
import { AudioController } from './audio/AudioController'
import { GardenCanvas } from './scene/GardenCanvas'
import { useDaylight } from './scene/useDaylight'
import { Dock } from './ui/Dock'
import { InspectCard } from './ui/InspectCard'
import { Onboarding } from './ui/Onboarding'
import { Splash } from './ui/Splash'
import { EditBar } from './ui/EditBar'
import { RestMode } from './ui/RestMode'
import { InventorySheet } from './ui/sheets/InventorySheet'
import { NurserySheet } from './ui/sheets/NurserySheet'
import { ReadSheet } from './ui/sheets/ReadSheet'
import { RootsSheet } from './ui/sheets/RootsSheet'
import { SessionWatcher, TendSheet } from './ui/sheets/TendSheet'
import { YouSheet } from './ui/sheets/YouSheet'
import { SheetHost } from './ui/Sheet'
import { Toast } from './ui/Toast'
import { TopBar } from './ui/TopBar'

export function App() {
  const tab = useGrove((s) => s.tab)
  const rest = useGrove((s) => s.restMode)
  const editMode = useGrove((s) => s.editMode)
  const splash = useGrove((s) => s.splash)
  const onboarded = useGrove((s) => s.onboarded)
  const theme = SEASONS[useSeason()]
  const nightLevel = useDaylight().night
  const night = nightLevel > 0.55
  // Atardecer y amanecer: el cielo ya oscurece arriba, pero la interfaz aún no es la de noche
  const dusk = !night && nightLevel > 0.18

  return (
    <div className={night ? 'app night' : dusk ? 'app dusk' : 'app'} style={{ '--bg': theme.bg, '--bg-deep': theme.bgDeep } as CSSProperties}>
      <GardenCanvas />
      <SessionWatcher />
      <AudioController />
      <AnimatePresence mode="wait">
        {splash ? (
          <Splash key="splash" />
        ) : !onboarded ? (
          <motion.div key="onboarding" className="layer" exit={{ opacity: 0, transition: { duration: 0.25 } }}>
            <Onboarding />
          </motion.div>
        ) : rest ? (
          <RestMode key="rest" />
        ) : (
          <motion.div key="main" className="layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <TopBar />
            {/* Un solo panel para todas las secciones: al cambiar de una a otra no se cierra, solo cambia el contenido */}
            <AnimatePresence>
              {tab !== 'garden' && (
                <SheetHost key="sheet" contentKey={tab}>
                  {tab === 'tend' && <TendSheet key="tend" />}
                  {tab === 'roots' && <RootsSheet key="roots" />}
                  {tab === 'read' && <ReadSheet key="read" />}
                  {tab === 'nursery' && <NurserySheet key="nursery" />}
                  {tab === 'you' && <YouSheet key="you" />}
                  {tab === 'inventory' && <InventorySheet key="inventory" />}
                </SheetHost>
              )}
            </AnimatePresence>
            {tab === 'garden' && !editMode && <InspectCard />}
            <AnimatePresence mode="wait">{editMode ? <EditBar key="edit" /> : <Dock key="dock" />}</AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <Toast />
    </div>
  )
}
