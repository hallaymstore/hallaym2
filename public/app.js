const $ = selector => document.querySelector(selector);
const state = { projects: [], team: [], filter: 'Barchasi', query: '', admin: false };
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const safeUrl = (raw, media = false) => { try { if (media && (/^\/api\/media\/[0-9a-f]{24}$/.test(raw) || /^\/assets\/[a-z0-9-]+\.(webp|png|jpe?g)$/.test(raw))) return raw; const u = new URL(raw); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const theme = value => ['education', 'market', 'invite', 'studio', 'security', 'bot'].includes(value) ? value : 'education';
const cover = (project, detail = false) => {
  const image = safeUrl(project.coverUrl, true);
  return `<div class="project-cover ${theme(project.theme)}${detail ? ' detail-cover' : ''}">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(project.title)} loyihasi muqovasi" loading="lazy">` : `<div class="cover-art" aria-hidden="true"></div><span class="cover-symbol" aria-hidden="true">H✳</span><div class="cover-title">${escapeHtml(project.title)}<small>${escapeHtml(project.label || project.category)}</small></div>`}</div>`;
};
const itemId = item => String(item._id || item.slug || '');

async function loadData() {
  try {
    const [projects, team] = await Promise.all([fetch('/api/projects').then(r => { if (!r.ok) throw Error('Projects'); return r.json(); }), fetch('/api/team').then(r => { if (!r.ok) throw Error('Team'); return r.json(); })]);
    state.projects = projects; state.team = team;
    renderProjects(); renderTeam(); renderAdminLists();
  } catch {
    $('#project-grid').innerHTML = '<div class="empty-state">Loyihalarni yuklashda xatolik. Sahifani qayta ochib ko‘ring.</div>';
  }
}
function renderProjects() {
  const list = state.projects.filter(p => (state.filter === 'Barchasi' || p.category === state.filter) && `${p.title} ${p.label} ${p.summary} ${p.audience} ${p.stack?.join(' ')}`.toLocaleLowerCase('uz').includes(state.query));
  $('#project-grid').innerHTML = list.length ? list.map(p => `<article class="project-card"><button type="button" class="project-open" data-project="${escapeHtml(itemId(p))}" aria-label="${escapeHtml(p.title)} loyiha tafsilotlari">${cover(p)}<div class="project-card-body"><div class="project-meta"><span>${escapeHtml(p.category)}</span><span>HALLAYM STUDIO</span></div><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.summary)}</p><div class="card-bottom"><span>${escapeHtml(p.label || 'Raqamli mahsulot')}</span><span class="card-view">Batafsil</span></div></div></button></article>`).join('') : '<div class="empty-state">Bu turda hozircha loyiha topilmadi. Boshqa tur yoki qidiruvni sinab ko‘ring.</div>';
}
function renderTeam() {
  $('#team-grid').innerHTML = state.team.length ? state.team.map(p => {
    const photo = safeUrl(p.photoUrl, true), profile = safeUrl(p.profileUrl);
    return `<article class="team-card"><div class="team-avatar">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(p.name)} rasmi" loading="lazy">` : escapeHtml(p.initials || p.name.split(/\s+/).map(w => w[0]).slice(0,2).join(''))}</div><div><h3>${escapeHtml(p.name)}</h3><p class="team-role">${escapeHtml(p.role)}</p><p class="team-bio">${escapeHtml(p.bio)}</p>${profile ? `<a href="${escapeHtml(profile)}" target="_blank" rel="noopener noreferrer">Profilni ko‘rish</a>` : ''}</div></article>`;
  }).join('') : '<p class="empty-state">Jamoa profillari tez orada qo‘shiladi.</p>';
}
function openProject(id) {
  const p = state.projects.find(item => itemId(item) === id);
  if (!p) return;
  const demo = safeUrl(p.demoUrl), source = safeUrl(p.sourceUrl);
  $('#project-detail').innerHTML = `${cover(p, true)}<div class="detail-body"><span class="detail-eyebrow">${escapeHtml(p.category)} / ${escapeHtml(p.label)}</span><h2>${escapeHtml(p.title)}</h2><p class="detail-summary">${escapeHtml(p.summary)}</p>${p.description ? `<p class="detail-description">${escapeHtml(p.description)}</p>` : ''}<dl class="detail-facts"><div><dt>Kimlar tomonidan</dt><dd>${escapeHtml(p.authors || 'Ma’lumot kiritilmagan')}</dd></div><div><dt>Kimlar uchun</dt><dd>${escapeHtml(p.audience || 'Ma’lumot kiritilmagan')}</dd></div></dl><div class="stack-chips">${(p.stack || []).map(s => `<span>${escapeHtml(s)}</span>`).join('')}</div><div class="detail-actions">${demo ? `<a class="button button-primary" href="${escapeHtml(demo)}" target="_blank" rel="noopener noreferrer">Loyihani ochish ${icon('external')}</a>` : ''}${source ? `<a class="button button-ghost" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">Kod manbasi ${icon('code')}</a>` : ''}</div></div>`;
  $('#project-dialog').showModal();
}

