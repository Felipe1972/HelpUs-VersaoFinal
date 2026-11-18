// Testes de comportamento com serviços e componentes nativos simulados.
// Não substituem a validação visual/GPS no Expo Go e não acessam a API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '../src');
let states, effects, cursor, calls, alerts;
let intervals=[], appListeners=[];
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
  useWindowDimensions:()=>({width:390,height:844,fontScale:1}),
  Platform: { OS: 'android' },
  AppState: {currentState:'active',addEventListener:(_,fn)=>{appListeners.push(fn);return {remove(){appListeners=appListeners.filter(x=>x!==fn)}}}},
  Alert: { alert: (...args) => alerts.push(args) },
}, { get: (target, name) => target[name] || name });
let location = { __esModule: true, hasServicesEnabledAsync: async () => true, getLastKnownPositionAsync: async () => null };
let apiResponse;
const api = new Proxy({}, { get: (_, method) => async (...args) => { calls.push([method, ...args]); if (apiResponse) return apiResponse(method, ...args); return { data: { token: 'fake', usuario: { nome: 'Teste', email: 'teste@example.test' }, usuarios: [], mensagem: 'OK' } }; } });
const storage = { salvarSessao: async (...args) => calls.push(['save', ...args]), limparSessao: async () => calls.push(['clear']) };
let demo;
let notificationUnread=2;
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
    if (name === 'expo-clipboard') return {setStringAsync:async()=>{}};
    if (name === 'expo-location') return location;
    if (name === 'react-native-maps') return { __esModule: true, default: 'MapView', Marker: 'Marker' };
    if (name === '@react-navigation/native') return { useIsFocused: () => true, useFocusEffect: effect => effects.push(effect), NavigationContainer: 'NavigationContainer' };
    // O ciclo real do hook e protocolo tem testes próprios; aqui validamos a tela.
    if (name.endsWith('/usePollingRefresh')) return { __esModule: true, default: () => {} };
    if (name.endsWith('/useChat')) return { __esModule: true, default: () => ({ messages: [], conversation: null, status: 'Desconectado', loading: false, error: '', cursor: null, draft: '', sending: false, retry() {}, loadOlder() {}, send() {}, setDraft() {} }) };
    if (name === '@react-navigation/native-stack') return { createNativeStackNavigator: () => ({ Navigator: 'Navigator', Screen: 'Route' }) };
    if (name.endsWith('/api')) return { __esModule: true, default: api };
    if (name.endsWith('/authStorage')) return storage;
    if (name.endsWith('/NotificationsContext')) return { useNotifications:()=>({unread:notificationUnread,refresh:async()=>{},open:async()=>{}}), NotificationsProvider:'NotificationsProvider',notificationNavigation:{},notificationNavigationChanged:()=>{},notificationPermission:async()=>'Autorizadas' };
    if (name.endsWith('/DemoContext')) return { useDemo: () => demo, DemoProvider: 'DemoProvider' };
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name)));
    throw new Error(`Unexpected import: ${name}`);
  }
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, setTimeout, clearTimeout, setInterval:fn=>{intervals.push(fn);return fn}, clearInterval:fn=>{intervals=intervals.filter(x=>x!==fn)}, AbortController })(mockRequire, module, module.exports);
  cache[filename] = module.exports;
  return module.exports;
}
function reset(seed = []) {
  intervals=[];appListeners=[];native.AppState.currentState='active';
  states = seed; effects = []; cursor = 0; calls = []; alerts = [];
  apiResponse = null;
  demo = { response: null, read: [], messages: [{ id: '1', text: 'Olá', mine: false }], resetDemo() { calls.push(['resetDemo']); }, setRead() {}, setResponse() {}, setMessages() {} };
}
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
const nav = { navigate: (...args) => calls.push(['navigate', ...args]), reset: value => calls.push(['reset', value]), popTo: name => calls.push(['popTo', name]), goBack: () => {}, canGoBack: () => true, getState: () => ({ routes: [{ name: 'Home' }] }) };
const render = (component, props = {}) => { cursor = 0; return component({ navigation: nav, ...props }); };
const tick = () => new Promise(resolve => setImmediate(resolve));

