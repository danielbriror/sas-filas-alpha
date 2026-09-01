import {
  buildQueueState,
  getQueueView,
  movePatientToDoor,
  startConsultation,
  releasePatient,
  updateSpecialtyColor,
} from './queue-engine.js';
import { GENERIC_SHEETS, SPECIALTIES } from './mock-planilha.js';

const STORAGE_KEY = 'sas-filas-alpha-state-v1';
const queueGrid = document.querySelector('#queueGrid');
const alertBox = document.querySelector('#alert');
const lastAction = document.querySelector('#lastAction');
const volunteerInput = document.querySelector('#volunteerName');

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : buildQueueState(GENERIC_SHEETS, SPECIALTIES);
  } catch {
    return buildQueueState(GENERIC_SHEETS, SPECIALTIES);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nowLabel() {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function volunteerName() {
  return volunteerInput.value.trim() || 'Volante Alfa';
}

function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = value;
  return element.innerHTML;
}

function patientCard(patient, kind, specialty) {
  const classes = {
    available: '',
    atDoor: 'door-patient',
    inConsultation: 'consult-patient',
    blocked: 'blocked-patient',
    completed: 'done-patient',
  };

  let content = `
    <article class="patient ${classes[kind]}">
      <div class="patient-row">
        <div>
          <div class="patient-name">${escapeHtml(patient.name)}</div>
          <div class="patient-id">${escapeHtml(patient.patientId)} · Triagem ${escapeHtml(patient.triageAt || '—')}</div>
        </div>
      </div>`;

  if (kind === 'available') {
    content += `<button class="action-button patient-action" data-action="door" data-patient="${escapeHtml(patient.patientId)}" data-specialty="${escapeHtml(specialty)}">Chamar para porta</button>`;
  }
  if (kind === 'atDoor') {
    content += `<p class="patient-note">Reservado para ${escapeHtml(specialty)}. Bloqueado nas outras filas.</p>`;
    content += `<button class="action-button patient-action door-action" data-action="start" data-patient="${escapeHtml(patient.patientId)}" data-specialty="${escapeHtml(specialty)}">Iniciar atendimento</button>`;
  }
  if (kind === 'inConsultation') {
    content += `<p class="patient-note">Em atendimento. As demais filas continuam bloqueadas.</p>`;
    content += `<button class="action-button patient-action consult-action" data-action="release" data-patient="${escapeHtml(patient.patientId)}" data-specialty="${escapeHtml(specialty)}">Concluir e liberar</button>`;
  }
  if (kind === 'blocked') {
    content += `<p class="patient-note">Ocupado: ${escapeHtml(patient.busySpecialty)}.</p>`;
  }
  if (kind === 'completed') {
    content += `<p class="patient-note">Especialidade concluída.</p>`;
  }

  return `${content}</article>`;
}

function section(title, rows, kind, specialty, emptyText) {
  const cards = rows.length
    ? rows.map((patient) => patientCard(patient, kind, specialty)).join('')
    : `<p class="empty">${emptyText}</p>`;
  return `<section class="queue-section"><h3>${title} (${rows.length})</h3>${cards}</section>`;
}

const PULSE_PALETTE = [
  ['Azul', '#2563eb'],
  ['Verde', '#16a34a'],
  ['Amarela', '#ca8a04'],
  ['Laranja', '#f97316'],
  ['Vermelha', '#dc2626'],
  ['Rosa', '#db2777'],
  ['Roxa', '#7c3aed'],
  ['Preta', '#1f2937'],
  ['Branca', '#e5e7eb'],
];

function colorControls(specialty, config) {
  const currentName = config.pulseLabel.replace(/^Pulseira\s*/i, '');
  const hasPaletteColor = PULSE_PALETTE.some(([, color]) => color.toLowerCase() === config.color.toLowerCase());
  const options = PULSE_PALETTE.map(([name, color]) => (
    `<option value="${color}" data-color-name="${name}" ${color.toLowerCase() === config.color.toLowerCase() ? 'selected' : ''}>${name}</option>`
  )).join('');
  const customOption = hasPaletteColor ? '' : `<option value="${escapeHtml(config.color)}" data-color-name="${escapeHtml(currentName)}" selected>${escapeHtml(currentName)}</option>`;

  return `
    <label class="color-control">
      <span>Pulseira</span>
      <input type="color" value="${escapeHtml(config.color)}" data-color-picker data-specialty="${escapeHtml(specialty)}" aria-label="Cor da pulseira de ${escapeHtml(specialty)}">
      <select data-color-select data-specialty="${escapeHtml(specialty)}" aria-label="Escolher cor da pulseira de ${escapeHtml(specialty)}">${options}${customOption}</select>
    </label>`;
}

function render() {
  queueGrid.innerHTML = Object.entries(state.specialties).map(([specialty, config]) => {
    const queue = getQueueView(state, specialty);
    return `
      <article class="queue-card" style="--specialty-color: ${escapeHtml(config.color)}">
        <header>
          <div class="queue-title-row">
            <div>
              <h2>${escapeHtml(specialty)}</h2>
              <div class="queue-meta"><span>${escapeHtml(config.pulseLabel)}</span><span>Porta: ${queue.atDoor.length}/${config.doorCapacity}</span></div>
            </div>
            ${colorControls(specialty, config)}
          </div>
        </header>
        ${section('Na porta', queue.atDoor, 'atDoor', specialty, 'Nenhum paciente reservado.')}
        ${section('Em atendimento', queue.inConsultation, 'inConsultation', specialty, 'Nenhum atendimento em curso.')}
        ${section('Aguardando', queue.available, 'available', specialty, 'Nenhum paciente disponível.')}
        ${section('Ocupados em outro setor', queue.blocked, 'blocked', specialty, 'Nenhum paciente bloqueado.')}
        ${section('Concluídos', queue.completed, 'completed', specialty, 'Ainda não há conclusão.')}
      </article>`;
  }).join('');
}

function report(message, isError = false) {
  alertBox.textContent = message;
  alertBox.classList.toggle('error', isError);
  lastAction.textContent = message;
}

function applyAction(action, patientId, specialty) {
  const at = nowLabel();
  const volunteer = volunteerName();

  if (action === 'door') {
    state = movePatientToDoor(state, patientId, specialty, volunteer, at);
    report(`${patientId} foi chamado para a porta de ${specialty} às ${at}.`);
  }
  if (action === 'start') {
    state = startConsultation(state, patientId, specialty, volunteer, at);
    report(`${patientId} iniciou atendimento em ${specialty} às ${at}.`);
  }
  if (action === 'release') {
    state = releasePatient(state, patientId, specialty, volunteer, at);
    report(`${patientId} concluiu ${specialty} e foi liberado para as demais filas às ${at}.`);
  }

  saveState();
  render();
}

queueGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  try {
    applyAction(button.dataset.action, button.dataset.patient, button.dataset.specialty);
  } catch (error) {
    report(error.message, true);
  }
});

