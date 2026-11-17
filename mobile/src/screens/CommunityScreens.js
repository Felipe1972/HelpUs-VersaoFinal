import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { Screen, Card, Button, DemoNotice, ListRow, goMain, colors, ui } from '../components/UI';
import { notices, occurrence } from '../data/demo';
import { useDemo } from '../context/DemoContext';
import { PedidoDetalhesScreen } from './PedidosScreen';

export function NotificacoesScreen({ navigation }) {
  const { read, setRead } = useDemo();
  return <Screen title="Avisos e Alertas" navigation={navigation} active="Notificacoes">
    <DemoNotice />
    {notices.map(item => <ListRow key={item.id} icon={item.icon} color={item.color} title={item.title} subtitle={`${item.time}${read.includes(item.id) ? ' · Lido' : ' · Novo'}`} onPress={() => { setRead(previous => [...new Set([...previous, item.id])]); navigation.navigate(item.route, { noticeId: item.id }); }} />)}
  </Screen>;
}

export function AvisoScreen({ navigation, route }) {
  const notice = notices.find(item => item.id === route.params?.noticeId) || notices[0];
  return <Screen title={notice.title} navigation={navigation} back active="Notificacoes"><DemoNotice /><Card style={s.detail}><View style={[s.symbol, { backgroundColor: `${notice.color}15` }]}><Ionicons name={notice.icon} size={50} color={notice.color} /></View><Text style={ui.title}>{notice.title}</Text><Text style={[ui.subtitle, s.centerText]}>{notice.text}</Text><Button title="Voltar aos avisos" onPress={() => navigation.goBack()} /></Card></Screen>;
}

export function AlertaEmergenciaScreen({ navigation }) {
  return <Screen title={'Alerta de\nEmergência'} navigation={navigation} back active="Notificacoes">
    <DemoNotice text="Simulação • não há um alerta real" />
    <Card style={s.detail}><View style={s.symbol}><Ionicons name="alert" color={colors.red} size={78} /></View>
      <Text style={[ui.title, s.centerText, { fontSize: 30 }]}>Alerta próximo</Text>
      <Text style={[ui.subtitle, s.centerText, { fontSize: 18, lineHeight: 28 }]}>Este é um exemplo de alerta de emergência na sua região. Verifique o local e mantenha distância se houver risco.</Text>
      <Button title="VER NO MAPA" onPress={() => navigation.navigate('OcorrenciaMapa')} />
    </Card>
  </Screen>;
}

export function OcorrenciaMapaScreen({ navigation }) {
  return <Screen title="Ocorrência local" navigation={navigation} back active="Notificacoes" scroll={false} contentStyle={{ padding: 24, gap: 16 }}>
    <DemoNotice text="Local fictício • sem cálculo de trajeto" />
    <View style={s.map}><MapView style={StyleSheet.absoluteFill} initialRegion={{ latitude: occurrence.latitude, longitude: occurrence.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }}><Marker coordinate={occurrence} title={`${occurrence.title} (demonstração)`} description={occurrence.description} pinColor={colors.blue} onCalloutPress={() => navigation.navigate('OcorrenciaDetalhes')} /></MapView></View>
    <Card style={ui.row}><View style={{ flex: 1, gap: 6 }}><Text style={[ui.title, { fontSize: 21 }]}>Ocorrência local</Text><Text style={ui.subtitle}>Pedido de ajuda · exemplo</Text></View><Button title="Abrir" onPress={() => navigation.navigate('OcorrenciaDetalhes')} /></Card>
  </Screen>;
}

