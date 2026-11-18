import { statusLabel } from '../services/statusLabels';
import usePollingRefresh from '../hooks/usePollingRefresh';
import { useCallback, useRef, useState } from 'react';
import { AppState, FlatList, ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Screen, Card, Button, ListRow, IconButton, ui, colors } from '../components/UI';
import api from '../services/api';
import { limparSessao } from '../services/authStorage';
import useChat from '../hooks/useChat';

export function ConversasScreen({ navigation, route }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  usePollingRefresh(setAttempt);
  useFocusEffect(useCallback(() => {
    let active = true;
    const abort = new AbortController();
    setLoading(true); setError('');
    api.get('/conversas', { signal: abort.signal }).then(({ data }) => {
      if (active) setConversations(data.conversas);
    }).catch(async failure => {
      if (!active) return;
      if (failure.response?.status === 401) {
        await limparSessao();
        if (active) navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        setConversations([]);
        setError(failure.response?.data?.mensagem || 'Não foi possível carregar suas conversas.');
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; abort.abort(); };
  }, [navigation, attempt]));
  return <Screen title="Conversas" navigation={navigation} active="Conversas">
    <Text style={ui.section}>{route?.params?.id_ocorrencia?'CONVERSAS DO PEDIDO #'+route.params.id_ocorrencia:'SUA COMUNIDADE'}</Text>{route?.params?.id_ocorrencia&&<Button title="Ver todas as conversas" tone="soft" onPress={()=>navigation.setParams({id_ocorrencia:undefined})}/>}
    {loading && <ActivityIndicator color={colors.blue} accessibilityLabel="Carregando conversas" />}
    {error ? <Card><Text style={ui.subtitle}>{error}</Text><Button style={{ marginTop: 12 }} title="Tentar novamente" onPress={() => setAttempt(value => value + 1)} /></Card> : conversations.filter(c=>!route?.params?.id_ocorrencia||c.id_ocorrencia===route.params.id_ocorrencia).map(conversation =>
      <ListRow key={conversation.id_conversa} icon="person-outline"
        title={conversation.interlocutor.nome+(conversation.nao_lidas?' · '+conversation.nao_lidas+' não lida(s)':'')}
        subtitle={'Pedido #'+conversation.id_ocorrencia+' · '+statusLabel(conversation.status)+' · '+conversation.titulo + (conversation.somente_leitura ? ' · Encerrada' : '') + '\n' + (conversation.ultima_mensagem?.texto || 'Inicie uma conversa')}
        onPress={() => navigation.navigate('Chat', { id_conversa: conversation.id_conversa })} />)}
    {!loading && !error && !conversations.length && <Card><Text style={[ui.title, { fontSize: 20, marginBottom: 8 }]}>Suas conversas aparecerão aqui</Text><Text style={ui.subtitle}>Voluntários podem iniciar contato nos pedidos disponíveis. As conversas aparecerão aqui.</Text></Card>}
  </Screen>;
}

export function ChatScreen({ navigation, route }) {
  const chat = useChat(navigation, route?.params?.id_conversa);
  const focused=useIsFocused();const visibleContext=useRef(null);visibleContext.current={focused,id:route?.params?.id_conversa};
  const readVisible=useRef(({viewableItems})=>{const c=visibleContext.current;if(!c?.focused||AppState.currentState!=='active')return;const ids=viewableItems.filter(v=>v.isViewable&&!v.item.minha).map(v=>v.item.id_mensagem);if(ids.length)api.post('/conversas/'+c.id+'/lidas',{ids}).catch(()=>{});}).current;
  const scroll = useRef(null);
  const scrollToBottom = useRef(true);
  const previousLast = useRef(null);
  const last = chat.messages[chat.messages.length - 1]?.id_mensagem;
  if (last !== previousLast.current) { previousLast.current = last; scrollToBottom.current = true; }
  const readOnly = chat.conversation?.somente_leitura;
  return <Screen title={chat.conversation?.interlocutor.nome || 'Conversa'} navigation={navigation} back active="Conversas" scroll={false}>
    <View style={{ padding: 14, gap: 6 }}>{chat.conversation?.id_ocorrencia&&<Button title={'Pedido #'+chat.conversation.id_ocorrencia+' · Acompanhar'} tone="soft" onPress={()=>navigation.navigate('Acompanhamento',{id_ocorrencia:chat.conversation.id_ocorrencia})}/>}
      <Text accessibilityLiveRegion="polite" style={[ui.subtitle, { textAlign: 'center', fontSize: 12 }]}>{chat.loading ? 'Carregando histórico…' : readOnly ? chat.conversation?.motivo_somente_leitura || 'Conversa encerrada · somente leitura' : chat.status}</Text>
      {chat.conversation?.status&&<Text style={ui.subtitle}>Status do pedido: {statusLabel(chat.conversation.status)}</Text>}
      {!!chat.error && <Text accessibilityLiveRegion="polite" style={[ui.subtitle, { fontSize: 12, textAlign: 'center' }]}>{chat.error}</Text>}
      {(chat.error || ['Desconectado', 'Erro de conexão'].includes(chat.status)) && <Button title="Tentar novamente" tone="soft" onPress={chat.retry} />}
    </View>
    <FlatList ref={scroll} data={chat.messages} keyExtractor={m=>String(m.id_mensagem)} onViewableItemsChanged={readVisible} viewabilityConfig={{itemVisiblePercentThreshold:50,minimumViewTime:500}} keyboardShouldPersistTaps="handled" contentContainerStyle={s.messages}
      onContentSizeChange={() => { if (scrollToBottom.current) { scroll.current?.scrollToEnd({ animated: true }); scrollToBottom.current = false; } }}
      ListHeaderComponent={<View>{chat.cursor && <Button title="Carregar anteriores" tone="soft" disabled={chat.loading} onPress={() => { scrollToBottom.current = false; chat.loadOlder(); }} />}
      <Text style={s.day}>{chat.conversation?.titulo || 'CONVERSA'}</Text>
      {!chat.loading && !chat.messages.length && !chat.error && <Text style={ui.subtitle}>Ainda não há mensagens nesta conversa.</Text>}
      </View>} renderItem={({item:message}) => {
        const mine = message.minha === true;
        return <View key={message.id_mensagem} style={[s.bubble, mine && s.mine]}>
          <Text style={[s.text, mine && { color: 'white' }]}>{message.texto}</Text>
          <Text style={[s.caption, mine && { color: '#DBEAFE' }]}>{mine ? 'Você' : chat.conversation?.interlocutor.nome} · {message.enviada_em ? new Date(message.enviada_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</Text>
        </View>;
      }} />
    <View style={s.composer}><TextInput accessibilityLabel="Mensagem" style={[ui.input, { flex: 1, maxHeight: 120 }]} placeholder={readOnly ? 'Conversa encerrada' : 'Escreva uma mensagem…'} placeholderTextColor={colors.muted} value={chat.draft} onChangeText={chat.setDraft} editable={!readOnly && !chat.sending} multiline maxLength={1000} />
      <IconButton name="send" label={chat.sending ? 'Enviando mensagem' : 'Enviar mensagem'} disabled={chat.status !== 'Conectado' || chat.loading || !chat.conversation || readOnly || chat.sending || !chat.draft.trim()} onPress={chat.send} />
    </View>
  </Screen>;
}
const s = StyleSheet.create({
  messages: { padding: 24, gap: 18, flexGrow: 1 },
  day: { alignSelf: 'center', fontSize: 11, letterSpacing: 1, color: colors.muted, marginBottom: 10 },
  bubble: { maxWidth: '88%', padding: 16, borderRadius: 20, borderBottomLeftRadius: 5, backgroundColor: '#EFF3F9', alignSelf: 'flex-start', gap: 8 },
  mine: { alignSelf: 'flex-end', borderBottomLeftRadius: 20, borderBottomRightRadius: 5, backgroundColor: colors.blue },
  text: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 10, color: colors.muted },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderTopWidth: 1, borderColor: colors.line },
});
