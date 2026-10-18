import { useEffect, useState } from 'react'
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react'
import { audio } from '../../audio/engine'
import { SOUNDSCAPES, type SoundscapeId } from '../../audio/soundscapes'
import { BREATH_PATTERNS, PHASE_LABELS, phaseAt, type BreathPatternId } from '../../game/calm'
import { useGrove } from '../../game/store'
import { formatClock, TIME_SCALE } from '../../game/time'
import { breath } from '../../scene/breath'
import { HeadphonesIcon } from '../icons'
import { Segments, Sheet, SwapIn } from '../Sheet'
import { useNow } from '../useNow'

type Section = 'breath' | 'meditate'

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'breath', label: 'Respirar' },
  { id: 'meditate', label: 'Meditar' },
]

const BREATH_MINUTES = [1, 2, 3, 5]
const MEDITATE_MINUTES = [3, 5, 10, 20]

export function CalmSheet() {
  const calm = useGrove((s) => s.calm)
  const [section, setSection] = useState<Section>('breath')

  // Al cerrar Calma sin nada en marcha, la vista previa del sonido se apaga
  useEffect(
    () => () => {
      if (!useGrove.getState().calm) audio.setSoundscape('none')
    },
    [],
  )

  if (calm) {
    return (
      <Sheet eyebrow={calm.kind === 'breath' ? 'Respirando' : 'Meditando'} title="Calma" accent="calm">
        {calm.kind === 'breath' ? <BreathRunning /> : <MeditateRunning />}
      </Sheet>
    )
  }

  return (
    <Sheet eyebrow="Respira y medita" title="Calma" accent="calm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Segments id="calm" items={SECTIONS} value={section} onChange={setSection} />
        <SwapIn id={section}>
          {section === 'breath' && <BreathSetup />}
          {section === 'meditate' && <MeditateSetup />}
        </SwapIn>
      </div>
    </Sheet>
  )
}

// ——— Preparar ———

function BreathSetup() {
  const prefs = useGrove((s) => s.calmPrefs)
  const set = useGrove((s) => s.setCalmPrefs)
  const start = useGrove((s) => s.startCalm)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="calm-patterns" role="radiogroup" aria-label="Respiración">
        {BREATH_PATTERNS.map((p) => (
          <button key={p.id} role="radio" aria-checked={prefs.pattern === p.id} className="calm-pattern press" onClick={() => set({ pattern: p.id as BreathPatternId })}>
            <PatternShape id={p.id} />
            <span className="calm-pattern-name">{p.name}</span>
            <span className="calm-pattern-hint">{p.hint}</span>
            <span className="calm-pattern-rhythm">{p.phases.map((ph) => ph.seconds).join(' · ')}</span>
          </button>
        ))}
      </div>
      <Minutes options={BREATH_MINUTES} value={prefs.breathMinutes} onChange={(breathMinutes) => set({ breathMinutes })} />
      <SoundPicker />
      <button className="calm-toggle press" aria-pressed={prefs.guide} onClick={() => set({ guide: !prefs.guide })}>
        <span className="calm-toggle-dot" />
        Guía sonora en cada fase
      </button>
      <Reward />
      <button className="pill pill-dark press" style={{ height: 54, fontSize: 16 }} onClick={() => start('breath', prefs.breathMinutes, prefs.pattern)}>
        Empezar a respirar
      </button>
    </div>
  )
}

function MeditateSetup() {
  const prefs = useGrove((s) => s.calmPrefs)
  const set = useGrove((s) => s.setCalmPrefs)
  const start = useGrove((s) => s.startCalm)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        Siéntate cómodo y deja que el sonido te acompañe. Un cuenco marca el principio, la mitad y el final.
      </p>
      <Minutes options={MEDITATE_MINUTES} value={prefs.meditateMinutes} onChange={(meditateMinutes) => set({ meditateMinutes })} />
      <SoundPicker />
      <Reward />
      <button className="pill pill-dark press" style={{ height: 54, fontSize: 16 }} onClick={() => start('meditate', prefs.meditateMinutes)}>
        Empezar a meditar
      </button>
    </div>
  )
}

function Reward() {
  return (
    <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
      Tu calma riega tus semillas igual que Cultivar, cuenta como día cumplido y da 1 moneda cada 2 minutos.
      {TIME_SCALE > 1 && ' (Modo rápido: 1 s = 1 min)'}
    </p>
  )
}

