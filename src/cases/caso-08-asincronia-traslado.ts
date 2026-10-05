import type { Caso } from './schema';
import { paciente, respirador } from '../engine/defaults';

/**
 * Caso 8 · Desadaptación y asincronía al despertar en traslado (PC controlado → asistido).
 * Ámbito prehospital: la sedación se agota en pleno vuelo y el paciente se despierta
 * con el respirador en controlado puro. La narrativa cita solo números que produce el
 * motor (ver `npm run medidas -- src/cases/caso-08-asincronia-traslado.ts`).
 *
 * Nota de modelado: en PC el motor mantiene la presión programada, así que la asincronía
 * se ve en las curvas de flujo y volumen (y en el capnograma), no en la de presión.
 * En el estado desadaptado la PaCO₂ de equilibrio depende del ciclo que mide el motor
 * (el VTE oscila entre ~300 y ~820 ml), por lo que se fija con `gases` un valor
 * coherente con el VTE medio; al pasar a asistido se vuelve al modelo (`gases: {}`).
 */
const pacienteBase = paciente({
  R: 10,
  Rexp: 10,
  // Contusión pulmonar derecha leve: compliance algo por debajo de lo normal.
  C: 0.045,
  espacioMuerto: 0.15,
  shunt: 0.1,
  reclutabilidad: 0.02,
  // Joven politraumatizado: producción de CO₂ algo elevada.
  vco2: 220,
  tasBase: 128,
  tadBase: 76,
  fcBase: 84,
  pmus: { tipo: 'ninguno' },
  // Ganancia 0 para que, al despertar, el esfuerzo aparezca en rampa.
  pmusGanancia: 0,
});

const respiradorBase = respirador({
  modo: 'PC',
  deltaP: 12,
  ti: 1.0,
  fr: 16,
  peep: 5,
  fio2: 0.5,
  triggerFlujo: 0,
  alarmaPmax: 40,
});

/** Esfuerzos fuera de fase con el respirador (sedación agotada, dolor). */
const desadaptado = {
  pmus: { tipo: 'desadaptado', amp1: 9, per1: 1.3, amp2: 5, per2: 0.55 } as const,
  pmusGanancia: 1,
  tasBase: 155,
  tadBase: 92,
  fcBase: 118,
};

/** Tras la analgesia: esfuerzos regulares a unas 22 rpm, aún enérgicos. */
const esfuerzoRegular = {
  pmus: { tipo: 'espontaneo', fr: 22, amplitud: 6, ti: 0.8 } as const,
  pmusGanancia: 1,
  tasBase: 140,
  tadBase: 84,
  fcBase: 100,
};

/** Tras ajustar la sedación: esfuerzo más suave a 18 rpm. */
const esfuerzoSedado = {
  pmus: { tipo: 'espontaneo', fr: 18, amplitud: 5, ti: 0.8 } as const,
  pmusGanancia: 0.6,
  tasBase: 130,
  tadBase: 78,
  fcBase: 90,
};

