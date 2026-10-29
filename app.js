window.OneSignalDeferred = window.OneSignalDeferred || [];
const CONFIG = window.RUN_ARCHIVE_CONFIG || {};
const SCRIPT_URL = CONFIG.appsScriptUrl || '';
const GOOGLE_CLIENT_ID = CONFIG.googleClientId || '';
const ONESIGNAL_APP_ID = CONFIG.oneSignalAppId || '';
const SESSION_STORAGE_KEY = 'dino-crisis-google-session-v1';
const isGoogleConfigured = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('REPLACE_WITH_');
const descriptions = {
  'ANY%': 'Finaliza el juego lo más rápido posible. Cualquier ending.',
  'BEST ENDING': 'Consigue el mejor final disponible, en el menor tiempo posible.',
  'SEGMENTED%': 'Run completada por segmentos. Se registra el tiempo total acumulado.',
};
let selectedCategory = 'ANY%';
let activeView = 'home';
let searchQuery = '';
let runs = [];
let resources = [];
let selectedResourceFilter = 'all';
let currentUser = null;
let idToken = readStoredToken();
let googleButtonLanguage = '';
let googleIdentityInitialized = false;
const knownNotificationIds = new Set();
const tableBody = document.querySelector('#run-rows');
const emptyState = document.querySelector('#empty-state');
const dialog = document.querySelector('#submit-dialog');
const form = document.querySelector('#submit-form');
const profileDialog = document.querySelector('#profile-dialog');
const publicProfileDialog = document.querySelector('#public-profile-dialog');
const publicProfileContent = document.querySelector('#public-profile-content');
const profileForm = document.querySelector('#profile-form');
const profileError = document.querySelector('#profile-error');
const avatarFile = profileForm.elements.avatar;
const error = document.querySelector('#form-error');
const toast = document.querySelector('#toast');
const dateField = form.elements.date;
const moderationPanel = document.querySelector('#moderation-panel');
const pendingRuns = document.querySelector('#pending-runs');
const myRunsSection = document.querySelector('#my-runs-section');
const notificationsSection = document.querySelector('#notifications-section');
const notificationsList = document.querySelector('#notifications-list');
const resourceForm = document.querySelector('#resource-form');
const resourceDescription = resourceForm.elements.description;
const resourceMarkdownTools = document.querySelector('#resource-markdown-tools');
const resourceMarkdownPreview = document.querySelector('#resource-markdown-preview');
const resourcePreviewTab = document.querySelector('#resource-preview-tab');
const MAX_RESOURCE_MARKDOWN_LENGTH = 10000;
dateField.max = new Date().toISOString().slice(0, 10);
dateField.value = dateField.max;
function secondsFromTime(value) {
  const parts = value.split(':').map(Number);
  return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
}
function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(window.getAppLanguage() === 'en' ? 'en' : 'es', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '').toUpperCase();
}
function render() {
  const filtered = runs.filter(run => run.category === selectedCategory && run.player.toLowerCase().includes(searchQuery));
  filtered.sort((a, b) => secondsFromTime(a.time) - secondsFromTime(b.time));
  document.querySelector('#category-description').textContent = descriptions[selectedCategory];
  document.querySelector('#entries-count').textContent = `${String(filtered.length).padStart(2, '0')} ${filtered.length === 1 ? 'RUN' : 'RUNS'}`;
  tableBody.replaceChildren();
  filtered.forEach((run, index) => {
    const nickname = run.nickname || run.player;
    const row = document.createElement('tr');
    const rank = document.createElement('td');
    rank.className = `rank${index === 0 ? ' top-rank' : ''}`;
    rank.textContent = `#${String(index + 1).padStart(2, '0')}`;
    const player = document.createElement('td');
    const playerWrap = document.createElement('div'); playerWrap.className = 'player-cell';
    const avatar = createAvatar(nickname, run.avatarUrl);
    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'player-profile-link';
    name.setAttribute('aria-label', `Ver perfil público de ${nickname}`);
    name.addEventListener('click', () => openPublicProfile(nickname));
    const nameText = document.createElement('span');
    nameText.textContent = nickname;
    nameText.dataset.i18nPreserve = '';
    name.append(nameText);
    playerWrap.append(avatar, name); player.append(playerWrap);
    const time = document.createElement('td'); time.className = 'time-cell'; time.textContent = run.time;
    const platform = document.createElement('td'); const tag = document.createElement('span'); tag.className = 'platform-tag'; tag.textContent = run.platform; platform.append(tag);
    const date = document.createElement('td'); date.className = 'date-cell'; date.textContent = formatDate(run.date);
    const video = document.createElement('td'); const link = document.createElement('a'); link.className = 'video-link'; link.textContent = '▶ VER RUN'; link.href = safeVideoUrl(run.video); link.target = '_blank'; link.rel = 'noopener noreferrer'; video.append(link);
    row.append(rank, player, time, platform, date, video); tableBody.append(row);
  });
  emptyState.hidden = filtered.length !== 0;
  document.querySelector('.table-scroll').hidden = filtered.length === 0;
  document.querySelectorAll('.category-tab').forEach(tab => {
    const active = tab.dataset.category === selectedCategory;
    tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active));
  });
}
function initials(value) {
  return value.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}
