import { statusLabel } from '../services/statusLabels';
import AddressEditor, { addressReady, addressPayload } from '../components/AddressEditor';
import SchedulePicker, { schedulePayload } from '../components/SchedulePicker';
import usePollingRefresh from '../hooks/usePollingRefresh';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Text, TextInput, View, ActivityIndicator, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import api from '../services/api';
import { limparSessao } from '../services/authStorage';
import { Screen, Card, Button, ui, colors, goMain } from '../components/UI';
import { obtainLocation } from '../services/pedidoLocation';
import { requestPedidoRefresh } from '../services/pedidoRefresh';

export const urgencyLabels = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
export const urgencyColors = { baixa: '#21855B', media: '#B47700', alta: '#D32F2F' };
const urgencyHelp = { baixa: 'Ajuda que pode esperar.', media: 'Precisa de ajuda em breve.', alta: 'Precisa de atenção rápida.' };
function Choice({ title, selected, onPress, disabled, color = colors.blue }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} onPress={onPress} disabled={disabled} style={{ flexGrow: 1, flexBasis: '42%', minHeight: 48, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: selected ? color : colors.line, backgroundColor: selected ? '#EAF2FF' : 'white', justifyContent: 'center', opacity: disabled ? 0.6 : 1 }}><Text style={{ color: colors.ink, fontWeight: selected ? '800' : '500', fontSize: 15 }}>{title}</Text></Pressable>;
}
export async function sessionError(error, navigation) {
  if (error.response?.status !== 401) return false;
  await limparSessao(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); return true;
}
export default function PedidosScreen({ navigation }) {
  const [options, setOptions] = useState(null), [optionsError, setOptionsError] = useState('');
  const [attempt, setAttempt] = useState(0), [type, setType] = useState(null), [urgency, setUrgency] = useState('media');
  const [description, setDescription] = useState(''), [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(false), [locationError, setLocationError] = useState('');
  const [sending, setSending] = useState(false), [error, setError] = useState(''), [created, setCreated] = useState(null);
  const [reference, setReference] = useState('');
  const [publicText,setPublicText]=useState(''),[schedule,setSchedule]=useState({mode:'agora',date:'',hour:'12',minute:'00'});
  const [address,setAddress]=useState(null),[saveAddress,setSaveAddress]=useState(false);
  const alive = useRef(true), busy = useRef(false), locationRun = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; locationRun.current++; }; }, []);
  useEffect(() => {
    const abort = new AbortController(); setOptionsError(''); setOptions(null);
    api.get('/tipos-ocorrencia', { signal: abort.signal }).then(({ data }) => { if (!abort.signal.aborted) setOptions(data); }).catch(async failure => {
      if (abort.signal.aborted) return;
      if (!await sessionError(failure, navigation)) setOptionsError('Não foi possível carregar os tipos.');
    });
    return () => abort.abort();
  }, [attempt, navigation]);
  async function locate() {
    const run = ++locationRun.current; setLocating(true); setPosition(null); setLocationError('');
    try {
      const result = await obtainLocation(Location);
      if (alive.current && run === locationRun.current) setPosition(result);
    } catch (failure) {
      if (alive.current && run === locationRun.current) setLocationError(failure.message || 'Não foi possível obter a localização.');
    } finally { if (alive.current && run === locationRun.current) setLocating(false); }
  }
  useEffect(() => { locate(); }, []);
  async function submit() {
    if (busy.current || !addressReady(address) || locating || !type || !description.trim() || created) return;
    if (position?.source === 'lastKnown' && address.latitude===position.latitude && address.longitude===position.longitude && Date.now() - position.timestamp > 120000) { setPosition(null); setLocationError('A última posição ficou antiga. Obtenha a localização novamente.'); return; }
    busy.current = true; setSending(true); setError('');
    try {
      const { data } = await api.post('/ocorrencias', { ...schedulePayload(schedule), descricao_publica: publicText.trim(), id_tipo: type, descricao: description.trim(), nivel_urgencia: urgency, latitude: address.latitude, longitude: address.longitude, endereco:addressPayload(address), endereco_referencia: address.referencia?.trim() || null });
      requestPedidoRefresh(data.ocorrencia.id_ocorrencia);
      if (alive.current) setCreated(data.ocorrencia);
      if(saveAddress){try{await api.put('/meu-endereco',addressPayload(address))}catch{if(alive.current)setError('Pedido criado. Não foi possível salvar o endereço no perfil.')}}
    } catch (failure) {
      if (!alive.current) return;
      if (!await sessionError(failure, navigation)) setError(failure.message?.includes('horário')?failure.message:!failure.response ? 'A confirmação não chegou. Confira o mapa antes de reenviar o pedido.' : failure.response.data?.mensagem || 'Não foi possível criar o pedido.');
    } finally { busy.current = false; if (alive.current) setSending(false); }
  }
  return <Screen title="Precisa de ajuda?" navigation={navigation} back active="Home">
    {created ? <Card style={{ gap: 16 }}><Text style={ui.title}>Pedido criado com sucesso.</Text>{!!error&&<Text style={ui.subtitle}>{error}</Text>}<Text style={ui.subtitle}>Seu pedido foi salvo. Voluntários podem consultar os dados públicos e a localização aproximada.</Text><Button title="Ver detalhes" onPress={() => navigation.navigate('OcorrenciaDetalhes', { id_ocorrencia: created.id_ocorrencia })} /><Button title="Voltar ao mapa" tone="soft" onPress={() => goMain(navigation, 'Home')} /></Card> : <Card style={{ gap: 12 }}>
      <Text style={ui.title}>Conte o que aconteceu</Text><Text style={ui.subtitle}>Escolha a ajuda necessária e confirme sua localização.</Text>
      <Text style={ui.label}>Tipo de ajuda</Text>
      {!options && !optionsError && <><ActivityIndicator color={colors.blue} /><Text>Carregando tipos…</Text></>}
      {!!optionsError && <><Text style={ui.subtitle}>{optionsError}</Text><Button title="Carregar tipos novamente" onPress={() => setAttempt(v => v + 1)} /></>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options?.tipos.map(item => <Choice key={item.id_tipo} title={item.nome} selected={type === item.id_tipo} disabled={sending} onPress={() => setType(item.id_tipo)} />)}</View>
      {options && !options.tipos.length && <Text style={ui.subtitle}>Nenhum tipo disponível.</Text>}
      <Text style={ui.label}>Urgência</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options?.urgencias.map(value => <Choice key={value} title={urgencyLabels[value]} color={urgencyColors[value]} selected={urgency === value} disabled={sending} onPress={() => setUrgency(value)} />)}</View><Text style={[ui.subtitle, { color: urgencyColors[urgency] }]}>{urgencyLabels[urgency]} — {urgencyHelp[urgency]}</Text>
      <Text style={ui.label}>Resumo público</Text><Text style={ui.subtitle}>Visível aos voluntários. Não inclua nome, telefone ou endereço.</Text><TextInput accessibilityLabel="Resumo público" style={ui.input} multiline maxLength={500} value={publicText} onChangeText={setPublicText} editable={!sending}/><SchedulePicker value={schedule} onChange={setSchedule} disabled={sending}/>
      <Text style={ui.label}>Descrição</Text><Text style={ui.subtitle}>A descrição completa e o endereço serão mostrados ao responsável somente se você autorizar o compartilhamento.</Text><TextInput accessibilityLabel="Descrição do pedido" style={[ui.input, { minHeight: 120, textAlignVertical: 'top' }]} multiline maxLength={2000} editable={!sending} value={description} onChangeText={setDescription} placeholder="De que ajuda você precisa?" /><Text style={ui.subtitle}>{description.length}/2000</Text>
      <AddressEditor position={position} value={address} onChange={setAddress} disabled={sending}/>
      <Pressable accessibilityRole="switch" accessibilityState={{checked:saveAddress}} disabled={sending} onPress={()=>setSaveAddress(v=>!v)} style={{minHeight:48,padding:12,borderWidth:1,borderColor:saveAddress?colors.blue:colors.line,borderRadius:12}}><Text>Salvar também no meu perfil: {saveAddress?'Sim':'Não'}</Text></Pressable>
      <Text accessibilityLiveRegion="polite" style={ui.subtitle}>{locating ? 'Obtendo localização…' : position ? position.source === 'lastKnown' ? 'Última posição conhecida (até 2 minutos; precisão de até 100 m). Confirme que ainda está nesse local antes de enviar.' : 'Localização atual obtida' : locationError}</Text>
      {position && <Text style={[ui.subtitle, { fontSize: 12 }]}>{position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}</Text>}
      <Button title="Obter localização novamente" tone="soft" disabled={locating || sending} onPress={locate} />
      {!!error && <Text accessibilityLiveRegion="polite" style={ui.subtitle}>{error}</Text>}
      <Button title={sending ? 'Enviando pedido…' : 'Criar pedido de ajuda'} disabled={sending || locating || !addressReady(address) || !type || !options || !description.trim() || !publicText.trim()} onPress={submit} />
    </Card>}
  </Screen>;
}

