import { useRef, useState, type ReactNode } from 'react'
import { DevPanel } from '../../devtools/DevPanel'
import { setDevMode, useDev } from '../../devtools/devMode'
import { nextDayReward } from '../../game/config'
import { ACHIEVEMENTS, missionsFor, rewardLabel } from '../../game/goals'
import { SEASON_ORDER, SEASONS } from '../../game/seasons'
import { parcelsAllowed, useGrove, type YouSection } from '../../game/store'
import { iriStyle } from '../glyphs'
import { CheckIcon, CoinIcon, TrophyIcon } from '../icons'
import { Segments, Sheet, SwapIn } from '../Sheet'
import { AlbumContent } from './AlbumContent'

const SECTIONS: Array<{ id: YouSection; label: string }> = [
  { id: 'today', label: 'Hoy' },
  { id: 'achievements', label: 'Logros' },
  { id: 'album', label: 'Álbum' },
  { id: 'progress', label: 'Progreso' },
  { id: 'settings', label: 'Ajustes' },
]

const TITLES: Record<YouSection, [string, string]> = {
  today: ['Misiones de hoy', 'Hoy'],
  achievements: ['Para siempre', 'Logros'],
  album: ['Visitantes', 'Álbum'],
  progress: ['Tu camino', 'Progreso'],
  settings: ['Preferencias', 'Ajustes'],
}

export function YouSheet() {
  const section = useGrove((s) => s.youSection)
  const open = useGrove((s) => s.openYou)
  const [eyebrow, title] = TITLES[section]
  return (
    <Sheet eyebrow={eyebrow} title={title}>
      <ProfileCard />
      <Segments id="you" items={SECTIONS} value={section} onChange={open} />
      <SwapIn id={section}>
        {section === 'today' && <Today />}
        {section === 'achievements' && <Achievements />}
        {section === 'album' && <AlbumContent />}
        {section === 'progress' && <Progress />}
        {section === 'settings' && <Settings />}
      </SwapIn>
    </Sheet>
  )
}