function createAvatar(name, imageUrl) {
  const avatar = document.createElement('span'); avatar.className = 'player-avatar';
  if (imageUrl && safeImageUrl(imageUrl)) {
    const image = document.createElement('img'); image.src = safeImageUrl(imageUrl); image.alt = `Foto de ${name}`; image.loading = 'lazy';
    image.addEventListener('error', () => { image.remove(); avatar.textContent = initials(name); }, { once: true });
    avatar.append(image);
  } else avatar.textContent = initials(name);
  return avatar;
}
function safeImageUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
  catch { return ''; }
}
function safeVideoUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : '#'; }
  catch { return '#'; }
}
async function openPublicProfile(nickname) {
  publicProfileContent.textContent = 'Cargando perfil…';
  publicProfileContent.classList.remove('profile-load-error');
  publicProfileDialog.showModal();
  if (!SCRIPT_URL) {
    showPublicProfileError('Los perfiles estarán disponibles cuando se configure Apps Script.');
    return;
  }
  try {
    const endpoint = new URL(SCRIPT_URL);
    endpoint.searchParams.set('action', 'publicProfile');
    endpoint.searchParams.set('nickname', nickname);
    endpoint.searchParams.set('t', String(Date.now()));
    const response = await fetch(endpoint, { method: 'GET', mode: 'cors', cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo consultar el perfil. Inténtalo de nuevo más tarde.');
    const payload = await response.json();
    if (!Object.prototype.hasOwnProperty.call(payload, 'profile')) {
      throw new Error('Actualiza el despliegue de Apps Script para habilitar los perfiles públicos.');
    }
    if (!payload.profile) throw new Error('No se encontró un perfil público con ese nickname.');
    renderPublicProfile(payload.profile);
  } catch (requestError) {
    showPublicProfileError(requestError.message || 'No se pudo cargar el perfil.');
  }
}

function showPublicProfileError(message) {
  publicProfileContent.replaceChildren();
  publicProfileContent.classList.add('profile-load-error');
  publicProfileContent.textContent = message;
}

function renderPublicProfile(profile) {
  publicProfileContent.replaceChildren();
  publicProfileContent.classList.remove('profile-load-error');
  const runs = Array.isArray(profile.runs) ? profile.runs : [];
  const heading = document.createElement('div'); heading.className = 'public-profile-heading';
  heading.append(createAvatar(profile.nickname, profile.avatarUrl));
  const identity = document.createElement('div');
  const nickname = document.createElement('h3'); nickname.textContent = profile.nickname;
  nickname.dataset.i18nPreserve = '';
  const runCount = document.createElement('p');
  runCount.textContent = `${runs.length} ${runs.length === 1 ? 'run aprobada' : 'runs aprobadas'}`;
  identity.append(nickname, runCount);
  heading.append(identity);
  if (/^[a-z0-9_]{1,25}$/i.test(profile.twitchLogin || '')) {
    const twitchLink = document.createElement('a');
    twitchLink.className = 'button button-outline public-profile-twitch';
    twitchLink.href = `https://www.twitch.tv/${encodeURIComponent(profile.twitchLogin)}`;
    twitchLink.target = '_blank'; twitchLink.rel = 'noopener noreferrer';
    twitchLink.textContent = 'TWITCH ↗';
    heading.append(twitchLink);
  }
  publicProfileContent.append(heading);

  const runList = document.createElement('div'); runList.className = 'public-profile-runs';
  if (!runs.length) {
    const empty = document.createElement('p'); empty.className = 'public-profile-empty';
    empty.textContent = 'Este usuario todavía no tiene runs aprobadas.';
    runList.append(empty);
  } else {
    runs.forEach(run => {
      const card = document.createElement('article'); card.className = 'public-profile-run';
      const category = document.createElement('span'); category.textContent = run.category;
      const time = document.createElement('strong'); time.textContent = run.time;
      const date = document.createElement('time'); date.textContent = formatDate(run.date);
      const video = document.createElement('a'); video.className = 'video-link';
      video.href = safeVideoUrl(run.video); video.target = '_blank'; video.rel = 'noopener noreferrer';
      video.textContent = 'VER RUN ↗';
      card.append(category, time, date, video);
      runList.append(card);
    });
  }
  publicProfileContent.append(runList);
}
function openDialog(category = selectedCategory) {
  if (!idToken || !currentUser || currentUser.needsSetup) { showToast('Completa tu perfil antes de enviar una run'); return; }
  form.elements.category.value = category;
  document.querySelector('#run-submitter-name').textContent = currentUser.nickname;
  error.hidden = true;
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
}
function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3600);
}
function switchView(view) {
  activeView = ['home', 'rules', 'resources'].includes(view) ? view : 'leaderboard';
  const isHome = activeView === 'home';
  const isLeaderboard = activeView === 'leaderboard';
  const isResources = activeView === 'resources';
  document.querySelector('#hero').hidden = true;
  document.querySelector('#home-view').hidden = !isHome;
  document.querySelector('#resources-view').hidden = !isResources;
  document.querySelector('#leaderboard').hidden = !isLeaderboard;
  document.querySelector('#rules').hidden = activeView !== 'rules';
  document.querySelector('#submit-banner').hidden = true;
  if (!isLeaderboard) {
    myRunsSection.hidden = true;
    notificationsSection.hidden = true;
  }
  document.querySelectorAll('[data-view]').forEach(tab => {
    const active = tab.dataset.view === activeView;
    tab.classList.toggle('nav-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  history.replaceState(null, '', `#${activeView}`);
  if (isHome) loadTwitchStreams();
  if (isResources) loadResources();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function readStoredToken() {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed.token || parsed.expiresAt <= Date.now() + 30000) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed.token;
  } catch { return null; }
}
function storeToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, expiresAt: Number(claims.exp) * 1000 }));
  } catch { throw new Error('No se pudo guardar la sesión de Google. Vuelve a iniciar sesión.'); }
}
function clearStoredToken() {
  try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* almacenamiento no disponible */ }
}
document.querySelectorAll('[data-open-submit]').forEach(button => button.addEventListener('click', () => openDialog()));
document.querySelector('.close-button').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
document.querySelectorAll('.category-tab').forEach(tab => tab.addEventListener('click', () => { selectedCategory = tab.dataset.category; render(); }));
document.querySelectorAll('[data-view]').forEach(tab => tab.addEventListener('click', () => switchView(tab.dataset.view)));
document.querySelector('#refresh-twitch').addEventListener('click', () => loadTwitchStreams(true));
document.querySelectorAll('[data-resource-filter]').forEach(button => button.addEventListener('click', () => {
  selectedResourceFilter = button.dataset.resourceFilter;
  document.querySelectorAll('[data-resource-filter]').forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
  renderResources();
}));
document.querySelector('#add-resource-button').addEventListener('click', openResourceDialog);
document.querySelector('#refresh-resources').addEventListener('click', loadResources);
document.querySelector('.resource-close').addEventListener('click', () => document.querySelector('#resource-dialog').close());
document.querySelector('#resource-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
document.querySelector('#resource-form').addEventListener('submit', submitResource);
document.querySelector('.resource-view-close').addEventListener('click', () => document.querySelector('#resource-view-dialog').close());
document.querySelector('#resource-view-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
resourceForm.elements.category.addEventListener('change', updateResourceFields);
document.querySelector('#resource-edit-tab').addEventListener('click', () => setResourceEditorMode('edit'));
resourcePreviewTab.addEventListener('click', () => setResourceEditorMode('preview'));
resourceDescription.addEventListener('input', () => {
  if (resourcePreviewTab.getAttribute('aria-selected') === 'true') renderMarkdownPreview();
});
document.querySelector('#search').addEventListener('input', event => { searchQuery = event.target.value.trim().toLowerCase(); render(); });
document.querySelector('#my-runs-button').addEventListener('click', loadMyRuns);
document.querySelector('#edit-profile-button').addEventListener('click', openEditProfile);
document.querySelector('.public-profile-close').addEventListener('click', () => publicProfileDialog.close());
publicProfileDialog.addEventListener('click', event => { if (event.target === publicProfileDialog) publicProfileDialog.close(); });
document.querySelector('#notifications-button').addEventListener('click', toggleNotifications);
document.querySelector('#push-notifications-button').addEventListener('click', togglePushSubscription);
document.querySelector('#sign-out-button').addEventListener('click', signOut);
document.querySelector('#refresh-pending').addEventListener('click', loadPendingRuns);
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { event.preventDefault(); document.querySelector('#search').focus(); }
  if (event.key === 'Escape' && dialog.open) dialog.close();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  error.hidden = true;
  if (!idToken) { error.textContent = 'Inicia sesión con Google para enviar una run.'; error.hidden = false; return; }
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  const hours = Number(data.hours);
  const minutes = Number(data.minutes);
  const seconds = Number(data.seconds);
  if (!Number.isInteger(hours) || hours < 0 || hours > 99 || !Number.isInteger(minutes) || minutes < 0 || minutes > 59 || !Number.isInteger(seconds) || seconds < 0 || seconds > 59 || (hours === 0 && minutes === 0 && seconds === 0)) {
    error.textContent = 'Ingresa un tiempo válido: horas de 0 a 99 y minutos/segundos de 0 a 59.';
    error.hidden = false;
    return;
  }
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const url = safeVideoUrl(data.video);
  if (url === '#') { error.textContent = 'Introduce un enlace de video válido que empiece con http:// o https://.'; error.hidden = false; form.elements.video.focus(); return; }
  const submission = { action: 'submitRun', idToken, category: data.category, time, platform: 'PC', date: data.date, video: url, notes: data.notes };
  submitRun(submission);
});

