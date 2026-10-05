import type { Caso } from './schema';
import { paciente, respirador } from '../engine/defaults';

/**
 * Caso 2 · Neumotórax a tensión en un politraumatizado ventilado en VC (prehospital).
 * La narrativa cita solo números que produce el motor (ver `npm run medidas -- src/cases/caso-02-neumotorax-tension.ts`).
 *
 * Decisión de diseño: NO se programa pausa inspiratoria (pausa 0) para que el alumno tenga
 * que pulsar el botón de pausa inspiratoria y leer la Pplat. Las pistas lo recuerdan.
 */
const pacienteBase = paciente({
  R: 10,
  Rexp: 10,
  C: 0.05,
  espacioMuerto: 0.15,
  shunt: 0.08,
  reclutabilidad: 0.02,
  // Politraumatizado con hipovolemia leve: TA basal algo baja y más sensible a la presión intratorácica.
  tasBase: 118,
  tadBase: 72,
  fcBase: 98,
  sensibilidadPrecarga: 2.5,
  compresionMediastinica: 0,
  pmus: { tipo: 'ninguno' },
});

const respiradorBase = respirador({
  modo: 'VC',
  vt: 0.45,
  flujo: 0.75, // 45 L/min
  pausa: 0, // sin pausa programada: hay que pulsar el botón
  fr: 16,
  peep: 5,
  fio2: 0.6,
  triggerFlujo: 0,
  alarmaPmax: 30,
});

/** Neumotórax en evolución: cae la compliance y empieza la compresión mediastínica. */
const neumotoraxInicial = { C: 0.035, compresionMediastinica: 0.3, shunt: 0.18 };
/** Neumotórax a tensión establecido. */
const neumotoraxTension = { C: 0.022, compresionMediastinica: 0.8, shunt: 0.35 };
/** Tras la descompresión: el pulmón se reexpande casi del todo. */
const descomprimido = { C: 0.045, compresionMediastinica: 0, shunt: 0.1 };

