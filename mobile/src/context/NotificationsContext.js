import { reconcileReminders } from '../services/reminders';
import { createContext,useContext,useEffect,useRef,useState } from 'react';
import { Alert,AppState,Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { createNavigationContainerRef } from '@react-navigation/native';
import api from '../services/api';
import { buscarUsuarioSalvo,subscribeSession } from '../services/authStorage';
import { notificationBatch,notificationContent } from '../services/notificationPolicy';

export const notificationNavigation=createNavigationContainerRef();
let navigationListener=()=>{};
export function notificationNavigationChanged(){navigationListener()}
const Context=createContext({unread:0,refresh:async()=>{},open:async()=>{},permission:'Não consultada'});
export const useNotifications=()=>useContext(Context);
let foregroundAccount=null;
Notifications.setNotificationHandler({handleNotification:async n=>{
 const allowed=(AppState.currentState==='active'||n.request.content.data?.tipo==='lembrete')&&n.request.content.data?.accountId===foregroundAccount;
 return{shouldShowBanner:allowed,shouldShowList:allowed,shouldPlaySound:allowed,shouldSetBadge:false};
}});
const PERMISSION_KEY='@helpus:notifications:permission-requested';
export async function notificationPermission(request=false){
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('helpus-events',{name:'Pedidos e atendimentos',importance:Notifications.AndroidImportance.HIGH});
 let result=await Notifications.getPermissionsAsync();
 if(request&&result.status==='undetermined'&&result.canAskAgain&&!(await AsyncStorage.getItem(PERMISSION_KEY))){
  await AsyncStorage.setItem(PERMISSION_KEY,'1');
  result=await Notifications.requestPermissionsAsync();
 }
 return result.granted||result.ios?.status===Notifications.IosAuthorizationStatus?.PROVISIONAL?'Autorizadas':result.status==='denied'?'Não autorizadas':'Não autorizadas ou ainda não solicitadas';
}
export function NotificationsProvider({children}){
 const [unread,setUnread]=useState(0),[permission,setPermission]=useState('Não consultada');
 const [chatUnread,setChatUnread]=useState(0);
 const state=useRef({user:null,generation:0,busy:false,pending:null,opening:false,alive:true,candidate:null,cleanup:Promise.resolve()});
 const refreshRef=useRef(()=>{});
 const ready=()=>notificationNavigation.isReady();
 const route=()=>ready()?notificationNavigation.getCurrentRoute():null;
 const loggedRoute=()=>route()&&!['Login','Cadastro','RecuperarSenha'].includes(route().name);
 async function open(data){
  const s=state.current,uid=s.user?.id_usuario,generation=s.generation;
  if(!uid||!ready()||AppState.currentState!=='active'){s.pending=data;return}
  if(Number(data.accountId)!==uid){s.pending=null;return}
  if(s.opening)return;
  s.opening=true;s.pending=null;
  try{
   if(data.tipo!=='lembrete')await api.post('/notificacoes/'+data.id_notificacao+'/lida');
   if(s.generation!==generation||!s.alive)return;
   const response=await api.get(data.tipo==='lembrete'?'/lembretes/'+data.id_atendimento+'/abrir':'/notificacoes/'+data.id_notificacao+'/abrir');
   if(s.generation!==generation||!s.alive)return;
   const destination=response.data;
   if(!['Chat','Conversas','Acompanhamento','OcorrenciaDetalhes'].includes(destination.tela))throw Error('Destino inválido');
   if(!loggedRoute())notificationNavigation.resetRoot({index:1,routes:[{name:'Home'},{name:destination.tela,params:destination.params}]});
   else notificationNavigation.navigate(destination.tela,destination.params);
   void refreshRef.current();
  }catch(e){if(s.generation===generation&&s.alive)Alert.alert('Aviso indisponível',e.response?.status===401?'Entre novamente na sua conta para consultar este aviso.':'Não foi possível abrir. O acesso pode ter mudado; consulte seus avisos ou tente novamente.');}
  finally{s.opening=false;if(s.generation===generation)void refreshRef.current()}
 }
 async function refresh(){
  const s=state.current,uid=s.user?.id_usuario,generation=s.generation;
  if(!uid||s.busy||!loggedRoute()||AppState.currentState!=='active')return;
  s.busy=true;
  try{
   const {data}=await api.get('/notificacoes');
   if(s.generation!==generation||!s.alive)return;
   setUnread(data.nao_lidas||0);
   try{const chats=await api.get('/conversas');if(s.generation===generation)setChatUnread(chats.data.conversas.reduce((sum,c)=>sum+(c.nao_lidas||0),0))}catch{}
   if(s.generation!==generation)return;
   const key='@helpus:notifications:cursor:'+uid;
   const saved=await AsyncStorage.getItem(key);
   if(s.generation!==generation)return;
   const activeChat=route()?.name==='Chat'?route().params?.id_conversa:null;
   const batch=notificationBatch(data.notificacoes,saved===null?null:Number(saved),Date.now(),activeChat);
   // Reservar antes de apresentar impede repetição após falha/reabertura.
   await AsyncStorage.setItem(key,String(batch.cursor));
   if(s.generation!==generation)return;
   const status=await notificationPermission(true);
   if(s.generation!==generation)return;
   setPermission(status);
   try{const reminders=await api.get('/lembretes');if(s.generation===generation)await reconcileReminders(Notifications,uid,reminders.data.lembretes,status==='Autorizadas',()=>s.alive&&s.generation===generation)}catch{/* Não remover lembretes em falha de rede. */}
   if(status!=='Autorizadas')return;
   for(const n of batch.show){
    if(s.generation!==generation||AppState.currentState!=='active')break;
    const current=route();
    if(n.tipo==='mensagem'&&current?.name==='Chat'&&current.params?.id_conversa===n.id_conversa)continue;
    const identifier=await Notifications.scheduleNotificationAsync({identifier:'helpus-'+uid+'-'+n.id_notificacao,content:notificationContent(n,uid),trigger:Platform.OS==='android'?{channelId:'helpus-events'}:null});
    if(s.generation!==generation){await Notifications.dismissNotificationAsync(identifier);await Notifications.cancelScheduledNotificationAsync(identifier)}
   }
  }catch(e){if(s.generation===generation&&[401,403].includes(e.response?.status)){setUnread(0);setChatUnread(0);s.user=null;foregroundAccount=null;await Notifications.cancelAllScheduledNotificationsAsync().catch(()=>{})}}
  finally{s.busy=false}
 }
 refreshRef.current=refresh;
 useEffect(()=>{
  const s=state.current;s.alive=true;
  async function session(user,initial=false,reason){
   s.candidate=user;
   const generation=++s.generation;s.user=null;foregroundAccount=null;setUnread(0);setChatUnread(0);
   if(reason==='logout')s.pending=null;
   if(!initial)s.cleanup=s.cleanup.then(async()=>{await Notifications.dismissAllNotificationsAsync().catch(()=>{});await Notifications.cancelAllScheduledNotificationsAsync().catch(()=>{})});
   await s.cleanup;
   if(!user||!s.alive||s.generation!==generation)return;
   try{
    const {data}=await api.get('/usuarios/me');
    if(!s.alive||s.generation!==generation||data.usuario.id_usuario!==user.id_usuario)return;
    s.user=data.usuario;foregroundAccount=user.id_usuario;
    if(s.pending)void open(s.pending);
    void refreshRef.current();
   }catch{ /* Login continua disponível se a API estiver fora do ar. */ }
  }
  const unsubscribe=subscribeSession((user,reason)=>{void session(user,false,reason)});
  buscarUsuarioSalvo().then(u=>{if(s.generation===0)void session(u,true)}).catch(()=>{});
  function response(r){const d=r?.notification?.request?.content?.data;if(d?.source==='helpus'){s.pending=d;void open(d);Notifications.clearLastNotificationResponse()}}
  const sub=Notifications.addNotificationResponseReceivedListener(response);
  response(Notifications.getLastNotificationResponse());
  navigationListener=()=>{if(s.pending)void open(s.pending);void refreshRef.current()};
  const app=AppState.addEventListener('change',status=>{if(status==='active'){if(s.pending)void open(s.pending);void refreshRef.current()}});
  const timer=setInterval(()=>{if(!s.user&&s.candidate&&AppState.currentState==='active')void session(s.candidate,true);else void refreshRef.current()},15000);
  return()=>{s.alive=false;s.generation++;foregroundAccount=null;unsubscribe();sub.remove();app.remove();clearInterval(timer);navigationListener=()=>{}};
 },[]);
 return <Context.Provider value={{unread,chatUnread,permission,refresh,open: n=>open({...n,accountId:state.current.user?.id_usuario})}}>{children}</Context.Provider>;
}
