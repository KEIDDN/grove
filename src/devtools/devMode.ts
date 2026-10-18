// Modo desarrollador: oculto para quien prueba la app. Se activa tocando 7 veces la versión en
// Ajustes (o con ?dev en la URL) y vive fuera de la partida, así que cargar un jardín demo o
// empezar de cero no lo apaga.

import { create } from 'zustand'
import type { Celebration } from '../game/celebrations'
import { initialSaved, useGrove, type Saved } from '../game/store'
import { buildDemo, type DemoId } from './demos'

const DEV_KEY = 'grove-dev'
const REAL_SAVE_KEY = 'grove-real-save'
const DEMO_KEY = 'grove-demo'

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Sin almacenamiento: el modo dev dura lo que la pestaña
  }
}

const fromUrl = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev')

export const useDev = create<{ on: boolean; demo: DemoId | null }>(() => ({
  on: fromUrl || read(DEV_KEY) === '1',
  demo: (read(DEMO_KEY) as DemoId | null) ?? null,
}))

export function setDevMode(on: boolean) {
  write(DEV_KEY, on ? '1' : null)
  useDev.setState({ on })
}

// ——— Jardines demo ———

/** Carga una etapa. La primera vez guarda aparte tu partida real. */
export function loadDemo(id: DemoId) {
  const g = useGrove.getState()
  if (!useDev.getState().demo) write(REAL_SAVE_KEY, JSON.stringify({ state: pick(g) }))
  write(DEMO_KEY, id)
  useDev.setState({ demo: id })
  useGrove.setState({ ...buildDemo(id), audio: g.audio, celebrations: [], coinsHeld: 0, toast: null, tab: 'garden', editMode: false, selectedId: null, placing: null })
}

/** Vuelve a tu partida real, tal como la dejaste. */
export function restoreRealGarden() {
  const raw = read(REAL_SAVE_KEY)
  write(DEMO_KEY, null)
  write(REAL_SAVE_KEY, null)
  useDev.setState({ demo: null })
  if (!raw) return
  const saved = (JSON.parse(raw) as { state: Saved }).state
  useGrove.setState({ ...saved, celebrations: [], coinsHeld: 0, toast: null, tab: 'garden', editMode: false, selectedId: null, placing: null })
}

/** Solo lo que se guarda de la partida (sin el estado de la interfaz). */
function pick(g: ReturnType<typeof useGrove.getState>): Saved {
  const keys = Object.keys(initialSaved()) as Array<keyof Saved>
  return JSON.parse(JSON.stringify(Object.fromEntries(keys.map((k) => [k, g[k]])))) as Saved
}

// ——— Atajos para preparar tomas ———

export function addCoins(n: number) {
  useGrove.setState((s) => ({ coins: s.coins + n }))
}

/** Suma días cuidándote, para ver la progresión sin esperar. */
export function addDays(n: number) {
  useGrove.setState((s) => ({ totalDays: s.totalDays + n }))
}

/** Hace como si hubieras estado fuera unas horas: al volver, alguien habrá pasado. */
export function simulateAway(hours: number) {
  useGrove.setState({ lastSeenAt: Date.now() - hours * 3_600_000 })
  useGrove.getState().welcomeBack()
}

let testId = 1_000_000

const SAMPLES: Record<'medium' | 'first' | 'big' | 'plant', Omit<Celebration, 'id'>> = {
  medium: {
    level: 'medium',
    icon: 'focus',
    eyebrow: 'Sesión completada',
    title: '25 minutos para ti',
    coins: 25,
    lines: [{ text: 'Has regado tus 2 semillas', kind: 'sapling' }, { text: 'Día cumplido · 3 de 4 esta semana' }],
    action: 'tend',
  },
  first: {
    level: 'medium',
    icon: 'roots',
    eyebrow: 'Tu primera página',
    title: 'Ha florecido algo',
    lines: [{ text: 'Una flor nueva en tu jardín', kind: 'flower', color: '#EBA3B8' }, { text: 'Día cumplido · 1 de 4 esta semana' }],
    first: true,
  },
  big: {
    level: 'big',
    icon: 'parcel',
    eyebrow: 'Has desbloqueado',
    title: '9 parcelas nuevas',
    detail: '30 días cuidándote. Tu jardín ya puede crecer.',
    action: 'expand',
  },
  plant: {
    level: 'big',
    icon: 'plant',
    eyebrow: 'Tu primera planta adulta',
    title: 'Pino',
    detail: 'Cada rato que te dedicas se nota aquí.',
  },
}

/** Lanza una celebración de muestra. Las monedas de muestra son de verdad (para ver el vuelo). */
export function testCelebration(kind: keyof typeof SAMPLES | 'small') {
  const g = useGrove.getState()
  if (kind === 'small') {
    useGrove.setState((s) => ({ coins: s.coins + 15, coinsHeld: s.coinsHeld + 15, toast: { id: ++testId, text: 'Concéntrate 25 minutos', icon: 'mission', coins: 15 } }))
    return
  }
  const c = { ...SAMPLES[kind], id: ++testId }
  if (kind === 'plant') {
    const tree = g.items.find((it) => it.kind === 'pine' || it.kind === 'tree')
    if (tree) c.focus = { kind: tree.kind, color: tree.color, x: tree.x, z: tree.z }
  }
  useGrove.setState((s) => ({ celebrations: [...s.celebrations, c], coins: s.coins + (c.coins ?? 0), coinsHeld: s.coinsHeld + (c.coins ?? 0), tab: 'garden' }))
}