export const caso02: Caso = {
  id: 'caso-02-neumotorax-tension',
  numero: 2,
  titulo: 'Neumotórax a tensión durante el traslado de un politraumatizado',
  nivel: 'intermedio',
  ambito: 'prehospital',
  etiquetasTema: ['neumotórax', 'resistencia frente a compliance', 'hemodinámica', 'regla DOPE', 'ecografía'],
  objetivos: [
    'Usar la pausa inspiratoria en VC para separar la presión resistiva (Ppico − Pplat) de la presión alveolar (Pplat).',
    'Reconocer una caída progresiva de la compliance (↑Pplat con gradiente igual) como signo precoz de neumotórax en un paciente ventilado.',
    'Relacionar la hipotensión progresiva y la taquicardia con la compresión mediastínica, y medir la TA ante cualquier deterioro.',
    'Aplicar la regla de oro del deterioro brusco (desconectar y ventilar con bolsa) y el DOPE.',
    'Diferenciar neumotórax a tensión de intubación selectiva con la clínica y la ecografía, y descomprimir sin esperar a la radiografía.',
  ],
  datos: {
    edad: 34,
    sexo: 'hombre',
    talla: 180,
    pesoReal: 84,
    contexto:
      'Motorista que ha chocado contra un turismo a unos 70 km/h. En el lugar: GCS 6, traumatismo torácico derecho con crepitación costal y abdomen sin signos de peritonismo. ' +
      'Intubado en la escena por el equipo de SVA por bajo nivel de conciencia, con sedación y relajación según protocolo local. Traslado al hospital de referencia (25 min).',
  },
  pacienteInicial: pacienteBase,
  respiradorInicial: respiradorBase,
  pasos: [
    {
      id: 'p1',
      titulo: 'Antes de salir: la mecánica de referencia',
      narrativa:
        'Hombre de 34 años, **180 cm** y unos 84 kg. Intubado en la escena (tubo del 8, marca **23 cm** en la comisura, auscultación simétrica). ' +
        'Lo conectas al respirador de transporte en **volumen control: Vt 450 ml, FR 16, flujo 45 L/min, PEEP 5, FiO₂ 0,6**, sin pausa inspiratoria programada. Límite de presión en 30 cmH₂O.\n\n' +
        'El monitor muestra **Ppico 21–22 cmH₂O**, VTI = VTE 450 ml, SpO₂ 100 %, EtCO₂ 31 mmHg. TA 118/72, FC 98. La curva de presión tiene un pequeño salto inicial y después una rampa suave hasta el pico.\n\n' +
        'Antes de arrancar quieres anotar la mecánica de referencia del paciente.',
      pregunta: 'Pulsas el botón de pausa inspiratoria y lees la Pplat. ¿Cómo interpretas los números?',
      pista: 'Usa la pausa inspiratoria: la Pplat solo aparece al ocluir el flujo al final de la inspiración. Anota Ppico, Pplat y su diferencia.',
      opciones: [
        {
          texto: 'Pplat ≈ 14 cmH₂O y gradiente Ppico − Pplat ≈ 7: resistencia normal (≈ 10 cmH₂O/L/s) y compliance ≈ 50 ml/cmH₂O. Mecánica normal; lo anoto como referencia y el Vt de 450 ml es correcto (≈ 6 ml/kg de peso ideal).',
          correcta: true,
          explicacion:
            'Con la pausa, el flujo cesa y la presión cae desde el pico hasta la meseta: la diferencia (≈ 7 cmH₂O) es la presión resistiva (R × flujo = 10 × 0,75) y la Pplat (≈ 14) es la presión alveolar al final de la inspiración. ' +
            'Driving pressure = Pplat − PEEP ≈ 9 cmH₂O, compliance = 450/9 ≈ 50 ml/cmH₂O: ambas normales. Peso ideal (hombre) = 50 + 0,91 × (180 − 152,4) ≈ 75 kg, así que 450 ml ≈ 6 ml/kg. ' +
            'Tener estos valores anotados es lo que permitirá detectar después un cambio de compliance.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'Una Ppico de 22 es alta para un pulmón sano: bajo el Vt a 350 ml para proteger el pulmón.',
          correcta: false,
          explicacion:
            'La Ppico incluye la presión resistiva del tubo y de la vía aérea, que no llega al alvéolo. Lo que mide el riesgo de sobredistensión es la Pplat (14 cmH₂O, muy por debajo de 30). Bajar el Vt a 350 ml (< 5 ml/kg de peso ideal) provocaría hipoventilación e hipercapnia en un TCE sin ninguna necesidad.',
          etiquetaTema: 'ventilación protectora',
        },
        {
          texto: 'No hace falta hacer la pausa: en VC la Ppico ya informa de la presión que recibe el alvéolo.',
          correcta: false,
          explicacion:
            'En VC la Ppico es la suma de la presión resistiva (R × flujo) y la alveolar. Sin pausa no puedes saber qué parte corresponde a cada una, y es justo esa separación la que diferencia un problema de resistencia (secreciones, acodamiento) de uno de compliance (neumotórax, selectiva). ' +
            'Si no se programa pausa, hay que pulsarla manualmente cada vez que quieras una Pplat.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'Un gradiente de 7 cmH₂O indica obstrucción del tubo: hay que aspirarlo antes de salir.',
          correcta: false,
          explicacion:
            'La presión resistiva es R × flujo. Con un flujo de 45 L/min (0,75 L/s) y un tubo del 8 con vía aérea normal (R ≈ 10 cmH₂O/L/s), 7 cmH₂O es exactamente lo esperado. Una obstrucción daría un gradiente claramente mayor (R > 15) con la misma Pplat.',
          etiquetaTema: 'secreciones',
        },
      ],
      // Durante el traslado una laceración pulmonar por las fracturas costales empieza a fugar aire a la pleura.
      transicion: { paciente: neumotoraxInicial, duracion: 20 },
    },
    {
      id: 'p2',
      titulo: 'Diez minutos de traslado',
      narrativa:
        'Vais por la autovía. Sin tocar nada en el respirador, la **Ppico ha subido a unos 25 cmH₂O**. El VTI y el VTE siguen en 450 ml y la curva de flujo (cuadrada) es idéntica a la de antes. ' +
        'La curva de presión mantiene el mismo salto inicial, pero la rampa hasta el pico es **más empinada**. SpO₂ 98 %, EtCO₂ 29–30 mmHg. El manguito automático marca **TA 101/66, FC 113**.\n\n' +
        'El paciente sigue sedado y relajado, sin esfuerzos visibles en las curvas.',
      pregunta: 'Repites la pausa inspiratoria. ¿Qué te dicen las curvas y los números respecto a la referencia?',
      pista: 'Pausa inspiratoria otra vez y compara Pplat y gradiente con los que anotaste antes de salir.',
      opciones: [
        {
          texto: 'La Pplat ha subido unos 4 cmH₂O (≈ 18) con el mismo gradiente (≈ 7): la compliance está cayendo (≈ 35 ml/cmH₂O) con resistencia normal. En un traumatismo torácico ventilado, esto obliga a pensar en un neumotórax en evolución: vigilancia estrecha de Pplat y TA.',
          correcta: true,
          explicacion:
            'En VC el flujo es fijo, así que la presión resistiva (R × flujo) no cambia y la Ppico sube solo porque sube la Pplat. Una Pplat que asciende con el mismo Vt significa menos compliance: el mismo volumen "cabe" peor. ' +
            'La rampa de presión más empinada es la huella visual (pendiente = flujo/C). Que además la TA haya bajado de 118 a 101 y la FC haya subido apunta a que la presión intratorácica empieza a comprometer el retorno venoso. ' +
            'En un paciente con fracturas costales ventilado a presión positiva, un neumotórax puede hacerse a tensión en minutos.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'Ha aumentado la resistencia: secreciones o acodamiento del tubo por el movimiento de la ambulancia. Aspiro y reviso el tubo.',
          correcta: false,
          explicacion:
            'Un problema de resistencia subiría la Ppico aumentando el gradiente Ppico − Pplat, con la Pplat sin cambios. Aquí el gradiente sigue siendo ≈ 7 y lo que ha subido es la Pplat: el problema está en el parénquima o la pleura, no en el tubo. Tampoco hay dientes de sierra en el flujo espiratorio.',
          etiquetaTema: 'secreciones',
        },
        {
          texto: 'Hay una fuga en el circuito que el respirador compensa subiendo la presión.',
          correcta: false,
          explicacion:
            'Con fuga, el VTE sería menor que el VTI y la curva de volumen no volvería a cero; además las presiones tenderían a bajar, no a subir. Aquí VTI = VTE = 450 ml y la presión sube. El respirador en VC no "compensa" fugas subiendo la presión por sí mismo.',
          etiquetaTema: 'fuga y desconexión',
        },
        {
          texto: 'El paciente se está despertando y lucha contra el respirador: profundizo la sedación.',
          correcta: false,
          explicacion:
            'La desadaptación se ve en las curvas: muescas y picos irregulares en la presión y flujo errático. Estas curvas son regulares, de ciclo en ciclo idénticas, y el paciente está relajado. Profundizar la sedación bajaría más la TA sin tratar la causa.',
          etiquetaTema: 'asincronía',
        },
      ],
      transicion: { paciente: neumotoraxTension, duracion: 20 },
    },
    {
      id: 'p3',
      titulo: 'Alarma de presión alta',
      narrativa:
        'Cinco minutos después salta la **alarma de presión alta**: la Ppico ha llegado a **33 cmH₂O** y el respirador recorta algún ciclo. Con la pausa inspiratoria, la **Pplat es de unos 26 cmH₂O** (gradiente ≈ 7, igual que siempre). ' +
        'La **SpO₂ ha caído al 85 %** con FiO₂ 0,6 y el EtCO₂ baja a 27 mmHg aunque el volumen minuto sigue siendo el mismo (7,2 L/min). **FC 144**.\n\n' +
        'El paciente sigue sedado y relajado. Las yugulares parecen ingurgitadas con la camilla a 30°.',
      pregunta: 'Deterioro brusco en un paciente ventilado. ¿Cuál es la primera medida?',
      pista: 'Mide la TA ahora (manguito o, si lo tienes, arterial): el último valor es de hace cinco minutos. Y recuerda la regla de oro.',
      opciones: [
        {
          texto: 'Medir la TA y, mientras, desconectar del respirador y ventilar con bolsa autoinflable con reservorio a FiO₂ 1,0, notando la resistencia de la bolsa, repasando el DOPE (Desplazamiento, Obstrucción, Pneumotórax, Equipo).',
          correcta: true,
          explicacion:
            'Es la regla de oro del deterioro brusco: desconectar y ventilar con bolsa. Si el paciente mejora, el problema estaba en el respirador o el circuito; si no mejora y la bolsa "va dura", el problema está en el paciente o en el tubo (DOPE). ' +
            'Al medir la TA encuentras **74/56** con FC 144: hipotensión progresiva (118 → 101 → 74). Una Pplat que ha subido 12 cmH₂O con gradiente igual, hipotensión, taquicardia e ingurgitación yugular en un traumatismo torácico es neumotórax a tensión hasta que se demuestre lo contrario. ' +
            'Que el EtCO₂ baje con el mismo volumen minuto es otra pista: refleja la caída del gasto cardíaco.',
          etiquetaTema: 'regla DOPE',
        },
        {
          texto: 'Subir la PEEP a 12 cmH₂O para reclutar y recuperar la SpO₂.',
          correcta: false,
          explicacion:
            'Subir la PEEP sin diagnóstico es peligroso: aumenta la presión intratorácica, empeora el retorno venoso ya comprometido y, si hay un neumotórax, lo alimenta. La hipoxemia aquí no es por falta de reclutamiento sino por un pulmón colapsado y un gasto cardíaco bajo. Primero, desconectar y buscar la causa.',
          etiquetaTema: 'oxigenación',
          consecuencia: 'Con PEEP 12 la Ppico llega a 40, la Pplat a 33 y la TA se desploma hasta unos 57/50 con FC > 150; la SpO₂ no mejora.',
          transicionConsecuencia: { respirador: { peep: 12 } },
        },
        {
          texto: 'Bajar el Vt a 350 ml para que deje de sonar la alarma de presión.',
          correcta: false,
          explicacion:
            'Bajar el Vt silencia la alarma (Ppico ≈ 28, Pplat ≈ 21) pero no trata nada: la compliance sigue en 22 ml/cmH₂O, la TA sigue en 74/56 y además hipoventilas a un TCE (el EtCO₂ sube hacia 42 mmHg). La alarma es un síntoma; hay que buscar la causa.',
          etiquetaTema: 'ventilación protectora',
          consecuencia: 'La alarma deja de sonar, pero la TA sigue en 74/56, la SpO₂ no remonta y el EtCO₂ sube hacia 42 mmHg por la hipoventilación.',
          transicionConsecuencia: { respirador: { vt: 0.35 } },
        },
        {
          texto: 'Subir el límite de la alarma de presión a 45 cmH₂O y seguir el traslado: faltan 10 minutos.',
          correcta: false,
          explicacion:
            'Silenciar una alarma subiendo su límite sin saber por qué salta es uno de los errores más graves en un paciente ventilado. Con SpO₂ del 85 %, FC 144 y Pplat 26 en ascenso, el paciente puede parar en pocos minutos: hay que actuar ahora, en la ambulancia.',
          etiquetaTema: 'regla DOPE',
        },
      ],
      transicion: { respirador: { fio2: 1.0 } },
    },
    {
      id: 'p4',
      titulo: '¿Selectiva o neumotórax?',
      narrativa:
        'Ventilas con bolsa a FiO₂ 1,0: **la bolsa va dura**, cuesta insuflar y el tórax se expande de forma asimétrica. Reconectas al respirador con **FiO₂ 1,0**: la SpO₂ solo remonta hasta el 90 %. TA **74/56**, FC 138.\n\n' +
        'Exploras en marcha: la marca del tubo sigue en **23 cm** en la comisura, igual que en la escena. Hemitórax derecho con hipoventilación marcada y **timpanismo**; yugulares ingurgitadas; enfisema subcutáneo en la base del cuello. ' +
        'Ecografía: hemitórax derecho **sin deslizamiento pleural y sin *lung pulse*** en ninguno de los puntos explorados, sin punto pulmonar; hemitórax izquierdo con deslizamiento normal. Ventana subxifoidea sin derrame pericárdico.',
      pregunta: '¿Cuál es el diagnóstico y qué datos lo diferencian de una intubación selectiva?',
      opciones: [
        {
          texto: 'Neumotórax a tensión derecho: hipotensión, ingurgitación yugular y timpanismo, con el tubo en la misma marca; en la ecografía no hay deslizamiento ni lung pulse y no se encuentra punto pulmonar (colapso completo). En una selectiva la hemodinámica se conserva, el tubo está más profundo y el lung pulse está presente.',
          correcta: true,
          explicacion:
            'Selectiva y neumotórax comparten la caída de compliance (↑Pplat en VC). Las diferencia la clínica y la ecografía: la selectiva no comprime el mediastino (TA conservada), se acompaña de un tubo más profundo que la marca anotada y, en el pulmón no ventilado, se ve lung pulse (el latido transmitido a través de un pulmón en contacto con la pleura). ' +
            'En el neumotórax, el aire separa las pleuras: no hay deslizamiento ni lung pulse; si el neumotórax es parcial, se encuentra el punto pulmonar (transición entre zona con y sin deslizamiento). Aquí no hay punto pulmonar: el pulmón está colapsado por completo, y la compresión mediastínica explica la hipotensión y la ingurgitación yugular.',
          etiquetaTema: 'neumotórax',
        },
        {
          texto: 'Intubación selectiva derecha: hipoventilación de un hemitórax con caída de compliance tras mover al paciente. Retiro el tubo 2–3 cm.',
          correcta: false,
          explicacion:
            'Una selectiva hipoventila el lado contrario al que ventila (si el tubo entra en el bronquio derecho, el silencio es izquierdo) y, sobre todo, no produce hipotensión progresiva, ingurgitación yugular ni timpanismo, y el tubo estaría más profundo que la marca anotada. El lung pulse estaría presente en el lado no ventilado. Aquí todo apunta a neumotórax a tensión.',
          etiquetaTema: 'intubación selectiva',
        },
        {
          texto: 'Taponamiento cardíaco traumático: hipotensión con ingurgitación yugular. Pericardiocentesis.',
          correcta: false,
          explicacion:
            'El taponamiento comparte la hipotensión y la ingurgitación yugular, pero no explica la subida de Pplat con el mismo Vt, el timpanismo ni la hipoventilación unilateral, y la ventana subxifoidea no muestra derrame. Puncionar el pericardio sería un error con riesgo vital.',
          etiquetaTema: 'ecografía',
        },
        {
          texto: 'Shock hemorrágico por lesión abdominal oculta: la hipotensión es por sangrado. Bolo de cristaloides y acelerar el traslado.',
          correcta: false,
          explicacion:
            'El shock hemorrágico cursa con yugulares colapsadas, no ingurgitadas, y no sube la Pplat ni la Ppico. La hipotensión aquí es obstructiva (compresión mediastínica): el volumen apenas la mejorará y perderás los minutos que necesita la descompresión. El sangrado se evalúa después (eFAST), pero primero se trata lo que mata antes.',
          etiquetaTema: 'hemodinámica',
        },
      ],
    },
    {
      id: 'p5',
      titulo: 'Descompresión',
      narrativa:
        'Diagnóstico: neumotórax a tensión derecho en un paciente ventilado a presión positiva. TA 74/56, FC 138, SpO₂ 90 % con FiO₂ 1,0, Pplat 26 cmH₂O. Faltan unos 10 minutos para el hospital.',
      pregunta: '¿Qué haces?',
      opciones: [
        {
          texto: 'Descompresión inmediata en la ambulancia: toracostomía con aguja (catéter largo en el 4.º–5.º espacio intercostal, línea axilar anterior/media, o 2.º espacio en línea medioclavicular según protocolo) o toracostomía digital si tienes la competencia; después, drenaje torácico (en el hospital o en la escena según protocolo). Preaviso al hospital.',
          correcta: true,
          explicacion:
            'El neumotórax a tensión en un paciente ventilado es un diagnóstico clínico (y ecográfico) que se trata en el momento: cada ciclo a presión positiva mete más aire en la pleura. La aguja o la toracostomía digital convierten la tensión en un neumotórax simple y restauran el retorno venoso; el drenaje definitivo viene después. ' +
            'Tras descomprimir, hay que comprobar en el monitor que la Pplat baja y que la TA remonta, y vigilar que la aguja no se obstruya ni se acode (si vuelve a subir la Pplat, repetir o pasar a toracostomía digital).',
          etiquetaTema: 'neumotórax',
        },
        {
          texto: 'Esperar a la radiografía de tórax en el hospital para confirmar antes de puncionar: faltan solo 10 minutos.',
          correcta: false,
          explicacion:
            'Con TA 74/56 y FC 138 en ascenso, 10 minutos de ventilación a presión positiva sobre un neumotórax a tensión pueden terminar en parada cardíaca por actividad eléctrica sin pulso. El diagnóstico es clínico y ecográfico; la radiografía no debe retrasar nunca la descompresión.',
          etiquetaTema: 'neumotórax',
        },
        {
          texto: 'Bajar la PEEP a 0 y el Vt a 300 ml para reducir la presión intratorácica mientras llegáis.',
          correcta: false,
          explicacion:
            'Reducir las presiones del respirador no evacua el aire de la pleura ni resuelve la compresión mediastínica; solo añade hipoventilación a un TCE. Mientras el pulmón siga entrando aire en la pleura a cada ciclo, la tensión aumenta. Hay que descomprimir.',
          etiquetaTema: 'hemodinámica',
        },
        {
          texto: 'Bolo de cristaloides y noradrenalina según protocolo local para remontar la TA y descomprimir ya en el hospital.',
          correcta: false,
          explicacion:
            'La hipotensión es obstructiva: el corazón no se llena porque el mediastino está comprimido. Volumen y vasopresores apenas la mejoran y retrasan el único tratamiento eficaz. Pueden tener un papel de apoyo tras la descompresión si persiste la hipotensión (y entonces sí pensar en sangrado).',
          etiquetaTema: 'hemodinámica',
        },
      ],
      transicion: { paciente: descomprimido, duracion: 15 },
    },
    {
      id: 'p6',
      titulo: 'Recomprobación tras la descompresión',
      narrativa:
        'Al introducir el catéter se oye una salida brusca de aire. En menos de un minuto la **Ppico baja a 22–23 cmH₂O** y, con la pausa inspiratoria, la **Pplat vuelve a unos 15 cmH₂O** (gradiente ≈ 7). ' +
        'La TA remonta a **118/72** y la FC baja a 98. SpO₂ 100 % con FiO₂ 1,0, EtCO₂ de nuevo en 31 mmHg. Reaparece el deslizamiento pleural en la ecografía del hemitórax derecho.\n\n' +
        'Quedan 8 minutos de traslado.',
      pregunta: '¿Qué haces con el respirador y la monitorización?',
      opciones: [
        {
          texto: 'Mantener Vt 450 (6 ml/kg de peso ideal), FR 16 y PEEP 5; bajar la FiO₂ de forma progresiva (p. ej. a 0,5) para SatO₂ > 90 % evitando la hipoxemia en el TCE; repetir la pausa inspiratoria cada pocos minutos: si la Pplat vuelve a subir, el catéter se ha obstruido y hay que repetir la descompresión. Preaviso para drenaje torácico.',
          correcta: true,
          explicacion:
            'La Pplat ha vuelto a la referencia (compliance ≈ 45 ml/cmH₂O) y la hemodinámica se ha recuperado: el problema está resuelto, pero el catéter puede acodarse u obstruirse y la tensión reaparecer. En VC la vigilancia más sensible es la Pplat (en PC lo sería el VTE). ' +
            'La FiO₂ se titula a la mínima que mantenga SatO₂ > 90 % (en el TCE, con margen para no hipoxemiar); la hiperoxia mantenida no aporta. El drenaje torácico es el tratamiento definitivo.',
          etiquetaTema: 'neumotórax',
        },
        {
          texto: 'Subir la PEEP a 10 cmH₂O para reexpandir del todo el pulmón derecho.',
          correcta: false,
          explicacion:
            'Más PEEP sobre un pulmón con una laceración que acaba de fugar aire aumenta la fuga a la pleura y, con un catéter fino como única salida, puede recrear la tensión. La reexpansión la consigue el drenaje; no hay hipoxemia que justifique más PEEP.',
          etiquetaTema: 'oxigenación',
        },
        {
          texto: 'Subir el Vt a 550 ml para compensar los minutos de hipoventilación y lavar CO₂.',
          correcta: false,
          explicacion:
            'El volumen minuto no ha cambiado en ningún momento (VC: 450 × 16 = 7,2 L/min, PaCO₂ estable); lo que ha bajado el EtCO₂ es el gasto cardíaco, no la ventilación. 550 ml serían > 7 ml/kg de peso ideal sobre un pulmón recién reexpandido: más volumen, más fuga por la laceración.',
          etiquetaTema: 'ventilación protectora',
        },
        {
          texto: 'Retirar el catéter porque el paciente ya está estable y la ecografía muestra deslizamiento.',
          correcta: false,
          explicacion:
            'El catéter es lo único que impide que la tensión se reproduzca mientras el pulmón siga fugando aire a cada ciclo de presión positiva. Se mantiene (fijado y permeable) hasta que se coloque el drenaje torácico definitivo.',
          etiquetaTema: 'neumotórax',
        },
      ],
      transicion: { respirador: { fio2: 0.5 } },
    },
  ],
  puntosClave: [
    'En VC el flujo es fijo: la Ppico suma la presión resistiva (R × flujo, el gradiente Ppico − Pplat) y la alveolar (Pplat). Solo la pausa inspiratoria las separa; si no hay pausa programada, hay que pulsarla.',
    'Una Pplat que sube con el mismo Vt y el mismo gradiente es una caída de compliance: en un traumatismo torácico ventilado, piensa en neumotórax antes de que se haga a tensión. Mide la TA ante cualquier cambio.',
    'Ante un deterioro brusco: desconectar y ventilar con bolsa a FiO₂ 1,0. Si la bolsa "va dura" y el paciente no mejora, el problema está en el paciente o en el tubo (DOPE).',
    'Neumotórax a tensión frente a selectiva: hipotensión, ingurgitación yugular, timpanismo y tubo en su marca, sin deslizamiento ni lung pulse (punto pulmonar solo si es parcial); en la selectiva la hemodinámica se conserva, el tubo está más profundo y hay lung pulse.',
    'La descompresión (aguja o toracostomía digital, después drenaje) no espera a la radiografía. Tras descomprimir, comprueba en el monitor que la Pplat baja y la TA remonta, y vigila la Pplat por si el catéter se obstruye.',
  ],
  expectativas: [
    {
      paso: 0,
      descripcion: 'Referencia: Ppico 20–23, Pplat 13–15, gradiente 6–9, VTE ≈ 450 ml (6 ml/kg de peso ideal), SpO₂ ≥ 97 y TA sistólica > 110',
      comprobar: (m) =>
        m.ppico > 20 && m.ppico < 23 && (m.pplat ?? 0) > 13 && (m.pplat ?? 0) < 15 && (m.gradiente ?? 0) > 6 && (m.gradiente ?? 0) < 9 &&
        m.vte > 0.43 && m.vte < 0.47 && m.spo2 >= 97 && m.tas > 110,
    },
    {
      paso: 1,
      descripcion: 'Neumotórax en evolución: Pplat sube ≥ 3 sobre la referencia con gradiente igual (±1,5), mismo VTE, y la TA sistólica baja ≥ 10 mmHg',
      comprobar: (m, t) =>
        (m.pplat ?? 0) >= (t[0]?.pplat ?? 0) + 3 && Math.abs((m.gradiente ?? 0) - (t[0]?.gradiente ?? 0)) < 1.5 &&
        Math.abs(m.vte - (t[0]?.vte ?? 0)) < 0.01 && m.tas <= (t[0]?.tas ?? 0) - 10,
    },
    {
      paso: 2,
      descripcion: 'Tensión: Pplat > referencia + 8 con |gradiente − gradiente de referencia| < 2, Ppico > alarma (30), SpO₂ < 90, TA sistólica < 90 y FC > 130',
      comprobar: (m, t) =>
        (m.pplat ?? 0) > (t[0]?.pplat ?? 0) + 8 && Math.abs((m.gradiente ?? 0) - (t[0]?.gradiente ?? 0)) < 2 &&
        m.ppico > 30 && m.spo2 < 90 && m.tas < 90 && m.fc > 130,
    },
    {
      paso: 2,
      descripcion: 'Tensión: no hay fuga ni auto-PEEP (VTE = VTI, flujo espiratorio llega a 0) y el EtCO₂ baja respecto a la referencia con el mismo volumen minuto',
      comprobar: (m, t) =>
        m.fuga < 0.02 && m.autoPeepReal < 0.3 && m.etco2 < (t[0]?.etco2 ?? 0) - 1 && Math.abs(m.vmEsp - (t[0]?.vmEsp ?? 0)) < 0.2,
    },
    {
      paso: 3,
      descripcion: 'Con FiO₂ 1,0 la SpO₂ remonta a ≥ 89 % pero la TA sistólica sigue < 90 (la hipoxemia mejora, la causa no)',
      comprobar: (m) => m.spo2 >= 89 && m.tas < 90,
    },
    {
      paso: 5,
      descripcion: 'Tras la descompresión: Pplat vuelve a referencia + 2 como máximo, Ppico < 25, TA sistólica > 110, FC < 105 y SpO₂ ≥ 98',
      comprobar: (m, t) => (m.pplat ?? 99) <= (t[0]?.pplat ?? 0) + 2 && m.ppico < 25 && m.tas > 110 && m.fc < 105 && m.spo2 >= 98,
    },
    {
      paso: 6,
      descripcion: 'Con FiO₂ 0,5 la SpO₂ se mantiene > 96 %',
      comprobar: (m) => m.spo2 > 96,
    },
  ],
};
