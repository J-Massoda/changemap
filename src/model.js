export const STORAGE_KEY = 'changemap-demo-v1';
export const clone = value => structuredClone(value);
const stamp = () => new Date().toISOString();
const id = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const seed = () => ({
  selected: 'admissions',
  changes: [{
    id: 'admissions', title: 'Admissions deadline extended', area: 'Education · Admissions',
    oldValue: 'Applications close 14 November', newValue: 'Applications close 28 November',
    effective: '2026-11-01', approver: 'Admissions Director', version: 1, state: 'active',
    touchpoints: [
      { id: 'web', name: 'Admissions landing page', type: 'Web page', owner: 'Web team', priority: 'High', status: 'verified', evidence: 'Reviewed published page against approved date', checkedBy: 'Admissions lead', checkedAt: '2026-10-20T10:00:00Z' },
      { id: 'form', name: 'Application form closing rule', type: 'Form', owner: 'Admissions ops', priority: 'Critical', status: 'updated', evidence: '', checkedBy: '', checkedAt: '' },
      { id: 'email', name: 'Application confirmation email', type: 'Email', owner: 'Communications', priority: 'High', status: 'pending', evidence: '', checkedBy: '', checkedAt: '' },
      { id: 'guide', name: 'Downloadable admissions guide', type: 'Document', owner: 'Admissions ops', priority: 'Medium', status: 'working', evidence: '', checkedBy: '', checkedAt: '' },
      { id: 'frontdesk', name: 'Front desk guidance', type: 'Team instruction', owner: 'Team lead', priority: 'High', status: 'pending', evidence: '', checkedBy: '', checkedAt: '' }
    ],
    history: [{ at: '2026-10-19T09:00:00Z', action: 'Decision approved', detail: 'Deadline extended to 28 November · v1' }]
  }]
});

export function selectedChange(state) { return state.changes.find(change => change.id === state.selected) || state.changes[0]; }
export function readiness(change) {
  const total = change.touchpoints.length;
  const verified = change.touchpoints.filter(item => item.status === 'verified').length;
  return { total, verified, remaining: total - verified, ready: total > 0 && total === verified && change.state === 'active' };
}
function update(state, changeId, fn) {
  const next = clone(state);
  const change = next.changes.find(item => item.id === changeId);
  if (!change || change.state !== 'active') throw new Error('Select an active change.');
  fn(change);
  return next;
}
function audit(change, action, detail) { change.history.unshift({ at: stamp(), action, detail }); }
const required = (value, label) => { if (!String(value || '').trim()) throw new Error(`${label} is required.`); return String(value).trim(); };

export function createChange(state, input) {
  const title = required(input.title, 'Change title');
  const oldValue = required(input.oldValue, 'Previous instruction');
  const newValue = required(input.newValue, 'New instruction');
  const effective = required(input.effective, 'Effective date');
  const approver = required(input.approver, 'Approver');
  if (oldValue === newValue) throw new Error('The new instruction must differ from the previous one.');
  const next = clone(state);
  const change = { id: id(), title, area: String(input.area || 'Operations').trim(), oldValue, newValue, effective, approver, version: 1, state: 'active', touchpoints: [], history: [] };
  audit(change, 'Decision created', `Effective ${effective} · v1`);
  next.changes.unshift(change);
  next.selected = change.id;
  return next;
}
export function addTouchpoint(state, changeId, input) {
  return update(state, changeId, change => {
    const name = required(input.name, 'Touchpoint name');
    const owner = required(input.owner, 'Owner');
    if (change.touchpoints.some(item => item.name.toLowerCase() === name.toLowerCase())) throw new Error('This touchpoint is already listed.');
    const priority = ['Critical', 'High', 'Medium', 'Low'].includes(input.priority) ? input.priority : 'Medium';
    change.touchpoints.push({ id: id(), name, type: input.type || 'Other', owner, priority, status: 'pending', evidence: '', checkedBy: '', checkedAt: '' });
    audit(change, 'Touchpoint mapped', `${name} · ${owner}`);
  });
}
export function setTouchpointStatus(state, changeId, touchpointId, status) {
  if (!['pending', 'working', 'updated'].includes(status)) throw new Error('Use verification to complete a touchpoint.');
  return update(state, changeId, change => {
    const item = change.touchpoints.find(point => point.id === touchpointId);
    if (!item) throw new Error('Touchpoint not found.');
    item.status = status;
    item.evidence = ''; item.checkedBy = ''; item.checkedAt = '';
    audit(change, 'Touchpoint moved', `${item.name} → ${status}`);
  });
}
export function verifyTouchpoint(state, changeId, touchpointId, input) {
  return update(state, changeId, change => {
    const item = change.touchpoints.find(point => point.id === touchpointId);
    if (!item) throw new Error('Touchpoint not found.');
    if (item.status !== 'updated') throw new Error('Mark this touchpoint updated before verifying it.');
    item.evidence = required(input.evidence, 'Verification note');
    item.checkedBy = required(input.checkedBy, 'Reviewer');
    item.checkedAt = stamp();
    item.status = 'verified';
    audit(change, 'Touchpoint verified', `${item.name} · checked by ${item.checkedBy}`);
  });
}
export function reviseChange(state, changeId, input) {
  return update(state, changeId, change => {
    const newValue = required(input.newValue, 'New instruction');
    const effective = required(input.effective, 'Effective date');
    if (newValue === change.newValue && effective === change.effective) throw new Error('Change the wording or effective date to create a revision.');
    change.oldValue = change.newValue;
    change.newValue = newValue;
    change.effective = effective;
    change.version += 1;
    for (const item of change.touchpoints) { item.status = 'pending'; item.evidence = ''; item.checkedBy = ''; item.checkedAt = ''; }
    audit(change, 'Decision revised', `All touchpoints need re-verification · v${change.version}`);
  });
}
export function withdrawChange(state, changeId, reason) {
  return update(state, changeId, change => {
    change.state = 'withdrawn';
    audit(change, 'Decision withdrawn', required(reason, 'Reason'));
  });
}
export function report(change) { return { exportedAt: stamp(), product: 'ChangeMap', change: clone(change), readiness: readiness(change), note: 'Fictional demonstration. Verification notes are user-entered; not independent proof of publication.' }; }
