const CONFIG = window.RUN_ARCHIVE_CONFIG || {};
const SCRIPT_URL = CONFIG.appsScriptUrl || '';
const GOOGLE_CLIENT_ID = CONFIG.googleClientId || '';
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
let idToken = null;
let googleButtonRendered = false;
const tableBody = document.querySelector('#run-rows');
const emptyState = document.querySelector('#empty-state');
const dialog = document.querySelector('#submit-dialog');
const form = document.querySelector('#submit-form');
const error = document.querySelector('#form-error');
const toast = document.querySelector('#toast');
const dateField = form.elements.date;
const moderationPanel = document.querySelector('#moderation-panel');
const pendingRuns = document.querySelector('#pending-runs');
const myRunsSection = document.querySelector('#my-runs-section');
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
    const avatar = document.createElement('span'); avatar.className = 'player-avatar'; avatar.textContent = initials(run.player);
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
function safeVideoUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : '#'; }
  catch { return '#'; }
}
function openDialog(category = selectedCategory) {
  if (!idToken) { showToast('Inicia sesión con Google antes de enviar una run'); return; }
  form.elements.category.value = category;
  error.hidden = true;
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
}
function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3600);
}
document.querySelectorAll('[data-open-submit]').forEach(button => button.addEventListener('click', () => openDialog()));
document.querySelector('.close-button').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
document.querySelectorAll('.category-tab').forEach(tab => tab.addEventListener('click', () => { selectedCategory = tab.dataset.category; render(); }));
document.querySelector('#search').addEventListener('input', event => { searchQuery = event.target.value.trim().toLowerCase(); render(); });
document.querySelector('#my-runs-button').addEventListener('click', loadMyRuns);
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
  const timePattern = /^(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)$/;
  if (!timePattern.test(data.time)) { error.textContent = 'Usa el formato HH:MM:SS o MM:SS (por ejemplo, 00:42:18).'; error.hidden = false; form.elements.time.focus(); return; }
  const url = safeVideoUrl(data.video);
  if (url === '#') { error.textContent = 'Introduce un enlace de video válido que empiece con http:// o https://.'; error.hidden = false; form.elements.video.focus(); return; }
  const submission = { action: 'submitRun', idToken, player: data.player, category: data.category, time: data.time, platform: 'PC', date: data.date, video: url, notes: data.notes };
  submitRun(submission);
});

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
  if (!result.ok) throw new Error(result.error || 'La solicitud no pudo completarse.');
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
  google.accounts.id.renderButton(document.querySelector('#google-signin-button'), { theme: 'filled_black', size: 'small', shape: 'rectangular', text: 'signin_with', width: 170 });
  googleButtonRendered = true;
}

async function handleGoogleCredentialResponse(response) {
  idToken = response.credential;
  try {
    const result = await apiPost({ action: 'profile', idToken });
    currentUser = result.user;
    document.querySelector('#account-name').textContent = `${currentUser.name}${currentUser.role === 'moderator' ? ' · MOD' : ''}`;
    document.querySelector('#account-box').hidden = false;
    document.querySelector('#google-signin-button').hidden = true;
    document.querySelector('#auth-config-notice').hidden = true;
    showToast(`Sesión iniciada: ${currentUser.name}`);
    if (currentUser.role === 'moderator') { moderationPanel.hidden = false; loadPendingRuns(); }
  } catch (authError) {
    idToken = null; currentUser = null;
    showToast(authError.message);
  }
}

function signOut() {
  idToken = null; currentUser = null;
  document.querySelector('#account-box').hidden = true;
  document.querySelector('#google-signin-button').hidden = false;
  moderationPanel.hidden = true;
  myRunsSection.hidden = true;
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
    card.append(info);
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
  button.disabled = true;
  try {
    await apiPost({ action: 'reviewRun', idToken, runId, status });
    showToast(status === 'approved' ? 'Run aprobada' : 'Run rechazada');
    await loadPendingRuns();
    await loadLeaderboard();
  } catch (requestError) { showToast(requestError.message); button.disabled = false; }
}

render();
loadLeaderboard();
renderGoogleSignInButton();
