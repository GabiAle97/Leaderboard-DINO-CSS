const MESSAGE_SHEET_NAME = 'Mensajes MattGael';
const MAX_PUBLIC_MESSAGES = 50;
const MESSAGE_COOLDOWN_SECONDS = 45;

// Debe coincidir con el ID de cliente OAuth configurado en config.js.
const GOOGLE_CLIENT_ID = '792269745897-7oj158lrb89u6lrgiao1g0eapriajcvj.apps.googleusercontent.com';
const RUNS_SHEET_NAME = 'Dino Crisis Runs';
const USERS_SHEET_NAME = 'Usuarios';
const NOTIFICATIONS_SHEET_NAME = 'Notificaciones';
const RUN_HEADERS = ['ID', 'Fecha de envío', 'Email', 'Jugador', 'Categoría', 'Tiempo', 'Plataforma', 'Fecha de run', 'Video', 'Notas', 'Estado', 'Revisado por', 'Fecha de revisión', 'Nota de revisión'];
const USER_HEADERS = ['Email', 'Nombre de Google', 'Rol', 'Fecha de registro', 'Nickname', 'Foto de perfil'];
const NOTIFICATION_HEADERS = ['ID', 'Email', 'Run ID', 'Tipo', 'Mensaje', 'Fecha', 'Leída'];
const RUN_CATEGORIES = ['ANY%', 'BEST ENDING', 'SEGMENTED%'];

function doGet(e) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const action = e && e.parameter && e.parameter.action;

  if (action === 'messages') {
    return jsonOutput_({ messages: getPublicMessages_(spreadsheet) });
  }
  if (action === 'leaderboard') {
    const profiles = getPublicProfiles_(spreadsheet);
    const publicRuns = getRuns_(spreadsheet)
      .filter(run => run.status === 'approved')
      .map(run => ({
        id: run.id, player: profiles[run.email] && profiles[run.email].nickname || run.player,
        avatarUrl: profiles[run.email] && profiles[run.email].avatarUrl || '',
        category: run.category, time: run.time, platform: run.platform, date: run.date, video: run.video
      }));
    return jsonOutput_({ runs: publicRuns });
  }

  // Conserva el endpoint existente usado por el sitio para leer Match Details.
  const allSheets = spreadsheet.getSheets().map(sheet => {
    const range = sheet.getRange('A1:AG23');
    const values = range.getDisplayValues();
    const backgrounds = range.getBackgrounds();
    const rows = values.map((row, r) =>
      row.map((value, c) => ({ value: value, background: backgrounds[r][c] }))
    );
    return { sheet: sheet.getName(), rows: rows };
  });

  return jsonOutput_({ sheets: allSheets });
}

