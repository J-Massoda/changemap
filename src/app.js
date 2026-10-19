import { STORAGE_KEY, seed, selectedChange, readiness, createChange, addTouchpoint, setTouchpointStatus, verifyTouchpoint, reviseChange, withdrawChange, report } from './model.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const titleCase = text => text.replace(/^./, char => char.toUpperCase());
const persisted = (() => { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(value?.changes) && value.changes.length ? value : seed(); } catch { return seed(); } })();
let state = persisted;
let activeTab = 'map';
let selectedPoint = null;
const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 3500); }
function mutate(fn) { try { state = fn(); persist(); render(); return true; } catch (error) { toast(error.message); return false; } }
function download(name, value) { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 500); }
function modal(title, content, action) {
  $('#modal-content').innerHTML = `<header class="modal-heading"><div><span class="eyebrow">CHANGEMAP / ACTION</span><h2>${esc(title)}</h2></div><button type="button" class="close" data-close aria-label="Close">×</button></header>${content}<footer class="modal-footer"><button type="button" class="secondary" data-close>Cancel</button><button class="primary" type="submit">${esc(action)}</button></footer>`;
  $('#modal-form').onsubmit = event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); if (typeof modal.onSubmit === 'function' && modal.onSubmit(values) !== false) $('#modal').close(); };
  $('#modal').showModal();
}
const input = (label, name, value = '', type = 'text', required = true) => `<label class="field"><span>${esc(label)}</span><input name="${name}" type="${type}" value="${esc(value)}" ${required ? 'required' : ''}></label>`;
const area = (label, name, value = '') => `<label class="field"><span>${esc(label)}</span><textarea name="${name}" rows="3" required>${esc(value)}</textarea></label>`;
function render() {
  const change = selectedChange(state);
  if (!change) return;
  const progress = readiness(change);
  $('#change-count').textContent = String(state.changes.length).padStart(2, '0');
  $('#change-list').innerHTML = state.changes.map(item => `<button class="change-link ${change.id === item.id ? 'active' : ''}" data-select="${esc(item.id)}"><span class="change-link-type">${esc(item.area)}</span><strong>${esc(item.title)}</strong><small>${item.state === 'withdrawn' ? 'Withdrawn' : `${readiness(item).verified}/${item.touchpoints.length} verified`}</small></button>`).join('');
  $('#app').innerHTML = `
    <section class="hero"><div><span class="eyebrow dark">WORKSPACE / ${esc(change.area.toUpperCase())}</span><h1>Every change<br>has a <em>footprint.</em></h1><p>Follow one approved decision through every place people may still encounter the old instruction.</p></div><div class="hero-stamp"><span>DECISION ${String(change.version).padStart(2,'0')}</span><strong>${progress.ready ? 'READY' : change.state === 'withdrawn' ? 'WITHDRAWN' : 'IN MOTION'}</strong><small>${progress.verified} of ${progress.total} touchpoints verified</small></div></section>
    <section class="workspace-head"><div><span class="eyebrow dark">SELECTED CHANGE <span class="slash">/</span> VERSION ${change.version}</span><h2>${esc(change.title)}</h2><p class="subtle">Effective ${esc(change.effective)} · Approved by ${esc(change.approver)} ${change.state === 'withdrawn' ? '· Withdrawn' : ''}</p></div><div class="head-actions">${change.state === 'active' ? '<button class="outline" data-open="revise">Revise decision</button><button class="outline" data-open="withdraw">Withdraw</button>' : ''}</div></section>
    <section class="decision"><div><span class="eyebrow">PREVIOUS INSTRUCTION</span><p>${esc(change.oldValue)}</p></div><span class="decision-arrow">→</span><div><span class="eyebrow">APPROVED INSTRUCTION</span><p>${esc(change.newValue)}</p></div></section>
    <section class="metrics"><div><span class="eyebrow dark">MAPPED SURFACES</span><strong>${progress.total}</strong><small>Places affected by this decision</small></div><div><span class="eyebrow dark">CONFIRMED</span><strong>${progress.verified}</strong><small>Updated and independently checked</small></div><div><span class="eyebrow dark">STILL EXPOSED</span><strong>${progress.remaining}</strong><small>Not yet verified against this version</small></div></section>
    <nav class="tabs" aria-label="Workspace views"><button data-tab="map" class="${activeTab === 'map' ? 'current' : ''}">Impact map</button><button data-tab="history" class="${activeTab === 'history' ? 'current' : ''}">Decision history <span>${change.history.length}</span></button></nav>
    ${activeTab === 'map' ? mapView(change, progress) : historyView(change)}
    <footer class="page-note">INTERACTIVE DEMO · All organizations and records are fictional. A check is a reviewer’s recorded observation, not independent proof that every customer saw an update.</footer>`;
}
function mapView(change, progress) {
  const point = change.touchpoints.find(item => item.id === selectedPoint) || change.touchpoints[0];
  if (point) selectedPoint = point.id;
  return `<section class="map-header"><div><span class="eyebrow dark">THE CHANGE FOOTPRINT</span><h3>Where the old story may still live.</h3></div>${change.state === 'active' ? '<button class="primary" data-open="touchpoint">＋ Map touchpoint</button>' : ''}</section>
  <div class="work-grid"><div class="touchpoints">${change.touchpoints.length ? change.touchpoints.map((item, index) => `<button class="touchpoint ${point?.id === item.id ? 'chosen' : ''}" data-point="${esc(item.id)}"><span class="point-number">${String(index+1).padStart(2,'0')}</span><span class="point-body"><small>${esc(item.type)} <span class="bullet">●</span> ${esc(item.priority)} priority</small><strong>${esc(item.name)}</strong><em>Owner: ${esc(item.owner)}</em></span><span class="pill ${item.status}">${esc(titleCase(item.status))}</span></button>`).join('') : '<div class="empty"><strong>No touchpoints mapped yet.</strong><p>Add the first page, form, message or team instruction affected by this decision.</p></div>'}</div>
  <aside class="detail">${point ? detail(change, point) : '<span class="eyebrow">DETAIL PANEL</span><p>Map a touchpoint to begin reviewing the footprint.</p>'}</aside></div>
  <div class="readiness ${progress.ready ? 'is-ready' : ''}"><span class="readiness-icon">${progress.ready ? '✓' : '!'}</span><div><strong>${progress.ready ? 'All mapped touchpoints verified' : `${progress.remaining} touchpoint${progress.remaining === 1 ? '' : 's'} still need verification`}</strong><p>${progress.ready ? 'This recorded change is ready for a final human review. It does not prove external channels are universally correct.' : 'An update is not complete until someone checks the actual customer or staff experience.'}</p></div></div>`;
}
function detail(change, item) { return `<span class="eyebrow dark">TOUCHPOINT / ${esc(item.type.toUpperCase())}</span><h3>${esc(item.name)}</h3><span class="pill ${item.status}">${esc(titleCase(item.status))}</span><div class="detail-row"><span>Responsible</span><strong>${esc(item.owner)}</strong></div><div class="detail-row"><span>Priority</span><strong>${esc(item.priority)}</strong></div><div class="detail-row"><span>Current state</span><strong>${esc(titleCase(item.status))}</strong></div>${item.status === 'verified' ? `<div class="evidence"><span class="eyebrow dark">VERIFICATION NOTE</span><p>${esc(item.evidence)}</p><small>${esc(item.checkedBy)} · ${new Date(item.checkedAt).toLocaleString()}</small></div>` : ''}<div class="detail-actions">${change.state === 'active' ? `<label class="field"><span>Update progress</span><select data-status="${esc(item.id)}"><option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Needs update</option><option value="working" ${item.status === 'working' ? 'selected' : ''}>In progress</option><option value="updated" ${item.status === 'updated' ? 'selected' : ''}>Updated · needs check</option></select></label>${item.status === 'updated' ? `<button class="primary full" data-verify="${esc(item.id)}">Verify actual experience →</button>` : ''}${item.status === 'verified' ? `<button class="outline full" data-reopen="${esc(item.id)}">Reopen for review</button>` : ''}` : ''}</div>`; }
function historyView(change) { return `<section class="history"><span class="eyebrow dark">AUDITABLE SEQUENCE</span><h3>The decision trail.</h3>${change.history.map(item => `<article class="history-item"><span>${new Date(item.at).toLocaleString()}</span><div><strong>${esc(item.action)}</strong><p>${esc(item.detail)}</p></div></article>`).join('')}</section>`; }

