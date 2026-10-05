# Guía para autores de casos

Esta guía explica cómo escribir un caso clínico para el simulador. El principio
fundamental es que **ningún número del texto puede contradecir lo que muestra el
monitor**: las curvas y los valores salen siempre del motor fisiológico a partir
de los parámetros del paciente y del respirador, nunca se escriben a mano.

## 1. Flujo de trabajo

1. Copia la plantilla `src/cases/caso-01-intubacion-selectiva.ts` a
   `src/cases/caso-0N-nombre.ts` y exporta una constante `casoNN: Caso`.
2. Define `pacienteInicial` y `respiradorInicial` con `paciente({...})` y
   `respirador({...})` de `src/engine/defaults.ts`.
3. Escribe los pasos con sus `transicion` (cambios del paciente o del respirador).
4. **Ejecuta el motor** y lee los números reales de cada paso:
   ```bash
   npm run medidas -- src/cases/caso-0N-nombre.ts
   ```
   La tabla muestra, para el estado inicial (paso 0) y tras la transición de cada
   paso k: Ppico, Pplat, PEEP total, auto-PEEP, gradiente, driving pressure,
   compliance estática, resistencia, VTI, VTE, VM, FR, Pmedia, Ti, Te, fuga,
   ciclado por Ti máx, flujo al final de la espiración, PaCO₂, EtCO₂, SpO₂, TA y FC
  (`FResp` = ciclos por minuto disparados por el paciente, `frEspontanea` en `MedidasPaso`).
  **Con el paciente activo (`pmus` ≠ ninguno) las pausas no dan valores fiables** (Pplat, PEEP
  total, compliance): no los cites. Y el ciclo medido es uno solo: en estados con esfuerzos
  desadaptados el VTE/PaCO₂ de la tabla varía; usa `gases` para fijar una PaCO₂ coherente.
5. Escribe la narrativa citando **esos** números (redondeados: "unos 270 ml",
   "Pplat 28"). Si no te gustan, cambia los parámetros, no el texto.
6. Escribe `expectativas` que verifiquen en el motor lo que afirma el caso
   (al menos 3; mejor 5–8). Se ejecutan en `npm test`.
7. Registra el caso en `src/cases/index.ts` y ejecuta `npm test`.

## 2. Esquema (`src/cases/schema.ts`)

- `id`, `numero`, `titulo`, `nivel` (`básico` | `intermedio` | `avanzado`),
  `ambito` (`hospital` | `prehospital`), `etiquetasTema[]`, `objetivos[]`.
- `datos`: `edad`, `sexo`, `talla` (cm, para el peso ideal), `pesoReal?`, `contexto`.
- `pacienteInicial: Paciente`, `respiradorInicial: Respirador`, `gasesIniciales?`.
- `pasos[]` (5–8): `id`, `titulo`, `narrativa` (párrafos separados por línea en
  blanco, `**negrita**`, `*cursiva*`), `pregunta`, `opciones[4]`, `transicion?`, `pista?`,
  `saltoTiempo?` (segundos de tiempo simulado que se saltan al entrar en el paso, 45 por
  defecto, para que gases y hemodinámica alcancen lo que cuenta la narrativa; usa 120–300
  si el paso dice "diez minutos después").
- `opciones[i]`: `texto`, `correcta` (exactamente una `true`), `explicacion`,
  `etiquetaTema` (una de `EtiquetaTema`), `consecuencia?` (texto) y
  `transicionConsecuencia?` (cambios temporales que ilustran el error durante ~9 s;
  después se revierten y se aplica la transición del paso).
- `transicion`: `{ paciente?: Partial<Paciente>, respirador?: Partial<Respirador>,
  duracion?: s (rampa del paciente, por defecto 8), gases?: { paco2?, spo2? } }`.
  Los parámetros del respirador cambian de golpe (como en un respirador real); los del
  paciente cambian en rampa suave de `duracion` segundos; gases y hemodinámica
  siguen su propia constante de tiempo (PaCO₂ ≈ 60 s, SpO₂ ≈ 45 s, TA/FC ≈ 15 s).
  `gases` fija objetivos directos de PaCO₂ o SpO₂ (útil para "han pasado 10 minutos");
  pon `gases: {}` para volver al modelo.
