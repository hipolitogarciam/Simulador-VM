# Revisión clínica independiente de los casos 1–8

Revisor clínico independiente (no autor de ningún caso). Fecha: 2026-10-05.

## 1. Resumen

**Método.** Lectura de `docs/GUIA_AUTORES.md` (secciones 6 y 7), `src/cases/schema.ts` y `docs/_dudas-autores.md`; lectura íntegra de los ocho casos; ejecución de `npm run medidas` para los ocho casos y, además, un script auxiliar que recalcula con el motor el estado que produce cada `transicionConsecuencia` para contrastar el texto de cada `consecuencia` con los números reales. Comprobación de: una sola respuesta correcta por paso, plausibilidad de los distractores, corrección fisiológica de las explicaciones, criterios del curso (y etiquetado de los complementarios), ausencia de dosis (búsqueda de `\d+ (mg|mcg|µg|UI|ml/h)` en los ocho archivos: ninguna coincidencia), coherencia narrativa–monitor, castellano y presencia de la regla de oro (desconectar y ventilar con bolsa / DOPE).

**Resultado.** 39 sustituciones de texto en los ocho archivos `src/cases/caso-0*.ts`. No se ha cambiado ningún parámetro del paciente ni del respirador ni ninguna `expectativa`. `npx tsc --noEmit`, `npx vitest run` (43 tests) y `npm run medidas` (59 expectativas) pasan tras los cambios.

| Tipo de corrección | Nº |
|---|---|
| Números de la narrativa o de una `consecuencia` que no coincidían con el motor (EtCO₂, PaCO₂, pH derivado, VM, SpO₂, TA, VTE, Ppico) | 24 |
| Regla de oro (desconectar y ventilar con bolsa / DOPE) añadida donde faltaba (casos 3, 4, 5 y 7) | 7 |
| Explicaciones fisiológicamente imprecisas o ambiguas (fuga en PC, driving pressure 15, "joroba" que el monitor no dibuja, hipoventilación no respaldada por el motor) | 4 |
| Etiquetado de criterios no del curso / alineación con SatO₂ > 90 % / anglicismo | 4 |

**Dudas para el validador humano:** 31 (incluidas las 27 que dejaron los autores, con mi opinión), consolidadas y priorizadas en la sección 4. **Ninguna duda se ha resuelto por mi cuenta.**

Nota: el árbol de trabajo tenía cambios previos sin confirmar en `src/engine/gases.ts`, `src/engine/simulador.ts` y `src/store/useApp.ts` (del integrador); no los he tocado.

---

## 2. Revisión por caso

### Caso 1 · Intubación selectiva tras transferencia de camilla (PC)

**Valoración global.** Caso bien construido y buena plantilla: todos los números de la narrativa coinciden con el motor (VTE 425 → 271 → 425 ml, Ppico 15, SpO₂, EtCO₂), las consecuencias de los distractores (PEEP 15, ΔP 20, VC 425) coinciden con lo que calcula el motor, el peso ideal es correcto (70,6 kg) y la regla de oro está en el paso 3 y en los puntos clave. Una sola respuesta correcta en cada paso; distractores plausibles.

**Correcciones realizadas.**
- Paso 2, distractor "fuga": la explicación decía que con fuga "la presión tendería a bajar". En presión control el respirador mantiene la presión aportando más flujo; la huella de la fuga en PC es VTE < VTI, volumen que no vuelve a 0 y flujo inspiratorio que no llega a cero. Reescrita.

**Dudas para el validador humano.**
1. Paso 3: el EtCO₂ "sube hacia los 55 mmHg"; el motor da 57. Lo he dejado (es una tendencia, no una lectura), pero si se prefiere la cifra exacta: 57.
2. Acrónimo DOPE con "Pneumotórax" (con P) para conservar el acrónimo inglés; aparece igual en los casos 2, 3, 6 y 8. Decidir si se mantiene así (es lo habitual en los cursos) o se castellaniza.

### Caso 2 · Neumotórax a tensión durante el traslado de un politraumatizado (VC)

**Valoración global.** Muy sólido. Las tres fases (referencia → compliance en descenso → tensión) se reflejan en Pplat 14 → 18 → 26 con gradiente fijo ≈ 7, y en TA 118 → 101 → 74. Consecuencias verificadas con el motor (PEEP 12: Ppico 40, Pplat 33, TA 57/50, FC 158; Vt 350: Ppico 28,5, Pplat 21). Regla de oro presente (paso 3 y puntos clave). Diferencial selectiva/neumotórax con lung pulse y punto pulmonar correcto.

