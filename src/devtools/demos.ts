// Jardines de demostración para grabar y enseñar la progresión. Solo se usan desde el modo
// desarrollador: tu partida real se guarda aparte y vuelve con "Volver a mi jardín".

import { cellKey, type FloorKind } from '../game/floors'
import { canPlace, FLOWER_COLORS, MAX_PLOTS, plotSlots, starterPlots, type GardenItem, type Growth, type ItemKind } from '../game/garden'
import { ACHIEVEMENTS, emptyDaily, emptyStats, type Stats } from '../game/goals'
import { emotionsFor, FACTORS, type Mood } from '../game/mood'
import { QUESTIONS, type QuestionGroup } from '../game/questions'
import { initialSaved, type RootEntry, type Saved } from '../game/store'
import { dayKey, weekdayIndex, weekKey } from '../game/time'
import { VISITORS } from '../game/visitors'
import { t } from '../i18n'

export type DemoId = 'day1' | 'week2' | 'month3' | 'year1'

export const DEMOS: Array<{ id: DemoId; label: string; detail: string }> = [
  { id: 'day1', label: 'Día 1', detail: 'Recién nacido' },
  { id: 'week2', label: 'Semana 2', detail: '16 parcelas' },
  { id: 'month3', label: 'Mes 3', detail: '25 parcelas' },
  { id: 'year1', label: 'Año 1', detail: 'Isla completa' },
]

/** [tipo, x, z, giro, color, crecimiento] en celdas de media casilla. */
type Spot = [ItemKind, number, number, number?, string?, Growth?]

const [PINK, LILAC, YELLOW, PEACH] = FLOWER_COLORS

const LAYOUTS: Record<DemoId, { side: number; items: Spot[]; floors: Array<[FloorKind, Array<[number, number]>]> }> = {
  day1: {
    side: 3,
    items: [
      ['tree', 2, 2],
      ['flower', 4, 1, 0, PINK, { by: 'focus', need: 15, progress: 4 }],
      ['rock', 0, 5, 1],
    ],
    floors: [],
  },
  week2: {
    side: 4,
    items: [
      ['tree', 3, 3],
      ['pine', 0, 0],
      ['birch', 6, 0],
      ['bush', 4, 1],
      ['berrybush', 2, 0],
      ['flower', 0, 6, 0, PINK],
      ['flower', 1, 7, 0, LILAC],
      ['flower', 0, 4, 0, YELLOW],
      ['flower', 6, 4, 0, PEACH],
      ['bench', 5, 6, 2],
      ['lantern', 7, 6],
      ['rock', 7, 3, 1],
      ['tulips', 1, 3, 0, undefined, { by: 'roots', need: 2, progress: 1 }],
    ],
    floors: [['path', [[3, 5], [3, 6], [3, 7]]]],
  },
  month3: {
    side: 5,
    items: [
      ['willow', 0, 0],
      ['cherry', 7, 0],
      ['tree', 4, 3],
      ['tallpine', 0, 7],
      ['roundtree', 8, 8],
      ['pond', 6, 5],
      ['reeds', 8, 5],
      ['reeds', 8, 6],
      ['bench', 4, 7],
      ['lantern', 3, 7],
      ['lantern', 6, 8],
      ['birdhouse', 9, 3],
      ['stump', 9, 6, 1],
      ['flower', 2, 4, 0, PINK],
      ['flower', 2, 5, 0, LILAC],
      ['flower', 1, 5, 0, YELLOW],
      ['flower', 3, 9, 0, PEACH],
      ['flower', 5, 0, 0, PINK],
      ['flower', 6, 1, 0, LILAC],
      ['tulips', 9, 2],
      ['fern', 0, 4],
      ['mushroom', 1, 9],
      ['rock', 9, 0, 2],
      ['pine', 1, 2, 0, undefined, { by: 'focus', need: 60, progress: 35 }],
    ],
    floors: [['path', [[5, 5], [5, 6], [5, 7], [5, 8], [5, 9]]]],
  },
  year1: {
    side: 7,
    items: [
      ['fountain', 6, 6],
      // Bosque al noroeste
      ['tallpine', 0, 0],
      ['pine', 2, 0],
      ['birch', 0, 2],
      ['fern', 4, 0],
      ['fern', 4, 2],
      ['mushroom', 2, 3],
      ['stump', 3, 4],
      ['log', 0, 4, 1],
      // Huerto de frutales al noreste
      ['cherry', 9, 0],
      ['cherry', 12, 0],
      ['roundtree', 10, 3],
      ['bench', 12, 3, 3],
      ['flower', 9, 3, 0, PINK],
      ['flower', 13, 4, 0, YELLOW],
      ['lantern', 13, 2],
      // El árbol de siempre y su banco
      ['tree', 2, 6],
      ['bench', 4, 6, 1],
      ['lantern', 4, 8],
      ['birdhouse', 5, 4],
      ['sign', 8, 4],
      // Estanque al suroeste
      ['pond', 1, 10],
      ['canoe', 3, 11, 1],
      ['reeds', 0, 10],
      ['reeds', 0, 12],
      ['reeds', 3, 10],
      ['willow', 1, 12],
      ['tulips', 4, 9],
      ['tulips', 0, 9],
      // Huerta y acampada al sureste
      ['wheat', 9, 9],
      ['wheat', 10, 9],
      ['wheat', 11, 9],
      ['carrots', 9, 10],
      ['carrots', 10, 10],
      ['corn', 11, 10],
      ['melon', 12, 9],
      ['fence', 13, 9, 1],
      ['fence', 13, 10, 1],
      ['fence', 13, 11, 1],
      ['tent', 10, 12],
      ['campfire', 12, 12],
      ['logpile', 13, 13],
      ['lantern', 9, 12],
      // Flores junto a los caminos
      ['flower', 5, 2, 0, LILAC],
      ['flower', 8, 2, 0, PEACH],
      ['flower', 5, 11, 0, PINK],
      ['flower', 8, 11, 0, YELLOW],
    ],
    floors: [
      ['path', [...range(0, 5).flatMap((z) => [[6, z], [7, z]] as Array<[number, number]>), ...range(9, 14).flatMap((z) => [[6, z], [7, z]] as Array<[number, number]>), ...range(9, 14).flatMap((x) => [[x, 6], [x, 7]] as Array<[number, number]>)]],
      ['gravel', [[5, 5], [5, 6], [5, 7], [5, 8], [8, 5], [8, 6], [8, 7], [8, 8], [6, 5], [7, 5], [6, 8], [7, 8]]],
      ['deck', [[3, 12], [4, 12], [3, 13]]],
    ],
  },
}

