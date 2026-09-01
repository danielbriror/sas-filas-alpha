import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildQueueState,
  getQueueView,
  movePatientToDoor,
  startConsultation,
  releasePatient,
  updateSpecialtyColor,
} from '../src/queue-engine.js';

const genericSheets = {
  Oftalmologia: [
    { patientId: 'SAS-001', name: 'Ana Lima', triageAt: '08:05' },
    { patientId: 'SAS-002', name: 'Bruno Silva', triageAt: '08:08' },
  ],
  Dermatologia: [
    { patientId: 'SAS-001', name: 'Ana Lima', triageAt: '08:05' },
    { patientId: 'SAS-003', name: 'Carla Souza', triageAt: '08:10' },
  ],
};

const specialties = {
  Oftalmologia: { color: '#2563eb', doorCapacity: 2 },
  Dermatologia: { color: '#f97316', doorCapacity: 1 },
};

test('cria uma fila por aba e mantém o mesmo paciente nas especialidades pendentes', () => {
  const state = buildQueueState(genericSheets, specialties);

  assert.deepEqual(state.patientSpecialties['SAS-001'], ['Oftalmologia', 'Dermatologia']);
  assert.equal(getQueueView(state, 'Oftalmologia').available.length, 2);
  assert.equal(getQueueView(state, 'Dermatologia').available.length, 2);
});

test('reservar paciente para a porta bloqueia o mesmo paciente nas outras especialidades', () => {
  let state = buildQueueState(genericSheets, specialties);
  state = movePatientToDoor(state, 'SAS-001', 'Oftalmologia', 'voluntario-1', '08:20');

  const eyeQueue = getQueueView(state, 'Oftalmologia');
  const dermQueue = getQueueView(state, 'Dermatologia');

  assert.equal(eyeQueue.atDoor[0].patientId, 'SAS-001');
  assert.equal(dermQueue.blocked[0].patientId, 'SAS-001');
  assert.equal(dermQueue.blocked[0].busySpecialty, 'Oftalmologia');
});

test('não permite ultrapassar a capacidade da porta de uma especialidade', () => {
  let state = buildQueueState(genericSheets, specialties);
  state = movePatientToDoor(state, 'SAS-003', 'Dermatologia', 'voluntario-2', '08:21');

  assert.throws(
    () => movePatientToDoor(state, 'SAS-001', 'Dermatologia', 'voluntario-2', '08:22'),
    /porta.*lotada/i,
  );
});

test('concluir consulta libera o paciente para as outras especialidades pendentes', () => {
  let state = buildQueueState(genericSheets, specialties);
  state = movePatientToDoor(state, 'SAS-001', 'Oftalmologia', 'voluntario-1', '08:20');
  state = startConsultation(state, 'SAS-001', 'Oftalmologia', 'voluntario-1', '08:25');
  state = releasePatient(state, 'SAS-001', 'Oftalmologia', 'voluntario-1', '08:35');

  const dermQueue = getQueueView(state, 'Dermatologia');
  const eyeQueue = getQueueView(state, 'Oftalmologia');

  assert.equal(eyeQueue.completed[0].patientId, 'SAS-001');
  assert.equal(dermQueue.available[0].patientId, 'SAS-001');
});

test('permite trocar a cor da especialidade sem alterar pacientes ou estados da fila', () => {
  const initial = buildQueueState(genericSheets, specialties);
  const changed = updateSpecialtyColor(initial, 'Oftalmologia', '#dc2626', 'Vermelha');

  assert.equal(changed.specialties.Oftalmologia.color, '#dc2626');
  assert.equal(changed.specialties.Oftalmologia.pulseLabel, 'Pulseira Vermelha');
  assert.equal(changed.assignments['SAS-001'].Oftalmologia.status, 'waiting');
  assert.equal(initial.specialties.Oftalmologia.color, '#2563eb');
});
