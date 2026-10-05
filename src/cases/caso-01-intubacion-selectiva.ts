import type { Caso } from './schema';
import { paciente, respirador } from '../engine/defaults';

/**
 * Caso 1 · Intubación selectiva tras transferencia de camilla (PC).
 * Plantilla de referencia: la narrativa cita solo números que produce el motor
 * (ver `npm run medidas -- caso-01`).
 */
const pacienteBase = paciente({
  R: 10,
  Rexp: 10,
  C: 0.05,
  espacioMuerto: 0.15,
  shunt: 0.08,
  reclutabilidad: 0.02,
  tasBase: 130,
  tadBase: 78,
  fcBase: 88,
  pmus: { tipo: 'ninguno' },
});

const respiradorBase = respirador({
  modo: 'PC',
  deltaP: 10,
  ti: 1.0,
  fr: 16,
  peep: 5,
  fio2: 0.5,
  triggerFlujo: 0,
  alarmaPmax: 35,
});

/** Estado tras la selectiva: el tubo ventila solo el pulmón derecho. */
const selectiva = { C: 0.028, shunt: 0.35, espacioMuerto: 0.1 };
const bilateral = { C: 0.05, shunt: 0.08, espacioMuerto: 0.15 };

export const caso01: Caso = {
  id: 'caso-01-intubacion-selectiva',
  numero: 1,
  titulo: 'Intubación selectiva tras transferencia de camilla',
  nivel: 'básico',
  ambito: 'hospital',
  etiquetasTema: ['intubación selectiva', 'resistencia frente a compliance', 'regla DOPE', 'ecografía', 'ventilación protectora'],
  objetivos: [
    'Reconocer en la curva de flujo de PC una caída brusca de la compliance con resistencia conservada.',
    'Relacionar el descenso del VTE con la hipoxemia y el ascenso del EtCO2.',
    'Aplicar la regla de oro del deterioro brusco: desconectar y ventilar con bolsa (DOPE).',
    'Diferenciar intubación selectiva de neumotórax a tensión con la clínica y la ecografía (lung pulse).',
    'Corregir la posición del tubo y comprobar la corrección en el monitor.',
  ],
  datos: {
    edad: 62,
    sexo: 'hombre',
    talla: 175,
    pesoReal: 82,
    contexto:
      'Traumatismo craneoencefálico grave tras caída de una escalera. Intubado en el domicilio por el SEM por GCS 7. Llega a Urgencias sedado y relajado, hemodinámicamente estable.',
  },
  pacienteInicial: pacienteBase,
  respiradorInicial: respiradorBase,
  pasos: [
    {
      id: 'p1',
      titulo: 'Llegada a Urgencias',
      narrativa:
        'Hombre de 62 años, **175 cm** y 82 kg, con TCE grave intubado en el domicilio. Llega al box de críticos sedado con propofol y relajado (dosis según protocolo local). ' +
        'Lo conectas al respirador de la unidad en **presión control: ΔP 10 cmH₂O sobre PEEP 5, Ti 1,0 s, FR 16, FiO₂ 0,5**.\n\n' +
        'El monitor muestra un VTE de unos **425 ml**, Ppico 15 cmH₂O, SpO₂ 99–100 % y EtCO₂ 34 mmHg. TA 130/78, FC 88.',
      pregunta: 'Con estos datos, ¿es adecuado el volumen corriente que recibe el paciente?',
      opciones: [
        {
          texto: 'Sí. Su peso ideal por la talla es de unos 70 kg, así que 425 ml son ≈ 6 ml/kg de peso ideal: ventilación protectora. Mantengo la programación.',
          correcta: true,
          explicacion:
            'Peso ideal (hombre) = 50 + 0,91 × (175 − 152,4) ≈ 70,6 kg. El objetivo es 6 ml/kg de peso ideal, es decir, ≈ 425 ml. El VTE que mide el respirador coincide: la programación es correcta.',
          etiquetaTema: 'ventilación protectora',
        },
        {
          texto: 'No. Con 82 kg le corresponden 8 ml/kg (unos 650 ml): subo la ΔP hasta conseguirlos.',
          correcta: false,
          explicacion:
            'El volumen corriente se calcula sobre el peso ideal (según la talla), no sobre el peso real, y el objetivo es 6 ml/kg. 650 ml serían más de 9 ml/kg de peso ideal: ventilación lesiva.',
          etiquetaTema: 'ventilación protectora',
        },
        {
          texto: 'No. En un TCE hay que hiperventilar de forma sistemática para bajar la PIC: subo la FR a 28.',
          correcta: false,
          explicacion:
            'La hiperventilación profiláctica está contraindicada en el TCE: reduce el flujo cerebral. El objetivo es la normocapnia (EtCO₂ ≈ 35 mmHg), que ya tenemos.',
          etiquetaTema: 'ventilación y CO2',
        },
        {
          texto: 'No. Con FiO₂ 0,5 y SpO₂ 100 % está sobreoxigenado: bajo la FiO₂ a 0,21.',
          correcta: false,
          explicacion:
            'La pregunta es sobre el volumen corriente, que es correcto. Además, en un TCE grave recién intubado no se baja la FiO₂ a aire ambiente sin una gasometría; se titula para SatO₂ > 90 % (en el TCE, evitando la hipoxemia).',
          etiquetaTema: 'oxigenación',
        },
      ],
      // Al pasar al paciente a la camilla el tubo se desplaza hacia el bronquio principal derecho.
      transicion: { paciente: selectiva, duracion: 10 },
    },
    {
      id: 'p2',
      titulo: 'Tras pasar al paciente a la camilla',
      narrativa:
        'Pasáis al paciente de la camilla del SEM a la del box. Un minuto después salta la alarma de **VTE bajo**: el respirador muestra un **VTE de unos 270 ml** con la misma ΔP y la misma Ppico de 15 cmH₂O. ' +
        'La SpO₂ está bajando y el EtCO₂ empieza a subir.\n\n' +
        'Fíjate en la curva de **flujo**: el pico inspiratorio es el mismo que antes, pero el flujo **cae a cero mucho antes** y el volumen que entra es menor.',
      pregunta: '¿Qué te dicen las curvas y los números?',
      pista: 'Compara el pico de flujo y la velocidad con que cae respecto a la situación inicial.',
      opciones: [
        {
          texto: 'La compliance ha caído de golpe con una resistencia normal: mismo pico de flujo pero el pulmón "se llena" enseguida y el VTE se queda en poco más de la mitad. Sospecho intubación selectiva o neumotórax.',
          correcta: true,
          explicacion:
            'En PC, el pico de flujo depende de ΔP/R: si no cambia, la resistencia es la misma. Que el flujo caiga a cero mucho antes significa una constante de tiempo (R × C) más corta, es decir, una compliance menor. ' +
            'Una caída brusca de compliance a la mitad tras movilizar al paciente apunta a que el tubo ventila un solo pulmón (selectiva) o a un neumotórax: hay que diferenciarlos.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'Ha aumentado la resistencia (secreciones o acodamiento del tubo): el flujo entra con más dificultad.',
          correcta: false,
          explicacion:
            'Con resistencia alta el pico de flujo en PC sería menor (ΔP/R) y el flujo decaería más despacio, no más deprisa. Aquí el pico es idéntico y la caída es más rápida: el problema es de compliance.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'Hay una fuga en el circuito: por eso entra menos volumen.',
          correcta: false,
          explicacion:
            'Con fuga, el VTE sería menor que el VTI y la curva de volumen no volvería a cero; en PC la presión se mantiene (el respirador aporta más flujo para compensar la fuga), pero el flujo inspiratorio no llegaría a cero. Aquí VTI y VTE coinciden y el flujo inspiratorio sí llega a cero: no hay fuga.',
          etiquetaTema: 'fuga y desconexión',
        },
        {
          texto: 'Es la sedación: el paciente ha dejado de colaborar y por eso baja el volumen.',
          correcta: false,
          explicacion:
            'El paciente está sedado y relajado y las curvas no muestran esfuerzos (ni muescas en la presión ni flujo errático). En PC sin esfuerzo el volumen lo determinan ΔP, R y C: lo que ha cambiado es la C.',
          etiquetaTema: 'asincronía',
        },
      ],
    },
    {
      id: 'p3',
      titulo: 'Deterioro brusco',
      narrativa:
        'La **SpO₂ ha bajado del 90 %** y sigue cayendo; el EtCO₂ sube hacia los 55 mmHg. El paciente sigue bien sedado. TA 128/76, FC 90.\n\n' +
        'Ante el deterioro brusco de un paciente ventilado, aplica la regla de oro.',
      pregunta: '¿Cuál es la primera medida?',
      opciones: [
        {
          texto: 'Desconectar del respirador y ventilar con bolsa autoinflable con reservorio a FiO₂ 1,0, valorando la resistencia al insuflar, mientras repaso el DOPE (Desplazamiento, Obstrucción, Pneumotórax, Equipo).',
          correcta: true,
          explicacion:
            'Es la regla de oro. Si al ventilar con bolsa el paciente mejora, el problema estaba en el respirador o el circuito; si no mejora o la bolsa ofrece resistencia, el problema está en el paciente o en el tubo (DOPE). ' +
            'Mientras tanto se garantiza la oxigenación con FiO₂ 1,0.',
          etiquetaTema: 'regla DOPE',
        },
        {
          texto: 'Subir la PEEP a 15 cmH₂O para reclutar y mejorar la oxigenación.',
          correcta: false,
          explicacion:
            'Subir la PEEP sin saber la causa es peligroso: si hay un neumotórax lo empeora y en una selectiva sobredistiende el único pulmón ventilado sin corregir el problema. Primero, desconectar y ventilar con bolsa.',
          etiquetaTema: 'regla DOPE',
          consecuencia: 'Con PEEP 15 la presión media sube, la TA empieza a bajar y la SpO₂ apenas mejora.',
          transicionConsecuencia: { respirador: { peep: 15 } },
        },
        {
          texto: 'Subir la ΔP a 20 cmH₂O para recuperar el volumen corriente.',
          correcta: false,
          explicacion:
            'Subir la ΔP recupera el volumen, pero lo mete entero en un solo pulmón (Ppico 25, driving pressure ≈ 20): sobredistensión y riesgo de barotrauma, sin corregir la causa.',
          etiquetaTema: 'ventilación protectora',
          consecuencia: 'El VTE sube a unos 540 ml con Ppico 25 cmH₂O, todo en el pulmón derecho.',
          transicionConsecuencia: { respirador: { deltaP: 20 } },
        },
        {
          texto: 'Pedir una radiografía de tórax urgente y esperar el resultado antes de tocar nada.',
          correcta: false,
          explicacion:
            'Con SpO₂ < 90 % y cayendo no se puede esperar a la radiografía. Primero garantizar la oxigenación (bolsa, FiO₂ 1,0) y buscar la causa a pie de cama.',
          etiquetaTema: 'regla DOPE',
        },
      ],
      transicion: { respirador: { fio2: 1.0 } },
    },
    {
      id: 'p4',
      titulo: 'Diferenciar selectiva de neumotórax',
      narrativa:
        'Ventilas con bolsa a FiO₂ 1,0: la bolsa se insufla con algo de resistencia y la SpO₂ remonta hasta el 94–95 %. Reconectas al respirador con **FiO₂ 1,0**. ' +
        'El VTE sigue en unos 270 ml.\n\n' +
        'Exploras: la marca del tubo en la comisura está a **26 cm** (en la hoja del SEM constaba 22 cm). Hipoventilación en el hemitórax izquierdo, sin ingurgitación yugular ni enfisema subcutáneo. TA 128/76. ' +
        'Haces una ecografía pulmonar: en el hemitórax izquierdo **no hay deslizamiento pleural, pero sí se ve el *lung pulse***.',
      pregunta: '¿Cuál es el diagnóstico más probable y por qué?',
      opciones: [
        {
          texto: 'Intubación selectiva en el bronquio principal derecho: el tubo se ha desplazado 4 cm, hay hipoventilación izquierda sin repercusión hemodinámica y el lung pulse izquierdo indica que la pleura está en contacto (descarta neumotórax).',
          correcta: true,
          explicacion:
            'El lung pulse es la transmisión del latido cardíaco a través de un pulmón no ventilado pero en contacto con la pleura parietal: su presencia descarta el neumotórax en esa zona. ' +
            'Sumado al desplazamiento del tubo y a la estabilidad hemodinámica, el diagnóstico es intubación selectiva.',
          etiquetaTema: 'ecografía',
        },
        {
          texto: 'Neumotórax a tensión izquierdo: la ausencia de deslizamiento pleural lo confirma. Descompresión inmediata con aguja.',
          correcta: false,
          explicacion:
            'La ausencia de deslizamiento no es específica: también ocurre en el pulmón no ventilado por una selectiva. El lung pulse presente descarta el neumotórax en ese punto, y no hay hipotensión ni ingurgitación yugular. Puncionar sería un error.',
          etiquetaTema: 'ecografía',
        },
        {
          texto: 'Broncoespasmo: la hipoventilación izquierda y el VTE bajo se deben a obstrucción bronquial.',
          correcta: false,
          explicacion:
            'El broncoespasmo aumenta la resistencia (pico de flujo menor y flujo espiratorio lento, auto-PEEP) y suele ser bilateral. Aquí la resistencia es normal, el problema es de compliance y es unilateral.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'Tapón mucoso en el bronquio izquierdo: hay que aspirar antes de nada.',
          correcta: false,
          explicacion:
            'Un tapón mucoso daría signos de resistencia alta (dientes de sierra, flujo espiratorio alterado). El dato clave es el tubo 4 cm más profundo tras la movilización: la causa es la posición del tubo.',
          etiquetaTema: 'secreciones',
        },
      ],
    },
    {
      id: 'p5',
      titulo: 'Corregir el problema',
      narrativa:
        'Con el diagnóstico de intubación selectiva derecha, decides corregir la posición del tubo.',
      pregunta: '¿Cómo lo haces?',
      opciones: [
        {
          texto: 'Desinflar el neumotaponamiento, retirar el tubo bajo visión hasta la marca previa (≈ 22 cm en comisura), reinflarlo y comprobar auscultación bilateral, deslizamiento pleural y VTE en el monitor.',
          correcta: true,
          explicacion:
            'Hay que recolocar el tubo con el balón desinflado hasta la profundidad previa, confirmar la ventilación bilateral (auscultación, ecografía) y comprobar en el monitor que el VTE vuelve al valor inicial con la misma ΔP. Después, fijarlo bien y anotar la marca.',
          etiquetaTema: 'intubación selectiva',
        },
        {
          texto: 'Cambiar a volumen control con Vt 425 ml para garantizar el volumen y dejar el tubo donde está.',
          correcta: false,
          explicacion:
            'En VC el respirador entregaría los 425 ml en un solo pulmón: la Pplat subiría (driving pressure ≈ 15 cmH₂O en un pulmón) y seguiríamos sin ventilar el izquierdo. Hay que corregir la causa.',
          etiquetaTema: 'intubación selectiva',
          consecuencia: 'En VC con 425 ml en un solo pulmón la Pplat sube y el pulmón derecho se sobredistiende.',
          transicionConsecuencia: { respirador: { modo: 'VC', vt: 0.425, flujo: 0.5, pausa: 0.3 } },
        },
        {
          texto: 'Retirar el tubo del todo y reintubar con uno nuevo.',
          correcta: false,
          explicacion:
            'La extubación de un TCE grave con vía aérea ya asegurada es innecesaria y peligrosa. Basta con retirar el tubo unos centímetros con el balón desinflado.',
          etiquetaTema: 'intubación selectiva',
        },
        {
          texto: 'Solicitar fibrobroncoscopia urgente para confirmar la posición antes de mover el tubo.',
          correcta: false,
          explicacion:
            'La fibrobroncoscopia puede confirmar la posición, pero no es necesaria ni inmediata: la clínica (marca del tubo, auscultación) y la ecografía ya son concluyentes, y el paciente necesita la corrección ahora.',
          etiquetaTema: 'intubación selectiva',
        },
      ],
      transicion: { paciente: bilateral, duracion: 10 },
    },
    {
      id: 'p6',
      titulo: 'Recomprobación',
      narrativa:
        'Tras retirar el tubo hasta los 22 cm: auscultación simétrica, deslizamiento pleural bilateral. En el monitor el **VTE vuelve a unos 425 ml** con la misma ΔP de 10, el flujo inspiratorio vuelve a caer de forma progresiva, el EtCO₂ baja y la SpO₂ es del 99–100 % con FiO₂ 1,0.',
      pregunta: '¿Qué haces ahora con el respirador?',
      opciones: [
        {
          texto: 'Mantener ΔP 10 (VTE ≈ 6 ml/kg de peso ideal), fijar el tubo y anotar la marca, bajar la FiO₂ progresivamente para SatO₂ > 90 % (en el TCE, evitando hipoxemia) y pedir radiografía de control.',
          correcta: true,
          explicacion:
            'El problema está corregido: el VTE vuelve al objetivo con la misma presión. Queda asegurar el tubo, documentar la profundidad, ajustar la FiO₂ a la necesaria (la hiperoxia prolongada no aporta) y confirmar la posición con radiografía.',
          etiquetaTema: 'oxigenación',
        },
        {
          texto: 'Mantener FiO₂ 1,0 durante todo el ingreso en Urgencias por seguridad.',
          correcta: false,
          explicacion:
            'Una vez resuelta la causa, la FiO₂ se titula a la mínima necesaria para SatO₂ > 90 %. La hiperoxia mantenida no aporta beneficio y puede ser perjudicial.',
          etiquetaTema: 'oxigenación',
        },
        {
          texto: 'Subir la ΔP a 14 para compensar el tiempo que ha estado hipoventilado.',
          correcta: false,
          explicacion:
            'Con la ventilación bilateral restablecida el EtCO₂ vuelve por sí solo a la normalidad en unos minutos. Subir la ΔP daría ≈ 600 ml (más de 8 ml/kg de peso ideal) sin necesidad.',
          etiquetaTema: 'ventilación protectora',
        },
        {
          texto: 'Subir la PEEP a 10 para prevenir atelectasias en el pulmón que ha estado sin ventilar.',
          correcta: false,
          explicacion:
            'No hay hipoxemia que justifique más PEEP y en el TCE conviene no subir la presión intratorácica sin indicación (retorno venoso, PIC). Se mantiene PEEP 5.',
          etiquetaTema: 'oxigenación',
        },
      ],
      transicion: { respirador: { fio2: 0.4 } },
    },
  ],
  puntosClave: [
    'El volumen corriente se calcula sobre el peso ideal por la talla (hombre: 50 + 0,91 × [talla − 152,4]), a 6 ml/kg.',
    'En PC, el pico de flujo refleja la resistencia (ΔP/R) y la velocidad con que cae refleja la constante de tiempo: una caída brusca de la compliance muestra el mismo pico con un flujo que se agota antes y un VTE menor.',
    'Ante un deterioro brusco: desconectar y ventilar con bolsa a FiO₂ 1,0. Si mejora, el problema es del respirador o del circuito; si no, del paciente o del tubo (DOPE).',
    'La selectiva y el neumotórax a tensión comparten la caída de compliance; los diferencian la marca del tubo, la hemodinámica y la ecografía: el lung pulse descarta el neumotórax en ese punto.',
    'Tras corregir, comprobar en el monitor que el VTE vuelve a su valor con la misma presión y titular la FiO₂ para SatO₂ > 90 %.',
  ],
  expectativas: [
    {
      paso: 0,
      descripcion: 'Estado inicial: VTE ≈ 425 ml (6 ml/kg de peso ideal), Ppico 15 y SpO₂ ≥ 97 %',
      comprobar: (m) => m.vte > 0.4 && m.vte < 0.45 && Math.abs(m.ppico - 15) < 0.5 && m.spo2 >= 97,
    },
    {
      paso: 1,
      descripcion: 'Tras la selectiva: VTE < 65 % del inicial con la misma Ppico, PaCO₂ sube > 10 mmHg y SpO₂ < 90 %',
      comprobar: (m, t) => m.vte < 0.65 * (t[0]?.vte ?? 1) && Math.abs(m.ppico - (t[0]?.ppico ?? 0)) < 0.5 && m.paco2 > (t[0]?.paco2 ?? 0) + 10 && m.spo2 < 90,
    },
    {
      paso: 1,
      descripcion: 'Tras la selectiva no hay fuga ni auto-PEEP (VTE = VTI, flujo espiratorio llega a 0)',
      comprobar: (m) => m.fuga < 0.02 && m.autoPeepReal < 0.3,
    },
    {
      paso: 3,
      descripcion: 'Con FiO₂ 1,0 la SpO₂ remonta por encima del 94 % aunque el VTE siga bajo',
      comprobar: (m) => m.spo2 > 94 && m.vte < 0.3,
    },
    {
      paso: 5,
      descripcion: 'Tras recolocar el tubo el VTE vuelve al inicial (±5 %) y la PaCO₂ baja',
      comprobar: (m, t) => Math.abs(m.vte - (t[0]?.vte ?? 0)) < 0.05 * (t[0]?.vte ?? 1) && m.paco2 < (t[1]?.paco2 ?? 0) - 10,
    },
    {
      paso: 6,
      descripcion: 'Con FiO₂ 0,4 la SpO₂ se mantiene > 94 %',
      comprobar: (m) => m.spo2 > 94,
    },
  ],
};