document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.matches('[data-close]')) { $('#modal').close(); return; }
  if (button.dataset.select) { state.selected = button.dataset.select; selectedPoint = null; persist(); render(); return; }
  if (button.dataset.tab) { activeTab = button.dataset.tab; render(); return; }
  if (button.dataset.point) { selectedPoint = button.dataset.point; render(); return; }
  const change = selectedChange(state);
  if (button.dataset.verify) {
    modal('Check the real touchpoint', `${input('Reviewer name','checkedBy')}${area('What did you inspect? Record the observed result.','evidence')}<p class="form-note">A note records the reviewer’s check; it cannot prove what every customer saw.</p>`, 'Record verification');
    modal.onSubmit = data => mutate(() => verifyTouchpoint(state, change.id, button.dataset.verify, data)); return;
  }
  if (button.dataset.reopen) { mutate(() => setTouchpointStatus(state, change.id, button.dataset.reopen, 'working')); return; }
  if (!button.dataset.open) return;
  switch (button.dataset.open) {
    case 'create': modal('Create a change', `${input('Change title','title')}${input('Area / team','area','Operations')}${area('Previous instruction','oldValue')}${area('Approved new instruction','newValue')}${input('Effective date','effective','','date')}${input('Approver','approver')}`, 'Create decision'); modal.onSubmit = data => { const success = mutate(() => createChange(state, data)); if (success) selectedPoint = null; return success; }; break;
    case 'touchpoint': modal('Map an affected place', `${input('Page, form, message or instruction','name')}${input('Owner','owner')}<div class="form-row"><label class="field"><span>Type</span><select name="type"><option>Web page</option><option>Form</option><option>Email</option><option>Document</option><option>Team instruction</option><option>Other</option></select></label><label class="field"><span>Priority</span><select name="priority"><option>High</option><option>Critical</option><option>Medium</option><option>Low</option></select></label></div>`, 'Map touchpoint'); modal.onSubmit = data => mutate(() => addTouchpoint(state, change.id, data)); break;
    case 'revise': modal('Revise the decision', `<p class="form-note">A revision reopens every mapped touchpoint. Earlier verification cannot silently apply to new wording.</p>${area('New approved instruction','newValue',change.newValue)}${input('Effective date','effective',change.effective,'date')}`, 'Create revision'); modal.onSubmit = data => mutate(() => reviseChange(state, change.id, data)); break;
    case 'withdraw': modal('Withdraw this decision', `<p class="form-note">This preserves the history and stops further progress on the change.</p>${area('Reason for withdrawal','reason')}`, 'Withdraw decision'); modal.onSubmit = data => mutate(() => withdrawChange(state, change.id, data.reason)); break;
  }
});
document.addEventListener('change', event => { const select = event.target.closest('[data-status]'); if (select) mutate(() => setTouchpointStatus(state, selectedChange(state).id, select.dataset.status, select.value)); });
$('#reset-button').addEventListener('click', () => { if (!confirm('Reset the fictional workspace and remove your local changes?')) return; state = seed(); activeTab = 'map'; selectedPoint = null; persist(); render(); toast('Fictional demo restored.'); });
$('#export-button').addEventListener('click', () => download(`changemap-${selectedChange(state).id}-report.json`, report(selectedChange(state))));
render();
