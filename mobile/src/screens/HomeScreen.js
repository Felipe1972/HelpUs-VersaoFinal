import { nearby, recentPosition } from '../services/proximity';
import { statusLabel } from '../services/statusLabels';
import { obtainLocation } from '../services/pedidoLocation';
import { useCallback, useEffect, useState, useRef } from 'react';
import { pendingPedidoId, clearPedidoRefresh } from '../services/pedidoRefresh';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { sessionError, urgencyColors, urgencyLabels } from './PedidosScreen';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Header, BottomBar, Button, IconButton, colors } from '../components/UI';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// Renderiza a Home com mapa, filtros e acesso aos pedidos.
export default function HomeScreen({ navigation }) {
  const [regiao, setRegiao] = useState(null);
  const [localAtual, setLocalAtual] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [pedidos, setPedidos] = useState([]),
    [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  const [perfil, setPerfil] = useState(null),
    [escopo, setEscopo] = useState('mapa');

  const map = useRef(null),
    positionCache = useRef(null),
    locationBusy = useRef(false),
    alive = useRef(true);
  const [locating, setLocating] = useState(false);
  const [group, setGroup] = useState(null),
    [legend, setLegend] = useState(false);
  const [radius, setRadius] = useState(null),
    [nearList, setNearList] = useState(false);
  const locationUsable = recentPosition(positionCache.current);
  const visiblePedidos = nearby(pedidos, positionCache.current, radius, nearList);
  const dimensions = useWindowDimensions();
  const compact = dimensions.height < 660 || dimensions.fontScale > 1.3;
  const listMode =
    ['assumidos', 'meus', 'recusados'].includes(escopo) ||
    (escopo === 'disponiveis' && nearList);
  const groups = Object.values(
    visiblePedidos.filter(validPoint).reduce((all, p) => {
      const k = p.latitude + ',' + p.longitude;
      (all[k] ??= []).push(p);
      return all;
    }, {}),
  );
  const valid = (p) =>
    p &&
    Number.isFinite(p.latitude) &&
    Math.abs(p.latitude) <= 90 &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.longitude) <= 180;
  const center = useCallback((p) => {
    const next = {
      latitude: p.latitude,
      longitude: p.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
    setRegiao(next);
    map.current?.animateToRegion(next, 400);
  }, []);
  const locate = useCallback(
    async (force = false) => {
      if (locationBusy.current) return;
      if (
        !force &&
        positionCache.current &&
        Date.now() - positionCache.current.received < 60000
      ) {
        center(positionCache.current);
        return;
      }
      locationBusy.current = true;
      setLocating(true);
      setAviso('Obtendo sua localização…');
      try {
        const p = await obtainLocation(Location);
        if (!alive.current) return;
        positionCache.current = { ...p, received: Date.now() };
        setLocalAtual({ latitude: p.latitude, longitude: p.longitude });
        center(p);
        setAviso(
          p.source === 'lastKnown' ? 'Usando uma posição recente do aparelho.' : null,
        );
      } catch (e) {
        if (alive.current)
          setAviso(e.message || 'Localização indisponível. Tente novamente.');
      } finally {
        locationBusy.current = false;
        if (alive.current) setLocating(false);
      }
    },
    [center],
  );
  useEffect(() => {
    alive.current = true;
    locate();
    return () => {
      alive.current = false;
    };
  }, [locate]);

  // Um ciclo por foco/filtro. Polling atualiza os dados sem limpar a tela ou mover a câmera.
  useFocusEffect(
    useCallback(() => {
      if (pendingPedidoId() != null && !['mapa', 'meus'].includes(escopo)) {
        setEscopo('meus');
        return;
      }
      let active = true,
        busy = false,
        abort;
      // Atualiza pedidos sem mover a câmera ou apagar o mapa durante a consulta.
      async function refresh() {
        if (
          !active ||
          busy ||
          AppState.currentState === 'background' ||
          AppState.currentState === 'inactive'
        )
          return;
        busy = true;
        abort = new AbortController();
        setLoading(true);
        setError('');
        try {
          const { data } = await api.get('/ocorrencias', {
            signal: abort.signal,
            params: { escopo },
          });
          if (!active || abort.signal.aborted) return;
          const list = ['mapa', 'disponiveis'].includes(escopo)
            ? data.ocorrencias.filter(valid)
            : escopo === 'assumidos'
              ? data.ocorrencias.filter(
                  (p) => p.assumido && ['aberta', 'em_atendimento'].includes(p.status),
                )
              : data.ocorrencias;
          setPedidos(list);
          setPerfil(data.perfil);
          if (
            data.perfil?.eh_voluntario &&
            escopo === 'mapa' &&
            pendingPedidoId() == null
          )
            setEscopo('disponiveis');
          setGroup((old) =>
            old
              ? old
                  .map((x) => list.find((p) => p.id_ocorrencia === x.id_ocorrencia))
                  .filter(Boolean)
              : null,
          );
          setSelected((old) =>
            old ? list.find((x) => x.id_ocorrencia === old.id_ocorrencia) || null : null,
          );
          const id = pendingPedidoId();
          if (id != null && list.some((x) => x.id_ocorrencia === id))
            clearPedidoRefresh(id);
        } catch (e) {
          if (!active || abort.signal.aborted) return;
          if (e.response?.status === 401 || e.response?.status === 403) {
            setPedidos([]);
            setSelected(null);
            setPerfil(null);
          }
          if (e.response?.status === 403 && escopo !== 'mapa') setEscopo('mapa');
          if (!(await sessionError(e, navigation)))
            setError('Não foi possível atualizar os pedidos. Tente novamente.');
        } finally {
          busy = false;
          if (active) setLoading(false);
        }
      }
      refresh();
      const timer = setInterval(refresh, 15000);
      const listener = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          refresh();
          if (!positionCache.current) locate();
        }
      });
      return () => {
        active = false;
        clearInterval(timer);
        listener.remove();
        abort?.abort();
        setPedidos([]);
        setSelected(null);
        setGroup(null);
      };
    }, [navigation, escopo, attempt, locate]),
  );

  const body = (
    <>
      <View style={styles.tabs}>
        {(perfil?.eh_voluntario
          ? [
              ['disponiveis', 'Disponíveis'],
              ['assumidos', 'Atend.'],
              ['meus', 'Pedidos'],
            ]
          : [
              ['mapa', 'Meu mapa'],
              ['meus', 'Meus pedidos e histórico'],
            ]
        ).map(([scope, label]) => (
          <Pressable
            key={scope}
            accessibilityRole="tab"
            accessibilityState={{
              selected:
                escopo === scope ||
                (scope === 'disponiveis' && escopo === 'mapa') ||
                (scope === 'assumidos' && escopo === 'recusados'),
            }}
            style={[
              styles.tab,
              (escopo === scope || (scope === 'disponiveis' && escopo === 'mapa')) &&
                styles.activeTab,
            ]}
            onPress={() => {
              setGroup(null);
              setSelected(null);
              setEscopo(scope);
            }}
          >
            <Text
              style={{
                color: escopo === scope ? colors.blue : colors.muted,
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {perfil?.eh_voluntario && escopo === 'disponiveis' && (
        <View>
          <ScrollView
            horizontal
            style={{ maxHeight: 48 }}
            contentContainerStyle={{ gap: 6 }}
          >
            {[null, 2, 5, 10, 25].map((k) => (
              <Pressable
                key={String(k)}
                accessibilityRole="radio"
                accessibilityState={{
                  selected: radius === k,
                  disabled: k !== null && !locationUsable,
                }}
                disabled={k !== null && !locationUsable}
                onPress={() => {
                  setRadius(k);
                  setSelected(null);
                  setGroup(null);
                }}
                style={{
                  paddingHorizontal: 12,
                  minHeight: 44,
                  justifyContent: 'center',
                  borderRadius: 14,
                  backgroundColor: radius === k ? '#EAF2FF' : 'white',
                  borderWidth: 1,
                  borderColor: radius === k ? colors.blue : colors.line,
                }}
              >
                <Text
                  style={{
                    color: k !== null && !locationUsable ? colors.muted : colors.blue,
                  }}
                >
                  {k === null ? 'Todos' : k + ' km'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setNearList((v) => !v);
              setSelected(null);
              setGroup(null);
            }}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ color: colors.blue }}>
              {nearList ? 'Ver no mapa' : 'Lista por proximidade'} · distância aproximada
            </Text>
          </Pressable>
          {!locationUsable && (
            <Text style={styles.noticeText}>
              Filtro sem GPS recente e preciso: mostrando todos. Use Centralizar em mim
              para tentar novamente.
            </Text>
          )}
        </View>
      )}
      <View style={[styles.mapContainer, compact && { height: 360, flex: 0 }]}>
        <View
          style={[styles.mapCanvas, listMode && { opacity: 0 }]}
          pointerEvents={listMode ? 'none' : 'auto'}
        >
          {regiao && (
            <MapView
              ref={map}
              style={styles.map}
              initialRegion={regiao}
              onRegionChangeComplete={(r) => {
                if (valid(r)) setRegiao(r);
              }}
            >
              {!listMode &&
                groups.map((items) => (
                  <Marker
                    key={items.map((x) => x.id_ocorrencia).join('-')}
                    zIndex={10}
                    coordinate={{
                      latitude: items[0].latitude,
                      longitude: items[0].longitude,
                    }}
                    title={
                      items.length > 1
                        ? items.length + ' pedidos neste ponto'
                        : items[0].titulo
                    }
                    description={
                      items.length > 1
                        ? 'Toque para escolher um pedido'
                        : items[0].nome_tipo +
                          ' · Urgência ' +
                          urgencyLabels[items[0].nivel_urgencia]
                    }
                    pinColor={urgencyColors[items[0].nivel_urgencia]}
                    onPress={() => {
                      if (items.length > 1) {
                        setGroup(items);
                        setSelected(null);
                      } else {
                        setSelected(items[0]);
                        setGroup(null);
                      }
                    }}
                  />
                ))}
              {localAtual && (
                <Marker
                  coordinate={localAtual}
                  title="Você está aqui"
                  zIndex={0}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.userDot} />
                </Marker>
              )}
            </MapView>
          )}
          <View style={styles.mapTop}>
            <Text style={{ flex: 1, fontWeight: '700', color: colors.ink }}>
              {perfil?.eh_voluntario ? 'Pedidos próximos' : 'Seus pedidos no mapa'}
            </Text>
            <IconButton
              name="refresh"
              label="Atualizar pedidos"
              disabled={loading}
              onPress={() => setAttempt((v) => v + 1)}
            />
          </View>
          {!!aviso && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{aviso}</Text>
            </View>
          )}
          <View style={styles.mapTools}>
            <IconButton
              name="information-circle-outline"
              label="Legenda do mapa"
              onPress={() => setLegend((v) => !v)}
            />
            <IconButton
              name="locate-outline"
              label={localAtual ? 'Centralizar em mim' : 'Tentar localização novamente'}
              disabled={locating}
              onPress={() => locate(!localAtual)}
            />
          </View>
          {legend && (
            <View style={styles.legend}>
              <Text style={styles.noticeText}>
                Azul: você · Verde: baixa · Laranja: média · Vermelho: alta. Pedidos da
                comunidade têm posição aproximada até autorização. O total conta os
                pedidos carregados, inclusive fora da área visível.
              </Text>
            </View>
          )}
          {!!group?.length && (
            <View style={styles.selection}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontWeight: '700' }}>
                  {group.length} pedidos no mesmo ponto
                </Text>
                <IconButton
                  name="close"
                  label="Fechar seleção"
                  onPress={() => setGroup(null)}
                />
              </View>
              <ScrollView style={{ maxHeight: 140 }}>
                {group.map((p) => (
                  <Pressable
                    key={p.id_ocorrencia}
                    accessibilityRole="button"
                    style={{ padding: 12, minHeight: 48 }}
                    onPress={() => {
                      setSelected(p);
                      setGroup(null);
                    }}
                  >
                    <Text>
                      {p.titulo} · {urgencyLabels[p.nivel_urgencia]} · #{p.id_ocorrencia}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          {selected && (
            <View style={styles.selection}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontWeight: '700' }} numberOfLines={2}>
                  {selected.titulo}
                </Text>
                <IconButton
                  name="close"
                  label="Fechar pedido selecionado"
                  onPress={() => setSelected(null)}
                />
              </View>
              <Text style={{ color: urgencyColors[selected.nivel_urgencia] }}>
                {selected.meu_pedido ? 'Seu pedido' : 'Comunidade'} ·{' '}
                {urgencyLabels[selected.nivel_urgencia]}
                {selected.localizacao_aproximada ? ' · Posição aproximada' : ''}
              </Text>
              <Button
                title="Ver detalhes"
                tone="soft"
                onPress={() =>
                  navigation.navigate('OcorrenciaDetalhes', {
                    id_ocorrencia: selected.id_ocorrencia,
                  })
                }
              />
            </View>
          )}
        </View>
        {listMode && (
          <ScrollView
            style={styles.list}
            contentContainerStyle={{ padding: 14, gap: 12 }}
          >
            {['assumidos', 'recusados'].includes(escopo) && (
              <Button
                title={
                  escopo === 'recusados'
                    ? 'Voltar aos atendimentos'
                    : 'Ver chamados recusados'
                }
                tone="soft"
                onPress={() =>
                  setEscopo(escopo === 'recusados' ? 'assumidos' : 'recusados')
                }
              />
            )}
            {escopo === 'assumidos' && (
              <Button
                title="Histórico de atendimentos"
                tone="soft"
                onPress={() =>
                  navigation.navigate('MeusPedidos', { escopo: 'assumidos' })
                }
              />
            )}
            {!visiblePedidos.length && !loading && (
              <Text style={styles.noticeText}>
                {escopo === 'meus'
                  ? 'Você ainda não criou pedidos de ajuda.'
                  : escopo === 'recusados'
                    ? 'Nenhum chamado recusado.'
                    : 'Nenhum pedido neste filtro.'}
              </Text>
            )}
            {visiblePedidos.map((p) => (
              <Pressable
                key={p.id_ocorrencia}
                accessibilityRole="button"
                style={styles.orderRow}
                onPress={() =>
                  navigation.navigate(
                    p.acompanhamento?.pode_acompanhar
                      ? 'Acompanhamento'
                      : 'OcorrenciaDetalhes',
                    { id_ocorrencia: p.id_ocorrencia },
                  )
                }
              >
                <Text style={{ fontWeight: '700', fontSize: 16 }}>{p.titulo}</Text>
                <Text style={{ color: colors.muted }}>
                  {p.meu_pedido ? 'Seu pedido' : 'Atendimento'} · {statusLabel(p.status)}{' '}
                  · {urgencyLabels[p.nivel_urgencia]}
                </Text>
                <Text style={{ color: colors.muted }}>
                  {p.necessaria_em
                    ? new Date(p.necessaria_em).toLocaleString('pt-BR')
                    : 'Horário não informado'}
                </Text>
                {p.distancia_km !== null && (
                  <Text style={{ color: colors.muted }}>
                    Aproximadamente {p.distancia_km.toFixed(1)} km em linha reta
                  </Text>
                )}
                <Text style={{ color: colors.blue }}>Abrir pedido →</Text>
              </Pressable>
            ))}
            <Button
              title="Atualizar lista"
              tone="soft"
              disabled={loading}
              onPress={() => setAttempt((v) => v + 1)}
            />
          </ScrollView>
        )}
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.count}>
        {error ||
          (loading && !pedidos.length
            ? 'Carregando pedidos…'
            : visiblePedidos.length +
              ' ' +
              (escopo === 'disponiveis'
                ? 'pedidos disponíveis'
                : listMode
                  ? 'pedidos na lista'
                  : 'pedidos no mapa'))}
      </Text>
      <View style={styles.helpCard}>
        <Button
          title="Solicitar ajuda"
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('SolicitarAjuda')}
        />
        <Button title="SOS" tone="red" onPress={() => navigation.navigate('SOS')} />
      </View>
    </>
  );
  return (
    <View style={styles.container}>
      <Header title="Help Us" navigation={navigation} />
      {compact ? (
        <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>{body}</View>
      )}
      <BottomBar navigation={navigation} active="Home" />
    </View>
  );
}
function validPoint(p) {
  return (
    p &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  content: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E6ECF3' },
  tab: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#2876E7' },
  mapContainer: {
    flex: 1,
    minHeight: 240,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F1F5FA',
    borderWidth: 1,
    borderColor: '#E6ECF3',
  },
  mapCanvas: { flex: 1 },
  map: { flex: 1 },
  mapTop: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    paddingLeft: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'white',
    elevation: 2,
  },
  mapTools: {
    position: 'absolute',
    bottom: 12,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 14,
    elevation: 3,
  },
  notice: {
    position: 'absolute',
    top: 70,
    left: 10,
    right: 10,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  noticeText: { color: '#63738C', fontSize: 13, lineHeight: 19 },
  legend: {
    position: 'absolute',
    bottom: 105,
    left: 10,
    right: 10,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  selection: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 68,
    padding: 12,
    gap: 6,
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 4,
  },
  userDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2876E7',
    borderWidth: 3,
    borderColor: 'white',
  },
  list: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F5F8FD',
  },
  orderRow: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E6ECF3',
  },
  count: { fontSize: 13, color: '#63738C', textAlign: 'center', paddingVertical: 2 },
  helpCard: { flexDirection: 'row', gap: 10, paddingTop: 2 },
});
