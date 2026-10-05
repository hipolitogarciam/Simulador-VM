import type { Caso } from './schema';
import { paciente, respirador } from '../engine/defaults';

/**
 * Caso 6 · Secreciones y tapón mucoso durante un traslado interhospitalario (VC).
 * Ámbito prehospital: UVI móvil. Los números de la narrativa salen del motor
 * (`npm run medidas -- src/cases/caso-06-secreciones-traslado.ts`).
 *
 * Nota de modelado: el motor entrega siempre el Vt programado en VC (no limita por
 * presión), así que la desaturación del tapón se representa con un aumento del shunt
 * (atelectasia por secreciones distales), no con una caída del volumen entregado.
 */
const pacienteBase = paciente({
  R: 10,
  Rexp: 10,
  C: 0.05,
  espacioMuerto: 0.15,
  shunt: 0.15,
  reclutabilidad: 0.02,
  vco2: 200,
  tasBase: 128,
  tadBase: 74,
  fcBase: 92,
  pmus: { tipo: 'ninguno' },
});

const respiradorBase = respirador({
  modo: 'VC',
  vt: 0.42,
  flujo: 0.75,
  pausa: 0,
  fr: 16,
  peep: 5,
  fio2: 0.6,
  triggerFlujo: 0,
  alarmaPmax: 40,
});

/** Secreciones en la vía aérea: resistencia moderada y dientes de sierra. */
const secreciones = { R: 18, Rexp: 18, secreciones: 0.12, shunt: 0.18 };
/** Tapón mucoso en el tubo: obstrucción proximal grave (sin atrapamiento significativo) y shunt por atelectasia. */
const tapon = { R: 38, Rexp: 30, secreciones: 0.08, shunt: 0.3 };
/** Tubo nuevo: vía aérea limpia. */
const tuboNuevo = { R: 10, Rexp: 10, secreciones: 0, shunt: 0.15 };

