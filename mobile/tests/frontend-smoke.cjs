// Testes de comportamento com serviços e componentes nativos simulados.
// Não substituem a validação visual/GPS no Expo Go e não acessam a API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '../src');
let states, effects, cursor, calls, alerts;
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
const react = {
  createElement: element,
  useState(value) { const index = cursor++; if (!(index in states)) states[index] = value; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
  useEffect(effect) { effects.push(effect); },
  useCallback: fn => fn,
  useRef: value => ({ current: value }),
};
const native = new Proxy({
  StyleSheet: { create: value => value, absoluteFill: {} },
  Platform: { OS: 'android' },
  Alert: { alert: (...args) => alerts.push(args) },
}, { get: (target, name) => target[name] || name });
let location = { __esModule: true, hasServicesEnabledAsync: async () => true, getLastKnownPositionAsync: async () => null };
let apiResponse;
const api = new Proxy({}, { get: (_, method) => async (...args) => { calls.push([method, ...args]); if (apiResponse) return apiResponse(method, ...args); return { data: { token: 'fake', usuario: { nome: 'Teste', email: 'teste@example.test' }, usuarios: [], mensagem: 'OK' } }; } });
const storage = { salvarSessao: async (...args) => calls.push(['save', ...args]), limparSessao: async () => calls.push(['clear']) };
let demo;
const cache = {};
function load(file) {
  const filename = path.resolve(root, file.endsWith('.js') ? file : `${file}.js`);
  if (cache[filename]) return cache[filename];
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), { babelrc: false, configFile: false, plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  function mockRequire(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === 'react-native') return native;
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) };
    if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
    if (name === 'expo-status-bar') return { StatusBar: 'StatusBar' };
    if (name === 'expo-location') return location;
    if (name === 'react-native-maps') return { __esModule: true, default: 'MapView', Marker: 'Marker' };
    if (name === '@react-navigation/native') return { useIsFocused: () => true, useFocusEffect: effect => effects.push(effect), NavigationContainer: 'NavigationContainer' };
    // O ciclo real do hook e protocolo tem testes próprios; aqui validamos a tela.
    if (name.endsWith('/useChat')) return { __esModule: true, default: () => ({ messages: [], conversation: null, status: 'Desconectado', loading: false, error: '', cursor: null, draft: '', sending: false, retry() {}, loadOlder() {}, send() {}, setDraft() {} }) };
    if (name === '@react-navigation/native-stack') return { createNativeStackNavigator: () => ({ Navigator: 'Navigator', Screen: 'Route' }) };
    if (name.endsWith('/api')) return { __esModule: true, default: api };
    if (name.endsWith('/authStorage')) return storage;
    if (name.endsWith('/DemoContext')) return { useDemo: () => demo, DemoProvider: 'DemoProvider' };
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name)));
    throw new Error(`Unexpected import: ${name}`);
  }
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, setTimeout, clearTimeout, AbortController })(mockRequire, module, module.exports);
  cache[filename] = module.exports;
  return module.exports;
}
function reset(seed = []) {
  states = seed; effects = []; cursor = 0; calls = []; alerts = [];
  apiResponse = null;
  demo = { favorite: false, response: null, read: [], messages: [{ id: '1', text: 'Olá', mine: false }], resetDemo() { calls.push(['resetDemo']); }, setRead() {}, setFavorite() {}, setResponse() {}, setMessages() {} };
}
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
const nav = { navigate: (...args) => calls.push(['navigate', ...args]), reset: value => calls.push(['reset', value]), popTo: name => calls.push(['popTo', name]), goBack: () => {}, canGoBack: () => true, getState: () => ({ routes: [{ name: 'Home' }] }) };
const render = (component, props = {}) => { cursor = 0; return component({ navigation: nav, ...props }); };
const tick = () => new Promise(resolve => setImmediate(resolve));