profileForm.addEventListener('submit', event => {
  event.preventDefault();
  profileError.hidden = true;
  if (!profileForm.reportValidity()) return;
  const nickname = profileForm.elements.nickname.value.trim();
  const file = avatarFile.files[0];
  if (file && file.size > 400 * 1024) {
    profileError.textContent = 'La foto no puede superar 400 KB.'; profileError.hidden = false; return;
  }
  if (file && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    profileError.textContent = 'Elige una imagen PNG, JPG o WEBP.'; profileError.hidden = false; return;
  }
  profileForm.querySelector('[type="submit"]').disabled = true;
  const twitchLogin = profileForm.elements.twitchLogin.value.trim();
  const save = avatarData => apiPost({ action: 'profile', idToken, nickname, avatarData, twitchLogin });
  const request = file ? readAvatarFile(file).then(save) : save('');
  request.then(result => {
    profileDialog.close();
    resetProfileForm();
    activateUser(result.user); loadNotifications();
    showToast(`Perfil listo, ${currentUser.nickname}`);
  }).catch(profileRequestError => {
    profileError.textContent = profileRequestError.message; profileError.hidden = false;
  }).finally(() => { profileForm.querySelector('[type="submit"]').disabled = false; });
});

avatarFile.addEventListener('change', () => {
  document.querySelector('#avatar-file-name').textContent = avatarFile.files[0]?.name || 'Sin foto seleccionada';
});
profileDialog.querySelector('.profile-close-button').addEventListener('click', () => profileDialog.close());
profileDialog.addEventListener('click', event => { if (event.target === profileDialog && currentUser && !currentUser.needsSetup) profileDialog.close(); });
profileDialog.addEventListener('cancel', event => {
  if (!currentUser || currentUser.needsSetup) event.preventDefault();
});

function openEditProfile() {
  if (!idToken || !currentUser || currentUser.needsSetup) return;
  profileError.hidden = true;
  profileForm.elements.nickname.value = currentUser.nickname || '';
  profileForm.elements.twitchLogin.value = currentUser.twitchLogin || '';
  avatarFile.value = '';
  document.querySelector('#avatar-file-name').textContent = currentUser.avatarUrl ? 'Foto actual · elige otra para reemplazarla' : 'Sin foto seleccionada';
  document.querySelector('#profile-dialog-eyebrow').textContent = 'AJUSTES DE CUENTA';
  document.querySelector('#profile-dialog-title').innerHTML = 'EDITA TU <span>PERFIL.</span>';
  document.querySelector('#profile-dialog-intro').textContent = 'Actualiza tu nickname o cambia tu foto. Si no eliges otra imagen, se conserva la actual.';
  document.querySelector('#profile-form [type="submit"]').textContent = 'GUARDAR CAMBIOS';
  document.querySelector('.profile-close-button').hidden = false;
  profileDialog.showModal();
}

function resetProfileForm() {
  profileForm.reset();
  document.querySelector('#avatar-file-name').textContent = 'Sin foto seleccionada';
  document.querySelector('#profile-dialog-eyebrow').textContent = 'CONFIGURA TU PERFIL';
  document.querySelector('#profile-dialog-title').innerHTML = 'ELIGE TU <span>NICKNAME.</span>';
  document.querySelector('#profile-dialog-intro').textContent = 'Tu nickname aparecerá en el leaderboard y se asociará automáticamente a todas tus runs.';
  document.querySelector('#profile-form [type="submit"]').innerHTML = 'GUARDAR PERFIL <span>↗</span>';
  document.querySelector('.profile-close-button').hidden = true;
}

function readAvatarFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.readAsDataURL(file);
  });
}

async function submitRun(submission) {
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    await apiPost(submission);
    const category = submission.category;
    form.reset(); dateField.value = dateField.max; dialog.close();
    selectedCategory = category; render();
    showToast('Run enviada y pendiente de verificación');
    if (currentUser && currentUser.role === 'moderator') loadPendingRuns();
    loadLeaderboard();
    if (!myRunsSection.hidden) loadMyRuns();
  } catch (requestError) {
    error.textContent = requestError.message;
    error.hidden = false;
  } finally {
    submitButton.disabled = false;
  }
}

async function apiPost(payload) {
  if (!SCRIPT_URL) throw new Error('Falta configurar la URL del Apps Script.');
  let response;
  try {
    response = await fetch(SCRIPT_URL, {
      method: 'POST', mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('No se pudo conectar con Apps Script. Comprueba la URL y el despliegue web.');
  }
  if (!response.ok) throw new Error('Apps Script devolvió un error. Inténtalo de nuevo más tarde.');
  let result;
  try { result = await response.json(); }
  catch { throw new Error('La respuesta de Apps Script no es JSON válido. Actualiza el despliegue del script.'); }
  if (!result.ok) {
    const message = result.error || 'La solicitud no pudo completarse.';
    if (result.stage === 'validar el token de Google') {
      throw new Error(`${message} Falló la etapa de validación del token; ejecuta authorizeRunArchive() en Apps Script, acepta permisos y vuelve a desplegar. Ref. ${result.requestId || 'sin ID'}`);
    }
    if (result.stage === 'abrir la hoja de cálculo') {
      throw new Error(`${message} Revisa que la implementación se ejecute como propietario y tenga acceso a la hoja. Ref. ${result.requestId || 'sin ID'}`);
    }
    if (message === 'No se pudo completar la solicitud.') {
      throw new Error('El Apps Script activo devolvió un error genérico. Actualiza el despliegue con apps-script/Code.gs y revisa “Ejecuciones” en Apps Script.');
    }
    throw new Error(result.requestId ? `${message} (ref. ${result.requestId})` : message);
  }
  return result;
}

let oneSignalState = 'idle';
function initializeOneSignal() {
  const button = document.querySelector('#push-notifications-button');
  if (!ONESIGNAL_APP_ID) {
    button.hidden = true;
    return;
  }
  if (oneSignalState === 'failed') {
    button.hidden = true;
    return;
  }
  if (oneSignalState === 'ready') {
    syncOneSignalIdentity();
    return;
  }
  if (oneSignalState === 'initializing') return;
  oneSignalState = 'initializing';
  button.hidden = true;
  window.OneSignalDeferred.push(async OneSignal => {
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        serviceWorkerPath: CONFIG.oneSignalServiceWorkerPath || 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/dinolb/' },
        autoResubscribe: true,
        welcomeNotification: { disable: true },
      });
      oneSignalState = 'ready';
      OneSignal.User.PushSubscription.addEventListener('change', updatePushButton);
      await syncOneSignalIdentity(OneSignal);
      updatePushButton();
    } catch (error) {
      oneSignalState = 'failed';
      button.hidden = true;
      console.warn('OneSignal no está listo. Comprueba que Web Push esté habilitado en el dashboard y que la URL del sitio sea https://gabiale97.github.io.', error);
    }
  });
}

