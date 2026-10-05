# Hoja de ruta · v2 y siguientes

## v1 (esta versión)
- Motor fisiológico, monitores, 8 casos de VMI, perfiles locales con exportación e
  importación, modo libre, GitHub Pages.

## v2 · Usuarios y seguimiento
- **Backend ligero** (por ejemplo Supabase) implementando la interfaz `ProgressStore`:
  usuario con alias y PIN, sincronización entre dispositivos, sin tocar la UI.
- Panel del docente: progreso agregado del grupo, fallos por tema, casos más difíciles.
- Historial de intentos con revisión paso a paso (qué curva se mostraba y qué se respondió).

## v2 · Contenido
- **VMNI**: CPAP y BiPAP con fugas intencionadas, asincronías por fuga, rampa, EPAP/IPAP,
  criterios de fracaso y de intubación.
- **Pediatría**: parámetros por peso, tubos sin balón y fuga alrededor del tubo, FR y
  tiempos adaptados, casos de bronquiolitis y asma pediátrica.
- Más casos de VMI: parada cardíaca intra-traslado con ventilación durante la RCP,
  TCE con PIC, intoxicación con hipoventilación, obesidad mórbida y posición,
  destete en Urgencias, traslado en helicóptero (altitud y oxígeno).
- Modo "sin pregunta": solo observar y describir, con autoevaluación.
- Banco de preguntas aleatorizadas por tema y examen de repaso.

## v2 · Motor y monitores
- Modelo bicompartimental (constantes de tiempo distintas por pulmón) para el
  pendelluft y la heterogeneidad del SDRA.
- Trigger por presión, autodisparo por fuga y por oscilaciones cardíacas.
- Modos adicionales: SIMV, APRV/bifásico, VC con flujo decelerado, VG/PRVC.
- Curvas presión-volumen y flujo-volumen; cálculo de la constante de tiempo.
- Gasometría simulada (pH, bicarbonato) con compensación metabólica.
- Monitor con tendencias (SpO₂, EtCO₂, TA) y registro de alarmas.
- Sonidos de alarma fieles por prioridad y silencio temporal de 2 minutos.

## v2 · Modo libre
- Editor completo del paciente (R, C, shunt, Pmus…) además del respirador.
- Comparar dos programaciones lado a lado.
- Guardar y compartir configuraciones como enlace.

## Técnica
- PWA instalable con funcionamiento sin conexión.
- Internacionalización (catalán, inglés).
- Accesibilidad: descripción textual de las curvas para lectores de pantalla,
  navegación completa por teclado, modo de alto contraste.
- Telemetría anónima opcional de uso docente.
