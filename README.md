# Dino Crisis Run Archive

Prototipo web responsive para registrar y explorar runs de **Dino Crisis Cutscene Skip Mod** en estas categorías: ANY%, BEST ENDING y SEGMENTED%.

## Ejecutar

Sirve la carpeta desde un origen HTTP/HTTPS local o publicado; el inicio de sesión de Google no funciona desde `file://`. No requiere dependencias de npm. Las submissions se guardan en Google Sheets cuando se configure y despliegue el Apps Script. La plataforma aceptada es exclusivamente PC.

## Datos de demostración

Las filas y tiempos precargados son **datos ficticios de demostración**, no récords ni resultados verificados. El estado del archivo indica que se está mostrando la demo. Elimina las filas de `DEMO_RUNS` en `app.js` cuando estén disponibles las runs reales.

## Login, submissions y moderación

El proyecto incluye el código fuente extendido del Apps Script en `apps-script/Code.gs` y el cliente web espera las acciones `profile`, `submitRun`, `myRuns`, `pendingRuns`, `reviewRun`, `notifications`, `markNotificationsRead`, `addResource`, `GET?action=leaderboard`, `GET?action=publicProfile&nickname=...`, `GET?action=resources` y `GET?action=twitchLive`. Los perfiles públicos se abren al pulsar el nickname en una run real del leaderboard; muestran foto, canal de Twitch si se configuró y solo las runs aprobadas. La respuesta pública no incluye correo ni datos de moderación. El script valida el ID token de Google en servidor contra su audiencia OAuth; los usuarios nuevos se agregan con rol `player`. Las runs nuevas quedan `pending`; el leaderboard público solo devuelve runs `approved`. Los moderadores se asignan manualmente en la pestaña protegida `Usuarios`, cambiando su rol a `moderator`. Nunca permitas que usuarios públicos editen esa pestaña.

En el primer inicio de sesión, cada usuario debe elegir un nickname único (3–20 caracteres; letras, números, espacios o guion bajo). Puede subir una foto PNG, JPG o WEBP de hasta 400 KB; la foto se publica en Google Drive para mostrarse junto al perfil y es opcional. También puede guardar su login/URL de Twitch para que su canal aparezca en Home al transmitir, incluso si está en otra categoría. Si no elige foto, se usa la imagen de Google cuando esté disponible. La hoja `Usuarios` conserva las columnas actuales y agrega `Nickname`, `Foto de perfil` y `Twitch`.

Las runs usan el nickname y la foto del perfil autenticado; no aceptan un nombre enviado desde el formulario. La sesión se conserva en `sessionStorage` y se revalida contra Apps Script tras recargar la página. Dura hasta que venza el ID token de Google (normalmente alrededor de una hora) o se cierre la pestaña/sesión. Al aprobar o rechazar una run, Apps Script escribe una notificación en `Notificaciones`; los rechazos requieren motivo.

## Recursos

La pestaña **Recursos** lee el catálogo de la hoja `Recursos`. Los visitantes pueden consultarlo y filtrarlo por categoría; los perfiles con rol `moderator` pueden agregar elementos desde el sitio. Mod y herramientas requiere un enlace HTTPS y una descripción breve. Guías, Reglas y verificación y Otros admiten contenido Markdown (hasta 10.000 caracteres), con vista previa y enlace HTTPS opcional. Se admiten títulos, listas, tablas, citas, código, negrita, cursiva y enlaces HTTP/HTTPS; el HTML no se interpreta. Apps Script valida el rol y el contenido antes de escribir. La hoja y sus encabezados se crean automáticamente al agregar el primer recurso.

## Home: runners en Twitch

La pestaña Home consulta streams live de las categorías **Dino Crisis**, **Dino Crisis 2** y **Dino Crisis 3**. También incluye los perfiles que enviaron runs si vincularon su usuario/canal de Twitch en **Mi perfil**, incluso cuando transmiten otro juego. Muestra vista previa, canal, título, espectadores y enlace al stream, etiquetando por qué aparece cada canal. El vínculo de Twitch es opcional; quienes ya tienen cuenta pueden añadirlo editando su perfil. Estar en una categoría de juego no verifica por sí solo el uso del mod.

