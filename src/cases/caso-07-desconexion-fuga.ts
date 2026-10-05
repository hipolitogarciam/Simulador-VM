import type { Caso } from './schema';
import { paciente, respirador } from '../engine/defaults';

/**
 * Caso 7 · Fuga, desconexión y extubación accidental durante un traslado al TC (PC).
 * Ámbito hospitalario: box de críticos de Urgencias → sala de TC con respirador de transporte.
 * Los números de la narrativa salen del motor
 * (`npm run medidas -- src/cases/caso-07-desconexion-fuga.ts`).
 *
 * Notas de modelado:
 * - La fuga "inaparente" se representa con `fuga: 0.004` (≈ 20 % de fuga medida); con 0,012 el
 *   motor ya da un 45 %, que no es inaparente.
 * - El motor de gases usa el volumen que entra en el pulmón (no el VTE medido) como ventilación
 *   alveolar, y el EtCO₂ que ve el sensor de la Y se diluye con la fuga: algo menor con la fuga
 *   inaparente y muy reducido con la fuga grande. La narrativa describe lo que muestra la tabla.
 * - Tras la extubación el modelo no ve la apnea, por eso la SpO₂ se fija con `gases` (objetivo
 *   directo) y se devuelve al modelo (`gases: {}`) tras la reintubación.
 */
const pacienteBase = paciente({
  R: 10,
  Rexp: 10,
  C: 0.042,
  espacioMuerto: 0.16,
  shunt: 0.08,
  reclutabilidad: 0.02,
  vco2: 210,
  tasBase: 135,
  tadBase: 80,
  fcBase: 84,
  pmus: { tipo: 'ninguno' },
});

const respiradorBase = respirador({
  modo: 'PC',
  deltaP: 12,
  ti: 1.0,
  fr: 16,
  peep: 5,
  fio2: 0.5,
  triggerFlujo: 0,
  alarmaPmax: 35,
});

/** Fuga inaparente alrededor del balón (el tubo ha ascendido unos cm). */
const fugaInaparente = { fuga: 0.004 };
/** Fuga evidente: el balón queda en la glotis. */
const fugaEvidente = { fuga: 0.035 };
/** Extubación accidental: la Y queda abierta al aire y el tubo fuera de la tráquea. */
const extubacion = { fuga: 5, extubado: true };
/** Tubo nuevo bien colocado. */
const reintubado = { fuga: 0, extubado: false };