function doPost(e) {
  let errorStage = 'leer la solicitud';
  try {
    const payload = JSON.parse(e && e.postData && e.postData.contents || '{}');
    // Los mensajes existentes siguen aceptando su payload original sin action.
    if (payload.action === 'submitMessage' || !payload.action) return submitMessage_(payload);

    errorStage = 'abrir la hoja de cálculo';
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    switch (payload.action) {
      case 'profile': {
        errorStage = 'validar el token de Google';
        const identity = verifyGoogleIdentity_(payload.idToken);
        errorStage = 'crear o consultar el perfil';
        const user = ensureUser_(spreadsheet, identity);
        if (payload.nickname !== undefined) {
          errorStage = 'guardar nickname y foto de perfil';
          return jsonOutput_({ ok: true, user: publicUser_(saveProfile_(spreadsheet, identity, payload)) });
        }
        return jsonOutput_({ ok: true, user: publicUser_(user) });
      }
      case 'submitRun': {
        errorStage = 'validar el token de Google';
        const identity = verifyGoogleIdentity_(payload.idToken);
        errorStage = 'guardar la submission';
        const user = ensureUser_(spreadsheet, identity);
        return submitRun_(spreadsheet, identity, user, payload);
      }
      case 'myRuns': {
        errorStage = 'validar el token de Google';
        const identity = verifyGoogleIdentity_(payload.idToken);
        errorStage = 'leer tus runs';
        const user = ensureUser_(spreadsheet, identity);
        const runs = getRuns_(spreadsheet).filter(run => run.email === identity.email)
          .map(run => Object.assign({}, run, { player: user.nickname || run.player, avatarUrl: user.avatarUrl }));
        return jsonOutput_({ ok: true, runs: runs });
      }
      case 'notifications': {
        errorStage = 'validar el token de Google';
        const identity = verifyGoogleIdentity_(payload.idToken);
        errorStage = 'leer tus notificaciones';
        ensureUser_(spreadsheet, identity);
        return jsonOutput_({ ok: true, notifications: getNotifications_(spreadsheet, identity.email) });
      }
      case 'markNotificationsRead': {
        errorStage = 'validar el token de Google';
        const identity = verifyGoogleIdentity_(payload.idToken);
        errorStage = 'marcar tus notificaciones como leídas';
        ensureUser_(spreadsheet, identity);
        return markNotificationsRead_(spreadsheet, identity.email, payload.notificationIds);
      }
      case 'pendingRuns': {
        errorStage = 'validar el token de Google';
        const identity = verifyGoogleIdentity_(payload.idToken);
        errorStage = 'comprobar permisos de moderador';
        const user = ensureUser_(spreadsheet, identity);
        requireModerator_(user);
        const profiles = getPublicProfiles_(spreadsheet);
        const runs = getRuns_(spreadsheet).filter(run => run.status === 'pending')
          .map(run => Object.assign({}, run, { avatarUrl: profiles[run.email] && profiles[run.email].avatarUrl || '' }));
        return jsonOutput_({ ok: true, runs: runs });
      }
      case 'reviewRun': {
        errorStage = 'validar el token de Google';
        const identity = verifyGoogleIdentity_(payload.idToken);
        errorStage = 'comprobar permisos de moderador';
        const user = ensureUser_(spreadsheet, identity);
        requireModerator_(user);
        errorStage = 'guardar la decisión de moderación';
        return reviewRun_(spreadsheet, identity, payload);
      }
      default:
        return jsonOutput_({ ok: false, error: 'Acción no reconocida.' });
    }
  } catch (error) {
    const requestId = Utilities.getUuid();
    console.error('doPost failure [' + requestId + ']: ' + (error && error.stack ? error.stack : error));
    return jsonOutput_({
      ok: false,
      requestId: requestId,
      stage: errorStage,
      error: error && error.publicMessage ? error.publicMessage : 'Error interno del Apps Script. Revisa el registro de ejecuciones.'
    });
  }
}

function verifyGoogleIdentity_(idToken) {
  if (!idToken || GOOGLE_CLIENT_ID.indexOf('REPLACE_WITH_') === 0) {
    throw publicError_('El inicio de sesión todavía no está configurado.');
  }
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), {
    method: 'get', muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw publicError_('La sesión de Google no es válida. Vuelve a iniciar sesión.');

  const claims = JSON.parse(response.getContentText());
  const issuerValid = claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com';
  const tokenValid = claims.aud === GOOGLE_CLIENT_ID && issuerValid && Number(claims.exp) * 1000 > Date.now();
  const email = String(claims.email || '').trim().toLowerCase();
  const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
  if (!tokenValid || !email || !emailVerified || !claims.sub) throw publicError_('No se pudo verificar la cuenta de Google.');
  return { email: email, name: String(claims.name || email.split('@')[0]).slice(0, 80), picture: String(claims.picture || ''), sub: String(claims.sub) };
}

// Ejecuta esta función manualmente una vez desde el editor para conceder al
// propietario los permisos de hoja y de solicitudes externas (UrlFetchApp).
function authorizeRunArchive() {
  SpreadsheetApp.getActiveSpreadsheet().getId();
  DriveApp.getRootFolder().getId();
  UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=authorization-check', {
    method: 'get', muteHttpExceptions: true
  });
}

