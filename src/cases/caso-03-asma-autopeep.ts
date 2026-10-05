import type { Caso } from './schema';
import { paciente, respirador } from '../engine/defaults';

/**
 * Caso 3 · Asma grave intubada: auto-PEEP e hipotensión por una programación inadecuada (VC).
 * La narrativa cita solo números que produce el motor (ver `npm run medidas -- src/cases/caso-03-asma-autopeep.ts`).
 *
 * Decisión de diseño: sin pausa inspiratoria programada, para que el alumno use los botones de
 * pausa inspiratoria (Pplat) y espiratoria (PEEP total / auto-PEEP). La PaCO₂ se fija en 70 mmHg
 * (status asmático recién intubado) hasta que se reprograma el respirador; a partir de ahí la calcula el modelo.
 */
const pacienteBase = paciente({
  R: 30,
  Rexp: 55, // obstrucción distal: la espiración es mucho más lenta que la inspiración
  C: 0.05,
  espacioMuerto: 0.15,
  shunt: 0.1,
  reclutabilidad: 0.02,
  vco2: 200,
  tasBase: 128,
  tadBase: 78,
  fcBase: 105,
  // Deshidratada y con sedación profunda: muy sensible a la presión intratorácica.
  sensibilidadPrecarga: 2.75,
  pmus: { tipo: 'ninguno' },
});

/** Programación inicial inadecuada: Vt alto, FR alta y flujo bajo para una obstrucción grave. */
const respiradorBase = respirador({
  modo: 'VC',
  vt: 0.45,
  flujo: 0.5, // 30 L/min
  pausa: 0, // sin pausa programada: hay que pulsar el botón
  fr: 20,
  peep: 5,
  fio2: 0.6,
  triggerFlujo: 0,
  alarmaPmax: 40,
});

/** Programación obstructiva: Vt 6 ml/kg de peso ideal, FR baja, flujo alto (Ti corto, Te largo). */
const programacionObstructiva = { vt: 0.34, fr: 12, flujo: 1.0 };
/** Una hora de tratamiento broncodilatador: la obstrucción cede en parte. */
const mejoria = { R: 20, Rexp: 35 };