- `puntosClave[]` (3–5) y `expectativas[]`: `{ paso, descripcion, comprobar(m, todas) }`,
  donde `m` es `MedidasPaso` del paso indicado (0 = estado inicial) y `todas` el array completo.

## 3. Parámetros del paciente (`Paciente`)

| Parámetro | Unidad | Normal | Comentario |
|---|---|---|---|
| `R` | cmH₂O/L/s | 10 | Resistencia inspiratoria. Patológica > 15 |
| `Rexp` | cmH₂O/L/s | 10 | Resistencia espiratoria. `Rexp ≫ R` = obstrucción distal (asma, EPOC) |
| `C` | L/cmH₂O | 0,05 | Compliance. Patológica < 0,05 (50 ml/cmH₂O) |
| `espacioMuerto` | L | 0,15 | Anatómico + instrumental |
| `shunt` | 0–1 | 0,05 | Shunt sin PEEP |
| `reclutabilidad` | /cmH₂O | 0,02 | Reducción relativa del shunt por cmH₂O de PEEP > 5 |
| `vco2` | ml/min | 200 | Producción de CO₂ (fiebre/sepsis: 250–300) |
| `hb` | g/dl | 14 | |
| `fuga` | L/s/cmH₂O | 0 | 0,012 inaparente · 0,035 evidente · ≥ 1 desconexión |
| `secreciones` | L/s | 0 | 0,12 = dientes de sierra claros |
| `pmus` | — | `{tipo:'ninguno'}` | Ver abajo |
| `pmusGanancia` | 0–1 | 1 | Para atenuar el esfuerzo en rampa (sedación) |
| `tasBase`, `tadBase`, `fcBase` | mmHg, lpm | 125/75, 80 | Hemodinámica basal sin presión intratorácica |
| `sensibilidadPrecarga` | mmHg/cmH₂O | 1,2 | Caída de TAS por cmH₂O de Pmedia > 8 (+1,5 × auto-PEEP). Hipovolemia: 2,5–4 |
| `compresionMediastinica` | 0–1 | 0 | Neumotórax a tensión: 1 = −55 mmHg de TAS |
| `tauCO2`, `tauSpO2` | s | 60, 45 | Constantes de tiempo |
| `aletaTiburon` | 0–1 | 0 | Fuerza el capnograma obstructivo (si no, sale de `Rexp`) |
| `extubado` | bool | false | Capnografía a 0 además de la fuga |

Esfuerzo muscular `pmus`:
- `{ tipo: 'espontaneo', fr, amplitud, ti }`: respiración regular (dispara el respirador si `triggerFlujo > 0`).
- `{ tipo: 'desadaptado', amp1: 9, per1: 1.3, amp2: 5, per2: 0.55 }`: esfuerzos fuera de fase (picos y muescas).
- `{ tipo: 'hambreFlujo', amplitud: 9 }`: "hambre de flujo" en VC (presión cóncava).
- `{ tipo: 'espiracionActiva', amplitud: 14 }`: joroba de presión al final de la inspiración en PC.

## 4. Parámetros del respirador (`Respirador`)

`modo` (`VC` | `PC` | `PS`), `vt` (L), `flujo` (L/s; 0,5 = 30 L/min, 1 = 60 L/min),
`pausa` (s, VC), `fr`, `peep`, `fio2` (0,21–1), `ti` (PC), `deltaP` (PC, sobre PEEP),
`ps` (PS, sobre PEEP), `trigE` (PS, fracción del flujo pico, 0,25 = 25 %), `tiMax` (PS),
`triggerFlujo` (L/min; 0 = controlado puro; 2 = asistido), `rampa` (s), `alarmaPmax`
(cmH₂O, 40 por defecto) y `alarmaVteMin` (L, 0,3 por defecto).

En `PS`, `fr` es la frecuencia de respaldo. El paciente tiene que respirar
(`pmus: espontaneo`) y `triggerFlujo > 0` para que dispare.

## 5. Fenómenos y parámetros validados (paciente base R 10, C 0,05, PEEP 5)

