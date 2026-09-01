function cloneState(state) {
  return structuredClone(state);
}

function createAuditEntry(patientId, specialty, action, volunteerId, at) {
  return { patientId, specialty, action, volunteerId, at };
}

function getPatientBusySpecialty(state, patientId, excludedSpecialty = null) {
  const assignments = state.assignments[patientId] || {};
  return Object.entries(assignments).find(([specialty, assignment]) => (
    specialty !== excludedSpecialty
    && ['atDoor', 'inConsultation'].includes(assignment.status)
  ))?.[0] || null;
}

function ensureAssignment(state, patientId, specialty) {
  const assignment = state.assignments[patientId]?.[specialty];
  if (!assignment) {
    throw new Error(`Paciente ${patientId} não está na fila de ${specialty}.`);
  }
  return assignment;
}

export function buildQueueState(sheets, specialties) {
  const patients = {};
  const patientSpecialties = {};
  const assignments = {};

  for (const [specialty, rows] of Object.entries(sheets)) {
    if (!specialties[specialty]) {
      throw new Error(`Aba sem configuração de especialidade: ${specialty}.`);
    }

    for (const row of rows) {
      if (!row.patientId || !row.name) {
        throw new Error(`Linha inválida na aba ${specialty}: patientId e name são obrigatórios.`);
      }

      patients[row.patientId] ||= {
        patientId: row.patientId,
        name: row.name,
        triageAt: row.triageAt || '',
      };
      patientSpecialties[row.patientId] ||= [];
      assignments[row.patientId] ||= {};

      if (!assignments[row.patientId][specialty]) {
        patientSpecialties[row.patientId].push(specialty);
        assignments[row.patientId][specialty] = { status: 'waiting' };
      }
    }
  }

  return {
    specialties: structuredClone(specialties),
    patients,
    patientSpecialties,
    assignments,
    audit: [],
  };
}

export function getQueueView(state, specialty) {
  if (!state.specialties[specialty]) {
    throw new Error(`Especialidade desconhecida: ${specialty}.`);
  }

  const view = {
    available: [],
    atDoor: [],
    inConsultation: [],
    blocked: [],
    completed: [],
  };

  for (const [patientId, specialties] of Object.entries(state.patientSpecialties)) {
    if (!specialties.includes(specialty)) continue;

    const assignment = state.assignments[patientId][specialty];
    const patient = state.patients[patientId];
    const queuePatient = { patientId, name: patient.name, triageAt: patient.triageAt };

    if (assignment.status === 'completed') {
      view.completed.push(queuePatient);
      continue;
    }
    if (assignment.status === 'atDoor') {
      view.atDoor.push(queuePatient);
      continue;
    }
    if (assignment.status === 'inConsultation') {
      view.inConsultation.push(queuePatient);
      continue;
    }

    const busySpecialty = getPatientBusySpecialty(state, patientId, specialty);
    if (busySpecialty) {
      view.blocked.push({ ...queuePatient, busySpecialty });
    } else {
      view.available.push(queuePatient);
    }
  }

  return view;
}

export function movePatientToDoor(state, patientId, specialty, volunteerId, at) {
  const next = cloneState(state);
  const assignment = ensureAssignment(next, patientId, specialty);
  const queue = getQueueView(next, specialty);
  const capacity = next.specialties[specialty].doorCapacity;

  if (assignment.status !== 'waiting') {
    throw new Error('O paciente não está aguardando nesta especialidade.');
  }
  if (getPatientBusySpecialty(next, patientId, specialty)) {
    throw new Error('O paciente está ocupado em outra especialidade.');
  }
  if (queue.atDoor.length >= capacity) {
    throw new Error(`A porta de ${specialty} está lotada.`);
  }

  assignment.status = 'atDoor';
  next.audit.push(createAuditEntry(patientId, specialty, 'called_to_door', volunteerId, at));
  return next;
}

export function startConsultation(state, patientId, specialty, volunteerId, at) {
  const next = cloneState(state);
  const assignment = ensureAssignment(next, patientId, specialty);

  if (assignment.status !== 'atDoor') {
    throw new Error('O paciente precisa estar na porta antes de iniciar o atendimento.');
  }

  assignment.status = 'inConsultation';
  next.audit.push(createAuditEntry(patientId, specialty, 'consultation_started', volunteerId, at));
  return next;
}

export function releasePatient(state, patientId, specialty, volunteerId, at) {
  const next = cloneState(state);
  const assignment = ensureAssignment(next, patientId, specialty);

  if (!['atDoor', 'inConsultation'].includes(assignment.status)) {
    throw new Error('O paciente não está na porta nem em atendimento nesta especialidade.');
  }

  assignment.status = 'completed';
  next.audit.push(createAuditEntry(patientId, specialty, 'specialty_completed', volunteerId, at));
  return next;
}

export function updateSpecialtyColor(state, specialty, color, colorName) {
  if (!state.specialties[specialty]) {
    throw new Error(`Especialidade desconhecida: ${specialty}.`);
  }
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error('A cor precisa estar no formato hexadecimal #RRGGBB.');
  }

  const next = cloneState(state);
  next.specialties[specialty].color = color.toLowerCase();
  next.specialties[specialty].pulseLabel = `Pulseira ${String(colorName || '').trim() || color.toUpperCase()}`;
  next.audit.push(createAuditEntry('', specialty, 'pulse_color_changed', '', ''));
  return next;
}