function ensureUser_(spreadsheet, identity) {
  const sheet = ensureSheet_(spreadsheet, USERS_SHEET_NAME, USER_HEADERS);
  ensureUserHeaders_(sheet);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim().toLowerCase() === identity.email) {
      return userFromRow_(rows[i], identity);
    }
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // Recheck under lock to avoid duplicate accounts on simultaneous first sign-ins.
    const latest = sheet.getDataRange().getValues();
    for (let i = 1; i < latest.length; i++) {
      if (String(latest[i][0] || '').trim().toLowerCase() === identity.email) {
        return userFromRow_(latest[i], identity);
      }
    }
    sheet.appendRow([safeSheetText_(identity.email), safeSheetText_(identity.name), 'player', new Date(), '', '']);
  } finally {
    lock.releaseLock();
  }
  return { email: identity.email, name: identity.name, role: 'player', nickname: '', avatarUrl: '', needsSetup: true };
}

function publicUser_(user) {
  return { name: user.nickname || user.name, nickname: user.nickname, avatarUrl: user.avatarUrl, role: user.role, needsSetup: user.needsSetup };
}

function userFromRow_(row, identity) {
  const nickname = cleanText_(row[4], 20);
  return {
    email: identity.email,
    name: String(row[1] || identity.name),
    role: String(row[2] || 'player').toLowerCase(),
    nickname: nickname,
    avatarUrl: validHttpsUrl_(row[5]) || identity.picture || '',
    needsSetup: !nickname
  };
}

function ensureUserHeaders_(sheet) {
  sheet.getRange(1, 1, 1, USER_HEADERS.length).setValues([USER_HEADERS]);
}

function saveProfile_(spreadsheet, identity, payload) {
  const user = ensureUser_(spreadsheet, identity);
  const nickname = cleanText_(payload.nickname, 20);
  if (!/^[A-Za-z0-9_ ]{3,20}$/.test(nickname)) {
    throw publicError_('El nickname debe tener entre 3 y 20 caracteres: letras, números, espacios o guion bajo.');
  }
  const sheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const currentRow = rows.findIndex((row, index) => index > 0 && String(row[0] || '').trim().toLowerCase() === identity.email);
  if (currentRow < 1) throw publicError_('No se encontró el perfil de usuario.');
  const duplicate = rows.some((row, index) => index > 0 && index !== currentRow && String(row[4] || '').trim().toLowerCase() === nickname.toLowerCase());
  if (duplicate) throw publicError_('Ese nickname ya está en uso. Elige otro.');

  const existingAvatar = validHttpsUrl_(rows[currentRow][5]);
  const avatarData = String(payload.avatarData || '');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let avatarUrl;
  try {
    const latestRows = sheet.getDataRange().getValues();
    const duplicateNow = latestRows.some((row, index) => index > 0 && index !== currentRow && String(row[4] || '').trim().toLowerCase() === nickname.toLowerCase());
    if (duplicateNow) throw publicError_('Ese nickname ya está en uso. Elige otro.');
    avatarUrl = avatarData ? saveAvatar_(identity, avatarData) : (existingAvatar || identity.picture || '');
    sheet.getRange(currentRow + 1, 5, 1, 2).setValues([[safeSheetText_(nickname), avatarUrl]]);
  } finally {
    lock.releaseLock();
  }
  return { email: identity.email, name: String(rows[currentRow][1] || identity.name), role: String(rows[currentRow][2] || 'player').toLowerCase(), nickname: nickname, avatarUrl: avatarUrl, needsSetup: false };
}

function saveAvatar_(identity, dataUrl) {
  const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw publicError_('La foto debe ser PNG, JPG o WEBP.');
  if (match[2].length > 550000) throw publicError_('La foto no puede superar 400 KB.');
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 400 * 1024) throw publicError_('La foto no puede superar 400 KB.');
  if (!isImageSignatureValid_(bytes, match[1])) throw publicError_('El archivo no parece ser una imagen válida.');
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const blob = Utilities.newBlob(bytes, 'image/' + match[1], 'avatar-' + identity.sub + '.' + extension);
  let file;
  try {
    file = DriveApp.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    if (file) file.setTrashed(true);
    throw publicError_('No se pudo guardar la foto. Verifica los permisos de Google Drive del Apps Script.');
  }
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

