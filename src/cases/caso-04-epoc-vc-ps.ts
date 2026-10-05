import type { Caso } from './schema';
import type { ConfigPmus } from '../engine/types';
import { paciente, respirador } from '../engine/defaults';

/**
 * Caso 4 · EPOC agudizada intubada en Urgencias (VC → PS).
 * Atrapamiento aéreo y auto-PEEP por una programación "por defecto", corrección con
 * patrón obstructivo (FR baja, flujo alto, Te largo, Vt 6 ml/kg de peso ideal) y,
 * al despertar, paso a presión soporte con ciclado tardío que se corrige subiendo el
 * trigger espiratorio. Todos los números de la narrativa salen de
 * `npm run medidas -- src/cases/caso-04-epoc-vc-ps.ts`.
 */
const pacienteBase = paciente({
  R: 20,
  Rexp: 35,
  C: 0.075,
  espacioMuerto: 0.18,
  shunt: 0.05,
  reclutabilidad: 0.02,
  vco2: 200,
  tasBase: 135,
  tadBase: 78,
  fcBase: 105,
  // Varios días de agudización, poca ingesta: la TA es sensible a la presión intratorácica.
  sensibilidadPrecarga: 2.0,
  pmus: { tipo: 'ninguno' },
  pmusGanancia: 0,
});

/** Programación "por defecto" del respirador con la que se conecta al paciente. */
const respiradorBase = respirador({
  modo: 'VC',
  vt: 0.5,
  flujo: 0.5,
  pausa: 0,
  fr: 18,
  peep: 5,
  fio2: 0.5,
  triggerFlujo: 0,
  alarmaPmax: 40,
});

/** Esfuerzo respiratorio del paciente cuando despierta: 18 rpm, Ti neural 0,7 s. */
const esfuerzoEspontaneo: ConfigPmus = { tipo: 'espontaneo', fr: 18, amplitud: 7, ti: 0.7 };

