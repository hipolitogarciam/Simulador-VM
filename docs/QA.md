# Informe de QA técnico

Fecha: 2026-10-05. Entorno: Node 22, Chromium preinstalado (`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`),
`vite preview` en el puerto 4173. Los archivos de los casos (`src/cases/caso-0*.ts`) no se han tocado: lo que les
afecta está en la sección "Para el integrador".

## Resumen

| Comprobación | Resultado |
|---|---|
| `npm run build` (typecheck + build) | OK |
| `npx vitest run` | 8 archivos, **96 tests** (antes 43) |
| `npx playwright test` (móvil 390×844, tablet 820×1180, escritorio 1440×900) | **30 tests, todos en verde** (10 por tamaño) |
| fps en móvil con CPU ×4 (`scripts/rendimiento.mjs`) | pestaña Ventilador **60 fps**, pestaña Monitor **59 fps** (antes 60 / 51) |
| Heap tras 6 cambios de caso | 4,2 → 4,3 MB (estable; antes 4,1 → 4,2) |
| Salto de tiempo de 180 s (caso 8) en Node | **85 ms** (antes 2 949 ms; en móvil con CPU ×4 eran ~12 s de bloqueo) |

## Qué se ha probado

### Tests unitarios (Vitest, `src/tests`)

Nuevos archivos:

- `gases.test.ts`: curva de disociación (monotonía, puntos clásicos, inversa), ventilación alveolar con espacio
  muerto y con fuga, PaCO₂ de equilibrio (0,863·VCO₂/VA, acotación), gradiente PaCO₂–EtCO₂, PaO₂ por shunt
  (shunt, FiO₂, PEEP/reclutabilidad, gasto, resolución exacta de la ecuación de contenidos), factor de fuga del
  capnograma, integración temporal (τ, equivalencia 50 ms ≡ 10 × 5 ms, objetivos directos, apnea y reserva de O₂).
- `hemodinamica.test.ts`: objetivos de TA/FC frente a presión media, auto-PEEP, compresión mediastínica e
  hipoxemia; acotaciones; convergencia exponencial; gasto relativo.
- `ondas.test.ts`: capnograma (fase I, meseta, caída al inspirar, aleta de tiburón, hendidura por esfuerzo), ECG
  (periodicidad, R máxima, compresión con FC alta) y pletismografía (amplitud, muesca dícrota).
- `simulador.test.ts`: `aplicarTransicion` (respirador instantáneo e invalidación de pausas, rampa suave del
  paciente, rampas encadenadas, duración 0, campos no numéricos inmediatos, objetivos de gases), `programar`,
  congelar/saltar, buffer circular, TA no invasiva a los 15 s con hora, `horaSimulada`, y las ocho alarmas
  (presión alta, VTE bajo con límite configurable, desconexión/extubación, apnea, SpO₂ baja, FC alta, TA baja).
- `useApp.test.ts`: perfiles; sesión de caso (inicio, respuesta correcta, salto de tiempo al pulsar "Siguiente",
  consecuencia de opción errónea en respirador / gases / paciente y su reversión, fin de caso con puntuación y
  resumen, abandono con intento parcial, juego sin perfil).
- `progreso.test.ts` (ampliado): saneamiento de datos corruptos, `localStorage` que lanza, importación con casos
  corruptos.

### Playwright (`tests-e2e/smoke.spec.ts`, tres tamaños)

1. Arranque, aviso docente, casos deshabilitados sin perfil; captura `*-inicio.png`.
2. **Caso 1 acertando todo**: pausa inspiratoria y espiratoria (Pplat y PEEP total pasan de `--` a número y son
   visibles en pantalla), Pplat ≤ Ppico, **Congelar** (la curva de presión no cambia en 700 ms; al reanudar sí), **TA**
   (tarda 12–22 s reales, muestra la hora), feedback correcto en cada paso, alarma **VTE BAJO** tras la transición del
   paso 1 (captura `*-caso.png`), resumen 6/6 · 100 % · sin fallos · 5 puntos clave, "Mi progreso" con la fila
   completada al 100 %.
