import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CATALOG } from './catalog'
import { cellKey, type FloorKind } from './floors'
import { ECONOMY, gridSizeForDays } from './config'
import { autoPlace, canPlace, FLOWER_COLORS, newId, STARTER_GARDEN, type GardenItem, type InventoryItem, type ItemKind } from './garden'
import { questionFor } from './questions'
import { SEASON_ORDER, seasonForDate, type Season } from './seasons'
import { rewardFor, type FocusSession, type SessionReward } from './session'
import { dayKey, TIME_SCALE, weekdayIndex, weekKey } from './time'

export type Tab = 'garden' | 'tend' | 'roots' | 'nursery' | 'album' | 'inventory'

export interface RootEntry {
  date: string
  question: string
  text: string
}

/** Qué se está colocando: algo del inventario o un objeto que ya estaba en el jardín. */
export type Placing = { from: 'inventory'; invId: string; kind: ItemKind; color?: string } | { from: 'garden'; itemId: string; kind: ItemKind }

interface Saved {
  coins: number
  coinsToday: number
  coinsDate: string
  items: GardenItem[]
  inventory: InventoryItem[]
  totalDays: number
  lastActiveDate: string | null
  weekGoal: number
  weekOf: string
  /** Días cumplidos esta semana, de lunes (0) a domingo (6). */
  weekDays: boolean[]
  entries: RootEntry[]
  /** Suelo pintado por celda ("x,z"); lo que no aparece es césped. */
  floors: Record<string, FloorKind>
  visitorsSeen: string[]
  session: FocusSession | null
  seasonOverride: Season | null
}

interface GroveState extends Saved {
  tab: Tab
  restMode: boolean
  lastReward: SessionReward | null
  toast: { id: number; text: string } | null
  editMode: boolean
  selectedId: string | null
  placing: Placing | null
  hoverCell: [number, number] | null
  editTool: 'select' | 'paint'
  paintFloor: FloorKind

  setTab: (tab: Tab) => void
  cycleSeason: () => void
  showToast: (text: string) => void
  setRestMode: (on: boolean) => void

  startSession: (targetMinutes: number | null) => void
  cancelSession: () => void
  completeSession: () => void
  clearReward: () => void

  saveRoot: (text: string) => void
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
  setEditTool: (tool: 'select' | 'paint') => void
  setPaintFloor: (floor: FloorKind) => void
  paintCell: (x: number, z: number) => void
}

/** Pone al día los contadores que dependen de la fecha (semana nueva, monedas de hoy). */
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
  return patch
}

/** Marca hoy como día cumplido (una vez al día). */
function completeDay(s: Saved, now = new Date()): Partial<Saved> {
  const today = dayKey(now)
  if (s.lastActiveDate === today) return {}
  const weekDays = [...s.weekDays]
  weekDays[weekdayIndex(now)] = true
  return { lastActiveDate: today, totalDays: s.totalDays + 1, weekDays }
}

let toastId = 0

