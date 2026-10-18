import { localize } from '../i18n'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

export interface SeasonTheme {
  name: string
  bg: string
  bgDeep: string
  sky: string
  grass: string[]
  tuft: string[]
  leaf: string[]
  speck: string[]
  particle: string
  particleKind: 'petal' | 'pollen' | 'leaf' | 'snow'
}

export const SEASONS: Record<Season, SeasonTheme> = {
  spring: {
    name: 'Primavera',
    bg: '#F3F6EE',
    bgDeep: '#DFE9D6',
    sky: '#F6FAF0',
    grass: ['#A6D47C', '#9CCC72', '#B0DA86', '#97C76E'],
    tuft: ['#7FC25A', '#8FCF66', '#6DB24E'],
    leaf: ['#9BD47A', '#B9E08A', '#7FC46A', '#D2E89A'],
    speck: ['#FFFFFF', '#F7D9E4', '#FFF2B0'],
    particle: '#F4C2D2',
    particleKind: 'petal',
  },
  summer: {
    name: 'Verano',
    bg: '#F6F3E6',
    bgDeep: '#E9E2C6',
    sky: '#FCF8EA',
    grass: ['#9CCB5E', '#91C155', '#A7D46A', '#8BBB50'],
    tuft: ['#6FAE3E', '#7DBB48', '#5E9C34'],
    leaf: ['#6DB25A', '#8CC66A', '#5A9E4C', '#A9D47A'],
    speck: ['#FFFFFF', '#FFE27A', '#FFFFFF'],
    particle: '#FFF3B5',
    particleKind: 'pollen',
  },
  autumn: {
    name: 'Otoño',
    bg: '#F7F0E6',
    bgDeep: '#EBDCC8',
    sky: '#FCF5EC',
    grass: ['#C2C474', '#B7BA69', '#CCCE82', '#B0B262'],
    tuft: ['#A7A855', '#B6A95A', '#9A9E4C'],
    leaf: ['#E8A04E', '#F0BE62', '#D47F3A', '#E6C46A'],
    speck: ['#E8A04E', '#F3D58A', '#C9673A'],
    particle: '#D98A3E',
    particleKind: 'leaf',
  },
  winter: {
    name: 'Invierno',
    bg: '#EFF3F7',
    bgDeep: '#DAE3EC',
    sky: '#F6F9FC',
    grass: ['#EEF3F6', '#E4ECF1', '#F6F9FB', '#E8EFF3'],
    tuft: ['#C9D8D2', '#D7E3DE', '#BBCDC6'],
    leaf: ['#9EC0B2', '#B8D3C8', '#86AE9F'],
    speck: ['#FFFFFF', '#E3ECF2', '#FFFFFF'],
    particle: '#FFFFFF',
    particleKind: 'snow',
  },
}

/** Estación del calendario real (hemisferio norte por defecto). */
export function seasonForDate(date = new Date(), hemisphere: 'north' | 'south' = 'north'): Season {
  const m = date.getMonth() // 0 = enero
  const north: Season = m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn'
  if (hemisphere === 'north') return north
  return SEASON_ORDER[(SEASON_ORDER.indexOf(north) + 2) % 4]
}

localize(Object.values(SEASONS), ['name'])
