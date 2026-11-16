import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import api from '../services/api';
import { limparSessao } from '../services/authStorage';
import { Screen } from '../components/UI';

export default function UsuariosScreen({ navigation }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregarUsuarios = useCallback(async () => {
    try {
      setCarregando(true);
      setErro('');

      const response = await api.get('/usuarios');
      setUsuarios(response.data.usuarios);
    } catch (error) {
      if (error.response?.status === 401) {
        await limparSessao();
        Alert.alert('Sessão encerrada', 'Entre novamente para continuar.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        setErro('Não foi possível carregar os usuários.');
      }
    } finally {
      setCarregando(false);
    }
  }, [navigation]);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  function renderizarUsuario({ item }) {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.nome}</Text>
        <Text style={styles.detail}>{item.email}</Text>
        <Text style={styles.detail}>
          {item.telefone || 'Telefone não informado'}
        </Text>

        <View style={styles.tags}>
          <Text style={styles.tag}>
            {item.eh_voluntario ? 'Voluntário' : 'Usuário'}
          </Text>
          <Text style={styles.tag}>{item.status_verificacao}</Text>
        </View>
      </View>
    );
  }

  if (carregando) {
    return (
      <Screen title="Usuários" navigation={navigation} back active="Perfil" scroll={false}><View style={styles.centered}>
        <ActivityIndicator size="large" color="#2670F0" />
        <Text style={styles.feedback}>Carregando usuários...</Text>
      </View></Screen>
    );
  }

  if (erro) {
    return (
      <Screen title="Usuários" navigation={navigation} back active="Perfil" scroll={false}><View style={styles.centered}>
        <Text style={styles.feedback}>{erro}</Text>
        <Pressable style={styles.retryButton} onPress={carregarUsuarios}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </Pressable>
      </View></Screen>
    );
  }

  return (
    <Screen title="Usuários" navigation={navigation} back active="Perfil" scroll={false}><FlatList
      data={usuarios}
      keyExtractor={(item) => String(item.id_usuario)}
      renderItem={renderizarUsuario}
      contentContainerStyle={[
        styles.list,
        usuarios.length === 0 && styles.emptyList,
      ]}
      ListEmptyComponent={
        <Text style={styles.feedback}>Nenhum usuário cadastrado.</Text>
      }
      refreshing={carregando}
      onRefresh={carregarUsuarios}
    /></Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    backgroundColor: '#F5F8FF',
  },
  emptyList: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: 12,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  name: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  detail: {
    marginTop: 5,
    color: '#4B5563',
    fontSize: 15,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tag: {
    marginRight: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E8F0FF',
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F5F8FF',
  },
  feedback: {
    marginTop: 12,
    color: '#4B5563',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#2670F0',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
