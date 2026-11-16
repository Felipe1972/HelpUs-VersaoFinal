const test = require('node:test');
const assert = require('node:assert/strict');
const { validar } = require('../src/services/ocorrenciaService');
const valid = { id_tipo: 1, descricao: ' Ajuda\npor favor ', nivel_urgencia: 'media', latitude: -30, longitude: -51 };
test('validação independente do cliente e campos controlados pelo servidor', () => {
  assert.equal(validar(valid).descricao, 'Ajuda\npor favor');
  for (const patch of [{ id_tipo: 0 }, { id_tipo: '1' }, { descricao: ' ' }, { descricao: 'a'.repeat(2001) }, { nivel_urgencia: 'urgente' }, { latitude: '0' }, { latitude: null }, { latitude: 91 }, { longitude: -181 }, { longitude: NaN }, { id_solicitante: 2 }, { status: 'finalizada' }, { criada_em: '2020-01-01' }]) assert.throws(() => validar({ ...valid, ...patch }));
  assert.throws(() => validar(null)); assert.throws(() => validar([]));
  assert.equal(validar({ ...valid, endereco_referencia: ' Portão azul ' }).endereco_referencia, 'Portão azul');
  assert.equal(validar(valid).endereco_referencia, null);
  assert.throws(() => validar({ ...valid, endereco_referencia: 42 }));
  assert.throws(() => validar({ ...valid, endereco_referencia: 'a'.repeat(256) }));
});