function syncOneSignalIdentity(instance) {
  if (oneSignalState !== 'ready') return;
  window.OneSignalDeferred.push(async OneSignal => {
    try {
      const activeOneSignal = instance || OneSignal;
      if (currentUser && currentUser.pushExternalId) await activeOneSignal.login(currentUser.pushExternalId);
      updatePushButton();
    } catch (error) {
      console.warn('No se pudo vincular la sesión de OneSignal.', error);
    }
  });
}

function syncPushIdentity() {
  const button = document.querySelector('#push-notifications-button');
  button.hidden = !ONESIGNAL_APP_ID || !currentUser || oneSignalState !== 'ready';
  if (!button.hidden) initializeOneSignal();
  else if (ONESIGNAL_APP_ID && currentUser) initializeOneSignal();
}

function updatePushButton() {
  if (oneSignalState !== 'ready') return;
  window.OneSignalDeferred.push(OneSignal => {
    const button = document.querySelector('#push-notifications-button');
    if (!currentUser) { button.hidden = true; return; }
    button.hidden = false;
    const subscribed = OneSignal.User.PushSubscription.optedIn;
    button.textContent = subscribed ? 'DESACTIVAR PUSH' : 'ACTIVAR PUSH';
    button.setAttribute('aria-pressed', String(Boolean(subscribed)));
  });
}

async function togglePushSubscription() {
  const button = document.querySelector('#push-notifications-button');
  if (!ONESIGNAL_APP_ID || !currentUser || oneSignalState !== 'ready') return;
  button.disabled = true;
  window.OneSignalDeferred.push(async OneSignal => {
    try {
      if (OneSignal.User.PushSubscription.optedIn) {
        await OneSignal.User.PushSubscription.optOut();
        showToast('Notificaciones push desactivadas.');
      } else {
        await OneSignal.User.PushSubscription.optIn();
        showToast(OneSignal.User.PushSubscription.optedIn
          ? 'Notificaciones push activadas en este dispositivo.'
          : 'No se activaron las notificaciones. Revisa los permisos del navegador.');
      }
      updatePushButton();
    } catch (error) {
      console.warn('OneSignal subscription update failed', error);
      showToast('No se pudo actualizar el permiso de notificaciones.');
    } finally { button.disabled = false; }
  });
}

