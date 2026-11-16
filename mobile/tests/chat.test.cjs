const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const protocol = require('../src/services/chatProtocol');

test('URL derivada, identidade por auth e bloqueio de envio antes de auth_ok', () => {
  assert.equal(protocol.websocketUrl('http://192.168.1.10:3000'), 'ws://192.168.1.10:3000/ws/chat');
  assert.equal(protocol.websocketUrl('https://api.example.test'), 'wss://api.example.test/ws/chat');
  assert.throws(() => protocol.websocketUrl('file:///api'));
  let native;
  class Socket {
    static OPEN = 1;
    constructor(...args) { assert.equal(args.length, 1, 'Não envia headers customizados'); native = this; this.readyState = 0; this.sent = []; }
    send(value) { this.sent.push(JSON.parse(value)); }
    close() { this.readyState = 3; this.onclose?.({ code: 1000 }); }
  }
  const events = [], statuses = [];
  let authErrors = 0, disconnected = 0;
  const client = protocol.connectChat({ url: 'ws://example.test/ws/chat', token: 'jwt', WebSocketImpl: Socket,
    onEvent: event => events.push(event), onStatus: value => statuses.push(value),
    onAuthError: () => authErrors++, onDisconnect: () => disconnected++ });
  assert.throws(() => client.send({ type: 'chat_message' }));
  native.readyState = 1; native.onopen();
  assert.deepEqual(native.sent, [{ type: 'auth', token: 'jwt' }]);
  assert.equal(client.ready(), false);
  native.onmessage({ data: JSON.stringify({ type: 'chat_message' }) });
  assert.equal(events.length, 0);
  native.onmessage({ data: 'bad JSON' });
  native.onmessage({ data: JSON.stringify({ type: 'auth_ok', id_usuario: 1 }) });
  assert.equal(client.ready(), true);
  client.send({ type: 'chat_message', text: 'Olá' });
  assert.equal(native.sent.length, 2);
  native.onerror(); native.close();
  assert.equal(client.ready(), false); assert.equal(disconnected, 1);
  assert.equal(statuses.at(-1), 'Erro de conexão');
  assert.throws(() => client.send({}));
  client.close();
  native.onmessage({ data: JSON.stringify({ type: 'auth_error' }) });
  assert.equal(authErrors, 0, 'Não altera sessão após desmontar');
});

test('mescla histórico/eventos sem duplicar e ordena cronologicamente', () => {
  const a = { id_mensagem: 1, enviada_em: '2026-01-01T00:00:00Z' };
  const b = { id_mensagem: 2, enviada_em: a.enviada_em };
  assert.deepEqual(protocol.mergeMessages([b], [a, b]), [a, b]);
});

