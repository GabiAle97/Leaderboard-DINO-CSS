(() => {
  const LANGUAGE_STORAGE_KEY = 'dino-crisis-language';
  const translations = {
    'Navegación principal': 'Main navigation',
    'RECURSOS': 'RESOURCES',
    'REGLAS': 'RULES',
    'LOGIN GOOGLE PENDIENTE DE CONFIGURACIÓN': 'GOOGLE SIGN-IN NOT CONFIGURED',
    'MI PERFIL': 'MY PROFILE',
    'MIS RUNS': 'MY RUNS',
    'AVISOS': 'NOTIFICATIONS',
    'RUN PENDIENTE': 'RUN PENDING',
    'ACTIVAR PUSH': 'ENABLE PUSH',
    'DESACTIVAR PUSH': 'DISABLE PUSH',
    'Notificaciones push desactivadas.': 'Push notifications disabled.',
    'Notificaciones push activadas en este dispositivo.': 'Push notifications enabled on this device.',
    'No se activaron las notificaciones. Revisa los permisos del navegador.': 'Notifications were not enabled. Check your browser permissions.',
    'No se pudo actualizar el permiso de notificaciones.': 'Could not update notification permissions.',
    'SALIR': 'SIGN OUT',
    'EN DIRECTO EN TWITCH': 'LIVE ON TWITCH',
    'Canales en vivo de Dino Crisis, Dino Crisis 2 y Dino Crisis 3, más runners del leaderboard que vincularon su Twitch.': 'Live channels for Dino Crisis, Dino Crisis 2, and Dino Crisis 3, plus leaderboard runners who linked their Twitch account.',
    'ACTUALIZAR': 'REFRESH',
    'ACTUALIZAR ↻': 'REFRESH ↻',
    'Conectando con Twitch…': 'Connecting to Twitch…',
    'Los canales del leaderboard aparecen aquí cuando vinculan su cuenta de Twitch desde Mi perfil, incluso si están jugando otro juego. Los demás resultados se basan en la categoría seleccionada en Twitch. La categoría no confirma el uso de Cutscene Skip Mod.': 'Leaderboard channels appear here after linking Twitch in My Profile, even when playing another game. Other results are based on the selected Twitch category. A game category does not verify use of the Cutscene Skip Mod.',
    'KIT DE LA COMUNIDAD': 'COMMUNITY HUB',
    'RECURSOS': 'RESOURCES',
    'DE RUNNING.': 'FOR RUNNING.',
    'Herramientas, guías y referencias para preparar y verificar tus runs de Dino Crisis Cutscene Skip Mod.': 'Tools, guides, and references to prepare and verify Dino Crisis Cutscene Skip Mod runs.',
    'AGREGAR RECURSO': 'ADD RESOURCE',
    'EDITAR RECURSO': 'EDIT RESOURCE',
    'AGREGA UN RECURSO.': 'ADD A RESOURCE.',
    'EDITA EL RECURSO.': 'EDIT RESOURCE.',
    'PUBLICAR RECURSO ↗': 'PUBLISH RESOURCE ↗',
    'GUARDAR CAMBIOS ↗': 'SAVE CHANGES ↗',
    'Actualiza los datos del recurso publicado para toda la comunidad.': 'Update the published resource for the whole community.',
    'Recurso actualizado para toda la comunidad.': 'Resource updated for the whole community.',
    'Cargando recursos…': 'Loading resources…',
    'Filtrar recursos': 'Filter resources',
    'TODOS': 'ALL',
    'MOD Y HERRAMIENTAS': 'MOD & TOOLS',
    'GUÍAS': 'GUIDES',
    'REGLAS Y VERIFICACIÓN': 'RULES & VERIFICATION',
    'OTROS': 'OTHER',
    'Las guías, reglas y otros recursos pueden incluir texto con formato Markdown y enlaces opcionales.': 'Guides, rules, and other resources can include Markdown text and optional links.',
    'COMUNIDAD SPEEDRUN · ARCHIVO ABIERTO': 'SPEEDRUN COMMUNITY · OPEN ARCHIVE',
    'NO HAY TIEMPO': 'NO TIME',
    'QUE': 'TO',
    'PERDER.': 'WASTE.',
    'El leaderboard de': 'The',
    'con Cutscene Skip Mod.': 'leaderboard with the Cutscene Skip Mod.',
    'Corre rápido. Sobrevive. Deja constancia.': 'Run fast. Survive. Make your mark.',
    'VER LEADERBOARD': 'VIEW LEADERBOARD',
    'ENVIAR UNA RUN': 'SUBMIT A RUN',
    'Ilustración abstracta de una instalación de investigación en alerta': 'Abstract illustration of a research facility on alert',
    'ALERTA DE CONTENCIÓN': 'CONTAINMENT ALERT',
    'ACTIVA': 'ACTIVE',
    'CLASIFICACIÓN DE LA COMUNIDAD': 'COMMUNITY RANKINGS',
    'Categorías': 'Categories',
    'Buscar jugador...': 'Search players...',
    'Buscar jugador': 'Search players',
    'Finaliza el juego lo más rápido posible. Cualquier ending.': 'Finish the game as fast as possible. Any ending.',
    'Consigue el mejor final disponible, en el menor tiempo posible.': 'Get the best ending in the shortest time possible.',
    'Run completada por segmentos. Se registra el tiempo total acumulado.': 'A segmented run. The total combined time is recorded.',
    'JUGADOR': 'PLAYER',
    'TIEMPO': 'TIME',
    'PLATAFORMA': 'PLATFORM',
    'FECHA': 'DATE',
    'VIDEO': 'VIDEO',
    'NO HAY RUNS EN ESTA CATEGORÍA': 'NO RUNS IN THIS CATEGORY',
    'El primer puesto está esperando. ¿Será tuyo?': 'The top spot is waiting. Will it be yours?',
    'ENVIAR LA PRIMERA RUN': 'SUBMIT THE FIRST RUN',
    'CARGANDO RUNS…': 'LOADING RUNS…',
    'ORDENADO POR TIEMPO': 'SORTED BY TIME',
    'HERRAMIENTAS DE MODERACIÓN': 'MODERATION TOOLS',
    'PENDIENTES': 'PENDING',
    'TU PERFIL': 'YOUR PROFILE',
    'MIS': 'MY',
    'CENTRO DE ACTIVIDAD': 'ACTIVITY CENTER',
    'TUS': 'YOUR',
    'NOTIFICACIONES': 'NOTIFICATIONS',
    'ESTÁNDARES DE VERIFICACIÓN': 'VERIFICATION STANDARDS',
    'LA COMUNIDAD': 'THE COMMUNITY',
    'Para que cada resultado pueda revisarse de forma clara y justa, todas las submissions deben cumplir estos requisitos.': 'To make every result easy to review fairly, all submissions must meet these requirements.',
    'Metadata del mod visible': 'Mod metadata must be visible',
    'La metadata generada por Cutscene Skip Mod debe aparecer en la grabación. En OBS, añade la ventana': 'Cutscene Skip Mod metadata must appear in the recording. In OBS, add the',
    'como fuente.': 'window as a source.',
    'Inputs visibles para runs sub-35': 'Inputs must be visible for runs under 35 minutes',
    'Si el tiempo final es inferior a 35 minutos, la grabación debe mostrar los inputs en pantalla durante la run.': 'If the final time is under 35 minutes, the recording must show the inputs on screen during the run.',
    'Audio del juego activado': 'Game audio must be on',
    'El sonido del juego debe ser audible en el video; no se aceptan runs con el audio del juego muteado.': 'Game audio must be audible in the video; runs with muted game audio are not accepted.',
    'IGT visible en la pantalla final': 'IGT must be visible on the final screen',
    'La pantalla final del juego debe quedar visible y mostrar el tiempo en juego (IGT).': 'The game’s final screen must be visible and show the in-game time (IGT).',
    'Video dedicado a una sola run': 'Video must contain a single run',
    'El video enviado debe contener únicamente la run completa, desde el inicio hasta el final. No se aceptan VODs de streams completos ni videos con segmentos de inicio o cierre ajenos a la run.': 'The submitted video must contain only the complete run, from start to finish. Full stream VODs and videos with unrelated intros or outros are not accepted.',
    'Sin música de fondo': 'No background music',
    'No se permite música añadida de fondo durante la run.': 'Added background music is not allowed during the run.',
    'Pausas limitadas': 'Limited pauses',
    'No se permiten pausas de más de 2 minutos durante la run.': 'Pauses longer than 2 minutes are not allowed during a run.',
    '¿NUEVO RÉCORD?': 'NEW RECORD?',
    'Tu run merece': 'Your run deserves',
    'ser vista.': 'to be seen.',
    'Comparte tu tiempo y el video de la run. Las submissions se revisan antes de aparecer en el leaderboard.': 'Share your time and run video. Submissions are reviewed before appearing on the leaderboard.',
    'FAN-MADE COMMUNITY PROJECT': 'FAN-MADE COMMUNITY PROJECT',
    'DINO CRISIS SPEEDRUNS': 'DINO CRISIS SPEEDRUNS',
    'EL': 'THE',
    'EN VIVO.': 'LIVE.',
    'Acceder con Google': 'Sign in with Google',
    'Acceder con Google. Se abre en una pestaña nueva': 'Sign in with Google. Opens in a new tab',
    'Botón de Acceder con Google': 'Google Sign-In button',
    'REGLAS DE': 'RULES FOR',
    '▶ VER RUN': '▶ WATCH RUN',
    'NUEVA SUBMISSION': 'NEW SUBMISSION',
    'REGISTRA TU': 'SUBMIT YOUR',
    'Completa los datos de tu run. Los campos marcados con * son obligatorios.': 'Enter your run details. Fields marked with * are required.',
    'JUGADOR:': 'PLAYER:',
    'CATEGORÍA *': 'CATEGORY *',
    'TIEMPO DE LA RUN *': 'RUN TIME *',
    'HORAS': 'HOURS',
    'MINUTOS': 'MINUTES',
    'SEGUNDOS': 'SECONDS',
    'Usa un número entre 0 y 59 para minutos y segundos.': 'Enter a number from 0 to 59 for minutes and seconds.',
    'PLATAFORMA': 'PLATFORM',
    'FECHA DE LA RUN *': 'RUN DATE *',
    'VIDEO DE LA RUN *': 'RUN VIDEO *',
    'NOTAS': 'NOTES',
    'Versión, estrategia, detalles relevantes... (opcional)': 'Version, strategy, relevant details... (optional)',
    'Tu submission se guardará en la hoja como pendiente de verificación.': 'Your submission will be saved as pending verification.',
    'GUARDAR SUBMISSION': 'SAVE SUBMISSION',
    'CONFIGURA TU PERFIL': 'SET UP YOUR PROFILE',
    'ELIGE TU': 'CHOOSE YOUR',
    'Tu nickname aparecerá en el leaderboard y se asociará automáticamente a todas tus runs.': 'Your nickname will appear on the leaderboard and be linked to all your runs.',
    'NICKNAME *': 'NICKNAME *',
    'Ej. ReginaRunner': 'e.g. ReginaRunner',
    'CANAL DE TWITCH': 'TWITCH CHANNEL',
    'OPCIONAL · PARA APARECER EN HOME CUANDO ESTÉS EN VIVO': 'OPTIONAL · TO APPEAR ON HOME WHEN LIVE',
    'twitch.tv/tu_canal': 'twitch.tv/your_channel',
    'FOTO DE PERFIL': 'PROFILE PICTURE',
    'OPCIONAL · PNG, JPG O WEBP · MÁX. 400 KB': 'OPTIONAL · PNG, JPG, OR WEBP · MAX 400 KB',
    'Sin foto seleccionada': 'No picture selected',
    'La foto y el canal de Twitch se muestran públicamente. El canal aparece en Home si estás en vivo y enviaste una run. Ambos son opcionales.': 'Your picture and Twitch channel are public. Your channel appears on Home when you are live and have submitted a run. Both are optional.',
    'El nickname debe ser único.': 'Your nickname must be unique.',
    'GUARDAR PERFIL': 'SAVE PROFILE',
    'PERFIL PÚBLICO': 'PUBLIC PROFILE',
    'Cerrar perfil': 'Close profile',
    'RECURSOS COMUNITARIOS': 'COMMUNITY RESOURCES',
    'AGREGA UN': 'ADD A',
    'Añade una herramienta o referencia útil. Los recursos se publican para toda la comunidad.': 'Add a useful tool or reference for the community.',
    'NOMBRE *': 'NAME *',
    'Ej. Cutscene Skip Mod': 'e.g. Cutscene Skip Mod',
    'CATEGORÍA *': 'CATEGORY *',
    'Mod y herramientas': 'Mod & tools',
    'Guías': 'Guides',
    'Reglas y verificación': 'Rules & verification',
    'ENLACE HTTPS *': 'HTTPS LINK *',
    'ENLACE HTTPS': 'HTTPS LINK',
    'OPCIONAL': 'OPTIONAL',
    'DESCRIPCIÓN *': 'DESCRIPTION *',
    '¿Qué ofrece y para qué sirve?': 'What is it and what is it for?',
    'Descripción breve del recurso.': 'A short description of the resource.',
    'CONTENIDO EN MARKDOWN *': 'MARKDOWN CONTENT *',
    '## Título de la guía\n\nEscribe aquí el contenido en Markdown...': '## Guide title\n\nWrite your content in Markdown here...',
    'Hasta 10.000 caracteres.': 'Up to 10,000 characters.',
    'Editor Markdown': 'Markdown editor',
    'EDITAR': 'EDIT',
    'PREVISUALIZAR': 'PREVIEW',
    'Markdown: títulos, listas, tablas, citas, código, **negrita**, *cursiva* y [enlaces](https://...). El HTML no se interpreta.': 'Markdown: headings, lists, tables, quotes, code, **bold**, *italic*, and [links](https://...). HTML is not rendered.',
    'Solo los moderadores pueden publicar recursos.': 'Only moderators can publish resources.',
    'PUBLICAR RECURSO': 'PUBLISH RESOURCE',
    'Cerrar': 'Close',
    'PERFIL PÚBLICO': 'PUBLIC PROFILE',
    'Cargando perfil…': 'Loading profile…',
    'Los perfiles estarán disponibles cuando se configure Apps Script.': 'Profiles will be available once Apps Script is configured.',
    'No se pudo consultar el perfil. Inténtalo de nuevo más tarde.': 'Could not load the profile. Please try again later.',
    'Actualiza el despliegue de Apps Script para habilitar los perfiles públicos.': 'Update the Apps Script deployment to enable public profiles.',
    'No se encontró un perfil público con ese nickname.': 'No public profile was found for that nickname.',
    'Este usuario todavía no tiene runs aprobadas.': 'This user has no approved runs yet.',
    'VER RUN': 'WATCH RUN',
    'ABRIR ENLACE ↗': 'OPEN LINK ↗',
    'RECURSO': 'RESOURCE',
    'Los recursos estarán disponibles cuando se configure Apps Script.': 'Resources will be available once Apps Script is configured.',
    'No se pudo conectar al catálogo.': 'Could not connect to the catalog.',
    'Configura Apps Script para cargar el catálogo de recursos.': 'Configure Apps Script to load the resource catalog.',
    'Cargando catálogo de recursos…': 'Loading resource catalog…',
    'CATÁLOGO DE LA COMUNIDAD': 'COMMUNITY CATALOG',
    'CATÁLOGO LISTO PARA RECURSOS': 'CATALOG READY FOR RESOURCES',
    'RECURSO PUBLICADO PARA TODA LA COMUNIDAD.': 'RESOURCE PUBLISHED FOR THE COMMUNITY.',
    'Solo los moderadores pueden agregar recursos.': 'Only moderators can add resources.',
    'Se requieren permisos de moderador para publicar recursos.': 'Moderator permissions are required to publish resources.',
    'Introduce un enlace de video válido que empiece con http:// o https://.': 'Enter a valid video link starting with http:// or https://.',
    'Inicia sesión con Google para enviar una run.': 'Sign in with Google to submit a run.',
    'Ingresa un tiempo válido: horas de 0 a 99 y minutos/segundos de 0 a 59.': 'Enter a valid time: hours from 0 to 99 and minutes/seconds from 0 to 59.',
    'La foto no puede superar 400 KB.': 'The picture cannot exceed 400 KB.',
    'Elige una imagen PNG, JPG o WEBP.': 'Choose a PNG, JPG, or WEBP image.',
    'No se pudo leer el archivo de imagen.': 'Could not read the image file.',
    'Run enviada y pendiente de verificación': 'Run submitted and pending verification',
    'Falta configurar la URL del Apps Script.': 'The Apps Script URL is not configured.',
    'No se pudo conectar con Apps Script. Comprueba la URL y el despliegue web.': 'Could not connect to Apps Script. Check the URL and web app deployment.',
    'Apps Script devolvió un error. Inténtalo de nuevo más tarde.': 'Apps Script returned an error. Please try again later.',
    'La respuesta de Apps Script no es JSON válido. Actualiza el despliegue del script.': 'Apps Script returned invalid JSON. Update the script deployment.',
    'APPS SCRIPT SIN CONFIGURAR · SIN RUNS': 'APPS SCRIPT NOT CONFIGURED · NO RUNS',
    'APPS SCRIPT · RUNS VERIFICADAS': 'APPS SCRIPT · VERIFIED RUNS',
    'NO SE PUDIERON CARGAR LAS RUNS · REINTENTA MÁS TARDE': 'COULD NOT LOAD RUNS · TRY AGAIN LATER',
    'Configura el Apps Script para conectar con Twitch.': 'Configure Apps Script to connect to Twitch.',
    'La integración de Twitch aún no está disponible.': 'The Twitch integration is not available yet.',
    'Buscando canales en directo…': 'Searching for live channels…',
    'Twitch no respondió correctamente.': 'Twitch did not respond correctly.',
    'La lista se activará cuando se configuren las credenciales de Twitch en Apps Script.': 'The list will be enabled once Twitch credentials are configured in Apps Script.',
    'No hay runners transmitiendo Dino Crisis en Twitch en este momento.': 'No runners are streaming Dino Crisis on Twitch right now.',
    'No se pudo actualizar la lista de Twitch.': 'Could not refresh the Twitch list.',
    'No se pudo cargar Recursos.': 'Could not load Resources.',
    'Configura Apps Script para cargar el catálogo de recursos.': 'Configure Apps Script to load the resource catalog.',
    'Todavía no hay recursos añadidos. Un moderador puede publicar aquí enlaces al mod, guías y herramientas.': 'No resources have been added yet. A moderator can publish links to the mod, guides, and tools here.',
    'Aún no hay recursos en esta categoría.': 'There are no resources in this category yet.',
    'AJUSTES DE CUENTA': 'ACCOUNT SETTINGS',
    'EDITA TU': 'EDIT YOUR',
    'Actualiza tu nickname o cambia tu foto. Si no eliges otra imagen, se conserva la actual.': 'Update your nickname or change your picture. If you do not choose a new picture, the current one is kept.',
    'GUARDAR CAMBIOS': 'SAVE CHANGES',
    'Actualiza tu nickname o cambia tu foto. Si no eliges otra imagen, se conserva la actual.': 'Update your nickname or change your picture. If you do not choose a new picture, the current one is kept.',
    'Foto actual · elige otra para reemplazarla': 'Current picture · choose another to replace it',
    'Perfil listo,': 'Profile ready,',
    'Sesión iniciada:': 'Signed in:',
    'Sesión cerrada en este navegador': 'Signed out on this browser',
    'RESTAURANDO SESIÓN…': 'RESTORING SESSION…',
    'INICIA SESIÓN CON GOOGLE': 'SIGN IN WITH GOOGLE',
    'Cargando tus runs…': 'Loading your runs…',
    'Cargando submissions pendientes…': 'Loading pending submissions…',
    'Todavía no has enviado runs.': 'You have not submitted any runs yet.',
    'No hay runs pendientes.': 'There are no pending runs.',
    'APROBADA': 'APPROVED',
    'RECHAZADA': 'REJECTED',
    'ABRIR VIDEO ↗': 'OPEN VIDEO ↗',
    'APROBAR': 'APPROVE',
    'RECHAZAR': 'REJECT',
    'El rechazo se canceló: hace falta indicar el motivo': 'Rejection cancelled: a reason is required',
    'El motivo no puede superar 300 caracteres': 'The reason cannot exceed 300 characters',
    'Run aprobada': 'Run approved',
    'Run rechazada': 'Run rejected',
    'El rechazo se canceló: hace falta indicar el motivo': 'Rejection cancelled: a reason is required',
    'Apps Script PENDIENTE DE ACTUALIZACIÓN · DATOS DE DEMOSTRACIÓN': 'APPS SCRIPT UPDATE REQUIRED',
    'La categoría no confirma el uso de Cutscene Skip Mod.': 'The game category does not verify use of the Cutscene Skip Mod.',
    'RUNNER DEL LEADERBOARD': 'LEADERBOARD RUNNER',
    'JUGANDO': 'PLAYING',
    'EN VIVO': 'LIVE',
    'VER EN TWITCH ↗': 'WATCH ON TWITCH ↗',
    'Dino Crisis en directo': 'Dino Crisis live',
    'La integración de Twitch todavía no está configurada.': 'The Twitch integration is not configured yet.',
    'La lista de recursos se activará cuando se configure Apps Script.': 'Resources will be available once Apps Script is configured.',
    'Ese enlace ya está publicado en Recursos.': 'That link is already listed in Resources.',
    'Completa nombre, categoría y contenido. El texto Markdown no puede superar 10.000 caracteres y los recursos MOD requieren un enlace HTTPS válido.': 'Enter a name, category, and content. Markdown cannot exceed 10,000 characters, and MOD resources require a valid HTTPS link.',
    'El enlace debe comenzar con https://': 'The link must start with https://',
    'Esa acción requiere permisos de moderador.': 'This action requires moderator permissions.',
    'El nickname debe tener entre 3 y 20 caracteres: letras, números, espacios o guion bajo.': 'The nickname must be 3–20 characters: letters, numbers, spaces, or underscores.',
    'Introduce un canal de Twitch válido, por ejemplo twitch.tv/tu_canal.': 'Enter a valid Twitch channel, for example twitch.tv/your_channel.',
    'No se encontró el perfil de usuario.': 'User profile not found.',
    'Ese nickname ya está en uso. Elige otro.': 'That nickname is already taken. Choose another.',
    'La foto debe ser PNG, JPG o WEBP.': 'The picture must be PNG, JPG, or WEBP.',
    'El archivo no parece ser una imagen válida.': 'The file does not appear to be a valid image.',
    'Esta acción requiere permisos de moderador.': 'This action requires moderator permissions.',
    'Revisa los campos obligatorios de la run.': 'Check the required run fields.',
    'Espera unos segundos antes de enviar otra run.': 'Wait a few seconds before submitting another run.',
    'La decisión de moderación no es válida.': 'The moderation decision is invalid.',
    'Indica el motivo del rechazo para poder notificar al jugador.': 'Provide a rejection reason so the player can be notified.',
    'Esta run ya fue revisada.': 'This run has already been reviewed.',
    'No se encontró la run indicada.': 'The specified run was not found.',
    'RECURSOS': 'RESOURCES',
  };
  const attributes = {
    'Idioma': 'Language',
    'Acceder con Google': 'Sign in with Google',
    'Acceder con Google. Se abre en una pestaña nueva': 'Sign in with Google. Opens in a new tab',
    'Botón de Acceder con Google': 'Google Sign-In button',
    'Navegación principal': 'Main navigation',
    'Filtrar recursos': 'Filter resources',
    'Categorías': 'Categories',
    'Buscar jugador': 'Search players',
    'Buscar jugador...': 'Search players...',
    'Cerrar': 'Close',
    'Cerrar perfil': 'Close profile',
    'Horas': 'Hours',
    'Minutos': 'Minutes',
    'Segundos': 'Seconds',
    'Ilustración abstracta de una instalación de investigación en alerta': 'Abstract illustration of a research facility on alert',
    'Dino Crisis Run Archive, inicio': 'Dino Crisis Run Archive, home',
    'Botón de Acceder con Google': 'Google Sign-In button',
  };
  const reverseTranslations = Object.fromEntries(Object.entries(translations).map(([spanish, english]) => [english, spanish]));
  let language;

  function detectedLanguage() {
    let stored = '';
    try { stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) || ''; } catch { /* Use the browser language when storage is unavailable. */ }
    if (stored === 'es' || stored === 'en') return stored;
    const preferences = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    const preferredLanguage = preferences.find(item => /^(?:es|en)(?:-|$)/i.test(item || ''));
    return preferredLanguage && /^es(?:-|$)/i.test(preferredLanguage) ? 'es' : 'en';
  }

  function translateText(value) {
    if (language === 'es') {
      if (reverseTranslations[value]) return reverseTranslations[value];
      let match = value.match(/^LIVE( · .+)?$/);
      if (match) {
        const suffix = (match[1] || '').replace(/ · (\d+) LINKED RUNNERS?/i, (_, count) => ` · ${count} RUNNER${Number(count) === 1 ? '' : 'S'} VINCULADO${Number(count) === 1 ? '' : 'S'}`);
        return `EN DIRECTO${suffix}`;
      }
      match = value.match(/^(\d+) RESOURCES?$/i);
      if (match) return `${match[1]} RECURSO${Number(match[1]) === 1 ? '' : 'S'}`;
      return value;
    }
    if (translations[value]) return translations[value];
    let match = value.match(/^(\d+) run(s?) aprobada(s?)$/i);
    if (match) return `${match[1]} approved run${Number(match[1]) === 1 ? '' : 's'}`;
    match = value.match(/^(\d+) (?:CANAL|CANALES) EN VIVO$/i);
    if (match) return `${match[1]} LIVE CHANNEL${Number(match[1]) === 1 ? '' : 'S'}`;
    match = value.match(/^(\d+) (?:RUNNER VINCULADO|RUNNERS VINCULADOS)$/i);
    if (match) return `${match[1]} LINKED RUNNER${Number(match[1]) === 1 ? '' : 'S'}`;
    match = value.match(/^(\d+) RECURSOS?$/i);
    if (match) return `${match[1]} RESOURCE${Number(match[1]) === 1 ? '' : 'S'}`;
    match = value.match(/^(\d+) run\(s\) esperan revisión\.$/i);
    if (match) return `${match[1]} run(s) awaiting review.`;
    match = value.match(/^Foto de (.+)$/i);
    if (match) return `Photo of ${match[1]}`;
    match = value.match(/^Ver perfil público de (.+)$/i);
    if (match) return `View ${match[1]}'s public profile`;
    match = value.match(/^RUNNER DEL LEADERBOARD( · .+)?$/);
    if (match) return `LEADERBOARD RUNNER${match[1] || ''}`;
    match = value.match(/^JUGANDO (.+)$/);
    if (match) return `PLAYING ${match[1]}`;
    match = value.match(/^EN DIRECTO( · .+)?$/);
    if (match) {
      const suffix = (match[1] || '').replace(/ · (\d+) RUNNERS? VINCULADOS?/i, (_, count) => ` · ${count} LINKED RUNNER${Number(count) === 1 ? '' : 'S'}`);
      return `LIVE${suffix}`;
    }
    match = value.match(/^No hay canales en vivo\. (.+) runners tienen Twitch vinculado\.$/);
    if (match) return `No channels are live. ${match[1]} runners have linked Twitch.`;
    match = value.match(/^Perfil listo, (.+)$/);
    if (match) return `Profile ready, ${match[1]}`;
    match = value.match(/^Sesión iniciada: (.+)$/);
    if (match) return `Signed in: ${match[1]}`;
    return value;
  }

  function translateNode(node) {
    const parent = node.parentElement;
    if (parent && parent.closest('[data-i18n-preserve]')) return;
    const value = node.nodeValue;
    const trimmed = value.trim();
    if (!trimmed) return;
    const translated = translateText(trimmed);
    if (translated !== trimmed) node.nodeValue = value.replace(trimmed, translated);
    else if (language === 'en') {
      const count = trimmed.match(/^(\d+) RUNS?$/);
      if (count) node.nodeValue = value.replace(trimmed, `${count[1]} ${Number(count[1]) === 1 ? 'RUN' : 'RUNS'}`);
      const viewers = trimmed.match(/^([\d,.]+) viendo$/);
      if (viewers) node.nodeValue = value.replace(trimmed, `${Number(viewers[1].replace(/[,.]/g, '')).toLocaleString('en')} watching`);
    } else if (language === 'es') {
      const count = trimmed.match(/^(\d+) RUNS?$/);
      if (count) node.nodeValue = value.replace(trimmed, `${count[1]} ${Number(count[1]) === 1 ? 'RUN' : 'RUNS'}`);
      const viewers = trimmed.match(/^([\d,.]+) watching$/);
      if (viewers) node.nodeValue = value.replace(trimmed, `${Number(viewers[1].replace(/[,.]/g, '')).toLocaleString('es')} viendo`);
      const spanish = Object.keys(reverseTranslations).find(key => key === trimmed);
      if (spanish) node.nodeValue = value.replace(trimmed, reverseTranslations[spanish]);
    }
  }

  function translateAttribute(value) {
    if (language === 'en') {
      if (attributes[value]) return attributes[value];
      const profile = value.match(/^Ver perfil público de (.+)$/i);
      if (profile) return `View ${profile[1]}'s public profile`;
      const photo = value.match(/^Foto de (.+)$/i);
      if (photo) return `Photo of ${photo[1]}`;
      const stream = value.match(/^Vista previa del stream de (.+)$/i);
      return stream ? `Preview of ${stream[1]}'s stream` : value;
    }
    if (language === 'es') {
      if (attributes[value]) return value;
      const translated = Object.keys(attributes).find(key => attributes[key] === value);
      if (translated) return translated;
      const profile = value.match(/^View (.+)'s public profile$/i);
      if (profile) return `Ver perfil público de ${profile[1]}`;
      const photo = value.match(/^Photo of (.+)$/i);
      if (photo) return `Foto de ${photo[1]}`;
      const stream = value.match(/^Preview of (.+)'s stream$/i);
      return stream ? `Vista previa del stream de ${stream[1]}` : value;
    }
    return value;
  }

  function translateAttributes() {
    document.querySelectorAll('*').forEach(element => {
      translateElementAttributes(element);
    });
  }

  function translateElementAttributes(element) {
    ['placeholder', 'aria-label', 'title', 'alt'].forEach(attribute => {
      const value = element.getAttribute(attribute);
      if (value) {
        const translated = translateAttribute(value);
        if (translated !== value) element.setAttribute(attribute, translated);
      }
    });
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    document.title = language === 'en' ? 'DINO CRISIS // RUN ARCHIVE' : 'DINO CRISIS // ARCHIVO DE RUNS';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = language === 'en'
      ? 'Community leaderboard for the Dino Crisis Cutscene Skip Mod.'
      : 'Leaderboard comunitario de Dino Crisis Cutscene Skip Mod.';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateNode(node);
    translateAttributes();
    document.querySelectorAll('[data-language]').forEach(button => {
      const active = button.dataset.language === language;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function setLanguage(nextLanguage) {
    if (!['es', 'en'].includes(nextLanguage)) return;
    language = nextLanguage;
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* Continue without saving the preference. */ }
    applyLanguage();
    document.dispatchEvent(new CustomEvent('app-language-change', { detail: { language } }));
  }

  try { language = detectedLanguage(); } catch { language = 'es'; }
  window.getAppLanguage = () => language;
  window.translateText = translateText;
  window.setAppLanguage = setLanguage;
  applyLanguage();
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      if (record.type === 'attributes') {
        const value = record.target.getAttribute(record.attributeName);
        if (value) {
          const translated = translateAttribute(value);
          if (translated !== value) record.target.setAttribute(record.attributeName, translated);
        }
      }
      record.addedNodes.forEach(added => {
        if (added.nodeType === Node.TEXT_NODE) translateNode(added);
        else if (added.nodeType === Node.ELEMENT_NODE) {
          translateElementAttributes(added);
          added.querySelectorAll('*').forEach(translateElementAttributes);
          const walker = document.createTreeWalker(added, NodeFilter.SHOW_TEXT);
          let textNode;
          while ((textNode = walker.nextNode())) translateNode(textNode);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
})();
