// Sem dependências nativas; também usado nos testes de conexão.
function websocketUrl(apiUrl) {
  const url = new URL(apiUrl);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Endereço da API inválido.');
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/chat';
  url.search = '';
  url.hash = '';
  return url.toString();
}
// Mescla histórico e eventos sem duplicar mensagens.
function mergeMessages(current, incoming) {
  const byId = new Map(current.map((message) => [message.id_mensagem, message]));
  for (const message of incoming) byId.set(message.id_mensagem, message);
  return [...byId.values()].sort(
    (a, b) =>
      (a.enviada_em || '').localeCompare(b.enviada_em || '') ||
      a.id_mensagem - b.id_mensagem,
  );
}
// Autentica o socket por evento e bloqueia envio antes da confirmação.
function connectChat({
  url,
  token,
  WebSocketImpl,
  onStatus,
  onEvent,
  onAuthError,
  onDisconnect,
  authTimeoutMs = 15000,
}) {
  let disposed = false;
  let authenticated = false;
  let failed = false;
  const socket = new WebSocketImpl(url);
  onStatus('Conectando…');
  const timer = setTimeout(() => {
    if (!disposed && !authenticated) {
      failed = true;
      onStatus('Erro de conexão');
      socket.close();
    }
  }, authTimeoutMs);
  socket.onopen = () => {
    if (disposed) return;
    onStatus('Autenticando…');
    try {
      socket.send(JSON.stringify({ type: 'auth', token }));
    } catch {
      failed = true;
      onStatus('Erro de conexão');
      socket.close();
    }
  };
  socket.onmessage = (event) => {
    if (disposed) return;
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!data || typeof data !== 'object') return;
    if (data.type === 'auth_error') {
      authenticated = false;
      clearTimeout(timer);
      onAuthError();
      socket.close();
      return;
    }
    if (data.type === 'auth_ok' && Number.isInteger(data.id_usuario)) {
      authenticated = true;
      clearTimeout(timer);
      onStatus('Conectado');
      onEvent(data);
    } else if (authenticated) onEvent(data);
  };
  socket.onerror = () => {
    if (!disposed) {
      failed = true;
      onStatus('Erro de conexão');
    }
  };
  socket.onclose = (event) => {
    clearTimeout(timer);
    authenticated = false;
    if (disposed) return;
    onStatus(failed ? 'Erro de conexão' : 'Desconectado');
    onDisconnect();
    if (event.code === 4401) onAuthError();
  };
  return {
    ready: () => !disposed && authenticated && socket.readyState === WebSocketImpl.OPEN,
    send(event) {
      if (disposed || !authenticated || socket.readyState !== WebSocketImpl.OPEN)
        throw new Error('Sem conexão autenticada.');
      socket.send(JSON.stringify(event));
    },
    close() {
      disposed = true;
      authenticated = false;
      clearTimeout(timer);
      socket.close();
    },
  };
}
module.exports = { websocketUrl, mergeMessages, connectChat };
