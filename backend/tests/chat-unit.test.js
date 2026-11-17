const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const chat = require('../src/services/chatService');
const attach = require('../src/websocket/chatServer');

test('validação rejeita corpo inválido, IDs, remetente livre e texto vazio/excessivo', () => {
  const valid = { type: 'chat_message', request_id: 'req-1', id_ocorrencia: 1, id_destinatario: 2, text: ' olá ' };
  assert.equal(chat.validateMessage(valid).text, 'olá');
  for (const patch of [{ type: 'other' }, { id_remetente: 99 }, { id_ocorrencia: -1 }, { id_destinatario: 1.5 }, { text: '' }, { text: ' \n ' }, { text: 42 }, { text: 'a'.repeat(1001) }, { request_id: '' }]) {
    assert.throws(() => chat.validateMessage({ ...valid, ...patch }), chat.ChatError);
  }
});

test('JWT inválido e expirado falham antes de consultar banco', async () => {
  process.env.JWT_SECRET = 'unit-test-only-secret';
  for (const token of [null, 'invalid', jwt.sign({ id_usuario: 1 }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
    await assert.rejects(chat.authenticate(token), error => error.code === 'UNAUTHORIZED');
  }
});

test('socket exige auth, expira, rejeita troca de identidade e não confirma falha do banco', async t => {
  let saves = 0;
  const server = http.createServer();
  const sockets = [];
  const chatServer = attach(server, { authTimeoutMs: 80, maxEvents: 100,
    service: {
      authenticate: async token => {
        if (token === 'bad') throw new Error('invalid');
        return { id_usuario: 1, exp: Date.now() / 1000 + (token === 'short' ? 0.15 : 30) };
      },
      authorize: async () => ({}),
      resolveConversation: async () => ({occurrenceId:1,otherId:2}),
      saveMessage: async () => { saves++; throw new Error('database offline'); },
    },
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { sockets.forEach(s => s.terminate()); chatServer.close(); await new Promise(resolve => server.close(resolve)); });
  async function client() {
    const socket = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws/chat`);
    socket.on('error', () => {}); sockets.push(socket); await once(socket, 'open'); return socket;
  }
  const silent = await client();
  assert.equal((await once(silent, 'close'))[0], 4401);
  const early = await client();
  early.send(JSON.stringify({ type: 'chat_message' }));
  assert.equal((await once(early, 'close'))[0], 4401);
  assert.equal(saves, 0);
  const bad = await client();
  bad.send(JSON.stringify({ type: 'auth', token: 'bad' }));
  assert.equal((await once(bad, 'close'))[0], 4401);
  const short = await client();
  short.send(JSON.stringify({ type: 'auth', token: 'short' }));
  assert.equal((await once(short, 'close'))[0], 4401);
  const switcher = await client();
  switcher.send(JSON.stringify({ type: 'auth', token: 'good' }));
  assert.equal(JSON.parse((await once(switcher, 'message'))[0]).type, 'auth_ok');
  switcher.send(JSON.stringify({ type: 'auth', token: 'other' }));
  assert.equal((await once(switcher, 'close'))[0], 4401);
  const writer = await client();
  writer.send(JSON.stringify({ type: 'auth', token: 'good' }));
  await once(writer, 'message');
  writer.send(JSON.stringify({ type: 'chat_message', request_id: 'fail', id_conversa: 'test-conversation', text: 'Olá' }));
  const failure = JSON.parse((await once(writer, 'message'))[0]);
  assert.equal(failure.type, 'chat_error'); assert.equal(failure.codigo, 'INTERNAL_ERROR'); assert.equal(saves, 1);
});