function isImageSignatureValid_(bytes, type) {
  // Apps Script devuelve bytes con signo; normalizarlos a 0–255 antes de comparar firmas.
  const byte = index => bytes[index] & 0xFF;
  if (type === 'png') return bytes.length > 8 && byte(0) === 137 && byte(1) === 80 && byte(2) === 78 && byte(3) === 71 && byte(4) === 13 && byte(5) === 10 && byte(6) === 26 && byte(7) === 10;
  if (type === 'jpeg') return bytes.length > 3 && byte(0) === 255 && byte(1) === 216 && byte(2) === 255;
  if (type === 'webp') return bytes.length > 12 && String.fromCharCode(byte(0), byte(1), byte(2), byte(3)) === 'RIFF' && String.fromCharCode(byte(8), byte(9), byte(10), byte(11)) === 'WEBP';
  return false;
}

function requireModerator_(user) {
  if (user.role !== 'moderator') throw publicError_('Esta acción requiere permisos de moderador.');
}

function submitRun_(spreadsheet, identity, user, payload) {
  const player = cleanText_(user.nickname, 20);
  const category = String(payload.category || '').trim().toUpperCase();
  const rawTime = String(payload.time || '').trim();
  const timePattern = /^(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)$/;
  const timeMatch = rawTime.match(timePattern);
  const runDate = String(payload.date || '').trim();
  const video = validHttpsUrl_(payload.video);
  const notes = cleanText_(payload.notes, 300);

  if (!player || user.needsSetup || RUN_CATEGORIES.indexOf(category) === -1 || !timeMatch || !isValidRunDate_(runDate) || !video) {
    throw publicError_('Revisa los campos obligatorios de la run.');
  }
  const time = [timeMatch[1] || '0', timeMatch[2], timeMatch[3]]
    .map(part => String(part).padStart(2, '0')).join(':');
  const cache = CacheService.getScriptCache();
  const rateKey = 'run-submit:' + Utilities.base64EncodeWebSafe(identity.email);
  if (cache.get(rateKey)) throw publicError_('Espera unos segundos antes de enviar otra run.');

  const sheet = ensureSheet_(spreadsheet, RUNS_SHEET_NAME, RUN_HEADERS);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = Utilities.getUuid();
    sheet.appendRow([
      id, new Date(), safeSheetText_(identity.email), safeSheetText_(player), category, time,
      'PC', runDate, video, safeSheetText_(notes), 'pending', '', '', ''
    ]);
    cache.put(rateKey, '1', 15);
    return jsonOutput_({ ok: true, run: { id: id, player: player, category: category, time: time, platform: 'PC', date: runDate, video: video, status: 'pending' } });
  } finally {
    lock.releaseLock();
  }
}

function reviewRun_(spreadsheet, identity, payload) {
  const runId = String(payload.runId || '').trim();
  const decision = String(payload.status || '').trim().toLowerCase();
  const reviewNote = cleanText_(payload.reviewNote, 300);
  if (!runId || ['approved', 'rejected'].indexOf(decision) === -1) throw publicError_('La decisión de moderación no es válida.');
  if (decision === 'rejected' && !reviewNote) throw publicError_('Indica el motivo del rechazo para poder notificar al jugador.');

  const sheet = ensureSheet_(spreadsheet, RUNS_SHEET_NAME, RUN_HEADERS);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) !== runId) continue;
      if (String(values[i][10]) !== 'pending') throw publicError_('Esta run ya fue revisada.');
      sheet.getRange(i + 1, 11, 1, 4).setValues([[
        decision, safeSheetText_(identity.email), new Date(), safeSheetText_(reviewNote)
      ]]);
      const notificationSheet = ensureSheet_(spreadsheet, NOTIFICATIONS_SHEET_NAME, NOTIFICATION_HEADERS);
      const outcome = decision === 'approved' ? 'aprobada' : 'rechazada';
      const reason = decision === 'rejected' ? ' Motivo: ' + reviewNote : '';
      notificationSheet.appendRow([
        Utilities.getUuid(), safeSheetText_(String(values[i][2] || '').toLowerCase()), runId,
        decision, 'Tu run ' + String(values[i][3] || '') + ' (' + String(values[i][4] || '') + ') fue ' + outcome + '.' + reason,
        new Date(), false
      ]);
      return jsonOutput_({ ok: true, status: decision, runId: runId });
    }
    throw publicError_('No se encontró la run indicada.');
  } finally {
    lock.releaseLock();
  }
}