export const caso04: Caso = {
  id: 'caso-04-epoc-vc-ps',
  numero: 4,
  titulo: 'EPOC agudizada intubada: atrapamiento aéreo y paso a presión soporte',
  nivel: 'intermedio',
  ambito: 'hospital',
  etiquetasTema: ['auto-PEEP', 'programación obstructiva', 'presión soporte', 'asincronía', 'ventilación y CO2', 'hemodinámica'],
  objetivos: [
    'Reconocer el atrapamiento aéreo en la curva de flujo (flujo espiratorio que no llega a cero) y cuantificar la auto-PEEP con la pausa espiratoria.',
    'Programar el respirador con patrón obstructivo: FR baja, flujo alto, Ti corto e I:E larga, Vt 6 ml/kg de peso ideal y PEEP externa moderada.',
    'Diferenciar la Ppico resistiva (gradiente Ppico–Pplat) de la presión alveolar (Pplat) y tolerar la hipercapnia permisiva con pH aceptable.',
    'Pasar a presión soporte cuando el paciente recupera el esfuerzo y reconocer el ciclado tardío por la constante de tiempo larga.',
    'Corregir el ciclado tardío subiendo el porcentaje del trigger espiratorio y comprobar en el monitor que el Ti se acorta.',
  ],
  datos: {
    edad: 71,
    sexo: 'hombre',
    talla: 178,
    pesoReal: 80,
    contexto:
      'EPOC grave (FEV1 35 %) con oxígeno domiciliario, exfumador. Agudización infecciosa de cuatro días. Llega a Urgencias con trabajo respiratorio intenso y somnolencia; ' +
      'gasometría arterial de llegada: pH 7,17, PaCO₂ 85 mmHg, bicarbonato 30 mmol/L. Tras dos horas de VMNI empeora el nivel de consciencia y se agota: fracaso de la VMNI. ' +
      'Se intuba en el box de críticos con secuencia rápida (hipnótico y relajante, dosis según protocolo local) y se conecta al respirador con la programación por defecto de la unidad.',
  },
  pacienteInicial: pacienteBase,
  respiradorInicial: respiradorBase,
  // Recién intubado: la PaCO₂ va bajando desde los 85 mmHg previos y aún no ha llegado al equilibrio del modelo.
  gasesIniciales: { paco2: 48 },
  pasos: [
    {
      id: 'p1',
      titulo: 'Conexión al respirador',
      narrativa:
        'Hombre de 71 años, **178 cm** y 80 kg, EPOC grave intubado por fracaso de la VMNI. Está sedado y relajado (dosis según protocolo local). ' +
        'Lo conectas al respirador tal como estaba programado: **volumen control, Vt 500 ml, FR 18, flujo 30 L/min (0,5 L/s), sin pausa, PEEP 5, FiO₂ 0,5**.\n\n' +
        'A los quince minutos el monitor muestra **Ppico 26 cmH₂O**, VTE 500 ml, volumen minuto 8,2 L/min, I:E 1:2,3 (Ti 1,0 s, Te 2,3 s), SpO₂ 100 % y EtCO₂ 41 mmHg. ' +
        'La TA, que al llegar era de 135/78, es ahora de **116/71** con FC 122.\n\n' +
        'Fíjate en la curva de **flujo**: la rama espiratoria desciende muy despacio y **no vuelve a la línea de base** antes de que empiece la siguiente inspiración ' +
        '(en ese momento todavía salen unos 8 L/min del paciente). La curva de volumen tampoco llega a cero.',
      pregunta: '¿Qué está ocurriendo y qué maniobra haces para cuantificarlo?',
      pista: 'Haz una pausa espiratoria: con las válvulas cerradas, la presión de la vía aérea se equilibra con la alveolar y el respirador muestra la PEEP total.',
      opciones: [
        {
          texto: 'Atrapamiento aéreo: la espiración no termina cuando empieza el siguiente ciclo, de modo que cada respiración empieza con volumen de la anterior. Hago una pausa espiratoria para medir la PEEP total y calcular la auto-PEEP.',
          correcta: true,
          explicacion:
            'La constante de tiempo espiratoria (resistencia × compliance) de un EPOC es muy larga: con un Te de 2,3 s el pulmón no se vacía y queda volumen atrapado. ' +
            'En la curva de flujo lo ves como una espiración que no llega a cero. La pausa espiratoria cierra las válvulas y deja que la presión alveolar se transmita a la vía aérea: ' +
            'PEEP total − PEEP programada = auto-PEEP. La caída de la TA (de 135 a 116) es el efecto hemodinámico de la hiperinsuflación.',
          etiquetaTema: 'auto-PEEP',
        },
        {
          texto: 'Hay una fuga en el circuito: por eso la curva de flujo no vuelve a cero.',
          correcta: false,
          explicacion:
            'Con fuga, el VTE sería menor que el VTI y la curva de volumen no bajaría hasta la línea de base por falta de volumen espirado; además, el flujo residual que vería el respirador durante la espiración sería inspiratorio (compensación de la fuga), no espiratorio. ' +
            'Aquí VTI y VTE coinciden (500 ml) y lo que persiste es flujo espiratorio: el aire sigue saliendo cuando el respirador ya inicia el siguiente ciclo.',
          etiquetaTema: 'fuga y desconexión',
        },
        {
          texto: 'Tiene secreciones en el tubo: hay que aspirar antes de nada.',
          correcta: false,
          explicacion:
            'Las secreciones dibujan dientes de sierra en el flujo espiratorio y elevan la Ppico con la Pplat conservada. Aquí la curva de flujo es lisa y el problema es que la espiración no acaba. ' +
            'Aspirar no corrige un tiempo espiratorio insuficiente.',
          etiquetaTema: 'secreciones',
        },
        {
          texto: 'El paciente está luchando con el respirador: profundizo la sedación.',
          correcta: false,
          explicacion:
            'El paciente está relajado: las curvas de presión y flujo son regulares, sin muescas ni esfuerzos. Lo que ves es un fenómeno pasivo de la mecánica obstructiva frente a una programación con Te corto, no una asincronía.',
          etiquetaTema: 'asincronía',
        },
      ],
    },
    {
      id: 'p2',
      titulo: 'Auto-PEEP medida: reprogramar',
      narrativa:
        'Haces una pausa espiratoria: la presión sube hasta una **PEEP total de 10,6 cmH₂O**, es decir, una **auto-PEEP de unos 5,6 cmH₂O** sobre la PEEP de 5. ' +
        'Con la pausa inspiratoria obtienes una **Pplat de 16 cmH₂O**: el gradiente Ppico–Pplat es de 10 cmH₂O, que con un flujo de 0,5 L/s supone una resistencia de 20 cmH₂O/L/s.\n\n' +
        'La TA sigue en 116/71 y la FC en 122. Gasometría a los quince minutos de la intubación: **pH 7,42, PaCO₂ 48 mmHg**, bicarbonato 30 mmol/L (venía de 85 mmHg).\n\n' +
        'Peso ideal por la talla (hombre, 178 cm): 50 + 0,91 × (178 − 152,4) ≈ **73 kg**.',
      pregunta: '¿Cómo reprogramas el respirador?',
      opciones: [
        {
          texto: 'Patrón obstructivo: FR 12, flujo 60 L/min (1 L/s), Vt 440 ml (6 ml/kg de peso ideal), sin pausa, mantengo PEEP 5 y FiO₂ la necesaria para SatO₂ > 90 %.',
          correcta: true,
          explicacion:
            'Para dar tiempo a vaciar un pulmón con constante de tiempo larga hay que alargar el Te: menos ciclos por minuto (FR 12 → 5 s por ciclo) y una inspiración corta (440 ml a 1 L/s = 0,44 s), con lo que el Te pasa de 2,3 a 4,6 s (I:E ≈ 1:10). ' +
            'El Vt se calcula sobre el peso ideal (73 kg × 6 = 440 ml). La PEEP externa se deja moderada, por debajo del 80 % de la auto-PEEP medida (≈ 4,5 cmH₂O; 5 es una aproximación razonable): ' +
            'en el paciente pasivo no reduce el atrapamiento, pero cuando respire espontáneamente le facilitará el disparo. Esa regla del 80 % es evidencia complementaria, no criterio del curso. ' +
            'La PaCO₂ subirá: es hipercapnia permisiva, aceptable mientras el pH sea tolerable.',
          etiquetaTema: 'programación obstructiva',
        },
        {
          texto: 'Subo la FR a 24: la PaCO₂ sigue en 48 y venía de 85, hay que seguir lavando CO₂.',
          correcta: false,
          explicacion:
            'Este paciente es un retenedor crónico (bicarbonato 30): su PaCO₂ habitual ronda los 50 mmHg y el pH ya es 7,42. Normalizar la PaCO₂ no es el objetivo y, sobre todo, cada ciclo añadido acorta el Te: ' +
            'con FR 24 el Te baja a 1,5 s, la auto-PEEP casi se duplica y la hiperinsuflación compromete el retorno venoso.',
          etiquetaTema: 'auto-PEEP',
          consecuencia: 'Con FR 24 el Te cae a 1,5 s, la PEEP total sube hasta unos 16 cmH₂O (auto-PEEP ≈ 11) y la TA baja hacia 97/65 con FC 139.',
          transicionConsecuencia: { respirador: { fr: 24 } },
        },
        {
          texto: 'Subo la PEEP externa a 12 para contrarrestar la auto-PEEP y que el pulmón no tenga que vencerla.',
          correcta: false,
          explicacion:
            'En un paciente pasivo la PEEP externa no reduce el volumen atrapado ni mejora el vaciado; cuando supera la auto-PEEP, se suma a ella y aumenta la hiperinsuflación: la PEEP total y la Pplat suben y la TA cae. ' +
            'La PEEP externa solo tiene sentido por debajo de la auto-PEEP (≤ 80 %, evidencia complementaria) y para facilitar el disparo del paciente que respira.',
          etiquetaTema: 'auto-PEEP',
          consecuencia: 'Con PEEP 12 la PEEP total sube a unos 17,6 cmH₂O, la Pplat a 23 y la TA baja hacia 102/67.',
          transicionConsecuencia: { respirador: { peep: 12 } },
        },
        {
          texto: 'Profundizo la sedación y añado relajación continua: el atrapamiento se debe al broncoespasmo, que cederá con el tratamiento.',
          correcta: false,
          explicacion:
            'El paciente ya está relajado y no hace esfuerzos. El atrapamiento se debe a que la programación no deja tiempo para espirar; sedar más no alarga el Te. ' +
            'El tratamiento broncodilatador y los corticoides (dosis según protocolo local) son necesarios, pero el respirador hay que reprogramarlo ahora.',
          etiquetaTema: 'programación obstructiva',
        },
      ],
      // A partir de aquí la PaCO₂ sale del modelo (ventilación alveolar y producción de CO₂).
      transicion: { respirador: { vt: 0.44, fr: 12, flujo: 1.0 }, gases: {} },
    },
    {
      id: 'p3',
      titulo: 'Tras la reprogramación',
      narrativa:
        'Con **Vt 440, FR 12 y flujo 60 L/min** el monitor muestra: **Ppico 32 cmH₂O** (antes 26), Ti 0,44 s y Te 4,6 s. Ahora la rama espiratoria del flujo **casi llega a cero** antes del siguiente ciclo (unos 2 L/min residuales).\n\n' +
        'Repites las pausas: **Pplat 12 cmH₂O** (gradiente Ppico–Pplat 20) y **PEEP total 6,4** (auto-PEEP ≈ 1,4). Volumen minuto 5,2 L/min. La TA ha subido a **131/77** y la FC ha bajado a 108.\n\n' +
        'Gasometría de control a los veinte minutos: **pH 7,37, PaCO₂ 54 mmHg**, bicarbonato 30 mmol/L. SpO₂ 100 % con FiO₂ 0,5. Has pautado broncodilatadores nebulizados y corticoides (dosis según protocolo local).',
      pregunta: 'La Ppico ha subido a 32 y la PaCO₂ a 54. ¿Qué haces?',
      opciones: [
        {
          texto: 'Nada en el respirador: la Ppico es resistiva (gradiente 20 = resistencia 20 × flujo 1 L/s) y la Pplat de 12 descarta sobredistensión; la PaCO₂ de 54 con pH 7,37 es hipercapnia permisiva aceptable en un retenedor crónico. Bajo la FiO₂ a lo necesario para SatO₂ > 90 %.',
          correcta: true,
          explicacion:
            'La presión pico es la suma de la presión resistiva (R × flujo) y la alveolar. Al doblar el flujo, el componente resistivo pasa de 10 a 20 cmH₂O, pero la Pplat (la que ve el alvéolo) ha bajado de 16 a 12 porque hay menos auto-PEEP. ' +
            'La Ppico está lejos del límite de 45 y la Pplat muy por debajo de 30. En cuanto al CO₂, este paciente vive con PaCO₂ alta y bicarbonato compensador: 54 mmHg con pH 7,37 es su normalidad. ' +
            'Lo prioritario es mantener el Te largo; el broncoespasmo se trata con fármacos, no con más frecuencia.',
          etiquetaTema: 'resistencia frente a compliance',
        },
        {
          texto: 'Subo la FR a 18 para bajar la PaCO₂ hacia 40.',
          correcta: false,
          explicacion:
            'Volver a 18 ciclos acorta el Te a 2,9 s y recupera el atrapamiento (auto-PEEP ≈ 3,4). Una PaCO₂ de 40 sería alcalosis para un paciente con bicarbonato 30 y no aporta nada: el objetivo es el pH tolerable, no la PaCO₂ normal.',
          etiquetaTema: 'ventilación y CO2',
          consecuencia: 'Con FR 18 el Te baja a 2,9 s, la PEEP total vuelve a subir (auto-PEEP ≈ 3,4) y la TA empieza a bajar hacia 125/75.',
          transicionConsecuencia: { respirador: { fr: 18 } },
        },
        {
          texto: 'Subo la PEEP externa a 8 para igualar la PEEP total de antes.',
          correcta: false,
          explicacion:
            'La auto-PEEP ahora es de 1,4 cmH₂O: la PEEP externa de 5 ya la supera. Subirla no mejora nada y aumenta la presión media y la Pplat sin beneficio. ' +
            'La referencia de PEEP externa ≤ 80 % de la auto-PEEP (evidencia complementaria) se aplica a la auto-PEEP actual, no a la que había con la programación anterior.',
          etiquetaTema: 'auto-PEEP',
        },
        {
          texto: 'Bajo el flujo a 30 L/min para que la Ppico vuelva a 26: una Ppico de 32 es peligrosa.',
          correcta: false,
          explicacion:
            'La Ppico de 32 es presión en la vía aérea proximal mientras hay flujo, no presión alveolar: el alvéolo ve la Pplat de 12. Bajar el flujo alarga el Ti (0,88 s) y acorta el Te, justo lo contrario de lo que necesita un pulmón obstructivo. ' +
            'El límite de seguridad del curso para la Ppico es 45 cmH₂O; el que importa para el daño pulmonar es la Pplat < 30.',
          etiquetaTema: 'resistencia frente a compliance',
        },
      ],
      // Cuarenta minutos después se aligera la sedación y el paciente recupera el esfuerzo respiratorio.
      transicion: {
        paciente: { pmus: esfuerzoEspontaneo, pmusGanancia: 1 },
        respirador: { triggerFlujo: 2, fio2: 0.4 },
        duracion: 10,
      },
    },
    {
      id: 'p4',
      titulo: 'El paciente despierta',
      narrativa:
        'Cuarenta minutos después, con la sedación aligerada (dosis según protocolo local), el paciente abre los ojos y empieza a hacer esfuerzos. El trigger por flujo está en 2 L/min y **dispara todos los ciclos: FR total 18**, ' +
        'cada uno con los **440 ml** programados a 60 L/min. El volumen minuto ha subido a 7,5 L/min, la Ppico es de 31 cmH₂O y el **EtCO₂ ha bajado a 29 mmHg**.\n\n' +
        'En la curva de flujo vuelves a ver que la **espiración no llega a cero** antes de cada esfuerzo, y ya no puedes hacer una pausa espiratoria fiable porque el paciente dispara antes de que termine el ciclo. ' +
        'No hay tos ni desadaptación franca; está tranquilo, colabora y mantiene SpO₂ 100 % con FiO₂ 0,4. TA 125/75, FC 114.',
      pregunta: '¿Qué haces con el respirador?',
      opciones: [
        {
          texto: 'Paso a presión soporte: PS 14 cmH₂O sobre PEEP 5, trigger por flujo 2 L/min, trigger espiratorio al 25 % (valor por defecto), FR de respaldo 12 y FiO₂ 0,4.',
          correcta: true,
          explicacion:
            'El paciente tiene estímulo respiratorio y esfuerzos eficaces: es el momento de dejarle controlar su patrón. En VC asistido cada esfuerzo recibe un Vt fijo de 440 ml a 18 rpm, con lo que el Te se acorta de nuevo y reaparece el atrapamiento. ' +
            'En PS el paciente decide cuándo empieza y cuándo acaba la inspiración, y el nivel de soporte se ajusta para un Vt y una FR cómodos. La PEEP externa de 5 facilita el disparo contra la auto-PEEP residual.',
          etiquetaTema: 'presión soporte',
        },
        {
          texto: 'Profundizo la sedación y relajo de nuevo para que deje de disparar y vuelva a la FR de 12.',
          correcta: false,
          explicacion:
            'Volver a sedar y relajar a un paciente que respira bien y colabora prolonga la ventilación mecánica y sus complicaciones. La sedación profunda se reserva para la asincronía grave que no se corrige ajustando el respirador.',
          etiquetaTema: 'asincronía',
        },
        {
          texto: 'Mantengo VC y subo la FR programada a 18 para que coincida con la suya.',
          correcta: false,
          explicacion:
            'La FR programada en VC asistido es solo la de respaldo: el paciente ya marca 18. El problema no es la cifra sino que cada ciclo entrega 440 ml a 18 rpm con un Te de 2,9 s, insuficiente para su constante de tiempo. Igualar la FR no cambia nada.',
          etiquetaTema: 'programación obstructiva',
        },
        {
          texto: 'Paso a presión control con ΔP 12, Ti 1,0 s y FR 18.',
          correcta: false,
          explicacion:
            'En PC el Ti es fijo: 1,0 s es más largo que el esfuerzo del paciente (unos 0,7 s), por lo que acabará espirando contra el respirador, y con FR 18 el Te queda en 2,3 s con atrapamiento. ' +
            'Un paciente con estímulo propio necesita un modo que cicle con su esfuerzo, no un Ti impuesto.',
          etiquetaTema: 'asincronía',
          consecuencia: 'En PC con Ti 1,0 y FR 18 el Te es de 2,3 s, la PEEP total sube a unos 9 cmH₂O (auto-PEEP ≈ 4) y el paciente intenta espirar antes de que termine la inspiración.',
          transicionConsecuencia: { respirador: { modo: 'PC', deltaP: 12, ti: 1.0, fr: 18 } },
        },
      ],
      transicion: { respirador: { modo: 'PS', ps: 14, trigE: 0.25, tiMax: 2.5, fr: 12 } },
    },
    {
      id: 'p5',
      titulo: 'Ciclado tardío en presión soporte',
      narrativa:
        'En **PS 14 sobre PEEP 5** el paciente dispara a 18 rpm con un **VTE de unos 420 ml** y Ppico 19 cmH₂O. Pero el monitor muestra un **Ti de 1,06 s**, bastante más largo que su esfuerzo, y en la curva de flujo la rama inspiratoria **decae muy despacio**: ' +
        'tarda en caer hasta el 25 % del pico, que es el umbral del trigger espiratorio.\n\n' +
        'Al final de cada insuflación ves que contrae el abdomen y que la presión hace una pequeña joroba antes de ciclar: **está intentando espirar mientras el respirador sigue insuflando**. ' +
        'El flujo espiratorio vuelve a no llegar a cero antes del siguiente esfuerzo. TA 119/72, FC 119.',
      pregunta: '¿Qué asincronía es y cómo la corriges?',
      opciones: [
        {
          texto: 'Ciclado tardío por la constante de tiempo larga del EPOC: subo el trigger espiratorio del 25 % al 45 % para que el respirador cicle antes, cuando el flujo todavía es alto.',
          correcta: true,
          explicacion:
            'En PS el respirador cicla a espiración cuando el flujo inspiratorio cae a un porcentaje del pico. Con resistencia alta y compliance alta el flujo decae muy despacio, así que tarda mucho en llegar al 25 %: ' +
            'la insuflación se prolonga más allá del esfuerzo del paciente (Ti neural ≈ 0,7 s), que acaba espirando contra el respirador, y el Te se acorta. ' +
            'Subir el umbral al 40–50 % hace que cicle antes: el Ti se acerca al del paciente, el Te se alarga y el atrapamiento disminuye. Comprueba en el monitor que el Ti baja.',
          etiquetaTema: 'presión soporte',
        },
        {
          texto: 'Bajo el trigger espiratorio al 10 % para asegurar que recibe toda la inspiración.',
          correcta: false,
          explicacion:
            'Es justo lo contrario de lo que necesita: con un umbral más bajo el respirador tarda aún más en ciclar, el Ti se alarga hasta chocar con el Ti máximo, el paciente espira contra la insuflación y el atrapamiento empeora.',
          etiquetaTema: 'presión soporte',
          consecuencia: 'Con trigger espiratorio al 10 % el Ti se alarga hasta más de 2 s, entran más de 500 ml por ciclo, el paciente pierde esfuerzos (FR total cae a 12) y la auto-PEEP sube.',
          transicionConsecuencia: { respirador: { trigE: 0.1 } },
        },
        {
          texto: 'Subo la PS a 20 cmH₂O para que entre más volumen y se sacie antes.',
          correcta: false,
          explicacion:
            'Más presión de soporte da más volumen, pero no acorta el Ti: el flujo decae con la misma constante de tiempo y la insuflación sigue siendo demasiado larga. Además, con un Vt mayor y la misma FR, el atrapamiento aumenta y aparecen esfuerzos ineficaces.',
          etiquetaTema: 'presión soporte',
          consecuencia: 'Con PS 20 el VTE sube a unos 680 ml con Ti 1,4 s, el paciente deja de disparar la mitad de sus esfuerzos (FR total 12) y la auto-PEEP sube a unos 4,5 cmH₂O.',
          transicionConsecuencia: { respirador: { ps: 20 } },
        },
        {
          texto: 'Bajo el Ti máximo a 1,0 s para que el respirador corte la inspiración.',
          correcta: false,
          explicacion:
            'El Ti máximo es un límite de seguridad (por ejemplo, ante una fuga que impide alcanzar el umbral de flujo), no el criterio de ciclado. Ciclar por tiempo deja al respirador terminando siempre en el mismo instante, sin adaptarse al esfuerzo del paciente, y 1,0 s sigue siendo más largo que su Ti neural. ' +
            'La corrección fisiológica es ajustar el umbral de flujo.',
          etiquetaTema: 'presión soporte',
        },
      ],
      transicion: { respirador: { trigE: 0.45 } },
    },
    {
      id: 'p6',
      titulo: 'Comprobación y plan',
      narrativa:
        'Con el **trigger espiratorio al 45 %** el **Ti baja a 0,54 s**, el Te sube a 2,8 s y el paciente ya no contrae el abdomen al final de la insuflación. El VTE es de **unos 350 ml** (≈ 4,8 ml/kg de peso ideal) a 18 rpm, con Ppico 19. ' +
        'La rama espiratoria del flujo se acerca mucho más a cero antes de cada esfuerzo. TA 127/75, FC 112.\n\n' +
        'Gasometría de control: **pH 7,37, PaCO₂ 54 mmHg**, bicarbonato 30 mmol/L. SpO₂ 99 % con FiO₂ 0,4.',
      pregunta: '¿Cuál es el plan ahora?',
      opciones: [
        {
          texto: 'Mantengo PS 14 / PEEP 5 / trigger espiratorio 45 %, bajo la FiO₂ a 0,35 para SatO₂ > 90 %, sigo con broncodilatadores (dosis según protocolo local), tolero la PaCO₂ de 54 con pH 7,37 y lo traslado a UCI para continuar el destete.',
          correcta: true,
          explicacion:
            'El paciente está adaptado: dispara todos los ciclos, el Ti coincide con su esfuerzo y el atrapamiento ha disminuido. Un Vt de 350 ml en PS es aceptable en un EPOC si está cómodo. ' +
            'La PaCO₂ de 54 con pH 7,37 es su hipercapnia crónica compensada: subir la asistencia para "normalizarla" solo produce sobreasistencia. Se titula la FiO₂ a la mínima que mantenga SatO₂ > 90 %.',
          etiquetaTema: 'presión soporte',
        },
        {
          texto: 'Subo la PS a 20 para que el VTE llegue a 440 ml (6 ml/kg) y baje la PaCO₂.',
          correcta: false,
          explicacion:
            'El objetivo de 6 ml/kg es para el volumen que impone el respirador en modos controlados. En PS, el paciente elige su Vt; forzar 440 ml con más presión produce sobreasistencia: hipocapnia, esfuerzos ineficaces y más atrapamiento.',
          etiquetaTema: 'presión soporte',
          consecuencia: 'Con PS 20 el VTE sube a unos 470 ml y la PaCO₂ cae hacia 32 mmHg: alcalosis para un retenedor crónico y más volumen que vaciar en cada espiración.',
          transicionConsecuencia: { respirador: { ps: 20 } },
        },
        {
          texto: 'Retiro la PEEP externa (0 cmH₂O): en el EPOC la PEEP aumenta el atrapamiento.',
          correcta: false,
          explicacion:
            'Con auto-PEEP residual, el paciente tiene que generar una presión negativa igual a la auto-PEEP antes de que el respirador detecte el esfuerzo. Una PEEP externa por debajo de la auto-PEEP (≤ 80 %, evidencia complementaria) contrarresta esa carga sin aumentar la hiperinsuflación. ' +
            'Retirarla aumenta el trabajo de disparo y los esfuerzos ineficaces.',
          etiquetaTema: 'auto-PEEP',
        },
        {
          texto: 'Subo la FiO₂ a 1,0 para el traslado, por seguridad.',
          correcta: false,
          explicacion:
            'Con SpO₂ 99 % con FiO₂ 0,4 no hay hipoxemia que corregir. La hiperoxia no aporta beneficio y, en un EPOC, el objetivo es SatO₂ > 90 % con la FiO₂ mínima. Para el traslado basta con mantener la programación y vigilar.',
          etiquetaTema: 'oxigenación',
        },
      ],
      transicion: { respirador: { fio2: 0.35 } },
    },
  ],
  puntosClave: [
    'En el pulmón obstructivo la constante de tiempo espiratoria es larga: si el flujo espiratorio no llega a cero antes del siguiente ciclo hay atrapamiento, y la pausa espiratoria lo cuantifica (PEEP total − PEEP = auto-PEEP).',
    'Programación obstructiva: FR baja, flujo alto, Ti corto e I:E larga, Vt 6 ml/kg de peso ideal y PEEP externa moderada (por debajo de la auto-PEEP). La Ppico sube por el flujo, pero la que importa es la Pplat.',
    'En un retenedor crónico no se normaliza la PaCO₂: se tolera la hipercapnia permisiva mientras el pH sea aceptable; subir la FR solo acorta el Te y aumenta la auto-PEEP.',
    'Cuando el paciente recupera el esfuerzo, la presión soporte le permite marcar su propio Ti y FR; en VC asistido cada esfuerzo recibe un Vt fijo y el atrapamiento reaparece.',
    'En PS, con resistencia alta el flujo decae despacio y el respirador cicla tarde: el paciente espira contra la insuflación. Se corrige subiendo el trigger espiratorio (del 25 al 40–50 %) y se comprueba que el Ti medido baja.',
  ],
  expectativas: [
    {
      paso: 0,
      descripcion: 'Programación inicial: auto-PEEP > 5 cmH₂O, flujo espiratorio que no llega a 0 (< −0,08 L/s), VTE ≈ 500 ml y Ppico < 30',
      comprobar: (m) => (m.autoPeep ?? 0) > 5 && m.flujoFinEsp < -0.08 && Math.abs(m.vte - 0.5) < 0.02 && m.ppico < 30,
    },
    {
      paso: 0,
      descripcion: 'La hiperinsuflación baja la TA al menos 15 mmHg respecto a la basal (135)',
      comprobar: (m) => m.tas < 120,
    },
    {
      paso: 2,
      descripcion: 'Tras FR 12 / flujo 1 L/s / Vt 440: auto-PEEP < 2, Te > 4 s, Ppico mayor y Pplat menor que al inicio, flujo espiratorio casi a 0',
      comprobar: (m, t) =>
        (m.autoPeep ?? 9) < 2 && m.te > 4 && m.ppico > (t[0]?.ppico ?? 99) && (m.pplat ?? 99) < (t[0]?.pplat ?? 0) && m.flujoFinEsp > -0.06,
    },
    {
      paso: 2,
      descripcion: 'Hipercapnia permisiva (PaCO₂ 50–62) y recuperación de la TA (> 125)',
      comprobar: (m) => m.paco2 >= 50 && m.paco2 <= 62 && m.tas > 125,
    },
    {
      paso: 3,
      descripcion: 'Paciente despierto en VC asistido: dispara a ≈ 18 rpm con Vt 440 y vuelve a atrapar (auto-PEEP real > 2,5)',
      comprobar: (m) => m.frTotal > 16.5 && m.frTotal < 19.5 && Math.abs(m.vte - 0.44) < 0.02 && m.autoPeepReal > 2.5,
    },
    {
      paso: 4,
      descripcion: 'PS 14 con trigger espiratorio 25 %: ciclado tardío (Ti > 0,9 s frente a esfuerzo de 0,7 s), FR ≈ 18, VTE 380–460 ml',
      comprobar: (m) => m.ti > 0.9 && m.frTotal > 16.5 && m.vte > 0.38 && m.vte < 0.46 && !m.cicladoPorTiMax,
    },
    {
      paso: 5,
      descripcion: 'Con trigger espiratorio 45 % el Ti baja al menos 0,3 s, el atrapamiento disminuye, VTE > 320 ml y PaCO₂ ≤ 65',
      comprobar: (m, t) =>
        m.ti < (t[4]?.ti ?? 0) - 0.3 && m.ti < 0.7 && m.autoPeepReal < (t[4]?.autoPeepReal ?? 0) && m.vte > 0.32 && m.paco2 <= 65 && m.frTotal > 16.5,
    },
    {
      paso: 6,
      descripcion: 'Con FiO₂ 0,35 la SpO₂ se mantiene > 92 %',
      comprobar: (m) => m.spo2 > 92,
    },
  ],
};