export const caso08: Caso = {
  id: 'caso-08-asincronia-traslado',
  numero: 8,
  titulo: 'Desadaptación y asincronía al despertar en traslado',
  nivel: 'intermedio',
  ambito: 'prehospital',
  etiquetasTema: ['asincronía', 'regla DOPE', 'ventilación y CO2', 'ventilación protectora', 'hemodinámica'],
  objetivos: [
    'Reconocer en las curvas de flujo y volumen (y en el capnograma) los esfuerzos del paciente fuera de fase con un respirador en controlado puro.',
    'Enumerar los riesgos de la desadaptación en un traumatizado con TCE: barotrauma, aumento de la PIC, autoextubación y volumen corriente ineficaz.',
    'Descartar primero las causas corregibles (bomba y vía de sedoanalgesia, dolor, hipoxemia, hipercapnia, tubo, neumotórax, globo vesical) antes de sedar más o relajar.',
    'Pasar de PC controlado a PC asistido activando el trigger y comprobar en el monitor que la FR total la marca el paciente y que el flujo vuelve a ser regular.',
    'Ajustar sedoanalgesia y ΔP para una FR y un volumen corriente adecuados, con normocapnia en el TCE.',
  ],
  datos: {
    edad: 24,
    sexo: 'hombre',
    talla: 182,
    pesoReal: 88,
    contexto:
      'Motorista con politraumatismo: TCE moderado (GCS 11 inicial, TC con contusión frontal sin efecto masa), contusión pulmonar derecha leve y fractura cerrada de fémur derecho. ' +
      'Intubado en el hospital comarcal por agitación y para el traslado. Traslado secundario en helicóptero medicalizado al hospital de referencia con neurocirugía (unos 35 minutos de vuelo).',
  },
  pacienteInicial: pacienteBase,
  respiradorInicial: respiradorBase,
  pasos: [
    {
      id: 'p1',
      titulo: 'Antes de despegar',
      narrativa:
        'Hombre de 24 años, **182 cm** y 88 kg, politraumatizado con TCE moderado, contusión pulmonar derecha y fractura de fémur. Lo recoges intubado en el hospital comarcal para un vuelo de unos 35 minutos. ' +
        'Está sedado con propofol y analgesiado con fentanilo en bomba de jeringa (dosis según protocolo local); el relajante de la intubación ya ha dejado de hacer efecto.\n\n' +
        'Lo conectas al respirador de transporte en **presión control: ΔP 12 cmH₂O sobre PEEP 5, Ti 1,0 s, FR 16, FiO₂ 0,5, trigger desactivado** (controlado puro).\n\n' +
        'El monitor muestra una curva de presión rectangular hasta **Ppico 17 cmH₂O**, flujo inspiratorio decelerado que llega a cero antes de acabar el Ti, **VTE de unos 475 ml**, VM 7,6 L/min, FR 16, **EtCO₂ 32 mmHg**, SpO₂ 99 %. TA 128/76, FC 84.',
      pregunta: '¿Qué valoración haces de la programación y de qué debes asegurarte antes de salir?',
      opciones: [
        {
          texto:
            'La programación es adecuada: con 182 cm el peso ideal es de unos 77 kg y 475 ml son ≈ 6 ml/kg, con EtCO₂ 32 (normocapnia). Como el trigger está desactivado, debo garantizar la sedoanalgesia continua durante todo el vuelo (jeringas cargadas, bomba con batería, vía comprobada).',
          correcta: true,
          explicacion:
            'Peso ideal (hombre) = 50 + 0,91 × (182 − 152,4) ≈ 77 kg; 6 ml/kg ≈ 460 ml, y el VTE medido es de unos 475 ml. La EtCO₂ de 32 mmHg corresponde a una PaCO₂ en torno a 37: normocapnia, el objetivo en el TCE. ' +
            'En controlado puro el respirador no responde a los esfuerzos del paciente: si la sedación se agota en vuelo luchará contra el respirador. Por eso, antes de despegar, se comprueban la bomba, su autonomía y la vía.',
          etiquetaTema: 'ventilación protectora',
        },
        {
          texto: 'El TCE obliga a hiperventilar para bajar la PIC: subo la FR a 24 antes de salir.',
          correcta: false,
          explicacion:
            'La hiperventilación profiláctica está contraindicada en el TCE: la hipocapnia produce vasoconstricción cerebral e isquemia. El objetivo es la normocapnia (PaCO₂ 35–40 mmHg), que ya tenemos con EtCO₂ 32.',
          etiquetaTema: 'ventilación y CO2',
        },
        {
          texto: 'Mejor activar ya el trigger y reducir la sedación para que respire por su cuenta durante el vuelo.',
          correcta: false,
          explicacion:
            'Un TCE moderado recién intubado, con dolor por la fractura y en un entorno donde no se le puede explorar ni contener bien, necesita sedoanalgesia estable durante el traslado. Activar el trigger no es un error en sí mismo, pero aligerar la sedación en vuelo sí lo es.',
          etiquetaTema: 'asincronía',
        },
        {
          texto: 'Cambio a volumen control con 8 ml/kg de peso real (unos 700 ml): en PC no se garantiza el volumen y en un vuelo largo prefiero asegurarlo.',
          correcta: false,
          explicacion:
            'El volumen corriente se calcula sobre el peso ideal por la talla, no sobre el peso real, y el objetivo es 6 ml/kg: 700 ml serían más de 9 ml/kg de peso ideal. En PC el volumen se vigila en el monitor (VTE) y ahora es el adecuado.',
          etiquetaTema: 'ventilación protectora',
        },
      ],
      // A los 20 minutos de vuelo la jeringa de propofol se acaba: el paciente se despierta con dolor.
      transicion: { paciente: desadaptado, duracion: 10, gases: { paco2: 28 } },
    },
    {
      id: 'p2',
      titulo: 'Veinte minutos de vuelo',
      // Minutos de vuelo con el paciente despierto: gases y hemodinámica llegan al equilibrio.
      saltoTiempo: 180,
      narrativa:
        'A los 20 minutos de vuelo salta de forma intermitente la alarma de **volumen corriente bajo** del respirador. El paciente mueve la cabeza y las piernas y tiene lagrimeo. TA 150/90, FC 122. SpO₂ 99 %.\n\n' +
        'En el monitor, la curva de **presión** ya no es un rectángulo limpio: el respirador sigue llegando a su Ppico de 17 cmH₂O, pero aparecen **muescas** durante la inspiración y **picos y valles** durante la espiración, por encima y por debajo de la PEEP. La de **flujo** ha perdido su forma: el flujo inspiratorio decelerado se interrumpe y **se invierte en mitad de la inspiración**, y en la espiración el flujo se corta a cero y vuelve a aparecer antes del siguiente ciclo. ' +
        'El **VTE cambia de un ciclo a otro: unos 300 ml en uno, 600 en el siguiente, más de 800 en otro**, con un VTI idéntico al VTE en cada ciclo. La FR marca 16, igual que la programada. ' +
        'El EtCO₂ ha bajado a unos **21 mmHg** y el capnograma es irregular, con **hendiduras en la meseta**.',
      pregunta: '¿Qué te dicen las curvas y los números?',
      pista: 'Compara la curva de flujo con la del principio: ¿la espiración llega a cero y se queda ahí hasta el siguiente ciclo? ¿Qué hace el VTE ciclo a ciclo? Las pausas inspiratoria y espiratoria no dan valores fiables con el paciente activo.',
      opciones: [
        {
          texto:
            'El paciente se ha despertado y hace esfuerzos fuera de fase con el respirador (desadaptación): en PC el respirador mantiene la presión, así que el esfuerzo se ve en el flujo errático, en el VTE que oscila y en las hendiduras del capnograma. La FR no cambia porque el trigger está desactivado.',
          correcta: true,
          explicacion:
            'Con el trigger desactivado el respirador cicla a 16 pase lo que pase. Cada esfuerzo inspiratorio del paciente suma volumen (VTE de 800 ml) y cada esfuerzo espiratorio lo resta o invierte el flujo (VTE de 300 ml). ' +
            'La hendidura en la meseta del capnograma es un esfuerzo inspiratorio durante la espiración. Taquicardia, hipertensión y lagrimeo apuntan a dolor y despertar: hay que buscar la causa (¿bomba?) y resolverla.',
          etiquetaTema: 'asincronía',
        },
        {
          texto: 'Hay una fuga en el circuito o en el neumotaponamiento: por eso el volumen es variable.',
          correcta: false,
          explicacion:
            'Con fuga el VTE sería sistemáticamente menor que el VTI y la curva de volumen no volvería a cero. Aquí VTI y VTE coinciden en cada ciclo y lo que varía es el volumen de un ciclo a otro, en ambos sentidos: eso lo hace el paciente, no una fuga.',
          etiquetaTema: 'fuga y desconexión',
        },
        {
          texto: 'Broncoespasmo por la contusión pulmonar: el flujo espiratorio no vuelve a cero.',
          correcta: false,
          explicacion:
            'En el broncoespasmo el flujo espiratorio decae lento y uniforme, sin llegar a cero antes del siguiente ciclo, en todos los ciclos por igual, y aparece auto-PEEP; el pico de flujo inspiratorio en PC sería menor. ' +
            'Aquí el flujo se corta y reaparece de forma irregular y el VTE oscila: son esfuerzos del paciente.',
          etiquetaTema: 'programación obstructiva',
        },
        {
          texto: 'Neumotórax a tensión por la contusión: la compliance ha caído y por eso el volumen es bajo.',
          correcta: false,
          explicacion:
            'Un neumotórax a tensión reduce el VTE de forma progresiva y mantenida en todos los ciclos, con hipotensión y taquicardia. Aquí el VTE unas veces baja y otras sube hasta 800 ml, la TA está alta y la SpO₂ es del 99 %. ' +
            'La hipertensión y el lagrimeo señalan dolor y despertar, no un neumotórax.',
          etiquetaTema: 'neumotórax',
        },
      ],
    },
    {
      id: 'p3',
      titulo: 'Riesgos y primera actuación',
      narrativa:
        'El paciente sigue luchando contra el respirador: tose con el tubo, intenta llevarse la mano a la cara y la FC está en 122. El VTE sigue oscilando entre unos 300 y 800 ml con la Ppico fija en 17 cmH₂O.\n\n' +
        'Piensa en lo que te juegas en un TCE que lucha contra el respirador: **aumento de la PIC** (tos, Valsalva, hipertensión), **barotrauma** por los volúmenes de 800 ml que se suman al esfuerzo, **autoextubación** y una ventilación ineficaz con ciclos de 300 ml.',
      pregunta: '¿Cuál es tu primera actuación?',
      opciones: [
        {
          texto:
            'Comprobar la bomba y la vía de sedoanalgesia, y repasar las causas corregibles: dolor (fémur), hipoxemia (SpO₂ 99 %, no), hipercapnia (EtCO₂ 21, no), tubo (marca y auscultación), neumotórax (VTE no cae de forma mantenida, TA alta: no) y globo vesical. Si hay dolor, analgesia primero (dosis según protocolo local). Mientras tanto, sujetar el tubo y proteger la vía aérea.',
          correcta: true,
          explicacion:
            'Antes de sedar más hay que preguntarse por qué lucha: lo más frecuente en un traslado es que la perfusión se haya acabado o que la vía se haya salido, y lo más doloroso aquí es el fémur. ' +
            'El monitor ya descarta hipoxemia e hipercapnia, y el patrón del VTE (sube y baja) descarta una pérdida de compliance. Si hubiera deterioro brusco (desaturación, hipotensión), la regla de oro sería desconectar y ventilar con bolsa (DOPE); con SpO₂ 99 % y la causa a la vista, no es el caso.',
          etiquetaTema: 'regla DOPE',
        },
        {
          texto: 'Administrar un relajante muscular (dosis según protocolo local) para que deje de luchar y poder seguir en controlado.',
          correcta: false,
          explicacion:
            'Relajar a un paciente despierto y con dolor es inaceptable: las curvas se limpian, pero el paciente queda paralizado, consciente y sufriendo, con taquicardia e hipertensión que en un TCE suben la PIC. ' +
            'El relajante nunca sustituye a la analgesia y la sedación; solo se plantea cuando, bien sedado y analgesiado, persiste una asincronía que no se puede corregir.',
          etiquetaTema: 'asincronía',
          consecuencia:
            'Las curvas vuelven a ser regulares, pero el paciente está despierto y paralizado: la FC sube hacia 135 y la TA hacia 175/100.',
          transicionConsecuencia: {
            paciente: { pmus: { tipo: 'ninguno' }, fcBase: 135, tasBase: 175, tadBase: 100 },
            duracion: 4,
          },
        },
        {
          texto: 'Subir la ΔP a 20 cmH₂O: así los ciclos "pequeños" de 300 ml dejan de ser insuficientes.',
          correcta: false,
          explicacion:
            'Subir la ΔP no corrige la asincronía: los ciclos en que el paciente inspira con el respirador pasarían de 800 a más de 1.000 ml con Ppico 25, y los ciclos "pequeños" seguirían existiendo. Más presión y más volumen en un pulmón contundido es más riesgo de barotrauma.',
          etiquetaTema: 'ventilación protectora',
          consecuencia: 'Con ΔP 20 la Ppico sube a 25 cmH₂O y los ciclos grandes superan los 1.000 ml; el VTE sigue oscilando.',
          transicionConsecuencia: { respirador: { deltaP: 20 } },
        },
        {
          texto: 'Subir la FR programada a 24 para "ganarle" al paciente y que no le dé tiempo a hacer esfuerzos.',
          correcta: false,
          explicacion:
            'El respirador sigue en controlado puro: sus ciclos no coinciden con los esfuerzos del paciente por mucho que aumente la frecuencia. El flujo sigue errático y el VTE oscilando, y además se hiperventila a un TCE que ya tiene EtCO₂ 21.',
          etiquetaTema: 'asincronía',
          consecuencia: 'A FR 24 el VTE sigue oscilando (entre unos 260 y 800 ml) y el Te se acorta; los esfuerzos siguen fuera de fase.',
          transicionConsecuencia: { respirador: { fr: 24 } },
        },
      ],
      // Se encuentra la causa: jeringa de propofol vacía. Se administra analgesia y se reinicia
      // la sedación; el paciente hace ahora esfuerzos regulares a unas 22 rpm, pero el respirador
      // sigue en controlado puro.
      transicion: { paciente: esfuerzoRegular, duracion: 10, gases: { paco2: 30 } },
    },
    {
      id: 'p4',
      titulo: 'Causa encontrada: la bomba',
      // "Dos minutos después" del bolo de analgesia.
      saltoTiempo: 120,
      narrativa:
        'La bomba de propofol marca **"fin de infusión"** y la jeringa está vacía; la vía periférica refluye bien. La marca del tubo sigue a 23 cm en la comisura, la auscultación es simétrica, no hay globo vesical. ' +
        'Administras un bolo de fentanilo y reinicias el propofol con una jeringa nueva (dosis según protocolo local).\n\n' +
        'Dos minutos después el paciente está más tranquilo (TA 138/83, FC 100), pero sigue respirando: ahora hace **esfuerzos regulares, unos 22 por minuto**. El respirador sigue en controlado puro a 16: en la curva de flujo se siguen viendo los esfuerzos fuera de fase y el **VTE sigue variando entre unos 340 y 630 ml**. EtCO₂ 23 mmHg.',
      pregunta: 'Mientras la sedación hace efecto, ¿qué haces con el respirador?',
      opciones: [
        {
          texto: 'Activar el trigger (flujo, 2 L/min) manteniendo PC: el paciente dispara los ciclos y el respirador los sincroniza con su esfuerzo (PC asistido). Comprobar en el monitor que la FR total pasa a ser la del paciente y que el flujo vuelve a ser regular.',
          correcta: true,
          explicacion:
            'Un paciente con impulso respiratorio regular se adapta mejor si cada esfuerzo abre un ciclo: en PC asistido el respirador entrega la ΔP programada sincronizada con el esfuerzo y la FR programada queda como respaldo. ' +
            'El trigger por flujo a 2 L/min (o por presión a −0,5 a −2 cmH₂O) es la sensibilidad habitual. La comprobación es en el monitor: FR total igual a la del paciente (ciclos marcados como espontáneos) y curvas de flujo y volumen regulares.',
          etiquetaTema: 'asincronía',
        },
        {
          texto: 'Cambiar a volumen control con 460 ml y flujo de 30 L/min, con trigger activado: así aseguro el volumen de 6 ml/kg en cada ciclo.',
          correcta: false,
          explicacion:
            'En VC el flujo es fijo y un paciente despierto que demanda más flujo del que recibe "tira" del circuito: la presión se hunde durante la inspiración (curva cóncava), el llamado hambre de flujo. ' +
            'En PC el flujo es libre y se adapta a la demanda del paciente, por lo que es el modo más cómodo para sincronizar.',
          etiquetaTema: 'asincronía',
          consecuencia: 'En VC a 30 L/min la curva de presión se vuelve cóncava: cae hasta casi la PEEP en plena inspiración (hambre de flujo).',
          transicionConsecuencia: {
            respirador: { modo: 'VC', vt: 0.46, flujo: 0.5, pausa: 0, triggerFlujo: 2 },
            paciente: { pmus: { tipo: 'hambreFlujo', amplitud: 9 } },
            duracion: 2,
          },
        },
        {
          texto: 'No tocar el respirador: en cuanto la sedación haga efecto dejará de luchar.',
          correcta: false,
          explicacion:
            'Hasta que el propofol alcance de nuevo su efecto pasan varios minutos de asincronía, con tos, Valsalva y volúmenes irregulares en un TCE. Mientras tanto, activar el trigger es inmediato, no tiene coste y elimina la lucha.',
          etiquetaTema: 'asincronía',
        },
        {
          texto: 'Subir la FR programada a 22, igual que la del paciente, manteniendo el controlado puro.',
          correcta: false,
          explicacion:
            'Igualar la frecuencia no sincroniza las fases: sin trigger, el respirador cicla a su ritmo y el paciente al suyo, y aunque coincidan en número van desfasados. Solo el trigger hace que cada ciclo empiece con el esfuerzo.',
          etiquetaTema: 'asincronía',
          consecuencia: 'A FR 22 sin trigger los esfuerzos siguen fuera de fase: el flujo sigue errático y el VTE sigue oscilando.',
          transicionConsecuencia: { respirador: { fr: 22 } },
        },
      ],
      transicion: { respirador: { triggerFlujo: 2 }, gases: {} },
    },
    {
      id: 'p5',
      titulo: 'En asistido',
      // La PaCO₂ (τ ≈ 60 s) necesita unos minutos para caer con la VM de 12 L/min.
      saltoTiempo: 180,
      narrativa:
        'Con el trigger a 2 L/min el monitor cambia: todos los ciclos aparecen marcados como **disparados por el paciente** y la **FR total es de 22**, la suya. Las curvas de flujo y volumen vuelven a ser regulares, ciclo tras ciclo iguales, y la Ppico sigue en 17 cmH₂O.\n\n' +
        'Pero fíjate en los números: **VTE de unos 560 ml** (≈ 7 ml/kg de peso ideal), **VM 12 L/min**, y el **EtCO₂ ha bajado a 17 mmHg**. SpO₂ 99 %. TA 138/83, FC 102.',
      pregunta: '¿Qué te dicen estos números y qué ajustas?',
      opciones: [
        {
          texto:
            'Está sincronizado, pero hiperventila: a 22 rpm con ΔP 12 cada ciclo entra con 560 ml y la VM de 12 L/min baja el EtCO₂ a 17, peligroso en un TCE. Ajusto la sedoanalgesia hasta una FR de 16–18 y bajo la ΔP a 10 para un VTE de ≈ 6 ml/kg, buscando EtCO₂ 32–35.',
          correcta: true,
          explicacion:
            'En asistido la FR la pone el paciente y el volumen lo pone la ΔP más su esfuerzo: la combinación de 22 rpm y 560 ml da una hipocapnia grave, con vasoconstricción cerebral en un TCE. ' +
            'La FR se corrige con la sedoanalgesia (no con la FR programada, que es solo respaldo) y el volumen con la ΔP. El objetivo es normocapnia (PaCO₂ 35–40, EtCO₂ algo menor) y un VTE de 6 ml/kg.',
          etiquetaTema: 'ventilación y CO2',
        },
        {
          texto: 'Alargar el Ti a 1,4 s: con más tiempo inspiratorio sube la presión media y mejora la oxigenación.',
          correcta: false,
          explicacion:
            'La oxigenación no es el problema (SpO₂ 99 %), sino la hiperventilación. Además, un Ti largo en un paciente despierto que quiere espirar antes produce espiración activa contra el respirador: una joroba de presión al final de la inspiración, con Ppico de unos 25 cmH₂O, y menos volumen.',
          etiquetaTema: 'asincronía',
          consecuencia: 'Con Ti 1,4 s el paciente espira contra el respirador: aparece una joroba al final de la inspiración con Ppico de unos 25 cmH₂O.',
          transicionConsecuencia: {
            respirador: { ti: 1.4 },
            paciente: { pmus: { tipo: 'espiracionActiva', amplitud: 14 } },
            duracion: 2,
          },
        },
        {
          texto: 'Desactivar el trigger otra vez: a 16 rpm controladas la VM baja y el EtCO₂ sube.',
          correcta: false,
          explicacion:
            'Volver al controlado puro con un paciente que respira a 22 devuelve la asincronía: flujo errático y VTE oscilante, sin controlar realmente la ventilación. La FR del paciente se baja con sedoanalgesia, no apagando el trigger.',
          etiquetaTema: 'asincronía',
          consecuencia: 'Sin trigger vuelven el flujo errático y el VTE variable (entre unos 340 y 630 ml).',
          transicionConsecuencia: { respirador: { triggerFlujo: 0 } },
        },
        {
          texto: 'Bajar la FR programada a 10: así el paciente respira menos y sube el EtCO₂.',
          correcta: false,
          explicacion:
            'En asistido la FR programada es la de respaldo: solo actúa si el paciente deja de disparar. Con el paciente a 22 rpm, la FR total seguirá siendo 22 con FR programada 10 o 16. Lo que baja la FR del paciente es la sedoanalgesia.',
          etiquetaTema: 'asincronía',
        },
      ],
      transicion: { paciente: esfuerzoSedado, duracion: 10, respirador: { deltaP: 10 } },
    },
    {
      id: 'p6',
      titulo: 'Recomprobación y plan para el resto del vuelo',
      // Tiempo para que la sedación ajustada y la nueva ΔP se reflejen en el EtCO₂.
      saltoTiempo: 180,
      narrativa:
        'Tras ajustar la sedoanalgesia y bajar la ΔP a 10: **FR total 18, todos los ciclos disparados por el paciente**, **VTE de unos 435 ml** (≈ 6 ml/kg de peso ideal), VM 7,8 L/min, **Ppico 15 cmH₂O**, **EtCO₂ 32 mmHg**, SpO₂ 99 % con FiO₂ 0,5. Curvas regulares, sin esfuerzos fuera de fase. TA 130/78, FC 90. El paciente está tranquilo, sin tos. Quedan unos 10 minutos de vuelo.',
      pregunta: '¿Qué plan dejas para el resto del traslado?',
      opciones: [
        {
          texto:
            'Mantener PC asistido con FR de respaldo 16 (por debajo de la del paciente), sedoanalgesia continua comprobando bomba y vía, bajar la FiO₂ a 0,4 para SpO₂ > 94 %, vigilar en el monitor FR total, VTE y EtCO₂, y si hay deterioro brusco desconectar y ventilar con bolsa (DOPE).',
          correcta: true,
          explicacion:
            'La situación es la deseada: sincronía (FR total = FR del paciente), VTE de 6 ml/kg con Ppico 15 y normocapnia. Hay que mantener lo que lo ha conseguido (sedoanalgesia continua y trigger activo), ' +
            'dejar la FR programada como respaldo por debajo de la del paciente, titular la FiO₂ a la necesaria evitando la hipoxemia en el TCE y tener preparada la regla de oro ante cualquier deterioro brusco.',
          etiquetaTema: 'asincronía',
        },
        {
          texto: 'Subir la FR programada a 20 "por seguridad", por si deja de respirar.',
          correcta: false,
          explicacion:
            'Si la FR programada supera la del paciente, el respirador se adelanta a su esfuerzo y vuelve a ciclar a su ritmo: los ciclos se solapan, el Te se acorta y el VTE cae. La FR de respaldo debe quedar por debajo de la del paciente; el respaldo de apnea ya protege si deja de respirar.',
          etiquetaTema: 'asincronía',
          consecuencia: 'Con FR 20 el respirador se adelanta al paciente: la FR total sube a 22, el Te cae a 0,8 s y el VTE baja a unos 310 ml.',
          transicionConsecuencia: { respirador: { fr: 20 } },
        },
        {
          texto: 'Pasar a presión soporte y retirar la sedación: ya respira bien y así llega despierto para la valoración neurológica.',
          correcta: false,
          explicacion:
            'Un TCE moderado con dolor, en vuelo y a 10 minutos del destino no es candidato a despertar: volvería la agitación con riesgo de autoextubación y de subida de la PIC, y en PS la FR y el volumen quedarían a merced de un impulso respiratorio inestable. La valoración neurológica se hará en destino, de forma controlada.',
          etiquetaTema: 'presión soporte',
        },
        {
          texto: 'Relajarlo y volver a controlado puro para el resto del vuelo: así no hay riesgo de que vuelva a luchar.',
          correcta: false,
          explicacion:
            'El relajante de forma sistemática no está indicado: ya está sincronizado y cómodo con sedoanalgesia, y la parálisis impide valorar el estado neurológico, enmascara convulsiones y exige sedación profunda garantizada. Se reserva para la asincronía que persiste pese a una sedoanalgesia adecuada.',
          etiquetaTema: 'asincronía',
        },
      ],
      transicion: { respirador: { fio2: 0.4 } },
    },
  ],
  puntosClave: [
    'En controlado puro (trigger desactivado) el respirador no responde a los esfuerzos del paciente: si la sedación se agota, lucha. En un traslado, la sedoanalgesia continua (bomba, batería, vía) es parte de la programación del respirador.',
    'En PC el respirador mantiene la Ppico programada, pero los esfuerzos dejan muescas y picos en la curva de presión (sobre todo en la espiración, por encima y por debajo de la PEEP); la desadaptación se ve además en el flujo (que se invierte o se corta de forma irregular), en el VTE que oscila de un ciclo a otro y en las hendiduras del capnograma. En VC las muescas de presión son todavía más evidentes.',
    'Antes de sedar más o relajar, buscar la causa corregible: bomba y vía, dolor, hipoxemia, hipercapnia, tubo, neumotórax, globo vesical. Analgesia primero. Relajar sin analgesia es inaceptable, y ante un deterioro brusco la regla de oro es desconectar y ventilar con bolsa.',
    'Activar el trigger convierte el PC controlado en asistido: el paciente dispara cada ciclo y la FR total pasa a ser la suya. En asistido, la FR se ajusta con la sedoanalgesia y el volumen con la ΔP; la FR programada es solo respaldo y debe quedar por debajo de la del paciente.',
    'En el TCE el objetivo es la normocapnia: un paciente sincronizado pero taquipneico con ΔP alta hiperventila (EtCO₂ 17), y eso también hay que corregirlo.',
  ],
  expectativas: [
    {
      paso: 0,
      descripcion: 'Estado inicial sedado: VTE ≈ 475 ml (≈ 6 ml/kg de peso ideal), Ppico 17, FR 16, PaCO₂ 33–42 y SpO₂ ≥ 97 %',
      comprobar: (m) =>
        m.vte > 0.44 && m.vte < 0.5 && Math.abs(m.ppico - 17) < 0.5 && Math.abs(m.frTotal - 16) < 0.5 && m.paco2 > 33 && m.paco2 < 42 && m.spo2 >= 97,
    },
    {
      paso: 1,
      descripcion: 'Desadaptado en controlado puro: la Ppico no cambia (PC), la FR sigue en 16 (sin trigger), no hay fuga y el VTE del ciclo medido difiere > 10 % del sedado',
      comprobar: (m, t) =>
        Math.abs(m.ppico - (t[0]?.ppico ?? 0)) < 0.5 &&
        Math.abs(m.frTotal - 16) < 0.5 &&
        m.fuga < 0.02 &&
        Math.abs(m.vte - (t[0]?.vte ?? 0)) > 0.1 * (t[0]?.vte ?? 1),
    },
    {
      paso: 1,
      descripcion: 'Desadaptado: taquicardia e hipertensión (FC > 110, TAS > 140) con SpO₂ ≥ 97 % y PaCO₂ baja (< 32)',
      comprobar: (m) => m.fc > 110 && m.tas > 140 && m.spo2 >= 97 && m.paco2 < 32,
    },
    {
      paso: 3,
      descripcion: 'Esfuerzos regulares sin trigger: la FR total sigue siendo la programada (16) y el VTE no coincide con el sedado',
      comprobar: (m, t) => Math.abs(m.frTotal - 16) < 0.5 && Math.abs(m.vte - (t[0]?.vte ?? 0)) > 0.05 * (t[0]?.vte ?? 1),
    },
    {
      paso: 4,
      descripcion: 'Con trigger activado la FR total es la del paciente (≈ 22, por encima de la programada), VTE 0,5–0,6 L, Ppico 17 y PaCO₂ < 28 (hiperventilación)',
      comprobar: (m) => m.frTotal > 20.5 && m.frTotal < 23.5 && m.vte > 0.5 && m.vte < 0.6 && Math.abs(m.ppico - 17) < 0.5 && m.paco2 < 28,
    },
    {
      paso: 4,
      descripcion: 'En asistido no hay fuga ni ciclos solapados (Te > 1,5 s)',
      comprobar: (m) => m.fuga < 0.02 && m.te > 1.5,
    },
    {
      paso: 5,
      descripcion: 'Tras ajustar sedación y ΔP 10: FR total ≈ 18 (la del paciente), VTE 0,40–0,47 L (≈ 6 ml/kg), Ppico 15, PaCO₂ 33–42 y Te > 2 s',
      comprobar: (m) =>
        m.frTotal > 17 && m.frTotal < 19 && m.vte > 0.4 && m.vte < 0.47 && Math.abs(m.ppico - 15) < 0.5 && m.paco2 > 33 && m.paco2 < 42 && m.te > 2,
    },
    {
      paso: 6,
      descripcion: 'Con FiO₂ 0,4 la SpO₂ se mantiene ≥ 95 % y la FC baja respecto al estado desadaptado',
      comprobar: (m, t) => m.spo2 >= 95 && m.fc < (t[1]?.fc ?? 999) - 15,
    },
  ],
};