// Executa também os componentes filhos: JSX superficial não detecta erros no IconButton.
function expandComponents(tree) {
  if (Array.isArray(tree)) return tree.map(expandComponents);
  if (!tree || typeof tree !== 'object') return tree;
  if (typeof tree.type === 'function') return expandComponents(tree.type(tree.props || {}));
  return { ...tree, props: { ...tree.props, children: expandComponents(tree.props?.children) } };
}
function componentRegression() {
  const { IconButton, Header, BottomBar } = load('components/UI');
  for (const os of ['android','ios']) {
    native.Platform.OS=os;
    for (const name of ['menu','arrow-back','send','refresh','information-circle-outline','locate-outline','close']) {
      reset(); let pressed=0;
      const button=expandComponents(IconButton({name,label:'Ação '+name,onPress:()=>pressed++}));
      assert.equal(button.props.accessibilityLabel,'Ação '+name);
      button.props.onPress();assert.equal(pressed,1);
      assert.equal(IconButton({name,label:'Bloqueado',disabled:true}).props.disabled,true);
    }
    for (const options of [{},{back:true},{auth:true},{auth:true,back:true}]) {
      reset(); const tree=expandComponents(Header({title:'Help Us',navigation:nav,...options}));
      const buttons=nodes(tree).filter(n=>n.props?.accessibilityRole==='button');
      assert.equal(buttons.length,options.auth&&!options.back?0:1);
      if(buttons.length){buttons[0].props.onPress();if(!options.back)assert.equal(calls.at(-1)[1],'Menu')}
    }
    for (const count of [0,1,7,100]) {
      reset();notificationUnread=count;
      const tree=expandComponents(BottomBar({navigation:nav,active:'Notificacoes'}));
      const tabs=nodes(tree).filter(n=>n.props?.accessibilityRole==='tab');assert.equal(tabs.length,4);
      assert.equal(tabs[2].props.accessibilityLabel,count?'Avisos · '+count+' avisos não lidos':'Avisos');
      assert.equal(tabs[0].props.accessibilityLabel,'Início');
      const labels=nodes(tabs[2]).filter(n=>n.type==='Text').map(n=>n.props.children);
      assert.equal(labels.length,count?2:1);
      if(count)assert(labels.includes(count>99?'99+':count));
      tabs[2].props.onPress();assert.equal(calls.at(-1)[1],'Notificacoes');
    }
    notificationUnread=2;
    for(const [file,name]of [['screens/CommunityScreens','MenuScreen'],['screens/ChatScreens','ChatScreen'],['screens/HomeScreen','default']]) {
      reset();const tree=expandComponents(render(load(file)[name],{route:{params:{}}}));assert(tree);
      if(name==='MenuScreen'){
        for(const row of nodes(tree).filter(n=>n.props?.accessibilityRole==='button'&&n.type==='Pressable'))row.props.onPress?.();
        assert(calls.some(c=>c[1]==='Notificacoes'));assert(calls.some(c=>c[1]==='Perfil'));
      }
    }
  }
  native.Platform.OS='android';reset();
  console.log('PASS: renderização recursiva de IconButton/Header/Menu/Home/Chat, ações e badge 0/1/7/99+ em Android/iOS simulados.');
}