function range(a: number, b: number) {
  return Array.from({ length: b - a }, (_, i) => a + i)
}

const PROGRESS: Record<DemoId, { days: number; coins: number; entries: number; visitors: number; stats: Partial<Stats> }> = {
  day1: { days: 1, coins: 140, entries: 0, visitors: 1, stats: {} },
  week2: { days: 12, coins: 230, entries: 6, visitors: 3, stats: { sessions: 9, focusMinutes: 210, roots: 6, seedsPlanted: 6, plantsGrown: 5, decorPlaced: 4, weeksCompleted: 1 } },
  month3: { days: 75, coins: 410, entries: 38, visitors: 6, stats: { sessions: 58, focusMinutes: 1460, roots: 38, seedsPlanted: 20, plantsGrown: 18, decorPlaced: 9, weeksCompleted: 10 } },
  year1: { days: 290, coins: 860, entries: 180, visitors: 9, stats: { sessions: 230, focusMinutes: 6400, roots: 180, seedsPlanted: 60, plantsGrown: 58, decorPlaced: 30, weeksCompleted: 46 } },
}

const ANSWERS: Record<QuestionGroup, string[]> = {
  feel: ['Tranquilo, con algo de sueño', 'Bastante bien, la verdad', 'Un poco tenso por el trabajo', 'Ligero después de caminar', 'Cansado pero contento'],
  notice: ['El café de la mañana al sol', 'Una llamada larga con mi madre', 'Terminar el proyecto a tiempo', 'Cocinar algo nuevo', 'El paseo de vuelta a casa'],
  grow: ['Quiero dejar el móvil antes de dormir', 'Me cuesta decir que no, y está bien aprender', 'Ir más despacio también es avanzar', 'Agradecer más a menudo', 'Darme permiso para descansar'],
}

