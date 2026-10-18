import { useEffect } from 'react'
import { useGrove, useSeason } from '../game/store'
import { useDaylight } from '../scene/useDaylight'
import { audio } from './engine'

/** Conecta los ajustes y el estado del jardín con el motor de sonido. No pinta nada. */
export function AudioController() {
  const settings = useGrove((s) => s.audio)
  const season = useSeason()
  const { night } = useDaylight()
  const hasWater = useGrove((s) => s.items.some((it) => it.kind === 'pond'))

  // Desbloqueo con el primer toque o tecla
  useEffect(() => {
    const unlock = () => {
      audio.unlock()
      const s = useGrove.getState().audio
      audio.setMusic(s.music, s.musicVolume)
      audio.setAmbient(s.ambient, s.ambientVolume)
      audio.setSfx(s.sfx, s.sfxVolume)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => audio.setMusic(settings.music, settings.musicVolume), [settings.music, settings.musicVolume])
  useEffect(() => audio.setAmbient(settings.ambient, settings.ambientVolume), [settings.ambient, settings.ambientVolume])
  useEffect(() => audio.setSfx(settings.sfx, settings.sfxVolume), [settings.sfx, settings.sfxVolume])
  useEffect(() => audio.setMood({ season, night: Math.round(night * 10) / 10, hasWater }), [season, night, hasWater])

  return null
}
