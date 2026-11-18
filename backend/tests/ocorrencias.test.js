const test = require('node:test');
const assert = require('node:assert/strict');
const { validar } = require('../src/services/ocorrenciaService');
const valid = {
  descricao_publica: 'Resumo',
  modalidade_horario: 'agora',
  fuso_horario: 'America/Sao_Paulo',
  id_tipo: 1,
  descricao: ' Ajuda\npor favor ',
  nivel_urgencia: 'media',
  latitude: -30,
  longitude: -51,
};
test('validação independente do cliente e campos controlados pelo servidor', () => {
  assert.equal(validar(valid).descricao, 'Ajuda\npor favor');
  for (const patch of [
    { id_tipo: 0 },
    { id_tipo: '1' },
    { descricao: ' ' },
    { descricao: 'a'.repeat(2001) },
    { nivel_urgencia: 'urgente' },
    { latitude: '0' },
    { latitude: null },
    { latitude: 91 },
    { longitude: -181 },
    { longitude: NaN },
    { id_solicitante: 2 },
    { status: 'finalizada' },
    { criada_em: '2020-01-01' },
  ])
    assert.throws(() => validar({ ...valid, ...patch }));
  assert.throws(() => validar(null));
  assert.throws(() => validar([]));
  assert.equal(
    validar({ ...valid, endereco_referencia: ' Portão azul ' }).endereco_referencia,
    'Portão azul',
  );
  assert.equal(validar(valid).endereco_referencia, null);
  assert.throws(() => validar({ ...valid, endereco_referencia: 42 }));
  assert.throws(() => validar({ ...valid, endereco_referencia: 'a'.repeat(256) }));
});

test('agendamento exige instante futuro real e resumo separado', () => {
  const scheduled = {
    ...valid,
    modalidade_horario: 'agendado',
    necessaria_em: new Date(Date.now() + 86400000).toISOString(),
  };
  assert.equal(validar(scheduled).necessaria_em, scheduled.necessaria_em);
  for (const patch of [
    { descricao_publica: '' },
    { descricao_publica: 'a'.repeat(501) },
    { fuso_horario: 'inexistente' },
    { modalidade_horario: 'outra' },
    { modalidade_horario: 'agendado', necessaria_em: '2020-01-01T12:00:00.000Z' },
    { modalidade_horario: 'agendado', necessaria_em: '2099-02-30T12:00:00.000Z' },
  ])
    assert.throws(() => validar({ ...valid, ...patch }));
});