/** Cabecera personal: inicial, nombre y un resumen rápido. */
function ProfileCard() {
  const userName = useGrove((s) => s.userName)
  const gardenName = useGrove((s) => s.gardenName)
  const totalDays = useGrove((s) => s.totalDays)
  const minutes = useGrove((s) => s.stats.focusMinutes)
  const done = useGrove((s) => s.achievementsClaimed.length)
  return (
    <div className="iri" style={{ ...iriStyle(2), borderRadius: 24, padding: 16, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
      <span style={{ position: 'relative', zIndex: 2, width: 52, height: 52, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#1B1F1C', color: '#fff', fontSize: 22, fontWeight: 700, flex: 'none' }}>
        {(userName || 'T').slice(0, 1).toUpperCase()}
      </span>
      <div style={{ position: 'relative', zIndex: 2, minWidth: 0, flex: 1, color: '#1B1F1C' }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{userName || 'Tú'}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5D645E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gardenName}</div>
      </div>
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 14, color: '#1B1F1C', textAlign: 'center' }}>
        {[
          [totalDays, 'días'],
          [minutes, 'min'],
          [done, 'logros'],
        ].map(([v, l]) => (
          <div key={l}>
            <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: '-0.04em' }}>{v}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#5D645E', textTransform: 'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClaimButton({ done, claimed, onClick }: { done: boolean; claimed: boolean; onClick: () => void }) {
  if (claimed)
    return (
      <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}>
        <CheckIcon size={15} strokeWidth={2.4} /> Hecho
      </span>
    )
  return (
    <button className="pill pill-dark press" disabled={!done} onClick={onClick} style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
      Recoger
    </button>
  )
}

function Today() {
  const daily = useGrove((s) => s.daily)
  const claimed = useGrove((s) => s.missionsClaimed)
  const claim = useGrove((s) => s.claimMission)
  const missions = missionsFor(daily.day)
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p className="muted" style={{ margin: '0 0 6px', fontSize: 13, lineHeight: 1.5 }}>
        Tres pequeñas cosas para hoy. Si no te da tiempo, mañana habrá otras: no se acumulan ni caducan con culpa.
      </p>
      {missions.map((m) => {
        const value = Math.min(m.target, Math.floor(m.value(daily)))
        const done = value >= m.target
        return (
          <div key={m.id} className="row-card">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{m.title}</div>
              <div className="progress">
                <span style={{ width: `${(value / m.target) * 100}%` }} />
              </div>
              <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
                {value}/{m.target} · <CoinIcon size={13} /> {m.reward.coins}
              </div>
            </div>
            <ClaimButton done={done} claimed={claimed.includes(m.id)} onClick={() => claim(m.id)} />
          </div>
        )
      })}
    </div>
  )
}

function Achievements() {
  const stats = useGrove((s) => s.stats)
  const visitors = useGrove((s) => s.visitorsSeen.length)
  const claimed = useGrove((s) => s.achievementsClaimed)
  const claim = useGrove((s) => s.claimAchievement)
  const all = { ...stats, visitors }
  const sorted = [...ACHIEVEMENTS].sort((a, b) => Number(claimed.includes(a.id)) - Number(claimed.includes(b.id)))
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p className="muted" style={{ margin: '0 0 6px', fontSize: 13, lineHeight: 1.5 }}>
        Los logros te dan parcelas para ampliar tu jardín. Se quedan contigo para siempre.
      </p>
      {sorted.map((a) => {
        const value = Math.min(a.target, Math.floor(a.value(all)))
        const isClaimed = claimed.includes(a.id)
        return (
          <div key={a.id} className="row-card" style={{ opacity: isClaimed ? 0.6 : 1 }}>
            <span style={{ width: 40, height: 40, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(240,190,98,0.25)', flex: 'none' }}>
              <TrophyIcon size={20} />
            </span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{a.title}</div>
              <div className="muted" style={{ fontSize: 12 }}>{a.detail}</div>
              <div className="progress">
                <span style={{ width: `${(value / a.target) * 100}%` }} />
              </div>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                {value}/{a.target} · {rewardLabel(a.reward)}
              </div>
            </div>
            <ClaimButton done={value >= a.target} claimed={isClaimed} onClick={() => claim(a.id)} />
          </div>
        )
      })}
    </div>
  )
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span className="display" style={{ fontSize: 44 }}>
        {value}
      </span>
      <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
        {label}
      </span>
    </div>
  )
}

function Progress() {
  const s = useGrove((st) => st)
  const allowed = parcelsAllowed(s)
  const next = nextDayReward(s.totalDays)
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
        <Stat value={s.totalDays} label="días cuidándote" />
        <Stat value={s.stats.focusMinutes} label="minutos cultivados" />
        <Stat value={s.stats.sessions} label="sesiones" />
        <Stat value={s.entries.length} label="días en Raíces" />
        <Stat value={s.stats.plantsGrown} label="plantas crecidas" />
        <Stat
          value={
            <>
              {s.plots.length}
              <span style={{ fontSize: 22, color: 'var(--ink-faint)' }}>/{allowed}</span>
            </>
          }
          label="parcelas"
        />
      </div>
      {next && (
        <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          A los {next.days} días cuidándote ganas {next.parcels} parcelas más. Te faltan {next.days - s.totalDays}.
        </p>
      )}
    </div>
  )
}

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 650 }}>{label}</div>
        {hint && (
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
}

function Settings() {
  const audio = useGrove((s) => s.audio)
  const setAudio = useGrove((s) => s.setAudio)
  const weekGoal = useGrove((s) => s.weekGoal)
  const setWeekGoal = useGrove((s) => s.setWeekGoal)
  const name = useGrove((s) => s.gardenName)
  const setName = useGrove((s) => s.setGardenName)
  const seasonOverride = useGrove((s) => s.seasonOverride)
  const resetAll = useGrove((s) => s.resetAll)
  const userName = useGrove((s) => s.userName)
  const replay = useGrove((s) => s.replayOnboarding)
  const [confirmReset, setConfirmReset] = useState(false)
  const dev = useDev((s) => s.on)

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
      {dev && <DevPanel />}
      <div className="eyebrow" style={{ marginBottom: 2 }}>
        Sonido
      </div>
      <Row label="Música" hint="Melodías tranquilas de fondo">
        <Switch on={audio.music} onChange={(music) => setAudio({ music })} label="Música" />
      </Row>
      {audio.music && (
        <input className="slider" type="range" min={0} max={1} step={0.05} value={audio.musicVolume} onChange={(e) => setAudio({ musicVolume: Number(e.target.value) })} aria-label="Volumen de la música" style={{ margin: '10px 0' }} />
      )}
      <Row label="Sonido ambiente" hint="Naturaleza según la estación y la hora">
        <Switch on={audio.ambient} onChange={(ambient) => setAudio({ ambient })} label="Sonido ambiente" />
      </Row>
      {audio.ambient && (
        <input className="slider" type="range" min={0} max={1} step={0.05} value={audio.ambientVolume} onChange={(e) => setAudio({ ambientVolume: Number(e.target.value) })} aria-label="Volumen del ambiente" style={{ margin: '10px 0' }} />
      )}
      <Row label="Efectos" hint="Celebraciones y monedas">
        <Switch on={audio.sfx} onChange={(sfx) => setAudio({ sfx })} label="Efectos" />
      </Row>
      {audio.sfx && (
        <input className="slider" type="range" min={0} max={1} step={0.05} value={audio.sfxVolume} onChange={(e) => setAudio({ sfxVolume: Number(e.target.value) })} aria-label="Volumen de los efectos" style={{ margin: '10px 0' }} />
      )}

      <div className="eyebrow" style={{ margin: '22px 0 2px' }}>
        Tu jardín
      </div>
      <Row label="Tu nombre">
        <input
          value={userName}
          onChange={(e) => useGrove.setState({ userName: e.target.value.slice(0, 24) })}
          aria-label="Tu nombre"
          placeholder="Opcional"
          style={{ width: 150, height: 36, borderRadius: 12, border: '1px solid var(--line)', background: 'rgba(255,255,255,0.5)', padding: '0 10px', font: 'inherit', fontSize: 14, color: 'var(--ink)', textAlign: 'right' }}
        />
      </Row>
      <Row label="Nombre del jardín">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 24))}
          aria-label="Nombre del jardín"
          style={{ width: 150, height: 36, borderRadius: 12, border: '1px solid var(--line)', background: 'rgba(255,255,255,0.5)', padding: '0 10px', font: 'inherit', fontSize: 14, color: 'var(--ink)', textAlign: 'right' }}
        />
      </Row>
      <Row label="Objetivo semanal" hint="Días a la semana que quieres dedicarte">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="pill pill-ghost press" onClick={() => setWeekGoal(Math.max(1, weekGoal - 1))} aria-label="Menos días" style={{ width: 34, height: 34, padding: 0 }}>
            −
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, width: 16, textAlign: 'center' }}>{weekGoal}</span>
          <button className="pill pill-ghost press" onClick={() => setWeekGoal(Math.min(7, weekGoal + 1))} aria-label="Más días" style={{ width: 34, height: 34, padding: 0 }}>
            +
          </button>
        </div>
      </Row>
      <Row label="Estación" hint="La del calendario, o tu favorita siempre">
        <select
          value={seasonOverride ?? 'auto'}
          onChange={(e) => useGrove.setState({ seasonOverride: e.target.value === 'auto' ? null : (e.target.value as typeof seasonOverride) })}
          aria-label="Estación"
          style={{ height: 36, borderRadius: 12, border: '1px solid var(--line)', background: 'rgba(255,255,255,0.5)', padding: '0 8px', font: 'inherit', fontSize: 14, color: 'var(--ink)' }}
        >
          <option value="auto">Del calendario</option>
          {SEASON_ORDER.map((s) => (
            <option key={s} value={s}>
              {SEASONS[s].name}
            </option>
          ))}
        </select>
      </Row>

      <div className="eyebrow" style={{ margin: '22px 0 2px' }}>
        Datos
      </div>
      <Row label="Tu diario" hint="Todo se guarda solo en este dispositivo">
        <span />
      </Row>
      <Row label="Bienvenida" hint="Vuelve a ver la introducción">
        <button className="pill pill-ghost press" onClick={replay} style={{ height: 34, fontSize: 13 }}>
          Ver de nuevo
        </button>
      </Row>
      <div style={{ paddingTop: 14 }}>
        {confirmReset ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pill press" onClick={() => { resetAll(); setConfirmReset(false) }} style={{ flex: 1, background: '#E0605A', color: '#fff' }}>
              Sí, borrar todo
            </button>
            <button className="pill pill-ghost press" onClick={() => setConfirmReset(false)} style={{ flex: 1 }}>
              Cancelar
            </button>
          </div>
        ) : (
          <button className="pill pill-ghost press" onClick={() => setConfirmReset(true)} style={{ width: '100%', color: '#C2453F' }}>
            Empezar de cero
          </button>
        )}
      </div>
      <VersionLine />
    </div>
  )
}

/** La versión, al final de Ajustes. Siete toques seguidos activan el modo desarrollador. */
function VersionLine() {
  const taps = useRef<number[]>([])
  const onTap = () => {
    if (useDev.getState().on) return
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < 2500), now]
    if (taps.current.length >= 7) {
      taps.current = []
      setDevMode(true)
      useGrove.getState().showToast('Modo desarrollador activado')
    }
  }
  return (
    <button className="version-line" onClick={onTap} aria-label="Versión de la app">
      Grove · versión 0.9
    </button>
  )
}
