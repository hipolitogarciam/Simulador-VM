# Decisiones de diseño

Registro de las decisiones no especificadas en el encargo, con su justificación.

## Repositorio y despliegue
- El repositorio ya existía (`hipolitogarciam/Simulador-VM`) y vacío. El trabajo se ha hecho en la rama
  designada por el entorno (`claude/laughing-gauss-6cflv4`); el flujo de GitHub Pages se dispara al
  hacer push a `main`, así que basta con fusionar la rama. La `base` de Vite es `/Simulador-VM/`.
- `gh` no tenía un token válido en el entorno de desarrollo: Pages no se ha podido activar desde aquí.
  Se indica en el README cómo activarlo (Settings → Pages → Source: GitHub Actions).

## Motor fisiológico
- Paso de integración fijo `dt = 5 ms`; muestreo del monitor a 100 Hz y barrido de 8 s.
- El modelo es unicompartimental R–C. El volumen pulmonar persiste entre ciclos para que la
  auto-PEEP aparezca sola; el volumen **medido** (integral del flujo en la Y) se reinicia en cada ciclo.
- El trigger inspiratorio por flujo (`triggerFlujo`, L/min) exige además esfuerzo muscular
  (`Pmus > 0,3 cmH₂O`) para evitar autodisparo por fuga, que no se simula en v1.
- Pausa inspiratoria manual de 1 s y espiratoria de 1,5 s. La Pplat también aparece si el
  caso programa una pausa inspiratoria ≥ 0,3 s en VC (como en los respiradores reales).
- La resistencia calculada (gradiente / flujo) solo se muestra en VC, donde el flujo es constante.
- FR total = media móvil de los últimos 6 ciclos; VM espirado = suma del VTE en el último minuto
  (o VTE × FR hasta tener 15 s de datos).
- Gases: `PaCO₂_eq = 0,863 × VCO₂ / VA` con τ = 60 s por defecto (límite inferior de "minutos", para
  que el cambio sea visible en una sesión docente); los casos pueden fijar `tauCO2` o usar `gases`
  para representar minutos de evolución.
- SpO₂: ecuación del shunt con mezcla de contenidos y curva de Severinghaus; la PEEP reduce el shunt
  según `reclutabilidad`; el bajo gasto aumenta la diferencia arteriovenosa.
- EtCO₂ = PaCO₂ − gradiente (gradiente ↑ con la fracción de espacio muerto y con el bajo gasto).
  Con fuga grande o desconexión el sensor de la Y no ve gas espirado: EtCO₂ → 0.
- Hemodinámica: TAS = basal − sensibilidad × (Pmedia − 8 + 1,5 × auto-PEEP) − 55 × compresión
  mediastínica; FC compensa la caída de TAS y la hipoxemia. τ ≈ 15 s.
- Fuga grande o desconexión: el respirador tiene un flujo máximo (2,5 L/s) y un flujo de base para
  la PEEP (0,5 L/s); si la fuga exige más, la presión programada no se alcanza y la PEEP cae. Así la
  desconexión muestra presiones ≈ 0, VTI inflado (lo que el respirador empuja al circuito abierto) y
  VTE ≈ 0 sin reglas especiales.
- La ventilación alveolar se calcula con el volumen que entra en el pulmón (no con el VTE medido en
  la Y): una fuga de circuito en PC no cambia la PaCO₂, pero diluye el EtCO₂ que ve el sensor.
- La curva de presión muestra las "muescas" del esfuerzo del paciente (30 % de Pmus) en PC/PS y en
  espiración en todos los modos; los valores numéricos (Ppico, Pmedia) no incluyen esa perturbación.
  Con el paciente activo las pausas no dan valores fiables, como en un respirador real.
- La PEEP mostrada es la presión medida al final de la espiración (cae con la desconexión).
- Reserva alveolar de O₂: si la ventilación alveolar cae por debajo de 0,3 L/min (apnea, desconexión,
  extubación) la FiO₂ alveolar efectiva decae hacia 0,08 con τ = 60 s y la SpO₂ baja; al ventilar se
  recupera con τ = 10 s.
- La pausa espiratoria también se ejecuta en PS/asistido: se aplica en el siguiente fin de espiración
  o disparo del paciente, cerrando la válvula (como el "expiratory hold" de un respirador real).
- Transiciones: los parámetros del respirador cambian de golpe (como al girar el mando); los del
  paciente en rampa suave (`duracion`, 8 s por defecto); gases y hemodinámica siguen su τ. Si una
  transición interrumpe una rampa, los parámetros que no toca siguen hacia el destino de la anterior.
- Los gases se integran cada 50 ms (no cada paso de 5 ms): sus τ son ≥ 1 s y su equilibrio solo depende
  de medidas por ciclo, así que el resultado es el mismo con una décima parte del coste. La PaO₂ de
  equilibrio se resuelve por búsqueda binaria sobre el contenido de O₂ (monótono). Con ello un salto de
  tiempo de 180 s cuesta < 100 ms (ver `docs/QA.md`).

## Interfaz
- Curvas en `<canvas>` con `requestAnimationFrame`, `ResizeObserver` y `devicePixelRatio`.
  Barrido continuo con hueco de borrado tras la cabeza, como un monitor real. El fondo de cada curva
  (rejilla y etiquetas) se cachea en un canvas fuera de pantalla por tamaño y escala.
- Flujo en L/min y volumen en ml en pantalla (el motor trabaja en L/s y L).
- Sonido de alarmas desactivado por defecto; interruptor 🔔 en la cabecera del ventilador.
- Al responder mal una opción con `transicionConsecuencia`, el empeoramiento se muestra 9 s y
  después se revierte y se continúa por la rama correcta: se aplica una sola transición con el estado
  acumulado de la rama correcta (paciente, respirador y objetivos de gases) sobreescrito por la
  transición del paso.
- La TA no invasiva solo se mide al pulsar el botón (15 s) y muestra la hora simulada de la toma.
- Modo libre incluido en v1 con presets de los fenómenos del motor.

## Persistencia
- `ProgressStore` como interfaz; implementación `LocalStorageProgressStore` con `try/catch`
  y `MemoriaProgressStore` de respaldo para tests. Lo leído del almacenamiento (y lo importado) pasa
  por `sanearDatos`: perfiles sin nombre se descartan y los casos corruptos se reconstruyen.
- Código de texto portable: `VMI1.` + base64(deflate-raw(JSON)) mediante `CompressionStream`;
  si el navegador no lo soporta se usa `VMI0.` + base64(JSON).

## Pruebas
- Playwright usa el Chromium preinstalado del entorno a través de `PLAYWRIGHT_CHROMIUM_PATH`;
  en CI se usa el navegador que instala Playwright.
