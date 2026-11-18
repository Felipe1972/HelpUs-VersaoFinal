// Fallback limitado a posição recente e com precisão conhecida. Não altera coordenadas.
const MAX_AGE = 120000;
const MAX_ACCURACY = 100;
// Valida limites geográficos antes de utilizar uma posição do aparelho.
function validPosition(position) {
  return (
    position &&
    Number.isFinite(position.coords?.latitude) &&
    Math.abs(position.coords.latitude) <= 90 &&
    Number.isFinite(position.coords?.longitude) &&
    Math.abs(position.coords.longitude) <= 180
  );
}
// Obtém GPS com prazo limite e aceita fallback somente recente e preciso.
async function obtainLocation(Location, timeoutMs = 20000) {
  let permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted')
    permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted')
    throw new Error(
      'Permissão negada. Autorize a localização nas configurações do celular e tente novamente.',
    );
  if (!(await Location.hasServicesEnabledAsync()))
    throw new Error('Ative a localização do celular e tente novamente.');
  let timer;
  try {
    const current = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      }),
    ]);
    if (!validPosition(current)) throw new Error('invalid');
    return {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
      source: 'current',
      timestamp: current.timestamp ?? Date.now(),
      accuracy: current.coords.accuracy,
    };
  } catch {
    let last;
    try {
      last = await Location.getLastKnownPositionAsync({
        maxAge: MAX_AGE,
        requiredAccuracy: MAX_ACCURACY,
      });
    } catch {
      /* Tentar novamente na interface. */
    }
    const age = Date.now() - last?.timestamp;
    if (
      validPosition(last) &&
      Number.isFinite(age) &&
      age >= 0 &&
      age <= MAX_AGE &&
      Number.isFinite(last.coords.accuracy) &&
      last.coords.accuracy >= 0 &&
      last.coords.accuracy <= MAX_ACCURACY
    ) {
      return {
        latitude: last.coords.latitude,
        longitude: last.coords.longitude,
        source: 'lastKnown',
        timestamp: last.timestamp,
        accuracy: last.coords.accuracy,
      };
    }
    throw new Error(
      'Não foi possível obter uma posição recente. Vá para um local aberto e tente novamente.',
    );
  } finally {
    clearTimeout(timer);
  }
}
module.exports = { obtainLocation, validPosition };