queueGrid.addEventListener('change', (event) => {
  const select = event.target.closest('[data-color-select]');
  const picker = event.target.closest('[data-color-picker]');
  if (!select && !picker) return;

  const field = select || picker;
  const specialty = field.dataset.specialty;
  const card = field.closest('.queue-card');
  const colorPicker = card.querySelector('[data-color-picker]');
  const colorSelect = card.querySelector('[data-color-select]');

  try {
    let colorName = 'Personalizada';
    if (select) {
      colorPicker.value = select.value;
      colorName = select.selectedOptions[0].dataset.colorName;
    } else {
      const matchingOption = [...colorSelect.options].find((option) => option.value.toLowerCase() === colorPicker.value.toLowerCase());
      if (matchingOption) {
        colorSelect.value = matchingOption.value;
        colorName = matchingOption.dataset.colorName;
      }
    }

    state = updateSpecialtyColor(state, specialty, colorPicker.value, colorName);
    saveState();
    report(`${specialty}: pulseira alterada para ${colorName}.`);
    render();
  } catch (error) {
    report(error.message, true);
  }
});

document.querySelector('#resetDemo').addEventListener('click', () => {
  state = buildQueueState(GENERIC_SHEETS, SPECIALTIES);
  saveState();
  report('Demonstração reiniciada com pacientes fictícios.');
  render();
});

volunteerInput.addEventListener('change', () => {
  localStorage.setItem('sas-filas-alpha-volunteer', volunteerName());
});
volunteerInput.value = localStorage.getItem('sas-filas-alpha-volunteer') || volunteerInput.value;

render();
