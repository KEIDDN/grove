import { create } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import { calmRewardFor, type BreathPatternId, type CalmKind, type CalmSession } from './calm'
import { CATALOG, KIND_NAMES } from './catalog'
import type { Celebration, CelebrationIcon, CelebrationLine, FirstKey } from './celebrations'
import { ECONOMY, legacySide, parcelsFromDays, STARTING_PARCELS } from './config'
import { cellKey, type FloorKind } from './floors'
import type { IslandStyleId } from './island'
import {
  autoPlace,
  canPlace,
  cellOwned,
  footprint,
  occupied,
  FLOWER_COLORS,
  MAX_PLOTS,
  newId,
  plotKey,
  plotSet,
  plotSlots,
  STARTER_GARDEN,
  starterPlots,
  type GardenItem,
  type Growth,
  type InventoryItem,
  type ItemKind,
  type Plot,
} from './garden'
import { ACHIEVEMENTS, emptyDaily, emptyStats, missionsFor, type DailyStats, type Reward, type Stats } from './goals'
import type { QuestionGroup } from './questions'
import { SEASON_ORDER, seasonForDate, type Season } from './seasons'
import { rewardFor, type FocusSession } from './session'
import { visitWhileAway } from './visitors'
import { dayKey, TIME_SCALE, weekdayIndex, weekKey } from './time'

export type Tab = 'garden' | 'tend' | 'roots' | 'calm' | 'nursery' | 'inventory' | 'you'
export type YouSection = 'today' | 'achievements' | 'album' | 'progress' | 'settings'

export interface RootAnswer {
  question: string
  group?: QuestionGroup
  text: string
}

/** Una página del diario: las tres preguntas del día y, si quieres, una reflexión libre. */
export interface RootEntry {
  date: string
  answers: RootAnswer[]
  reflection?: string
}

export interface AudioSettings {
  music: boolean
  ambient: boolean
  musicVolume: number
  ambientVolume: number
  /** Efectos: celebraciones y monedas. */
  sfx: boolean
  sfxVolume: number
}

/** Qué se está colocando: algo del inventario o un objeto que ya estaba en el jardín. */
export type Placing =
  | { from: 'inventory'; invId: string; kind: ItemKind; color?: string; growth?: Growth }
  | { from: 'garden'; itemId: string; kind: ItemKind }

export interface Saved {
  /** Estilo de la roca bajo la isla. */
  islandStyle: IslandStyleId
  coins: number
  coinsToday: number
  coinsDate: string
  items: GardenItem[]
  inventory: InventoryItem[]
  plots: Plot[]
  totalDays: number
  lastActiveDate: string | null
  weekGoal: number
  weekOf: string
  /** Días cumplidos esta semana, de lunes (0) a domingo (6). */
  weekDays: boolean[]
  weekGoalMetOf: string | null
  entries: RootEntry[]
  /** Suelo pintado por celda ("x,z"); lo que no aparece es césped. */
  floors: Record<string, FloorKind>
  visitorsSeen: string[]
  session: FocusSession | null
  seasonOverride: Season | null
  stats: Stats
  daily: DailyStats
  missionsClaimed: string[]
  achievementsClaimed: string[]
  audio: AudioSettings
  gardenName: string
  userName: string
  /** Lo que la persona quiere cuidar (onboarding); servirá para personalizar Raíces. */
  focusAreas: string[]
  onboarded: boolean
  /** La semilla de regalo del onboarding solo se da una vez. */
  giftGiven: boolean
  articlesRead: string[]
  /** Última vez que la app estuvo abierta (ms), para saber quién vino mientras no estabas. */
  lastSeenAt: number
  /** Momentos que ya se han celebrado a lo grande la primera vez. */
  firsts: FirstKey[]
  /** Quién vino la última vez que estuviste fuera: siguen por el jardín hasta el día siguiente. */
  recentVisitors: { ids: string[]; day: string }
  calm: CalmSession | null
  /** Lo último que elegiste en Calma, para que la próxima vez esté igual. */
  calmPrefs: { sound: string; guide: boolean; pattern: BreathPatternId; breathMinutes: number; meditateMinutes: number; volume: number }
}

export interface ToastData {
  id: number
  text: string
  icon?: CelebrationIcon
  coins?: number
}

interface GroveState extends Saved {
  tab: Tab
  youSection: YouSection
  restMode: boolean
  toast: ToastData | null
  /** Celebraciones medianas y grandes en cola: se enseñan de una en una. */
  celebrations: Celebration[]
  /** Monedas ya ganadas que aún van volando hacia el contador (el contador las resta). */
  coinsHeld: number
  editMode: boolean
  selectedId: string | null
  /** Objeto que se ha tocado fuera del modo edición para ver qué es y cuánto le falta. */
  inspectId: string | null
  placing: Placing | null
  hoverCell: [number, number] | null
  editTool: 'select' | 'paint' | 'expand'
  paintFloor: FloorKind
  /** Hora fijada a mano para probar el ciclo día/noche (null = hora real). */
  hourOverride: number | null
  /** Pantalla de inicio visible (cada vez que se abre la app). */
  splash: boolean

