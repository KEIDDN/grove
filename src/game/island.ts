// Estilos de la base de roca de la isla: se eligen en el modo edición, como los suelos.

export type IslandStyleId = 'rock' | 'sandstone' | 'slate' | 'moss'

export interface IslandStyle {
  id: IslandStyleId
  name: string
  /** Tonos de la roca, de la cara más clara a la más oscura. */
  rock: string[]
  /** Cuánto musgo crece donde la tierra toca la roca (1 = normal). */
  moss: number
}

export const ISLAND_STYLES: IslandStyle[] = [
  { id: 'rock', name: 'Roca', rock: ['#A8A094', '#978F83', '#B4AD9F', '#8C8478'], moss: 1 },
  { id: 'sandstone', name: 'Arenisca', rock: ['#E0C49A', '#D2B183', '#E9D2AC', '#C6A272'], moss: 0.5 },
  { id: 'slate', name: 'Pizarra', rock: ['#737A86', '#646A75', '#828894', '#575D68'], moss: 0.8 },
  { id: 'moss', name: 'Musgo', rock: ['#8F9C86', '#7F8C77', '#9EAA95', '#728069'], moss: 2.5 },
]

export const islandStyle = (id: IslandStyleId) => ISLAND_STYLES.find((s) => s.id === id) ?? ISLAND_STYLES[0]