export function PedidoDetalhesScreen({ navigation, route }) {
  const [item, setItem] = useState(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  usePollingRefresh(setAttempt);
  const [acting,setActing]=useState(false),[position,setPosition]=useState(null),[actionError,setActionError]=useState('');
  const actionLock=useRef(false);
  useEffect(()=>{let alive=true;obtainLocation(Location).then(p=>{if(alive)setPosition(p)}).catch(()=>{});return()=>{alive=false}},[]);
  const id = route.params.id_ocorrencia;
  async function act(action){if(actionLock.current)return;actionLock.current=true;setActing(true);setActionError('');try{const {data}=await api.post('/ocorrencias/'+id+'/'+action);if(action==='aceitar')navigation.navigate('Acompanhamento',{id_ocorrencia:id});else if(data.id_conversa)navigation.navigate('Chat',{id_conversa:data.id_conversa});}catch(e){setActionError(e.response?.data?.mensagem||'Sem confirmação. Atualize o pedido antes de tentar novamente.')}finally{actionLock.current=false;setActing(false);setAttempt(v=>v+1)}}
  useFocusEffect(useCallback(() => {
    const abort = new AbortController(); setItem(null); setError('');
    api.get(`/ocorrencias/${id}`, { signal: abort.signal }).then(({ data }) => { if (!abort.signal.aborted) setItem(data.ocorrencia); }).catch(async failure => {
      if (!abort.signal.aborted && !await sessionError(failure, navigation)) setError(failure.response?.data?.mensagem || 'Não foi possível carregar o pedido.');
    });
    return () => abort.abort();
  }, [id, attempt, navigation]));
  return <Screen title="Pedido de ajuda" navigation={navigation} back active="Home">
    {!!actionError&&<Text accessibilityLiveRegion="polite" style={ui.subtitle}>{actionError}</Text>}
    {!item && !error && <ActivityIndicator color={colors.blue} />}
    {!!error && <Card><Text style={ui.subtitle}>{error}</Text><Button title="Tentar novamente" onPress={() => setAttempt(v => v + 1)} /></Card>}
    {item && <Card style={{ gap: 16 }}><Text style={ui.title}>{item.titulo}</Text><Text style={[ui.subtitle, { color: urgencyColors[item.nivel_urgencia] }]}>{item.nome_tipo} · Urgência {urgencyLabels[item.nivel_urgencia]}</Text><Text style={ui.label}>Status: {statusLabel(item.status)}</Text><Text style={ui.subtitle}>{item.descricao_restrita ? 'Descrição completa protegida até a autorização explícita do solicitante.' : item.descricao}</Text><Text style={ui.subtitle}>{item.descricao_publica}</Text><Text style={ui.label}>{item.modalidade_horario==='agendado'?'Agendado':item.modalidade_horario==='agora'?'Ajuda imediata':'Pedido anterior'} · {item.necessaria_em?new Date(item.necessaria_em).toLocaleString('pt-BR'):'Horário não informado'}</Text>{item.modalidade_horario==='agendado'&&new Date(item.necessaria_em)<new Date()&&<Text style={ui.subtitle}>Horário previsto já passou</Text>}<Text style={ui.subtitle}>{distanceLabel(position,item)}</Text><Text style={ui.label}>Endereço / Referência</Text><Text style={ui.subtitle}>{item.endereco_disponivel === false ? 'Endereço protegido. O solicitante precisa autorizar o compartilhamento com o responsável.' : item.endereco_referencia || 'Referência não informada.'}</Text><Text style={[ui.subtitle, { fontSize: 12 }]}>{item.localizacao_aproximada ? 'Localização aproximada (grade de cerca de 1 km)' : 'Localização do pedido'}: {item.latitude?.toFixed(5) ?? 'indisponível'}, {item.longitude?.toFixed(5) ?? 'indisponível'}</Text><Text style={ui.subtitle}>{item.meu_pedido ? 'Este pedido foi criado por você.' : item.recusado ? 'Você recusou este pedido.' : 'Atendimento da comunidade'}</Text><Text style={ui.subtitle}>Criado em {new Date(item.criada_em).toLocaleString('pt-BR')}</Text>{item.pode_aceitar&&<Button title="Aceitar pedido" disabled={acting} onPress={()=>act('aceitar')}/>}{item.pode_recusar&&<Button title="Recusar" tone="red" disabled={acting} onPress={()=>act('recusar')}/>}{item.pode_desfazer_recusa&&<Button title="Desfazer recusa" disabled={acting} onPress={()=>act('desfazer-recusa')}/>}{item.pode_conversar&&<Button title="Enviar mensagem" tone="soft" disabled={acting} onPress={()=>act('conversas')}/>}<Button title="Acompanhar pedido" tone="soft" onPress={()=>navigation.navigate('Acompanhamento',{id_ocorrencia:id})}/><Button title="Voltar ao mapa" onPress={() => goMain(navigation, 'Home')} /></Card>}
  </Screen>;
}

// Inclui pedidos próprios encerrados ou sem coordenadas, sem depender do mapa.
export function MeusPedidosScreen({ navigation, route }) {
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  usePollingRefresh(setAttempt);
  const scope=route?.params?.escopo||'meus';
  useFocusEffect(useCallback(() => {
    const abort = new AbortController(); setItems([]); setLoading(true); setError('');
    api.get('/ocorrencias', { params: { escopo: scope }, signal: abort.signal }).then(({ data }) => {
      if (!abort.signal.aborted) setItems(data.ocorrencias);
    }).catch(async failure => {
      if (!abort.signal.aborted && !await sessionError(failure, navigation)) setError(failure.response?.data?.mensagem || 'Não foi possível carregar seus pedidos.');
    }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => { abort.abort(); setItems([]); };
  }, [navigation, attempt, scope]));
  return <Screen title={scope==='assumidos'?'Atendimentos e histórico':scope==='recusados'?'Chamados recusados':'Meus pedidos'} navigation={navigation} back active="Home">
    <Button title="Solicitar ajuda" onPress={() => navigation.navigate('SolicitarAjuda')} />
    {loading && <ActivityIndicator color={colors.blue} />}
    {!!error && <Text accessibilityLiveRegion="polite" style={ui.subtitle}>{error}</Text>}
    {!loading && !error && !items.length && <Text style={ui.subtitle}>Você ainda não criou pedidos de ajuda.</Text>}
    {items.map(item => <Card key={item.id_ocorrencia} style={{ gap: 10 }}><Text style={ui.title}>{item.titulo}</Text><Text style={ui.subtitle}>{item.nome_tipo} · {urgencyLabels[item.nivel_urgencia]} · {statusLabel(item.status)}</Text>{item.necessaria_em&&<Text style={ui.subtitle}>{item.modalidade_horario==='agendado'?'Agendado':'Ajuda imediata'} · {new Date(item.necessaria_em).toLocaleString('pt-BR')}</Text>}<Button title="Ver detalhes" tone="soft" onPress={() => navigation.navigate('OcorrenciaDetalhes', { id_ocorrencia: item.id_ocorrencia })} /></Card>)}
    <Button title="Atualizar meus pedidos" disabled={loading} tone="soft" onPress={() => setAttempt(value => value + 1)} />
  </Screen>;
}

export function distanceLabel(p,o){if(!p||o.latitude==null||o.longitude==null)return 'Distância indisponível';const rad=x=>x*Math.PI/180;const a=Math.sin(rad(o.latitude-p.latitude)/2)**2+Math.cos(rad(p.latitude))*Math.cos(rad(o.latitude))*Math.sin(rad(o.longitude-p.longitude)/2)**2;const km=6371*2*Math.asin(Math.min(1,Math.sqrt(a)));return o.localizacao_aproximada?(km<1?'Menos de aproximadamente 1 km': 'Aproximadamente '+Math.round(km)+' km em linha reta'):'Distância em linha reta (não é rota): '+(km<1?Math.round(km*1000)+' m':km.toFixed(1)+' km');}
