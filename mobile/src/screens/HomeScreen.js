import { obtainLocation } from '../services/pedidoLocation';
import { useCallback, useEffect, useState, useRef } from 'react';
import { pendingPedidoId, clearPedidoRefresh } from '../services/pedidoRefresh';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { sessionError, urgencyColors, urgencyLabels } from './PedidosScreen';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header, BottomBar, Button } from '../components/UI';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

export default function HomeScreen({ navigation }) {
  const [regiao, setRegiao] = useState(null);
  const [localAtual, setLocalAtual] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [pedidos, setPedidos] = useState([]), [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [perfil, setPerfil] = useState(null), [escopo, setEscopo] = useState('mapa');

  const map = useRef(null), positionCache = useRef(null), locationBusy = useRef(false), alive = useRef(true);
  const [locating,setLocating]=useState(false);
  const valid = p => p && Number.isFinite(p.latitude) && Math.abs(p.latitude)<=90 && Number.isFinite(p.longitude) && Math.abs(p.longitude)<=180;
  const center = useCallback(p => {
    const next={latitude:p.latitude,longitude:p.longitude,latitudeDelta:0.02,longitudeDelta:0.02};
    setRegiao(next); map.current?.animateToRegion(next,400);
  },[]);
  const locate = useCallback(async(force=false)=>{
    if(locationBusy.current)return;
    if(!force&&positionCache.current&&Date.now()-positionCache.current.received<60000){center(positionCache.current);return}
    locationBusy.current=true;setLocating(true);setAviso('Obtendo sua localização…');
    try{const p=await obtainLocation(Location);if(!alive.current)return;
      positionCache.current={...p,received:Date.now()};setLocalAtual({latitude:p.latitude,longitude:p.longitude});center(p);
      setAviso(p.source==='lastKnown'?'Usando uma posição recente do aparelho.':null);
    }catch(e){if(alive.current)setAviso(e.message||'Localização indisponível. Tente novamente.');}
    finally{locationBusy.current=false;if(alive.current)setLocating(false)}
  },[center]);
  useEffect(()=>{alive.current=true;locate();return()=>{alive.current=false}},[locate]);

  // Um ciclo por foco/filtro. Polling atualiza os dados sem limpar a tela ou mover a câmera.
  useFocusEffect(useCallback(()=>{
    if(pendingPedidoId()!=null&&escopo!=='mapa'){setEscopo('mapa');return}
    let active=true,busy=false,abort;
    async function refresh(){
      if(!active||busy||AppState.currentState==='background'||AppState.currentState==='inactive')return;
      busy=true;abort=new AbortController();setLoading(true);setError('');
      try{const {data}=await api.get('/ocorrencias',{signal:abort.signal,params:{escopo}});if(!active||abort.signal.aborted)return;
        const list=data.ocorrencias.filter(valid);setPedidos(list);setPerfil(data.perfil);
        setSelected(old=>old?list.find(x=>x.id_ocorrencia===old.id_ocorrencia)||null:null);
        const id=pendingPedidoId();if(id!=null&&list.some(x=>x.id_ocorrencia===id))clearPedidoRefresh(id);
      }catch(e){if(!active||abort.signal.aborted)return;
        if(e.response?.status===401||e.response?.status===403){setPedidos([]);setSelected(null);setPerfil(null);}
        if(e.response?.status===403&&escopo!=='mapa')setEscopo('mapa');
        if(!await sessionError(e,navigation))setError('Não foi possível atualizar os pedidos. Tente novamente.');
      }finally{busy=false;if(active)setLoading(false)}
    }
    refresh();const timer=setInterval(refresh,15000);
    const listener=AppState.addEventListener('change',state=>{if(state==='active'){refresh();if(!positionCache.current)locate();}});
    return()=>{active=false;clearInterval(timer);listener.remove();abort?.abort();setPedidos([]);setSelected(null);setPerfil(null)};
  },[navigation,escopo,attempt,locate]));

  return (
    <View style={styles.container}>
      <Header title="Help Us" navigation={navigation} />

      <ScrollView style={{flex:1}} contentContainerStyle={styles.content}>
        <View style={{ gap: 6, marginBottom: 10 }}>
          <Text style={{ color: '#63738C', fontSize: 13 }}>{perfil?.eh_voluntario ? 'Voluntário · Você também pode solicitar ajuda' : 'Seus pedidos de ajuda'}</Text>
          {perfil?.eh_voluntario&&<View style={{flexDirection:'row',gap:8}}><Button title="Meus atendimentos" tone="soft" style={{flex:1}} onPress={()=>navigation.navigate('MeusPedidos',{escopo:'assumidos'})}/><Button title="Recusados" tone="soft" style={{flex:1}} onPress={()=>navigation.navigate('MeusPedidos',{escopo:'recusados'})}/></View>}<Button title="Meus pedidos e histórico" tone="soft" onPress={() => navigation.navigate('MeusPedidos',{escopo:'meus'})} />
          {perfil?.eh_voluntario && <Pressable accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => setEscopo(value => value === 'mapa' ? 'disponiveis' : 'mapa')}><Text style={{ color: '#2876E7', textAlign: 'center' }}>{escopo === 'mapa' ? 'Mostrar somente pedidos da comunidade' : 'Mostrar também meus pedidos'}</Text></Pressable>}
        </View>
        <View style={styles.mapContainer}>
          {regiao && <MapView
            ref={map}
            style={styles.map}
            initialRegion={regiao}
            onRegionChangeComplete={r => { if(valid(r)) setRegiao(r); }}
          >
            {pedidos.map(item => <Marker key={item.id_ocorrencia} zIndex={10} coordinate={{ latitude: item.latitude, longitude: item.longitude }} title={item.titulo} description={`${item.modalidade_horario==='agendado'?'Agendado · ':''}${item.nome_tipo} · Urgência ${urgencyLabels[item.nivel_urgencia]}${item.localizacao_aproximada ? ' · Localização aproximada' : ''}`} pinColor={urgencyColors[item.nivel_urgencia]} onPress={() => setSelected(item)} />)}
            {localAtual && (
              <Marker coordinate={localAtual} title="Você está aqui" zIndex={0} anchor={{ x: 0.5, y: 0.5 }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#2670F0', borderWidth: 3, borderColor: 'white' }} /></Marker>
            )}
          </MapView>}
          {aviso && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{aviso}</Text>
            </View>
          )}
        </View>
        <Button title={locating ? 'Obtendo localização…' : localAtual ? 'Centralizar em mim' : 'Tentar localização novamente'} disabled={locating} tone="soft" onPress={()=>locate(!localAtual)} />
        <View style={{ paddingTop: 8, gap: 6 }}>
          <Text style={{ fontSize: 11, textAlign: 'center', color: '#63738C' }}>Azul: você · Verde: baixa · Laranja: média · Vermelho: alta</Text>
          <Text style={styles.noticeText}>{loading ? 'Carregando pedidos…' : error || (pedidos.length ? `${pedidos.length} pedido(s) no mapa` : 'Nenhum pedido ativo com localização.')}</Text>
          <Pressable accessibilityRole="button" disabled={loading} onPress={() => setAttempt(v => v + 1)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#2876E7', textAlign: 'center' }}>Atualizar pedidos</Text></Pressable>
          {perfil?.eh_voluntario && <Text style={{ color: '#63738C', fontSize: 11, textAlign: 'center' }}>Pedidos sem vínculo de atendimento mostram uma localização aproximada.</Text>}
          {selected && <Pressable accessibilityRole="button" accessibilityLabel="Ver detalhes do pedido" onPress={() => navigation.navigate('OcorrenciaDetalhes', { id_ocorrencia: selected.id_ocorrencia })} style={{ padding: 12, borderRadius: 12, backgroundColor: '#EAF2FF' }}><Text style={{ fontSize: 12, color: '#63738C' }}>Pedido selecionado</Text><Text style={{ fontWeight: '700' }}>{selected.titulo}</Text><Text style={{ color: urgencyColors[selected.nivel_urgencia] }}>{selected.nome_tipo} · Urgência {urgencyLabels[selected.nivel_urgencia]}</Text>{selected.necessaria_em&&<Text style={{fontSize:12}}>{selected.modalidade_horario==='agendado'?'Agendado':'Ajuda imediata'} · {new Date(selected.necessaria_em).toLocaleString('pt-BR')}</Text>}<Text style={{ fontSize: 12 }}>{selected.meu_pedido ? 'Seu pedido' : selected.localizacao_aproximada ? 'Localização aproximada' : 'Atendimento autorizado'}</Text><Text style={{ color: '#2876E7', marginTop: 6 }}>Ver detalhes →</Text></Pressable>}
        </View>

        <View style={styles.helpCard}>
          <Pressable style={[styles.sosButton, { flex: 1, minHeight: 48, backgroundColor: '#2876E7', marginRight: 12 }]} accessibilityRole="button" accessibilityLabel="Solicitar ajuda" onPress={() => navigation.navigate('SolicitarAjuda')}><Text style={styles.sosText}>Solicitar ajuda</Text></Pressable>
          <Pressable style={[styles.sosButton, { minHeight: 48 }]} accessibilityRole="button" accessibilityLabel="Emergência SOS" onPress={() => navigation.navigate('SOS')}>
            <Text style={styles.sosText}>SOS</Text>
          </Pressable>
        </View>
      </ScrollView>

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
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 10 },
  mapContainer: {
    height: 320, minHeight: 280, flexGrow: 1, overflow: 'hidden', borderRadius: 22, backgroundColor: '#F5F5F2',
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