Para habilitarlo, crea una aplicación en [Twitch Developer Console](https://dev.twitch.tv/console/apps) y guarda sus credenciales en las **Propiedades del script** de Apps Script, nunca en `config.js` ni en JavaScript del navegador:

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`

El endpoint público `GET?action=twitchLive` usa client credentials desde el servidor, busca las categorías y compara los canales vinculados con todas las cuentas que hayan enviado una run (pendiente, aprobada o rechazada). La respuesta se cachea durante 60 segundos. Copia y despliega el `apps-script/Code.gs` actualizado para activarlo. El Home consulta Twitch al abrirse, al pulsar Actualizar y cada dos minutos mientras la pestaña permanezca abierta.

Para habilitarlo:

1. Crea un cliente OAuth de tipo aplicación web en Google Cloud, configura los orígenes autorizados (por ejemplo, tu dominio de producción y `http://localhost:5500`) y copia el ID de cliente público.
2. Pon el mismo ID en `config.js` y en `GOOGLE_CLIENT_ID` de `apps-script/Code.gs`. El ID de cliente es público; no agregues client secrets al frontend.
3. Copia el contenido actualizado de `apps-script/Code.gs` al proyecto Apps Script asociado a la misma hoja. El script conserva el endpoint anterior de Match Details y los mensajes existentes, y crea `Dino Crisis Runs` y `Usuarios` cuando se necesiten.
4. Guarda y vuelve a desplegar como aplicación web, ejecutando como propietario y habilitada para recibir solicitudes. La hoja debe pertenecer al propietario que ejecuta el script. Ejecuta `authorizeRunArchive()` y autoriza Sheets, Drive y las solicitudes externas requeridas.
5. Inicia sesión para crear la fila de perfil y selecciona nickname. Asigna `moderator` manualmente a cuentas de confianza y protege la pestaña `Usuarios`. Si ya existe el despliegue, actualízalo para incluir la configuración de perfil, Drive, Twitch y `Notificaciones`; si cambia la URL, actualiza `config.js`.

El despliegue actual responde a `GET?action=leaderboard` con `{ "runs": [] }`, por lo que la URL está configurada en `config.js` y la lectura pública del leaderboard ya tiene el formato esperado. El flujo de login y escritura requiere probarse con una cuenta autorizada después de copiar y desplegar el código actualizado; no envíes submissions de prueba a la hoja de producción.

Si una petición POST devuelve el error genérico, actualiza el despliegue con el `Code.gs` actual y consulta **Apps Script → Ejecuciones**. El script registra una referencia para el error sin incluir detalles internos en la respuesta pública. La comprobación de tokens usa `UrlFetchApp`; autoriza los permisos solicitados por el script como propietario durante el despliegue.

## Categorías

- **ANY%**: completar el juego lo más rápido posible.
- **BEST ENDING**: completar el juego obteniendo el mejor ending.
- **SEGMENTED%**: registrar una run compuesta por segmentos; se compara el tiempo total.

## Requisitos para verificar runs

1. La metadata de Cutscene Skip Mod debe verse en la grabación. En OBS, añade la ventana `Dino Crisis skip status` como fuente.
2. Para tiempos inferiores a 35 minutos, los inputs deben estar visibles en pantalla.
3. El sonido del juego debe estar activado y ser audible.
4. La pantalla final del juego debe mostrar el IGT.
5. El video debe contener solo una run completa, de principio a fin; no se aceptan VODs de streams completos ni segmentos introductorios o de cierre ajenos a la run.
6. No se permite música de fondo.
7. No se permiten pausas superiores a 2 minutos durante la run.

Las reglas precisas (versión del mod, timing, pausas, segmentos permitidos y criterio exacto de Best Ending) deben acordarse y publicarse antes de considerar oficiales los tiempos.