function getNotifications_(spreadsheet, email) {
  const sheet = spreadsheet.getSheetByName(NOTIFICATIONS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getDisplayValues();
  return values.slice(1).filter(row => String(row[1] || '').trim().toLowerCase() === email)
    .reverse().slice(0, 50).map(row => ({
      id: row[0], runId: row[2], type: row[3], message: row[4], date: row[5], unread: String(row[6]).toLowerCase() !== 'true'
    }));
}

function markNotificationsRead_(spreadsheet, email, notificationIds) {
  const ids = Array.isArray(notificationIds) ? notificationIds.map(String).slice(0, 50) : [];
  if (!ids.length) return jsonOutput_({ ok: true, updated: 0 });
  const idSet = {};
  ids.forEach(id => { idSet[id] = true; });
  const sheet = spreadsheet.getSheetByName(NOTIFICATIONS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return jsonOutput_({ ok: true, updated: 0 });
  const values = sheet.getDataRange().getValues();
  let updated = 0;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1] || '').trim().toLowerCase() === email && idSet[String(values[i][0])]) {
      sheet.getRange(i + 1, 7).setValue(true);
      updated++;
    }
  }
  return jsonOutput_({ ok: true, updated: updated });
}

function getRuns_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(RUNS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getDisplayValues();
  return values.slice(1).filter(row => row[0]).map(row => ({
    id: row[0], submittedAt: row[1], email: String(row[2] || '').toLowerCase(), player: row[3],
    category: row[4], time: row[5], platform: row[6] || 'PC', date: row[7], video: row[8],
    notes: row[9], status: row[10], reviewedBy: row[11], reviewedAt: row[12], reviewNote: row[13]
  }));
}

function getPublicProfiles_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
  const profiles = {};
  if (!sheet || sheet.getLastRow() < 2) return profiles;
  sheet.getDataRange().getDisplayValues().slice(1).forEach(row => {
    const email = String(row[0] || '').trim().toLowerCase();
    if (email) profiles[email] = { nickname: cleanText_(row[4], 20), avatarUrl: validHttpsUrl_(row[5]) };
  });
  return profiles;
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function isValidRunDate_(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date.getTime() <= Date.now();
}

function validHttpsUrl_(value) {
  const url = String(value || '').trim();
  return /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:[/?#][^\s]*)?$/i.test(url) ? url.slice(0, 500) : '';
}

function cleanText_(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function submitMessage_(payload) {
  const name = cleanText_(payload.name, 32);
  const message = cleanText_(payload.message, 280);
  const clientId = String(payload.clientId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  const honeypot = String(payload.website || '').trim();
  if (honeypot) return jsonOutput_({ ok: true });
  if (!name || !message || !clientId) return jsonOutput_({ ok: false, error: 'Datos incompletos.' });

  const cache = CacheService.getScriptCache();
  const rateKey = 'guestbook:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, clientId));
  if (cache.get(rateKey)) return jsonOutput_({ ok: false, error: 'Esperá un momento antes de enviar otro mensaje.' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(MESSAGE_SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(MESSAGE_SHEET_NAME);
      sheet.appendRow(['Fecha', 'Nombre', 'Mensaje']);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([new Date(), safeSheetText_(name), safeSheetText_(message)]);
    cache.put(rateKey, '1', MESSAGE_COOLDOWN_SECONDS);
  } finally {
    lock.releaseLock();
  }
  return jsonOutput_({ ok: true });
}

function getPublicMessages_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(MESSAGE_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const firstRow = Math.max(2, sheet.getLastRow() - MAX_PUBLIC_MESSAGES + 1);
  return sheet.getRange(firstRow, 1, sheet.getLastRow() - firstRow + 1, 3)
    .getValues().reverse().map(row => ({
      date: row[0] instanceof Date ? row[0].toISOString() : String(row[0] || ''),
      name: String(row[1] || '').replace(/^'/, ''), message: String(row[2] || '').replace(/^'/, '')
    }));
}

function safeSheetText_(value) {
  const text = String(value || '');
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function publicError_(message) {
  const error = new Error(message);
  error.publicMessage = message;
  return error;
}

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
