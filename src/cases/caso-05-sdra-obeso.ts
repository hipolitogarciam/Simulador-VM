import type { Caso } from './schema';
import { paciente, respirador } from '../engine/defaults';

/**
 * Caso 5 · SDRA por neumonía en una paciente obesa (VC).
 * Peso ideal por la talla frente a peso real, Vt 6 ml/kg de peso ideal compensado con la FR
 * (ventilación alveolar y espacio muerto), Pplat < 30, PEEP según FiO₂ y SatO₂ > 90 %.
 * Todos los números de la narrativa salen de
 * `npm run medidas -- src/cases/caso-05-sdra-obeso.ts`.
 */
const pacienteBase = paciente({
  R: 12,
  Rexp: 12,
  // SDRA + pared torácica obesa: compliance del sistema respiratorio muy baja.
  C: 0.028,
  espacioMuerto: 0.15,
  shunt: 0.45,
  reclutabilidad: 0.04,
  // Fiebre y sepsis: producción de CO₂ aumentada.
  vco2: 270,
  tasBase: 115,
  tadBase: 65,
  fcBase: 112,
  sensibilidadPrecarga: 1.2,
  pmus: { tipo: 'ninguno' },
});

/** Programación inicial: Vt calculado por error con el peso real (6 ml/kg × 110 kg). */
const respiradorBase = respirador({
  modo: 'VC',
  vt: 0.66,
  flujo: 0.75,
  pausa: 0.3,
  fr: 16,
  peep: 8,
  fio2: 1.0,
  triggerFlujo: 0,
  alarmaPmax: 45,
});