function message(text, error = false) { const el = $('#admin-message'); el.textContent = text || ''; el.classList.toggle('error', error); }
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'X-Requested-With': 'hallaym-admin', ...(options.headers || {}) } });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'So‘rov bajarilmadi.');
  return data;
}
async function openAdmin() {
  $('#admin-dialog').showModal();
  message('');
  try {
    const session = await fetch('/api/admin/session').then(r => r.json());
    state.admin = Boolean(session.authenticated && session.editable);
    $('#login-form').hidden = state.admin;
    $('#admin-panel').hidden = !state.admin;
    if (!session.editable) message('Tahrirlash uchun serverda MongoDB va admin paroli sozlanishi kerak.', true);
    if (state.admin) renderAdminLists();
  } catch { message('Boshqaruv holatini tekshirib bo‘lmadi.', true); }
}
function renderAdminLists() {
  if (!state.admin) return;
  $('#admin-project-list').innerHTML = state.projects.map(p => `<div class="admin-item"><span>${escapeHtml(p.title)} · ${escapeHtml(p.category)}</span><div><button type="button" data-edit-project="${escapeHtml(itemId(p))}">Tahrirlash</button><button type="button" class="delete" data-delete-project="${escapeHtml(itemId(p))}">O‘chirish</button></div></div>`).join('');
  $('#admin-team-list').innerHTML = state.team.map(p => `<div class="admin-item"><span>${escapeHtml(p.name)} · ${escapeHtml(p.role)}</span><div><button type="button" data-edit-team="${escapeHtml(itemId(p))}">Tahrirlash</button><button type="button" class="delete" data-delete-team="${escapeHtml(itemId(p))}">O‘chirish</button></div></div>`).join('');
}
function setFields(form, item, keys) { for (const key of keys) { const field = form.elements.namedItem(key); if (field) field.value = key === 'stack' ? (item.stack || []).join(', ') : item[key] ?? ''; } }
function resetProject() { $('#project-form').reset(); $('#project-form').elements.namedItem('id').value = ''; $('#cover-file').value = ''; $('#project-form-title').textContent = 'Yangi loyiha'; }
function resetTeam() { $('#team-form').reset(); $('#team-form').elements.namedItem('id').value = ''; $('#team-file').value = ''; $('#team-form-title').textContent = 'Jamoa a’zosi'; }
async function uploadImage(file) { const data = new FormData(); data.append('image', file); const result = await api('/api/admin/media', { method: 'POST', body: data }); return result.url; }
async function saveProject(event) {
  event.preventDefault(); const form = event.currentTarget; const submit = form.querySelector('[type=submit]'); submit.disabled = true; message('Saqlanmoqda…');
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const id = data.id; delete data.id;
    data.featured = form.elements.namedItem('featured').checked;
    if ($('#cover-file').files[0]) data.coverUrl = await uploadImage($('#cover-file').files[0]);
    await api(id ? `/api/admin/projects/${id}` : '/api/admin/projects', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    resetProject(); await loadData(); message('Loyiha saqlandi.');
  } catch (error) { message(error.message, true); } finally { submit.disabled = false; }
}
async function saveTeam(event) {
  event.preventDefault(); const form = event.currentTarget; const submit = form.querySelector('[type=submit]'); submit.disabled = true; message('Saqlanmoqda…');
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const id = data.id; delete data.id;
    if ($('#team-file').files[0]) data.photoUrl = await uploadImage($('#team-file').files[0]);
    await api(id ? `/api/admin/team/${id}` : '/api/admin/team', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    resetTeam(); await loadData(); message('Jamoa profili saqlandi.');
  } catch (error) { message(error.message, true); } finally { submit.disabled = false; }
}