**Correcciones realizadas.**
- Paso 2 (narrativa): EtCO₂ "30" → "29–30" (motor 29,4).
- Paso 3 (narrativa): EtCO₂ "baja a 28" → "27" (motor 27,2).
- Paso 3, distractor "Vt 350": "EtCO₂ sube hacia 43" → "hacia 42" (motor 41,7), en explicación y consecuencia.

**Dudas para el validador humano.**
1. *(Autores)* Lugar de la punción: "4.º–5.º EIC línea axilar anterior/media, o 2.º EIC línea medioclavicular, según protocolo, o toracostomía digital si tienes la competencia". Mi opinión: ATLS (10.ª ed.) recomienda en el adulto el 4.º–5.º EIC en línea axilar anterior/media por la menor probabilidad de no alcanzar la pleura; el 2.º EIC medioclavicular sigue vigente en muchos protocolos del SEM. La redacción actual cubre ambas y es correcta; el validador debe decidir si el curso fija una sola.
2. *(Autores)* Con flujo 45 L/min y Vt 450 sin pausa, Ti 0,6 s y I:E ≈ 1:5 (el curso parte de 1:2). No se cita en el texto. Mi opinión: en un pulmón sano no tiene consecuencias y el diseño (sin pausa programada, para obligar a pulsarla) lo justifica; bastaría una frase en la explicación del paso 1 ("I:E resultante ≈ 1:5, aceptable") o bajar el flujo a 30 L/min (cambia los números del motor: no lo he hecho).
3. *(Autores)* Grado de hipotensión: TA 118/72 → 101/66 → 74/56 con `sensibilidadPrecarga` 2,5. Mi opinión: progresión y presión de pulso estrecha plausibles para un neumotórax a tensión en un hipovolémico leve; adecuado para la docencia.
4. Alarma de presión máxima en 30 cmH₂O con Ppico 21–22 (9 por encima). Es coherente con "10 por encima de la Ppico", pero no con el "15–20 por encima" que afirma el caso 6. Véase la duda transversal sobre el criterio de la alarma.

### Caso 3 · Asma grave intubada: auto-PEEP e hipotensión (VC)

**Valoración global.** Clínicamente excelente (gradiente resistivo, auto-PEEP medida con la pausa espiratoria, desconexión diagnóstica y terapéutica, FR como palanca, Ppico alta con Pplat baja). Consecuencias de los cinco distractores con `transicionConsecuencia` verificadas con el motor (todas coinciden). Problema principal: la narrativa citaba PaCO₂ 76/EtCO₂ 68 y el motor da 74/66 (los autores anotaron 76; el motor ha cambiado desde entonces). Faltaba la regla de oro explícita.

**Correcciones realizadas.**
- Paso 5 y paso 6 (narrativa): "PaCO₂ 76 mmHg (EtCO₂ 68)" → "PaCO₂ 74 mmHg (EtCO₂ 66)"; paso 6, distractor "no tocar nada": "PaCO₂ de 76" → "de 74".
- Paso 6, explicación correcta: "la PaCO₂ baja hacia 57" → "hacia 55" (motor 55,4).
- Regla de oro: añadida a la explicación de la respuesta correcta del paso 3 (desconectar, dejar espirar y ventilar con bolsa; si mejora, respirador/circuito; si no, paciente/tubo: DOPE) y al punto clave 2, con el matiz del obstructivo (dejar espirar antes de ventilar con bolsa).