// Executa o hook real com ciclo React, transporte e API simulados e controláveis.
function hookHarness() {
  let index = 0, focused = true, appListener, options, apiImpl;
  const slots = [], pendingEffects = [], sent = [], calls = [], timers = new Map();
  let timerId = 0, connected = false, closed = 0;
  const react = {
    useState(initial) { const i = index++; if (!slots[i]) slots[i] = { value: initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }]; },
    useRef(initial) { const i = index++; return slots[i] ||= { current: initial }; },
    useCallback: fn => fn,
    useEffect(fn, deps) {
      const i = index++, old = slots[i];
      if (!old || deps.some((dep, n) => dep !== old.deps[n])) {
        pendingEffects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
      }
    },
  };
  const source = fs.readFileSync(path.resolve(__dirname, '../src/hooks/useChat.js'), 'utf8');
  const code = babel.transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  const navigation = { reset: value => calls.push(['reset', value]) };
  const api = { defaults: { baseURL: 'http://example.test:3000' }, get: (...args) => { calls.push(['get', ...args]); return apiImpl(...args); } };
  const mocks = {
    react, 'react-native': { AppState: { currentState: 'active', addEventListener: (_, fn) => { appListener = fn; return { remove() {} }; } } },
    '@react-navigation/native': { useIsFocused: () => focused },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async () => 'jwt' } },
    '../services/api': { __esModule: true, default: api },
    '../services/authStorage': { TOKEN_KEY: 'token', limparSessao: async () => calls.push(['clear']) },
    '../services/chatProtocol': { ...protocol, connectChat: opts => {
      options = opts; connected = false;
      return { ready: () => connected, send: event => sent.push(event), close: () => { closed++; connected = false; } };
    } },
  };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    console, AbortController, WebSocket: {},
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
  })(name => { assert(name in mocks, name); return mocks[name]; }, module, module.exports);
  return {
    sent, calls, timers,
    api(fn) { apiImpl = fn; },
    render() { index = 0; const value = module.exports.default(navigation, 10, 2); pendingEffects.splice(0).forEach(fn => fn()); return value; },
    auth() { connected = true; options.onStatus('Conectado'); options.onEvent({ type: 'auth_ok', id_usuario: 1 }); },
    event(event) { options.onEvent(event); },
    disconnect() { connected = false; options.onStatus('Desconectado'); options.onDisconnect(); },
    background(value) { appListener(value ? 'background' : 'active'); },
    focus(value) { focused = value; },
    get closed() { return closed; },
    dispose() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const message = id => ({ id_mensagem: id, id_ocorrencia: 10, id_remetente: 1, id_destinatario: 2, texto: 'Olá', enviada_em: `2026-01-01T00:00:00Z` });
const page = (messages = [], cursor = null) => ({ data: { conversa: { id_ocorrencia: 10, interlocutor: { id_usuario: 2, nome: 'B' }, somente_leitura: false }, mensagens: messages, proximo_cursor: cursor } });

test('hook preserva rascunho na queda e só limpa após ack persistido; reabre histórico e fecha ao sair', async t => {
  const h = hookHarness(); t.after(() => h.dispose());
  h.api(async () => page());
  h.render(); await tick(); h.auth(); await tick();
  let chat = h.render(); chat.setDraft('Olá'); chat = h.render(); chat.send();
  assert.equal(h.sent.length, 1);
  assert.equal(h.render().draft, 'Olá'); assert.equal(h.render().messages.length, 0);
  h.event({ type: 'chat_ack', request_id: h.sent[0].request_id, mensagem: message(1) });
  assert.equal(h.render().draft, ''); assert.equal(h.render().messages.length, 1);
  chat = h.render(); chat.setDraft('Não perder'); h.render().send();
  h.disconnect(); await tick();
  assert.equal(h.render().draft, 'Não perder'); assert.equal(h.render().sending, false);
  assert.match(h.render().error, /não confirmado/);
  h.render().send(); assert.equal(h.sent.length, 2, 'Não reenvia offline');
  h.render().retry(); h.render(); await tick();
  let resolve;
  h.api(() => new Promise(done => { resolve = done; }));
  h.auth();
  h.event({ type: 'chat_message', mensagem: message(102) });
  resolve(page([message(100), message(101)], 100)); await tick();
  assert.equal(h.render().messages.map(m => m.id_mensagem).join(','), '100,101,102', 'Janela recente sem lacunas e sem perder evento simultâneo');
  h.api(async () => page([message(99)], null));
  h.render().loadOlder(); await tick();
  assert.equal(h.render().messages.map(m => m.id_mensagem).join(','), '99,100,101,102');
  h.background(true); h.render(); assert(h.closed >= 2);
  h.background(false); h.render(); await tick();
  h.focus(false); h.render(); assert.equal(h.render().status, 'Desconectado');
});

test('hook encerra acesso negado e remove sessão expirada', async t => {
  const h = hookHarness(); t.after(() => h.dispose());
  h.api(async () => { throw { response: { status: 403, data: { mensagem: 'Sem acesso' } } }; });
  h.render(); await tick(); h.auth(); await tick();
  assert.equal(h.render().conversation, null); assert.equal(h.render().status, 'Sem acesso');
  h.api(async () => { throw { response: { status: 401 } }; });
  h.render().retry(); h.render(); await tick(); h.auth(); await tick();
  assert(h.calls.some(c => c[0] === 'clear'));
  assert.equal(h.calls.find(c => c[0] === 'reset')[1].routes[0].name, 'Login');
});