document.addEventListener('click', async event => {
  const close = event.target.closest('[data-close]');
  if (close) { document.getElementById(close.dataset.close).close(); return; }
  const card = event.target.closest('[data-project]');
  if (card) { openProject(card.dataset.project); return; }
  const filter = event.target.closest('[data-filter]');
  if (filter) { state.filter = filter.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('active', b === filter); b.setAttribute('aria-pressed', b === filter ? 'true' : 'false'); }); renderProjects(); return; }
  const tab = event.target.closest('[data-admin-tab]');
  if (tab) { document.querySelectorAll('[data-admin-tab]').forEach(b => b.classList.toggle('active', b === tab)); $('#admin-projects').hidden = tab.dataset.adminTab !== 'projects'; $('#admin-team').hidden = tab.dataset.adminTab !== 'team'; message(''); return; }
  const editProject = event.target.closest('[data-edit-project]');
  if (editProject) { const p = state.projects.find(x => itemId(x) === editProject.dataset.editProject); if (!p) return; const form = $('#project-form'); setFields(form, p, ['title', 'category', 'label', 'theme', 'summary', 'description', 'authors', 'audience', 'stack', 'demoUrl', 'sourceUrl', 'coverUrl']); form.elements.namedItem('id').value = itemId(p); form.elements.namedItem('featured').checked = !!p.featured; $('#project-form-title').textContent = 'Loyihani tahrirlash'; form.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
  const editTeam = event.target.closest('[data-edit-team]');
  if (editTeam) { const p = state.team.find(x => itemId(x) === editTeam.dataset.editTeam); if (!p) return; const form = $('#team-form'); setFields(form, p, ['name', 'role', 'bio', 'profileUrl', 'photoUrl']); form.elements.namedItem('id').value = itemId(p); $('#team-form-title').textContent = 'Jamoa a’zosini tahrirlash'; form.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
  const del = event.target.closest('[data-delete-project],[data-delete-team]');
  if (del) { const isTeam = Boolean(del.dataset.deleteTeam); const id = isTeam ? del.dataset.deleteTeam : del.dataset.deleteProject; const item = (isTeam ? state.team : state.projects).find(x => itemId(x) === id); if (!item || !confirm(`“${item.title || item.name}” o‘chirilsinmi?`)) return; try { await api(`/api/admin/${isTeam ? 'team' : 'projects'}/${id}`, { method: 'DELETE' }); await loadData(); message('O‘chirildi.'); } catch (error) { message(error.message, true); } }
});
$('#project-search').addEventListener('input', event => { state.query = event.target.value.trim().toLocaleLowerCase('uz'); renderProjects(); });
$('#open-admin').addEventListener('click', openAdmin);
$('#project-reset').addEventListener('click', resetProject);
$('#team-reset').addEventListener('click', resetTeam);
$('#project-form').addEventListener('submit', saveProject);
$('#team-form').addEventListener('submit', saveTeam);
$('#login-form').addEventListener('submit', async event => { event.preventDefault(); try { await api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: event.currentTarget.elements.namedItem('password').value }) }); event.currentTarget.reset(); state.admin = true; $('#login-form').hidden = true; $('#admin-panel').hidden = false; renderAdminLists(); message('Xush kelibsiz.'); } catch (error) { message(error.message, true); } });
$('#logout-button').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }).catch(() => {}); state.admin = false; $('#admin-panel').hidden = true; $('#login-form').hidden = false; message('Chiqildi.'); });
for (const dlg of document.querySelectorAll('dialog')) dlg.addEventListener('click', event => { if (event.target === dlg) dlg.close(); });
$('#year').textContent = new Date().getFullYear();
if ('IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); reveal.unobserve(e.target); } }); }, { threshold: .08 });
  document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));
  const nav = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) document.querySelectorAll('.mobile-nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === e.target.id)); }); }, { rootMargin: '-25% 0px -62% 0px' });
  ['top', 'loyihalar', 'xizmatlar', 'jamoa', 'aloqa'].forEach(id => nav.observe(document.getElementById(id)));
} else document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
loadData();
