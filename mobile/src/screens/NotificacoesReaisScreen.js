import { useNotifications } from '../context/NotificationsContext';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Button, ListRow, ui } from '../components/UI';
import api from '../services/api';
import usePollingRefresh from '../hooks/usePollingRefresh';
import { sessionError } from './PedidosScreen';
// Renderiza a tela NotificacoesReais.
export default function NotificacoesReaisScreen({ navigation }) {
  const notices = useNotifications();
  const [items, setItems] = useState([]),
    [error, setError] = useState(''),
    [tick, setTick] = useState(0);
  useFocusEffect(useCallback(() => () => setItems([]), []));
  usePollingRefresh(setTick);
  useFocusEffect(
    useCallback(() => {
      const abort = new AbortController();
      api
        .get('/notificacoes', { signal: abort.signal })
        .then(({ data }) => {
          if (!abort.signal.aborted) {
            setItems(data.notificacoes);
            setError('');
          }
        })
        .catch(async (e) => {
          if (!abort.signal.aborted && !(await sessionError(e, navigation))) {
            if (e.response?.status === 403) setItems([]);
            setError('Não foi possível atualizar seus avisos. Tente novamente.');
          }
        });
      return () => {
        abort.abort();
      };
    }, [tick, navigation]),
  );
  async function open(n) {
    await notices.open(n);
    setTick((t) => t + 1);
    void notices.refresh();
  }
  return (
    <Screen title="Seus avisos" navigation={navigation} active="Notificacoes">
      <Text style={ui.subtitle}>
        {error ||
          (!items.length
            ? 'Nenhum aviso por enquanto.'
            : 'Atualizados enquanto o aplicativo está aberto.')}
      </Text>
      {items.map((n) => (
        <ListRow
          key={n.id_notificacao}
          icon={n.lida_em ? 'notifications-outline' : 'notifications'}
          title={n.titulo}
          subtitle={
            (n.lida_em ? 'Lido' : 'Novo') +
            ' · Pedido #' +
            n.id_ocorrencia +
            ' · ' +
            new Date(n.criada_em).toLocaleString('pt-BR')
          }
          onPress={() => open(n)}
        />
      ))}
      <Button
        title="Atualizar avisos"
        tone="soft"
        onPress={() => setTick((t) => t + 1)}
      />
    </Screen>
  );
}