export const caso07: Caso = {
  id: 'caso-07-desconexion-fuga',
  numero: 7,
  titulo: 'Fuga, desconexión y extubación accidental camino del TC',
  nivel: 'intermedio',
  ambito: 'hospital',
  etiquetasTema: ['fuga y desconexión', 'capnografía', 'regla DOPE', 'oxigenación', 'ventilación protectora'],
  objetivos: [
    'Reconocer una fuga inaparente por la diferencia VTE < VTI y por una curva de volumen que no vuelve a 0, con presiones conservadas en PC.',
    'Interpretar la fuga evidente en PC: Ppico mantenida, VTI inflado, VTE y VM bajos, EtCO₂ diluido.',
    'Recorrer el circuito de forma sistemática desde el paciente hasta el respirador (balón, tubo, conexiones, filtro, tubuladuras, válvula espiratoria).',
    'Usar la capnografía como monitor de la vía aérea: EtCO₂ a 0 significa que no hay ventilación pulmonar (desconexión, extubación o parada).',
    'Actuar ante la extubación accidental: ventilar con bolsa-mascarilla, reintubar y confirmar con capnografía. Ante la duda, ventilar con bolsa.',
  ],
  datos: {
    edad: 58,
    sexo: 'hombre',
    talla: 180,
    pesoReal: 95,
    contexto:
      'Estatus epiléptico en un paciente sin antecedentes conocidos. Intubado en el box de críticos de Urgencias tras ceder las crisis con benzodiacepinas y levetiracetam (dosis según protocolo local). Sedado con propofol en perfusión. Se traslada al TC craneal con respirador de transporte.',
  },
  pacienteInicial: pacienteBase,
  respiradorInicial: respiradorBase,
  pasos: [
    {
      id: 'p1',
      titulo: 'Antes de salir hacia el TC',
      narrativa:
        'Hombre de 58 años, **180 cm** y 95 kg, intubado en el box de críticos por un estatus epiléptico, ya controlado. Sedado con propofol en perfusión (dosis según protocolo local), sin relajante. Tubo del 8 fijado a **23 cm en la comisura**.\n\n' +
        'Lo pasas al respirador de transporte en **presión control: ΔP 12 cmH₂O sobre PEEP 5, Ti 1,0 s, FR 16, FiO₂ 0,5**, alarma de presión en 35.\n\n' +
        'Monitor: Ppico 17 cmH₂O, **VTI 452 ml = VTE 452 ml (fuga 0 %)**, VM 7,2 L/min, curva de volumen que vuelve a 0 en cada ciclo, capnograma con meseta y **EtCO₂ 33 mmHg**, SpO₂ 100 %. TA 135/80, FC 84.',
      pregunta: 'Con estos datos, ¿qué compruebas antes de salir y por qué?',
      opciones: [
        {
          texto: 'El VTE (452 ml) es ≈ 6 ml/kg de peso ideal (≈ 75 kg), VTE = VTI y hay capnograma con meseta: todo correcto. Compruebo la fijación y la marca del tubo, la presión del balón, que la capnografía y las alarmas (desconexión, VTE bajo) queden activas en el traslado, y llevo bolsa y material de intubación.',
          correcta: true,
          explicacion:
            'Peso ideal (hombre) = 50 + 0,91 × (180 − 152,4) ≈ 75 kg; 6 ml/kg ≈ 450 ml, que es lo que entrega la ΔP de 12. VTE = VTI y la curva de volumen que vuelve a 0 descartan fuga. ' +
            'Durante un traslado los riesgos son el desplazamiento del tubo y la desconexión: la capnografía continua y las alarmas de volumen y desconexión son los monitores de la vía aérea, y la bolsa es el plan B que siempre viaja con el paciente.',
          etiquetaTema: 'fuga y desconexión',
        },
        {
          texto: 'Con 95 kg le corresponden unos 760 ml (8 ml/kg): subo la ΔP hasta conseguirlos antes de salir.',
          correcta: false,
          explicacion:
            'El volumen corriente se calcula sobre el peso ideal por la talla (≈ 75 kg), no sobre el peso real, y el objetivo es 6 ml/kg: ≈ 450 ml. 760 ml serían más de 10 ml/kg de peso ideal: ventilación lesiva.',
          etiquetaTema: 'ventilación protectora',
        },
        {
          texto: 'Para el traslado quito el sensor de capnografía: añade espacio muerto y peso al tubo, y con la SpO₂ basta para vigilar la vía aérea.',
          correcta: false,
          explicacion:
            'La SpO₂ tarda minutos en caer tras una desconexión o una extubación en un paciente preoxigenado; la capnografía avisa en el primer ciclo. Es el monitor obligatorio del paciente intubado durante cualquier traslado. El espacio muerto de un sensor en línea (mainstream) es despreciable con este Vt.',
          etiquetaTema: 'capnografía',
        },
        {
          texto: 'Cambio a volumen control para el traslado: en VC el volumen está garantizado aunque haya fugas.',
          correcta: false,
          explicacion:
            'En VC el respirador programa un volumen, pero si hay fuga ese volumen se escapa por ella y el paciente recibe menos sin que suba la presión (de hecho baja). Ningún modo "garantiza" el volumen ante una fuga; lo que lo garantiza es detectarla (VTE frente a VTI, capnografía) y corregirla.',
          etiquetaTema: 'fuga y desconexión',
        },
      ],
      // Al pasar al paciente de la cama a la camilla el tubo asciende unos centímetros: fuga inaparente.
      transicion: { paciente: fugaInaparente, duracion: 8 },
    },
    {
      id: 'p2',
      titulo: 'En la sala del TC',
      narrativa:
        'Pasáis al paciente a la camilla de traslado y llegáis a la sala del TC. No ha sonado ninguna alarma. Al mirar el respirador antes de pasarlo a la mesa ves: Ppico 17 cmH₂O (igual), **VTI 518 ml, VTE 411 ml, fuga 21 %**, VM 6,5 L/min. ' +
        'EtCO₂ 31 mmHg (antes 33), SpO₂ 100 %. TA 135/80, FC 84.\n\n' +
        'En la curva de **volumen**, la rama espiratoria **no baja hasta la línea de base**: se queda a mitad de camino y el respirador la reinicia a 0 en el siguiente ciclo (un "escalón" al final de cada espiración). El flujo espiratorio llega a 0 y no hay esfuerzos del paciente.',
      pregunta: '¿Qué indican estas cifras y la curva de volumen?',
      pista: 'Compara VTI con VTE y mira dónde termina la curva de volumen al final de la espiración.',
      opciones: [
        {
          texto: 'Hay una fuga: el respirador insufla 518 ml pero solo recupera 411 (fuga 21 %), y la curva de volumen no vuelve a 0 porque parte del gas se ha escapado sin pasar por el sensor. En PC la presión se mantiene porque el respirador aporta más flujo. Hay que buscar la fuga: balón, tubo, conexiones.',
          correcta: true,
          explicacion:
            'VTE < VTI con presiones conservadas es la firma de la fuga. En presión control el respirador entrega el flujo necesario para mantener la ΔP, así que la Ppico no cambia y el VTI incluso crece (incluye el gas que se escapa). ' +
            'La curva de volumen termina por encima de 0 porque el volumen espirado medido es menor que el insuflado. Una fuga pequeña no alarma, pero suele preceder a una grande: hay que localizarla ya.',
          etiquetaTema: 'fuga y desconexión',
        },
        {
          texto: 'Intubación selectiva al pasarlo a la camilla: por eso el VTE ha bajado de 452 a 411 ml.',
          correcta: false,
          explicacion:
            'En una selectiva cae la compliance: en PC bajarían VTI y VTE a la vez y por igual (fuga 0 %), y la curva de volumen seguiría volviendo a 0. Aquí el VTI ha subido (518) mientras el VTE ha bajado: la diferencia entre ambos es gas que se escapa.',
          etiquetaTema: 'intubación selectiva',
        },
        {
          texto: 'Broncoespasmo incipiente: el volumen no vuelve a 0 porque el paciente no termina de espirar (atrapamiento).',
          correcta: false,
          explicacion:
            'Con atrapamiento el flujo espiratorio no llegaría a 0 antes del siguiente ciclo y habría auto-PEEP, pero el VTE seguiría siendo igual al VTI (lo que entra sale, aunque tarde). Aquí el flujo espiratorio llega a 0 y VTI ≠ VTE: es fuga, no atrapamiento.',
          etiquetaTema: 'auto-PEEP',
        },
        {
          texto: 'Es un artefacto del sensor de flujo del respirador de transporte tras moverlo: lo recalibro y sigo.',
          correcta: false,
          explicacion:
            'Una diferencia VTE < VTI persistente, ciclo tras ciclo y con la curva de volumen escalonada, es una fuga hasta que se demuestre lo contrario. Atribuirla al sensor y seguir adelante es perder la oportunidad de corregirla antes de que se convierta en una fuga grande o en una extubación.',
          etiquetaTema: 'fuga y desconexión',
        },
      ],
      // Al pasar al paciente a la mesa del TC el tubo asciende más: el balón queda en la glotis.
      transicion: { paciente: fugaEvidente, duracion: 6 },
    },
    {
      id: 'p3',
      titulo: 'Fuga evidente',
      narrativa:
        'Mientras lo pasáis a la mesa del TC salta la **alarma de VTE bajo**. En el respirador: Ppico 17 cmH₂O (sigue igual), **VTI ≈ 1.030 ml, VTE ≈ 245 ml, fuga 76 %**, **VM 3,7 L/min**. ' +
        'El capnograma ha perdido la meseta y el **EtCO₂ ha bajado a unos 8 mmHg**. Se oye un **gorgoteo en la boca** con cada insuflación. SpO₂ todavía 100 %. TA 135/80, FC 84.\n\n' +
        'Haces una pausa inspiratoria: la presión **cae durante la pausa hasta ≈ 6 cmH₂O** en vez de mantenerse.',
      pregunta: '¿Qué haces?',
      pista: 'Fíjate en que la Ppico es la misma de siempre: en PC el respirador la mantiene aunque la mayor parte del gas se escape.',
      opciones: [
        {
          texto: 'Recorrer el circuito desde el paciente hasta el respirador: presión del balón con manómetro y fuga audible en el cuello, marca del tubo en la comisura, conexión tubo–filtro–Y, tubuladuras y válvula espiratoria. Mientras, FiO₂ 1,0 y bolsa a mano.',
          correcta: true,
          explicacion:
            'Con una fuga del 76 % el paciente recibe mucho menos de lo que marca el VTI y el EtCO₂ diluido lo refleja. La búsqueda es sistemática y ordenada, del paciente al respirador, porque la fuga puede estar en cualquier punto: balón desinflado o roto, tubo ascendido con el balón en la glotis, conexión suelta, filtro agrietado, tubuladura pinzada o válvula espiratoria mal montada. ' +
            'El gorgoteo en la boca y la presión que cae durante la pausa apuntan al balón o a la posición del tubo. ' +
            'Si el paciente se deteriora mientras buscas (desaturación), regla de oro: desconectar y ventilar con bolsa por el tubo. Si la bolsa ventila bien, el problema estaba en el circuito o el respirador; si también fuga (gorgoteo, el tórax no se expande), está en el tubo o el balón (la D de DOPE) y hay que asegurar la vía aérea.',
          etiquetaTema: 'fuga y desconexión',
        },
        {
          texto: 'Subir la ΔP a 20 cmH₂O para compensar la fuga y recuperar el VTE.',
          correcta: false,
          explicacion:
            'La fuga es proporcional a la presión: con más ΔP se escapa más gas. El VTI se dispara a 1,6 L y, aunque el VTE sube a unos 500 ml, el EtCO₂ no se recupera (≈ 7 mmHg) porque la mayor parte del gas espirado se escapa sin pasar por el sensor. Además se expone al paciente a presiones mayores sin resolver la causa.',
          etiquetaTema: 'fuga y desconexión',
          consecuencia: 'Ppico 25, VTI ≈ 1,6 L, VTE ≈ 500 ml: la mayor parte del gas se escapa y el EtCO₂ no se recupera.',
          transicionConsecuencia: { respirador: { deltaP: 20 } },
        },
        {
          texto: 'Cambiar a volumen control con 450 ml: así el respirador garantiza el volumen aunque haya fuga.',
          correcta: false,
          explicacion:
            'En VC el respirador empuja 450 ml hacia el circuito, pero con una fuga de este tamaño casi todo se escapa: el VTE cae a unos 20 ml, la presión apenas sube (Ppico 13) y el paciente se queda sin ventilación. Ningún modo compensa una fuga grande; hay que localizarla y corregirla.',
          etiquetaTema: 'fuga y desconexión',
          consecuencia: 'En VC con esta fuga el VTE cae a unos 20 ml con Ppico 13 cmH₂O: el volumen programado se va por la fuga.',
          transicionConsecuencia: { respirador: { modo: 'VC', vt: 0.45, flujo: 0.75, pausa: 0.3 } },
        },
        {
          texto: 'Subir la FiO₂ a 1,0, hacer el TC (son dos minutos) y revisar la fuga al volver al box.',
          correcta: false,
          explicacion:
            'Con una fuga del 76 % no sabes qué parte del VTI llega de verdad al pulmón (el VTE y el EtCO₂ ya no son fiables): el paciente puede estar hipoventilándose ahora mismo, y una fuga de este tamaño que ha ido creciendo al movilizarlo puede acabar en extubación dentro del TC, donde nadie está a su lado. Primero se asegura la vía aérea; el TC espera.',
          etiquetaTema: 'oxigenación',
        },
      ],
      // Al pasarlo a la mesa tose y se agita: el tubo sale de la tráquea.
      transicion: { paciente: extubacion, duracion: 2, gases: { spo2: 86 } },
    },
    {
      id: 'p4',
      titulo: 'Extubación accidental',
      narrativa:
        'Recorres el circuito: conexiones firmes, filtro íntegro, tubuladuras y válvula espiratoria correctas. El **balón está blando**; lo reinflas y la fuga apenas cambia. La **marca del tubo está a 19 cm** en la comisura (antes 23 cm): el balón probablemente está en la glotis.\n\n' +
        'Antes de que puedas hacer nada más, al terminar de pasarlo a la mesa el paciente **tose y se agita** y el tubo sale casi del todo. En el monitor: **capnograma plano, EtCO₂ 0**, **alarma de desconexión**, Ppico ≈ 1 cmH₂O, VTE 0 ml. ' +
        'La **SpO₂ baja: 86 %** y sigue cayendo. FC 89, pulso presente, curva de pletismografía conservada.',
      pregunta: '¿Qué significa la capnografía a 0 y cuál es tu primera medida?',
      opciones: [
        {
          texto: 'EtCO₂ 0 = no llega gas de los pulmones al sensor: desconexión, extubación o parada circulatoria. Tiene pulso y el tubo está fuera: lo retiro, ventilo con bolsa-mascarilla a FiO₂ 1,0 (con cánula orofaríngea) y preparo la reintubación.',
          correcta: true,
          explicacion:
            'La capnografía es el monitor de la vía aérea: un capnograma plano en un paciente con pulso significa que el gas no pasa por los pulmones, es decir, el circuito está desconectado o el tubo está fuera de la tráquea. Un tubo con el balón en la faringe no ventila y puede provocar vómito y laringoespasmo: se retira y se ventila con bolsa-mascarilla. ' +
            'Ante la duda sobre la posición de un tubo, siempre se ventila con bolsa.',
          etiquetaTema: 'capnografía',
        },
        {
          texto: 'Subir la ΔP a 25 cmH₂O para que entre volumen a pesar de la fuga.',
          correcta: false,
          explicacion:
            'Con la Y abierta al aire no hay presión que mantener: el respirador no puede generar presión ni volumen en un circuito abierto. La Ppico sigue en ≈ 1 y el EtCO₂ en 0, y el paciente sigue sin ventilarse mientras se pierden segundos.',
          etiquetaTema: 'fuga y desconexión',
          consecuencia: 'Nada cambia: Ppico ≈ 1–2 cmH₂O, VTE 0, EtCO₂ 0 y la SpO₂ sigue cayendo.',
          transicionConsecuencia: { respirador: { deltaP: 25 } },
        },
        {
          texto: 'Empujar el tubo de nuevo hasta los 23 cm, reinflar el balón y reconectar.',
          correcta: false,
          explicacion:
            'Reintroducir un tubo a ciegas desde la faringe suele acabar en el esófago o provocar traumatismo, vómito y laringoespasmo. La única forma segura de volver a intubar es con laringoscopia y confirmación con capnografía. Mientras tanto, bolsa-mascarilla.',
          etiquetaTema: 'fuga y desconexión',
        },
        {
          texto: 'EtCO₂ 0 significa parada cardiorrespiratoria: inicio compresiones torácicas.',
          correcta: false,
          explicacion:
            'La parada circulatoria es una de las tres causas de un capnograma plano, pero aquí hay pulso, FC 89 y curva de pletismografía: la causa es que el tubo ya no está en la tráquea. Antes de iniciar compresiones hay que comprobar el pulso; aquí lo que falta es ventilación, no circulación.',
          etiquetaTema: 'capnografía',
        },
      ],
      // Con bolsa-mascarilla a FiO₂ 1,0 la SpO₂ remonta mientras se prepara la reintubación.
      transicion: { gases: { spo2: 94 } },
    },
    {
      id: 'p5',
      titulo: 'Reintubación',
      narrativa:
        'Retiras el tubo y ventilas con bolsa-mascarilla a FiO₂ 1,0 con cánula orofaríngea: el tórax se expande bien y la **SpO₂ remonta al 94 %**. El respirador sigue desconectado (EtCO₂ 0 en su sensor, alarma de desconexión). ' +
        'El paciente está semiinconsciente, con tos y movimientos con cada insuflación. Tienes el material de intubación y el videolaringoscopio preparados y el técnico de TC ha avisado al adjunto.',
      pregunta: '¿Cómo reintubas y cómo confirmas la posición del tubo?',
      opciones: [
        {
          texto: 'Secuencia rápida de intubación con inductor y relajante según protocolo local, laringoscopia (videolaringoscopio), tubo del 8 y confirmación con capnografía (onda sostenida durante varios ciclos) además de la auscultación; fijar a 23 cm, balón a 20–30 cmH₂O y reconectar comprobando VTE ≈ VTI.',
          correcta: true,
          explicacion:
            'El paciente acaba de demostrar que la sedación era insuficiente para una laringoscopia: necesita inducción y relajación. La confirmación de la posición traqueal se hace con capnografía (onda sostenida, no un solo ciclo, para no confundirla con CO₂ gástrico), y después se fija el tubo, se mide la presión del balón y se comprueba en el monitor que VTE = VTI.',
          etiquetaTema: 'capnografía',
        },
        {
          texto: 'Intubar sin fármacos adicionales: ya lleva propofol y no hay tiempo que perder.',
          correcta: false,
          explicacion:
            'Con tos y movimientos, la laringoscopia sin inducción ni relajación provoca vómito, laringoespasmo, hipertensión y riesgo de intubación fallida. La SpO₂ está en 94 % con bolsa-mascarilla: hay tiempo para hacerlo bien (dosis según protocolo local).',
          etiquetaTema: 'asincronía',
        },
        {
          texto: 'Confirmar la posición por auscultación y vaho en el tubo: el capnógrafo está marcando 0 y no es fiable.',
          correcta: false,
          explicacion:
            'El capnógrafo marca 0 porque no hay tubo en la tráquea, es decir, funciona perfectamente. La auscultación y el vaho tienen falsos positivos (intubación esofágica con aire en el estómago). La capnografía con onda sostenida es el patrón de referencia para confirmar la intubación.',
          etiquetaTema: 'capnografía',
        },
        {
          texto: 'Colocar una mascarilla laríngea y hacer el TC con ella, dejando la reintubación para el box.',
          correcta: false,
          explicacion:
            'El dispositivo supraglótico es el rescate si la intubación fracasa, no la vía aérea definitiva de un paciente que ya estaba intubado, con riesgo de nuevas crisis y de broncoaspiración. Con material, ayuda y SpO₂ 94 % se reintuba ahora, y el TC se hace después.',
          etiquetaTema: 'regla DOPE',
        },
      ],
      transicion: { paciente: reintubado, respirador: { fio2: 1.0 }, duracion: 2, gases: {} },
    },
    {
      id: 'p6',
      titulo: 'Tras la reintubación',
      narrativa:
        'Reintubas sin dificultad bajo visión: **capnograma con meseta desde el primer ciclo, EtCO₂ 33 mmHg**, auscultación simétrica. Fijas el tubo a 23 cm y mides el balón con manómetro. ' +
        'Reconectas al respirador en PC con la misma programación y FiO₂ 1,0: Ppico 17 cmH₂O, **VTI 452 ml = VTE 452 ml (fuga 0 %)**, VM 7,2 L/min, la curva de volumen vuelve a 0, SpO₂ 100 %. TA 135/80, FC 84.',
      pregunta: '¿Qué haces antes de continuar con el TC?',
      opciones: [
        {
          texto: 'Profundizar la sedación antes de volver a movilizarlo (dosis según protocolo local), comprobar fijación, marca del tubo y balón, bajar la FiO₂ para SatO₂ > 90 % y mantener capnografía continua y alarmas activas; después, el TC.',
          correcta: true,
          explicacion:
            'La extubación se produjo por una sedación insuficiente durante la movilización y un tubo que se había ido desplazando: los dos factores se corrigen antes de moverlo otra vez. Con VTE = VTI y capnograma normal el problema está resuelto, y la FiO₂ se titula a la mínima necesaria. La capnografía continua sigue siendo el monitor de la vía aérea durante el resto del traslado.',
          etiquetaTema: 'fuga y desconexión',
        },
        {
          texto: 'Mantener FiO₂ 1,0 durante el TC y el regreso al box, por seguridad.',
          correcta: false,
          explicacion:
            'Con SpO₂ 100 % y la vía aérea asegurada, la FiO₂ se titula para SatO₂ > 90 %; la hiperoxia mantenida no aporta beneficio. Lo que da seguridad en el traslado es la sedación adecuada, la fijación del tubo y la capnografía, no el oxígeno al 100 %.',
          etiquetaTema: 'oxigenación',
        },
        {
          texto: 'Subir la PEEP a 10 cmH₂O para reclutar las atelectasias que haya podido provocar la extubación.',
          correcta: false,
          explicacion:
            'No hay hipoxemia que justifique más PEEP (SpO₂ 100 %), y en un paciente neurológico conviene no subir la presión intratorácica sin indicación. Se mantiene PEEP 5.',
          etiquetaTema: 'oxigenación',
        },
        {
          texto: 'Retirar el sensor de capnografía para la movilización al TC y volver a ponerlo en el box.',
          correcta: false,
          explicacion:
            'La movilización es justo el momento de más riesgo de desconexión o desplazamiento del tubo, como acaba de ocurrir. La capnografía continua es la que avisa en el primer ciclo; se mantiene durante todo el traslado.',
          etiquetaTema: 'capnografía',
        },
      ],
      transicion: { respirador: { fio2: 0.4 } },
    },
  ],
  puntosClave: [
    'Una fuga se reconoce por VTE < VTI con presiones conservadas (en PC el respirador mantiene la Ppico aportando más flujo) y por una curva de volumen que no vuelve a 0. Una fuga pequeña suele preceder a una grande.',
    'En PC, la fuga grande inflama el VTI, hunde el VTE y el VM y diluye el EtCO₂; subir la presión o cambiar a VC no la compensa: hay que localizarla recorriendo el circuito del paciente al respirador.',
    'La capnografía es el monitor de la vía aérea: EtCO₂ 0 en un paciente con pulso = desconexión o extubación. En un paciente preoxigenado, la SpO₂ tarda minutos en avisar.',
    'Ante la duda sobre la posición del tubo: retirarlo y ventilar con bolsa-mascarilla a FiO₂ 1,0; reintubar con inducción y relajación según protocolo local y confirmar con capnografía (onda sostenida). Es la regla de oro del deterioro brusco: desconectar y ventilar con bolsa; si mejora, el problema era del respirador o del circuito; si no, del paciente o del tubo (DOPE).',
    'Antes de movilizar a un paciente intubado: sedación suficiente, tubo fijado con la marca anotada, balón medido, capnografía y alarmas activas, bolsa y material de intubación a mano.',
  ],
  expectativas: [
    {
      paso: 0,
      descripcion: 'Estado inicial: VTE 430–475 ml (≈ 6 ml/kg de peso ideal), sin fuga, Ppico ≈ 17 y EtCO₂ > 30',
      comprobar: (m) => m.vte > 0.43 && m.vte < 0.475 && m.fuga < 0.01 && Math.abs(m.ppico - 17) < 0.5 && m.etco2 > 30,
    },
    {
      paso: 1,
      descripcion: 'Fuga inaparente: fuga medida entre 10 y 35 %, VTE < VTI, VTI mayor que el inicial y Ppico sin cambios',
      comprobar: (m, t) => m.fuga > 0.1 && m.fuga < 0.35 && m.vte < m.vti && m.vti > (t[0]?.vti ?? 0) && Math.abs(m.ppico - (t[0]?.ppico ?? 0)) < 0.5,
    },
    {
      paso: 1,
      descripcion: 'Fuga inaparente: sin atrapamiento (flujo espiratorio llega a 0) y VTE por debajo del inicial',
      comprobar: (m, t) => Math.abs(m.flujoFinEsp) < 0.05 && m.autoPeepReal < 0.3 && m.vte < (t[0]?.vte ?? 0),
    },
    {
      paso: 2,
      descripcion: 'Fuga evidente: fuga > 60 %, VTE < 250 ml (alarma de VTE bajo), VM < 4, Ppico mantenida y EtCO₂ al menos 8 mmHg por debajo del inicial',
      comprobar: (m, t) =>
        m.fuga > 0.6 && m.vte < 0.25 && m.vmEsp < 4 && Math.abs(m.ppico - (t[0]?.ppico ?? 0)) < 0.5 && m.etco2 < (t[0]?.etco2 ?? 0) - 8,
    },
    {
      paso: 3,
      descripcion: 'Extubación: EtCO₂ 0, Ppico < 2, VTE ≈ 0, fuga 100 % y SpO₂ < 90 %',
      comprobar: (m) => m.etco2 < 0.5 && m.ppico < 2 && m.vte < 0.02 && m.fuga > 0.95 && m.spo2 < 90,
    },
    {
      paso: 4,
      descripcion: 'Con bolsa-mascarilla la SpO₂ remonta (≥ 92 %) aunque el respirador siga desconectado (EtCO₂ 0)',
      comprobar: (m) => m.spo2 >= 92 && m.etco2 < 0.5,
    },
    {
      paso: 5,
      descripcion: 'Tras reintubar: VTE vuelve al inicial (±5 %), fuga 0, EtCO₂ > 30 y SpO₂ ≥ 97 %',
      comprobar: (m, t) => Math.abs(m.vte - (t[0]?.vte ?? 0)) < 0.05 * (t[0]?.vte ?? 1) && m.fuga < 0.01 && m.etco2 > 30 && m.spo2 >= 97,
    },
    {
      paso: 6,
      descripcion: 'Con FiO₂ 0,4 la SpO₂ se mantiene > 94 %',
      comprobar: (m) => m.spo2 > 94,
    },
  ],
};