**Dudas para el validador humano.**
1. **PaCO₂ 74 mmHg y "pH por encima del umbral de vuestro protocolo" (paso 5).** Con bicarbonato normal (24 mmol/L) en una asmática de 28 años con 12 h de evolución, PaCO₂ 74 da pH ≈ 7,13–7,15 (Henderson-Hasselbalch), por debajo de los umbrales habituales de hipercapnia permisiva (7,20–7,25). Para que la afirmación sea cierta haría falta HCO₃⁻ ≥ 28. Opciones: (a) citar un pH explícito (≈ 7,15) y decir que el protocolo del asma lo tolera transitoriamente mientras cede la obstrucción (varios protocolos aceptan ≥ 7,15 en el asma); (b) reducir `vco2` o subir FR a 14 para una PaCO₂ ≈ 60–65 (cambia el motor); (c) dejarlo. No lo he tocado. **Prioridad alta.**
2. *(Autores)* I:E ≈ 1:14 (Ti 0,34 s con Vt 340 a 60 L/min), presentada como "mucho más larga que 1:4–1:5". Mi opinión: aritméticamente correcta y clínicamente inocua; convendría citar la cifra ("I:E ≈ 1:14") para que el alumno la vea.
3. *(Autores)* El motor no calcula pH y no se cita valor numérico. Relacionado con la duda 1.
4. *(Autores)* Hipercapnia permisiva con VM 4,0 L/min: PaCO₂ 74. Mi opinión: en el asma casi fatal es aceptable *si* el pH lo tolera (duda 1).
5. *(Autores)* Ppico 43 con alarma en 40, mensaje "Ppico resistiva aceptable con Pplat 13". Mi opinión: correcto (el curso fija Ppico < 45 y Pplat < 30). Pero la respuesta correcta propone "subir el límite de alarma (p. ej. a 50)", por encima del límite de 45 del curso; sugiero "unos cmH₂O por encima de la Ppico actual (p. ej. 45–48)".
6. *(Autores)* La subida de TA al desconectar no está modelada y se describe cualitativamente (paso 4). Aceptable.
7. *(Autores)* "El residente sube la FR a 22" como transición narrativa tras una respuesta correcta en el paso 1. Mi opinión: recurso didáctico aceptable; el alumno ya ha interpretado bien y se le enseña la consecuencia del error ajeno.
8. Paso 1: la narrativa dice que nadie ha medido la TA desde la intubación, pero el motor calcula TA 81/61 ya en el estado inicial. Comprobar que la interfaz no muestra la TA en ese paso (si la muestra, hay contradicción con "nadie ha vuelto a medir la tensión").

### Caso 4 · EPOC agudizada intubada: atrapamiento aéreo y paso a presión soporte (VC → PS)

**Valoración global.** Muy completo y didácticamente fino (atrapamiento → patrón obstructivo → retenedor crónico → PS con ciclado tardío → trigger espiratorio). Los pH calculados a mano con HCO₃⁻ 30 son correctos: 7,17 (85), 7,42 (48), 7,37 (54). Consecuencias de los siete distractores verificadas con el motor. Faltaba la regla de oro.

**Correcciones realizadas.**
- Paso 4 (narrativa): "volumen minuto ha subido a 7,5 L/min" → "a unos 7 L/min" (motor 7,0).
- Paso 6 (narrativa, texto de la opción correcta y su explicación): "pH 7,37, PaCO₂ 54" → "pH 7,36, PaCO₂ 55" (motor 54,8; pH recalculado con HCO₃⁻ 30).
- Paso 5 (narrativa): "la presión hace una pequeña joroba antes de ciclar" → aclarado como lo que se vería en un respirador real, porque el motor no la dibuja en PS (contradicción narrativa–monitor señalada por los autores).
- Regla de oro añadida al punto clave 1 (desconectar dejando espirar y ventilar con bolsa; si mejora, respirador/circuito; si no, paciente/tubo: DOPE).

**Dudas para el validador humano.**
1. *(Autores)* PEEP externa 5 tras la corrección aunque la auto-PEEP medida baja a 1,4; regla del 80 % etiquetada como complementaria. Mi opinión: correcto; 5 es la PEEP mínima habitual y el texto explica que su utilidad llegará con el disparo espontáneo.
2. *(Autores)* PaCO₂ inicial fijada en 48 con `gasesIniciales` y pH a mano. Verificados; coherentes.
3. *(Autores)* Vt final en PS 351 ml (4,8 ml/kg) con PaCO₂ 55, "aceptable en un EPOC cómodo". Mi opinión: defendible (el 6 ml/kg del curso es para el volumen impuesto; en PS el paciente elige), pero conviene que el validador confirme que el curso acepta Vt espontáneos < 6 ml/kg sin subir la PS.
4. *(Autores)* Distractores PS 20 y trigger espiratorio 10 %: en el motor la FR total cae a 12 por esfuerzos ineficaces. Verificado; las explicaciones lo describen correctamente.
5. *(Autores, nota del integrador)* La pausa espiratoria funciona en PS (PEEP total 9,6 con trigger 25 % → 7,8 con 45 %). La narrativa del paso 4 dice "ya no puedes hacer una pausa espiratoria fiable porque el paciente dispara" (en VC asistido), coherente con la guía (pausas no fiables con `pmus` activo). No afirma que no pueda hacerse en PS; no lo he tocado. Si el validador quiere aprovechar el dato, podría citarse en el paso 6 que la PEEP total medida baja de ≈ 9,6 a ≈ 7,8.
6. Paso 5, distractor "bajar el Ti máximo a 1,0 s": en algunos respiradores es una herramienta legítima para el ciclado tardío. La explicación lo rebate bien (es límite de seguridad, no criterio de ciclado); confirmar que el curso lo considera incorrecto y no "segunda opción".