async function loadLeaderboard() {
  const status = document.querySelector('#connection-status');
  if (!SCRIPT_URL) { status.textContent = 'APPS SCRIPT SIN CONFIGURAR · SIN RUNS'; return; }
  try {
    const endpoint = new URL(SCRIPT_URL);
    endpoint.searchParams.set('action', 'leaderboard');
    const response = await fetch(endpoint, { method: 'GET', mode: 'cors', cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP error');
    const payload = await response.json();
    if (!Array.isArray(payload.runs)) throw new Error('El despliegue todavía no expone el leaderboard.');
    runs = payload.runs;
    status.textContent = 'APPS SCRIPT · RUNS VERIFICADAS';
    render();
  } catch {
    status.textContent = 'NO SE PUDIERON CARGAR LAS RUNS · REINTENTA MÁS TARDE';
  }
}

async function loadTwitchStreams(forceRefresh = false) {
  const container = document.querySelector('#twitch-streams');
  const status = document.querySelector('#twitch-status');
  const count = document.querySelector('#twitch-count');
  const refreshButton = document.querySelector('#refresh-twitch');
  if (!SCRIPT_URL) {
    status.textContent = 'Configura el Apps Script para conectar con Twitch.';
    renderTwitchMessage(container, 'La integración de Twitch aún no está disponible.');
    return;
  }
  if (!forceRefresh && container.dataset.loaded === 'true') return;
  status.textContent = 'Buscando canales en directo…';
  count.textContent = '';
  refreshButton.disabled = true;
  try {
    const endpoint = new URL(SCRIPT_URL);
    endpoint.searchParams.set('action', 'twitchLive');
    if (forceRefresh) endpoint.searchParams.set('refresh', '1');
    const response = await fetch(endpoint, { method: 'GET', mode: 'cors', cache: 'no-store' });
    if (!response.ok) throw new Error('Twitch no respondió correctamente.');
    const payload = await response.json();
    if (!Array.isArray(payload.streams)) {
      throw new Error('El Apps Script aún no incluye la consulta de Twitch. Actualiza el despliegue.');
    }
    container.dataset.loaded = 'true';
    if (!payload.configured) {
      status.textContent = payload.message || 'La integración de Twitch todavía no está configurada.';
      renderTwitchMessage(container, 'La lista se activará cuando se configuren las credenciales de Twitch en Apps Script.');
      return;
    }
    const streams = payload.streams;
    count.textContent = `${streams.length} ${streams.length === 1 ? 'CANAL EN VIVO' : 'CANALES EN VIVO'}`;
    const categories = (payload.categories || []).join(' · ');
    const linkedCount = Number(payload.linkedRunnerCount || 0);
    const linkedSummary = linkedCount ? ` · ${linkedCount} ${linkedCount === 1 ? 'RUNNER VINCULADO' : 'RUNNERS VINCULADOS'}` : '';
    status.textContent = streams.length
      ? `EN DIRECTO${categories ? ' · ' + categories : ''}${linkedSummary}`
      : (payload.message || `No hay canales en vivo. ${payload.linkedRunnerCount || 0} runners tienen Twitch vinculado.`);
    renderTwitchStreams(container, streams);
  } catch (requestError) {
    container.dataset.loaded = 'false';
    status.textContent = 'No se pudo actualizar la lista de Twitch.';
    renderTwitchMessage(container, requestError.message);
  } finally {
    refreshButton.disabled = false;
  }
}

async function loadResources() {
  const status = document.querySelector('#resource-status');
  const container = document.querySelector('#resource-list');
  const count = document.querySelector('#resource-count');
  if (!SCRIPT_URL) {
    status.textContent = 'No se pudo conectar al catálogo.';
    renderResourceMessage(container, 'Configura Apps Script para cargar el catálogo de recursos.');
    return;
  }
  status.textContent = 'Cargando catálogo de recursos…';
  try {
    const endpoint = new URL(SCRIPT_URL);
    endpoint.searchParams.set('action', 'resources');
    endpoint.searchParams.set('t', String(Date.now()));
    const response = await fetch(endpoint, { method: 'GET', mode: 'cors', cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo consultar la lista de recursos.');
    const payload = await response.json();
    if (!Array.isArray(payload.resources)) throw new Error('Actualiza el despliegue de Apps Script para activar Recursos.');
    resources = payload.resources;
    status.textContent = resources.length ? 'CATÁLOGO DE LA COMUNIDAD' : 'CATÁLOGO LISTO PARA RECURSOS';
    count.textContent = `${resources.length} ${resources.length === 1 ? 'RECURSO' : 'RECURSOS'}`;
    renderResources();
  } catch (requestError) {
    status.textContent = 'No se pudo cargar Recursos.';
    renderResourceMessage(container, requestError.message);
  }
}

function renderResourceMessage(container, message) {
  container.replaceChildren();
  const empty = document.createElement('div'); empty.className = 'resource-empty';
  const icon = document.createElement('span'); icon.className = 'resource-empty-icon'; icon.textContent = '▤';
  const text = document.createElement('p'); text.textContent = message;
  empty.append(icon, text); container.append(empty);
}

function renderResources() {
  const container = document.querySelector('#resource-list');
  container.replaceChildren();
  const visible = selectedResourceFilter === 'all'
    ? resources
    : resources.filter(resource => resource.category === selectedResourceFilter);
  if (!visible.length) {
    renderResourceMessage(container, selectedResourceFilter === 'all'
      ? 'Todavía no hay recursos añadidos. Un moderador puede publicar aquí enlaces al mod, guías y herramientas.'
      : 'Aún no hay recursos en esta categoría.');
    return;
  }
  visible.forEach(resource => {
    if (['GUIA', 'REGLAS', 'OTRO'].includes(resource.category)) {
      const card = document.createElement('article');
      card.className = 'resource-card resource-card-link';
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.setAttribute('aria-label', `Abrir recurso: ${resource.title}`);
      card.addEventListener('click', event => {
        if (!event.target.closest('.resource-edit')) openResourceViewer(resource);
      });
      card.addEventListener('keydown', event => {
        if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('.resource-edit')) {
          event.preventDefault();
          openResourceViewer(resource);
        }
      });
      const title = document.createElement('h2');
      title.textContent = resource.title;
      title.dataset.i18nPreserve = '';
      card.append(title);
      appendResourceEditButton(card, resource);
      container.append(card);
      return;
    }
    const card = document.createElement('article'); card.className = 'resource-card';
    const category = document.createElement('span'); category.className = `resource-card-category resource-${resource.category.toLowerCase()}`;
    category.textContent = resourceCategoryLabel(resource.category);
    const title = document.createElement('h2'); title.textContent = resource.title;
    title.dataset.i18nPreserve = '';
    const body = resource.category === 'MOD'
      ? document.createElement('p')
      : document.createElement('div');
    body.className = resource.category === 'MOD' ? '' : 'resource-markdown';
    body.dataset.i18nPreserve = '';
    if (resource.category === 'MOD') body.textContent = resource.description;
    else body.append(renderMarkdown(resource.description));
    const cardHeader = document.createElement('div'); cardHeader.className = 'resource-card-header';
    const index = document.createElement('span'); index.className = 'resource-index'; index.textContent = String(resources.indexOf(resource) + 1).padStart(2, '0');
    cardHeader.append(category, index);
    card.append(cardHeader, title, body);
    if (safeHttpsUrl(resource.url) !== '#') {
      const link = document.createElement('a'); link.className = 'button button-primary resource-open';
      link.href = safeHttpsUrl(resource.url); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'ABRIR ENLACE ↗';
      card.append(link);
    }
    appendResourceEditButton(card, resource);
    container.append(card);
  });
}

function openResourceViewer(resource) {
  const dialog = document.querySelector('#resource-view-dialog');
  document.querySelector('#resource-view-title').textContent = resource.title;
  document.querySelector('#resource-view-category').textContent = resourceCategoryLabel(resource.category);
  const content = document.querySelector('#resource-view-content');
  content.replaceChildren(renderMarkdown(resource.description));
  const link = document.querySelector('#resource-view-link');
  const url = safeHttpsUrl(resource.url);
  link.hidden = url === '#';
  if (url !== '#') {
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  } else {
    link.removeAttribute('href');
  }
  dialog.showModal();
}

function appendResourceEditButton(card, resource) {
  if (!idToken || !currentUser || currentUser.role !== 'moderator') return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'resource-edit button button-outline';
  button.textContent = 'EDITAR RECURSO';
  button.setAttribute('aria-label', `Editar ${resource.title}`);
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openResourceDialog(resource);
  });
  card.append(button);
}

function renderMarkdown(markdown) {
  const fragment = document.createDocumentFragment();
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    if (/^\s*```/.test(line)) {
      const codeLines = [];
      index++;
      while (index < lines.length && !/^\s*```/.test(lines[index])) codeLines.push(lines[index++]);
      if (index < lines.length) index++;
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = codeLines.join('\n');
      pre.append(code); fragment.append(pre);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      const element = document.createElement(`h${heading[1].length}`);
      appendMarkdownInline(element, heading[2]);
      fragment.append(element); index++; continue;
    }
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      fragment.append(document.createElement('hr')); index++; continue;
    }
    if (line.includes('|') && index + 1 < lines.length
      && /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])) {
      const headers = splitMarkdownTableRow(line);
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headers.forEach(value => {
        const cell = document.createElement('th');
        appendMarkdownInline(cell, value);
        headerRow.append(cell);
      });
      thead.append(headerRow);
      table.append(thead);
      index += 2;
      const tbody = document.createElement('tbody');
      while (index < lines.length && lines[index].includes('|')) {
        const row = document.createElement('tr');
        splitMarkdownTableRow(lines[index++]).forEach(value => {
          const cell = document.createElement('td');
          appendMarkdownInline(cell, value);
          row.append(cell);
        });
        tbody.append(row);
      }
      table.append(tbody); fragment.append(table); continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) quoteLines.push(lines[index++].replace(/^\s*>\s?/, ''));
      const quote = document.createElement('blockquote');
      quote.append(renderMarkdown(quoteLines.join('\n')));
      fragment.append(quote); continue;
    }
    const listMatch = line.match(/^\s*(?:[-+*]\s+|\d+[.)]\s+)/);
    if (listMatch) {
      const ordered = /^\s*\d/.test(line);
      const list = document.createElement(ordered ? 'ol' : 'ul');
      while (index < lines.length) {
        const item = lines[index].match(/^\s*(?:[-+*]\s+|\d+[.)]\s+)(.+)$/);
        if (!item || /^\s*\d/.test(lines[index]) !== ordered) break;
        const entry = document.createElement('li');
        appendMarkdownInline(entry, item[1]);
        list.append(entry); index++;
      }
      fragment.append(list); continue;
    }
    const paragraphLines = [];
    while (index < lines.length && lines[index].trim()
      && !/^\s*```/.test(lines[index])
      && !/^(?:#{1,6}\s|>\s?)/.test(lines[index])
      && !/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[index])
      && !/^\s*(?:[-+*]\s+|\d+[.)]\s+)/.test(lines[index])) {
      paragraphLines.push(lines[index++]);
    }
    const paragraph = document.createElement('p');
    appendMarkdownInline(paragraph, paragraphLines.join('\n'));
    fragment.append(paragraph);
  }
  return fragment;
}

function splitMarkdownTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

function appendMarkdownInline(parent, text) {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text))) {
    parent.append(document.createTextNode(text.slice(lastIndex, match.index)));
    const token = match[0];
    if (token[0] === '[') {
      const linkParts = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      const url = linkParts && safeMarkdownUrl(linkParts[2]);
      if (url) {
        const link = document.createElement('a');
        link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.textContent = linkParts[1]; parent.append(link);
      } else parent.append(document.createTextNode(linkParts ? linkParts[1] : token));
    } else {
      const isCode = token[0] === '`';
      const delimiter = isCode ? '`' : token.slice(0, token.startsWith('**') || token.startsWith('__') || token.startsWith('~~') ? 2 : 1);
      const tag = isCode ? 'code' : delimiter === '~~' ? 'del' : delimiter.length === 2 ? 'strong' : 'em';
      const element = document.createElement(tag);
      element.textContent = token.slice(delimiter.length, -delimiter.length);
      parent.append(element);
    }
    lastIndex = pattern.lastIndex;
  }
  parent.append(document.createTextNode(text.slice(lastIndex)));
}

function safeMarkdownUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function resourceCategoryLabel(category) {
  return ({ MOD: 'MOD Y HERRAMIENTAS', GUIA: 'GUÍAS', REGLAS: 'REGLAS Y VERIFICACIÓN', OTRO: 'OTROS' })[category] || 'RECURSO';
}

function safeHttpsUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : '#'; }
  catch { return '#'; }
}

function openResourceDialog(resource = null) {
  if (!idToken || !currentUser || currentUser.role !== 'moderator') {
    showToast('Solo los moderadores pueden agregar recursos.');
    return;
  }
  resourceForm.reset();
  resourceForm.elements.id.value = resource ? resource.id : '';
  if (resource) {
    resourceForm.elements.title.value = resource.title;
    resourceForm.elements.category.value = resource.category;
    resourceForm.elements.url.value = resource.url || '';
    resourceForm.elements.description.value = resource.description;
  }
  setResourceEditorMode('edit');
  updateResourceFields();
  document.querySelector('#resource-dialog .dialog-header h2').textContent = resource ? 'EDITA EL RECURSO.' : 'AGREGA UN RECURSO.';
  document.querySelector('#resource-submit-button').textContent = resource ? 'GUARDAR CAMBIOS ↗' : 'PUBLICAR RECURSO ↗';
  document.querySelector('#resource-dialog .dialog-intro').textContent = resource
    ? 'Actualiza los datos del recurso publicado para toda la comunidad.'
    : 'Añade una herramienta o referencia útil. Los recursos se publican para toda la comunidad.';
  document.querySelector('#resource-form-error').hidden = true;
  document.querySelector('#resource-dialog').showModal();
}

function updateResourceFields() {
  const isMod = resourceForm.elements.category.value === 'MOD';
  const urlInput = resourceForm.elements.url;
  const urlLabel = document.querySelector('#resource-url-label');
  const urlHelp = document.querySelector('#resource-url-help');
  const descriptionLabel = document.querySelector('#resource-description-label');
  const descriptionHelp = document.querySelector('#resource-description-help');
  resourceMarkdownTools.hidden = isMod;
  urlInput.required = isMod;
  urlLabel.textContent = isMod ? 'ENLACE HTTPS *' : 'ENLACE HTTPS';
  urlHelp.hidden = isMod;
  resourceDescription.maxLength = isMod ? 240 : MAX_RESOURCE_MARKDOWN_LENGTH;
  resourceDescription.rows = isMod ? 3 : 12;
  resourceDescription.placeholder = isMod
    ? '¿Qué ofrece y para qué sirve?'
    : '## Título de la guía\n\nEscribe aquí el contenido en Markdown...';
  descriptionLabel.textContent = isMod ? 'DESCRIPCIÓN *' : 'CONTENIDO EN MARKDOWN *';
  descriptionHelp.textContent = isMod ? 'Descripción breve del recurso.' : 'Hasta 10.000 caracteres.';
  if (!isMod && resourcePreviewTab.getAttribute('aria-selected') === 'true') renderMarkdownPreview();
}

function setResourceEditorMode(mode) {
  const previewMode = mode === 'preview';
  const editTab = document.querySelector('#resource-edit-tab');
  resourcePreviewTab.classList.toggle('active', previewMode);
  resourcePreviewTab.setAttribute('aria-selected', String(previewMode));
  editTab.classList.toggle('active', !previewMode);
  editTab.setAttribute('aria-selected', String(!previewMode));
  resourceDescription.hidden = previewMode;
  resourceMarkdownPreview.hidden = !previewMode;
  if (previewMode) renderMarkdownPreview();
}

function renderMarkdownPreview() {
  resourceMarkdownPreview.replaceChildren();
  if (resourceDescription.value.trim()) resourceMarkdownPreview.append(renderMarkdown(resourceDescription.value));
  else {
    const empty = document.createElement('p');
    empty.className = 'resource-preview-empty';
    empty.textContent = 'La vista previa de tu texto Markdown aparecerá aquí.';
    resourceMarkdownPreview.append(empty);
  }
}

async function submitResource(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const error = document.querySelector('#resource-form-error');
  error.hidden = true;
  if (!idToken || !currentUser || currentUser.role !== 'moderator') {
    error.textContent = 'Se requieren permisos de moderador para publicar recursos.';
    error.hidden = false;
    return;
  }
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  const isMod = data.category === 'MOD';
  if ((isMod && (!safeHttpsUrl(data.url) || safeHttpsUrl(data.url) === '#'))
    || (data.url && (!safeHttpsUrl(data.url) || safeHttpsUrl(data.url) === '#'))) {
    error.textContent = 'El enlace debe comenzar con https://';
    error.hidden = false;
    return;
  }
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const editing = Boolean(data.id);
    await apiPost({ action: editing ? 'editResource' : 'addResource', idToken, id: data.id, title: data.title, category: data.category, url: data.url, description: data.description });
    document.querySelector('#resource-dialog').close();
    showToast(editing ? 'Recurso actualizado para toda la comunidad.' : 'Recurso publicado para toda la comunidad.');
    await loadResources();
  } catch (requestError) {
    error.textContent = requestError.message;
    error.hidden = false;
  } finally { button.disabled = false; }
}

