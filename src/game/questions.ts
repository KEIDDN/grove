// Primer borrador del banco de preguntas de Raíces. Crecerá hasta ~150 con reglas del onboarding.
export const QUESTIONS = [
  '¿Qué pequeño momento de hoy te gustaría recordar?',
  '¿Qué te ha dado energía hoy?',
  '¿Cómo está tu cuerpo ahora mismo?',
  '¿Qué te ha costado más hoy, y qué te ayudó?',
  '¿A quién te gustaría dar las gracias?',
  '¿Qué podrías soltar antes de dormir?',
  '¿Qué harías mañana si solo fuera para ti?',
]

export function questionFor(date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000)
  return QUESTIONS[dayOfYear % QUESTIONS.length]
}