function Minutes({ options, value, onChange }: { options: number[]; value: number; onChange: (v: number) => void }) {
  return (
    <div className="calm-block">
      <div className="calm-label">Duración</div>
      <div className="calm-chips">
        {options.map((m) => (
          <button key={m} className="pill pill-ghost press calm-chip" aria-pressed={value === m} onClick={() => onChange(m)}>
            {m} min
          </button>
        ))}
      </div>
    </div>
  )
}

/** Elegir el paisaje sonoro. Al tocar uno suena ya, para probarlo antes de empezar. */
function SoundPicker() {
  const prefs = useGrove((s) => s.calmPrefs)
  const set = useGrove((s) => s.setCalmPrefs)
  const [playing, setPlaying] = useState<SoundscapeId>(audio.soundscape)
  const pick = (id: SoundscapeId) => {
    audio.unlock()
    set({ sound: id })
    audio.setSoundscape(id, prefs.volume)
    setPlaying(id)
  }
  const current = SOUNDSCAPES.find((s) => s.id === prefs.sound)
  const groups = ['Naturaleza', 'Ruido', 'Binaural'] as const
  return (
    <div className="calm-block">
      <div className="calm-label">Sonido</div>
      {groups.map((g) => (
        <div key={g} className="calm-sound-group">
          <span className="calm-sound-group-name">{g}</span>
          <div className="calm-chips">
            {g === 'Naturaleza' && (
              <button className="pill pill-ghost press calm-chip" aria-pressed={prefs.sound === 'none'} onClick={() => pick('none')}>
                Silencio
              </button>
            )}
            {SOUNDSCAPES.filter((s) => s.group === g).map((s) => (
              <button key={s.id} className="pill pill-ghost press calm-chip" aria-pressed={prefs.sound === s.id} onClick={() => pick(s.id)}>
                {playing === s.id && <span className="calm-eq" aria-hidden="true"><i /><i /><i /></span>}
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      {current && (
        <div className="calm-sound-hint muted">
          {current.group === 'Binaural' && <HeadphonesIcon size={14} />}
          {current.group === 'Binaural' ? `${current.hint}. Usa auriculares: cada oído oye un tono distinto.` : current.hint}
        </div>
      )}
      {prefs.sound !== 'none' && (
        <input
          className="slider"
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={prefs.volume}
          aria-label="Volumen del sonido"
          onChange={(e) => {
            const volume = Number(e.target.value)
            set({ volume })
            if (audio.soundscape !== 'none') audio.setSoundscape(audio.soundscape, volume)
          }}
        />
      )}
    </div>
  )
}

/** Dibujo pequeño del ritmo: un cuadrado, un triángulo o una onda. */
function PatternShape({ id }: { id: string }) {
  const d =
    id === 'box' ? 'M8 8h24v24H8z' : id === '478' ? 'M6 32 L14 10 L34 10 Z' : 'M4 20 C 10 6, 16 6, 20 20 S 30 34, 36 20'
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="calm-pattern-shape">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ——— En marcha ———

function useCalmClock() {
  const calm = useGrove((s) => s.calm)
  const now = useNow(!!calm, 250)
  if (!calm) return null
  const elapsed = ((now - calm.startedAt) / 1000) * TIME_SCALE
  const total = calm.minutes * 60
  return { elapsed, total, remaining: Math.max(0, total - elapsed), progress: Math.min(1, elapsed / total) }
}

/** El círculo que respira: crece al inspirar, se queda quieto al retener y vuelve al soltar. */
function BreathRunning() {
  const calm = useGrove((s) => s.calm)
  const clock = useCalmClock()
  const pattern = BREATH_PATTERNS.find((p) => p.id === calm?.pattern) ?? BREATH_PATTERNS[0]
  const fill = useMotionValue(0)
  const scale = useTransform(fill, (f) => 0.5 + f * 0.5)
  const glow = useTransform(fill, (f) => 0.35 + f * 0.65)
  const [phase, setPhase] = useState(() => phaseAt(pattern, 0))
  useAnimationFrame(() => {
    if (!calm) return
    const elapsed = ((Date.now() - calm.startedAt) / 1000) * TIME_SCALE
    const p = phaseAt(pattern, elapsed)
    fill.set(p.fill)
    if (p.phase !== phase.phase || p.left !== phase.left || p.index !== phase.index) setPhase(p)
  })
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
      <div className="breath-stage" aria-live="polite">
        <div className="breath-guide" />
        <motion.div className="breath-halo" style={{ scale, opacity: glow }} />
        <motion.div className="breath-orb" style={{ scale }} />
        <div className="breath-text">
          <motion.span key={`${phase.cycle}-${phase.index}`} className="breath-phase" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {PHASE_LABELS[phase.phase]}
          </motion.span>
          <span className="display breath-count">{phase.left}</span>
        </div>
      </div>
      <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
        {pattern.name} · quedan {formatClock(clock?.remaining ?? 0)}
      </div>
      <RunningActions />
    </div>
  )
}

function MeditateRunning() {
  const clock = useCalmClock()
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
      <div className="breath-stage meditate-stage">
        <div className="meditate-ring" />
        <div className="meditate-ring meditate-ring-2" />
        <svg className="meditate-progress" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth="3" />
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 92}
            strokeDashoffset={2 * Math.PI * 92 * (1 - (clock?.progress ?? 0))}
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset .3s linear' }}
          />
        </svg>
        <div className="breath-text">
          <span className="display breath-count" style={{ fontSize: 58 }}>
            {formatClock(clock?.remaining ?? 0)}
          </span>
        </div>
      </div>
      <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
        Respira a tu ritmo. No hay nada que hacer bien.
      </div>
      <RunningActions />
    </div>
  )
}

function RunningActions() {
  const complete = useGrove((s) => s.completeCalm)
  const cancel = useGrove((s) => s.cancelCalm)
  const clock = useCalmClock()
  const minutes = Math.floor((clock?.elapsed ?? 0) / 60)
  return (
    <div style={{ display: 'flex', gap: 10, width: '100%' }}>
      <button className="pill pill-ghost press" onClick={cancel} style={{ flex: 1, height: 50 }}>
        Parar
      </button>
      <button className="pill pill-dark press" onClick={() => (minutes >= 1 ? complete(true) : cancel())} style={{ flex: 1, height: 50 }}>
        {minutes >= 1 ? 'Terminar ya' : 'Terminar'}
      </button>
    </div>
  )
}

// ——— Controlador (sin interfaz) ———

/** Marca de la sesión que ya ha sonado su cuenco de inicio (en desarrollo los efectos se repiten). */
let bowledFor = 0

/**
 * Lleva la sesión de calma aunque el panel esté cerrado: el sonido, los cuencos, la guía de cada
 * fase, la isla que respira y el final cuando se cumple el tiempo.
 */
export function CalmController() {
  const calm = useGrove((s) => s.calm)
  useEffect(() => {
    if (!calm) return
    const prefs = useGrove.getState().calmPrefs
    audio.setSoundscape(prefs.sound as SoundscapeId, prefs.volume)
    if (bowledFor !== calm.startedAt) {
      bowledFor = calm.startedAt
      audio.bowl(0.8)
    }
    const pattern = calm.kind === 'breath' ? (BREATH_PATTERNS.find((p) => p.id === calm.pattern) ?? BREATH_PATTERNS[0]) : null
    breath.active = !!pattern
    const total = calm.minutes * 60
    let lastKey = ''
    let half = false
    let raf = 0
    let ended = false
    const elapsedNow = () => ((Date.now() - calm.startedAt) / 1000) * TIME_SCALE
    /** true si ya se ha cumplido el tiempo (y entonces la cierra). */
    const finish = () => {
      if (ended || elapsedNow() < total) return ended
      ended = true
      audio.bowl(1.1, 196)
      useGrove.getState().completeCalm()
      return true
    }
    const tick = () => {
      if (finish()) return
      const elapsed = elapsedNow()
      if (pattern) {
        const p = phaseAt(pattern, elapsed)
        breath.fill = p.fill
        const key = `${p.cycle}:${p.index}`
        if (key !== lastKey) {
          if (prefs.guide && p.phase !== 'rest') audio.breathCue(p.phase === 'in' ? 'in' : p.phase === 'out' ? 'out' : 'hold')
          lastKey = key
        }
      } else if (!half && total >= 300 && elapsed >= total / 2) {
        half = true
        audio.bowl(0.55)
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    // Si la pestaña queda en segundo plano, el final llega igual al volver
    const id = setInterval(finish, 1000)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(id)
      breath.active = false
      breath.fill = 0
      if (!useGrove.getState().calm) audio.setSoundscape('none')
    }
  }, [calm])
  return null
}
