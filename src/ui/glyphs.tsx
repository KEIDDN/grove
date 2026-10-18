import { SEASONS } from '../game/seasons'
import { useSeason } from '../game/store'
import { MODEL_KINDS } from '../scene/models'
import { cachedThumb, thumbKey, thumbnail } from '../scene/thumbs'
import { useEffect, useState, type CSSProperties } from 'react'
import type { ItemKind } from '../game/garden'
import type { VisitorType } from '../game/visitors'

// Iconos de las tarjetas: miniaturas de los modelos 3D o, si no hay modelo, ilustraciones planas.

/**
 * Icono de un objeto. Los que usan un modelo 3D muestran una miniatura renderizada del propio
 * modelo (igual que en el jardín); los hechos con código, su dibujo.
 */
export function KindGlyph({ kind, color, size = 64 }: { kind: ItemKind; color?: string; size?: number }) {
  const theme = SEASONS[useSeason()]
  const key = thumbKey(kind, color, theme)
  const [url, setUrl] = useState(() => cachedThumb(key))
  useEffect(() => {
    const cached = cachedThumb(key)
    if (cached) return setUrl(cached)
    let alive = true
    thumbnail(kind, color, theme)?.then((u) => alive && setUrl(u)).catch(() => {})
    return () => {
      alive = false
    }
  }, [key])
  if (MODEL_KINDS[kind]) {
    return url ? (
      <img src={url} width={size} height={size} alt="" aria-hidden="true" draggable={false} style={{ display: 'block', objectFit: 'contain' }} />
    ) : (
      <span aria-hidden="true" style={{ display: 'block', width: size, height: size }} />
    )
  }
  return <DrawnGlyph kind={kind} color={color ?? '#EBA3B8'} size={size} />
}

