// Motor de sonido con Web Audio. Dos canales independientes:
// - Música: pistas reales si las hay (`MUSIC_TRACKS`); si no, una melodía suave generada.
// - Ambiente: viento, pájaros, grillos y agua sintetizados según la estación y la hora.
// - Efectos: la firma sonora de las celebraciones y el "tin" de cada moneda.

import type { Season } from '../game/seasons'
import { startSoundscape, type Playing, type SoundscapeId } from './soundscapes'

export interface AmbientMood {
  season: Season
  /** 0 = día, 1 = noche */
  night: number
  hasWater: boolean
}

/** Rutas de pistas de música (en /public/audio). Vacío = melodía generada. */
export const MUSIC_TRACKS: string[] = []

// Escala pentatónica en Re mayor: suena tranquila con cualquier combinación de notas
const SCALE = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880]

class Engine {
  private ctx: AudioContext | null = null
  private musicGain!: GainNode
  private ambientGain!: GainNode
  private sfxGain!: GainNode
  private sfxOn = true
  private sfxVolume = 0.7
  private windGain!: GainNode
  private waterGain!: GainNode
  private cricketGain!: GainNode
  private reverb!: ConvolverNode
  private noise!: AudioBuffer
  private timers: number[] = []
  private mood: AmbientMood = { season: 'spring', night: 0, hasWater: false }
  private trackEl: HTMLAudioElement | null = null
  private musicOn = false
  private ambientOn = false
  private musicVolume = 0.5
  private ambientVolume = 0.6
  /** Durante Calma con un paisaje propio, la música y el ambiente se apartan. */
  private ducked = false
  private calmGain!: GainNode
  private scape: Playing | null = null
  private scapeId: SoundscapeId = 'none'
  private buffers = new Map<string, AudioBuffer>()

  /** El navegador solo permite sonar tras un gesto del usuario. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const ctx = new AudioContext()
    this.ctx = ctx
    this.noise = this.makeNoise(ctx)
    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.makeImpulse(ctx, 2.8)
    const reverbOut = ctx.createGain()
    reverbOut.gain.value = 0.5
    this.reverb.connect(reverbOut).connect(ctx.destination)

    this.musicGain = ctx.createGain()
    this.musicGain.gain.value = 0
    this.musicGain.connect(ctx.destination)
    this.musicGain.connect(this.reverb)

    this.ambientGain = ctx.createGain()
    this.ambientGain.gain.value = 0
    this.ambientGain.connect(ctx.destination)

    // Los efectos pasan por un paso bajo suave: nada chillón, aunque las notas sean agudas
    const sfxTone = ctx.createBiquadFilter()
    sfxTone.type = 'lowpass'
    sfxTone.frequency.value = 5200
    sfxTone.Q.value = 0.4
    this.sfxGain = ctx.createGain()
    this.sfxGain.gain.value = this.sfxOn ? this.sfxVolume : 0
    this.sfxGain.connect(sfxTone)
    sfxTone.connect(ctx.destination)
    sfxTone.connect(this.reverb)

    this.calmGain = ctx.createGain()
    this.calmGain.gain.value = 0.34
    this.calmGain.connect(ctx.destination)

    this.windGain = this.loopNoise(ctx, 'lowpass', 380, 0.2)
    this.waterGain = this.loopNoise(ctx, 'bandpass', 1800, 0.0)
    this.cricketGain = ctx.createGain()
    this.cricketGain.gain.value = 0
    this.cricketGain.connect(this.ambientGain)

    this.scheduleBirds()
    this.scheduleCrickets()
    this.scheduleMusic()
    this.applyMood()
  }

  setMusic(on: boolean, volume: number) {
    this.musicOn = on
    this.musicVolume = volume
    if (!this.ctx) return
    const target = on && !this.ducked ? volume * 0.35 : 0
    this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.8)
    if (MUSIC_TRACKS.length) this.playTrack(on, volume)
  }

  setAmbient(on: boolean, volume: number) {
    this.ambientOn = on
    this.ambientVolume = volume
    if (!this.ctx) return
    this.ambientGain.gain.setTargetAtTime(on && !this.ducked ? volume * 0.5 : 0, this.ctx.currentTime, 0.8)
  }

  // ——— Calma ———

  /**
   * Paisaje sonoro de Calma. "Jardín" deja sonar el ambiente de siempre (aunque lo tengas
   * apagado); "Silencio" y los demás apartan la música y el ambiente mientras dura. `none` es
   * salir de Calma: todo vuelve a como estaba.
   */
  setSoundscape(id: SoundscapeId, volume = 0.8) {
    const ctx = this.ctx
    if (!ctx) return
    // Calma tiene que ser sutil: el máximo del control queda bastante por debajo del resto
    this.calmGain.gain.setTargetAtTime(volume * 0.42, ctx.currentTime, 0.2)
    if (id === this.scapeId) return
    this.scape?.stop()
    this.scapeId = id
    this.scape = startSoundscape(ctx, this.calmGain, id, this.buffers)
    this.ducked = id !== 'none'
    const t = ctx.currentTime
    this.musicGain.gain.setTargetAtTime(this.musicOn && !this.ducked ? this.musicVolume * 0.35 : 0, t, 0.8)
    // Con "Jardín" el ambiente suena aunque estuviera apagado: es lo que has elegido
    const ambient = id === 'nature' ? Math.max(this.ambientVolume, 0.5) * 0.5 : this.ambientOn && !this.ducked ? this.ambientVolume * 0.5 : 0
    this.ambientGain.gain.setTargetAtTime(ambient, t, 0.8)
    if (this.trackEl && this.ducked) this.trackEl.pause()
    else if (this.trackEl && this.musicOn) void this.trackEl.play()
  }