  setTab: (tab: Tab) => void
  openYou: (section: YouSection) => void
  cycleSeason: () => void
  showToast: (text: string) => void
  setRestMode: (on: boolean) => void
  setHourOverride: (hour: number | null) => void

  startSession: (targetMinutes: number | null) => void
  cancelSession: () => void
  completeSession: () => void
  dismissCelebration: () => void
  releaseCoins: (n: number) => void
  /** Al volver a la app: apunta la hora y, si has estado fuera, quién ha venido. */
  welcomeBack: () => void
  markSeen: () => void

  startCalm: (kind: CalmKind, minutes: number, pattern?: BreathPatternId) => void
  /** Termina la calma. `early`: antes de tiempo, cuenta lo que llevabas. */
  completeCalm: (early?: boolean) => void
  cancelCalm: () => void
  setCalmPrefs: (patch: Partial<Saved['calmPrefs']>) => void

  saveRoot: (answers: RootAnswer[], reflection: string) => void
  buy: (catalogId: string) => void

  setEditMode: (on: boolean) => void
  select: (id: string | null) => void
  inspect: (id: string | null) => void
  rotateSelected: () => void
  storeSelected: () => void
  startMove: () => void
  startPlacing: (invId: string) => void
  setHoverCell: (cell: [number, number] | null) => void
  placeAt: (x: number, z: number) => void
  cancelPlacing: () => void
  recolorSelected: (variantId: string) => void
  setEditTool: (tool: 'select' | 'paint' | 'expand') => void
  setPaintFloor: (floor: FloorKind) => void
  setIslandStyle: (style: IslandStyleId) => void
  paintCell: (x: number, z: number) => void
  addPlot: (tx: number, tz: number) => void

  claimMission: (id: string) => void
  claimAchievement: (id: string) => void

  setAudio: (patch: Partial<AudioSettings>) => void
  setWeekGoal: (goal: number) => void
  setGardenName: (name: string) => void
  resetAll: () => void
  dismissSplash: () => void
  completeOnboarding: (data: { userName: string; gardenName: string; focusAreas: string[]; weekGoal: number; firstSeed: string }) => void
  replayOnboarding: () => void
  markArticleRead: (id: string) => void
}

/** Parcelas que puedes tener en total según tus días y logros. */
export function parcelsAllowed(s: Pick<Saved, 'totalDays' | 'achievementsClaimed'>): number {
  const fromAchievements = ACHIEVEMENTS.filter((a) => s.achievementsClaimed.includes(a.id)).reduce((n, a) => n + (a.reward.parcels ?? 0), 0)
  return Math.min(MAX_PLOTS, STARTING_PARCELS + parcelsFromDays(s.totalDays) + fromAchievements)
}

/** Pone al día los contadores que dependen de la fecha (semana nueva, día nuevo). */
function rollover(s: Saved, now = new Date()): Partial<Saved> {
  const patch: Partial<Saved> = {}
  if (s.weekOf !== weekKey(now)) {
    patch.weekOf = weekKey(now)
    patch.weekDays = [false, false, false, false, false, false, false]
  }
  if (s.coinsDate !== dayKey(now)) {
    patch.coinsDate = dayKey(now)
    patch.coinsToday = 0
  }
  if (s.daily.day !== dayKey(now)) {
    patch.daily = emptyDaily(dayKey(now))
    patch.missionsClaimed = []
  }
  return patch
}

/** Marca hoy como día cumplido (una vez al día) y cuenta la semana si se alcanza el objetivo. */
function completeDay(s: Saved, now = new Date()): Partial<Saved> {
  const today = dayKey(now)
  if (s.lastActiveDate === today) return {}
  const weekDays = [...s.weekDays]
  weekDays[weekdayIndex(now)] = true
  const patch: Partial<Saved> = { lastActiveDate: today, totalDays: s.totalDays + 1, weekDays }
  if (weekDays.filter(Boolean).length >= s.weekGoal && s.weekGoalMetOf !== s.weekOf) {
    patch.weekGoalMetOf = s.weekOf
    patch.stats = { ...s.stats, weeksCompleted: s.stats.weeksCompleted + 1 }
  }
  return patch
}

