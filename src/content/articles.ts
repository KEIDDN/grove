// Lecturas breves de bienestar (2–3 minutos). Se irán añadiendo aquí.

export type Block = { type: 'p'; text: string } | { type: 'h'; text: string } | { type: 'quote'; text: string } | { type: 'list'; items: string[] }

export interface Article {
  id: string
  title: string
  subtitle: string
  category: string
  minutes: number
  /** Fecha de publicación (AAAA-MM-DD). */
  date: string
  blocks: Block[]
}

export const ARTICLES: Article[] = [
  {
    id: 'no-tienes-que-florecer',
    title: 'No tienes que florecer todos los días',
    subtitle: 'Sobre los días lentos y por qué también cuentan.',
    category: 'Autocompasión',
    minutes: 3,
    date: '2026-10-17',
    blocks: [
      {
        type: 'p',
        text: 'Hay días en los que todo sale: te levantas con energía, terminas lo que tenías pendiente y hasta te sobra un rato para ti. Y hay otros en los que lo único que consigues es llegar a la noche. Los dos son días tuyos, y los dos cuentan.',
      },
      {
        type: 'p',
        text: 'Un jardín lo entiende mejor que nadie. Ninguna planta crece a la misma velocidad todo el año. En otoño suelta hojas, en invierno parece que no pasa nada y, sin embargo, bajo la tierra las raíces siguen haciendo su trabajo. Descansar también es una forma de crecer.',
      },
      { type: 'h', text: 'La trampa del día perfecto' },
      {
        type: 'p',
        text: 'Solemos medirnos con nuestro mejor día. Si un martes fuimos capaces de todo, el miércoles nos exigimos lo mismo, y cuando no llegamos aparece esa voz que dice «no es suficiente». Pero tu mejor día no es la norma: es un buen día. Compararte siempre con él es como pedirle a una flor que esté abierta a medianoche.',
      },
      { type: 'quote', text: 'Hacer menos un día no te convierte en menos.' },
      { type: 'h', text: 'Tres preguntas para un día lento' },
      {
        type: 'p',
        text: 'Cuando notes que hoy no es «tu día», prueba a cambiar la pregunta. En lugar de «¿qué no he hecho?», quizá te sirvan estas:',
      },
      {
        type: 'list',
        items: [
          '¿Qué es lo mínimo que me haría sentir un poco mejor ahora mismo?',
          '¿Qué le diría a un amigo que estuviera teniendo este mismo día?',
          '¿Qué he hecho hoy que nadie ha visto, pero que también cuenta?',
        ],
      },
      {
        type: 'p',
        text: 'A veces la respuesta es pequeña: beber agua, salir cinco minutos, mandar un mensaje, acostarte un poco antes. No hace falta más. Los pasos pequeños no son una versión rebajada de cuidarse; muchas veces son exactamente eso.',
      },
      { type: 'h', text: 'Para llevarte' },
      {
        type: 'p',
        text: 'Hoy no tienes que florecer. Basta con que te des un poco de espacio para crecer a tu ritmo. Mañana, o pasado, volverá un día con más luz. Y cuando llegue, tus raíces seguirán ahí.',
      },
    ],
  },
]
