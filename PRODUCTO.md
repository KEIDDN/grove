# 🌱 Grove (nombre en clave) — Definición de producto

> Resultado de la entrevista de ideación del 17/10/2026. Es la referencia del
> proyecto: si algo cambia, se actualiza aquí. Concepto original:
> `concepto_app_bienestar_jardin_3d.md`.

## Qué es

Un espacio de **bienestar y autocuidado** (no clínico), web y pensado para el móvil, cuyo centro
es un **jardín-cubo flotante low poly** que crece con el tiempo que te dedicas:
concéntrate, escribe cómo estás y hazlo tuyo. Bonito, privado y sin culpa.

**Diferenciación frente a Forest, Finch o Habit Grove:** Focus + Diario en el
mismo jardín · personalización real (Vivero y, más adelante, kitbash) · amigos
(visitar, regalar, celebrar) · estética de Apple con Liquid Glass ·
privacidad total.

**Objetivo actual:** construir el producto completo como **web app** (instalable
en el iPhone como PWA) para usarla y enseñarla. Con un toque de **idle game**,
cuyos detalles están pendientes de definir.

> **Concepto (17/10/2026):** un **juego de jardín acogedor donde cuidarte es lo
> que lo hace crecer**. El jardín es el producto (decorarlo, verlo vivir,
> enseñarlo); Cultivar y Raíces son el motor.

> **Pivote del 17/10/2026:** se abandona SwiftUI/Xcode. Se construye en web con
> React + TypeScript + Three.js. Las decisiones de producto se mantienen.

## Principios

- Bienestar antes que engagement. Progreso sin culpa: no se pierde nada por
  ausentarse.
- Nunca se venden Monedas ni progreso. No es pay to win.
- El diario es privado y **jamás** se comparte.
- **UI cuidadísima desde el primer día.** Es prioridad, no un pulido final.
- Excepción deliberada: hay objetos de temporada limitados (algo de FOMO),
  siempre cosméticos.

## Plataforma y tecnología

- **Web app móvil primero**: React + TypeScript + Vite, instalable como PWA.
  Desktop adaptado con la misma base.
- **Three.js con React Three Fiber** (+ drei) para el jardín 3D. Low poly
  procedural (geometría generada en código, sombreado plano). Modelos CC0 o
  propios más adelante si hace falta.
- **Liquid Glass en CSS** (desenfoque, saturación y borde especular).
- Estado con **zustand**, guardado en el navegador (localStorage). La
  sincronización y los amigos necesitarán un backend más adelante.
- La lógica del juego (`src/game/`) está separada de la escena 3D (`src/scene/`)
  y de la interfaz (`src/ui/`).
- Limitaciones de la web en iPhone: no hay Live Activities ni bloqueo de apps.
  Las notificaciones solo funcionan con la PWA instalada. Un navegador no
  distingue "bloquear el móvil" de "cambiar de app", así que la regla de
  Cultivar hay que replantearla.
- App en **español e inglés**; marca en inglés.
- Los valores de la economía van en un archivo de configuración, no en el
  código.

## Secciones (ES / EN)

| Sección | Qué hace |
|---|---|
| **Cultivar / Tend** | Concentración: duraciones fijas (10/25/45/60), personalizada o cronómetro. Da **Monedas**. |
| **Raíces / Roots** | Diario de una entrada al día. Banco de unas 150 preguntas elegidas por reglas según el onboarding. Da **vida** (el jardín florece). |
| **Vivero / Nursery** | Tienda de objetos que se compran con Monedas y se colocan en huecos del cubo. |
| **Brotes / Sprouts** | Artículos cortos con edición quincenal (3–4). Borradores con ayuda de IA y colaboradores, con fuentes reales. Archivos locales. |

Moneda: **Monedas / Coins** (icono de moneda-hoja).

## Reglas de Cultivar

- **Recompensa al completar:** con temporizador, las monedas y el crecimiento
  llegan solo al cumplir el tiempo. Abandonar no da nada, pero tampoco quita
  nada. Si llevabas 10 minutos o más, el día sí cuenta como cumplido. En modo
  libre se recompensa al terminar.
- **Confianza (versión web):** la sesión sigue aunque la app quede en segundo
  plano o se bloquee el móvil. Al volver ves lo que has cultivado. En web no se
  puede distinguir bloquear de cambiar de app, así que no hay penalización.
