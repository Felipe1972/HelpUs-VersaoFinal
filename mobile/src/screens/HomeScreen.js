import { useCallback, useEffect, useState, useRef } from 'react';
import { pendingPedidoId, clearPedidoRefresh } from '../services/pedidoRefresh';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { sessionError, urgencyColors, urgencyLabels } from './PedidosScreen';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Header, BottomBar } from '../components/UI';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const REGIAO_PADRAO = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

export default function HomeScreen({ navigation }) {
  const [regiao, setRegiao] = useState(REGIAO_PADRAO);
  const [localAtual, setLocalAtual] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [pedidos, setPedidos] = useState([]), [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const focusedOnPedido = useRef(false);

  useEffect(() => {
    let ativo = true;
    async function localizar() {
      try {
        const permissao = await Location.requestForegroundPermissionsAsync();
        if (permissao.status !== 'granted') {
          if (ativo) setAviso('Permissão negada. Exibindo o mapa padrão.');
          return;
        }

        const posicao = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!ativo) return;

        const coordenadas = {
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
        };
        setLocalAtual(coordenadas);
        if (!focusedOnPedido.current) setRegiao({ ...coordenadas, latitudeDelta: 0.02, longitudeDelta: 0.02 });
        setAviso(null);
      } catch (erro) {
        if (ativo) setAviso('GPS indisponível. Exibindo o mapa padrão.');
      }
    }
    localizar();
    return () => { ativo = false; };
  }, []);

  useFocusEffect(useCallback(() => {
    const abort = new AbortController(); setLoading(true); setError(''); setSelected(null);
    api.get('/ocorrencias', { signal: abort.signal }).then(({ data }) => {
      if (abort.signal.aborted) return;
      setPedidos(data.ocorrencias);
      const id = pendingPedidoId();
      if (id != null) {
        const saved = data.ocorrencias.find(item => item.id_ocorrencia === id);
        if (saved) {
          focusedOnPedido.current = true;
          setRegiao({ latitude: saved.latitude, longitude: saved.longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 });
          clearPedidoRefresh(id);
        } else setError('Pedido criado, mas ainda não retornado na lista. Toque em Atualizar pedidos.');
      }
    }).catch(async failure => {
      if (abort.signal.aborted) return;
      setPedidos([]);
      if (!await sessionError(failure, navigation)) setError('Não foi possível carregar os pedidos.');
    }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [navigation, attempt]));

  return (
    <View style={styles.container}>
      <Header title="Help Us" navigation={navigation} />

      <View style={styles.content}>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={regiao}
            onRegionChangeComplete={setRegiao}
          >
            {pedidos.map(item => <Marker key={item.id_ocorrencia} zIndex={10} coordinate={{ latitude: item.latitude, longitude: item.longitude }} title={item.titulo} description={`${item.nome_tipo} · Urgência ${urgencyLabels[item.nivel_urgencia]}`} pinColor={urgencyColors[item.nivel_urgencia]} onPress={() => setSelected(item)} />)}
            {localAtual && (
              <Marker coordinate={localAtual} title="Você está aqui" zIndex={0} anchor={{ x: 0.5, y: 0.5 }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#2670F0', borderWidth: 3, borderColor: 'white' }} /></Marker>
            )}
          </MapView>
          {aviso && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{aviso}</Text>
            </View>
          )}
        </View>
        <View style={{ paddingTop: 8, gap: 6 }}>
          <Text style={{ fontSize: 11, textAlign: 'center', color: '#63738C' }}>Azul: você · Verde: baixa · Laranja: média · Vermelho: alta</Text>
          <Text style={styles.noticeText}>{loading ? 'Carregando pedidos…' : error || (pedidos.length ? `${pedidos.length} pedido(s) no mapa` : 'Nenhum pedido ativo com localização.')}</Text>
          <Pressable accessibilityRole="button" disabled={loading} onPress={() => setAttempt(v => v + 1)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#2876E7', textAlign: 'center' }}>Atualizar pedidos</Text></Pressable>
          {selected && <Pressable accessibilityRole="button" accessibilityLabel="Ver detalhes do pedido" onPress={() => navigation.navigate('OcorrenciaDetalhes', { id_ocorrencia: selected.id_ocorrencia })} style={{ padding: 12, borderRadius: 12, backgroundColor: '#EAF2FF' }}><Text style={{ fontSize: 12, color: '#63738C' }}>Pedido selecionado</Text><Text style={{ fontWeight: '700' }}>{selected.titulo}</Text><Text style={{ color: urgencyColors[selected.nivel_urgencia] }}>{selected.nome_tipo} · Urgência {urgencyLabels[selected.nivel_urgencia]}</Text><Text style={{ color: '#2876E7', marginTop: 6 }}>Ver detalhes →</Text></Pressable>}
        </View>

        <View style={styles.helpCard}>
          <Pressable style={[styles.sosButton, { flex: 1, minHeight: 48, backgroundColor: '#2876E7', marginRight: 12 }]} accessibilityRole="button" accessibilityLabel="Solicitar ajuda" onPress={() => navigation.navigate('SolicitarAjuda')}><Text style={styles.sosText}>Solicitar ajuda</Text></Pressable>
          <Pressable style={[styles.sosButton, { minHeight: 48 }]} accessibilityRole="button" accessibilityLabel="Emergência SOS" onPress={() => navigation.navigate('SOS')}>
            <Text style={styles.sosText}>SOS</Text>
          </Pressable>
        </View>
      </View>

      <BottomBar navigation={navigation} active="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 28, paddingBottom: 20, backgroundColor: '#2876E7',
  },
  brand: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 10 },
  mapContainer: {
    flex: 1, overflow: 'hidden', borderRadius: 22, backgroundColor: '#F5F5F2',
  },
  map: { flex: 1 },
  notice: {
    position: 'absolute', top: 12, left: 12, right: 12, padding: 10,
    borderRadius: 10, backgroundColor: '#FFFFFF', elevation: 2,
  },
  noticeText: { color: '#1D2634', textAlign: 'center', fontSize: 13 },
  helpCard: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8,
    paddingHorizontal: 10, paddingVertical: 10, borderRadius: 22,
    backgroundColor: '#FFFFFF', elevation: 5, shadowColor: '#000000',
    shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 },
  },
  helpText: { flex: 1, paddingRight: 8 },
  helpTitle: { color: '#151B27', fontSize: 20, fontWeight: '800' },
  helpSubtitle: { marginTop: 4, color: '#72809A', fontSize: 13 },
  sosButton: {
    minWidth: 70, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 24,
    backgroundColor: '#EF3036',
  },
  sosText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E6ECF3',
    backgroundColor: '#FFFFFF',
  },
  profileButton: { alignItems: 'center', justifyContent: 'center' },
});
