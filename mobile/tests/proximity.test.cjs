const test = require('node:test'),
  assert = require('node:assert/strict');
const { nearby, kilometers, recentPosition } = require('../src/services/proximity');
test('proximidade aproximada preserva próprios/assumidos, ordena e ignora GPS inválido', () => {
  const now = Date.now(),
    p = { latitude: 0, longitude: 0, accuracy: 25, timestamp: now };
  const rows = [
    { id: 1, latitude: 0, longitude: 0.1 },
    { id: 2, latitude: 0, longitude: 0.01 },
    { id: 3, latitude: 1, longitude: 1, meu_pedido: true },
    { id: 4, latitude: 2, longitude: 2, assumido: true },
  ];
  assert(Math.abs(kilometers(p, rows[0]) - 11.12) < 0.1);
  assert.deepEqual(
    nearby(rows, p, 2, true, now).map((r) => r.id),
    [2, 3, 4],
  );
  for (const bad of [
    null,
    { ...p, timestamp: now - 120001 },
    { ...p, accuracy: 300 },
    { ...p, latitude: 100 },
  ]) {
    assert(!recentPosition(bad, now));
    assert.equal(nearby(rows, bad, 2, true, now).length, 4);
  }
  assert.equal(nearby(rows, p, null, true, now).length, 4);
});
