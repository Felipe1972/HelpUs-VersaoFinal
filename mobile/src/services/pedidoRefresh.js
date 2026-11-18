// Somente sinal de atualização/centralização. Marcadores sempre vêm do GET.
let pendingId = null;
export function requestPedidoRefresh(id) {
  pendingId = id;
}
export function pendingPedidoId() {
  return pendingId;
}
export function clearPedidoRefresh(id) {
  if (pendingId === id) pendingId = null;
}