function DrawnGlyph({ kind, color, size }: { kind: ItemKind; color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {kind === 'tree' && (
        <g>
          <polygon points="29,58 35,58 34,36 30,36" fill="#8A6244" />
          <polygon points="32,8 14,22 18,40 32,44" fill="#9BD47A" />
          <polygon points="32,8 32,44 46,40 50,22" fill="#7FC46A" />
          <polygon points="18,40 32,44 46,40 32,48" fill="#6AAE58" />
        </g>
      )}
      {kind === 'pine' && (
        <g>
          <polygon points="30,58 34,58 34,48 30,48" fill="#8A6244" />
          <polygon points="32,6 20,26 32,24" fill="#4FA066" />
          <polygon points="32,6 32,24 44,26" fill="#3F8F5B" />
          <polygon points="32,18 16,40 32,37" fill="#4FA066" />
          <polygon points="32,18 32,37 48,40" fill="#357E4F" />
          <polygon points="32,30 13,52 32,48" fill="#5DAA70" />
          <polygon points="32,30 32,48 51,52" fill="#3F8F5B" />
        </g>
      )}
      {kind === 'flower' && (
        <g>
          <polygon points="31,58 33,58 33,32 31,32" fill="#6E9A5A" />
          <polygon points="32,46 22,40 30,38" fill="#7FB36C" />
          <polygon points="32,14 42,20 42,32 32,38 22,32 22,20" fill={color} />
          <polygon points="32,14 42,20 42,32 32,26" fill="#000" opacity="0.07" />
          <polygon points="32,22 36,24 36,28 32,30 28,28 28,24" fill="#F4D27A" />
        </g>
      )}
      {kind === 'bush' && (
        <g>
          <polygon points="10,54 8,42 18,30 32,26 46,30 56,42 54,54" fill="#8CC77A" />
          <polygon points="32,26 46,30 56,42 54,54 32,54 38,40" fill="#6FAE60" />
        </g>
      )}
      {kind === 'rock' && (
        <g>
          <polygon points="12,54 8,44 18,32 36,30 48,40 46,54" fill="#C2C1BA" />
          <polygon points="36,30 48,40 46,54 32,54 34,42" fill="#A9A8A1" />
          <polygon points="44,54 46,46 54,44 58,54" fill="#B7B6AF" />
        </g>
      )}
      {kind === 'mushroom' && (
        <g>
          <polygon points="28,56 36,56 35,38 29,38" fill="#F1E6D2" />
          <polygon points="14,40 20,26 32,20 44,26 50,40" fill="#D9604C" />
          <polygon points="32,20 44,26 50,40 32,40" fill="#BF4E3C" />
          <polygon points="22,32 26,32 26,35 22,35" fill="#fff" />
          <polygon points="36,27 40,27 40,30 36,30" fill="#fff" />
        </g>
      )}
      {kind === 'pumpkin' && (
        <g>
          <polygon points="12,50 9,38 16,28 32,26 48,28 55,38 52,50 32,54" fill="#E58A3A" />
          <polygon points="32,26 48,28 55,38 52,50 32,54" fill="#CC7330" />
          <polygon points="22,27 32,26 32,54 21,52 17,38" fill="#EE9A4C" />
          <polygon points="30,27 34,27 36,17 31,18" fill="#6E7A3E" />
        </g>
      )}
      {kind === 'lantern' && (
        <g>
          <polygon points="30,58 34,58 34,34 30,34" fill="#5E4A3A" />
          <polygon points="22,16 42,16 42,34 22,34" fill="#4C3D31" />
          <polygon points="25,19 39,19 39,31 25,31" fill="#F6C766" />
          <polygon points="18,16 32,7 46,16" fill="#3E3128" />
        </g>
      )}
      {kind === 'pond' && (
        <g>
          <polygon points="6,40 14,30 30,26 48,28 58,36 54,46 36,50 16,48" fill="#8F6E4E" />
          <polygon points="10,39 17,32 31,29 47,31 54,37 51,44 35,47 18,45" fill="#4DB3B0" />
          <polygon points="31,29 47,31 54,37 36,38" fill="#7CCBC6" />
          <polygon points="22,38 28,36 30,40 24,41" fill="#6FAF5A" />
        </g>
      )}
      {kind === 'bench' && (
        <g>
          <polygon points="12,40 52,40 52,44 12,44" fill="#B98A5E" />
          <polygon points="14,26 50,26 50,30 14,30" fill="#B98A5E" />
          <polygon points="14,32 50,32 50,35 14,35" fill="#A57B52" />
          <polygon points="16,44 20,44 20,54 16,54" fill="#8A6244" />
          <polygon points="44,44 48,44 48,54 44,54" fill="#8A6244" />
          <polygon points="16,24 19,24 19,40 16,40" fill="#8A6244" />
          <polygon points="45,24 48,24 48,40 45,40" fill="#8A6244" />
        </g>
      )}
      {kind === 'fence' && (
        <g>
          <polygon points="8,30 56,30 56,34 8,34" fill="#A57B52" />
          <polygon points="8,44 56,44 56,48 8,48" fill="#A57B52" />
          {[12, 24, 36, 48].map((x) => (
            <polygon key={x} points={`${x},56 ${x + 5},56 ${x + 5},24 ${x + 2.5},20 ${x},24`} fill="#C49A6C" />
          ))}
        </g>
      )}
      {kind === 'stump' && (
        <g>
          <polygon points="16,30 48,30 50,54 14,54" fill="#8A6244" />
          <polygon points="32,30 48,30 50,54 32,54" fill="#74513A" />
          <polygon points="16,30 24,25 40,25 48,30 40,35 24,35" fill="#E3C59A" />
          <polygon points="26,30 30,28 34,28 38,30 34,32 30,32" fill="#C9A678" />
        </g>
      )}
      {kind === 'birdhouse' && (
        <g>
          <polygon points="30,40 34,40 34,60 30,60" fill="#7A5640" />
          <polygon points="20,22 44,22 44,42 20,42" fill="#B98A5E" />
          <polygon points="16,24 32,10 48,24" fill="#8A6244" />
          <polygon points="29,28 35,28 35,34 29,34" fill="#3A2C22" />
        </g>
      )}
      {kind === 'tulips' && (
        <g>
          {[18, 32, 46].map((x, i) => (
            <g key={x}>
              <polygon points={`${x - 1},58 ${x + 1},58 ${x + 1},${30 + i * 2} ${x - 1},${30 + i * 2}`} fill="#6E9A5A" />
              <polygon points={`${x - 6},${22 + i * 2} ${x + 6},${22 + i * 2} ${x + 4},${32 + i * 2} ${x - 4},${32 + i * 2}`} fill={color} />
              <polygon points={`${x - 6},${22 + i * 2} ${x - 3},${18 + i * 2} ${x},${22 + i * 2} ${x + 3},${18 + i * 2} ${x + 6},${22 + i * 2}`} fill={color} />
            </g>
          ))}
        </g>
      )}
      {kind === 'reeds' && (
        <g>
          {[16, 24, 32, 40, 48].map((x, i) => (
            <polygon key={x} points={`${x - 2},58 ${x + 2},58 ${x + (i % 2 ? 3 : -3)},${12 + (i % 3) * 6}`} fill={i % 2 ? '#5E9C48' : '#76B35A'} />
          ))}
          <polygon points="21,24 25,24 25,34 21,34" fill="#7A5236" />
          <polygon points="37,20 41,20 41,30 37,30" fill="#7A5236" />
        </g>
      )}
      {kind === 'sapling' && (
        <g>
          <polygon points="31,58 33,58 33,34 31,34" fill="#7A8B4E" />
          <polygon points="32,42 18,34 26,28" fill="#8CC77A" />
          <polygon points="32,36 46,26 38,22" fill="#6FAE60" />
        </g>
      )}
    </svg>
  )
}