export const caso06: Caso = {
  id: 'caso-06-secreciones-traslado',
  numero: 6,
  titulo: 'Secreciones y tapón mucoso en un traslado interhospitalario',
  nivel: 'intermedio',
  ambito: 'prehospital',
  etiquetasTema: ['secreciones', 'resistencia frente a compliance', 'auto-PEEP', 'regla DOPE', 'neumotórax'],
  objetivos: [
    'Tomar valores de referencia (Ppico, Pplat tras pausa inspiratoria) antes de un traslado y usarlos como comparación.',
    'Reconocer en VC el aumento de la Ppico con Pplat estable como un problema de resistencia, y calcular la resistencia a partir del gradiente y el flujo.',
    'Identificar los dientes de sierra del flujo espiratorio como huella de secreciones y aspirar con preoxigenación.',
    'Diferenciar la obstrucción proximal (secreciones, tapón, tubo) del broncoespasmo (atrapamiento, auto-PEEP) y de los problemas de compliance (selectiva, neumotórax).',
    'Aplicar la regla de oro del deterioro brusco y reconocer la sonda de aspiración que no pasa como indicación de cambiar el tubo.',
  ],
  datos: {
    edad: 66,
    sexo: 'hombre',
    talla: 175,
    pesoReal: 88,
    contexto:
      'Neumonía bilateral por gripe con insuficiencia respiratoria aguda. Intubado hace 6 horas en un hospital comarcal. Traslado secundario en UVI móvil (unos 90 minutos por carretera) a la UCI del hospital de referencia. Sedado y relajado, hemodinámicamente estable.',
  },
  pacienteInicial: pacienteBase,
  respiradorInicial: respiradorBase,
  pasos: [
    {
      id: 'p1',
      titulo: 'Antes de salir: valores de referencia',
      narrativa:
        'Hombre de 66 años, **175 cm** y 88 kg, con neumonía bilateral intubado hace 6 horas en un hospital comarcal. Vais a trasladarlo en UVI móvil a la UCI de referencia: unos 90 minutos de carretera. ' +
        'Está sedado con propofol y relajado con cisatracurio en perfusión (dosis según protocolo local). Abundantes secreciones en la hoja de enfermería; la última aspiración fue hace 3 horas.\n\n' +
        'Lo pasas al respirador de transporte en **volumen control: Vt 420 ml, flujo 45 L/min (0,75 L/s) sin pausa, FR 16, PEEP 5, FiO₂ 0,6**, alarma de presión máxima en 40 cmH₂O.\n\n' +
        'El monitor muestra **Ppico 21 cmH₂O**, VTI = VTE 420 ml, VM 6,7 L/min, EtCO₂ 35 mmHg, SpO₂ 99 %. TA 128/74, FC 92. Antes de arrancar haces una **pausa inspiratoria**: **Pplat 13–14 cmH₂O**.',
      pregunta: '¿Cómo interpretas Ppico 21 y Pplat 14 y qué utilidad tienen antes de salir?',
      opciones: [
        {
          texto: 'Gradiente Ppico − Pplat ≈ 7 cmH₂O con flujo 0,75 L/s: resistencia ≈ 10 cmH₂O/L/s (normal). Compliance estática 420 / (14 − 5) ≈ 50 ml/cmH₂O. Anoto Ppico y Pplat como valores de referencia para comparar durante el traslado.',
          correcta: true,
          explicacion:
            'En VC con flujo constante, Ppico − Pplat = R × flujo, así que R = 7 / 0,75 ≈ 10 cmH₂O/L/s (patológica > 15). La compliance estática es Vt / (Pplat − PEEP) = 420 / 9 ≈ 50 ml/cmH₂O (patológica < 50). ' +
            'Los dos componentes son normales y, sobre todo, quedan anotados: cualquier cambio durante el traslado se interpretará comparándolo con estos valores. El Vt de 420 ml es 6 ml/kg de peso ideal (50 + 0,91 × [175 − 152,4] ≈ 70,6 kg).',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'Una Pplat de 14 es demasiado baja para una neumonía bilateral: el pulmón está poco reclutado. Subo la PEEP a 10 antes de salir.',
          correcta: false,
          explicacion:
            'Una Pplat baja con este Vt significa que la compliance está conservada, no que falte reclutamiento. La PEEP se titula por la oxigenación (SpO₂ 99 % con FiO₂ 0,6), no por la Pplat, y justo antes de un traslado conviene no hacer cambios innecesarios en un paciente estable.',
          etiquetaTema: 'oxigenación',
        },
        {
          texto: 'Un gradiente de 7 cmH₂O indica que el tubo y el filtro ofrecen demasiada resistencia: cambio el tubo por uno de mayor calibre antes de salir.',
          correcta: false,
          explicacion:
            'El gradiente depende de la resistencia y del flujo: con 0,75 L/s, 7 cmH₂O equivalen a R ≈ 10, un valor normal para un tubo del 8 con filtro. Cambiar un tubo sin indicación expone al paciente a los riesgos de una nueva intubación.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'Con Ppico 21 el paciente está hipoventilado: subo la FR a 24 para bajar el CO₂ antes del traslado.',
          correcta: false,
          explicacion:
            'La Ppico no informa de la ventilación. El EtCO₂ de 35 mmHg con VM 6,7 L/min indica normocapnia. Subir la FR a 24 acortaría el tiempo espiratorio y provocaría hipocapnia sin ningún beneficio.',
          etiquetaTema: 'ventilación y CO2',
        },
      ],
      // Durante la primera media hora de carretera se acumulan secreciones en la vía aérea.
      transicion: { paciente: secreciones, duracion: 30 },
    },
    {
      id: 'p2',
      titulo: 'A los 30 minutos de carretera',
      narrativa:
        'Lleváis media hora de viaje. No ha saltado ninguna alarma, pero al mirar el monitor ves que la **Ppico ha subido a 27 cmH₂O** (de 21). El VTE sigue en 420 ml, el EtCO₂ en 35 mmHg y la SpO₂ en el 97–98 %.\n\n' +
        'En la curva de **flujo**, la rama espiratoria ya no es lisa: muestra **oscilaciones rápidas e irregulares, en dientes de sierra**, que también se adivinan en la curva de presión. El flujo espiratorio llega a 0 antes del siguiente ciclo. El paciente sigue relajado, sin esfuerzos.',
      pregunta: '¿Qué ha cambiado y cuál es la causa más probable?',
      pista: 'Haz una pausa inspiratoria y compara la Pplat con la de referencia (14). Una pausa espiratoria te dirá si hay auto-PEEP.',
      opciones: [
        {
          texto: 'La Ppico ha subido 6 cmH₂O pero la Pplat sigue en ≈ 14: el gradiente es ahora ≈ 13 y la resistencia calculada ≈ 18 cmH₂O/L/s (> 15). Es un problema de resistencia, y los dientes de sierra en el flujo espiratorio apuntan a secreciones en el tubo o la vía aérea.',
          correcta: true,
          explicacion:
            'Pplat sin cambios = compliance sin cambios; Ppico más alta con la misma Pplat = más resistencia. El respirador muestra tras la pausa una R ≈ 13 / 0,75 ≈ 18, claramente patológica. ' +
            'Los dientes de sierra son el aire espirado pasando a través de secreciones que vibran: son la huella de las secreciones. El flujo espiratorio llega a 0 y la auto-PEEP es ≈ 0, lo que descarta un atrapamiento significativo.',
          etiquetaTema: 'secreciones',
        },
        {
          texto: 'Ha caído la compliance: con los baches el tubo se ha desplazado a un bronquio (selectiva) o se ha producido un neumotórax.',
          correcta: false,
          explicacion:
            'Con un problema de compliance (selectiva, neumotórax) la Pplat y la driving pressure subirían junto con la Ppico y el gradiente Ppico − Pplat no cambiaría. Aquí la Pplat se mantiene en ≈ 14 y solo ha crecido el gradiente: el problema es de resistencia.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'Es un broncoespasmo: la neumonía ha desencadenado obstrucción bronquial y hay que nebulizar un broncodilatador.',
          correcta: false,
          explicacion:
            'El broncoespasmo es una obstrucción distal con resistencia espiratoria mucho mayor que la inspiratoria: el flujo espiratorio decae lentamente, no llega a 0 antes del siguiente ciclo y aparece auto-PEEP (PEEP total > 5 tras la pausa espiratoria). ' +
            'Aquí el flujo espiratorio llega a 0, la PEEP total es ≈ 5 y la curva muestra dientes de sierra, que no son propios del broncoespasmo.',
          etiquetaTema: 'auto-PEEP',
        },
        {
          texto: 'El paciente se está desadaptando por sedación insuficiente: las irregularidades son esfuerzos respiratorios.',
          correcta: false,
          explicacion:
            'La desadaptación produce muescas negativas en la curva de presión durante la inspiración, flujo errático y una FR total mayor que la programada. Aquí la FR es la programada (16), no hay deflexiones negativas y las oscilaciones son rápidas y limitadas a la espiración: son secreciones, no esfuerzos.',
          etiquetaTema: 'asincronía',
        },
      ],
    },
    {
      id: 'p3',
      titulo: 'Qué hacer con las secreciones',
      narrativa:
        'Tienes claro que hay secreciones en la vía aérea: Ppico 27 con Pplat ≈ 14 (R ≈ 18) y dientes de sierra en el flujo espiratorio. Estáis en marcha, a unos 50 minutos del hospital de destino.',
      pregunta: '¿Qué haces?',
      opciones: [
        {
          texto: 'Preoxigenar con FiO₂ 1,0 durante un par de minutos y aspirar por el tubo (con sistema cerrado si lo hay, o con desconexión breve), sin forzar; después comprobar que la Ppico y los dientes de sierra han mejorado y volver a FiO₂ 0,6.',
          correcta: true,
          explicacion:
            'Las secreciones se tratan aspirándolas. La aspiración produce desreclutamiento e hipoxemia transitoria, por eso se preoxigena antes. Se comprueba la eficacia en el monitor: la Ppico debe volver hacia el valor de referencia y los dientes de sierra, desaparecer. ' +
            'Si la sonda no progresa, hay que pensar en un tubo obstruido.',
          etiquetaTema: 'secreciones',
        },
        {
          texto: 'Bajar el Vt a 250 ml para que baje la Ppico y evitar que salte la alarma durante el viaje.',
          correcta: false,
          explicacion:
            'Bajar el Vt reduce algo la Ppico pero no toca la causa (la resistencia sigue siendo 18) y provoca hipoventilación: el VM cae a 4 L/min y el EtCO₂ empieza a subir. Nunca se compensa un problema de resistencia hipoventilando al paciente.',
          etiquetaTema: 'ventilación protectora',
          consecuencia: 'La Ppico solo baja a 24 cmH₂O, el VM cae a 4 L/min y el EtCO₂ empieza a subir: hipoventilación sin resolver las secreciones.',
          transicionConsecuencia: { respirador: { vt: 0.25 } },
        },
        {
          texto: 'Nebulizar salbutamol por el circuito (dosis según protocolo local) y esperar a ver si baja la Ppico.',
          correcta: false,
          explicacion:
            'No hay datos de broncoespasmo (el flujo espiratorio llega a 0, no hay auto-PEEP, hay dientes de sierra). El broncodilatador no elimina las secreciones y perder minutos con él deja el problema sin tratar.',
          etiquetaTema: 'programación obstructiva',
        },
        {
          texto: 'Subir el flujo inspiratorio a 60 L/min para "vencer" la resistencia y que el volumen entre mejor.',
          correcta: false,
          explicacion:
            'En VC el volumen entra igual con cualquier flujo; lo que cambia es la presión: Ppico − Pplat = R × flujo, así que con 1 L/s el gradiente sube de 13 a 18 y la Ppico a unos 32 cmH₂O. Más flujo no resuelve una resistencia alta: la empeora en el manómetro.',
          etiquetaTema: 'resistencia frente a compliance',
          consecuencia: 'Con 60 L/min la Ppico sube a unos 32 cmH₂O: el gradiente crece con el flujo y las secreciones siguen ahí.',
          transicionConsecuencia: { respirador: { flujo: 1.0 } },
        },
      ],
      // Se aspira (mejoría transitoria) y, minutos después, un tapón de moco espeso obstruye el tubo.
      transicion: { paciente: tapon, duracion: 12 },
    },
    {
      id: 'p4',
      titulo: 'Alarma de presión alta',
      narrativa:
        'Aspiras con sistema cerrado tras preoxigenar: salen secreciones espesas y la Ppico mejora. Vuelves a FiO₂ 0,6.\n\n' +
        'Diez minutos después, en un tramo de carretera en obras, salta la **alarma de presión alta**: la **Ppico es de 43 cmH₂O** (límite 40). ' +
        'El VTE sigue marcando 420 ml. La **SpO₂ ha bajado al 93 %** y sigue cayendo; EtCO₂ 34 mmHg. TA 123/72, FC 96. El paciente sigue relajado.\n\n' +
        'Haces una **pausa inspiratoria: Pplat 15 cmH₂O**. Haces una **pausa espiratoria: PEEP total ≈ 6** (auto-PEEP ≈ 1). En la curva de flujo persisten los dientes de sierra y el flujo espiratorio vuelve a 0 antes del siguiente ciclo.',
      pregunta: '¿Qué te dice el monitor y cuál es el diagnóstico más probable?',
      pista: 'Compara Pplat (15) y PEEP total (6) con los de referencia. Calcula el gradiente Ppico − Pplat.',
      opciones: [
        {
          texto: 'Gradiente Ppico − Pplat ≈ 28 cmH₂O con Pplat casi igual que al salir (15 frente a 14): resistencia ≈ 38 cmH₂O/L/s con compliance conservada y sin apenas auto-PEEP. Obstrucción proximal grave: tapón de moco o tubo obstruido.',
          correcta: true,
          explicacion:
            'Toda la subida de la Ppico (de 21 a 43) está en el gradiente; la Pplat apenas ha cambiado (compliance ≈ 50 ml/cmH₂O, driving pressure ≈ 8). R = 28 / 0,75 ≈ 38: casi cuatro veces la de referencia. ' +
            'Que el flujo espiratorio llegue a 0 y la auto-PEEP sea ≈ 1 indica que la obstrucción está en la vía aérea proximal (tubo, tapón), no en los bronquios distales. La desaturación se explica por las secreciones distales y la atelectasia que producen.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'Neumotórax a tensión por los baches: Ppico 43 con desaturación.',
          correcta: false,
          explicacion:
            'El neumotórax es un problema de compliance: la Pplat y la driving pressure subirían de forma progresiva, con hipotensión y taquicardia. Aquí la Pplat es 15 (casi la de referencia), la driving pressure ≈ 8 y la TA se mantiene. La Ppico sube solo por el gradiente resistivo.',
          etiquetaTema: 'neumotórax',
        },
        {
          texto: 'Broncoespasmo grave: resistencia de 38 con desaturación.',
          correcta: false,
          explicacion:
            'La resistencia alta es compatible, pero en el broncoespasmo la resistencia espiratoria es mucho mayor que la inspiratoria: el flujo espiratorio no llega a 0, hay atrapamiento con auto-PEEP de varios cmH₂O y no hay dientes de sierra. ' +
            'Aquí el flujo llega a 0, la auto-PEEP es ≈ 1 y persisten los dientes de sierra: obstrucción proximal por secreciones.',
          etiquetaTema: 'auto-PEEP',
        },
        {
          texto: 'Intubación selectiva: el tubo se ha desplazado con el movimiento de la ambulancia.',
          correcta: false,
          explicacion:
            'Una selectiva mete los 420 ml en un solo pulmón: la Pplat subiría claramente (driving pressure ≈ 15 o más) y el gradiente Ppico − Pplat se mantendría. Aquí ocurre lo contrario: Pplat casi igual y gradiente cuatro veces mayor.',
          etiquetaTema: 'intubación selectiva',
        },
      ],
    },
    {
      id: 'p5',
      titulo: 'Deterioro brusco: regla de oro',
      narrativa:
        'La alarma de presión sigue sonando (Ppico 43), la **SpO₂ está en 93 % y bajando** y el EtCO₂ se mantiene en 34 mmHg. Faltan 35 minutos para el hospital de destino.',
      pregunta: '¿Cuál es la primera medida?',
      opciones: [
        {
          texto: 'Desconectar del respirador y ventilar con bolsa autoinflable con reservorio a FiO₂ 1,0, valorando la resistencia a la insuflación, y pasar una sonda de aspiración por el tubo mientras repaso el DOPE.',
          correcta: true,
          explicacion:
            'Es la regla de oro ante el deterioro brusco. Con la bolsa se garantiza la oxigenación y se "palpa" la resistencia: si la bolsa entra con dificultad el problema está en el tubo o en el paciente (Obstrucción, Pneumotórax), y si entra bien estaba en el respirador o el circuito. ' +
            'La sonda de aspiración confirma si el tubo está permeable.',
          etiquetaTema: 'regla DOPE',
        },
        {
          texto: 'Subir el límite de la alarma de presión a 60 cmH₂O para que el respirador siga entregando el volumen y continuar el viaje.',
          correcta: false,
          explicacion:
            'Silenciar la alarma no trata la causa: la Ppico sigue en 43, la obstrucción progresa y la SpO₂ sigue bajando. Además, se expone al paciente a presiones pico muy altas. La alarma avisa de un problema que hay que resolver, no ocultar.',
          etiquetaTema: 'regla DOPE',
          consecuencia: 'La alarma se calla, pero la Ppico sigue en 43 y la SpO₂ sigue en 93 % y bajando: nada ha cambiado para el paciente.',
          transicionConsecuencia: { respirador: { alarmaPmax: 60 } },
        },
        {
          texto: 'Cambiar a presión control con ΔP 14 sobre PEEP 5: así la presión queda limitada y deja de sonar la alarma.',
          correcta: false,
          explicacion:
            'En PC el respirador respeta la presión, pero con R ≈ 38 el flujo que entra es mínimo: el VTE cae a unos 250 ml y la hipoventilación se suma a la hipoxemia. Cambiar de modo solo transforma la alarma de presión en una alarma de volumen; la obstrucción sigue ahí.',
          etiquetaTema: 'resistencia frente a compliance',
          consecuencia: 'Ppico 19 cmH₂O, pero el VTE cae a unos 250 ml (VM ≈ 4 L/min) y el EtCO₂ empieza a subir.',
          transicionConsecuencia: { respirador: { modo: 'PC', deltaP: 14, ti: 1.0 } },
        },
        {
          texto: 'Subir la PEEP a 10 cmH₂O para tratar la desaturación.',
          correcta: false,
          explicacion:
            'La hipoxemia es consecuencia de la obstrucción y las secreciones; subir la PEEP sin resolverla añade 5 cmH₂O a una Ppico que ya está en 43 (pasa a unos 48) y aumenta la presión intratorácica. Primero, la regla de oro y resolver la causa.',
          etiquetaTema: 'oxigenación',
          consecuencia: 'La Ppico sube a unos 48 cmH₂O y la alarma sigue; la obstrucción no ha cambiado.',
          transicionConsecuencia: { respirador: { peep: 10 } },
        },
      ],
      transicion: { respirador: { fio2: 1.0 } },
    },
    {
      id: 'p6',
      titulo: 'La sonda no pasa',
      narrativa:
        'Desconectas y ventilas con bolsa a FiO₂ 1,0: **cada insuflación cuesta mucho**, la bolsa "rebota" y el tórax se expande poco, aunque de forma simétrica. Con oxígeno al 100 % la SpO₂ remonta lentamente hasta el 96–97 %. ' +
        'Auscultación: ruidos transmitidos gruesos, sin sibilancias; sin enfisema subcutáneo ni ingurgitación yugular; TA 122/72.\n\n' +
        'Pasas una **sonda de aspiración por el tubo y no progresa**: se detiene unos centímetros antes de la punta y no sale nada. Lo intentas una segunda vez con el mismo resultado.',
      pregunta: '¿Qué significa y qué haces?',
      opciones: [
        {
          texto: 'El tubo está obstruido (tapón de moco espeso): hay que cambiarlo. Sigo ventilando con bolsa a FiO₂ 1,0, preparo el material y la medicación de intubación (dosis según protocolo local), retiro el tubo e intubo con uno nuevo, confirmando con capnografía.',
          correcta: true,
          explicacion:
            'Una sonda que no pasa por la luz del tubo es un tubo obstruido o acodado: no se puede aspirar lo que no se alcanza y la obstrucción progresa. La solución es cambiar el tubo, con el paciente preoxigenado con bolsa y el material preparado. ' +
            'Si fuera imposible reintubar, se ventila con bolsa-mascarilla o un dispositivo supraglótico hasta conseguirlo.',
          etiquetaTema: 'secreciones',
        },
        {
          texto: 'Instilar suero por el tubo y repetir la aspiración varias veces hasta que la sonda pase.',
          correcta: false,
          explicacion:
            'Si la sonda no progresa en dos intentos, insistir con instilaciones solo consume minutos mientras el paciente sigue mal ventilado y la SpO₂ vuelve a caer. El tubo obstruido se cambia.',
          etiquetaTema: 'secreciones',
          consecuencia: 'Pasan varios minutos entre instilaciones e intentos: la sonda sigue sin pasar y la SpO₂ vuelve a caer por debajo del 90 %.',
          transicionConsecuencia: { gases: { spo2: 87 } },
        },
        {
          texto: 'Descomprimir el tórax con aguja en el segundo espacio intercostal: la resistencia a la bolsa indica neumotórax a tensión.',
          correcta: false,
          explicacion:
            'No hay ningún dato de neumotórax a tensión: la Pplat era normal (15), la TA se mantiene, no hay ingurgitación yugular ni asimetría. La resistencia a la bolsa y la sonda que no pasa localizan el problema en el tubo. Puncionar crearía un neumotórax que no existía.',
          etiquetaTema: 'neumotórax',
        },
        {
          texto: 'Nebulizar un broncodilatador por el tubo y seguir con la bolsa hasta que mejore la resistencia.',
          correcta: false,
          explicacion:
            'No hay sibilancias ni atrapamiento, y la sonda que no pasa demuestra una obstrucción mecánica de la luz del tubo. Un broncodilatador no la va a disolver; además el aerosol apenas llegaría más allá del tapón.',
          etiquetaTema: 'programación obstructiva',
        },
      ],
      transicion: { paciente: tuboNuevo, respirador: { fio2: 1.0 }, duracion: 10 },
    },
    {
      id: 'p7',
      titulo: 'Tras el cambio de tubo',
      narrativa:
        'Cambias el tubo por uno nuevo del 8 a 23 cm en la comisura: capnografía con onda desde el primer ciclo, auscultación simétrica. En la punta del tubo retirado hay un **tapón de moco espeso** que ocluía casi toda la luz.\n\n' +
        'Reconectas al respirador con la misma programación en VC y FiO₂ 1,0: **Ppico 21 cmH₂O**, Pplat 14 tras la pausa (gradiente 7, R ≈ 10), VTE 420 ml, curva de flujo espiratorio lisa, EtCO₂ 35 mmHg, **SpO₂ 100 %**. TA 128/74, FC 92.',
      pregunta: '¿Qué programación dejas para los 30 minutos de traslado que quedan?',
      opciones: [
        {
          texto: 'Mantener VC 420 ml, FR 16 y PEEP 5; bajar la FiO₂ progresivamente (0,6) para SatO₂ > 90 %; alarma de presión en 40 (unos 15–20 por encima de la Ppico); anotar los nuevos valores de referencia (Ppico 21, Pplat 14) y aspirar con preoxigenación si reaparecen los dientes de sierra.',
          correcta: true,
          explicacion:
            'Los valores han vuelto a los de referencia con la misma programación: el problema era el tubo. Queda titular la FiO₂ a la necesaria, dejar la alarma de presión a una distancia razonable de la Ppico (ni tan cerca que suene con cada bache ni tan lejos que no avise) y vigilar los signos precoces de secreciones para aspirar antes de que vuelva a formarse un tapón.',
          etiquetaTema: 'oxigenación',
        },
        {
          texto: 'Mantener FiO₂ 1,0 hasta llegar a la UCI, por si vuelve a desaturar.',
          correcta: false,
          explicacion:
            'Con SpO₂ 100 % y la causa resuelta, la FiO₂ se titula a la mínima necesaria para SatO₂ > 90 %. Mantener oxígeno al 100 % sin necesidad favorece las atelectasias por reabsorción y no previene un nuevo tapón.',
          etiquetaTema: 'oxigenación',
        },
        {
          texto: 'Subir la PEEP a 10 cmH₂O para reclutar las zonas atelectasiadas por el tapón y prevenir nuevos tapones.',
          correcta: false,
          explicacion:
            'La PEEP no previene los tapones (eso lo hacen la humidificación y la aspiración) y no hay hipoxemia que justifique subirla: SpO₂ 100 %. Subirla añade presión intratorácica sin indicación.',
          etiquetaTema: 'oxigenación',
        },
        {
          texto: 'Pasar a presión control para que el respirador limite la presión y no vuelva a saltar la alarma si se repite la obstrucción.',
          correcta: false,
          explicacion:
            'En PC una nueva obstrucción no sonaría como alarma de presión sino como caída silenciosa del VTE (hipoventilación), que es más difícil de reconocer a tiempo en una ambulancia. El modo no evita la obstrucción; la vigilancia de Ppico y de la curva de flujo en VC es precisamente lo que permitió detectarla.',
          etiquetaTema: 'resistencia frente a compliance',
        },
      ],
      transicion: { respirador: { fio2: 0.6 } },
    },
  ],
  puntosClave: [
    'Antes de un traslado, anota Ppico y Pplat (tras pausa inspiratoria) como valores de referencia: todo cambio se interpreta comparándolo con ellos.',
    'En VC, Ppico que sube con Pplat estable = problema de resistencia; R = (Ppico − Pplat) / flujo, patológica > 15 cmH₂O/L/s. Si sube la Pplat, el problema es de compliance (selectiva, neumotórax).',
    'Los dientes de sierra en el flujo espiratorio son secreciones: preoxigenar y aspirar. El broncoespasmo se distingue porque el flujo espiratorio no llega a 0 y hay auto-PEEP.',
    'Ante un deterioro brusco o una alarma de presión alta: desconectar y ventilar con bolsa a FiO₂ 1,0 (DOPE). Si la sonda de aspiración no pasa, el tubo está obstruido: hay que cambiarlo.',
    'Tras resolver la causa, comprueba en el monitor que Ppico y Pplat vuelven a los valores de referencia con la misma programación, y titula la FiO₂ para SatO₂ > 90 %.',
  ],
  expectativas: [
    {
      paso: 0,
      descripcion: 'Estado inicial: R calculada ≈ 10 (< 15), Pplat 12–15, VTE 400–440 ml (≈ 6 ml/kg), SpO₂ ≥ 96 %',
      comprobar: (m) =>
        m.resistencia !== null && m.resistencia < 15 && m.pplat !== null && m.pplat > 12 && m.pplat < 15 && m.vte > 0.4 && m.vte < 0.44 && m.spo2 >= 96,
    },
    {
      paso: 1,
      descripcion: 'Secreciones: R calculada > 15, Ppico sube ≥ 4 sobre la inicial, Pplat estable (±2), sin auto-PEEP (< 1) y flujo espiratorio que llega a 0',
      comprobar: (m, t) =>
        m.resistencia !== null && m.resistencia > 15 && m.ppico >= (t[0]?.ppico ?? 0) + 4 && m.pplat !== null && Math.abs(m.pplat - (t[0]?.pplat ?? 0)) <= 2 && m.autoPeepReal < 1 && Math.abs(m.flujoFinEsp) < 0.05,
    },
    {
      paso: 3,
      descripcion: 'Tapón: Ppico > 40 (alarma), R calculada > 30, Pplat estable (±2) y driving pressure igual (±1), auto-PEEP < 2 y SpO₂ < 94 %',
      comprobar: (m, t) =>
        m.ppico > 40 && m.resistencia !== null && m.resistencia > 30 && m.pplat !== null && Math.abs(m.pplat - (t[0]?.pplat ?? 0)) <= 2 &&
        m.drivingPressure !== null && Math.abs(m.drivingPressure - (t[0]?.drivingPressure ?? 0)) <= 1 && m.autoPeepReal < 2 && m.spo2 < 94,
    },
    {
      paso: 3,
      descripcion: 'Tapón: la compliance estática se mantiene (≥ 45 ml/cmH₂O) y el VTE sigue siendo el programado',
      comprobar: (m) => m.complianceEstatica !== null && m.complianceEstatica >= 0.045 && m.vte > 0.4,
    },
    {
      paso: 5,
      descripcion: 'Con FiO₂ 1,0 (bolsa) la SpO₂ remonta por encima del 95 % aunque la obstrucción persista (Ppico > 40)',
      comprobar: (m) => m.spo2 > 95 && m.ppico > 40,
    },
    {
      paso: 6,
      descripcion: 'Tras cambiar el tubo: Ppico vuelve a la inicial (±1), R calculada < 15 y SpO₂ ≥ 98 %',
      comprobar: (m, t) => Math.abs(m.ppico - (t[0]?.ppico ?? 0)) <= 1 && m.resistencia !== null && m.resistencia < 15 && m.spo2 >= 98,
    },
    {
      paso: 7,
      descripcion: 'Con FiO₂ 0,6 la SpO₂ se mantiene ≥ 96 % y la PaCO₂ es normal (35–45)',
      comprobar: (m) => m.spo2 >= 96 && m.paco2 >= 35 && m.paco2 <= 45,
    },
  ],
};
