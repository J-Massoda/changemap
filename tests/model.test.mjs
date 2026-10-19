import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, readiness, createChange, addTouchpoint, setTouchpointStatus, verifyTouchpoint, reviseChange, withdrawChange } from '../src/model.js';
test('a new decision must be different and mapped before readiness', () => {
  assert.throws(() => createChange(seed(), { title:'x', oldValue:'a', newValue:'a', effective:'2026-10-01', approver:'A' }));
  const state = createChange(seed(), {title:'New rule', oldValue:'A', newValue:'B', effective:'2026-11-01', approver:'Lead'});
  assert.equal(readiness(state.changes[0]).ready, false);
  assert.equal(state.changes[0].history.length, 1);
});
test('verification requires an update, evidence and a reviewer', () => {
  const first = seed();
  assert.throws(() => verifyTouchpoint(first, 'admissions', 'email', {checkedBy:'A', evidence:'Checked'}));
  const updated = setTouchpointStatus(first, 'admissions', 'email', 'updated');
  assert.throws(() => verifyTouchpoint(updated, 'admissions', 'email', {checkedBy:'', evidence:'Checked'}));
  const checked = verifyTouchpoint(updated, 'admissions', 'email', {checkedBy:'A', evidence:'Sent test email'});
  assert.equal(checked.changes[0].touchpoints.find(p => p.id === 'email').status, 'verified');
  assert.equal(first.changes[0].touchpoints.find(p => p.id === 'email').status, 'pending');
});
test('revision invalidates prior verification and preserves audit; withdrawal blocks edits', () => {
  let state = seed();
  state = addTouchpoint(state, 'admissions', {name:'Partner portal', owner:'Support'});
  state = reviseChange(state, 'admissions', {newValue:'Applications close 30 November', effective:'2026-11-01'});
  assert.equal(readiness(state.changes[0]).verified, 0);
  assert.equal(state.changes[0].version, 2);
  state = withdrawChange(state, 'admissions', 'Policy superseded');
  assert.equal(readiness(state.changes[0]).ready, false);
  assert.throws(() => addTouchpoint(state, 'admissions', {name:'X', owner:'Y'}));
});