(async () => {
  componentRegression();
  reset();
  const routes = nodes(render(load('navigation/AppNavigator').default)).filter(n => n.type === 'Route').map(n => n.props.name);
  assert.equal(new Set(routes).size, 24);
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
    location.getForegroundPermissionsAsync = async () => ({status:scenario==='denied'?'denied':'granted'});
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
  const { schedulePayload } = load('components/SchedulePicker');
  assert.equal(schedulePayload({mode:'agora'}).modalidade_horario,'agora');
  assert.throws(()=>schedulePayload({mode:'agendado',date:'2020-1-1',hour:'12',minute:'00'}));
  assert.throws(()=>schedulePayload({mode:'agendado',date:'2099-2-30',hour:'12',minute:'00'}));
  const scheduled = schedulePayload({mode:'agendado',date:'2099-1-2',hour:'14',minute:'30'});
  assert.equal(new Date(scheduled.necessaria_em).getHours(),14);
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
    reset([options, '', 0, 3, 'media', '  Preciso de ajuda  ', { latitude: -30, longitude: -51 }, false, '', false, '', null, '', 'Resumo público', {mode:'agora'}, {rua:'Rua teste',numero:'1',bairro:'Centro',cidade:'Teste',estado:'RS',sem_numero:false,latitude:-30,longitude:-51,confirmed:true}, false]);
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
  location.getForegroundPermissionsAsync = async () => ({ status: 'granted' });
  location.requestForegroundPermissionsAsync = async () => ({ status: 'granted' });
  location.getCurrentPositionAsync = async () => ({ coords: { latitude: -30, longitude: -51 } });
  const Home = load('screens/HomeScreen').default;
  render(Home); effects.forEach(fn => fn()); await tick();
  let tree = render(Home);
  assert.equal(nodes(tree).filter(n => n.type === 'Marker').length, 2, 'Mapa mantém usuário e ocorrência');
  nodes(tree).find(n => n.type === 'Marker' && n.props.title === 'Pedido real').props.onPress();
  tree = render(Home); nodes(tree).find(n => n.props?.title === 'Ver detalhes').props.onPress();
  assert.equal(calls.at(-1)[2].id_ocorrencia, 99);
  assert.equal(states[0].latitude, item.latitude, 'Retorno após POST centraliza no registro retornado pelo GET');
  nodes(tree).find(n => n.props?.title === 'Solicitar ajuda').props.onPress();
  assert.equal(calls.at(-1)[1], 'SolicitarAjuda');
  nodes(tree).find(n => n.props?.title === 'SOS').props.onPress();
  assert.equal(calls.at(-1)[1], 'SOS');
  const map = nodes(tree).find(n => n.type === 'MapView');
  map.props.onRegionChangeComplete({ latitude: -20, longitude: -40 });
  apiResponse = async () => { throw new Error('offline'); };
  effects.at(-1)(); await tick();
  assert.equal(states[0].latitude, -20, 'Falha da API preserva região do mapa');
  assert(states[6], 'Falha da consulta mostra erro');

  // Perfil vem da resposta atual do servidor; o Home não usa AsyncStorage para autorizar.
  for (const volunteer of [false, true]) {
    reset();
    const own = { ...item, meu_pedido: true };
    const publicItem = { ...item, id_ocorrencia: 100, titulo: 'Pedido da comunidade', meu_pedido: false, localizacao_aproximada: true };
    apiResponse = async () => ({ data: { ocorrencias: volunteer ? [own, publicItem] : [own], perfil: { eh_voluntario: volunteer } } });
    render(Home); effects.forEach(fn => fn()); await tick();
    const view = nodes(render(Home));
    assert.equal(view.filter(n => n.type === 'Marker' && n.props.title !== 'Você está aqui').length, 1, 'Coordenadas coincidentes agrupadas sem deslocamento');
    assert.equal(view.some(n => n.props?.children === 'Disponíveis'), volunteer);
    if(volunteer){view.find(n=>n.type==='Marker'&&n.props.title==='2 pedidos neste ponto').props.onPress();assert.equal(states[11].length,2)}
    view.find(n=>n.props?.accessibilityRole==='tab'&&nodes(n).some(t=>t.props?.children===(volunteer?'Pedidos':'Meus pedidos e histórico'))).props.onPress();
    assert.equal(states[9],'meus');
  }
  reset();
  apiResponse = async () => ({ data: { ocorrencias: [{ ...item, status: 'finalizada' }] } });
  // Uma resposta atrasada da sessão anterior não pode repovoar o mapa.
  reset();
  let finishOldRequest;
  apiResponse = () => new Promise(resolve => { finishOldRequest = resolve; });
  render(Home);
  const focus = effects.at(-1);
  const leave = focus();
  const signal = calls.at(-1)[2].signal;
  leave();
  assert.equal(signal.aborted, true);
  assert.equal(states[3].length, 0);
  assert.equal(states[4], null);
  assert.equal(states[8], null);
  finishOldRequest({ data: { ocorrencias: [item], perfil: { eh_voluntario: true } } });
  await tick();
  assert.equal(states[3].length, 0, 'Resposta da sessão encerrada é descartada');
  apiResponse = async () => ({ data: { ocorrencias: [], perfil: { eh_voluntario: false } } });
  const leaveNew = focus(); await tick();
  assert.equal(states[3].length, 0, 'Nova sessão comum sem pedidos mantém mapa vazio');
  assert.equal(states[8].eh_voluntario, false);
  leaveNew();
  apiResponse = async () => ({ data: { ocorrencias: [{ ...item, meu_pedido: true }], perfil: { eh_voluntario: false } } });
  focus(); await tick();
  assert.equal(states[3][0].id_ocorrencia, 99, 'Retorno ao foco consulta pedidos novamente');
  reset();
  apiResponse = async () => ({ data: { ocorrencias: [{ ...item, status: 'finalizada' }] } });
  const Mine = load('screens/PedidosScreen').MeusPedidosScreen;
  render(Mine); effects.forEach(fn => fn()); await tick();
  assert.equal(calls[0][2].params.escopo, 'meus');
  assert(nodes(render(Mine)).some(n => n.props?.title === 'Ver detalhes'));
  reset();
  const Details = load('screens/PedidosScreen').PedidoDetalhesScreen;
  apiResponse = async () => ({ data: { ocorrencia: { ...item, localizacao_aproximada: true, descricao_restrita: true, endereco_disponivel: false, descricao: null, endereco_referencia: null } } });
  render(Details, { route: { params: { id_ocorrencia: 100 } } }); effects.forEach(fn => fn()); await tick();
  assert(JSON.stringify(render(Details, { route: { params: { id_ocorrencia: 100 } } })).includes('Endereço protegido'));
  reset();
  let gpsCalls=0,resolvePoll;
  location.getForegroundPermissionsAsync=async()=>({status:'granted'});
  location.getCurrentPositionAsync=async()=>{gpsCalls++;return {coords:{latitude:-29.8,longitude:-51.1}}};
  apiResponse=async()=>({data:{ocorrencias:[item],perfil:{eh_voluntario:true}}});
  render(Home);const cleanups=effects.map(fn=>fn());await tick();
  assert.equal(gpsCalls,1);assert.equal(states[0].latitude,-29.8);
  let mapView=nodes(render(Home)).find(n=>n.type==='MapView');
  assert(mapView);assert(!('region' in mapView.props),'Câmera não é controlada por cada render');
  mapView.props.onRegionChangeComplete({latitude:-28,longitude:-50,latitudeDelta:.1,longitudeDelta:.1});
  const poll=intervals.at(-1), count=calls.filter(c=>c[0]==='get').length;
  apiResponse=()=>new Promise(r=>{resolvePoll=r});poll();poll();await tick();
  assert.equal(calls.filter(c=>c[0]==='get').length,count+1,'Não sobrepõe consultas');
  assert.equal(states[3].length,1,'Não esvazia marcadores durante polling');assert.equal(states[8].eh_voluntario,true);
  resolvePoll({data:{ocorrencias:[item,{...item,id_ocorrencia:100,latitude:NaN}],perfil:{eh_voluntario:true}}});await tick();
  assert.equal(states[3].length,1,'Coordenada inválida não chega ao MapView');assert.equal(states[0].latitude,-28);assert.equal(gpsCalls,1);
  apiResponse=async()=>{throw Error('offline')};await poll();await tick();assert.equal(states[3].length,1);assert(states[6]);
  native.AppState.currentState='background';const before=calls.length;await poll();assert.equal(calls.length,before);
  native.AppState.currentState='active';apiResponse=async()=>({data:{ocorrencias:[item],perfil:{eh_voluntario:true}}});appListeners.forEach(fn=>fn('active'));await tick();assert.equal(gpsCalls,1,'Voltar ao app não repete GPS válido');
  cleanups.forEach(fn=>fn?.());assert.equal(intervals.length,0);assert.equal(appListeners.length,0);assert.equal(states[3].length,0);

  // New address controls: reverse lookup is a suggestion, confirmation is explicit.
  const {default:Editor,addressReady,addressPayload}=load('components/AddressEditor');
  for(const fail of [false,true]){
    reset();let value=null;
    location.reverseGeocodeAsync=async()=>{if(fail)throw Error('offline');return[{street:'Rua sugerida',district:'Centro',city:'Teste',region:'RS',postalCode:'93000-000'}]};
    const props={position:{latitude:-30,longitude:-51},value,onChange:v=>{value=v}};
    render(Editor,props);const dispose=effects[0]();await tick();
    assert.equal(value.latitude,-30);assert.equal(value.confirmed,false);assert(!addressReady(value));
    if(!fail)assert.equal(value.rua,'Rua sugerida');else assert(states[0].includes('manualmente'));
    value={...value,rua:'Rua teste',numero:'1',bairro:'Centro',cidade:'Teste',estado:'RS'};
    let editor=nodes(render(Editor,{...props,value}));editor.find(n=>n.props?.title==='Confirmar endereço e ponto no mapa').props.onPress();assert(addressReady(value));assert(!('confirmed' in addressPayload(value)));
    editor=nodes(render(Editor,{...props,value}));editor.find(n=>n.props?.accessibilityLabel==='Rua').props.onChangeText('Outra rua');assert.equal(value.confirmed,false);dispose();
  }
  reset();const Track=load('screens/AcompanhamentoScreen').default;const trackProps={route:{params:{id_ocorrencia:99}}};
  apiResponse=async()=>({data:{ocorrencia:{...item,status:'em_atendimento',descricao_publica:'Resumo',endereco_disponivel:true,descricao:'PRIVADO_TESTE',acompanhamento:{pode_cancelar:true}}}});
  render(Track,trackProps);effects.at(-1)();await tick();let track=render(Track,trackProps);assert(JSON.stringify(track).includes('PRIVADO_TESTE'));nodes(track).find(n=>n.props?.title==='Cancelar pedido').props.onPress();assert(!calls.some(c=>c[0]==='post'),'Cancelamento requer confirmação');
  apiResponse=async()=>({data:{ocorrencia:{...item,status:'em_atendimento',descricao_publica:'Resumo',endereco_disponivel:false,descricao:null,acompanhamento:{}}}});
  effects.at(-1)();await tick();assert(!JSON.stringify(render(Track,trackProps)).includes('PRIVADO_TESTE'),'Revogação remove conteúdo privado');
  reset();const Account=load('screens/ContaComplementosScreen').default;
 apiResponse=async()=>({data:{contatos:[{id_contato:1,nome:'Privado teste',telefone:'51999999999',parentesco:'Amigo'}]}});
 render(Account,{route:{name:'ContatosEmergencia'}});effects[0]();await tick();let accountTree=render(Account,{route:{name:'ContatosEmergencia'}});assert(JSON.stringify(accountTree).includes('Privado teste'));nodes(accountTree).find(n=>n.props?.title==='Remover contato').props.onPress();assert(!calls.some(c=>c[0]==='delete'));assert(alerts.length);
 reset();const Public=load('screens/PerfilVoluntarioScreen').default;apiResponse=async()=>({data:{perfil:{primeiro_nome:'Ana',avaliacoes:0,media:null,atendimentos_concluidos:2}}});render(Public,{route:{params:{id_conversa:'test'}}});effects[0]();await tick();assert(JSON.stringify(render(Public,{route:{params:{id_conversa:'test'}}})).includes('Ainda sem avaliações.'));
 console.log('PASS: contatos renderizados com confirmação de exclusão; perfil público sem avaliação fictícia.');
 console.log('PASS: geocodificação/erro, confirmação e alteração de endereço; acompanhamento remove dados revogados e confirma cancelamento.');
  console.log('PASS: polling mantém câmera, mapa e marcadores; falha de API, coordenadas inválidas, segundo plano, limpeza e GPS sem chamadas repetidas.');
  console.log('PASS: regressões de conta/GPS/chat; 24 rotas; formulário, GPS, clique duplicado, POST, refresh GET, centralização, Marker/detalhes, erro de rede e separação Solicitar ajuda/SOS. Serviços nativos/API simulados.');
})().catch(error => { console.error(error); process.exitCode = 1; });

