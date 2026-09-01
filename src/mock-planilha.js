// Alfa: estrutura genérica que espelha abas por especialidade.
// Substituir depois pelo adaptador da planilha SAS/Google Apps Script.
export const SPECIALTIES = {
  Oftalmologia: { color: '#2563eb', doorCapacity: 3, pulseLabel: 'Pulseira azul' },
  Dermatologia: { color: '#f97316', doorCapacity: 2, pulseLabel: 'Pulseira laranja' },
  'Saúde da Mulher': { color: '#db2777', doorCapacity: 2, pulseLabel: 'Pulseira rosa' },
  'Saúde Mental': { color: '#7c3aed', doorCapacity: 2, pulseLabel: 'Pulseira roxa' },
};

export const GENERIC_SHEETS = {
  Oftalmologia: [
    { patientId: 'SAS-001', name: 'Ana Lima', triageAt: '08:05' },
    { patientId: 'SAS-002', name: 'Bruno Silva', triageAt: '08:08' },
    { patientId: 'SAS-005', name: 'Elisa Costa', triageAt: '08:18' },
  ],
  Dermatologia: [
    { patientId: 'SAS-001', name: 'Ana Lima', triageAt: '08:05' },
    { patientId: 'SAS-003', name: 'Carla Souza', triageAt: '08:10' },
  ],
  'Saúde da Mulher': [
    { patientId: 'SAS-003', name: 'Carla Souza', triageAt: '08:10' },
    { patientId: 'SAS-004', name: 'Diego Alves', triageAt: '08:14' },
  ],
  'Saúde Mental': [
    { patientId: 'SAS-002', name: 'Bruno Silva', triageAt: '08:08' },
    { patientId: 'SAS-004', name: 'Diego Alves', triageAt: '08:14' },
  ],
};