export const caso03: Caso = {
  id: 'caso-03-asma-autopeep',
  numero: 3,
  titulo: 'Asma grave intubada: auto-PEEP e hipotensión',
  nivel: 'intermedio',
  ambito: 'hospital',
  etiquetasTema: ['auto-PEEP', 'programación obstructiva', 'hemodinámica', 'resistencia frente a compliance', 'ventilación y CO2'],
  objetivos: [
    'Usar las pausas inspiratoria y espiratoria para medir Pplat, gradiente Ppico − Pplat y auto-PEEP, y reconocer en la curva de flujo la espiración que no termina.',
    'Explicar la hipotensión del asmático ventilado por la hiperinsuflación dinámica (auto-PEEP → ↓retorno venoso) y confirmarla desconectando del respirador.',
    'Programar el respirador en la obstrucción grave: FR baja como palanca principal, Ti corto con flujo alto, Vt 6 ml/kg de peso ideal, I:E muy larga.',
    'Aceptar una Ppico alta mientras la Pplat esté controlada (< 30) y una hipercapnia permisiva mientras el pH lo tolere.',
    'Diferenciar auto-PEEP de neumotórax a tensión con las pausas y la ecografía.',
  ],
  datos: {
    edad: 28,
    sexo: 'mujer',
    talla: 165,
    pesoReal: 60,
    contexto:
      'Asmática conocida con dos ingresos previos en UCI. Acude a Urgencias por crisis de 12 horas de evolución sin respuesta al tratamiento en domicilio. ' +
      'A su llegada: habla con monosílabos, silencio auscultatorio, uso de musculatura accesoria, agotamiento y somnolencia. Gasometría previa a la intubación: PaCO₂ 70 mmHg con acidosis respiratoria. ' +
      'Se intuba en el box de críticos con secuencia rápida (ketamina y relajante según protocolo local); mantiene sedación y relajación profundas. TA en la intubación 128/78.',
  },
  pacienteInicial: pacienteBase,
  respiradorInicial: respiradorBase,
  gasesIniciales: { paco2: 70 },
  pasos: [
    {
      id: 'p1',
      titulo: 'Recién conectada al respirador',
      narrativa:
        'Mujer de 28 años, **165 cm** y 60 kg, con asma casi fatal, intubada hace cinco minutos. El residente la ha conectado en **volumen control: Vt 450 ml, FR 20, flujo 30 L/min, PEEP 5, FiO₂ 0,6**, sin pausa inspiratoria, alarma de presión en 40 cmH₂O.\n\n' +
        'Monitor: **Ppico 37 cmH₂O**, VTI = VTE 450 ml, SpO₂ 99–100 %, EtCO₂ 62 mmHg, FC 147. La curva de presión tiene un **salto inicial muy grande** antes de la rampa. ' +
        'En la curva de flujo, la espiración desciende despacio y **no llega a cero antes de que empiece la siguiente inspiración**: el respirador corta el flujo espiratorio en unos −8 L/min. El capnograma tiene forma de aleta de tiburón.',
      pregunta: 'Pulsas la pausa inspiratoria. ¿Cómo interpretas la Ppico de 37 y lo que ves?',
      pista: 'Pausa inspiratoria: compara Ppico con Pplat. El gradiente es la presión que se pierde en la resistencia (R × flujo).',
      opciones: [
        {
          texto: 'Pplat ≈ 22 cmH₂O y gradiente Ppico − Pplat ≈ 15: la Ppico es alta por la resistencia (R ≈ 30 cmH₂O/L/s), mientras que la presión alveolar está controlada. Es obstrucción grave de la vía aérea, y la espiración que no termina avisa de atrapamiento aéreo.',
          correcta: true,
          explicacion:
            'El salto inicial de la curva de presión y el gradiente de ≈ 15 cmH₂O (R × flujo = 30 × 0,5) son la firma de la resistencia alta; la Pplat (≈ 22) es la presión que de verdad recibe el alvéolo y está por debajo de 30. ' +
            'Compliance = 450/(22 − PEEP total): fíjate en que para calcularla bien hace falta la PEEP total, no la PEEP programada. La espiración que se corta sin llegar a cero es el signo más precoz de auto-PEEP: el pulmón no ha terminado de vaciarse cuando entra el siguiente volumen.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'Pplat alta con gradiente normal: la compliance ha caído y hay que descartar neumotórax (barotrauma por el asma).',
          correcta: false,
          explicacion:
            'La pausa muestra justo lo contrario: la Pplat es moderada (≈ 22) y es el gradiente (≈ 15) el que está disparado. En un neumotórax la Pplat subiría con el gradiente igual. Aun así, en el asmático ventilado el neumotórax siempre está en la lista: la ecografía (deslizamiento bilateral) lo descarta en segundos.',
          etiquetaTema: 'neumotórax',
        },
        {
          texto: 'La curva de presión indica "hambre de flujo": la paciente tira del respirador y hay que subir el flujo o pasar a PS.',
          correcta: false,
          explicacion:
            'La paciente está relajada: no hay esfuerzos. El hambre de flujo se ve como una concavidad de la presión durante la inspiración (la presión sube menos de lo esperado), no como un salto inicial grande. Aquí la presión salta porque el flujo atraviesa una resistencia enorme. En PS, una paciente relajada no dispararía ningún ciclo.',
          etiquetaTema: 'asincronía',
        },
        {
          texto: 'La espiración incompleta indica fuga en el circuito: por eso el flujo no vuelve a cero.',
          correcta: false,
          explicacion:
            'Con fuga, el VTE sería menor que el VTI y la curva de volumen no volvería a la línea base; aquí VTI = VTE = 450 ml. El flujo espiratorio no llega a cero porque la constante de tiempo espiratoria (Rexp × C) es muy larga y el Te es corto: es atrapamiento, no fuga.',
          etiquetaTema: 'fuga y desconexión',
        },
      ],
      // Al ver el EtCO₂ de 62 el residente sube la FR a 22 "para lavar CO₂".
      transicion: { respirador: { fr: 22 } },
    },
    {
      id: 'p2',
      titulo: 'Sube la FR y cae la tensión',
      narrativa:
        'Mientras preparas la medicación broncodilatadora (según protocolo local), el residente ha subido la **FR a 22** "para bajar el CO₂". Diez minutos después el **EtCO₂ sigue en 61 mmHg**, la **Ppico ha subido a 39** y la **FC a 157**. ' +
        'El Te ahora es de 1,8 s y el flujo espiratorio se corta en unos −10 L/min. SpO₂ 99 %.\n\n' +
        'Nadie ha vuelto a medir la tensión desde la intubación (128/78).',
      pregunta: 'Pulsas la pausa espiratoria y mides la TA. ¿Qué explica lo que encuentras?',
      pista: 'Pausa espiratoria: la PEEP total menos la PEEP programada es la auto-PEEP. Y mide la TA: lleva diez minutos sin medirse.',
      opciones: [
        {
          texto: 'PEEP total ≈ 17 cmH₂O, es decir, auto-PEEP ≈ 12, y TA 70/57. Con Te de 1,8 s la paciente no termina de espirar: hiperinsuflación dinámica → presión intratorácica alta → ↓retorno venoso → ↓gasto cardíaco e hipotensión. Subir la FR ha empeorado el atrapamiento y por eso el EtCO₂ no baja.',
          correcta: true,
          explicacion:
            'La pausa espiratoria deja que la presión alveolar se equilibre con la vía aérea: la PEEP total (≈ 17) menos la programada (5) es la auto-PEEP (≈ 12). Cada ciclo deja volumen atrapado porque la constante de tiempo espiratoria (Rexp × C) es mucho más larga que el Te. ' +
            'Ese volumen atrapado eleva la presión intratorácica media (≈ 15 cmH₂O), comprime las cavas y reduce el retorno venoso: hipotensión y taquicardia. Subir la FR acorta el Te, atrapa más y aumenta el espacio muerto efectivo, así que el EtCO₂ no mejora (incluso puede empeorar). ' +
            'La palanca para bajar el CO₂ en la obstrucción grave no es la FR.',
          etiquetaTema: 'auto-PEEP',
        },
        {
          texto: 'Neumotórax a tensión: hipotensión con taquicardia y Ppico en ascenso en una asmática ventilada. Toracostomía con aguja.',
          correcta: false,
          explicacion:
            'Es el diferencial obligado, pero no cuadra: la Pplat sigue moderada (≈ 23–24) con el mismo gradiente (≈ 15), la hipoventilación es bilateral y simétrica y la ecografía muestra deslizamiento pleural en los dos hemitórax. La pausa espiratoria da el diagnóstico: PEEP total ≈ 17. Puncionar un tórax hiperinsuflado sin neumotórax crearía uno.',
          etiquetaTema: 'neumotórax',
        },
        {
          texto: 'Hipotensión por la sedación y la ketamina: vasodilatación. Reducir la sedación y pasar volumen.',
          correcta: false,
          explicacion:
            'La sedación profunda contribuye (por eso la paciente es tan sensible a la presión intratorácica), pero la hipotensión ha aparecido justo al acortar el Te y coincide con una auto-PEEP de ≈ 12 cmH₂O medida en la pausa. Reducir la sedación en un asma casi fatal con relajación es peligroso y no corrige la causa mecánica. El volumen puede ayudar de forma transitoria, pero el tratamiento es ventilatorio.',
          etiquetaTema: 'hemodinámica',
        },
        {
          texto: 'La Ppico ha subido porque la obstrucción empeora: hay que subir el límite de alarma y esperar a que hagan efecto los broncodilatadores.',
          correcta: false,
          explicacion:
            'El gradiente Ppico − Pplat no ha cambiado (≈ 15): la resistencia es la misma. La Ppico sube porque sube la presión de partida (PEEP total ≈ 17 en lugar de 5): es el atrapamiento, no la obstrucción, lo que ha empeorado, y es consecuencia de la FR. Esperar con una TA de 70/57 no es una opción.',
          etiquetaTema: 'auto-PEEP',
        },
      ],
    },
    {
      id: 'p3',
      titulo: 'TA 70/57: actuación inmediata',
      narrativa:
        'TA **70/57**, FC 157, auto-PEEP ≈ 12 cmH₂O, Pplat ≈ 23–24, SpO₂ 99 %. La ecografía muestra deslizamiento pleural bilateral. La paciente sigue relajada.',
      pregunta: '¿Qué haces en los próximos 60 segundos?',
      opciones: [
        {
          texto: 'Desconectar del respirador y dejar que espire (comprimiendo el tórax con las manos durante la espiración) 30–60 s sin ventilar, observando cómo remonta la TA; después reconectar con una programación que alargue la espiración.',
          correcta: true,
          explicacion:
            'Es la maniobra diagnóstica y terapéutica de la hiperinsuflación dinámica: al desconectar, el pulmón se vacía del volumen atrapado, cae la presión intratorácica, vuelve el retorno venoso y la TA remonta en segundos. Si la TA no mejora al desconectar, hay que pensar en otra causa (neumotórax, hipovolemia, fármacos). ' +
            'La ecografía con deslizamiento bilateral ya hacía improbable el neumotórax. Con la paciente oxigenada (SpO₂ 99 %) la apnea de 30–60 s es segura; la hipercapnia transitoria es el precio asumible. ' +
            'Es la regla de oro del deterioro brusco adaptada al obstructivo: desconectar y, tras dejar espirar, ventilar con bolsa a FiO₂ 1,0. Si mejora, el problema estaba en el respirador (aquí, el Te insuficiente que programamos); si no mejora, hay que buscarlo en el paciente o en el tubo (DOPE: Desplazamiento, Obstrucción, Pneumotórax, Equipo).',
          etiquetaTema: 'auto-PEEP',
        },
        {
          texto: 'Subir la PEEP a 10 cmH₂O para "contrarrestar" la auto-PEEP y facilitar la espiración.',
          correcta: false,
          explicacion:
            'La PEEP externa solo tiene sentido en el paciente que respira espontáneamente, para reducir el esfuerzo del trigger frente a la auto-PEEP. En una paciente relajada y en el asma (obstrucción sin colapso dinámico de la vía aérea) la PEEP externa se suma a la presión intratorácica: más hiperinsuflación y más hipotensión.',
          etiquetaTema: 'auto-PEEP',
          consecuencia: 'Con PEEP 10 la PEEP total sube a unos 22 cmH₂O, la Ppico a 44, la Pplat a 28–29 y la TA se desploma hasta unos 56/52 con FC cercana a 170.',
          transicionConsecuencia: { respirador: { peep: 10 } },
        },
        {
          texto: 'Bolo de cristaloides y noradrenalina según protocolo local, sin tocar el respirador hasta que remonte la TA.',
          correcta: false,
          explicacion:
            'El volumen y los vasopresores pueden sostener la TA unos minutos, pero la causa es mecánica y sigue activa a cada ciclo. Mientras no alargues la espiración, el atrapamiento seguirá y la paciente puede acabar en parada por actividad eléctrica sin pulso. Son medidas de apoyo, no el tratamiento.',
          etiquetaTema: 'hemodinámica',
        },
        {
          texto: 'Toracostomía bilateral con aguja de forma empírica: en el asmático ventilado hipotenso no se puede excluir el neumotórax a tensión.',
          correcta: false,
          explicacion:
            'La ecografía muestra deslizamiento bilateral (descarta neumotórax en los puntos explorados) y la pausa espiratoria ya ha dado el diagnóstico: auto-PEEP ≈ 12. Puncionar un pulmón hiperinsuflado sin neumotórax es la forma más rápida de provocarlo. Antes de cualquier punción, desconectar: si la TA remonta, era auto-PEEP.',
          etiquetaTema: 'neumotórax',
        },
      ],
    },
    {
      id: 'p4',
      titulo: 'Reprogramar el respirador',
      narrativa:
        'Al desconectar, el tórax se va vaciando lentamente mientras lo comprimes y **la TA remonta** de forma clara en menos de un minuto; al reconectar con la misma programación, vuelve a caer en pocos ciclos. Queda claro el mecanismo.\n\n' +
        'Peso ideal (mujer, 165 cm): 45,5 + 0,91 × (165 − 152,4) ≈ **57 kg**. Ahora tienes que elegir la nueva programación.',
      pregunta: '¿Cómo programas el respirador?',
      opciones: [
        {
          texto: 'VC con Vt 340 ml (6 ml/kg de peso ideal), FR 12, flujo 60 L/min (Ti ≈ 0,34 s, Te ≈ 4,7 s), PEEP 5, FiO₂ 0,6. Comprobar con las pausas que la auto-PEEP baja y que el flujo espiratorio llega a cero, y aceptar la hipercapnia resultante.',
          correcta: true,
          explicacion:
            'La palanca principal para desatrapar es el tiempo espiratorio, y el Te lo manda la FR: a 12 rpm el ciclo dura 5 s. El flujo alto acorta el Ti (0,34 s) y deja el resto para espirar: una relación I:E mucho más larga que la 1:4–1:5 que se recomienda como mínimo en la obstrucción grave. ' +
            'El Vt a 6 ml/kg de peso ideal limita el volumen que hay que vaciar en cada ciclo y la Pplat. El precio es un volumen minuto bajo (≈ 4 L/min) y, por tanto, hipercapnia: es permisiva, buscada, y se tolera mientras el pH lo permita.',
          etiquetaTema: 'programación obstructiva',
        },
        {
          texto: 'Pasar a presión control con ΔP 20 sobre PEEP 5, Ti 1,0 s y FR 22, para que la presión quede limitada y no haya barotrauma.',
          correcta: false,
          explicacion:
            'Limitar la presión no desatrapa: con FR 22 y Ti 1,0 s el Te es de 1,7 s, más corto que antes. En PC, además, el volumen que entra depende de la auto-PEEP (la ΔP efectiva se reduce) y queda en ≈ 300 ml, con auto-PEEP todavía de ≈ 8 cmH₂O y la TA por debajo de 90. En PC la Pplat ya está limitada, pero el problema de esta paciente es el tiempo espiratorio.',
          etiquetaTema: 'programación obstructiva',
          consecuencia: 'En PC con FR 22: VTE ≈ 300 ml, PEEP total ≈ 13 (auto-PEEP ≈ 8) y TA en torno a 88/63. El atrapamiento continúa.',
          transicionConsecuencia: { respirador: { modo: 'PC', deltaP: 20, ti: 1.0, fr: 22 } },
        },
        {
          texto: 'Mantener FR 22 y bajar el Vt a 300 ml: menos volumen por ciclo, menos volumen que vaciar.',
          correcta: false,
          explicacion:
            'Bajar el Vt ayuda algo (la auto-PEEP baja a ≈ 6 y la TA ronda los 100), pero con Te de 2,1 s el flujo espiratorio sigue sin llegar a cero (≈ −5 L/min). Y 300 ml son 5,3 ml/kg de peso ideal con FR 22: un volumen minuto repartido en muchos ciclos cortos, lo peor de los dos mundos. La palanca eficaz es la FR.',
          etiquetaTema: 'programación obstructiva',
          consecuencia: 'Con Vt 300 y FR 22 la auto-PEEP baja solo a ≈ 6 cmH₂O y la TA se queda alrededor de 100/68: mejora parcial, el flujo espiratorio sigue sin llegar a cero.',
          transicionConsecuencia: { respirador: { vt: 0.3 } },
        },
        {
          texto: 'Vt 340 ml, FR 18 y flujo 60 L/min: FR algo más baja pero sin perder tanto volumen minuto, para no hipercapniar más a una paciente que ya tiene 70 de CO₂.',
          correcta: false,
          explicacion:
            'Con FR 18 el Te es de 3,0 s: mejor que 1,8, pero con una constante de tiempo espiratoria tan larga sigue quedando auto-PEEP (≈ 4 cmH₂O) y el flujo espiratorio no llega a cero. El miedo a la hipercapnia es lo que ha llevado a esta situación: en el asma grave se acepta la hipercapnia a cambio de desatrapar.',
          etiquetaTema: 'ventilación y CO2',
          consecuencia: 'Con FR 18 la auto-PEEP queda en ≈ 4 cmH₂O y el flujo espiratorio sigue cortándose antes de cero; la TA sube a unos 111/72 pero no se normaliza.',
          transicionConsecuencia: { respirador: { ...programacionObstructiva, fr: 18 } },
        },
      ],
      transicion: { respirador: programacionObstructiva, gases: {} },
    },
    {
      id: 'p5',
      titulo: 'Tras reprogramar: Ppico alta e hipercapnia',
      narrativa:
        'Con **Vt 340, FR 12 y flujo 60 L/min**: TA **122/76**, FC 111. Con las pausas: **Pplat ≈ 13 cmH₂O**, PEEP total ≈ 7 (auto-PEEP ≈ 2) y el flujo espiratorio ahora sí llega prácticamente a cero antes del siguiente ciclo (Te ≈ 4,7 s). ' +
        'Pero la **alarma de presión salta a cada ciclo: Ppico 43 cmH₂O** (gradiente ≈ 30). Volumen minuto 4,0 L/min.\n\n' +
        'A los 20 minutos, la gasometría de control muestra **PaCO₂ 74 mmHg** (EtCO₂ 66) con acidosis respiratoria, pH por encima del umbral que fija vuestro protocolo para la hipercapnia permisiva. SpO₂ 99–100 %.',
      pregunta: 'La enfermera te pregunta qué hacer con la alarma de presión y con ese CO₂. ¿Qué respondes?',
      opciones: [
        {
          texto: 'La Ppico de 43 es presión resistiva (flujo 60 L/min × R 30) que no llega al alvéolo: la Pplat es de 13. Subo el límite de alarma (p. ej. a 50) y mantengo la programación. La hipercapnia es permisiva: se tolera mientras el pH se mantenga por encima del umbral del protocolo y no haya contraindicación. Tratamiento de la obstrucción según protocolo local.',
          correcta: true,
          explicacion:
            'El riesgo de barotrauma depende de la presión alveolar (Pplat), no de la Ppico. Con flujo 60 L/min y R 30 el gradiente es de 30 cmH₂O por definición: subir el flujo para acortar el Ti tiene este coste, y es aceptable mientras la Pplat esté claramente por debajo de 30. ' +
            'La hipercapnia permisiva es parte de la estrategia: PaCO₂ alta con un pH tolerable es mejor que un atrapamiento que hipotensa. Contraindicaciones: hipertensión intracraneal, inestabilidad grave que no remonta. Mientras, se trata la causa (broncodilatadores, corticoides, ketamina, sedación y relajación según protocolo local) y se repite la gasometría.',
          etiquetaTema: 'ventilación y CO2',
        },
        {
          texto: 'Bajar el flujo a 30 L/min para que la Ppico baje por debajo de 40 y deje de sonar la alarma.',
          correcta: false,
          explicacion:
            'La Ppico bajaría, sí, pero solo porque cae la presión resistiva, que nunca llegó al alvéolo: la Pplat no cambiaría. A cambio el Ti se dobla (0,68 s) y el Te se acorta: justo el margen que necesitas contra el atrapamiento. En la obstrucción grave la Ppico alta con Pplat baja es un peaje asumido.',
          etiquetaTema: 'programación obstructiva',
        },
        {
          texto: 'Subir la FR a 18 para corregir la hipercapnia: con flujo 60 el Te sigue siendo de 3 s.',
          correcta: false,
          explicacion:
            'Con Rexp tan alta, 3 s de Te no bastan: la auto-PEEP vuelve a ≈ 4 cmH₂O, el flujo espiratorio deja de llegar a cero y la TA baja de nuevo. Es exactamente el error que provocó la hipotensión. La FR se sube cuando la obstrucción cede, comprobándolo con la pausa espiratoria.',
          etiquetaTema: 'ventilación y CO2',
          consecuencia: 'Con FR 18 la auto-PEEP sube a ≈ 4 cmH₂O, el flujo espiratorio se corta en ≈ −4 L/min y la TA baja hacia 111/72.',
          transicionConsecuencia: { respirador: { fr: 18 } },
        },
        {
          texto: 'Subir el Vt a 500 ml manteniendo FR 12: más volumen minuto con el mismo Te.',
          correcta: false,
          explicacion:
            '500 ml son ≈ 8,8 ml/kg de peso ideal: ventilación lesiva, y la Ppico pasaría de 45 (≈ 47) con la Pplat subiendo a ≈ 17. Bajar el CO₂ a costa de sobredistender un pulmón hiperinsuflado no es un buen cambio; el CO₂ bajará cuando ceda la obstrucción y se pueda subir la FR.',
          etiquetaTema: 'ventilación protectora',
          consecuencia: 'Con Vt 500 la Ppico llega a 47 y la Pplat a unos 17; el CO₂ baja, pero a costa de 8,8 ml/kg de peso ideal.',
          transicionConsecuencia: { respirador: { vt: 0.5 } },
        },
      ],
      // Una hora de tratamiento broncodilatador: la obstrucción cede en parte.
      transicion: { paciente: mejoria, duracion: 30 },
    },
    {
      id: 'p6',
      titulo: 'Una hora después',
      narrativa:
        'Tras una hora de tratamiento según protocolo, la auscultación mejora. Con la misma programación (Vt 340, FR 12, flujo 60): **Ppico 32 cmH₂O**, Pplat ≈ 12, gradiente ≈ 20 (R ≈ 20 cmH₂O/L/s), PEEP total ≈ 5,5 (auto-PEEP ≈ 0,5) y el flujo espiratorio llega a cero con margen. TA 126/77, FC 107. ' +
        'La gasometría sigue mostrando **PaCO₂ 74 mmHg** (EtCO₂ 66).',
      pregunta: '¿Qué haces ahora con el respirador?',
      pista: 'Si cambias la FR, repite la pausa espiratoria y mira si el flujo espiratorio sigue llegando a cero.',
      opciones: [
        {
          texto: 'Subir la FR de forma escalonada (p. ej. a 16) comprobando con la pausa espiratoria que la auto-PEEP se mantiene por debajo de 2 cmH₂O y que el flujo espiratorio sigue llegando a cero; repetir gasometría.',
          correcta: true,
          explicacion:
            'La obstrucción ha cedido (gradiente 30 → 20, auto-PEEP ≈ 0,5): ahora hay margen de Te para aumentar la FR y bajar el CO₂ de forma progresiva. Con FR 16 el Te es de ≈ 3,4 s, la auto-PEEP queda en ≈ 1 cmH₂O y la PaCO₂ baja hacia 55 mmHg. ' +
            'Cada subida de FR se valida en el monitor: pausa espiratoria y curva de flujo. Si el flujo espiratorio vuelve a cortarse antes de cero, se ha ido demasiado lejos.',
          etiquetaTema: 'ventilación y CO2',
        },
        {
          texto: 'Subir la FR a 24 para normalizar el CO₂ cuanto antes: la resistencia ya es casi normal.',
          correcta: false,
          explicacion:
            'Con R 20/Rexp 35 la constante de tiempo espiratoria sigue siendo larga: a 24 rpm el Te baja a ≈ 2,2 s, reaparece la auto-PEEP (≈ 3–4 cmH₂O) y el flujo espiratorio deja de llegar a cero. Normalizaría el CO₂ (≈ 38) pero reabriría la puerta al atrapamiento. Escalonado y comprobando.',
          etiquetaTema: 'auto-PEEP',
          consecuencia: 'Con FR 24 la auto-PEEP vuelve a ≈ 3–4 cmH₂O y el flujo espiratorio se corta en ≈ −5 L/min; la TA baja hacia 115/73.',
          transicionConsecuencia: { respirador: { fr: 24 } },
        },
        {
          texto: 'Pasar a presión soporte para que la paciente regule ella misma su CO₂.',
          correcta: false,
          explicacion:
            'La paciente está sedada y relajada: no hay esfuerzo que dispare la PS. Además, en el asma grave con auto-PEEP el trigger es difícil (debe vencer la auto-PEEP antes de generar flujo) y el riesgo de desadaptación es alto. La PS llegará cuando la obstrucción y la sedación lo permitan.',
          etiquetaTema: 'presión soporte',
        },
        {
          texto: 'No tocar nada hasta que la resistencia sea normal: la hipercapnia permisiva es segura.',
          correcta: false,
          explicacion:
            'La hipercapnia permisiva es un peaje, no un objetivo: en cuanto el monitor muestra margen espiratorio (auto-PEEP ≈ 0,5, flujo espiratorio a cero), lo correcto es ir reduciéndola de forma escalonada. Mantener horas una PaCO₂ de 74 sin necesidad prolonga la acidosis y la sedación profunda.',
          etiquetaTema: 'ventilación y CO2',
        },
      ],
      transicion: { respirador: { fr: 16 } },
    },
  ],
  puntosClave: [
    'Con las pausas se separa todo: la inspiratoria da la Pplat (presión alveolar) y el gradiente Ppico − Pplat (resistencia × flujo); la espiratoria da la PEEP total y, restando la PEEP programada, la auto-PEEP. El flujo espiratorio que no llega a cero es el aviso más precoz de atrapamiento.',
    'La hipotensión del asmático ventilado es, hasta que se demuestre lo contrario, hiperinsuflación dinámica: la auto-PEEP sube la presión intratorácica y hunde el retorno venoso. Desconectar y dejar espirar (comprimiendo el tórax) la confirma y la trata en segundos; la ecografía con deslizamiento bilateral aleja el neumotórax. Es la regla de oro del deterioro brusco (desconectar y ventilar con bolsa; si mejora, el problema era del respirador o del circuito; si no, del paciente o del tubo: DOPE), con el matiz de que en el obstructivo primero hay que dejar que termine de espirar.',
    'Programación obstructiva: la FR es la palanca principal (manda el Te), el flujo alto acorta el Ti, el Vt se mantiene en 6 ml/kg de peso ideal y la I:E se alarga muy por encima de 1:4–1:5. Subir la FR para bajar el CO₂ empeora el atrapamiento y no baja el CO₂.',
    'Una Ppico alta es aceptable mientras la Pplat esté controlada (< 30): el gradiente es presión resistiva que no llega al alvéolo. La hipercapnia es permisiva mientras el pH lo tolere y no haya contraindicación.',
    'Cuando la obstrucción cede (gradiente y auto-PEEP bajan), la FR se sube de forma escalonada validando cada cambio con la pausa espiratoria y la curva de flujo.',
  ],
  expectativas: [
    {
      paso: 0,
      descripcion: 'Inicial: gradiente > 12 con Pplat < 30 (problema de resistencia), R medida > 25, auto-PEEP real > 5 y flujo espiratorio claramente negativo al final (< −0,1 L/s)',
      comprobar: (m) => (m.gradiente ?? 0) > 12 && (m.pplat ?? 99) < 30 && (m.resistencia ?? 0) > 25 && m.autoPeepReal > 5 && m.flujoFinEsp < -0.1,
    },
    {
      paso: 0,
      descripcion: 'Inicial: ya hay hipotensión (TAS < 90) y taquicardia (> 130) por el atrapamiento, sin fuga',
      comprobar: (m) => m.tas < 90 && m.fc > 130 && m.fuga < 0.02,
    },
    {
      paso: 1,
      descripcion: 'Con FR 22: la auto-PEEP medida sube ≥ 1,5 respecto al inicio, el gradiente no cambia (±1), TAS < 80 y el flujo espiratorio sigue sin llegar a 0 (< −0,1 L/s)',
      comprobar: (m, t) =>
        (m.autoPeep ?? 0) >= (t[0]?.autoPeep ?? 0) + 1.5 && Math.abs((m.gradiente ?? 0) - (t[0]?.gradiente ?? 0)) < 1 && m.tas < 80 && m.flujoFinEsp < -0.1,
    },
    {
      paso: 1,
      descripcion: 'Con FR 22 el EtCO₂ no baja (≥ EtCO₂ inicial − 2) pese a más volumen minuto',
      comprobar: (m, t) => m.etco2 >= (t[0]?.etco2 ?? 0) - 2 && m.vmEsp > (t[0]?.vmEsp ?? 0),
    },
    {
      paso: 4,
      descripcion: 'Tras reprogramar (Vt 340, FR 12, flujo 60): auto-PEEP real < 2, flujo espiratorio ≈ 0 (> −0,05 L/s), TAS > 100, Pplat < 30, Ppico < 45 y Te > 4 s',
      comprobar: (m) => m.autoPeepReal < 2 && m.flujoFinEsp > -0.05 && m.tas > 100 && (m.pplat ?? 99) < 30 && m.ppico < 45 && m.te > 4,
    },
    {
      paso: 4,
      descripcion: 'Tras reprogramar: Ppico sigue alta (> 40, salta la alarma de 40) y la PaCO₂ queda en hipercapnia permisiva (65–85 mmHg) con VTE ≈ 340 ml',
      comprobar: (m) => m.ppico > 40 && m.paco2 > 65 && m.paco2 < 85 && Math.abs(m.vte - 0.34) < 0.01,
    },
    {
      paso: 5,
      descripcion: 'Tras una hora de broncodilatación: gradiente baja ≥ 8 respecto al paso 4, auto-PEEP real < 1 y Ppico < 35',
      comprobar: (m, t) => (m.gradiente ?? 99) <= (t[4]?.gradiente ?? 0) - 8 && m.autoPeepReal < 1 && m.ppico < 35,
    },
    {
      paso: 6,
      descripcion: 'Con FR 16 tras la mejoría: auto-PEEP real < 2, flujo espiratorio > −0,05 L/s, TAS > 110 y PaCO₂ baja ≥ 15 mmHg respecto al paso 5',
      comprobar: (m, t) => m.autoPeepReal < 2 && m.flujoFinEsp > -0.05 && m.tas > 110 && m.paco2 <= (t[5]?.paco2 ?? 0) - 15,
    },
  ],
};