### Caso 5 · SDRA por neumonía en una paciente obesa (VC)

**Valoración global.** Correcto y muy útil (peso ideal frente a real, ventilación alveolar y espacio muerto, PEEP por shunt, Pplat < 30, mecánica final). Los gases calculados a mano con HCO₃⁻ 22 cuadran (7,13 con 69; 7,27 con 49), salvo el inicial. Consecuencias de los ocho distractores verificadas con el motor (todas coinciden). Criterios complementarios (driving pressure ≤ 15, tabla ARDSNet) bien etiquetados. Faltaba la regla de oro.

**Correcciones realizadas.**
- Paso 1 (narrativa): pH "7,50" → "7,51" (Henderson-Hasselbalch con HCO₃⁻ 22 y PaCO₂ 28).
- Paso 1, distractor "8 ml/kg": la explicación decía que con DP 15 "seguiríamos por encima del objetivo", ambiguo (15 es justo el límite complementario). Reescrita: DP en el límite de 15 (complementaria) y Vt un tercio por encima del objetivo de 6 ml/kg sin justificación.
- Paso 2, distractor "no cambio nada": el umbral de pH 7,20–7,25 etiquetado como "según protocolo local; no es un criterio del curso".
- Regla de oro añadida a la explicación correcta del paso 5 (traslado): desconectar y ventilar con bolsa con válvula de PEEP; si mejora, respirador/circuito; si no, paciente (DOPE).

**Dudas para el validador humano.**
1. *(Autores)* PEEP 14 con FiO₂ 0,6: entre la tabla de PEEP baja (10) y la de PEEP alta (16–20) de ARDSNet; con PEEP 12 el motor da SpO₂ 91 %. Mi opinión: razonable y bien etiquetado como complementario; el techo lo marcan Pplat 25,5 y la TA, como dice el texto.
2. *(Autores)* Gases a mano (PaO₂ 62 con SpO₂ 91 %, pH 7,13/7,27): coherentes. Hipercapnia permisiva final 49/7,27 con FR 28: aceptable.
3. *(Autores)* Vt inicial 660 ml = 12,6 ml/kg con PaCO₂ 28: coherente con el error "6 ml/kg de peso real".
4. *(Autores)* Distractor "8 ml/kg" con Pplat ≈ 23 y DP 15: corregida la redacción (véase arriba); confirmar que el validador está de acuerdo en que no es defendible.
5. Paso 4, respuesta correcta: "si la TAM baja de 65, vasopresor según protocolo local". Umbral no del curso (estándar en sepsis); decidir si se etiqueta.
6. Alarma de presión máxima en 45 con Ppico 41 inicial: coherente con el límite del curso, pero véase la duda transversal sobre el criterio de la alarma.

### Caso 6 · Secreciones y tapón mucoso en un traslado interhospitalario (VC)

**Valoración global.** Correcto y claro (valores de referencia, R = gradiente/flujo, dientes de sierra, obstrucción proximal frente a broncoespasmo, sonda que no pasa → cambiar el tubo). Regla de oro presente (paso 5 y puntos clave). Consecuencias de los seis distractores verificadas con el motor. Discrepancia menor de EtCO₂ (narrativa 35, motor 34).

**Correcciones realizadas.**
- Pasos 1, 2 y 7 (narrativa) y paso 1, distractor "FR 24": EtCO₂ "35" → "34" (motor 34,0).
- Paso 6 (narrativa): TA "122/72" → "123/72" (motor).