/** Riega las semillas de un tipo; devuelve los objetos y cuántas han terminado de crecer. */
function water(items: GardenItem[], by: Growth['by'], amount: number): { items: GardenItem[]; grown: GardenItem[] } {
  const grown: GardenItem[] = []
  const next = items.map((it) => {
    if (!it.growth || it.growth.by !== by) return it
    const progress = it.growth.progress + amount
    if (progress >= it.growth.need) {
      const done = { ...it, growth: undefined }
      grown.push(done)
      return done
    }
    return { ...it, growth: { ...it.growth, progress } }
  })
  return { items: next, grown }
}

export const initialSaved = (): Saved => ({
  islandStyle: 'rock',
  coins: ECONOMY.startingCoins,
  coinsToday: 0,
  coinsDate: dayKey(),
  items: STARTER_GARDEN,
  inventory: [],
  plots: starterPlots(3),
  totalDays: 6,
  lastActiveDate: null,
  weekGoal: 3,
  weekOf: weekKey(),
  weekDays: [false, true, false, true, false, false, false].map((d, i) => d && i < weekdayIndex()),
  weekGoalMetOf: null,
  entries: [],
  floors: {},
  visitorsSeen: ['robin'],
  session: null,
  seasonOverride: null,
  stats: emptyStats(),
  daily: emptyDaily(dayKey()),
  missionsClaimed: [],
  achievementsClaimed: [],
  audio: { music: true, ambient: true, musicVolume: 0.5, ambientVolume: 0.6, sfx: true, sfxVolume: 0.7 },
  gardenName: 'Tu jardín',
  userName: '',
  focusAreas: [],
  onboarded: false,
  giftGiven: false,
  articlesRead: [],
  lastSeenAt: Date.now(),
  firsts: [],
  recentVisitors: { ids: [], day: '' },
  calm: null,
  calmPrefs: { sound: 'nature', guide: true, pattern: 'box', breathMinutes: 2, meditateMinutes: 5, volume: 0.8 },
})

let toastId = 0
let celebrationId = 0

/** El agua no lleva suelo debajo: al colocar un estanque se limpia lo pintado en su sitio. */
function clearFloors(floors: Record<string, FloorKind>, x: number, z: number, size: number) {
  const next = { ...floors }
  for (let a = 0; a < size; a++) for (let b = 0; b < size; b++) delete next[cellKey(x + a, z + b)]
  return next
}

/**
 * Guardado diferido: zustand persiste en cada cambio, y al pintar o arrastrar eso son decenas de
 * escrituras síncronas por segundo de toda la partida. Aquí se agrupan y se escriben como mucho
 * cada medio segundo, y siempre al salir de la app.
 */
function deferredStorage<T>(): PersistStorage<T> {
  const pending = new Map<string, StorageValue<T>>()
  let timer: ReturnType<typeof setTimeout> | null = null
  const flush = () => {
    if (timer) clearTimeout(timer)
    timer = null
    for (const [name, value] of pending) {
      try {
        localStorage.setItem(name, JSON.stringify(value))
      } catch {
        // Sin espacio o en modo privado: la partida sigue en memoria
      }
    }
    pending.clear()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush())
  }
  return {
    getItem: (name) => {
      const raw = localStorage.getItem(name)
      return raw ? (JSON.parse(raw) as StorageValue<T>) : null
    },
    setItem: (name, value) => {
      pending.set(name, value)
      if (!timer) timer = setTimeout(flush, 500)
    },
    removeItem: (name) => {
      pending.delete(name)
      localStorage.removeItem(name)
    },
  }
}