3. **Caso 3 fallando todas las preguntas** (las opciones erróneas se leen de `src/cases`, prefiriendo las que tienen
   consecuencia): cuenta atrás visible con valor 1–9 s, "Continuar ya", feedback incorrecto + respuesta correcta,
   `.opcion.correcta`/`.opcion.incorrecta`, captura `*-feedback-incorrecto.png`; resumen 0/6 · 0 % con fallos por
   tema calculados desde los datos del caso (captura `*-resumen.png`); "Mi progreso" con la fila 0 % (0/6) y las barras
   de fallos por tema cuya suma es el número de pasos; en el inicio el caso figura completado con "mejor puntuación 0 %".
4. Responder mal y salir: intento parcial registrado y caso "en curso".
5. **Modo libre**: carga, PEEP con teclado sobre el deslizador (valor programado y medido), cambio de modo a PC
   (cabecera y controles), preset "Desconexión" → alarma y vuelta; sin desplazamiento horizontal; captura
   `*-modo-libre.png`.
6. Exportar/importar como código (portapapeles) e **importar desde archivo JSON** con `setInputFiles` (perfil
   importado, mejor puntuación, fallos por tema, rechazo de un archivo inválido, persistencia tras recargar).
7. **`localStorage` bloqueado** (`Storage.prototype.setItem/getItem` lanzan): perfil, caso, respuesta, progreso en
   memoria; sin errores de página.
8. **Datos corruptos** en `simulador-vmi:progreso:v1`: JSON roto y estructura parcial (perfil sin nombre, casos con
   basura, perfil activo inexistente); la app arranca, repara y funciona; sin errores de página.
9. **Accesibilidad**: `canvas` con `role="img"` y `aria-label`, pestañas con `role=tab`/`aria-selected`/`aria-controls`,
   regiones de los monitores y grupo de parámetros con nombre, checkbox de sonido con nombre, foco visible por teclado
   (contorno ≥ 2 px), botones/opciones/pestañas/botones de los monitores ≥ 44 px en móvil (`boundingBox`), sin
   desplazamiento horizontal.

Todos los tests vigilan `pageerror`: cualquier excepción no capturada hace fallar el test.

### Capturas (`docs/capturas/`)

Regeneradas por los propios tests para `movil`, `tablet` y `escritorio`: `-inicio`, `-caso` (tras la transición del
paso 1, con la alarma VTE BAJO y la TA medida), `-feedback-incorrecto`, `-resumen` y `-modo-libre`. Se han borrado las
antiguas (solo existían `-caso` y `-resumen`, que ahora se regeneran con el mismo nombre).

### Rendimiento

`scripts/rendimiento.mjs` (móvil 390×844, dpr 3, CPU ×4), dos ejecuciones tras los cambios:

| Medida | Antes | Después |
|---|---|---|
| Caso, pestaña Ventilador | 60,2 fps (peor frame 17 ms) | 60,0–60,2 fps (peor 17–33 ms) |
| Caso, pestaña Monitor | 51,2 fps (peor 34 ms) | 59,2–59,4 fps (peor 33 ms) |
| Heap tras 1 / 6 cambios de caso | 4,1 / 4,2 MB | 4,2 / 4,3 MB |

No hay crecimiento sostenido del heap: el simulador anterior se libera al cargar otro caso (los suscriptores guardan
solo la instancia actual) y las vistas del buffer se reutilizan.

## Problemas encontrados y corregidos

### Motor

- **`src/engine/gases.ts` — coste del solver de PaO₂.** `pao2Equilibrio` resolvía la ecuación de contenidos con 25
  iteraciones de punto fijo, cada una con una búsqueda binaria de 40 pasos (≈ 1 000 evaluaciones de la curva por paso
  de 5 ms). Se sustituye por una búsqueda binaria directa sobre el contenido (monótono): 40 evaluaciones. Por debajo
  de SpO₂ 99 % el resultado es idéntico (diferencia < 1e-6). Por encima, la iteración antigua **no convergía** y daba
  SpO₂ algo baja (p. ej. 99,4 en vez de 99,9); ver "Para el integrador".
- **`src/engine/simulador.ts` — cadencia de los gases.** Los gases (τ ≥ 1 s, equilibrio que solo depende de medidas
  por ciclo) se integran ahora cada 50 ms en vez de cada 5 ms, con el mismo resultado (integración exponencial exacta;
  hay un test de equivalencia). Entre ambas cosas, el **salto de tiempo al pulsar "Siguiente"** pasa de 2,9 s a 85 ms
  por 180 s simulados (caso 8), y de ~0,75 s a ~20 ms por los 45 s habituales; en móvil con CPU ×4 esto eliminaba
  bloqueos de varios segundos.