**Dudas para el validador humano.**
1. *(Autores)* La desaturación del tapón se modela con aumento del shunt (atelectasia por secreciones distales) porque el motor entrega siempre el Vt programado en VC. Mi opinión: aceptable y el texto lo explica ("secreciones distales y atelectasia"). Pero véase la duda transversal: en un respirador real, con Ppico 43 y alarma en 40, el ciclo se recortaría y el VTE caería; la narrativa dice "el VTE sigue marcando 420 ml".
2. *(Autores)* Rexp del tapón = 30 para que la auto-PEEP quede ≈ 1 y el flujo espiratorio llegue a 0: coherente con "obstrucción proximal".
3. *(Autores)* I:E ≈ 1:6 (Ti 0,56 s) no citada. Misma opinión que en el caso 2.
4. *(Autores)* "Presión del balón 20–30 cmH₂O": no aparece en este caso sino en el 7 (paso 5), donde es correcta (recomendación estándar 20–30 cmH₂O).
5. *(Autores)* Alarma de presión "unos 15–20 por encima de la Ppico" (paso 7). Mi opinión: la recomendación más extendida es ≈ 10 cmH₂O por encima de la Ppico (o 40 como techo); "15–20" es ancho y contradice el caso 2 (alarma 30 con Ppico 21). Sugiero "unos 10 por encima de la Ppico, sin pasar de 45". Véase duda transversal.
6. Paso 6, respuesta correcta: cambio de tubo por retirada y reintubación. Algunos protocolos usan un intercambiador de tubo; decidir si se menciona.

### Caso 7 · Fuga, desconexión y extubación accidental camino del TC (PC)

**Valoración global.** Buen caso de capnografía y fugas; recorrido sistemático del circuito y manejo de la extubación correctos; presión del balón 20–30 cmH₂O y "onda sostenida" como confirmación correctos. Discrepancias de SpO₂ con el motor y una consecuencia (VC con fuga) con cifras desfasadas. La regla de oro estaba implícita ("ante la duda, ventilar con bolsa") pero no formulada.

**Correcciones realizadas.**
- Paso 2 (narrativa): SpO₂ "99 %" → "100 %" (motor 99,8).
- Paso 3 (narrativa): SpO₂ "98 %" → "todavía 100 %" (motor 99,8).
- Paso 3, distractor "VC 450 ml": "VTE ≈ 30 ml, Ppico 10" → "≈ 20 ml, Ppico 13" (motor: VTE 21 ml, Ppico 13,0), en explicación y consecuencia.
- Paso 3, distractor "hacer el TC": "con VM 3,7 y EtCO₂ cayendo el paciente está hipoventilado ahora" (el motor mantiene PaCO₂ 39 porque usa el volumen que entra al pulmón) → reescrito como "no sabes qué parte del VTI llega al pulmón; puede estar hipoventilándose".
- Paso 1: "sensor mainstream" → "sensor en línea (mainstream)".
- Regla de oro añadida a la explicación correcta del paso 3 (desconectar y ventilar con bolsa por el tubo; si ventila bien, circuito/respirador; si también fuga, tubo/balón: la D de DOPE) y al punto clave 4.

**Dudas para el validador humano.**
1. *(Autores)* Fuga inaparente = 0,004 (≈ 21 % medido): un 21 % no es del todo "inaparente", pero no hace saltar la alarma de VTE bajo (411 ml) y el texto lo trata como "pequeña". Aceptable.
2. *(Autores)* EtCO₂ 31 con la fuga inaparente y ≈ 8 con la evidente (dilución en la Y). Mi opinión: coherente con el fenómeno real; bien explicado.
3. *(Autores)* Apnea tras la extubación fijada con `gases` (86 % → 94 %). Aceptable.
4. *(Autores)* "Onda de capnografía sostenida durante varios ciclos": correcto (evita confundirla con CO₂ gástrico); si se quiere cifra, "al menos 6 ciclos" es lo habitual en los textos de vía aérea, no criterio del curso.
5. En el estado de fuga evidente (76 %) el motor mantiene SpO₂ 100 % y PaCO₂ 39: en la realidad una fuga glótica de ese tamaño acabaría hipoventilando y desaturando. La narrativa ya no lo contradice (corregida), pero el validador debe decidir si el mensaje "el paciente puede estar hipoventilándose" es suficiente.

### Caso 8 · Desadaptación y asincronía al despertar en traslado (PC controlado → asistido)