  /** Para vista previa en la pantalla de elegir sonido. */
  get soundscape() {
    return this.scapeId
  }

  /**
   * Cuenco tibetano: parciales inarmónicos que se apagan a distinto ritmo y, cada uno, dos
   * osciladores un pelín desafinados para que "canten" con ese batido lento tan suyo.
   */
  bowl(strength = 1, pitch = 220) {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const t = ctx.currentTime + 0.02
    const partials: Array<[number, number, number]> = [
      [1, 1, 9],
      [2.76, 0.42, 6.5],
      [5.4, 0.18, 4],
      [8.93, 0.07, 2.4],
    ]
    for (const [ratio, amp, decay] of partials) {
      for (const beat of [-0.6, 0.6]) {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = pitch * ratio + beat * ratio
        const peak = 0.075 * amp * strength
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(peak, t + 0.012)
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
        osc.connect(g)
        g.connect(this.calmGain)
        g.connect(this.reverb)
        osc.start(t)
        osc.stop(t + decay + 0.1)
      }
    }
  }

  /** Guía de la respiración: una nota suave al empezar cada fase. */
  breathCue(phase: 'in' | 'hold' | 'out') {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const t = ctx.currentTime + 0.01
    const freq = phase === 'in' ? 440 : phase === 'out' ? 329.63 : 392
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(phase === 'hold' ? 0.022 : 0.036, t + 0.12)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2)
    osc.connect(g)
    g.connect(this.calmGain)
    g.connect(this.reverb)
    osc.start(t)
    osc.stop(t + 2.3)
  }

  setSfx(on: boolean, volume: number) {
    this.sfxOn = on
    this.sfxVolume = volume
    if (!this.ctx) return
    this.sfxGain.gain.setTargetAtTime(on ? volume : 0, this.ctx.currentTime, 0.05)
  }

  /**
   * Firma sonora de Grove: campanitas cálidas en Re mayor pentatónico, la misma escala que la
   * música, para que una celebración nunca desentone con lo que suena.
   * `coin` sube una nota por cada moneda que llega (i), como una escala que se completa.
   */
  sfx(name: 'coin' | 'small' | 'medium' | 'big' | 'tick', i = 0) {
    const ctx = this.ctx
    if (!ctx || !this.sfxOn || ctx.state !== 'running') return
    const t = ctx.currentTime + 0.01
    const D5 = 587.33
    const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3]
    if (name === 'tick') {
      // El "clic" de una rueda de iOS: un golpecito seco y corto, casi sin tono
      const now = performance.now()
      if (now - this.lastTick < 28) return
      this.lastTick = now
      this.click(t, i % 2 === 0 ? 1 : 0.85)
      return
    }
    if (name === 'coin') {
      this.bell(D5 * 2 * PENTA[Math.min(i, PENTA.length - 1)], t, 0.07, 0.32)
    } else if (name === 'small') {
      this.bell(D5, t, 0.09, 0.7)
      this.bell(D5 * 1.5, t + 0.09, 0.08, 0.9)
    } else if (name === 'medium') {
      ;[1, 5 / 4, 3 / 2, 2].forEach((r, k) => this.bell(D5 * r, t + k * 0.085, 0.085, 1.3))
      this.swell([293.66, 440, 739.99], t, 0.025, 1.8)
    } else {
      this.swell([146.83, 220, 293.66, 369.99], t, 0.03, 3.4)
      ;[1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 5 / 2, 3].forEach((r, k) => this.bell(D5 * r, t + 0.25 + k * 0.075, 0.07, 1.6))
      // Destellos sueltos al final, muy bajitos
      for (let k = 0; k < 5; k++) this.bell(D5 * 4 * PENTA[(k * 3) % PENTA.length], t + 0.9 + k * 0.16 + Math.random() * 0.05, 0.025, 0.8)
    }
  }

  private lastTick = 0

  /** Golpe muy corto de ruido filtrado más un pellizco de tono: suena a mecanismo, no a pitido. */
  private click(t: number, tone: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 3200 * tone
    bp.Q.value = 1.2
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.22, t + 0.001)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018)
    src.connect(bp).connect(g).connect(this.sfxGain)
    src.start(t, Math.random() * 2, 0.03)
    const osc = ctx.createOscillator()
    const og = ctx.createGain()
    osc.frequency.value = 1500 * tone
    og.gain.setValueAtTime(0, t)
    og.gain.linearRampToValueAtTime(0.025, t + 0.001)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.025)
    osc.connect(og).connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 0.04)
  }

  /** Una campana suave: fundamental, octava y un parcial de cristal que se apaga antes. */
  private bell(freq: number, t: number, gain: number, decay: number) {
    const ctx = this.ctx!
    const partials: Array<[number, number, number]> = [
      [1, 1, decay],
      [2, 0.22, decay * 0.6],
      [3.01, 0.06, decay * 0.3],
    ]
    for (const [mult, amp, d] of partials) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq * mult
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(gain * amp, t + 0.006)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d)
      osc.connect(g).connect(this.sfxGain)
      osc.start(t)
      osc.stop(t + d + 0.05)
    }
  }

  /** Acorde que entra y sale despacio, de colchón bajo las campanas. */
  private swell(freqs: number[], t: number, gain: number, length: number) {
    const ctx = this.ctx!
    for (const f of freqs) {
      for (const detune of [-4, 4]) {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.value = f
        osc.detune.value = detune
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(gain, t + length * 0.3)
        g.gain.linearRampToValueAtTime(0, t + length)
        osc.connect(g).connect(this.sfxGain)
        osc.start(t)
        osc.stop(t + length + 0.05)
      }
    }
  }

  setMood(mood: AmbientMood) {
    this.mood = mood
    this.applyMood()
  }

  private applyMood() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const { season, night, hasWater } = this.mood
    // Viento muy de fondo: solo una brisa; el protagonismo es de los pájaros
    const windy = season === 'autumn' ? 0.6 : season === 'winter' ? 0.5 : 0.25
    this.windGain.gain.setTargetAtTime(0.09 * windy, t, 2)
    this.waterGain.gain.setTargetAtTime(hasWater ? 0.012 : 0, t, 2)
    const crickets = season === 'winter' ? 0 : night * (season === 'summer' ? 1 : 0.6)
    this.cricketGain.gain.setTargetAtTime(crickets * 0.06, t, 2)
  }

  // ——— Ambiente ———

  private makeNoise(ctx: AudioContext) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
    const data = buf.getChannelData(0)
    // Ruido rosa aproximado: más grave y suave que el ruido blanco
    let b0 = 0, b1 = 0, b2 = 0
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99765 * b0 + w * 0.099046
      b1 = 0.963 * b1 + w * 0.2965164
      b2 = 0.57 * b2 + w * 1.0526913
      data[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2
    }
    return buf
  }

  private makeImpulse(ctx: AudioContext, seconds: number) {
    const len = ctx.sampleRate * seconds
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    }
    return buf
  }

  /** Ruido en bucle filtrado con un vaivén lento de volumen (viento, agua). */
  private loopNoise(ctx: AudioContext, type: BiquadFilterType, freq: number, gain: number) {
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    filter.Q.value = type === 'bandpass' ? 0.8 : 0.5
    const g = ctx.createGain()
    g.gain.value = gain
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07 + Math.random() * 0.05
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = freq * 0.35
    lfo.connect(lfoGain).connect(filter.frequency)
    src.connect(filter).connect(g).connect(this.ambientGain)
    src.start()
    lfo.start()
    return g
  }

  private later(fn: () => void, ms: number) {
    this.timers.push(window.setTimeout(fn, ms))
  }

  /** Trinos cortos con barridos de frecuencia; más de día y en primavera. */
  private scheduleBirds() {
    const loop = () => {
      const { season, night } = this.mood
      const rate = night > 0.5 ? 0 : season === 'spring' ? 1 : season === 'summer' ? 0.85 : season === 'autumn' ? 0.55 : 0.3
      if (this.ctx && this.ambientOn && Math.random() < rate) {
        if (Math.random() < 0.35) this.song()
        else this.chirp()
      }
      this.later(loop, 1200 + Math.random() * 2600)
    }
    loop()
  }

  /** Canto más largo y melódico: varias notas que suben y bajan, como un mirlo lejano. */
  private song() {
    const ctx = this.ctx!
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.random() * 1.4 - 0.7
    const far = ctx.createGain()
    far.gain.value = 0.55
    pan.connect(far).connect(this.ambientGain)
    const base = 1500 + Math.random() * 900
    const notes = 4 + Math.floor(Math.random() * 4)
    let t = ctx.currentTime
    for (let i = 0; i < notes; i++) {
      const dur = 0.12 + Math.random() * 0.14
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      const f = base * (1 + Math.sin(i * 1.7) * 0.25 + Math.random() * 0.1)
      osc.frequency.setValueAtTime(f, t)
      osc.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.15 : 0.88), t + dur)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.035, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(g).connect(pan)
      osc.start(t)
      osc.stop(t + dur + 0.02)
      t += dur + 0.03 + Math.random() * 0.08
    }
  }

  private chirp() {
    const ctx = this.ctx!
    const notes = 2 + Math.floor(Math.random() * 4)
    const base = 2200 + Math.random() * 1600
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.random() * 1.6 - 0.8
    pan.connect(this.ambientGain)
    for (let i = 0; i < notes; i++) {
      const t = ctx.currentTime + i * (0.09 + Math.random() * 0.05)
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.3), t)
      osc.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), t + 0.06)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.03, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
      osc.connect(g).connect(pan)
      osc.start(t)
      osc.stop(t + 0.1)
    }
  }

  /** Grillos: pulsos agudos y rápidos, solo por la noche. */
  private scheduleCrickets() {
    const loop = () => {
      if (this.ctx && this.ambientOn && this.mood.night > 0.4) {
        const ctx = this.ctx
        const t = ctx.currentTime
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator()
          const g = ctx.createGain()
          osc.frequency.value = 4400 + Math.random() * 300
          g.gain.setValueAtTime(0, t + i * 0.05)
          g.gain.linearRampToValueAtTime(1, t + i * 0.05 + 0.01)
          g.gain.linearRampToValueAtTime(0, t + i * 0.05 + 0.035)
          osc.connect(g).connect(this.cricketGain)
          osc.start(t + i * 0.05)
          osc.stop(t + i * 0.05 + 0.04)
        }
      }
      this.later(loop, 700 + Math.random() * 900)
    }
    loop()
  }

  // ——— Música generada ———

  /** Notas sueltas de piano suave sobre un acorde lento: nunca se repite igual. */
  private scheduleMusic() {
    let step = 0
    const chords = [
      [146.83, 220, 293.66],
      [123.47, 185, 246.94],
      [110, 164.81, 220],
      [130.81, 196, 261.63],
    ]
    const loop = () => {
      if (this.ctx && this.musicOn && !MUSIC_TRACKS.length) {
        if (step % 8 === 0) chords[(step / 8) % chords.length].forEach((f) => this.pad(f))
        if (Math.random() < 0.7) this.pluck(SCALE[Math.floor(Math.random() * SCALE.length)] * (this.mood.night > 0.5 ? 0.5 : 1))
      }
      step++
      this.later(loop, 900 + Math.random() * 500)
    }
    loop()
  }

  private pad(freq: number) {
    const ctx = this.ctx!
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.05, t + 2.5)
    g.gain.linearRampToValueAtTime(0, t + 9)
    osc.connect(g).connect(this.musicGain)
    osc.start(t)
    osc.stop(t + 9.5)
  }

  private pluck(freq: number) {
    const ctx = this.ctx!
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.09, t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2)
    osc.connect(g).connect(this.musicGain)
    osc.start(t)
    osc.stop(t + 2.3)
  }

  private playTrack(on: boolean, volume: number) {
    if (!this.trackEl) {
      this.trackEl = new Audio(MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)])
      this.trackEl.loop = true
    }
    this.trackEl.volume = volume * 0.6
    if (on) void this.trackEl.play()
    else this.trackEl.pause()
  }
}

export const audio = new Engine()