function renderTwitchMessage(container, message) {
  container.replaceChildren();
  const empty = document.createElement('div'); empty.className = 'twitch-empty';
  const icon = document.createElement('span'); icon.className = 'twitch-empty-icon'; icon.textContent = '◉';
  const text = document.createElement('p'); text.textContent = message;
  empty.append(icon, text); container.append(empty);
}

function renderTwitchStreams(container, streams) {
  container.replaceChildren();
  if (!streams.length) {
    renderTwitchMessage(container, 'No hay runners transmitiendo Dino Crisis en Twitch en este momento.');
    return;
  }
  streams.forEach(stream => {
    const card = document.createElement('article'); card.className = 'twitch-card';
    const previewLink = document.createElement('a'); previewLink.className = 'twitch-preview';
    previewLink.href = `https://www.twitch.tv/${encodeURIComponent(stream.login)}`;
    previewLink.target = '_blank'; previewLink.rel = 'noopener noreferrer';
    const thumbnailUrl = safeImageUrl(stream.thumbnail);
    if (thumbnailUrl) {
      const image = document.createElement('img'); image.src = thumbnailUrl; image.alt = `Vista previa del stream de ${stream.name}`; image.loading = 'lazy';
      previewLink.append(image);
    }
    const liveBadge = document.createElement('span'); liveBadge.className = 'twitch-live-badge';
    const liveDot = document.createElement('i'); liveBadge.append(liveDot, document.createTextNode(' EN VIVO'));
    const play = document.createElement('span'); play.className = 'twitch-play'; play.textContent = '▶';
    previewLink.append(liveBadge, play);

    const details = document.createElement('div'); details.className = 'twitch-card-details';
    const heading = document.createElement('div'); heading.className = 'twitch-card-heading';
    const name = document.createElement('h2'); name.textContent = stream.name;
    name.dataset.i18nPreserve = '';
    const viewers = document.createElement('span'); viewers.className = 'twitch-viewers'; viewers.textContent = `${Number(stream.viewers || 0).toLocaleString(window.getAppLanguage() === 'en' ? 'en' : 'es')} viendo`;
    heading.append(name, viewers);
    const title = document.createElement('p'); title.className = 'twitch-stream-title'; title.textContent = stream.title || 'Dino Crisis en directo'; title.title = stream.title || '';
    title.dataset.i18nPreserve = '';
    const meta = document.createElement('div'); meta.className = 'twitch-card-meta';
    const game = document.createElement('span'); game.textContent = stream.game || 'Dino Crisis';
    const language = document.createElement('span'); language.textContent = stream.language ? stream.language.toUpperCase() : '';
    meta.append(game, language);
    const sourceBadges = document.createElement('div'); sourceBadges.className = 'twitch-source-badges';
    (stream.dinoGames || []).forEach(gameName => {
      const badge = document.createElement('span'); badge.className = 'twitch-source-badge'; badge.textContent = `JUGANDO ${gameName.toUpperCase()}`; sourceBadges.append(badge);
    });
    if (stream.isLeaderboardRunner) {
      const runnerBadge = document.createElement('span'); runnerBadge.className = 'twitch-source-badge leaderboard-runner-badge';
      runnerBadge.textContent = `RUNNER DEL LEADERBOARD${stream.runnerNickname ? ' · ' + stream.runnerNickname : ''}`; sourceBadges.append(runnerBadge);
    }
    const link = document.createElement('a'); link.className = 'button button-primary twitch-watch'; link.href = previewLink.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'VER EN TWITCH ↗';
    details.append(heading, title, meta, sourceBadges, link); card.append(previewLink, details); container.append(card);
  });
}

window.renderGoogleSignInButton = renderGoogleSignInButton;
window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;
function renderGoogleSignInButton() {
  const notice = document.querySelector('#auth-config-notice');
  if (!isGoogleConfigured) { notice.hidden = false; return; }
  notice.hidden = true;
  if (!window.google || !google.accounts || !google.accounts.id) return;
  if (!googleIdentityInitialized) {
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredentialResponse, auto_select: false });
    googleIdentityInitialized = true;
  }
  const language = window.getAppLanguage();
  if (googleButtonLanguage === language) return;
  const button = document.querySelector('#google-signin-button');
  button.replaceChildren();
  google.accounts.id.renderButton(button, {
    theme: 'filled_black',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    width: 200,
    logo_alignment: 'left',
    locale: language,
  });
  googleButtonLanguage = language;
}

async function handleGoogleCredentialResponse(response) {
  idToken = response.credential;
  try {
    storeToken(idToken);
    const result = await apiPost({ action: 'profile', idToken });
    activateUser(result.user);
    showToast(`Sesión iniciada: ${currentUser.name}`);
    loadNotifications();
  } catch (authError) {
    idToken = null; currentUser = null;
    clearStoredToken();
    if (resources.length) renderResources();
    document.querySelector('#account-box').hidden = true;
    document.querySelector('#google-signin-button').hidden = false;
    showToast(authError.message);
  }
}

function activateUser(user) {
  currentUser = user;
  document.querySelector('#add-resource-button').hidden = currentUser.role !== 'moderator';
  syncPushIdentity();
  if (resources.length) renderResources();
  document.querySelector('#google-signin-button').hidden = true;
  document.querySelector('#auth-config-notice').hidden = true;
  if (currentUser.needsSetup || !currentUser.nickname) {
    document.querySelector('#account-box').hidden = true;
    profileError.hidden = true;
    if (!profileDialog.open) profileDialog.showModal();
    return;
  }
  const accountAvatar = document.querySelector('#account-avatar');
  accountAvatar.replaceChildren(createAvatar(currentUser.nickname, currentUser.avatarUrl).firstChild || document.createTextNode(initials(currentUser.nickname)));
  document.querySelector('#account-name').textContent = `${currentUser.nickname}${currentUser.role === 'moderator' ? ' · MOD' : ''}`;
  document.querySelector('#account-name').dataset.i18nPreserve = '';
  document.querySelector('#account-box').hidden = false;
  if (currentUser.role === 'moderator') { moderationPanel.hidden = false; loadPendingRuns(); }
}

async function restoreSession() {
  if (!idToken) { renderGoogleSignInButton(); return; }
  document.querySelector('#google-signin-button').hidden = true;
  document.querySelector('#auth-config-notice').hidden = false;
  document.querySelector('#auth-config-notice').textContent = 'RESTAURANDO SESIÓN…';
  try {
    const result = await apiPost({ action: 'profile', idToken });
    activateUser(result.user);
    loadNotifications();
  } catch {
    idToken = null; currentUser = null; clearStoredToken();
    if (resources.length) renderResources();
    document.querySelector('#auth-config-notice').textContent = 'INICIA SESIÓN CON GOOGLE';
    document.querySelector('#google-signin-button').hidden = false;
    renderGoogleSignInButton();
  }
}

