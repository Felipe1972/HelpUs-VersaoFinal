const { WebSocketServer, WebSocket } = require('ws');
const chat = require('../services/chatService');

function attachChatServer(server, options = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16384, perMessageDeflate: false });
  const users = new Map();
  const rate = new Map();
  const service = options.service || chat;
  const authTimeoutMs = options.authTimeoutMs ?? 10000;
  const maxEvents = options.maxEvents ?? 30;

  function send(socket, event) {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > 65536) return socket.close(1013, 'Cliente lento');
    socket.send(JSON.stringify(event), error => { if (error) socket.terminate(); });
  }
  function authFailure(socket, message = 'Sessão inválida ou expirada.') {
    send(socket, { type: 'auth_error', codigo: 'UNAUTHORIZED', mensagem: message });
    socket.close(4401, 'Autenticacao necessaria');
  }
  function allowedRate(key) {
    const now = Date.now();
    let window = rate.get(key);
    if (!window || now - window.start >= 10000) { window = { start: now, count: 0 }; rate.set(key, window); }
    return ++window.count <= maxEvents;
  }

  async function deliver(message, origin) {
    for (const id of [message.id_remetente, message.id_destinatario]) {
      const sockets = users.get(id);
      if (!sockets) continue;
      try {
        const other = id === message.id_remetente ? message.id_destinatario : message.id_remetente;
        await service.authorize(id, message.id_ocorrencia, other);
        for (const socket of sockets) {
          if (socket === origin) continue;
          if (socket.claims.exp * 1000 <= Date.now()) { authFailure(socket); continue; }
          send(socket, { type: 'chat_message', mensagem: message });
        }
      } catch {
        // A mensagem já está persistida. Uma entrega indisponível será recuperada pelo histórico.
      }
    }
  }

  function upgrade(request, socket, head) {
    if (request.url !== '/ws/chat') { socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n'); return; }
    const ip = request.socket.remoteAddress;
    if (!allowedRate(`ip:${ip}`)) { socket.end('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n'); return; }
    wss.handleUpgrade(request, socket, head, client => wss.emit('connection', client));
  }
  server.on('upgrade', upgrade);

  wss.on('connection', socket => {
    socket.alive = true;
    socket.claims = null;
    let authenticating = false;
    let queued = 0;
    let chain = Promise.resolve();
    let expiration;
    const acknowledgements = new Map();
    const deadline = setTimeout(() => authFailure(socket, 'Tempo para autenticação esgotado.'), authTimeoutMs);
    deadline.unref();
    socket.on('pong', () => { socket.alive = true; });
    socket.on('error', () => { socket.terminate(); });
    socket.on('close', () => {
      clearTimeout(deadline);
      clearTimeout(expiration);
      const set = users.get(socket.claims?.id_usuario);
      set?.delete(socket);
      if (set?.size === 0) users.delete(socket.claims.id_usuario);
    });

    socket.on('message', (raw, binary) => {
      let event;
      try {
        if (binary) throw new Error('binary');
        event = JSON.parse(raw.toString());
        if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('json');
      } catch {
        send(socket, { type: 'chat_error', codigo: 'INVALID_JSON', mensagem: 'Envie um objeto JSON válido.' });
        if (!socket.claims) socket.close(4401, 'Autenticacao necessaria');
        return;
      }
      if (!socket.claims) {
        if (event.type !== 'auth' || authenticating) { authFailure(socket); return; }
        authenticating = true;
        service.authenticate(event.token).then(claims => {
          if (socket.readyState !== WebSocket.OPEN) return;
          const remaining = claims.exp * 1000 - Date.now();
          if (remaining <= 0) { authFailure(socket); return; }
          socket.claims = claims;
          clearTimeout(deadline);
          expiration = setTimeout(() => authFailure(socket), Math.min(remaining, 2147483647));
          expiration.unref();
          if (!users.has(claims.id_usuario)) users.set(claims.id_usuario, new Set());
          users.get(claims.id_usuario).add(socket);
          send(socket, { type: 'auth_ok', id_usuario: claims.id_usuario });
        }).catch(() => authFailure(socket));
        return;
      }
      if (event.type === 'auth') { authFailure(socket, 'Não é permitido trocar de identidade nesta conexão.'); return; }
      if (socket.claims.exp * 1000 <= Date.now()) { authFailure(socket); return; }
      const requestId = typeof event.request_id === 'string' ? event.request_id.slice(0, 80) : undefined;
      if (!allowedRate(`user:${socket.claims.id_usuario}`) || queued >= 20) {
        send(socket, { type: 'chat_error', request_id: requestId, codigo: 'RATE_LIMIT', mensagem: 'Aguarde alguns segundos antes de enviar novamente.' });
        return;
      }
      queued++;
      chain = chain.then(async () => {
        if (socket.readyState !== WebSocket.OPEN) return;
        try {
          chat.validateMessage(event);
          const fingerprint = JSON.stringify([event.id_ocorrencia, event.id_destinatario, event.text.trim()]);
          const previous = acknowledgements.get(event.request_id);
          if (previous) {
            if (previous.fingerprint !== fingerprint) throw new chat.ChatError('INVALID_REQUEST', 'Identificador já utilizado para outro envio.');
            await service.authorize(socket.claims.id_usuario, event.id_ocorrencia, event.id_destinatario);
            send(socket, previous.ack);
            return;
          }
          const message = await service.saveMessage(socket.claims, event);
          const ack = { type: 'chat_ack', request_id: event.request_id, mensagem: message };
          acknowledgements.set(event.request_id, { fingerprint, ack });
          if (acknowledgements.size > 100) acknowledgements.delete(acknowledgements.keys().next().value);
          send(socket, ack);
          await deliver(message, socket);
        } catch (error) {
          if (error.code === 'UNAUTHORIZED') { authFailure(socket); return; }
          const known = error instanceof chat.ChatError;
          if (!known) console.error('Falha ao persistir chat:', error.code || error.name);
          send(socket, { type: 'chat_error', request_id: requestId, codigo: known ? error.code : 'INTERNAL_ERROR', mensagem: known ? error.message : 'Não foi possível salvar a mensagem. Tente novamente.' });
        }
      }).catch(() => socket.close(1011, 'Falha na conexao')).finally(() => { queued--; });
    });
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.alive) { socket.terminate(); continue; }
      socket.alive = false;
      socket.ping(() => {});
    }
    for (const [key, window] of rate) if (Date.now() - window.start > 60000) rate.delete(key);
  }, 30000);
  heartbeat.unref();
  return {
    close() {
      clearInterval(heartbeat);
      server.off('upgrade', upgrade);
      for (const socket of wss.clients) socket.terminate();
      wss.close();
    },
  };
}
module.exports = attachChatServer;