export const useGrove = create<GroveState>()(
  persist(
    (set, get) => {
      const toast = (text: string) => set({ toast: { id: ++toastId, text } })
      /** Celebración pequeña: el aviso de arriba con icono y, si hay, monedas que vuelan. */
      const notify = (text: string, icon: CelebrationIcon, coins = 0) =>
        set((s) => ({ toast: { id: ++toastId, text, icon, coins: coins || undefined }, coinsHeld: s.coinsHeld + coins }))
      const celebrate = (c: Omit<Celebration, 'id'>) =>
        set((s) => ({ celebrations: [...s.celebrations, { ...c, id: ++celebrationId }], coinsHeld: s.coinsHeld + (c.coins ?? 0) }))
      /** Lo grande va detrás de lo que lo ha provocado (la sesión, la página…), en la misma cola. */
      const celebrateAfter = (c: Omit<Celebration, 'id'>) => queueMicrotask(() => celebrate(c))
      /** true la primera vez que pasa algo; desde entonces queda apuntado. */
      const firstTime = (key: FirstKey) => {
        if (get().firsts.includes(key)) return false
        set({ firsts: [...get().firsts, key] })
        return true
      }
      const fresh = () => ({ ...get(), ...rollover(get()) })

      /** Aplica un día cumplido y celebra si hay parcelas nuevas por días. */
      const withDay = (s: Saved): Partial<Saved> => {
        const patch = completeDay(s)
        if (patch.totalDays !== undefined && parcelsFromDays(patch.totalDays) > parcelsFromDays(s.totalDays)) {
          const n = parcelsFromDays(patch.totalDays) - parcelsFromDays(s.totalDays)
          const days = patch.totalDays
          celebrateAfter({
            level: 'big',
            icon: 'parcel',
            eyebrow: 'Has desbloqueado',
            title: `${n} parcelas nuevas`,
            detail: `${days} días cuidándote. Tu jardín ya puede crecer.`,
            action: 'expand',
          })
        }
        return patch
      }

      /** Línea de "día cumplido" para la tarjeta, si este gesto ha completado el día. */
      const dayLine = (s: Saved, day: Partial<Saved>): CelebrationLine[] => {
        if (!day.weekDays) return []
        const done = day.weekDays.filter(Boolean).length
        return [{ text: done >= s.weekGoal ? `Semana cumplida · ${done} de ${s.weekGoal} días` : `Día cumplido · ${done} de ${s.weekGoal} esta semana` }]
      }

      const grownLines = (grown: GardenItem[]): CelebrationLine[] =>
        grown.map((g) => ({ text: `${KIND_NAMES[g.kind] ?? 'Tu planta'} · planta adulta`, kind: g.kind, color: g.color }))

      /** La primera planta adulta se celebra a pantalla completa; las siguientes van en la tarjeta. */
      const announceGrown = (grown: GardenItem[]) => {
        if (!grown.length || !firstTime('plant')) return
        const g = grown[0]
        celebrateAfter({
          level: 'big',
          icon: 'plant',
          eyebrow: 'Tu primera planta adulta',
          title: KIND_NAMES[g.kind] ?? 'Tu planta',
          detail: 'Cada rato que te dedicas se nota aquí.',
          focus: { kind: g.kind, color: g.color, x: g.x, z: g.z },
        })
      }

      const applyReward = (s: Saved, r: Reward): Partial<Saved> => ({ coins: s.coins + (r.coins ?? 0) })

      const elapsedMinutes = (session: FocusSession) => ((Date.now() - session.startedAt) / 60000) * TIME_SCALE

      return {
        ...initialSaved(),

        tab: 'garden',
        youSection: 'today',
        restMode: false,
        toast: null,
        celebrations: [],
        coinsHeld: 0,
        editMode: false,
        selectedId: null,
        inspectId: null,
        placing: null,
        hoverCell: null,
        editTool: 'select',
        paintFloor: 'path',
        splash: true,
        hourOverride:
          typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('hour')
            ? Number(new URLSearchParams(window.location.search).get('hour'))
            : null,

        setTab: (tab) => set({ tab, inspectId: null }),
        openYou: (youSection) => set({ tab: 'you', youSection }),
        cycleSeason: () => {
          const current = get().seasonOverride ?? seasonForDate()
          set({ seasonOverride: SEASON_ORDER[(SEASON_ORDER.indexOf(current) + 1) % 4] })
        },
        showToast: toast,
        setRestMode: (restMode) => set({ restMode }),
        setHourOverride: (hourOverride) => set({ hourOverride }),

        startSession: (targetMinutes) => set({ session: { startedAt: Date.now(), targetMinutes } }),
        cancelSession: () => {
          const s = fresh()
          if (!s.session) return
          // Abandonar no da monedas ni riega, pero 10 minutos o más sí cuentan como día cumplido.
          const counts = elapsedMinutes(s.session) >= ECONOMY.minMinutesForCoins
          set({ ...rollover(get()), ...(counts ? withDay(s) : {}), session: null, restMode: false })
          toast(counts ? 'Sesión abandonada. Tu tiempo cuenta para hoy.' : 'Sesión abandonada. No pasa nada, vuelve cuando quieras.')
        },
        completeSession: () => {
          const s = fresh()
          if (!s.session) return
          const minutes = Math.floor(s.session.targetMinutes ?? elapsedMinutes(s.session))
          const reward = rewardFor(minutes, s.coinsToday)
          const seeds = s.items.filter((it) => it.growth?.by === 'focus')
          const watered = water(s.items, 'focus', minutes)
          const day = reward.grew ? withDay(s) : {}
          const stats = day.stats ?? s.stats
          const first = reward.grew && firstTime('session')
          set({
            ...rollover(get()),
            ...day,
            session: null,
            coins: s.coins + reward.coins,
            coinsToday: s.coinsToday + reward.coins,
            items: watered.items,
            stats: { ...stats, sessions: stats.sessions + 1, focusMinutes: stats.focusMinutes + minutes, plantsGrown: stats.plantsGrown + watered.grown.length },
            daily: { ...s.daily, sessions: s.daily.sessions + 1, focusMinutes: s.daily.focusMinutes + minutes },
            restMode: false,
            // Se cierra el panel para que se vea lo que ha pasado en el jardín
            tab: 'garden',
          })
          const growing = seeds.length - watered.grown.length
          const lines: CelebrationLine[] = [
            ...grownLines(watered.grown),
            ...(growing > 0 && reward.grew ? [{ text: growing === 1 ? 'Has regado tu semilla' : `Has regado tus ${growing} semillas`, kind: 'sapling' as ItemKind }] : []),
            ...dayLine(s, day),
            ...(!reward.grew ? [{ text: `Las sesiones de menos de ${ECONOMY.minMinutesForCoins} minutos cuentan para ti, pero no dan monedas.` }] : []),
            ...(reward.capped ? [{ text: 'Has llegado al tope de monedas de hoy. Tu tiempo sigue contando.' }] : []),
          ]
          const look = watered.grown[0] ?? watered.items.find((it) => it.growth?.by === 'focus')
          celebrate({
            level: 'medium',
            icon: 'focus',
            eyebrow: first ? 'Tu primera sesión' : 'Sesión completada',
            title: `${minutes} minuto${minutes === 1 ? '' : 's'} para ti`,
            coins: reward.coins,
            lines,
            first,
            focus: look ? { kind: look.kind, color: look.color, x: look.x, z: look.z } : undefined,
            action: 'tend',
          })
          announceGrown(watered.grown)
        },
        startCalm: (kind, minutes, pattern) => set({ calm: { kind, minutes, pattern, startedAt: Date.now() } }),
        cancelCalm: () => set({ calm: null }),
        setCalmPrefs: (patch) => set({ calmPrefs: { ...get().calmPrefs, ...patch } }),
        completeCalm: (early = false) => {
          const s = fresh()
          if (!s.calm) return
          const elapsed = ((Date.now() - s.calm.startedAt) / 60000) * TIME_SCALE
          const minutes = early ? Math.floor(elapsed) : s.calm.minutes
          // Menos de un minuto no cuenta: se cierra sin más
          if (minutes < 1) return set({ calm: null })
          const reward = calmRewardFor(minutes, s.coinsToday)
          const seeds = s.items.filter((it) => it.growth?.by === 'focus')
          const watered = water(s.items, 'focus', minutes)
          const day = withDay(s)
          const stats = day.stats ?? s.stats
          const first = firstTime('calm')
          const breath = s.calm.kind === 'breath'
          set({
            ...rollover(get()),
            ...day,
            calm: null,
            coins: s.coins + reward.coins,
            coinsToday: s.coinsToday + reward.coins,
            items: watered.items,
            stats: { ...stats, calmMinutes: (stats.calmMinutes ?? 0) + minutes, plantsGrown: stats.plantsGrown + watered.grown.length },
            daily: { ...s.daily, calmMinutes: (s.daily.calmMinutes ?? 0) + minutes },
            tab: 'garden',
          })
          const growing = seeds.length - watered.grown.length
          const look = watered.grown[0] ?? watered.items.find((it) => it.growth?.by === 'focus')
          celebrate({
            level: 'medium',
            icon: 'calm',
            eyebrow: first ? 'Tu primer rato de calma' : breath ? 'Respiración completada' : 'Meditación completada',
            title: `${minutes} minuto${minutes === 1 ? '' : 's'} de calma`,
            coins: reward.coins,
            lines: [
              ...grownLines(watered.grown),
              ...(growing > 0 ? [{ text: growing === 1 ? 'Tu calma ha regado tu semilla' : `Tu calma ha regado tus ${growing} semillas`, kind: 'sapling' as ItemKind }] : []),
              ...dayLine(s, day),
              ...(reward.capped ? [{ text: 'Has llegado al tope de monedas de hoy. Tu tiempo sigue contando.' }] : []),
            ],
            first,
            focus: look ? { kind: look.kind, color: look.color, x: look.x, z: look.z } : undefined,
            action: 'calm',
          })
          announceGrown(watered.grown)
        },
        dismissCelebration: () => set((s) => ({ celebrations: s.celebrations.slice(1) })),
        releaseCoins: (n) => set((s) => ({ coinsHeld: Math.max(0, s.coinsHeld - n) })),
        markSeen: () => set({ lastSeenAt: Date.now() }),
        welcomeBack: () => {
          const s = fresh()
          const hours = ((Date.now() - s.lastSeenAt) / 3_600_000) * TIME_SCALE
          set({ lastSeenAt: Date.now() })
          if (!s.onboarded) return
          const visit = visitWhileAway(new Set(s.items.map((it) => it.kind)), s.seasonOverride ?? seasonForDate(), hours, s.visitorsSeen, s.lastSeenAt)
          if (!visit) return
          const first = firstTime('away')
          set({ coins: s.coins + visit.coins, visitorsSeen: [...s.visitorsSeen, ...visit.fresh], recentVisitors: { ids: visit.visitors.map((v) => v.id), day: dayKey() } })
          const n = visit.visitors.length
          celebrate({
            level: 'medium',
            icon: 'visitor',
            eyebrow: 'Mientras no estabas',
            title: n === 1 ? `${visit.visitors[0].name} ha pasado a verte` : `${n} visitantes han pasado a verte`,
            detail: first ? 'Lo que pones en tu jardín atrae a visitantes. Te dejan un detalle al irse.' : undefined,
            coins: visit.coins,
            lines: visit.visitors.map((v) => ({ text: visit.fresh.includes(v.id) ? `${v.name} · nuevo en tu álbum` : v.name, visitor: v.type })),
            first,
            action: visit.fresh.length ? 'album' : undefined,
          })
        },

        saveRoot: (answers, reflection) => {
          const s = fresh()
          const today = dayKey()
          const clean = answers.map((a) => ({ ...a, text: a.text.trim() })).filter((a) => a.text)
          if (!clean.length && !reflection.trim()) return
          const entry: RootEntry = { date: today, answers: clean, reflection: reflection.trim() || undefined }
          // Editar la página de hoy no vuelve a dar recompensas
          if (s.entries.some((e) => e.date === today)) {
            set({ entries: s.entries.map((e) => (e.date === today ? entry : e)) })
            toast('Página de hoy actualizada')
            return
          }
          const day = withDay(s)
          const stats = day.stats ?? s.stats
          const watered = water(s.items, 'roots', 1)
          // Escribir hace brotar una flor silvestre; si no cabe, va al inventario
          const color = FLOWER_COLORS[s.entries.length % FLOWER_COLORS.length]
          const withFlower = autoPlace(watered.items, s.plots, 'flower', color)
          const flower = withFlower?.find((it) => !watered.items.includes(it))
          const first = firstTime('root')
          set({
            ...rollover(get()),
            ...day,
            items: withFlower ?? watered.items,
            inventory: withFlower ? s.inventory : [...s.inventory, { id: newId('flower'), kind: 'flower', color }],
            entries: [entry, ...s.entries],
            stats: { ...stats, roots: stats.roots + 1, plantsGrown: stats.plantsGrown + watered.grown.length },
            daily: { ...s.daily, roots: s.daily.roots + 1 },
            tab: 'garden',
          })
          celebrate({
            level: 'medium',
            icon: 'roots',
            eyebrow: first ? 'Tu primera página' : 'Página guardada',
            title: 'Ha florecido algo',
            lines: [
              { text: flower ? 'Una flor nueva en tu jardín' : 'Una flor nueva, guardada en tus objetos', kind: 'flower', color },
              ...grownLines(watered.grown),
              ...dayLine(s, day),
            ],
            first,
            focus: flower ? { kind: 'flower', color, x: flower.x, z: flower.z } : undefined,
          })
          announceGrown(watered.grown)
        },

        buy: (catalogId) => {
          const s = get()
          const entry = CATALOG.find((c) => c.id === catalogId)
          if (!entry) return
          if (s.coins < entry.price) return toast(`Te faltan ${entry.price - s.coins} monedas. Cultivar te da más.`)
          const growth = entry.seed ? { ...entry.seed, progress: 0 } : undefined
          const inv: InventoryItem = { id: newId(entry.kind), kind: entry.kind, color: entry.color, growth }
          set({
            coins: s.coins - entry.price,
            inventory: [...s.inventory, inv],
            tab: 'garden',
            editMode: true,
            editTool: 'select',
            selectedId: null,
            placing: { from: 'inventory', invId: inv.id, kind: inv.kind, color: inv.color, growth },
          })
          toast(entry.seed ? `Semilla de ${entry.name.toLowerCase()}: toca dónde plantarla` : `${entry.name}: toca dónde colocarlo`)
        },

        setEditMode: (on) => set({ inspectId: null, editMode: on, selectedId: null, placing: null, hoverCell: null, editTool: 'select', tab: 'garden' }),
        select: (id) => set(id ? { selectedId: id, placing: null, tab: 'garden' } : { selectedId: null, placing: null }),
        inspect: (inspectId) => set({ inspectId }),
        rotateSelected: () => {
          const { selectedId, items } = get()
          set({ items: items.map((it) => (it.id === selectedId ? { ...it, rot: (it.rot + 1) % 4 } : it)) })
        },
        storeSelected: () => {
          const { selectedId, items, inventory } = get()
          const it = items.find((i) => i.id === selectedId)
          if (!it) return
          set({
            items: items.filter((i) => i.id !== it.id),
            inventory: [...inventory, { id: it.id, kind: it.kind, color: it.color, growth: it.growth }],
            selectedId: null,
          })
          toast('Guardado en tus objetos')
        },
        startMove: () => {
          const it = get().items.find((i) => i.id === get().selectedId)
          if (it) set({ placing: { from: 'garden', itemId: it.id, kind: it.kind } })
        },
        startPlacing: (invId) => {
          const inv = get().inventory.find((i) => i.id === invId)
          if (inv) set({ tab: 'garden', editMode: true, editTool: 'select', selectedId: null, placing: { from: 'inventory', invId, kind: inv.kind, color: inv.color, growth: inv.growth } })
        },
        setHoverCell: (hoverCell) => set({ hoverCell }),
        placeAt: (x, z) => {
          const s = fresh()
          const p = s.placing
          if (!p) return
          const ignore = p.from === 'garden' ? p.itemId : undefined
          if (!canPlace(s.items, s.plots, p.kind, x, z, ignore)) return toast('Ahí no cabe')
          if (p.from === 'garden') {
            set({
              items: s.items.map((it) => (it.id === p.itemId ? { ...it, x, z } : it)),
              floors: p.kind === 'pond' ? clearFloors(s.floors, x, z, footprint(p.kind)) : s.floors,
              placing: null,
              selectedId: p.itemId,
              hoverCell: null,
            })
            return
          }
          const isSeed = !!p.growth && p.growth.progress === 0
          set({
            ...rollover(get()),
            items: [...s.items, { id: p.invId, kind: p.kind, color: p.color, x, z, rot: 0, growth: p.growth }],
            floors: p.kind === 'pond' ? clearFloors(s.floors, x, z, footprint(p.kind)) : s.floors,
            inventory: s.inventory.filter((i) => i.id !== p.invId),
            placing: null,
            selectedId: p.invId,
            hoverCell: null,
            stats: isSeed ? { ...s.stats, seedsPlanted: s.stats.seedsPlanted + 1 } : p.growth ? s.stats : { ...s.stats, decorPlaced: s.stats.decorPlaced + 1 },
            daily: isSeed ? { ...s.daily, planted: s.daily.planted + 1 } : { ...s.daily, placed: s.daily.placed + 1 },
          })
          if (isSeed) notify(p.growth!.by === 'focus' ? `Plantada. Crecerá con ${p.growth!.need} min de Cultivar` : `Plantada. Crecerá con ${p.growth!.need} días en Raíces`, 'plant')
        },
        cancelPlacing: () => set({ placing: null, hoverCell: null }),
        recolorSelected: (variantId) => {
          const s = fresh()
          set({
            ...rollover(get()),
            items: s.items.map((it) => (it.id === s.selectedId ? { ...it, color: variantId } : it)),
            daily: { ...s.daily, recolored: s.daily.recolored + 1 },
          })
        },
        // Cada herramienta es un modo exclusivo: cierra el Inventario o el Vivero que hubiera abierto
        setEditTool: (editTool) => set({ editTool, tab: 'garden', selectedId: null, placing: null, hoverCell: null }),
        setPaintFloor: (paintFloor) => set({ paintFloor }),
        setIslandStyle: (islandStyle) => set({ islandStyle }),
        paintCell: (x, z) => {
          const s = get()
          if (!cellOwned(plotSet(s.plots), x, z)) return
          // Bajo un objeto no se pinta: hay que moverlo antes
          if (occupied(s.items).has(`${x},${z}`)) return
          const key = cellKey(x, z)
          if ((s.floors[key] ?? 'grass') === s.paintFloor) return
          const next = { ...s.floors }
          if (s.paintFloor === 'grass') delete next[key]
          else next[key] = s.paintFloor
          const d = s.daily.day === dayKey() ? s.daily : emptyDaily(dayKey())
          set({ floors: next, daily: { ...d, painted: d.painted + (s.paintFloor === 'grass' ? 0 : 1) } })
        },
        addPlot: (tx, tz) => {
          const s = get()
          if (s.plots.length >= parcelsAllowed(s)) return toast('No te quedan parcelas. Se ganan con días y logros.')
          const isSlot = plotSlots(s.plots).some(([x, z]) => x === tx && z === tz)
          if (!isSlot || plotSet(s.plots).has(plotKey(tx, tz))) return
          const plots: Plot[] = [...s.plots, [tx, tz]]
          set({ plots })
        },

        claimMission: (id) => {
          const s = fresh()
          const m = missionsFor(s.daily.day).find((x) => x.id === id)
          if (!m || s.missionsClaimed.includes(id) || m.value(s.daily) < m.target) return
          set({ ...rollover(get()), ...applyReward(s, m.reward), missionsClaimed: [...s.missionsClaimed, id] })
          notify(m.title, 'mission', m.reward.coins ?? 0)
        },
        claimAchievement: (id) => {
          const s = fresh()
          const a = ACHIEVEMENTS.find((x) => x.id === id)
          const stats = { ...s.stats, visitors: s.visitorsSeen.length }
          if (!a || s.achievementsClaimed.includes(id) || a.value(stats) < a.target) return
          set({ ...applyReward(s, a.reward), achievementsClaimed: [...s.achievementsClaimed, id] })
          const parcels = a.reward.parcels ?? 0
          celebrate({
            level: 'big',
            icon: 'trophy',
            eyebrow: 'Logro conseguido',
            title: a.title,
            detail: parcels ? `${a.detail} · +${parcels} parcela${parcels > 1 ? 's' : ''} para tu jardín` : a.detail,
            coins: a.reward.coins,
            action: parcels ? 'expand' : undefined,
          })
        },

        setAudio: (patch) => set({ audio: { ...get().audio, ...patch } }),
        setWeekGoal: (weekGoal) => set({ weekGoal }),
        setGardenName: (gardenName) => set({ gardenName }),
        resetAll: () => set({ ...initialSaved(), tab: 'garden', editMode: false, selectedId: null, placing: null, splash: true }),
        dismissSplash: () => set({ splash: false }),
        completeOnboarding: ({ userName, gardenName, focusAreas, weekGoal, firstSeed }) => {
          const s = get()
          const entry = s.giftGiven ? undefined : CATALOG.find((c) => c.id === firstSeed)
          // La primera semilla es un regalo y se planta sola, cerca del centro
          const items = entry ? autoPlace(s.items, s.plots, entry.kind, entry.color, { growth: entry.seed ? { ...entry.seed, progress: 0 } : undefined }) : null
          set({
            onboarded: true,
            giftGiven: true,
            userName: userName.trim(),
            gardenName: gardenName.trim() || 'Tu jardín',
            focusAreas,
            weekGoal,
            items: items ?? s.items,
            stats: items ? { ...s.stats, seedsPlanted: s.stats.seedsPlanted + 1 } : s.stats,
            tab: 'garden',
          })
          if (entry) setTimeout(() => notify(`Has plantado tu ${entry.name.toLowerCase()}. Cultivar la hará crecer.`, 'plant'), 700)
        },
        replayOnboarding: () => set({ onboarded: false, tab: 'garden' }),
        markArticleRead: (id) => {
          const s = fresh()
          if (s.articlesRead.includes(id)) return
          // Leer una lectura también cuenta como día cumplido
          const day = withDay(s)
          const first = firstTime('read')
          set({ ...rollover(get()), ...day, articlesRead: [...s.articlesRead, id] })
          celebrate({
            level: 'medium',
            icon: 'read',
            eyebrow: first ? 'Tu primera lectura' : 'Lectura terminada',
            title: 'Gracias por dedicarte este rato',
            lines: dayLine(s, day),
            first,
          })
        },
      }
    },
    {
      name: 'grove-save-v4',
      storage: deferredStorage<Saved>(),
      partialize: (s): Saved => {
        const keys = Object.keys(initialSaved()) as Array<keyof Saved>
        return Object.fromEntries(keys.map((k) => [k, s[k]])) as unknown as Saved
      },
      merge: (persisted, current) => {
        const saved = persisted as Partial<Saved>
        const merged = { ...current, ...saved }
        // Ajustes de sonido de antes, sin el canal de efectos
        if (saved.audio) merged.audio = { ...current.audio, ...saved.audio }
        // Entradas antiguas del diario: una sola pregunta y respuesta
        if (saved.entries)
          merged.entries = saved.entries.map((e) => {
            const old = e as unknown as { date: string; question?: string; text?: string }
            return 'answers' in e ? e : { date: old.date, answers: [{ question: old.question ?? '', text: old.text ?? '' }] }
          })
        // Partidas antiguas: el jardín era un cuadrado que crecía con los días
        if (!saved.plots && saved.totalDays !== undefined) merged.plots = starterPlots(legacySide(saved.totalDays))
        return { ...merged, ...rollover(merged) }
      },
    },
  ),
)

/** Misiones y logros completados que aún no se han recogido. */
export function pendingRewards(s: Saved): number {
  const missions = missionsFor(s.daily.day).filter((m) => !s.missionsClaimed.includes(m.id) && m.value(s.daily) >= m.target).length
  const stats = { ...s.stats, visitors: s.visitorsSeen.length }
  const achievements = ACHIEVEMENTS.filter((a) => !s.achievementsClaimed.includes(a.id) && a.value(stats) >= a.target).length
  return missions + achievements
}

export const useSeason = () => useGrove((s) => s.seasonOverride ?? seasonForDate())
export const usePlots = () => useGrove((s) => s.plots)

// En desarrollo, el estado queda a mano desde la consola para probar
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { grove: typeof useGrove }).grove = useGrove