- **`src/engine/simulador.ts` — rampas encadenadas.** Una transición del paciente que interrumpía otra rampa en curso
  congelaba a mitad de camino los parámetros que la nueva no tocaba. Ahora esos parámetros siguen hacia el destino de la
  rampa anterior.

### Estado y lógica de la app

- **`src/store/useApp.ts` — `terminarConsecuencia` no revertía bien la consecuencia de una opción errónea:**
  - Si la consecuencia solo fijaba `gases` (caso 6, paso 6: `{ gases: { spo2: 87 } }`), el objetivo de SpO₂ 87 %
    **se quedaba para siempre**: en el paso 7 la narrativa dice "SpO₂ 100 %" y el monitor mostraba 87.
  - Si la consecuencia cambiaba al paciente (caso 8, paso 3: FC basal 135, TA 175/100, sin esfuerzo), la reversión
    (rampa de 4 s) se construía e inmediatamente la transición del paso creaba otra rampa **a partir del estado de la
    consecuencia**, de modo que FC y TA basales de la consecuencia persistían si la transición del paso no las incluía.
  - Ahora se compone **una sola transición**: estado del paciente/respirador/gases acumulado por la rama correcta hasta
    ese paso, sobreescrito por la transición del paso. Hay tests para los tres tipos (respirador, gases, paciente).
- **`src/store/useApp.ts` — sesión no limpiada.** Al salir del resumen con "Volver al inicio" o "Mi progreso" la
  `sesion` quedaba en el estado. `irA` la descarta salvo al ir a `caso` o `resumen`.
- **`src/store/progreso.ts` — datos corruptos.** `cargar()` solo comprobaba `version` y que `perfiles` fuera un array:
  un perfil sin `casos` o un caso sin `intentos` rompía el inicio (`perfil.casos[c.id]` / `pc.intentos.length`).
  Nuevo `sanearDatos` (y `sanearPerfil`, `sanearProgresoCaso`): descarta perfiles sin nombre, reconstruye casos e
  intentos inválidos, exige que el perfil activo exista. `validarPerfil` (importación) lo reutiliza.
- **`src/ui/PanelCaso.tsx`** — la cuenta atrás de la consecuencia mostraba "en 0 s" durante el primer cuarto de segundo;
  ahora se calcula al montar.
- **`src/ui/Inicio.tsx`** — `URL.revokeObjectURL` justo después de `a.click()` puede cancelar la descarga del JSON en
  algunos navegadores; se difiere 1 s. El `<input type="file">` oculto tiene `aria-label` y se vacía tras importar
  para permitir importar el mismo archivo dos veces.

### Interfaz, rendimiento de dibujo y accesibilidad

- **`src/styles.css` — móvil: Pplat, PEEP total y FiO₂ no se veían.** La columna de valores del ventilador (96 px, una
  columna) solo dejaba sitio a cinco de los ocho valores y el resto quedaba recortado por `overflow: hidden`; justo los
  valores que piden las pausas. Ahora 150 px en dos columnas (el test comprueba `toBeInViewport`).
- **`src/styles.css` — desplazamiento horizontal en el modo libre (móvil).** Las opciones largas del `<select>` de
  "Situación" ensanchaban la página (el botón "Salir" no se podía pulsar). `select` a `width: 100%` y `min-width: 0`
  en las zonas del grid.
- **`src/styles.css` — foco bajo los monitores fijos.** En móvil/tablet los monitores son `sticky`; al enfocar con
  teclado un control del panel podía quedar escondido debajo. `scroll-margin-top` para botones, opciones, controles y
  títulos del panel.
- **Contraste (`src/styles.css`)**, medido con la fórmula WCAG:
  - Botón primario: blanco sobre `#2f81f7` = 3,75:1 → fondo `#1a63d6` (5,5:1); hover `#1557bd`.
  - "Sin alarmas": `#3f5b45` sobre `#070a0e` = 2,6:1 → `#6f9a78` (6,2:1).
  - Alarmas rojas y letra de la opción incorrecta: blanco sobre `#f85149` = 3,35:1 → `#cf222e` (5,4:1).
  - Letra de la opción correcta: blanco sobre `#2ea043` = 3,4:1 → `#1a7f37` (5,1:1).
  - Valores atenuados del monitor (`--`): opacidad 0,45 (3,4:1) → 0,5 (≈ 4,2:1). Los colores de las curvas sobre
    `#070a0e` están entre 7,1:1 (flujo) y 15,2:1 (volumen); el texto secundario `#9fb3c8` ≥ 7,5:1 en todos los fondos.
