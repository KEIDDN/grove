import { create } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import { CATALOG, KIND_NAMES } from './catalog'
import { ECONOMY, legacySide, parcelsFromDays, STARTING_PARCELS } from './config'
import { cellKey, type FloorKind } from './floors'
import {
  autoPlace,
  canPlace,
  cellOwned,
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
import { rewardFor, type FocusSession, type SessionReward } from './session'
import { dayKey, TIME_SCALE, weekdayIndex, weekKey } from './time'

export type Tab = 'garden' | 'tend' | 'roots' | 'read' | 'nursery' | 'inventory' | 'you'
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
}

/** Qué se está colocando: algo del inventario o un objeto que ya estaba en el jardín. */
export type Placing =
  | { from: 'inventory'; invId: string; kind: ItemKind; color?: string; growth?: Growth }
  | { from: 'garden'; itemId: string; kind: ItemKind }

interface Saved {
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
}

interface GroveState extends Saved {
  tab: Tab
  youSection: YouSection
  restMode: boolean
  lastReward: SessionReward | null
  toast: { id: number; text: string } | null
  editMode: boolean
  selectedId: string | null
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
  clearReward: () => void

  saveRoot: (answers: RootAnswer[], reflection: string) => void
  buy: (catalogId: string) => void

  setEditMode: (on: boolean) => void
  select: (id: string | null) => void
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

const initialSaved = (): Saved => ({
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
  audio: { music: true, ambient: true, musicVolume: 0.5, ambientVolume: 0.6 },
  gardenName: 'Tu jardín',
  userName: '',
  focusAreas: [],
  onboarded: false,
  giftGiven: false,
  articlesRead: [],
})

let toastId = 0

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
      const fresh = () => ({ ...get(), ...rollover(get()) })

      /** Aplica un día cumplido y avisa si hay parcelas nuevas por días. */
      const withDay = (s: Saved): Partial<Saved> => {
        const patch = completeDay(s)
        if (patch.totalDays !== undefined && parcelsFromDays(patch.totalDays) > parcelsFromDays(s.totalDays)) {
          const n = parcelsFromDays(patch.totalDays) - parcelsFromDays(s.totalDays)
          setTimeout(() => toast(`Tienes ${n} parcelas nuevas para ampliar tu jardín`), 1200)
        }
        return patch
      }

      const announceGrown = (grown: GardenItem[]) => {
        if (grown.length === 1) setTimeout(() => toast(`${KIND_NAMES[grown[0].kind] ?? 'Tu planta'} ha terminado de crecer`), 1500)
        else if (grown.length > 1) setTimeout(() => toast(`${grown.length} plantas han terminado de crecer`), 1500)
      }

      const applyReward = (s: Saved, r: Reward): Partial<Saved> => ({ coins: s.coins + (r.coins ?? 0) })

      const elapsedMinutes = (session: FocusSession) => ((Date.now() - session.startedAt) / 60000) * TIME_SCALE

      return {
        ...initialSaved(),

        tab: 'garden',
        youSection: 'today',
        restMode: false,
        lastReward: null,
        toast: null,
        editMode: false,
        selectedId: null,
        placing: null,
        hoverCell: null,
        editTool: 'select',
        paintFloor: 'path',
        splash: true,
        hourOverride:
          typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('hour')
            ? Number(new URLSearchParams(window.location.search).get('hour'))
            : null,

        setTab: (tab) => set({ tab }),
        openYou: (youSection) => set({ tab: 'you', youSection }),
        cycleSeason: () => {
          const current = get().seasonOverride ?? seasonForDate()
          set({ seasonOverride: SEASON_ORDER[(SEASON_ORDER.indexOf(current) + 1) % 4] })
        },
        showToast: toast,
        setRestMode: (restMode) => set({ restMode }),
        setHourOverride: (hourOverride) => set({ hourOverride }),

        startSession: (targetMinutes) => set({ session: { startedAt: Date.now(), targetMinutes }, lastReward: null }),
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
          const watered = water(s.items, 'focus', minutes)
          const day = reward.grew ? withDay(s) : {}
          const stats = day.stats ?? s.stats
          set({
            ...rollover(get()),
            ...day,
            session: null,
            coins: s.coins + reward.coins,
            coinsToday: s.coinsToday + reward.coins,
            items: watered.items,
            stats: { ...stats, sessions: stats.sessions + 1, focusMinutes: stats.focusMinutes + minutes, plantsGrown: stats.plantsGrown + watered.grown.length },
            daily: { ...s.daily, sessions: s.daily.sessions + 1, focusMinutes: s.daily.focusMinutes + minutes },
            lastReward: reward,
            restMode: false,
          })
          toast(reward.coins > 0 ? `Sesión completada · +${reward.coins} monedas` : 'Sesión completada')
          announceGrown(watered.grown)
        },
        clearReward: () => set({ lastReward: null }),

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
          set({
            ...rollover(get()),
            ...day,
            items: withFlower ?? watered.items,
            inventory: withFlower ? s.inventory : [...s.inventory, { id: newId('flower'), kind: 'flower', color }],
            entries: [entry, ...s.entries],
            stats: { ...stats, roots: stats.roots + 1, plantsGrown: stats.plantsGrown + watered.grown.length },
            daily: { ...s.daily, roots: s.daily.roots + 1 },
          })
          toast('Ha florecido algo en tu jardín')
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