export const caso05: Caso = {
  id: 'caso-05-sdra-obeso',
  numero: 5,
  titulo: 'SDRA por neumonía en una paciente obesa: peso ideal, FR y PEEP',
  nivel: 'intermedio',
  ambito: 'hospital',
  etiquetasTema: ['ventilación protectora', 'ventilación y CO2', 'oxigenación', 'hemodinámica', 'resistencia frente a compliance'],
  objetivos: [
    'Calcular el peso ideal por la talla y el sexo y programar el Vt a 6 ml/kg de peso ideal, no de peso real.',
    'Comprobar la Pplat con la pausa inspiratoria y mantenerla por debajo de 30 cmH₂O.',
    'Compensar la reducción del Vt con la FR entendiendo la diferencia entre volumen minuto y ventilación alveolar (espacio muerto fijo).',
    'Ajustar la PEEP y la FiO₂ para SatO₂ > 90 % vigilando la Pplat y la tensión arterial.',
    'Interpretar la mecánica final: compliance estática, resistencia y driving pressure.',
  ],
  datos: {
    edad: 58,
    sexo: 'mujer',
    talla: 160,
    pesoReal: 110,
    contexto:
      'Mujer de 58 años, 160 cm y 110 kg (IMC 43), hipertensa, diabética y con apnea del sueño. Cinco días de fiebre, tos y disnea progresiva. ' +
      'Llega a Urgencias con 39 °C, FR 36, SpO₂ 82 % con mascarilla con reservorio, infiltrados alveolares bilaterales en la radiografía y patrón B difuso con consolidaciones en la ecografía pulmonar. ' +
      'Tras una hora de oxigenoterapia de alto flujo sin mejoría se intuba con secuencia rápida (fármacos según protocolo local). Antibioterapia empírica iniciada (dosis según protocolo local). ' +
      'El residente programa el respirador "a 6 ml/kg" calculados sobre los 110 kg.',
  },
  pacienteInicial: pacienteBase,
  respiradorInicial: respiradorBase,
  pasos: [
    {
      id: 'p1',
      titulo: 'Primera comprobación tras la intubación',
      narrativa:
        'Paciente sedada y relajada (dosis según protocolo local), en **volumen control: Vt 660 ml, FR 16, flujo 45 L/min (0,75 L/s), pausa inspiratoria 0,3 s, PEEP 8, FiO₂ 1,0**.\n\n' +
        'El monitor muestra **Ppico 41 cmH₂O** y, gracias a la pausa programada, una meseta clara: **Pplat 32 cmH₂O**. VTE 664 ml, volumen minuto 10,6 L/min, **SpO₂ 91 %** con FiO₂ 1,0, EtCO₂ 24 mmHg. ' +
        'TA 107/62, FC 119. Gasometría a los diez minutos: pH 7,51, PaCO₂ 28 mmHg, PaO₂ 62 mmHg (P/F ≈ 62), bicarbonato 22 mmol/L.\n\n' +
        'El residente comenta que "está a 6 ml/kg y aun así la presión está alta, debe de ser por la obesidad".',
      pregunta: '¿Es adecuado el volumen corriente programado?',
      pista: 'Mira la meseta de la curva de presión durante la pausa inspiratoria: esa es la Pplat, la presión que ve el alvéolo.',
      opciones: [
        {
          texto: 'No. El peso ideal se calcula por la talla: mujer de 160 cm ≈ 52 kg, así que 6 ml/kg son unos 315 ml. Los 660 ml son más de 12 ml/kg de peso ideal y la Pplat de 32 supera el límite de 30. Bajo el Vt a 315 ml.',
          correcta: true,
          explicacion:
            'Peso ideal (mujer) = 45,5 + 0,91 × (160 − 152,4) ≈ 52,4 kg. El tamaño del pulmón depende de la talla y el sexo, no del peso: la obesidad añade grasa, no alvéolos. ' +
            '660 ml son 12,6 ml/kg de peso ideal y la Pplat de 32 cmH₂O confirma la sobredistensión en un pulmón con compliance de unos 28 ml/cmH₂O. El objetivo es 6 ml/kg de peso ideal: 315 ml. ' +
            'Al bajar el Vt caerá el volumen minuto y habrá que compensarlo con la FR.',
          etiquetaTema: 'ventilación protectora',
        },
        {
          texto: 'Sí: 660 ml son exactamente 6 ml/kg de sus 110 kg. Para bajar la Pplat reduzco la PEEP de 8 a 5.',
          correcta: false,
          explicacion:
            'El Vt se calcula sobre el peso ideal por la talla, no sobre el peso real. Bajar la PEEP reduce la Pplat en los mismos 3 cmH₂O, pero no cambia la driving pressure (Pplat − PEEP ≈ 24) que distiende el pulmón en cada ciclo, y en un SDRA con shunt alto desrecluta: la SpO₂ cae.',
          etiquetaTema: 'ventilación protectora',
          consecuencia: 'Con PEEP 5 la Pplat baja a 29 pero la driving pressure sigue en 24 y la SpO₂ cae hacia el 87 % con FiO₂ 1,0.',
          transicionConsecuencia: { respirador: { peep: 5 } },
        },
        {
          texto: 'Lo bajo a 8 ml/kg de peso ideal (unos 420 ml): en una obesa la pared torácica pesa y hay que transigir un poco.',
          correcta: false,
          explicacion:
            'El criterio es 6 ml/kg de peso ideal. Con 420 ml la Pplat bajaría a unos 23 cmH₂O y la driving pressure quedaría justo en el límite de 15 (evidencia complementaria, no criterio del curso), pero el Vt seguiría un tercio por encima del objetivo de 6 ml/kg sin ninguna razón que lo justifique. ' +
            'La pared torácica rígida de la obesidad se compensa con la PEEP, no con más volumen.',
          etiquetaTema: 'ventilación protectora',
        },
        {
          texto: 'El Vt está bien; lo urgente es la SpO₂ de 91 % con FiO₂ 1,0: subo la PEEP a 16.',
          correcta: false,
          explicacion:
            'Con un Vt de 660 ml, cada cmH₂O de PEEP se suma a una Pplat ya de 32: con PEEP 16 la Pplat llega a 40 y la Ppico a 49, con caída de la TA. Primero hay que reducir el Vt al objetivo; después se ajusta la PEEP con la Pplat bajo control.',
          etiquetaTema: 'oxigenación',
          consecuencia: 'Con PEEP 16 y Vt 660 la Pplat sube a unos 40 cmH₂O, la Ppico a 49 y la TA cae hacia 97/59.',
          transicionConsecuencia: { respirador: { peep: 16 } },
        },
      ],
      // Baja el Vt a 6 ml/kg de peso ideal y, "por si acaso", sube la FR a 20.
      transicion: { respirador: { vt: 0.315, fr: 20 } },
    },
    {
      id: 'p2',
      titulo: 'El capnógrafo sube',
      narrativa:
        'Programas **Vt 315 ml** y subes la FR a 20. El monitor muestra ahora **Pplat 19 cmH₂O**, Ppico 28, VTE 319 ml y un **volumen minuto de 6,2 L/min** (antes 10,6). SpO₂ 91 %.\n\n' +
        'El **EtCO₂ sube ciclo a ciclo** hasta los 61 mmHg. Gasometría de control a los veinte minutos: **pH 7,13, PaCO₂ 69 mmHg**, bicarbonato 22 mmol/L. TA 111/64, FC 115.',
      pregunta: '¿Qué haces?',
      opciones: [
        {
          texto: 'Subo la FR a 28, comprobando en la curva de flujo que la espiración llega a cero antes del siguiente ciclo. Acepto una PaCO₂ alta mientras el pH sea tolerable.',
          correcta: true,
          explicacion:
            'La PaCO₂ depende de la ventilación alveolar, no del volumen minuto: VA = (Vt − espacio muerto) × FR. Con 660 ml, cada ciclo aportaba unos 510 ml útiles (VA ≈ 8,2 L/min); con 315 ml solo unos 165 ml, ' +
            'porque los 150 ml de espacio muerto son fijos. Para recuperar ventilación alveolar hay que subir la FR, pero cada ciclo vuelve a "gastar" el espacio muerto: con FR 28 el volumen minuto es de 8,5 L/min y la VA de unos 4,6 L/min, ' +
            'y la PaCO₂ se queda en torno a 49 (pH ≈ 7,27), no en 28. Es hipercapnia permisiva: el precio aceptable de proteger el pulmón. El límite de la FR lo marca el Te: aquí 1,4 s, suficiente para que el flujo espiratorio llegue a cero.',
          etiquetaTema: 'ventilación y CO2',
        },
        {
          texto: 'Vuelvo a subir el Vt a 450 ml: la Pplat quedaría en 24, por debajo de 30.',
          correcta: false,
          explicacion:
            'El límite de Pplat < 30 es un techo de seguridad, no un objetivo que llenar. 450 ml son 8,6 ml/kg de peso ideal y la driving pressure subiría a 16 (por encima de 15, evidencia complementaria). ' +
            'La corrección de la PaCO₂ se hace con la FR, que no aumenta la distensión por ciclo.',
          etiquetaTema: 'ventilación protectora',
          consecuencia: 'Con Vt 450 la PaCO₂ baja hacia 38, pero la Pplat sube a 24 y la driving pressure a 16 cmH₂O.',
          transicionConsecuencia: { respirador: { vt: 0.45 } },
        },
        {
          texto: 'Subo la FR a 40 para normalizar la PaCO₂ cuanto antes.',
          correcta: false,
          explicacion:
            'Con FR 40 el ciclo dura 1,5 s y el Te se queda en 0,8 s: el flujo espiratorio no llega a cero, aparece auto-PEEP y la Pplat real sube. Además, cuanto mayor es la FR, mayor es la fracción del volumen minuto que se va en espacio muerto: rendimiento decreciente.',
          etiquetaTema: 'auto-PEEP',
          consecuencia: 'Con FR 40 el Te baja a 0,8 s, el flujo espiratorio ya no llega a cero (unos −6 L/min al inicio del siguiente ciclo) y aparece una auto-PEEP de unos 2 cmH₂O.',
          transicionConsecuencia: { respirador: { fr: 40 } },
        },
        {
          texto: 'No cambio nada: es hipercapnia permisiva y forma parte de la ventilación protectora.',
          correcta: false,
          explicacion:
            'La hipercapnia permisiva se acepta cuando ya se ha optimizado la FR y el pH se mantiene en un rango tolerable (habitualmente ≥ 7,20–7,25, según protocolo local; no es un criterio del curso). Un pH de 7,13 con FR 20 no es permisivo: todavía hay margen de FR sin acortar el Te.',
          etiquetaTema: 'ventilación y CO2',
        },
      ],
      transicion: { respirador: { fr: 28 } },
    },
    {
      id: 'p3',
      titulo: 'Oxigenación',
      narrativa:
        'Con **FR 28** el volumen minuto es de 8,5 L/min, el Te de 1,4 s y la rama espiratoria del flujo llega a cero (PEEP total 8,2 con la pausa espiratoria: sin auto-PEEP apreciable). ' +
        'Pplat 19,5 cmH₂O, driving pressure 11. Gasometría a los veinte minutos: **pH 7,27, PaCO₂ 49 mmHg**.\n\n' +
        'Pero la **SpO₂ sigue en 91 % con FiO₂ 1,0 y PEEP 8**. TA 109/63, FC 117.',
      pregunta: '¿Cómo mejoras la oxigenación?',
      opciones: [
        {
          texto: 'Subo la PEEP a 14, comprobando después la Pplat (que debe seguir < 30) y la tensión arterial.',
          correcta: true,
          explicacion:
            'La hipoxemia del SDRA es por shunt: alvéolos colapsados o inundados que no responden a la FiO₂. La PEEP los recluta y reduce el shunt. ' +
            'La tabla PEEP/FiO₂ de ARDSNet (evidencia complementaria, no criterio del curso) sugiere con FiO₂ 1,0 una PEEP de 18–24, pero el techo lo marca la Pplat < 30 y la hemodinámica: ' +
            'con una driving pressure de 11, PEEP 14 deja la Pplat en unos 25. Se sube de forma escalonada y se comprueba la respuesta en SpO₂, Pplat y TA.',
          etiquetaTema: 'oxigenación',
        },
        {
          texto: 'Subo la PEEP a 24 directamente, que es lo que indica la tabla para FiO₂ 1,0.',
          correcta: false,
          explicacion:
            'La tabla es orientativa y siempre está limitada por la Pplat. Con driving pressure 11, PEEP 24 lleva la Pplat a unos 35 cmH₂O (por encima de 30) y la presión media a 28: sobredistensión y caída de la TA.',
          etiquetaTema: 'oxigenación',
          consecuencia: 'Con PEEP 24 la Pplat sube a unos 35 cmH₂O, la Ppico a 44 y la TA cae hacia 90/57 con FC 134.',
          transicionConsecuencia: { respirador: { peep: 24 } },
        },
        {
          texto: 'Subo el Vt a 450 ml para "abrir" el pulmón y mejorar la oxigenación.',
          correcta: false,
          explicacion:
            'La oxigenación depende de la FiO₂ y de la presión media (PEEP, Ti, pausa), no del Vt. Un Vt mayor distiende más los alvéolos ya abiertos (driving pressure 16, Pplat 25) sin reclutar los colapsados: la SpO₂ no cambia y el pulmón sufre.',
          etiquetaTema: 'ventilación protectora',
          consecuencia: 'Con Vt 450 la SpO₂ sigue en 91 %: la Pplat sube a 25 y la driving pressure a 16 sin ningún beneficio en la oxigenación.',
          transicionConsecuencia: { respirador: { vt: 0.45 } },
        },
        {
          texto: 'Con FiO₂ 1,0 ya no puedo hacer más en Urgencias: pido prono y valoración de ECMO.',
          correcta: false,
          explicacion:
            'El decúbito prono y la ECMO se plantean en la UCI tras optimizar la ventilación protectora y la PEEP. Con PEEP 8 en un SDRA grave queda mucho margen de reclutamiento antes de recurrir a medidas de rescate.',
          etiquetaTema: 'oxigenación',
        },
      ],
      transicion: { respirador: { peep: 14 } },
    },
    {
      id: 'p4',
      titulo: 'Tras subir la PEEP',
      narrativa:
        'Con **PEEP 14** la **SpO₂ sube al 97 %** con FiO₂ 1,0. Pplat **25,5 cmH₂O** (< 30), driving pressure 11, Ppico 34, presión media 18,5. ' +
        'La enfermera te avisa de que la última TA no invasiva es de **102/61** (antes 109/63), FC 124.',
      pregunta: '¿Qué haces ahora?',
      pista: 'Mide la TA tras cada subida de PEEP: la presión media intratorácica reduce el retorno venoso.',
      opciones: [
        {
          texto: 'Mantengo PEEP 14 (Pplat 25,5 < 30) y bajo la FiO₂ de forma escalonada hasta 0,6, comprobando que la SpO₂ se mantiene > 90 %. La caída leve de la TA es esperable: valoro la volemia (ecografía de la cava) y, si la TAM baja de 65, vasopresor según protocolo local.',
          correcta: true,
          explicacion:
            'El objetivo de oxigenación es SatO₂ > 90 % con la FiO₂ mínima: con 97 % hay margen para bajarla. La PEEP se mantiene porque la Pplat está por debajo de 30 y es lo que ha corregido el shunt. ' +
            'Una presión media de 18,5 cmH₂O reduce la precarga: un descenso de TA de unos 7 mmHg en una paciente séptica es esperable y se vigila, optimizando la volemia antes de renunciar a la PEEP.',
          etiquetaTema: 'oxigenación',
        },
        {
          texto: 'Subo la PEEP a 18: con SpO₂ 97 % hay margen y la tabla lo permite.',
          correcta: false,
          explicacion:
            'Con PEEP 18 la Pplat llega a 29,5, en el límite, la presión media a 22,5 y la TA sigue bajando. Ya se ha conseguido el objetivo de oxigenación: más PEEP solo añade riesgo hemodinámico y de sobredistensión.',
          etiquetaTema: 'oxigenación',
          consecuencia: 'Con PEEP 18 la Pplat sube a 29,5 cmH₂O, la Ppico a 38 y la TA cae hacia 97/59.',
          transicionConsecuencia: { respirador: { peep: 18 } },
        },
        {
          texto: 'Bajo la PEEP a 8 porque la TA ha caído.',
          correcta: false,
          explicacion:
            'Una TA de 102/61 (TAM ≈ 75) no es hipotensión. Con PEEP 8 la SpO₂ volvería al 91 % con FiO₂ 1,0. Ante un descenso de TA con PEEP, lo primero es valorar la volemia y la perfusión; la PEEP se reduce solo si la hemodinámica no se puede sostener.',
          etiquetaTema: 'hemodinámica',
        },
        {
          texto: 'Mantengo FiO₂ 1,0 hasta llegar a la UCI, por seguridad.',
          correcta: false,
          explicacion:
            'La hiperoxia mantenida no aporta beneficio y favorece atelectasias por reabsorción. La FiO₂ se titula a la mínima necesaria para SatO₂ > 90 %, también durante la estancia en Urgencias y el traslado.',
          etiquetaTema: 'oxigenación',
        },
      ],
      transicion: { respirador: { fio2: 0.6 } },
    },
    {
      id: 'p5',
      titulo: 'Antes del traslado',
      narrativa:
        'Con **FiO₂ 0,6 y PEEP 14** la SpO₂ se estabiliza en **93 %**. Pplat 25,5, driving pressure 11, TA 102/61, FC 124. Se organiza el traslado a la UCI con el respirador de transporte.\n\n' +
        'La enfermera pregunta si, para el traslado, puede dejar la **PEEP a 5** "como viene por defecto en el respirador de transporte", y subir la FiO₂ a 1,0 para compensar.',
      pregunta: '¿Qué respondes?',
      opciones: [
        {
          texto: 'No: el respirador de transporte se programa igual (Vt 315, FR 28, PEEP 14, FiO₂ 0,6). Si se pierde la PEEP, el pulmón se desrecluta y la SpO₂ cae aunque se suba la FiO₂.',
          correcta: true,
          explicacion:
            'La hipoxemia del SDRA es por shunt: la sangre que atraviesa alvéolos colapsados no se oxigena por mucho oxígeno que llegue a los alvéolos abiertos. Por eso con PEEP 8 teníamos 91 % con FiO₂ 1,0 y con PEEP 14 tenemos 93 % con FiO₂ 0,6. ' +
            'Perder la PEEP durante el traslado (o en cada desconexión) deshace el reclutamiento. El respirador de transporte debe reproducir la misma programación y hay que comprobar la SpO₂ tras conectarlo. Y si durante el traslado hay un deterioro brusco, la regla de oro: desconectar y ventilar con bolsa (con válvula de PEEP, para no desreclutar) a FiO₂ 1,0; si mejora, el problema está en el respirador o el circuito; si no, en la paciente (DOPE).',
          etiquetaTema: 'oxigenación',
        },
        {
          texto: 'Sí, PEEP 5 durante el traslado: son solo unos minutos y así es más seguro para la TA.',
          correcta: false,
          explicacion:
            'El desreclutamiento es inmediato y la recuperación lenta: con PEEP 5 y FiO₂ 0,6 la SpO₂ cae por debajo del 85 %. La TA de 102/61 no justifica renunciar a la PEEP que mantiene la oxigenación.',
          etiquetaTema: 'oxigenación',
          consecuencia: 'Con PEEP 5 y FiO₂ 0,6 la SpO₂ cae hacia el 83 %: los alvéolos reclutados vuelven a colapsar.',
          transicionConsecuencia: { respirador: { peep: 5 } },
        },
        {
          texto: 'Sí, PEEP 5, pero con FiO₂ 1,0 para compensar la pérdida de PEEP.',
          correcta: false,
          explicacion:
            'El shunt no responde a la FiO₂: con PEEP 5 y FiO₂ 1,0 la SpO₂ quedaría en torno al 87 %, como al principio. La FiO₂ corrige la hipoxemia por alteración ventilación/perfusión, no la del alvéolo colapsado, que solo responde a la presión.',
          etiquetaTema: 'oxigenación',
          consecuencia: 'Con PEEP 5 y FiO₂ 1,0 la SpO₂ cae hacia el 87 %: el oxígeno no llega a la sangre que atraviesa los alvéolos colapsados.',
          transicionConsecuencia: { respirador: { peep: 5, fio2: 1.0 } },
        },
        {
          texto: 'Sí: con 110 kg no tolerará PEEP 14 tumbada en la camilla de traslado.',
          correcta: false,
          explicacion:
            'Es al revés: en la obesidad el peso de la pared torácica y del abdomen colapsa las bases y la paciente necesita más PEEP, no menos, sobre todo en decúbito. La Pplat de 25,5 demuestra que la tolera.',
          etiquetaTema: 'ventilación protectora',
        },
      ],
    },
    {
      id: 'p6',
      titulo: 'Interpretar la mecánica final',
      narrativa:
        'Antes de salir hacia la UCI repasas el monitor: **Ppico 34, Pplat 25,5, PEEP 14 (PEEP total 14,2), flujo 45 L/min, VTE 319 ml, FR 28, Te 1,4 s** con el flujo espiratorio llegando a cero. ' +
        'El respirador calcula una **compliance estática de 28 ml/cmH₂O** y una **driving pressure de 11 cmH₂O**. SpO₂ 93 % con FiO₂ 0,6, PaCO₂ 49, pH 7,27.',
      pregunta: '¿Cuál de estas interpretaciones es correcta?',
      opciones: [
        {
          texto: 'Pplat 25,5 < 30 y driving pressure 11 (≤ 15, evidencia complementaria): ventilación protectora. La compliance de 28 ml/cmH₂O es patológica (restrictiva) y el gradiente Ppico–Pplat de unos 9 cmH₂O con 0,75 L/s equivale a una resistencia de unos 12, normal.',
          correcta: true,
          explicacion:
            'Pplat − PEEP total = driving pressure (25,5 − 14,2 ≈ 11); Vt / driving pressure = compliance estática (319 / 11 ≈ 28 ml/cmH₂O, patológica si < 50). ' +
            'El gradiente Ppico − Pplat dividido por el flujo (9 / 0,75 ≈ 12 cmH₂O/L/s) es la resistencia, normal (< 15). Es decir: pulmón rígido con vía aérea normal, lo esperable en un SDRA, y la programación respeta los límites de seguridad.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'El gradiente Ppico–Pplat de 9 cmH₂O indica resistencia alta: hay que añadir broncodilatadores.',
          correcta: false,
          explicacion:
            'El gradiente hay que normalizarlo por el flujo: 9 cmH₂O a 0,75 L/s son 12 cmH₂O/L/s, dentro de lo normal (patológica > 15). Con flujo alto el gradiente siempre es mayor sin que la resistencia haya cambiado.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'La compliance de 28 ml/cmH₂O refleja obstrucción bronquial.',
          correcta: false,
          explicacion:
            'La compliance estática (Vt / driving pressure) mide la rigidez del pulmón y la pared torácica, no la vía aérea. Una compliance baja con resistencia normal es un patrón restrictivo: SDRA más pared torácica obesa.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'La Ppico de 34 supera los 30 cmH₂O: la ventilación sigue siendo lesiva y hay que bajar más el Vt.',
          correcta: false,
          explicacion:
            'El límite de 30 es para la Pplat, que es la presión alveolar al final de la inspiración; la Ppico incluye el componente resistivo (R × flujo) que se disipa en el tubo y la vía aérea y no llega al alvéolo. Para la Ppico el límite es 45. ' +
            'Con 315 ml ya estamos en 6 ml/kg de peso ideal: bajar más el Vt elevaría aún más la PaCO₂ sin beneficio.',
          etiquetaTema: 'ventilación protectora',
        },
      ],
    },
  ],
  puntosClave: [
    'El Vt se calcula sobre el peso ideal por la talla y el sexo (mujer: 45,5 + 0,91 × [talla − 152,4]) a 6 ml/kg; usar el peso real en un paciente obeso produce volúmenes lesivos.',
    'La Pplat se mide con la pausa inspiratoria y debe quedar por debajo de 30 cmH₂O; la Ppico incluye el componente resistivo y su límite es 45.',
    'Al bajar el Vt se compensa con la FR, pero el espacio muerto es fijo en cada ciclo: la ventilación alveolar (Vt − Vd) × FR crece menos que el volumen minuto y la PaCO₂ sube (hipercapnia permisiva con pH tolerable). El límite de la FR lo marca el Te.',
    'La hipoxemia del SDRA es por shunt y responde a la PEEP, no a la FiO₂; la PEEP se sube de forma escalonada vigilando Pplat y TA, con la tabla PEEP/FiO₂ de ARDSNet como orientación complementaria, y la FiO₂ se titula para SatO₂ > 90 %.',
    'Compliance estática = Vt / (Pplat − PEEP total) y resistencia = (Ppico − Pplat) / flujo: compliance baja con resistencia normal es un patrón restrictivo; la driving pressure ≤ 15 es evidencia complementaria.',
  ],
  expectativas: [
    {
      paso: 0,
      descripcion: 'Programación inicial con peso real: Pplat > 30, driving pressure > 20, VTE > 640 ml, SpO₂ 90–93 % con FiO₂ 1,0, Ppico < 45',
      comprobar: (m) => (m.pplat ?? 0) > 30 && (m.drivingPressure ?? 0) > 20 && m.vte > 0.64 && m.spo2 >= 90 && m.spo2 <= 93 && m.ppico < 45,
    },
    {
      paso: 1,
      descripcion: 'Con Vt 315 y FR 20: Pplat < 22, VTE ≈ 315 ml y PaCO₂ > 60 (hipoventilación alveolar)',
      comprobar: (m) => (m.pplat ?? 99) < 22 && Math.abs(m.vte - 0.315) < 0.015 && m.paco2 > 60,
    },
    {
      paso: 2,
      descripcion: 'Con FR 28: PaCO₂ 44–55, sin auto-PEEP (< 1), Te > 1,2 s y flujo espiratorio que llega a cero',
      comprobar: (m) => m.paco2 >= 44 && m.paco2 <= 55 && (m.autoPeep ?? 9) < 1 && m.te > 1.2 && m.flujoFinEsp > -0.03,
    },
    {
      paso: 2,
      descripcion: 'Ventilación alveolar menos eficiente: volumen minuto menor que al inicio pero PaCO₂ al menos 15 mmHg mayor',
      comprobar: (m, t) => m.vmEsp < (t[0]?.vmEsp ?? 0) && m.paco2 > (t[0]?.paco2 ?? 0) + 15,
    },
    {
      paso: 3,
      descripcion: 'Con PEEP 14: SpO₂ > 95 % con FiO₂ 1,0, Pplat < 30, driving pressure ≤ 15 y descenso de la TA respecto al paso anterior',
      comprobar: (m, t) => m.spo2 > 95 && (m.pplat ?? 99) < 30 && (m.drivingPressure ?? 99) <= 15 && m.tas < (t[2]?.tas ?? 0),
    },
    {
      paso: 4,
      descripcion: 'Con FiO₂ 0,6 y PEEP 14 la SpO₂ se mantiene > 90 % (92–95)',
      comprobar: (m) => m.spo2 >= 92 && m.spo2 <= 95,
    },
    {
      paso: 6,
      descripcion: 'Estado final: Pplat < 30, driving pressure ≤ 15, resistencia < 15, compliance estática < 50 ml/cmH₂O',
      comprobar: (m) =>
        (m.pplat ?? 99) < 30 && (m.drivingPressure ?? 99) <= 15 && (m.resistencia ?? 99) < 15 && (m.complianceEstatica ?? 1) < 0.05,
    },
  ],
};