| Fenómeno | Parámetros | Huella en el monitor |
|---|---|---|
| Secreciones | `R: 18, Rexp: 18, secreciones: 0.12` | VC: ↑Ppico, Pplat igual; dientes de sierra en el flujo espiratorio |
| Obstrucción proximal (tubo) | `R: 20, Rexp: 20` | PC: menos pico de flujo, volumen "en aleta de tiburón" |
| Obstrucción distal (broncoespasmo) | `R: 32, Rexp: 60` | Flujo espiratorio que no llega a 0, auto-PEEP; PC: volumen triangular |
| Intubación selectiva | `C: 0.025–0.028, shunt: 0.3–0.35` | VC: ↑Ppico y ↑Pplat con gradiente igual; PC: ↓Vt |
| Neumotórax a tensión | `C` que baja en varios pasos (0,05 → 0,035 → 0,022) + `compresionMediastinica` 0,3 → 0,8 | VC: ↑Pplat progresiva; PC: ↓Vt; ↓TA y ↑FC |
| Fuga | `fuga: 0.012` (inaparente) · `0.035` (evidente) | VTE < VTI, volumen no vuelve a 0, ↓presiones |
| Desconexión / extubación | `fuga: 5` (+ `extubado: true`) | Presiones ≈ 0, VTE ≈ 0, capnografía a 0, alarma de desconexión |
| Desadaptación | `pmus: desadaptado` | Picos y muescas en presión, flujo errático |
| Hambre de flujo (VC) | `pmus: hambreFlujo` | Presión cóncava durante la inspiración |
| Espiración activa (PC) | `pmus: espiracionActiva` | Joroba al final de la inspiración |
| PS con fuga | `modo: 'PS', fuga: 0.03` | Ciclado por Ti máximo (inspiración prolongada) |
| SDRA | `C: 0.025–0.035, shunt: 0.35–0.45, reclutabilidad: 0.04` | Pplat alta con Vt normal; SpO₂ que mejora con PEEP |
| EPOC | `R: 20, Rexp: 35, C: 0.07` | τ larga; en PS, ciclado tardío que se corrige subiendo `trigE` |

## 6. Criterios clínicos de referencia (curso TASSICA)

- Vt **6 ml/kg de peso ideal**. Peso ideal (ARDSNet): hombre 50 + 0,91 × (talla − 152,4);
  mujer 45,5 + 0,91 × (talla − 152,4). Hay una función `pesoIdeal(sexo, talla)`.
- FR 14–18 como punto de partida. FiO₂ la necesaria para **SatO₂ > 90 %**.
- Flujo 40–60 L/min. **Pmeseta < 30 cmH₂O**, **Ppico < 45 cmH₂O**. I:E 1:2;
  alargarla en patología obstructiva y acortarla en restrictiva.
- Resistencia patológica > 15 cmH₂O/L/s; compliance estática patológica < 50 ml/cmH₂O.
- Trigger inspiratorio: presión −0,5 a −2 cmH₂O, o flujo −2 a −3 L/min.
- Oxigenación: FiO₂, PEEP, Ti, pausa inspiratoria. Ventilación (CO₂): FR y Vt (presión en PC/PS).
- Si usas un criterio que no es del curso (driving pressure ≤ 15, tabla PEEP/FiO₂ de ARDSNet),
  márcalo en la explicación como "evidencia complementaria, no criterio del curso".
- **Sin dosis de fármacos**: nombra el fármaco y añade "dosis según protocolo local".
  El test rechaza cualquier número seguido de mg, mcg, µg o UI.
- Regla de oro del deterioro brusco: desconectar y ventilar con bolsa. Si mejora, el
  problema está en el respirador o el circuito; si no, en el paciente (DOPE).

## 7. Reglas de redacción

- Castellano de España; términos en inglés solo los habituales: *trigger*, *driving pressure*, *lung pulse*, auto-PEEP.
- Las preguntas obligan a **interpretar el monitor** (curvas, Pplat tras la pausa, auto-PEEP, VTE/VTI, capnograma), no solo a recordar teoría.
- Una sola respuesta correcta indiscutible; distractores plausibles con explicación de por qué son incorrectos.
- Explica en cada opción el **mecanismo**, no solo "incorrecto".
- Usa `pista` para sugerir maniobras (pausa inspiratoria, pausa espiratoria, medir TA).
- Usa `consecuencia` + `transicionConsecuencia` en al menos un distractor por caso para que el alumno vea el empeoramiento.