/** Ánimo creíble: casi siempre bien, con días regulares y alguno malo de vez en cuando. */
function demoMood(i: number): Mood {
  const wave = Math.sin(i * 0.7) + Math.sin(i * 0.23) * 0.8
  const level = Math.min(7, Math.max(1, Math.round(5 + wave * 1.2)))
  const emotions = emotionsFor(level)
  return { level, emotions: [emotions[i % emotions.length], emotions[(i * 3 + 1) % emotions.length]].filter((e, k, a) => a.indexOf(e) === k), factors: [FACTORS[i % FACTORS.length]] }
}

function sampleEntries(n: number): RootEntry[] {
  const groups: QuestionGroup[] = ['feel', 'notice', 'grow']
  return Array.from({ length: n }, (_, i) => {
    const date = new Date()
    // Unos días sí y otros no, como una persona real
    date.setDate(date.getDate() - 1 - Math.floor(i * 1.5))
    return {
      date: dayKey(date),
      // Las respuestas se escriben en el idioma de la app (las preguntas se traducen al mostrarlas)
      answers: groups.map((g, k) => ({ group: g, question: QUESTIONS[g][(i + k * 3) % QUESTIONS[g].length], text: t(ANSWERS[g][(i * 7 + k) % ANSWERS[g].length]) })),
      reflection: i % 4 === 0 ? t('Hoy ha sido un buen día para parar un poco.') : undefined,
      mood: demoMood(i),
    }
  })
}

/** Construye la partida completa de una etapa. */
export function buildDemo(id: DemoId): Saved {
  const layout = LAYOUTS[id]
  const p = PROGRESS[id]
  const plots = starterPlots(layout.side)
  const claimed = ACHIEVEMENTS.filter((a) => a.value({ ...emptyStats(), ...p.stats, visitors: p.visitors }) >= a.target)
  // Las parcelas de los logros ya recogidos también están puestas: la isla crece un poco por los bordes
  let extra = claimed.reduce((sum, a) => sum + (a.reward.parcels ?? 0), 0)
  const mid = (layout.side - 1) / 2
  while (extra-- > 0 && plots.length < MAX_PLOTS) {
    // Siempre la parcela libre más cercana al centro: la isla crece redondeada, no a trozos
    const [best] = plotSlots(plots).sort((a, b) => Math.hypot(a[0] - mid, a[1] - mid) - Math.hypot(b[0] - mid, b[1] - mid) || a[0] - b[0] || a[1] - b[1])
    plots.push(best)
  }
  const items: GardenItem[] = []
  for (const [kind, x, z, rot = 0, color, growth] of layout.items) {
    // Si algo del diseño se pisa, se salta: mejor un hueco que un objeto encima de otro
    if (!canPlace(items, plots, kind, x, z)) continue
    items.push({ id: `demo-${id}-${items.length}`, kind, x, z, rot, color, growth })
  }
  const floors: Record<string, FloorKind> = {}
  for (const [kind, cells] of layout.floors) for (const [x, z] of cells) floors[cellKey(x, z)] = kind
  const weekDays = Array.from({ length: 7 }, (_, i) => i < weekdayIndex() && i % 2 === 0)
  return {
    ...initialSaved(),
    coins: p.coins,
    items,
    plots,
    floors,
    totalDays: p.days,
    weekDays,
    weekOf: weekKey(),
    weekGoal: 4,
    entries: sampleEntries(p.entries),
    visitorsSeen: VISITORS.filter((v) => !v.event).slice(0, p.visitors).map((v) => v.id),
    stats: { ...emptyStats(), ...p.stats },
    daily: emptyDaily(dayKey()),
    gardenName: t('El jardín de {name}', { name: t('Lucía') }),
    userName: t('Lucía'),
    focusAreas: ['stress', 'rest'],
    onboarded: true,
    giftGiven: true,
    // Ya conocen las celebraciones de la primera vez
    firsts: id === 'day1' ? [] : ['session', 'root', 'read', 'plant', 'away'],
    // Lo conseguido ya está recogido, para que no haya avisos pendientes en las tomas
    achievementsClaimed: claimed.map((a) => a.id),
    audio: initialSaved().audio,
  }
}
