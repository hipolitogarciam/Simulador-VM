# Simulador de casos clínicos de ventilación mecánica invasiva

Aplicación web docente para médicos de Urgencias y Emergencias, hospitalarias y
prehospitalarias. Presenta casos clínicos con un **respirador y un monitor de
constantes simulados en tiempo real**: las curvas de presión, flujo y volumen, el
ECG, la pletismografía y la capnografía salen de un motor fisiológico, y el
alumno tiene que interpretarlas para responder a las preguntas.

> **Herramienta docente. No apta para decisiones clínicas reales.**

## Qué hay en la v1

- **Motor fisiológico** unicompartimental resistencia–compliance con modos VC, PC y
  PS, pausas inspiratoria y espiratoria, auto-PEEP, fuga y desconexión, secreciones,
  esfuerzo muscular (asincronía, hambre de flujo, espiración activa), gases
  (PaCO₂, EtCO₂, SpO₂) y hemodinámica (TA, FC). Todo se calcula; nada se dibuja a mano.
- **Monitor del ventilador**: tres curvas con barrido continuo, panel numérico (Ppico,
  PEEP, VTE, VM, FR, FiO₂, Pplat y PEEP total tras las pausas; gradiente, driving
  pressure, compliance estática, resistencia y auto-PEEP), parámetros programados,
  alarmas y botones de pausa inspiratoria, pausa espiratoria y congelar.
- **Monitor de constantes**: ECG, SpO₂ con pletismografía, capnograma, FC, FR y TA no
  invasiva a demanda (tarda 15 s y muestra la hora de la toma).
- **8 casos** de 5–8 pasos con preguntas tipo test, feedback explicado, consecuencias
  de las opciones erróneas y transiciones progresivas de curvas y constantes.
- **Perfiles locales** con progreso por caso, fallos por tema y exportación e
  importación (archivo JSON o código de texto para copiar y pegar).
- **Modo libre** para cambiar los parámetros del respirador sobre distintos pacientes.
- Diseño adaptable a móvil, tablet y ordenador.

## Cómo usarlo

1. Abre la aplicación (GitHub Pages) o ejecútala en local (abajo).
2. Escribe un nombre o alias para crear tu perfil (se guarda solo en tu navegador).
3. Elige un caso. Lee el escenario, observa el monitor, usa las **pausas** y el botón
   de **TA** cuando lo necesites y responde a la pregunta.
4. Al terminar, revisa el resumen con tus aciertos, fallos por tema y los puntos clave.
5. En **Mi progreso** verás tus resultados; desde el inicio puedes **exportar** tu
   progreso e **importarlo** en otro dispositivo.

### Ejecutar en local

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # tests del motor y de los casos (Vitest)
npm run build      # typecheck + build de producción en dist/
npm run e2e        # Playwright: recorrido de un caso en móvil, tablet y escritorio
npm run medidas    # tabla de medidas del motor para cada paso de cada caso
```

Para Playwright en un entorno sin descarga de navegadores, define
`PLAYWRIGHT_CHROMIUM_PATH` con la ruta a un Chromium instalado.

## Publicación en GitHub Pages

El flujo `.github/workflows/deploy.yml` construye y publica la aplicación al hacer
push a `main`. Para activarlo la primera vez: **Settings → Pages → Build and
deployment → Source: GitHub Actions**. La aplicación queda en
`https://<usuario>.github.io/Simulador-VM/` (la `base` está fijada en `vite.config.ts`).

## Cómo añadir casos

Lee `docs/GUIA_AUTORES.md`. En resumen:

1. Copia `src/cases/caso-01-intubacion-selectiva.ts` y define paciente, respirador,
   pasos (narrativa, pregunta, 4 opciones con explicación y etiqueta de tema,
   transición), puntos clave y expectativas.
2. Ejecuta `npm run medidas -- src/cases/tu-caso.ts` y escribe la narrativa con los
   números que produce el motor.
3. Regístralo en `src/cases/index.ts` y ejecuta `npm test`: los tests comprueban el
   formato, la ausencia de dosis y que las expectativas se cumplen en el motor.

## Estructura

```
src/engine/   motor fisiológico (ventilador, gases, hemodinámica, ondas, simulador)
src/cases/    esquema y casos clínicos
src/store/    estado de la app, bucle de simulación y persistencia (ProgressStore)
src/ui/       monitores en canvas, panel del caso, pantallas
src/tests/    tests Vitest
tests-e2e/    Playwright
docs/         guía de autores, revisión clínica, hoja de ruta y capturas
```

## Criterios clínicos

Las respuestas correctas siguen los criterios del curso TASSICA de VMI y VMNI en
Urgencias y Emergencias (Vt 6 ml/kg de peso ideal, Pmeseta < 30, Ppico < 45,
SatO₂ > 90 %, resistencia patológica > 15, compliance patológica < 50…). Cuando un
caso usa evidencia que no es criterio del curso (driving pressure ≤ 15, tabla
PEEP/FiO₂ de ARDSNet) lo indica en la explicación. No se incluyen dosis de fármacos.
La revisión clínica de los casos y las dudas pendientes para el validador humano
están en `docs/revision-clinica.md`.

## Licencia y aviso

Proyecto docente. No sustituye a la formación reglada ni al juicio clínico, y no
debe usarse para tomar decisiones sobre pacientes reales.