- **Modo reposo** opcional: pantalla con el jardín y un temporizador bonito para
  dejar el móvil boca arriba sin tocarlo (sustituye a la Live Activity).
- Economía inicial (a ajustar jugando):
  - 1 Moneda por minuto. Las sesiones de menos de 10 min no dan Monedas, pero sí
    cuentan como día cumplido.
  - Tope de **120 Monedas al día**. Pasado el tope, la sesión sigue contando
    para el historial y la racha.
  - Eventos puntuales de "lunes ×2".

## Jardín y progreso

- **Crecimiento mixto:** la vida aparece sola al cuidarte (Raíces); los objetos
  del Vivero los colocas tú.
- **El cubo se amplía con hitos de días acumulados:** 3×3 → 4×4 (7 días) → 5×5
  (30) → 7×7 (100). El tamaño es progreso y nunca se vende.
- **Estaciones del calendario real** según el hemisferio, con opción de fijar
  una favorita.
- **Eventos anuales** (Navidad, Halloween, primavera…) que vuelven cada año.
  Traen **objetos limitados** etiquetados por temporada ("Halloween 2026"). Está
  pendiente decidir si los objetos antiguos vuelven a estar disponibles.
- Precios orientativos del Vivero: pequeño 30–60 · mediano 100–200 ·
  grande/especial 300–600.

## Constancia

- **Objetivo semanal elegido por el usuario (1–7 días).**
- **Día cumplido:** escribir en Raíces, **o** hacer Cultivar de 10 min o más,
  **o** (en el futuro) leer un Brote.
