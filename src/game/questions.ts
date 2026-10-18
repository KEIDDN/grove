import { localizeRecord } from '../i18n'
import { hashString } from './hash'

// Banco de preguntas de Raíces. Cada día salen tres: una de cada grupo.
// Crecerá hasta ~150 y se personalizará con las respuestas del onboarding.

export type QuestionGroup = 'feel' | 'notice' | 'grow'

export const GROUP_NAMES: Record<QuestionGroup, string> = localizeRecord({
  feel: 'Cómo estás',
  notice: 'Lo bueno de hoy',
  grow: 'Para reflexionar',
})

export const QUESTIONS: Record<QuestionGroup, string[]> = {
  feel: [
    '¿Cómo te sientes ahora mismo, en una palabra o dos?',
    '¿Cómo está tu cuerpo hoy? ¿Cansado, ligero, tenso…?',
    '¿Qué emoción te ha acompañado más durante el día?',
    '¿Cuánta energía has tenido hoy, y de dónde ha venido?',
    '¿Qué te ha costado más hoy?',
    '¿Has dormido bien? ¿Cómo lo has notado durante el día?',
    '¿Qué te ha preocupado hoy, y cuánto pesa ahora?',
    '¿En qué momento del día te has sentido más tú?',
    '¿Qué necesitas esta noche para descansar mejor?',
    '¿Cómo te has hablado a ti mismo hoy?',
  ],
  notice: [
    '¿Qué pequeño momento de hoy te gustaría recordar?',
    '¿Por qué tres cosas, aunque sean pequeñas, das las gracias hoy?',
    '¿Qué te ha hecho sonreír?',
    '¿Quién ha hecho tu día un poco mejor?',
    '¿Qué has hecho hoy solo porque te apetecía?',
    '¿Qué has disfrutado sin mirar el móvil?',
    '¿Qué has aprendido hoy, aunque sea algo mínimo?',
    '¿Qué ha salido mejor de lo que esperabas?',
    '¿Qué sonido, olor o paisaje te ha gustado hoy?',
    '¿De qué te sientes orgulloso, por pequeño que sea?',
  ],
  grow: [
    '¿Qué podrías soltar antes de dormir?',
    '¿Qué harías mañana si fuera solo para ti?',
    '¿Qué te dirías si fueras tu mejor amigo?',
    '¿Qué pequeño paso te acercaría mañana a algo que te importa?',
    '¿Qué límite te ha hecho falta poner hoy?',
    '¿Qué te gustaría hacer diferente mañana?',
    '¿Qué te ha dado paz esta semana?',
    '¿A qué le estás dando demasiadas vueltas?',
    '¿Qué es algo que ya no necesitas demostrar?',
    '¿A quién te gustaría escribir o llamar pronto?',
  ],
}

export interface DailyQuestion {
  group: QuestionGroup
  text: string
}

/** Las tres preguntas del día (siempre las mismas para una fecha). */
export function questionsFor(day: string): DailyQuestion[] {
  const h = hashString(day)
  return (Object.keys(QUESTIONS) as QuestionGroup[]).map((group, i) => {
    const list = QUESTIONS[group]
    return { group, text: list[(h + i * 7919) % list.length] }
  })
}