**Valoración global.** Buen caso de asincronía y sedoanalgesia en traslado; causas corregibles antes de relajar; normocapnia en el TCE; FR de respaldo por debajo de la del paciente. Regla de oro presente (paso 3, paso 6 y puntos clave). Consecuencias verificadas en lo que el motor puede dar (Ti 1,4: Ppico 25; FR 20: FR total 22, Te 0,8, VTE 310; relajante: TA 175/100, FC 135). Discrepancias de VM con el motor.

**Correcciones realizadas.**
- Paso 4 (narrativa): "TA 138/83, FC 100" → "139/84, FC 101" (motor).
- Paso 5 (narrativa y texto de la opción correcta): "VM 12 L/min" → "unos 11 L/min" (motor 11,2).
- Paso 6 (narrativa): "VM 7,8" → "7,6" (motor) y "≈ 6 ml/kg" → "≈ 5,7 ml/kg de peso ideal, en el objetivo de 6" (434 ml / 77 kg).
- Paso 6, opción correcta: "bajar la FiO₂ a 0,4 para SpO₂ > 94 %" → "para SatO₂ > 90 % (en el TCE, con margen: ≥ 94 %)", alineado con el criterio del curso conservando el matiz del TCE.

**Dudas para el validador humano.**
1. *(Autores)* PaCO₂ del estado desadaptado fijada con `gases` (28–30) por la variabilidad ciclo a ciclo del VTE. Aceptable y documentado en el archivo.
2. *(Autores)* Hipocapnia EtCO₂ 17 en asistido (22 × 560 ml) sin retroalimentación del impulso respiratorio. Mi opinión: en la realidad la hipocapnia reduciría el impulso; se usa como enseñanza (normocapnia en el TCE) y el texto es correcto. Aceptable si el validador lo asume.
3. *(Autores)* VTE 434 ml (5,7 ml/kg) redondeado a "≈ 6": corregido a "≈ 5,7, en el objetivo de 6".
4. *(Autores)* Distractor "pasar a PS" en el paso 6: el motor daría números aceptables con PS 8; la opción incluye "retirar la sedación" a 10 min del destino en un TCE con dolor, lo que la hace claramente incorrecta. De acuerdo con los autores.
5. *(Autores)* Alarma de VTE bajo intermitente en el estado desadaptado (mínimo ≈ 300 con límite 300). Coherente con la narrativa ("salta de forma intermitente").
6. Paso 3, distractor "ΔP 20": "los ciclos grandes superan los 1.000 ml". El motor mide un solo ciclo (679 ml); no puedo verificar el máximo. Comprobar en la interfaz.

---

## 3. Observaciones transversales

1. **pH calculado a mano.** El motor no calcula pH. Los valores citados en los casos 4 y 5 son coherentes con Henderson-Hasselbalch y el bicarbonato indicado (he corregido 7,50 → 7,51 en el caso 5 y 7,37/54 → 7,36/55 en el caso 4). En el caso 3 no se cita pH, pero la PaCO₂ de 74 implica ≈ 7,13–7,15 con bicarbonato normal, en conflicto con "pH por encima del umbral" (duda prioritaria). Si el motor cambia la PaCO₂ de algún paso, los pH quedan desfasados: convendría que la guía exija recalcularlos (o que el motor los derive de un HCO₃⁻ del paciente).
2. **El motor no limita por presión en VC.** En los casos 2 y 6 la Ppico supera la alarma (33 > 30; 43 > 40) y el VTE sigue siendo el programado. En un respirador real el ciclo se recorta y el VTE cae (el caso 2 lo insinúa: "recorta algún ciclo"; el caso 6 afirma "el VTE sigue marcando 420 ml"). Decidir si se acepta como limitación o se añade al motor.
3. **Pausas con paciente activo.** La guía avisa de que Pplat/PEEP total no son fiables con `pmus` activo; el caso 4 (paso 4) lo dice al alumno, pero la interfaz seguirá mostrando un valor si pulsa el botón; y el integrador indica que en PS la pausa espiratoria sí da valores coherentes (9,6 → 7,8). Conviene una regla única en la guía y en la interfaz (p. ej. marcar el valor como "no fiable").
4. **Criterio de la alarma de presión máxima.** Es distinto en cada caso: 30 con Ppico 21 (caso 2), 40 con Ppico 37 y "subir a 50" (caso 3), 45 con Ppico 41 (caso 5), 40 "unos 15–20 por encima" (caso 6). Propongo fijar en la guía un criterio único (p. ej. ≈ 10 cmH₂O por encima de la Ppico y nunca por encima de 45, el límite del curso) y revisar los cuatro textos.
5. **Regla de oro.** Ahora aparece en los ocho casos (añadida en 3, 4, 5 y 7). En los obstructivos (3 y 4) se ha matizado "desconectar y dejar espirar antes de ventilar con bolsa", que es lo clínicamente correcto; en el SDRA (5), "con válvula de PEEP". Confirmar que el curso enseña esos matices.
6. **Criterios complementarios.** Driving pressure ≤ 15, tabla PEEP/FiO₂ de ARDSNet y regla del 80 % de la auto-PEEP están etiquetados. He etiquetado también el umbral de pH 7,20–7,25 (caso 5). Quedan sin etiqueta: TAM 65 (caso 5), "onda sostenida" (caso 7) y los objetivos de normocapnia del TCE (35–40 mmHg, casos 1 y 8), que son práctica estándar.
7. **Terminología.** "Respirador" se usa de forma uniforme (no aparece "ventilador"). Anglicismos presentes: trigger, driving pressure, lung pulse, auto-PEEP (admitidos), compliance y shunt (de uso universal en castellano clínico), eFAST, "mainstream" (ahora "sensor en línea (mainstream)"), "Pneumotórax" en el acrónimo DOPE. Sin dosis de fármacos en ningún caso.
8. **Ninguna contradicción numérica pendiente** entre narrativa y motor tras las correcciones, con dos salvedades aceptables: tendencias ("hacia los 55") y valores del estado desadaptado del caso 8 que el motor no puede dar (oscilación 300–800 ml).

