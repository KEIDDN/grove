// Idiomas de la app. El texto se escribe en español, como siempre, y se pasa por `t()`: en inglés
// se busca en el diccionario (`en.ts`); lo que no esté se queda en español en vez de romperse, y en
// desarrollo se avisa por consola para no olvidarlo.
//
// El idioma vive fuera de la partida (cargar un jardín demo o empezar de cero no lo cambia).

import { create } from 'zustand'
import { EN } from './en'

export type Lang = 'es' | 'en'

const KEY = 'tendu-lang'

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'es' || saved === 'en') return saved
  } catch {
    // Sin almacenamiento: se decide por el navegador
  }
  return typeof navigator !== 'undefined' && !navigator.language.toLowerCase().startsWith('es') ? 'en' : 'es'
}

export const useLang = create<{ lang: Lang }>(() => ({ lang: initial() }))

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    // Se mantiene mientras dure la pestaña
  }
  useLang.setState({ lang })
  document.documentElement.lang = lang
}

if (typeof document !== 'undefined') document.documentElement.lang = useLang.getState().lang

const missing = new Set<string>()

/** Traduce un texto escrito en español. `{nombre}` se sustituye por `vars.nombre`. */
export function t(es: string, vars?: Record<string, string | number>): string {
  let s = es
  if (useLang.getState().lang === 'en') {
    const found = EN[es]
    if (found !== undefined) s = found
    else if (import.meta.env.DEV && !missing.has(es)) {
      missing.add(es)
      console.warn(`[i18n] falta en inglés: ${JSON.stringify(es)}`)
    }
  }
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s
}

/** Singular o plural según `n` (los dos textos en español, con `{n}`). */
export function tn(one: string, many: string, n: number, vars?: Record<string, string | number>): string {
  return t(n === 1 ? one : many, { n, ...vars })
}

/** Para componentes: se vuelven a pintar al cambiar de idioma. */
export function useT() {
  useLang((s) => s.lang)
  return t
}

/** Locale para fechas y números. */
export const locale = () => (useLang.getState().lang === 'en' ? 'en-GB' : 'es-ES')

/**
 * Convierte campos de texto de una lista de datos (nombres, pistas…) en traducciones vivas: al
 * leerlos devuelven el texto en el idioma actual. Los datos siguen escritos en español.
 */
const done = new WeakSet<object>()

export function localize<T extends object>(list: T[], keys: Array<keyof T>): T[] {
  for (const item of list) {
    // Hay listas compartidas: cada objeto se convierte una sola vez
    if (done.has(item)) continue
    done.add(item)
    for (const k of keys) {
      const es = item[k]
      if (typeof es !== 'string') continue
      Object.defineProperty(item, k, { get: () => t(es), enumerable: true, configurable: true })
    }
  }
  return list
}

/** Lo mismo para un diccionario de textos: `REC[clave]` devuelve el texto traducido. */
export function localizeRecord<T extends Record<string, string>>(rec: T): T {
  return new Proxy(rec, { get: (target, key) => (typeof key === 'string' && key in target ? t(target[key]) : Reflect.get(target, key)) }) as T
}