function signOut() {
  if (ONESIGNAL_APP_ID) window.OneSignalDeferred.push(async OneSignal => { try { await OneSignal.logout(); } catch (error) { console.warn('OneSignal logout failed', error); } });
  idToken = null; currentUser = null;
  clearStoredToken();
  document.querySelector('#add-resource-button').hidden = true;
  document.querySelector('#push-notifications-button').hidden = true;
  if (resources.length) renderResources();
  document.querySelector('#account-box').hidden = true;
  document.querySelector('#google-signin-button').hidden = false;
  moderationPanel.hidden = true;
  myRunsSection.hidden = true;
  notificationsSection.hidden = true;
  if (profileDialog.open) profileDialog.close();
  if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
  showToast('Sesión cerrada en este navegador');
}

async function loadMyRuns() {
  if (!idToken) return;
  switchView('leaderboard');
  const list = document.querySelector('#my-runs-list');
  myRunsSection.hidden = false;
  list.textContent = 'Cargando tus runs…';
  try {
    const result = await apiPost({ action: 'myRuns', idToken });
    renderRunCards(list, result.runs || [], true);
    myRunsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (requestError) { list.textContent = requestError.message; }
}

async function loadPendingRuns() {
  if (!idToken || !currentUser || currentUser.role !== 'moderator') return;
  const message = document.querySelector('#moderation-message');
  message.textContent = 'Cargando submissions pendientes…';
  try {
    const result = await apiPost({ action: 'pendingRuns', idToken });
    renderRunCards(pendingRuns, result.runs || [], false);
    message.textContent = result.runs.length ? `${result.runs.length} run(s) esperan revisión.` : 'No hay submissions pendientes.';
  } catch (requestError) { message.textContent = requestError.message; }
}

async function loadNotifications(announceNew = false) {
  if (!idToken) return;
  try {
    const result = await apiPost({ action: 'notifications', idToken });
    const notifications = result.notifications || [];
    const unread = notifications.filter(item => item.unread);
    const badge = document.querySelector('#notification-count');
    badge.textContent = String(unread.length);
    badge.hidden = unread.length === 0;
    renderNotifications(notifications);
    if (announceNew) {
      const newItems = unread.filter(item => !knownNotificationIds.has(item.id));
      newItems.forEach(item => showToast(item.message));
    }
    notifications.forEach(item => knownNotificationIds.add(item.id));
  } catch (requestError) {
    notificationsList.textContent = requestError.message;
  }
}

function renderNotifications(notifications) {
  notificationsList.replaceChildren();
  if (!notifications.length) { notificationsList.textContent = 'Todavía no tienes notificaciones.'; return; }
  notifications.forEach(item => {
    const card = document.createElement('article');
    card.className = `notification-card${item.unread ? ' notification-unread' : ''}`;
    const state = document.createElement('span');
    state.className = `notification-state ${item.type === 'approved' ? 'approved' : item.type === 'pending' ? 'pending' : 'rejected'}`;
    state.textContent = item.type === 'approved' ? 'APROBADA' : item.type === 'pending' ? 'RUN PENDIENTE' : 'RECHAZADA';
    const message = document.createElement('p'); message.textContent = item.message;
    const date = document.createElement('time'); date.textContent = item.date;
    card.append(state, message, date); notificationsList.append(card);
  });
}

async function toggleNotifications() {
  if (!idToken) return;
  switchView('leaderboard');
  notificationsSection.hidden = !notificationsSection.hidden;
  if (notificationsSection.hidden) return;
  notificationsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    const result = await apiPost({ action: 'notifications', idToken });
    const notifications = result.notifications || [];
    renderNotifications(notifications);
    const unreadIds = notifications.filter(item => item.unread).map(item => item.id);
    if (unreadIds.length) {
      await apiPost({ action: 'markNotificationsRead', idToken, notificationIds: unreadIds });
      const badge = document.querySelector('#notification-count'); badge.hidden = true; badge.textContent = '0';
      notifications.forEach(item => { item.unread = false; });
      renderNotifications(notifications);
    }
  } catch (requestError) { notificationsList.textContent = requestError.message; }
}

function renderRunCards(container, list, showOwner) {
  container.replaceChildren();
  if (!list.length) { container.textContent = showOwner ? 'Todavía no has enviado runs.' : 'No hay runs pendientes.'; return; }
  list.forEach(run => {
    const card = document.createElement('article'); card.className = `run-review-card${showOwner ? ' my-run-card' : ''}`;
    const info = document.createElement('div'); info.className = 'run-review-info';
    const title = document.createElement('strong'); title.textContent = `${run.player} · ${run.category} · ${run.time}`;
    const details = document.createElement('span'); details.textContent = `${run.platform || 'PC'} · ${formatDate(run.date)}${showOwner ? ` · ${run.status}` : ` · ${run.email}`}`;
    const link = document.createElement('a'); link.href = safeVideoUrl(run.video); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'ABRIR VIDEO ↗'; link.className = 'video-link';
    info.append(title, details, link);
    card.append(createAvatar(run.player, run.avatarUrl), info);
    if (!showOwner && run.status === 'pending') {
      const actions = document.createElement('div'); actions.className = 'review-actions';
      [['approved', 'APROBAR'], ['rejected', 'RECHAZAR']].forEach(([status, label]) => {
        const button = document.createElement('button'); button.className = `button ${status === 'approved' ? 'button-primary' : 'button-outline'}`; button.textContent = label;
        button.addEventListener('click', () => reviewRun(run.id, status, button)); actions.append(button);
      });
      card.append(actions);
    }
    container.append(card);
  });
}

async function reviewRun(runId, status, button) {
  let reviewNote = '';
  if (status === 'rejected') {
    reviewNote = window.prompt('Indica el motivo del rechazo. Se enviará al jugador:')?.trim() || '';
    if (!reviewNote) { showToast('El rechazo se canceló: hace falta indicar el motivo'); return; }
    if (reviewNote.length > 300) { showToast('El motivo no puede superar 300 caracteres'); return; }
  }
  button.disabled = true;
  try {
    await apiPost({ action: 'reviewRun', idToken, runId, status, reviewNote });
    showToast(status === 'approved' ? 'Run aprobada' : 'Run rechazada');
    await loadPendingRuns();
    await loadLeaderboard();
    if (currentUser) loadNotifications();
  } catch (requestError) { showToast(requestError.message); button.disabled = false; }
}

render();
switchView(location.hash === '#rules' ? 'rules' : location.hash === '#leaderboard' ? 'leaderboard' : location.hash === '#resources' ? 'resources' : 'home');
loadLeaderboard();
initializeOneSignal();
restoreSession();
document.addEventListener('app-language-change', () => {
  renderGoogleSignInButton();
  render();
  if (activeView === 'resources' && resources.length) renderResources();
});
window.setInterval(() => {
  if (idToken) {
    loadNotifications(true);
    if (currentUser && currentUser.role === 'moderator') loadPendingRuns();
  }
  if (activeView === 'home') loadTwitchStreams(true);
}, 120000);
