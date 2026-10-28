const CONFIG = window.RUN_ARCHIVE_CONFIG || {};
const SCRIPT_URL = CONFIG.appsScriptUrl || '';
const GOOGLE_CLIENT_ID = CONFIG.googleClientId || '';
const SESSION_STORAGE_KEY = 'dino-crisis-google-session-v1';
const isGoogleConfigured = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('REPLACE_WITH_');
const DEMO_RUNS = [
  { id: 'demo-1', player: 'RaptorRunner', category: 'ANY%', time: '00:38:42', platform: 'PC', date: '2025-08-14', video: 'https://www.youtube.com/results?search_query=Dino+Crisis+speedrun', demo: true },
  { id: 'demo-2', player: 'Velocitron', category: 'ANY%', time: '00:41:09', platform: 'PC', date: '2025-07-29', video: 'https://www.youtube.com/results?search_query=Dino+Crisis+speedrun', demo: true },
  { id: 'demo-3', player: 'ReginaMain', category: 'ANY%', time: '00:44:27', platform: 'PC', date: '2025-06-02', video: 'https://www.youtube.com/results?search_query=Dino+Crisis+speedrun', demo: true },
  { id: 'demo-4', player: 'TacticalDino', category: 'BEST ENDING', time: '00:51:36', platform: 'PC', date: '2025-07-16', video: 'https://www.youtube.com/results?search_query=Dino+Crisis+speedrun', demo: true },
  { id: 'demo-5', player: 'RedUmbrella', category: 'BEST ENDING', time: '00:55:12', platform: 'PC', date: '2025-05-21', video: 'https://www.youtube.com/results?search_query=Dino+Crisis+speedrun', demo: true },
  { id: 'demo-6', player: 'SaveRoomZero', category: 'SEGMENTED%', time: '00:31:48', platform: 'PC', date: '2025-08-05', video: 'https://www.youtube.com/results?search_query=Dino+Crisis+speedrun', demo: true },
  { id: 'demo-7', player: 'DinoSlayer', category: 'SEGMENTED%', time: '00:35:03', platform: 'PC', date: '2025-07-11', video: 'https://www.youtube.com/results?search_query=Dino+Crisis+speedrun', demo: true },
];
const descriptions = {
  'ANY%': 'Finaliza el juego lo más rápido posible. Cualquier ending.',
  'BEST ENDING': 'Consigue el mejor final disponible, en el menor tiempo posible.',
  'SEGMENTED%': 'Run completada por segmentos. Se registra el tiempo total acumulado.',
};
let selectedCategory = 'ANY%';
let searchQuery = '';
let runs = [...DEMO_RUNS];
let currentUser = null;
let idToken = readStoredToken();
let googleButtonRendered = false;
const knownNotificationIds = new Set();
const tableBody = document.querySelector('#run-rows');
const emptyState = document.querySelector('#empty-state');
const dialog = document.querySelector('#submit-dialog');
const form = document.querySelector('#submit-form');
const profileDialog = document.querySelector('#profile-dialog');
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
dateField.max = new Date().toISOString().slice(0, 10);
dateField.value = dateField.max;
function secondsFromTime(value) {
  const parts = value.split(':').map(Number);
  return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
}
function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '').toUpperCase();
}
function render() {
  const filtered = runs.filter(run => run.category === selectedCategory && run.player.toLowerCase().includes(searchQuery));
  filtered.sort((a, b) => secondsFromTime(a.time) - secondsFromTime(b.time));
  document.querySelector('#category-description').textContent = descriptions[selectedCategory];
  document.querySelector('#entries-count').textContent = `${String(filtered.length).padStart(2, '0')} ${filtered.length === 1 ? 'RUN' : 'RUNS'}`;
  tableBody.replaceChildren();
  filtered.forEach((run, index) => {
    const row = document.createElement('tr');
    const rank = document.createElement('td');
    rank.className = `rank${index === 0 ? ' top-rank' : ''}`;
    rank.textContent = `#${String(index + 1).padStart(2, '0')}`;
    const player = document.createElement('td');
    const playerWrap = document.createElement('div'); playerWrap.className = 'player-cell';
    const avatar = createAvatar(run.player, run.avatarUrl);
    const name = document.createElement('span'); name.textContent = run.player;
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
document.querySelector('#search').addEventListener('input', event => { searchQuery = event.target.value.trim().toLowerCase(); render(); });
document.querySelector('#my-runs-button').addEventListener('click', loadMyRuns);
document.querySelector('#edit-profile-button').addEventListener('click', openEditProfile);
document.querySelector('#notifications-button').addEventListener('click', toggleNotifications);
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
  const save = avatarData => apiPost({ action: 'profile', idToken, nickname, avatarData });
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

async function loadLeaderboard() {
  const status = document.querySelector('#connection-status');
  if (!SCRIPT_URL) { status.textContent = 'CONFIGURA APPS SCRIPT · MOSTRANDO DATOS DE DEMOSTRACIÓN'; return; }
  try {
    const endpoint = new URL(SCRIPT_URL);
    endpoint.searchParams.set('action', 'leaderboard');
    const response = await fetch(endpoint, { method: 'GET', mode: 'cors', cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP error');
    const payload = await response.json();
    if (!Array.isArray(payload.runs)) throw new Error('El despliegue todavía no expone el leaderboard.');
    runs = payload.runs.map(run => ({ ...run, demo: false }));
    status.textContent = 'APPS SCRIPT · RUNS VERIFICADAS';
    render();
  } catch {
    status.textContent = 'APPS SCRIPT PENDIENTE DE ACTUALIZACIÓN · DATOS DE DEMOSTRACIÓN';
  }
}

window.renderGoogleSignInButton = renderGoogleSignInButton;
window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;
function renderGoogleSignInButton() {
  const notice = document.querySelector('#auth-config-notice');
  if (!isGoogleConfigured) { notice.hidden = false; return; }
  notice.hidden = true;
  if (googleButtonRendered || !window.google || !google.accounts || !google.accounts.id) return;
  google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredentialResponse, auto_select: false });
  google.accounts.id.renderButton(document.querySelector('#google-signin-button'), {
    theme: 'filled_black',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    width: 200,
    logo_alignment: 'left',
  });
  googleButtonRendered = true;
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
    document.querySelector('#account-box').hidden = true;
    document.querySelector('#google-signin-button').hidden = false;
    showToast(authError.message);
  }
}

function activateUser(user) {
  currentUser = user;
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
    document.querySelector('#auth-config-notice').textContent = 'INICIA SESIÓN CON GOOGLE';
    document.querySelector('#google-signin-button').hidden = false;
    renderGoogleSignInButton();
  }
}

function signOut() {
  idToken = null; currentUser = null;
  clearStoredToken();
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
    const state = document.createElement('span'); state.className = `notification-state ${item.type === 'approved' ? 'approved' : 'rejected'}`;
    state.textContent = item.type === 'approved' ? 'APROBADA' : 'RECHAZADA';
    const message = document.createElement('p'); message.textContent = item.message;
    const date = document.createElement('time'); date.textContent = item.date;
    card.append(state, message, date); notificationsList.append(card);
  });
}

async function toggleNotifications() {
  if (!idToken) return;
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
loadLeaderboard();
restoreSession();
window.setInterval(() => { if (idToken) loadNotifications(true); }, 60000);