export function OcorrenciaDetalhesScreen(props) {
  if (props.route?.params?.id_ocorrencia != null) return <PedidoDetalhesScreen {...props} />;
  return <DemoDetalhesScreen {...props} />;
}
function DemoDetalhesScreen({ navigation }) {
  const { response, setResponse } = useDemo();
  function respond(value) { setResponse(value); Alert.alert('Demonstração', `Resposta “${value}” registrada apenas nesta sessão. Ninguém foi notificado.`); }
  return <Screen title="Ocorrência local" navigation={navigation} back active="Notificacoes"><DemoNotice />
    <Card style={s.detail}>
      <Text style={ui.title}>{occurrence.title}</Text>
      <Text style={[ui.title, s.centerText, { fontSize: 23 }]}>Uma pessoa da comunidade precisa de ajuda</Text>
      <View style={s.message}><Text style={ui.label}>Mensagem:</Text><Text style={[ui.title, s.centerText, { fontSize: 23, lineHeight: 31 }]}>{occurrence.description}</Text></View>
      {response && <Text accessibilityLiveRegion="polite" style={[ui.subtitle, s.centerText]}>Sua resposta: {response} · simulação</Text>}
      <Text style={ui.subtitle}>Este é um exemplo fictício. Para aceitar ou recusar pedidos reais, acesse Disponíveis na Home.</Text>
      <Button title="Enviar mensagem" tone="soft" onPress={() => navigation.navigate('Conversas')} />
    </Card>
  </Screen>;
}

export function MenuScreen({ navigation }) {
  return <Screen title="Help Us" navigation={navigation} back><Text style={ui.section}>CUIDADO, APOIO E COMUNIDADE</Text>
    {[['home-outline', 'Início', 'Seu mapa e localização', 'Home'], ['chatbubbles-outline', 'Conversas', 'Apoio começa com uma conversa', 'Conversas'], ['notifications-outline', 'Avisos e Alertas', 'Acompanhe a comunidade', 'Notificacoes'], ['person-outline', 'Meu perfil', 'Seus dados e sua conta', 'Perfil'], ['people-outline', 'Usuários', 'Lista de usuários cadastrados', 'Usuarios']].map(([icon, title, subtitle, route]) => <ListRow key={route} {...{ icon, title, subtitle }} onPress={() => goMain(navigation, route)} />)}
    <Button title="Solicitar ajuda" onPress={() => navigation.navigate('SolicitarAjuda')} />
    <Button title="Emergência · SOS" tone="red" onPress={() => navigation.navigate('SOS')} />
  </Screen>;
}

export function SOSScreen({ navigation }) {
  return <Screen title="Emergência / SOS" navigation={navigation} back active="Home"><Card style={{ gap: 16 }}><Ionicons name="alert-circle-outline" size={48} color={colors.red} /><Text style={ui.title}>Espaço reservado para emergências</Text><Text style={ui.subtitle}>O SOS ainda não aciona ajuda ou serviços de emergência. Para um pedido cotidiano, utilize Solicitar ajuda na Home.</Text><Button title="Voltar à Home" tone="soft" onPress={() => navigation.popTo('Home')} /></Card></Screen>;
}

export function RecuperarSenhaScreen({ navigation }) {
  return <Screen title="Recuperar acesso" navigation={navigation} auth back><Card style={s.detail}><Ionicons style={{ alignSelf: 'center' }} name="lock-closed-outline" size={52} color={colors.blue} /><Text style={[ui.title, s.centerText]}>Esqueceu a senha?</Text><Text style={[ui.subtitle, s.centerText]}>A recuperação por e-mail ainda não está disponível. Esta tela apresenta o fluxo futuro; nenhum e-mail será enviado.</Text><Text style={[ui.subtitle, s.centerText]}>Se você sabe sua senha atual, entre na conta e acesse Perfil → Trocar senha.</Text><Button title="Voltar ao login" onPress={() => navigation.goBack()} /></Card></Screen>;
}

const s = StyleSheet.create({
  detail: { gap: 24, paddingVertical: 28 },
  symbol: { width: 116, height: 116, borderRadius: 58, backgroundColor: '#FFF0F1', alignSelf: 'center', justifyContent: 'center', alignItems: 'center' },
  centerText: { textAlign: 'center' },
  map: { flex: 1, minHeight: 160, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.pale },
  message: { padding: 22, borderRadius: 20, backgroundColor: colors.pale, gap: 12 },
});