- **Foco visible** también en `input`, `select`, `textarea`, `summary` y en el interruptor de sonido.
- **`src/ui/*.tsx`**: checkbox de sonido con `aria-label` (antes su nombre era "🔔"); pestañas con `aria-controls` e
  identificadores en los monitores; `role="group"` en los parámetros programados; `aria-label` en el `tablist` del
  modo libre.
- **Área táctil**: el interruptor de sonido pasa de ~13 px a 44 × 36 px (casilla de 20 px). El resto de controles ya
  cumplía 44 px en móvil.
- **`src/ui/curvas.ts` — coste por frame.** El fondo de cada curva (rejilla, etiquetas y título, lo más caro por el
  texto) se cachea en un canvas fuera de pantalla por tamaño/escala; las uniones de línea pasan de `round` a `bevel`
  (800 puntos por traza); los canvas ocultos (1 × 1 en móvil) no se dibujan. La pestaña Monitor pasa de 51 a 59 fps
  con CPU ×4.

### Revisión de código sin hallazgos

`Lienzo` desconecta el `ResizeObserver` y la suscripción al frame; `iniciarBucle` es idempotente (StrictMode no duplica
el `requestAnimationFrame`); el estado "Congelar" vive en el monitor, que se desmonta al salir del caso, y la nueva
instancia del simulador nunca nace congelada; el salto de tiempo funciona aunque las curvas estén congeladas.

## Para el integrador (casos no modificados)

- **SpO₂ 99 → 100 % en pantalla.** Con el solver corregido, en los estados en que el modelo da SpO₂ ≥ 99,5 % el monitor
  muestra **100** donde antes mostraba 99. Pasos afectados (según `npm run medidas`): caso 1 paso 0, caso 3 pasos 4 y 5,
  caso 4 paso 3 y caso 8 paso 4. Las narrativas de los casos 3 y 8 citan "SpO₂ 99 %" en esos pasos; el caso 4 ya dice
  100 %. Es una discrepancia de un punto que conviene alinear en el texto ("99–100 %").
- **Caso 6, paso 6**: la consecuencia `{ gases: { spo2: 87 } }` ya se revierte (corrección en el store), pero sería más
  robusto que la transición del paso incluyera `gases: {}` explícitamente, como hacen los casos 7 y 8.
- **Caso 8, paso 3**: la consecuencia del relajante cambia `fcBase`/`tasBase`/`tadBase`; la transición del paso
  (`esfuerzoRegular`) sí los redefine, así que con la corrección del store queda bien; se anota por si se reutiliza el
  patrón en otros casos con consecuencias que toquen parámetros que la transición del paso no incluye.
- Ninguna expectativa de los ocho casos ha cambiado de resultado con las modificaciones del motor
  (`npx vitest run` y `npm run medidas` en verde; la tabla de medidas solo cambia en la columna SpO₂ citada).
- Las dudas clínicas abiertas siguen en `docs/_dudas-autores.md` (archivo del revisor, sin tocar).

## Limitaciones conocidas

- El sonido de las alarmas no se prueba en Playwright (sin audio en headless); el interruptor sí.
- Las pruebas de fps dependen de la máquina: con otros procesos en paralelo el "peor frame" sube a ~33 ms (un frame
  perdido cada varios segundos, coincidiendo con el refresco de los números cada 250 ms). Los valores medios se mantienen
  ≥ 59 fps.
- El interruptor de sonido tiene 44 × 36 px (no 44 × 44) para no agrandar la cabecera del monitor en móvil.
- Los controles deshabilitados (opciones ya respondidas, botones inactivos) quedan en torno a 4,4:1 por la opacidad
  0,5–0,55; WCAG los exime, pero si se prefiere se puede subir la opacidad a 0,6.
- La exportación a archivo (descarga) no se verifica en Playwright; sí la importación desde archivo y el código de texto.
- Las capturas se generan en los tests, por lo que `npx playwright test` las sobreescribe en cada ejecución.
