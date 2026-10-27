const MESSAGE_SHEET_NAME = 'Mensajes MattGael';
const MAX_PUBLIC_MESSAGES = 50;
const MESSAGE_COOLDOWN_SECONDS = 45;

// Debe coincidir con el ID de cliente OAuth configurado en config.js.
const GOOGLE_CLIENT_ID = '792269745897-7oj158lrb89u6lrgiao1g0eapriajcvj.apps.googleusercontent.com';
const RUNS_SHEET_NAME = 'Dino Crisis Runs';
const USERS_SHEET_NAME = 'Usuarios';
const RUN_HEADERS = ['ID', 'Fecha de envío', 'Email', 'Jugador', 'Categoría', 'Tiempo', 'Plataforma', 'Fecha de run', 'Video', 'Notas', 'Estado', 'Revisado por', 'Fecha de revisión', 'Nota de revisión'];
const USER_HEADERS = ['Email', 'Nombre de Google', 'Rol', 'Fecha de registro'];
const RUN_CATEGORIES = ['ANY%', 'BEST ENDING', 'SEGMENTED%'];

function doGet(e) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const action = e && e.parameter && e.parameter.action;

  if (action === 'messages') {
    return jsonOutput_({ messages: getPublicMessages_(spreadsheet) });
  }
  if (action === 'leaderboard') {
    const publicRuns = getRuns_(spreadsheet)
      .filter(run => run.status === 'approved')
      .map(run => ({ id: run.id, player: run.player, category: run.category, time: run.time, platform: run.platform, date: run.date, video: run.video }));
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
  try {
    const payload = JSON.parse(e && e.postData && e.postData.contents || '{}');
    // Los mensajes existentes siguen aceptando su payload original sin action.
    if (payload.action === 'submitMessage' || !payload.action) return submitMessage_(payload);

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    switch (payload.action) {
      case 'profile': {
        const identity = verifyGoogleIdentity_(payload.idToken);
        return jsonOutput_({ ok: true, user: publicUser_(ensureUser_(spreadsheet, identity)) });
      }
      case 'submitRun': {
        const identity = verifyGoogleIdentity_(payload.idToken);
        const user = ensureUser_(spreadsheet, identity);
        return submitRun_(spreadsheet, identity, user, payload);
      }
      case 'myRuns': {
        const identity = verifyGoogleIdentity_(payload.idToken);
        ensureUser_(spreadsheet, identity);
        const runs = getRuns_(spreadsheet).filter(run => run.email === identity.email);
        return jsonOutput_({ ok: true, runs: runs });
      }
      case 'pendingRuns': {
        const identity = verifyGoogleIdentity_(payload.idToken);
        const user = ensureUser_(spreadsheet, identity);
        requireModerator_(user);
        const runs = getRuns_(spreadsheet).filter(run => run.status === 'pending');
        return jsonOutput_({ ok: true, runs: runs });
      }
      case 'reviewRun': {
        const identity = verifyGoogleIdentity_(payload.idToken);
        const user = ensureUser_(spreadsheet, identity);
        requireModerator_(user);
        return reviewRun_(spreadsheet, identity, payload);
      }
      default:
        return jsonOutput_({ ok: false, error: 'Acción no reconocida.' });
    }
  } catch (error) {
    return jsonOutput_({ ok: false, error: error && error.publicMessage ? error.publicMessage : 'No se pudo completar la solicitud.' });
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
  return { email: email, name: String(claims.name || email.split('@')[0]).slice(0, 80), sub: String(claims.sub) };
}

function ensureUser_(spreadsheet, identity) {
  const sheet = ensureSheet_(spreadsheet, USERS_SHEET_NAME, USER_HEADERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim().toLowerCase() === identity.email) {
      return { email: identity.email, name: String(rows[i][1] || identity.name), role: String(rows[i][2] || 'player').toLowerCase() };
    }
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // Recheck under lock to avoid duplicate accounts on simultaneous first sign-ins.
    const latest = sheet.getDataRange().getValues();
    for (let i = 1; i < latest.length; i++) {
      if (String(latest[i][0] || '').trim().toLowerCase() === identity.email) {
        return { email: identity.email, name: String(latest[i][1] || identity.name), role: String(latest[i][2] || 'player').toLowerCase() };
      }
    }
    sheet.appendRow([safeSheetText_(identity.email), safeSheetText_(identity.name), 'player', new Date()]);
  } finally {
    lock.releaseLock();
  }
  return { email: identity.email, name: identity.name, role: 'player' };
}

function publicUser_(user) {
  return { email: user.email, name: user.name, role: user.role };
}

function requireModerator_(user) {
  if (user.role !== 'moderator') throw publicError_('Esta acción requiere permisos de moderador.');
}

function submitRun_(spreadsheet, identity, user, payload) {
  const player = cleanText_(payload.player, 32);
  const category = String(payload.category || '').trim().toUpperCase();
  const rawTime = String(payload.time || '').trim();
  const timePattern = /^(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)$/;
  const timeMatch = rawTime.match(timePattern);
  const runDate = String(payload.date || '').trim();
  const video = validHttpsUrl_(payload.video);
  const notes = cleanText_(payload.notes, 300);

  if (!player || RUN_CATEGORIES.indexOf(category) === -1 || !timeMatch || !isValidRunDate_(runDate) || !video) {
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
      return jsonOutput_({ ok: true, status: decision, runId: runId });
    }
    throw publicError_('No se encontró la run indicada.');
  } finally {
    lock.releaseLock();
  }
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
