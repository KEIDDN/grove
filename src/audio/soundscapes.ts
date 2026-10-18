// Paisajes sonoros de Calma, generados con Web Audio (sin archivos ni licencias).
//
// Cuidado con la calidad: los ruidos se generan en estéreo con los dos canales distintos (suenan
// amplios, no "dentro de la cabeza"), se filtran para quitar el chiado agudo y el bucle se funde
// consigo mismo para que no haya clic al repetirse. Todo entra y sale con fundidos largos.

export type SoundscapeId = 'none' | 'nature' | 'rain' | 'pink' | 'brown' | 'white' | 'alpha' | 'theta' | 'delta'

export const SOUNDSCAPES: Array<{ id: SoundscapeId; name: string; group: 'Naturaleza' | 'Ruido' | 'Binaural'; hint: string }> = [
  { id: 'nature', name: 'Jardín', group: 'Naturaleza', hint: 'Pájaros, brisa y agua según la hora' },
  { id: 'rain', name: 'Lluvia', group: 'Naturaleza', hint: 'Lluvia suave sobre hojas' },
  { id: 'pink', name: 'Rosa', group: 'Ruido', hint: 'Equilibrado, como una cascada lejana' },
  { id: 'brown', name: 'Marrón', group: 'Ruido', hint: 'Grave y envolvente, como el mar de fondo' },
  { id: 'white', name: 'Blanco', group: 'Ruido', hint: 'Suavizado, para tapar ruidos' },
  { id: 'alpha', name: 'Alfa', group: 'Binaural', hint: '10 Hz · relajación despierta' },
  { id: 'theta', name: 'Theta', group: 'Binaural', hint: '6 Hz · meditación profunda' },
  { id: 'delta', name: 'Delta', group: 'Binaural', hint: '2,5 Hz · para dormir' },
]

const BINAURAL: Record<'alpha' | 'theta' | 'delta', { carrier: number; beat: number }> = {
  alpha: { carrier: 200, beat: 10 },
  theta: { carrier: 180, beat: 6 },
  delta: { carrier: 140, beat: 2.5 },
}

type NoiseColor = 'white' | 'pink' | 'brown'

/** Buffer de ruido estéreo que se repite sin costura. */
function noiseBuffer(ctx: AudioContext, color: NoiseColor, seconds = 20): AudioBuffer {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * seconds)
  const fade = Math.floor(rate * Math.min(1.5, seconds * 0.1))
  const buf = ctx.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const raw = new Float32Array(len + fade)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    let last = 0
    for (let i = 0; i < raw.length; i++) {
      const w = Math.random() * 2 - 1
      if (color === 'white') raw[i] = w * 0.5
      else if (color === 'pink') {
        // Filtro de Paul Kellet: ruido rosa fiel en todo el espectro
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852
        b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.016898
        raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
        b6 = w * 0.115926
      } else {
        // Marrón: paseo aleatorio con fuga, para que no se vaya de rango
        last = (last + 0.02 * w) / 1.02
        raw[i] = last * 3.2
      }
    }
    // El final se funde con el principio: el bucle no se nota
    const out = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) out[i] = raw[i]
    for (let i = 0; i < fade; i++) {
      const t = i / fade
      out[i] = raw[i] * t + raw[len + i] * (1 - t)
    }
  }
  return buf
}

/** Un paisaje sonoro en marcha: se apaga con `stop`. */
export interface Playing {
  stop: (fade?: number) => void
}

export function startSoundscape(ctx: AudioContext, out: AudioNode, id: SoundscapeId, cache: Map<string, AudioBuffer>): Playing | null {
  if (id === 'none' || id === 'nature') return null
  const t = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(1, t + 3)
  gain.connect(out)
  const nodes: AudioScheduledSourceNode[] = []
  const timers: number[] = []
  let stopped = false

  const noise = (color: NoiseColor) => {
    let buf = cache.get(color)
    if (!buf) {
      buf = noiseBuffer(ctx, color)
      cache.set(color, buf)
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    // Empieza en un punto distinto cada vez
    src.start(t, Math.random() * buf.duration)
    nodes.push(src)
    return src
  }
  const filter = (type: BiquadFilterType, freq: number, q = 0.7, dB = 0) => {
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    f.gain.value = dB
    return f
  }
  const level = (v: number) => {
    const g = ctx.createGain()
    g.gain.value = v
    return g
  }

  if (id === 'pink') {
    noise('pink').connect(filter('lowpass', 9000)).connect(level(0.55)).connect(gain)
  } else if (id === 'brown') {
    noise('brown').connect(filter('highpass', 28)).connect(filter('lowpass', 1100)).connect(level(0.7)).connect(gain)
  } else if (id === 'white') {
    // Blanco "suave": sin el siseo de arriba, que es lo que cansa
    noise('white').connect(filter('lowpass', 5200, 0.5)).connect(filter('highshelf', 2400, 0.7, -10)).connect(filter('lowshelf', 200, 0.7, 3)).connect(level(0.3)).connect(gain)
  } else if (id === 'rain') {
    // Lluvia: un siseo amplio, un fondo grave y gotas sueltas repartidas a izquierda y derecha
    const hiss = level(0.4)
    noise('pink').connect(filter('bandpass', 1400, 0.45)).connect(hiss).connect(gain)
    noise('brown').connect(filter('lowpass', 380)).connect(level(0.35)).connect(gain)
    // Rachas: el siseo sube y baja muy despacio
    const lfo = ctx.createOscillator()
    const depth = ctx.createGain()
    lfo.frequency.value = 0.07
    depth.gain.value = 0.12
    lfo.connect(depth).connect(hiss.gain)
    lfo.start(t)
    nodes.push(lfo)
    const drop = () => {
      if (stopped) return
      const now = ctx.currentTime
      const src = ctx.createBufferSource()
      // Buffer propio y corto para las gotas: no se mezcla con el del ruido blanco
      let dropBuf = cache.get('drop')
      if (!dropBuf) {
        dropBuf = noiseBuffer(ctx, 'white', 1)
        cache.set('drop', dropBuf)
      }
      src.buffer = dropBuf
      const bp = filter('bandpass', 1800 + Math.random() * 3600, 6)
      const g = ctx.createGain()
      const pan = ctx.createStereoPanner()
      pan.pan.value = Math.random() * 1.6 - 0.8
      const v = 0.05 + Math.random() * 0.12
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(v, now + 0.002)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05 + Math.random() * 0.06)
      src.connect(bp).connect(g).connect(pan).connect(gain)
      src.start(now, Math.random() * 0.5, 0.12)
      timers.push(window.setTimeout(drop, 25 + Math.random() * 110))
      if (timers.length > 50) timers.splice(0, 40)
    }
    drop()
  } else {
    // Binaural: un tono en cada oído; la diferencia entre ambos es el pulso que se percibe.
    // Solo los dos tonos, muy suaves, sin ningún ruido debajo.
    const { carrier, beat } = BINAURAL[id]
    const merger = ctx.createChannelMerger(2)
    ;[carrier, carrier + beat].forEach((f, ch) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = f
      const g = level(0.16)
      osc.connect(g).connect(merger, 0, ch)
      osc.start(t)
      nodes.push(osc)
    })
    merger.connect(gain)
  }

  return {
    stop: (fade = 1.6) => {
      stopped = true
      const now = ctx.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + fade)
      timers.forEach((id) => clearTimeout(id))
      timers.length = 0
      const stopAt = now + fade + 0.1
      nodes.forEach((n) => n.stop(stopAt))
      window.setTimeout(() => gain.disconnect(), (fade + 0.3) * 1000)
    },
  }
}
