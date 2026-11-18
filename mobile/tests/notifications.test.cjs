const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),babel=require('@babel/core');
const flush=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r))};
function harness({denied=false,cold=false}={}){
 const store=new Map(),scheduled=[],calls=[],intervals=[],effects=[],states=[],refs=[];let si=0,ri=0,subscription,response,appListener,me={id_usuario:7},permission={status:denied?'denied':'undetermined',canAskAgain:!denied,granted:false},requested=0;
 let items=[{id_notificacao:1,id_ocorrencia:10,tipo:'aceite',criada_em:new Date().toISOString(),lida_em:null}],override=null,current={name:cold?'Login':'Home'},context;
 const native={AppState:{currentState:'active',addEventListener:(_,fn)=>{appListener=fn;return{remove(){}}}},Platform:{OS:'android'},Alert:{alert:(...a)=>calls.push(['alert',...a])}};
 const nav={isReady:()=>true,getCurrentRoute:()=>current,navigate:(...a)=>{calls.push(['navigate',...a]);current={name:a[0],params:a[1]}},resetRoot:v=>{calls.push(['reset',v]);current=v.routes[v.index]}};
 const notifications={AndroidImportance:{HIGH:4},IosAuthorizationStatus:{PROVISIONAL:3},setNotificationHandler:v=>{notifications.handler=v},setNotificationChannelAsync:async()=>{},getPermissionsAsync:async()=>permission,requestPermissionsAsync:async()=>{requested++;permission={status:'granted',granted:true};return permission},getLastNotificationResponse:()=>cold?{notification:{request:{content:{data:{source:'helpus',accountId:7,id_notificacao:8}}}}}:null,clearLastNotificationResponse:()=>{},addNotificationResponseReceivedListener:fn=>{response=fn;return{remove(){}}},scheduleNotificationAsync:async n=>{scheduled.push(n);return n.identifier},dismissAllNotificationsAsync:async()=>{},cancelAllScheduledNotificationsAsync:async()=>{},dismissNotificationAsync:async()=>{},cancelScheduledNotificationAsync:async()=>{}};
 const api={get:async p=>{calls.push(['get',p]);if(p==='/usuarios/me')return{data:{usuario:me}};if(p==='/notificacoes')return override?override():{data:{notificacoes:items,nao_lidas:items.filter(n=>!n.lida_em).length}};if(p.endsWith('/abrir'))return{data:{tela:'Acompanhamento',params:{id_ocorrencia:10}}};throw Error(p)},post:async p=>{calls.push(['post',p]);return{data:{ok:true}}}};
 const react={createContext:()=>({Provider:'Provider'}),useContext:()=>context,useEffect:fn=>effects.push(fn),useRef:value=>refs[ri++]||(refs[ri-1]={current:value}),useState:value=>{const i=si++;if(!(i in states))states[i]=value;return[states[i],v=>{states[i]=v}]}};
 function load(relative){const file=path.resolve(__dirname,'../src',relative);const code=babel.transformSync(fs.readFileSync(file,'utf8'),{babelrc:false,configFile:false,plugins:[['@babel/plugin-transform-react-jsx',{runtime:'automatic'}],'@babel/plugin-transform-modules-commonjs']}).code;const module={exports:{}};const requireMock=n=>{
 if(n==='react')return react;if(n==='react/jsx-runtime')return{jsx:(type,props)=>({type,props})};if(n==='react-native')return native;if(n==='expo-notifications')return notifications;
 if(n==='@react-navigation/native')return{createNavigationContainerRef:()=>nav};if(n==='@react-native-async-storage/async-storage')return{getItem:async k=>store.has(k)?store.get(k):null,setItem:async(k,v)=>store.set(k,v)};
 if(n.endsWith('/authStorage'))return{buscarUsuarioSalvo:async()=>me,subscribeSession:fn=>{subscription=fn;return()=>{}}};if(n.endsWith('/api'))return{__esModule:true,default:api};if(n.endsWith('/reminders'))return{reconcileReminders:async()=>{}};if(n.endsWith('/notificationPolicy'))return load('services/notificationPolicy.js');throw Error(n)};
 vm.runInNewContext('(function(require,module,exports){'+code+'\n})',{console,Date,Promise,setInterval:fn=>{intervals.push(fn);return fn},clearInterval:()=>{}})(requireMock,module,module.exports);return module.exports;
 }
 const mod=load('context/NotificationsContext.js');
 return{mod,store,scheduled,calls,states,notifications,get requested(){return requested},setItems:v=>{items=v},setRoute:v=>{current=v},setOverride:v=>{override=v},tick:async()=>{intervals[0]();await flush()},background:()=>{native.AppState.currentState='background';appListener('background')},foreground:async()=>{native.AppState.currentState='active';appListener('active');await flush()},login:async id=>{subscription(null,'changing');me={id_usuario:id};subscription(me);await flush()},logout:()=>subscription(null,'logout'),tap:async d=>{response({notification:{request:{content:{data:{source:'helpus',...d}}}}});await flush()},mount:async()=>{si=ri=0;context=mod.NotificationsProvider({children:null}).props.value;effects[0]();await flush();return context}};
}
const notice=(id,tipo='aceite',conversation=null)=>({id_notificacao:id,id_ocorrencia:10,id_conversa:conversation,tipo,criada_em:new Date().toISOString(),lida_em:null});
test('permissão solicitada uma vez; negada continua sem apresentação',async()=>{
 const h=harness();await h.mount();assert.equal(h.requested,1);await h.mod.notificationPermission(true);assert.equal(h.requested,1);
 const denied=harness({denied:true});await denied.mount();denied.setItems([notice(2)]);await denied.tick();assert.equal(denied.requested,0);assert.equal(denied.scheduled.length,0);assert.equal(denied.states[0],1);
});
test('baseline sem spam, cursor persistido, deduplicação, chat aberto e segundo plano',async()=>{
 const h=harness();await h.mount();assert.equal(h.scheduled.length,0);
 h.setItems([notice(2)]);await h.tick();assert.equal(h.scheduled.length,1);await h.tick();assert.equal(h.scheduled.length,1);
 h.setRoute({name:'Chat',params:{id_conversa:'uuid'}});h.setItems([notice(3,'mensagem','uuid')]);await h.tick();assert.equal(h.scheduled.length,1);
 h.background();h.setRoute({name:'Home'});h.setItems([notice(4)]);await h.tick();assert.equal(h.scheduled.length,1);await h.foreground();assert.equal(h.scheduled.length,2);
 const content=h.scheduled[0].content;assert.equal(content.data.accountId,7);assert.equal(content.data.id_notificacao,2);assert(!JSON.stringify(content).includes('latitude'));
});
test('toque reautoriza na API; outra conta não abre; arranque frio recupera sessão',async()=>{
 const h=harness();await h.mount();await h.tap({accountId:7,id_notificacao:8});assert(h.calls.some(c=>c[0]==='get'&&c[1]==='/notificacoes/8/abrir'));assert(h.calls.some(c=>c[0]==='navigate'&&c[1]==='Acompanhamento'));
 const count=h.calls.length;await h.tap({accountId:99,id_notificacao:99});assert.equal(h.calls.length,count);
 const cold=harness({cold:true});await cold.mount();assert(cold.calls.some(c=>c[0]==='reset'&&c[1].routes[1].name==='Acompanhamento'));
});
test('logout descarta resposta em voo e troca de conta separa cursor e badge',async()=>{
 const h=harness();await h.mount();let resolve;h.setOverride(()=>new Promise(r=>{resolve=r}));const polling=h.tick();await flush();h.logout();resolve({data:{notificacoes:[notice(100)],nao_lidas:50}});await polling;assert.equal(h.scheduled.length,0);assert.equal(h.states[0],0);
 h.setOverride(null);h.setItems([notice(101)]);await h.login(9);assert.equal(h.scheduled.length,0);assert.equal(h.store.get('@helpus:notifications:cursor:9'),'101');assert.equal(h.store.get('@helpus:notifications:cursor:7'),'1');
});