        setEditMode: (on) => set({ editMode: on, selectedId: null, placing: null, hoverCell: null, editTool: 'select', tab: 'garden' }),
        select: (id) => set({ selectedId: id, placing: null }),
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
            set({ items: s.items.map((it) => (it.id === p.itemId ? { ...it, x, z } : it)), placing: null, selectedId: p.itemId, hoverCell: null })
            return
          }
          const isSeed = !!p.growth && p.growth.progress === 0
          set({
            ...rollover(get()),
            items: [...s.items, { id: p.invId, kind: p.kind, color: p.color, x, z, rot: 0, growth: p.growth }],
            inventory: s.inventory.filter((i) => i.id !== p.invId),
            placing: null,
            selectedId: p.invId,
            hoverCell: null,
            stats: isSeed ? { ...s.stats, seedsPlanted: s.stats.seedsPlanted + 1 } : p.growth ? s.stats : { ...s.stats, decorPlaced: s.stats.decorPlaced + 1 },
            daily: isSeed ? { ...s.daily, planted: s.daily.planted + 1 } : { ...s.daily, placed: s.daily.placed + 1 },
          })
          if (isSeed) toast(p.growth!.by === 'focus' ? `Plantada. Crecerá con ${p.growth!.need} min de Cultivar` : `Plantada. Crecerá con ${p.growth!.need} días en Raíces`)
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
        setEditTool: (editTool) => set({ editTool, selectedId: null, placing: null, hoverCell: null }),
        setPaintFloor: (paintFloor) => set({ paintFloor }),
        paintCell: (x, z) => {
          const s = get()
          if (!cellOwned(plotSet(s.plots), x, z)) return
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
          if (plots.length >= parcelsAllowed(s)) set({ editTool: 'select' })
        },

        claimMission: (id) => {
          const s = fresh()
          const m = missionsFor(s.daily.day).find((x) => x.id === id)
          if (!m || s.missionsClaimed.includes(id) || m.value(s.daily) < m.target) return
          set({ ...rollover(get()), ...applyReward(s, m.reward), missionsClaimed: [...s.missionsClaimed, id] })
          toast(`Misión completada · +${m.reward.coins ?? 0} monedas`)
        },
        claimAchievement: (id) => {
          const s = fresh()
          const a = ACHIEVEMENTS.find((x) => x.id === id)
          const stats = { ...s.stats, visitors: s.visitorsSeen.length }
          if (!a || s.achievementsClaimed.includes(id) || a.value(stats) < a.target) return
          set({ ...applyReward(s, a.reward), achievementsClaimed: [...s.achievementsClaimed, id] })
          toast(a.reward.parcels ? `Logro conseguido · +${a.reward.parcels} parcela${a.reward.parcels > 1 ? 's' : ''}` : `Logro conseguido · ${a.title}`)
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
          if (entry) setTimeout(() => toast(`Has plantado tu ${entry.name.toLowerCase()}. Cultivar la hará crecer.`), 700)
        },
        replayOnboarding: () => set({ onboarded: false, tab: 'garden' }),
        markArticleRead: (id) => {
          const s = fresh()
          if (s.articlesRead.includes(id)) return
          // Leer una lectura también cuenta como día cumplido
          set({ ...rollover(get()), ...withDay(s), articlesRead: [...s.articlesRead, id] })
          toast('Lectura terminada. Gracias por dedicarte este rato.')
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