---

## 4. Lista consolidada de dudas pendientes, por prioridad

**Prioridad alta (afectan a la corrección clínica del mensaje)**
1. Caso 3, paso 5: PaCO₂ 74 con "pH por encima del umbral del protocolo" (pH real ≈ 7,13–7,15 con HCO₃⁻ normal). Citar pH y umbral del asma, o cambiar parámetros.
2. Transversal: criterio único para la alarma de presión máxima (casos 2, 3, 5, 6) y, en particular, "subir a 50" en el caso 3 (por encima del límite de 45 del curso) y "15–20 por encima" en el caso 6.
3. Caso 2, paso 5: lugar de punción que fija el curso (2.º EIC medioclavicular frente a 4.º–5.º EIC axilar anterior/media) o mantener "según protocolo".

**Prioridad media (coherencia simulador–realidad)**
4. Transversal: el motor no recorta el ciclo al superar la alarma de presión en VC (casos 2 y 6).
5. Caso 7, paso 3: con fuga del 76 % el motor mantiene PaCO₂ y SpO₂; aceptar el mensaje "puede estar hipoventilándose".
6. Caso 3, paso 1: TA calculada por el motor (81/61) mientras la narrativa dice que no se ha medido; comprobar la interfaz.
7. Transversal: pausas con paciente activo (caso 4 paso 4; nota del integrador sobre PS) — regla única en guía e interfaz.
8. Caso 4, paso 6: Vt espontáneo 351 ml (4,8 ml/kg) en PS presentado como aceptable.
9. Caso 8, paso 5: hipocapnia 17 mmHg sin retroalimentación del impulso respiratorio (limitación asumida como enseñanza).

**Prioridad baja (redacción o preferencia)**
10. Casos 2 y 6: citar la I:E resultante (≈ 1:5 y 1:6) o bajar el flujo (cambia el motor).
11. Caso 3: citar I:E ≈ 1:14 y la transición "el residente sube la FR a 22".
12. Caso 4, paso 5: distractor "Ti máximo 1,0 s" como herramienta legítima en algunos respiradores.
13. Caso 5: umbral TAM 65 y PEEP 14 con FiO₂ 0,6 (entre las dos tablas ARDSNet).
14. Caso 6, paso 6: mencionar el intercambiador de tubo.
15. Caso 7: "onda sostenida" sin cifra de ciclos; fuga "inaparente" del 21 %.
16. Caso 8, paso 3: "ciclos grandes > 1.000 ml" con ΔP 20 no verificable con el motor (un solo ciclo medido).
17. Acrónimo DOPE con "Pneumotórax" (casos 1, 2, 3, 6, 8).
18. Caso 1, paso 3: "EtCO₂ hacia los 55" (motor 57).