export const useGrove = create<GroveState>()(
  persist(
    (set, get) => {
      const toast = (text: string) => set({ toast: { id: ++toastId, text } })

      /** Aplica un día cumplido y avisa si el jardín ha crecido. */
      const withDay = (s: Saved): Partial<Saved> => {
        const patch = completeDay(s)
        if (patch.totalDays !== undefined && gridSizeForDays(patch.totalDays) > gridSizeForDays(s.totalDays)) {
          const n = gridSizeForDays(patch.totalDays)
          setTimeout(() => toast(`Tu jardín ha crecido: ahora es ${n}×${n}`), 900)
        }
        return patch
      }

      /** Planta algo automáticamente; si no cabe, va al inventario. */
      const grow = (s: Saved, size: number, kind: ItemKind, color?: string): Partial<Saved> => {
        const items = autoPlace(s.items, size, kind, color)
        if (items) return { items }
        return { inventory: [...s.inventory, { id: newId(kind), kind, color }] }
      }

      const elapsedMinutes = (session: FocusSession) => ((Date.now() - session.startedAt) / 60000) * TIME_SCALE

      return {
        coins: ECONOMY.startingCoins,
        coinsToday: 0,
        coinsDate: dayKey(),
        items: STARTER_GARDEN,
        inventory: [],
        totalDays: 6,
        lastActiveDate: null,
        weekGoal: 3,
        weekOf: weekKey(),
        weekDays: [false, true, false, true, false, false, false].map((d, i) => d && i < weekdayIndex()),
        entries: [],
        floors: {},
        visitorsSeen: ['robin'],
        session: null,
        seasonOverride: null,

        tab: 'garden',
        restMode: false,
        lastReward: null,
        toast: null,
        editMode: false,
        selectedId: null,
        placing: null,
        hoverCell: null,
        editTool: 'select',
        paintFloor: 'path',

        setTab: (tab) => set({ tab }),
        cycleSeason: () => {
          const current = get().seasonOverride ?? seasonForDate()
          set({ seasonOverride: SEASON_ORDER[(SEASON_ORDER.indexOf(current) + 1) % 4] })
        },
        showToast: toast,
        setRestMode: (restMode) => set({ restMode }),

        startSession: (targetMinutes) => set({ session: { startedAt: Date.now(), targetMinutes }, lastReward: null }),
        cancelSession: () => {
          const s = { ...get(), ...rollover(get()) }
          if (!s.session) return
          // Abandonar no da monedas, pero 10 minutos o más sí cuentan como día cumplido.
          const counts = elapsedMinutes(s.session) >= ECONOMY.minMinutesForCoins
          set({ ...rollover(get()), ...(counts ? withDay(s) : {}), session: null, restMode: false })
          toast(counts ? 'Sesión abandonada. Tu tiempo cuenta para hoy.' : 'Sesión abandonada. No pasa nada, vuelve cuando quieras.')
        },
        completeSession: () => {
          const s = { ...get(), ...rollover(get()) }
          if (!s.session) return
          const minutes = Math.floor(s.session.targetMinutes ?? elapsedMinutes(s.session))
          const reward = rewardFor(minutes, s.coinsToday)
          let patch: Partial<Saved> = { session: null, coins: s.coins + reward.coins, coinsToday: s.coinsToday + reward.coins, coinsDate: s.coinsDate }
          if (reward.grew) {
            const day = withDay(s)
            patch = { ...patch, ...day, ...grow(s, gridSizeForDays(day.totalDays ?? s.totalDays), 'sapling') }
          }
          set({ ...rollover(get()), ...patch, lastReward: reward, restMode: false })
          toast(reward.coins > 0 ? `Sesión completada · +${reward.coins} monedas` : 'Sesión completada')
        },
        clearReward: () => set({ lastReward: null }),

        saveRoot: (text) => {
          const s = { ...get(), ...rollover(get()) }
          const today = dayKey()
          if (!text.trim() || s.entries.some((e) => e.date === today)) return
          const day = withDay(s)
          const color = FLOWER_COLORS[s.entries.length % FLOWER_COLORS.length]
          set({
            ...rollover(get()),
            ...day,
            ...grow(s, gridSizeForDays(day.totalDays ?? s.totalDays), 'flower', color),
            entries: [{ date: today, question: questionFor(), text: text.trim() }, ...s.entries],
          })
          toast('Ha florecido algo en tu jardín')
        },

        buy: (catalogId) => {
          const s = get()
          const entry = CATALOG.find((c) => c.id === catalogId)
          if (!entry) return
          if (s.coins < entry.price) return toast(`Te faltan ${entry.price - s.coins} monedas. Cultivar te da más.`)
          const inv: InventoryItem = { id: newId(entry.kind), kind: entry.kind, color: entry.color }
          set({
            coins: s.coins - entry.price,
            inventory: [...s.inventory, inv],
            tab: 'garden',
            editMode: true,
            selectedId: null,
            placing: { from: 'inventory', invId: inv.id, kind: inv.kind, color: inv.color },
          })
          toast(`${entry.name}: toca el jardín para plantarlo`)
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
          set({ items: items.filter((i) => i.id !== it.id), inventory: [...inventory, { id: it.id, kind: it.kind, color: it.color }], selectedId: null })
          toast('Guardado en tu inventario')
        },
        startMove: () => {
          const it = get().items.find((i) => i.id === get().selectedId)
          if (it) set({ placing: { from: 'garden', itemId: it.id, kind: it.kind } })
        },
        startPlacing: (invId) => {
          const inv = get().inventory.find((i) => i.id === invId)
          if (inv) set({ tab: 'garden', editMode: true, selectedId: null, placing: { from: 'inventory', invId, kind: inv.kind, color: inv.color } })
        },
        setHoverCell: (hoverCell) => set({ hoverCell }),
        placeAt: (x, z) => {
          const s = get()
          const p = s.placing
          if (!p) return
          const size = gridSizeForDays(s.totalDays)
          const ignore = p.from === 'garden' ? p.itemId : undefined
          if (!canPlace(s.items, size, p.kind, x, z, ignore)) return toast('Ahí no cabe')
          if (p.from === 'garden') {
            set({ items: s.items.map((it) => (it.id === p.itemId ? { ...it, x, z } : it)), placing: null, selectedId: p.itemId, hoverCell: null })
          } else {
            set({
              items: [...s.items, { id: p.invId, kind: p.kind, color: p.color, x, z, rot: 0 }],
              inventory: s.inventory.filter((i) => i.id !== p.invId),
              placing: null,
              selectedId: p.invId,
              hoverCell: null,
            })
          }
        },
        cancelPlacing: () => set({ placing: null, hoverCell: null }),
        recolorSelected: (variantId) => {
          const { selectedId, items } = get()
          set({ items: items.map((it) => (it.id === selectedId ? { ...it, color: variantId } : it)) })
        },
        setEditTool: (editTool) => set({ editTool, selectedId: null, placing: null, hoverCell: null }),
        setPaintFloor: (paintFloor) => set({ paintFloor }),
        paintCell: (x, z) => {
          const { floors, paintFloor } = get()
          const key = cellKey(x, z)
          if ((floors[key] ?? 'grass') === paintFloor) return
          const next = { ...floors }
          if (paintFloor === 'grass') delete next[key]
          else next[key] = paintFloor
          set({ floors: next })
        },
      }
    },
    {
      name: 'grove-save-v4',
      partialize: (s): Saved => ({
        coins: s.coins,
        coinsToday: s.coinsToday,
        coinsDate: s.coinsDate,
        items: s.items,
        inventory: s.inventory,
        totalDays: s.totalDays,
        lastActiveDate: s.lastActiveDate,
        weekGoal: s.weekGoal,
        weekOf: s.weekOf,
        weekDays: s.weekDays,
        entries: s.entries,
        floors: s.floors,
        visitorsSeen: s.visitorsSeen,
        session: s.session,
        seasonOverride: s.seasonOverride,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<Saved>) }
        return { ...merged, ...rollover(merged) }
      },
    },
  ),
)

export const useSeason = () => useGrove((s) => s.seasonOverride ?? seasonForDate())
export const useGridSize = () => useGrove((s) => gridSizeForDays(s.totalDays))