export function VisitorGlyph({ type, size = 44 }: { type: VisitorType; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {type === 'bird' && (
        <g>
          <polygon points="10,30 20,18 32,18 38,26 30,34 16,36" fill="#C9724B" />
          <polygon points="32,18 38,26 44,22" fill="#E8B04E" />
          <polygon points="20,18 32,18 26,26" fill="#A85A3A" />
          <polygon points="16,36 22,42 26,35" fill="#8A4A30" />
          <polygon points="33,22 35,22 35,24 33,24" fill="#1B1F1C" />
        </g>
      )}
      {type === 'mammal' && (
        <g>
          <polygon points="10,36 14,22 24,18 34,22 38,36 24,40" fill="#D8873F" />
          <polygon points="14,22 12,10 20,19" fill="#C4732F" />
          <polygon points="34,22 36,10 28,19" fill="#C4732F" />
          <polygon points="18,32 24,40 30,32 24,30" fill="#F6E9D8" />
          <polygon points="18,27 20,27 20,29 18,29" fill="#1B1F1C" />
          <polygon points="28,27 30,27 30,29 28,29" fill="#1B1F1C" />
        </g>
      )}
      {type === 'insect' && (
        <g>
          <polygon points="24,14 10,8 6,22 22,26" fill="#B9A5DB" />
          <polygon points="24,14 38,8 42,22 26,26" fill="#9F88CB" />
          <polygon points="22,26 10,30 14,40 23,30" fill="#EBA3B8" />
          <polygon points="26,26 38,30 34,40 25,30" fill="#D98CA3" />
          <polygon points="23,12 25,12 25,38 23,38" fill="#3A2F45" />
        </g>
      )}
      {type === 'amphibian' && (
        <g>
          <polygon points="8,34 14,22 34,22 40,34 24,40" fill="#7FB36C" />
          <polygon points="14,22 18,14 24,20" fill="#6AA05A" />
          <polygon points="34,22 30,14 24,20" fill="#6AA05A" />
          <polygon points="17,17 20,17 20,20 17,20" fill="#1B1F1C" />
          <polygon points="28,17 31,17 31,20 28,20" fill="#1B1F1C" />
          <polygon points="14,32 34,32 24,36" fill="#5E8E4E" />
        </g>
      )}
    </svg>
  )
}

/** Tres tonos pastel por tarjeta, rotando para que cada una tenga su brillo. */
export const IRI_PALETTES: Array<[string, string, string]> = [
  ['#FDE4E8', '#E7F1EA', '#E1E6FF'],
  ['#FFF1D6', '#F3E6F6', '#DDEFF3'],
  ['#E3F3E6', '#FCEFD9', '#F2E1EC'],
  ['#E6E9FF', '#FDE8E1', '#EAF4E2'],
]

export function iriStyle(i: number) {
  const [c1, c2, c3] = IRI_PALETTES[i % IRI_PALETTES.length]
  return { '--c1': c1, '--c2': c2, '--c3': c3 } as CSSProperties
}
