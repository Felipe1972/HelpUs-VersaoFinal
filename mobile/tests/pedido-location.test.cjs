const test = require('node:test');
const assert = require('node:assert/strict');
const { obtainLocation } = require('../src/services/pedidoLocation');
const current = {
  coords: { latitude: -30, longitude: -51, accuracy: 20 },
  timestamp: Date.now(),
};
function service(overrides = {}) {
  return {
    Accuracy: { Balanced: 3 },
    getForegroundPermissionsAsync: async () => ({ status: 'granted' }),
    requestForegroundPermissionsAsync: async () => ({ status: 'denied' }),
    hasServicesEnabledAsync: async () => true,
    getCurrentPositionAsync: async () => current,
    getLastKnownPositionAsync: async () => null,
    ...overrides,
  };
}
test('localização atual, permissão negada e serviço desligado', async () => {
  assert.equal((await obtainLocation(service())).source, 'current');
  await assert.rejects(
    obtainLocation(
      service({ getForegroundPermissionsAsync: async () => ({ status: 'denied' }) }),
    ),
    /Permissão negada/,
  );
  await assert.rejects(
    obtainLocation(service({ hasServicesEnabledAsync: async () => false })),
    /Ative a localização/,
  );
});
test('timeout usa somente fallback recente/preciso e nova tentativa chama GPS novamente', async () => {
  let calls = 0;
  const gps = service({
    getCurrentPositionAsync: () => {
      calls++;
      return calls === 1 ? new Promise(() => {}) : Promise.resolve(current);
    },
    getLastKnownPositionAsync: async () => ({ ...current, timestamp: Date.now() }),
  });
  assert.equal((await obtainLocation(gps, 5)).source, 'lastKnown');
  assert.equal((await obtainLocation(gps, 5)).source, 'current');
  assert.equal(calls, 2);
  for (const last of [
    null,
    { ...current, timestamp: Date.now() - 180000 },
    { ...current, coords: { ...current.coords, accuracy: 500 } },
    { ...current, coords: { ...current.coords, latitude: 200 } },
  ]) {
    await assert.rejects(
      obtainLocation(
        service({
          getCurrentPositionAsync: async () => {
            throw Error('GPS');
          },
          getLastKnownPositionAsync: async () => last,
        }),
        5,
      ),
      /posição recente/,
    );
  }
});
