import type { CSSProperties } from 'react'
import {
  ArrowClockwise,
  ArrowsClockwise,
  ArrowsOutCardinal,
  BookOpen,
  BookOpenText,
  CaretDown,
  Check,
  CornersOut,
  Heart,
  type Icon as PhosphorIcon,
  Lock,
  MoonStars,
  Package,
  PaintBrushBroad,
  Palette,
  PencilSimple,
  Plant,
  ShoppingBagOpen,
  SquaresFour,
  Timer,
  Trophy,
  User,
  X,
} from '@phosphor-icons/react'

/**
 * Iconos de interfaz: Phosphor, con un único grosor para toda la app. `strokeWidth` se mantiene por
 * compatibilidad: por encima de 2 pasa a la variante gruesa. `active` usa la variante rellena, como
 * las pestañas seleccionadas de iOS. Lo propio de Grove (la moneda-hoja) va dibujado a mano.
 */
interface IconProps {
  size?: number
  strokeWidth?: number
  active?: boolean
  style?: CSSProperties
  className?: string
}

function wrap(Glyph: PhosphorIcon) {
  return function GroveIcon({ size = 22, strokeWidth, active, style, className }: IconProps) {
    const weight = active ? 'fill' : strokeWidth && strokeWidth > 2 ? 'bold' : 'regular'
    return <Glyph size={size} weight={weight} style={style} className={className} aria-hidden="true" />
  }
}

export const SproutIcon = wrap(Plant)
export const TimerIcon = wrap(Timer)
export const JournalIcon = wrap(BookOpenText)
export const BagIcon = wrap(ShoppingBagOpen)
export const CycleIcon = wrap(ArrowsClockwise)
export const AlbumIcon = wrap(SquaresFour)
export const CloseIcon = wrap(X)
/** Apunta hacia abajo; se gira con `style` para otras direcciones. */
export const ChevronIcon = wrap(CaretDown)
export const LockIcon = wrap(Lock)
export const MoonIcon = wrap(MoonStars)
export const EditIcon = wrap(PencilSimple)
export const RotateIcon = wrap(ArrowClockwise)
export const MoveIcon = wrap(ArrowsOutCardinal)
export const BoxIcon = wrap(Package)
export const CheckIcon = wrap(Check)
export const PaletteIcon = wrap(Palette)
export const BrushIcon = wrap(PaintBrushBroad)
export const UserIcon = wrap(User)
export const ExpandIcon = wrap(CornersOut)
export const TrophyIcon = wrap(Trophy)
export const BookIcon = wrap(BookOpen)
export const HeartIcon = wrap(Heart)

/** Moneda-hoja de Grove. */
export function CoinIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#E3BB5C" />
      <circle cx="10" cy="10" r="6.6" fill="#F2D488" />
      <path d="M10 14.6c0-3.6 1.6-6 4.2-7-.5 3.6-1.9 6-4.2 7zM10 14.6c-2-1-3.3-3-3.3-5.6 2.1.6 3.3 2.4 3.3 5.6z" fill="#7E6120" />
    </svg>
  )
}
