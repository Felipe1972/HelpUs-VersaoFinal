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
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} onPress={onPress} disabled={disabled} style={{ flexGrow: 1, flexBasis: '42%', minHeight: 48, padding: 12, borderRadius: 14, borderWidth: selected ? 2 : 1, borderColor: selected ? color : colors.line, backgroundColor: selected ? '#EAF2FF' : 'white', justifyContent: 'center', opacity: disabled ? 0.6 : 1 }}><Text style={{ color: colors.ink, fontWeight: selected ? '800' : '500', fontSize: 15 }}>{selected ? '✓ ' : ''}{title}</Text></Pressable>;
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
    if (busy.current || !position || locating || !type || !description.trim() || created) return;
    if (position.source === 'lastKnown' && Date.now() - position.timestamp > 120000) { setPosition(null); setLocationError('A última posição ficou antiga. Obtenha a localização novamente.'); return; }
    busy.current = true; setSending(true); setError('');
    try {
      const { data } = await api.post('/ocorrencias', { id_tipo: type, descricao: description.trim(), nivel_urgencia: urgency, latitude: position.latitude, longitude: position.longitude, endereco_referencia: reference.trim() || null });
      requestPedidoRefresh(data.ocorrencia.id_ocorrencia);
      if (alive.current) setCreated(data.ocorrencia);
    } catch (failure) {
      if (!alive.current) return;
      if (!await sessionError(failure, navigation)) setError(!failure.response ? 'A confirmação não chegou. Confira o mapa antes de reenviar o pedido.' : failure.response.data?.mensagem || 'Não foi possível criar o pedido.');
    } finally { busy.current = false; if (alive.current) setSending(false); }
  }
  return <Screen title="Precisa de ajuda?" navigation={navigation} back active="Home">
    {created ? <Card style={{ gap: 16 }}><Text style={ui.title}>Pedido criado com sucesso.</Text><Text style={ui.subtitle}>Seu pedido foi salvo e está disponível no mapa para outros usuários.</Text><Button title="Ver detalhes" onPress={() => navigation.navigate('OcorrenciaDetalhes', { id_ocorrencia: created.id_ocorrencia })} /><Button title="Voltar ao mapa" tone="soft" onPress={() => goMain(navigation, 'Home')} /></Card> : <Card style={{ gap: 12 }}>
      <Text style={ui.title}>Conte o que aconteceu</Text><Text style={ui.subtitle}>Escolha a ajuda necessária e confirme sua localização.</Text>
      <Text style={ui.label}>Tipo de ajuda</Text>
      {!options && !optionsError && <><ActivityIndicator color={colors.blue} /><Text>Carregando tipos…</Text></>}
      {!!optionsError && <><Text style={ui.subtitle}>{optionsError}</Text><Button title="Carregar tipos novamente" onPress={() => setAttempt(v => v + 1)} /></>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options?.tipos.map(item => <Choice key={item.id_tipo} title={item.nome} selected={type === item.id_tipo} disabled={sending} onPress={() => setType(item.id_tipo)} />)}</View>
      {options && !options.tipos.length && <Text style={ui.subtitle}>Nenhum tipo disponível.</Text>}
      <Text style={ui.label}>Urgência</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options?.urgencias.map(value => <Choice key={value} title={urgencyLabels[value]} color={urgencyColors[value]} selected={urgency === value} disabled={sending} onPress={() => setUrgency(value)} />)}</View><Text style={[ui.subtitle, { color: urgencyColors[urgency] }]}>{urgencyLabels[urgency]} — {urgencyHelp[urgency]}</Text>
      <Text style={ui.label}>Descrição</Text><TextInput accessibilityLabel="Descrição do pedido" style={[ui.input, { minHeight: 120, textAlignVertical: 'top' }]} multiline maxLength={2000} editable={!sending} value={description} onChangeText={setDescription} placeholder="De que ajuda você precisa?" /><Text style={ui.subtitle}>{description.length}/2000</Text>
      <Text style={ui.label}>Endereço ou referência (opcional)</Text><TextInput accessibilityLabel="Endereço ou referência" style={ui.input} maxLength={255} editable={!sending} value={reference} onChangeText={setReference} placeholder="Rua, número, apartamento ou ponto de referência" multiline />
      <Text accessibilityLiveRegion="polite" style={ui.subtitle}>{locating ? 'Obtendo localização…' : position ? position.source === 'lastKnown' ? 'Última posição conhecida (até 2 minutos; precisão de até 100 m). Confirme que ainda está nesse local antes de enviar.' : 'Localização atual obtida' : locationError}</Text>
      {position && <Text style={[ui.subtitle, { fontSize: 12 }]}>{position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}</Text>}
      <Button title="Obter localização novamente" tone="soft" disabled={locating || sending} onPress={locate} />
      {!!error && <Text accessibilityLiveRegion="polite" style={ui.subtitle}>{error}</Text>}
      <Button title={sending ? 'Enviando pedido…' : 'Criar pedido de ajuda'} disabled={sending || locating || !position || !type || !options || !description.trim()} onPress={submit} />
    </Card>}
  </Screen>;
}

export function PedidoDetalhesScreen({ navigation, route }) {
  const [item, setItem] = useState(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const id = route.params.id_ocorrencia;
  useFocusEffect(useCallback(() => {
    const abort = new AbortController(); setItem(null); setError('');
    api.get(`/ocorrencias/${id}`, { signal: abort.signal }).then(({ data }) => { if (!abort.signal.aborted) setItem(data.ocorrencia); }).catch(async failure => {
      if (!abort.signal.aborted && !await sessionError(failure, navigation)) setError(failure.response?.data?.mensagem || 'Não foi possível carregar o pedido.');
    });
    return () => abort.abort();
  }, [id, attempt, navigation]));
  return <Screen title="Pedido de ajuda" navigation={navigation} back active="Home">
    {!item && !error && <ActivityIndicator color={colors.blue} />}
    {!!error && <Card><Text style={ui.subtitle}>{error}</Text><Button title="Tentar novamente" onPress={() => setAttempt(v => v + 1)} /></Card>}
    {item && <Card style={{ gap: 16 }}><Text style={ui.title}>{item.titulo}</Text><Text style={[ui.subtitle, { color: urgencyColors[item.nivel_urgencia] }]}>{item.nome_tipo} · Urgência {urgencyLabels[item.nivel_urgencia]}</Text><Text style={ui.label}>Status: {item.status === 'em_atendimento' ? 'Em atendimento' : item.status}</Text><Text style={ui.subtitle}>{item.descricao}</Text><Text style={ui.label}>Endereço / Referência</Text><Text style={ui.subtitle}>{item.endereco_referencia || 'Referência não informada. Consulte as coordenadas abaixo.'}</Text><Text style={[ui.subtitle, { fontSize: 12 }]}>Coordenadas: {item.latitude?.toFixed(5) ?? 'indisponível'}, {item.longitude?.toFixed(5) ?? 'indisponível'}</Text><Text style={ui.subtitle}>Criado em {new Date(item.criada_em).toLocaleString('pt-BR')}</Text><Button title="Voltar ao mapa" onPress={() => goMain(navigation, 'Home')} /></Card>}
  </Screen>;
}