- Si no se cumple la semana, la racha vuelve a 0 sin drama ("Bienvenido de
  vuelta 🌱").
- Las recompensas de hitos van por **días acumulados** (7, 14, 30, 100…) y nunca
  se pierden.

## Onboarding (sin registro)

1. **Bienvenida:** qué es la app y para qué sirve. Minimalista y sin presión.
2. **Nace tu jardín:** elegir el árbol central (3 opciones) y poner nombre al
   jardín.
3. **¿Qué quieres cuidar?** 5–6 preguntas (estrés, concentración, descanso,
   relaciones, autoestima…) que deciden las preguntas de Raíces.
4. **Tu ritmo:** objetivo semanal.
5. **Tu momento:** hora de la notificación diaria (aquí se pide el permiso).
6. **Primer gesto:** primera Raíz o sesión corta de Cultivar, y el jardín
   reacciona.

Solo se pide un **nombre de usuario** y se genera un **ID de amigo**
automáticamente. Las explicaciones posteriores son contextuales y no invasivas.

## Notificaciones

- Una al día, a la hora elegida, con tono cariñoso ("¿Qué tal tu día? Ven al
  jardín un rato a desconectar").
- Avisos de eventos de temporada.
- **Nunca** recordatorios de racha ni notificaciones push sociales.

## Monetización

- **Free:** todas las funciones, 1 jardín y un Vivero generoso. Tiene que ser
  muy bueno por sí solo.
- **Pro:** 3–5 jardines, biomas, tiles especiales, objetos exclusivos (incluidos
  los de cada temporada), temas y sonidos ambientales.
  - Precios orientativos: 1,99 €/mes · 14,99 €/año · 29,99–49,99 € de por vida.
- **Packs sueltos** (colaboraciones, jardines y objetos especiales): línea
  aparte, mismo precio para todos y explicados claramente en la pantalla de
  compra.
- Sin publicidad.

## Amigos (al final, requiere licencia)

- Se añaden por **ID de amigo** o nombre de usuario.
- Se pueden visitar y contemplar jardines.
- **Regalos:** solo objetos que existen como regalo, comprados con tus Monedas y
  no transferibles. Con el kitbash, 2–3 objetos personalizados al mes. **Nunca
  Monedas.**
- **Hitos compartidos opcionales:** rachas, tamaño del jardín, tiempo de
  Cultivar. Los amigos responden con regalos o reacciones.
- **El diario jamás se comparte.** Sin rankings.

## Orden de construcción

1. **Jardín:** cubo 3D, cámara, luz, estaciones y crecimiento automático.
2. **Cultivar:** temporizador, reglas de bloqueo/salida, Live Activity, modo
   reposo y Monedas.
3. **Raíces:** banco de preguntas, reglas y entrada diaria que da vida.
4. **Progreso:** objetivo semanal, racha, hitos y ampliación del cubo.
5. **Vivero:** catálogo, colocación en huecos y eventos de temporada.
6. **Onboarding, notificaciones y ES/EN.**
7. **Pro y packs:** StoreKit en prueba local.
8. **Brotes:** artículos en archivos locales.
9. *(Con licencia)* iCloud, amigos e Iniciar sesión con Apple.
10. *(Después)* Creador kitbash, IA en el dispositivo para Raíces (Foundation
    Models, iPhone 15 Pro o posterior), iPad/Mac y bloqueo con Screen Time.

## Aparcado

- **Marca definitiva.** GROVE, STILL y similares están ocupados en la App Store.
  Habit Grove es competidor directo.
- Ajuste fino de la economía jugando.
- Si los objetos limitados de temporadas pasadas pueden volver.

## Idle: visitantes y crecimiento (17/10/2026)

- **Visitantes estilo Neko Atsume:** cada objeto atrae a visitantes concretos
  (el estanque a patos y ranas, la calabaza a un zorro…). Llegan mientras no
  estás, cambian con la estación y dejan un pequeño regalo. Se registran en un
  **Álbum de visitantes**. Habrá visitantes de evento (un reno o Santa en
  Navidad…) en futuras actualizaciones.
- **Las cosas tardan horas:** las plantas crecen con el tiempo real y los
  minutos de Cultivar aceleran el crecimiento. Nada se marchita nunca.
- No se acumulan recursos para vender.

## Dirección visual (17/10/2026)

- Inspiración: el minimalismo de offsuit.app (sin copiarlo), pero con fondo
  **blanco cálido**.
- Una tipografía geométrica (Plus Jakarta Sans) en tamaños extremos: cifras
  enormes y finas, el resto pequeño.
- El jardín ocupa el centro de la pantalla en todos los tamaños. La interfaz es
  mínima: barra superior, dock flotante de cristal y paneles que se despliegan.
- **Liquid Glass** en el dock y en los paneles. **Tarjetas iridiscentes pastel**
  en el Vivero, el Álbum y los recuerdos.
- Pensada a la vez para móvil (PWA), iPad y desktop. En móvil y tablet los
  paneles salen desde abajo; en desktop aparecen flotando a la derecha y el
  jardín sigue centrado.

## Personalización (17/10/2026)

- Referente: **Rooms** (things.inc). La personalización es central, no un extra.
- **Modo edición** (botón del lápiz): se selecciona un objeto y se puede
  **mover, girar o guardar** en el inventario.
- Suelo en **celdas de media casilla**. Los objetos grandes (árbol, pino,
  estanque) ocupan 2×2 celdas y los pequeños 1×1. Al colocar se ve una vista
  previa verde si cabe y roja si no.
- **Comprar en el Vivero** lleva directamente a colocar el objeto. Lo que no
  cabe, o lo que retiras, queda en el **Inventario**.
- **Regalos de visitantes:** objetos decorativos únicos y semillas raras que no
  están en el Vivero.
- **Ritmo de visitantes:** sobre todo mientras no estás; a veces aparece alguno
  con la app abierta.
- **Variantes de color** (gratis, desde el modo edición): árboles y arbustos
  (Estación, Verde, Cerezo, Arce, Dorado, Glicina), pinos, flores, tulipanes,
  setas, rocas, calabazas, faroles y los objetos de madera (Roble, Blanco,
  Salvia, Nogal).
- **Suelos** que se pintan celda a celda, tocando o arrastrando: Césped, Piedra,
  Grava, Arena, Madera y Musgo. Donde hay suelo pintado no crece la hierba.
- **Objetos nuevos:** banco, valla (se gira para hacer recintos), tocón, casita
  de pájaros, tulipanes y juncos.

## Mundo vivo (17/10/2026)

- **Ciclo día/noche con la hora real:** el cielo es un degradado que cambia con
  la hora y la estación (amanecer, día, atardecer, noche con estrellas). La luz
  del sol se mueve y, de noche, los faroles se encienden y hay luciérnagas. La
  interfaz pasa sola a modo nocturno.
- **Postprocesado:** oclusión ambiental, brillo suave y viñeta.
- Hierba que se mece con el viento, agua animada y mariposas de día en primavera
  y verano.
- **Audio (pendiente):** música relajante y sonido ambiente de naturaleza según
  la estación y la hora, con pistas de licencia libre (CC0/Pixabay) elegidas por
  el usuario. Música y ambiente se controlan por separado.
- **Menús (pendiente):** pantalla de inicio, onboarding, ajustes y perfil con
  progreso.

## Ideas en definición

- **Parcelas:** el jardín se amplía colocando parcelas nuevas pegadas al jardín,
  con un tope. Se consiguen con días acumulados y con hitos o misiones, nunca
  con dinero.
- **Semillas:** se compran y se plantan. Crecen acumulando minutos de Cultivar
  (p. ej. un pino necesita 60 min en total, repartidos como quieras) o con otras
  condiciones (p. ej. escribir en Raíces varios días). La decoración se coloca
  al instante; las plantas se cultivan.

## Parcelas, semillas, misiones y logros (17/10/2026)

- **Parcelas:** el jardín empieza con 9 (3×3) y crece añadiendo parcelas de 1×1
  casilla pegadas a las que ya hay, con forma libre y un tope de 49. Se ganan
  con días acumulados (+7 a los 7 días, +9 a los 30, +24 a los 100) y con
  logros. Nunca se compran.
- **Semillas:** lo vivo se compra como semilla y se cultiva. Casi todo crece
  con minutos de Cultivar (flor 15, juncos 20, arbusto 30, pino 60, árbol 120),
  y algunas con días en Raíces (tulipanes: 2). Cada sesión completada riega
  todas las semillas plantadas a la vez. Se ven las etapas (montículo con brote
  y planta creciendo) y una etiqueta con el progreso. La decoración se coloca
  ya hecha.
- **Misiones diarias** (en Tú › Hoy): 3 al día (concentración, cuidado y
  creatividad) que dan monedas. Cambian cada día y no se acumulan.
- **Logros** (en Tú › Logros): permanentes. Dan parcelas y monedas.
- **Menú Tú:** Hoy · Logros · Álbum · Progreso · Ajustes (sonido, nombre del
  jardín, objetivo semanal, estación y empezar de cero).
- **Audio:** motor propio con música y ambiente separados. Mientras se eligen
  las pistas definitivas suena una melodía generada; el ambiente (viento,
  pájaros, grillos de noche y agua si hay estanque) cambia con la estación y la
  hora.

## Raíces como diario (17/10/2026)

- Cada día, **tres preguntas**: una de *Cómo estás*, una de *Lo bueno de hoy* y
  una de *Para reflexionar*. Salen de un banco por categorías (ahora 30, la meta
  es ~150) y son las mismas durante todo el día.
- **Reflexión libre opcional** debajo de las preguntas.
- Se guarda con al menos una respuesta. La página del día se puede editar, pero
  editar no vuelve a dar recompensas.
- **Diario consultable:** todas las páginas agrupadas por mes; al tocar una se
  lee completa.
- Ambiente sonoro: brisa muy suave y protagonismo de los pajarillos.

## Inicio, bienvenida y perfil (17/10/2026)

- **Pantalla de inicio** cada vez que se abre la app: el nombre Grove, el jardín
  vivo detrás y un saludo según la hora ("Buenas tardes, Miguel").
- **Onboarding** la primera vez, en 5 pasos: qué es Grove · tu nombre y el de tu
  jardín · qué quieres cuidar (se guarda para personalizar Raíces) · objetivo
  semanal · una semilla de regalo (flor, arbusto o pino) que se planta sola. Se
  puede volver a ver desde Ajustes, sin un segundo regalo.
- **Tú** empieza con una tarjeta de perfil: inicial, nombre, jardín, días,
  minutos y logros.
- Pendiente: recordatorio diario (necesita la PWA instalada y notificaciones).

## Fluidez (17/10/2026)

- Animaciones con **Motion** y una física de muelles común para toda la interfaz.
- Los paneles entran y salen con muelle. En móvil **se cierran arrastrándolos
  hacia abajo** desde la cabecera o el asa; en desktop entran desde la derecha.
- Píldora deslizante en el dock y en las pestañas; contenido que cambia con
  fundido; avisos que rebotan; las monedas cuentan hasta su nuevo valor.
- Edición: los objetos se deslizan a su nueva celda, aterrizan con un pequeño
  rebote, la vista previa sigue al dedo con inercia y las muestras de color
  aparecen en cascada. Vibración breve en Android al tocar y colocar.
- Calidad adaptativa: si el dispositivo baja de fps, se reduce la resolución y se
  quita la oclusión ambiental para que todo siga fluido.