(async () => {
  reset();
  const routes = nodes(render(load('navigation/AppNavigator').default)).filter(n => n.type === 'Route').map(n => n.props.name);
  assert.equal(new Set(routes).size, 18);
  for (const file of ['screens/CommunityScreens', 'screens/ChatScreens']) {
    for (const component of Object.values(load(file))) {
      reset();
      const tree = render(component, { route: { params: {} } });
      assert(tree, 'Every screen renders');
      for (const node of nodes(tree)) {
        if (node.props?.onPress) {
          node.props.onPress();
          for (const [action, name] of calls) if (['navigate', 'popTo'].includes(action)) assert(routes.includes(name), `Missing route ${name}`);
        }
      }
    }
  }
  reset();
  const { BottomBar, goMain } = load('components/UI');
  for (const node of nodes(BottomBar({ navigation: nav, active: 'Home' }))) node.props?.onPress?.();
  assert.deepEqual(calls.map(call => call[1]), ['Home', 'Conversas', 'Notificacoes', 'Perfil']);
  assert.equal(calls[0][0], 'popTo', 'Home is reused, not duplicated');
  goMain(nav, 'Perfil');
  assert.equal(calls.at(-1)[0], 'navigate');

  for (const scenario of ['granted', 'denied', 'error']) {
    reset();
    location.requestForegroundPermissionsAsync = async () => ({ status: scenario === 'denied' ? 'denied' : 'granted' });
    location.Accuracy = { Balanced: 3 };
    location.getCurrentPositionAsync = async () => { if (scenario === 'error') throw new Error('GPS'); return { coords: { latitude: -30, longitude: -51 } }; };
    delete cache[path.resolve(root, 'screens/HomeScreen.js')];
    const Home = load('screens/HomeScreen').default;
    render(Home);
    effects[0](); await tick();
    if (scenario === 'granted') { assert.equal(states[0].latitude, -30); assert.equal(states[1].longitude, -51); }
    else { assert.equal(states[1], null); assert.equal(typeof states[2], 'string'); }
    const tree = render(Home);
    assert.equal(nodes(tree).filter(n => n.type === 'Marker').length, scenario === 'granted' ? 1 : 0);
  }
  reset(['teste@example.test', 'fake-password', false]);
  const Login = load('screens/LoginScreen').default;
  const loginTree = render(Login);
  await nodes(loginTree).find(n => n.props?.onPress?.name === 'entrar').props.onPress();
  assert.equal(calls.find(c => c[0] === 'post')[1], '/usuarios/login');
  assert(calls.some(c => c[0] === 'save'));
  assert.equal(calls.find(c => c[0] === 'reset')[1].routes[0].name, 'Home');

  reset(['Teste', 'teste@example.test', '51999999999', 'fake-password', 'fake-password', true, false]);
  const register = render(load('screens/CadastroScreen').default);
  await nodes(register).find(n => n.props?.onPress?.name === 'cadastrar').props.onPress();
  assert.equal(calls[0][1], '/usuarios/cadastro');
  assert.equal(calls[0][2].eh_voluntario, true);
  assert.equal(calls.at(-1)[1], 'Login');

  reset(['old-password', 'new-password', 'new-password', false]);
  const password = render(load('screens/TrocarSenhaScreen').default);
  await nodes(password).find(n => n.props?.onPress?.name === 'trocarSenha').props.onPress();
  assert.equal(calls[0][0], 'put');
  assert.equal(calls[0][1], '/usuarios/me/senha');
  assert.equal(calls[0][2].novaSenha, 'new-password');

  reset();
  render(load('screens/UsuariosScreen').default);
  effects[0](); await tick();
  assert.equal(calls[0][1], '/usuarios');

  reset([{ nome: 'Teste', email: 'teste@example.test' }, false, false, 0]);
  const profile = render(load('screens/PerfilScreen').default);
  const actions = nodes(profile);
  actions.find(n => n.props?.title === 'Ver usuários').props.onPress();
  actions.find(n => n.props?.title === 'Trocar senha').props.onPress();
  assert(calls.some(c => c[1] === 'Usuarios'));
  assert(calls.some(c => c[1] === 'TrocarSenha'));
  actions.find(n => n.props?.title === 'Excluir conta').props.onPress();
  assert(!calls.some(c => c[0] === 'delete'), 'Deletion requires confirmation');
  await alerts.at(-1)[2].find(button => button.style === 'destructive').onPress();
  assert(calls.some(c => c[0] === 'delete' && c[1] === '/usuarios/me'));
  await actions.find(n => n.props?.title === 'Sair da conta').props.onPress();
  assert(calls.some(c => c[0] === 'clear'));
  assert.equal(calls.at(-1)[1].routes[0].name, 'Login');
  const Pedidos = load('screens/PedidosScreen').default;
  const options = { tipos: [{ id_tipo: 3, nome: 'Medicamento' }], urgencias: ['baixa','media','alta'] };
  for (const scenario of ['granted', 'denied', 'error']) {
    reset();
    apiResponse = async () => ({ data: options });
    location.getForegroundPermissionsAsync = async () => ({ status: scenario === 'denied' ? 'denied' : 'granted' });
    location.requestForegroundPermissionsAsync = async () => ({ status: 'denied' });
    location.getCurrentPositionAsync = async () => { if (scenario === 'error') throw new Error('GPS'); return { coords: { latitude: -30, longitude: -51 } }; };
    render(Pedidos); effects.forEach(fn => fn()); await tick();
    assert.equal(states[0].tipos[0].nome, 'Medicamento', 'Tipos vêm da API');
    assert.equal(states[7], false);
    if (scenario === 'granted') { assert(states[6], states[8]); assert.equal(states[6].latitude, -30); }
    else { assert.equal(states[6], null); assert(states[8]); }
    assert.equal(nodes(render(Pedidos)).find(n => n.props?.title === 'Criar pedido de ajuda').props.disabled, true);
  }
  for (const failure of [false, true]) {
    reset([options, '', 0, 3, 'media', '  Preciso de ajuda  ', { latitude: -30, longitude: -51 }, false, '', false, '', null]);
    let resolve, reject;
    apiResponse = () => new Promise((yes, no) => { resolve = yes; reject = no; });
    const action = nodes(render(Pedidos)).find(n => n.props?.title === 'Criar pedido de ajuda').props.onPress;
    const first = action(); action(); assert.equal(calls.length, 1, 'Clique repetido não duplica POST');
    assert.equal(calls[0][1], '/ocorrencias'); assert.equal(calls[0][2].descricao, 'Preciso de ajuda'); assert(!('id_solicitante' in calls[0][2]));
    if (failure) reject(new Error('timeout')); else resolve({ data: { ocorrencia: { id_ocorrencia: 99 } } });
    await first;
    if (failure) { assert.equal(states[5], '  Preciso de ajuda  '); assert.match(states[10], /confirmação não chegou/); }
    else { const tree = render(Pedidos); nodes(tree).find(n => n.props?.title === 'Ver detalhes').props.onPress(); assert.equal(calls.at(-1)[2].id_ocorrencia, 99); }
  }
  reset();
  const item = { id_ocorrencia: 99, latitude: -30, longitude: -51, titulo: 'Pedido real', nome_tipo: 'Queda', nivel_urgencia: 'alta' };
  apiResponse = async () => ({ data: { ocorrencias: [item] } });
  location.requestForegroundPermissionsAsync = async () => ({ status: 'granted' });
  location.getCurrentPositionAsync = async () => ({ coords: { latitude: -30, longitude: -51 } });
  const Home = load('screens/HomeScreen').default;
  render(Home); effects.forEach(fn => fn()); await tick();
  let tree = render(Home);
  assert.equal(nodes(tree).filter(n => n.type === 'Marker').length, 2, 'Mapa mantém usuário e ocorrência');
  nodes(tree).find(n => n.type === 'Marker' && n.props.title === 'Pedido real').props.onPress();
  tree = render(Home); nodes(tree).find(n => n.props?.accessibilityLabel === 'Ver detalhes do pedido').props.onPress();
  assert.equal(calls.at(-1)[2].id_ocorrencia, 99);
  assert.equal(states[0].latitude, item.latitude, 'Retorno após POST centraliza no registro retornado pelo GET');
  nodes(tree).find(n => n.props?.accessibilityLabel === 'Solicitar ajuda').props.onPress();
  assert.equal(calls.at(-1)[1], 'SolicitarAjuda');
  nodes(tree).find(n => n.props?.accessibilityLabel === 'Emergência SOS').props.onPress();
  assert.equal(calls.at(-1)[1], 'SOS');
  const map = nodes(tree).find(n => n.type === 'MapView');
  map.props.onRegionChangeComplete({ latitude: -20, longitude: -40 });
  apiResponse = async () => { throw new Error('offline'); };
  effects.at(-1)(); await tick();
  assert.equal(states[0].latitude, -20, 'Falha da API preserva região do mapa');
  assert(states[6], 'Falha da consulta mostra erro');
  console.log('PASS: regressões de conta/GPS/chat; 18 rotas; formulário, GPS, clique duplicado, POST, refresh GET, centralização, Marker/detalhes, erro de rede e separação Solicitar ajuda/SOS. Serviços nativos/API simulados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
