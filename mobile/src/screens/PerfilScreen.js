import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import api from '../services/api';
import { limparSessao } from '../services/authStorage';

export default function PerfilScreen({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    let telaAtiva = true;

    async function carregarPerfil() {
      try {
        const response = await api.get('/usuarios/me');

        if (telaAtiva) {
          setUsuario(response.data.usuario);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          await limparSessao();

          if (telaAtiva) {
            Alert.alert('Sessão encerrada', 'Entre novamente para continuar.');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        } else if (telaAtiva) {
          Alert.alert(
            'Erro',
            'Não foi possível carregar os dados atuais do perfil.',
          );
        }
      } finally {
        if (telaAtiva) {
          setCarregando(false);
        }
      }
    }

    carregarPerfil();

    return () => {
      telaAtiva = false;
    };
  }, [navigation]);

  async function sair() {
    try {
      await limparSessao();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível encerrar a sessão.');
    }
  }

  async function excluirConta() {
    try {
      setExcluindo(true);
      const response = await api.delete('/usuarios/me');

      await limparSessao();
      Alert.alert('Conta excluída', response.data.mensagem);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      if (error.response?.status === 401) {
        await limparSessao();
        Alert.alert('Sessão encerrada', 'Entre novamente para continuar.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        Alert.alert(
          'Erro ao excluir conta',
          error.response?.data?.mensagem ||
            'Não foi possível excluir a conta.',
        );
      }
    } finally {
      setExcluindo(false);
    }
  }

  function confirmarExclusao() {
    Alert.alert(
      'Excluir conta?',
      'Esta ação é permanente e não poderá ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: excluirConta,
        },
      ],
    );
  }

  if (carregando || !usuario) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Olá, {usuario.nome}!</Text>
        <Text style={styles.subtitle}>Você entrou no Help Us.</Text>

        <Text style={styles.label}>E-mail</Text>
        <Text style={styles.value}>{usuario.email}</Text>

        <Text style={styles.label}>Telefone</Text>
        <Text style={styles.value}>{usuario.telefone || 'Não informado'}</Text>

        <Text style={styles.label}>Voluntário</Text>
        <Text style={styles.value}>
          {usuario.eh_voluntario ? 'Sim' : 'Não'}
        </Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{usuario.status_verificacao}</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Usuarios')}
        >
          <Text style={styles.primaryButtonText}>Ver usuários</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('TrocarSenha')}
        >
          <Text style={styles.secondaryButtonText}>Trocar senha</Text>
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={sair}>
          <Text style={styles.logoutButtonText}>Sair</Text>
        </Pressable>

        <Pressable
          style={[
            styles.deleteButton,
            excluindo && styles.deleteButtonDisabled,
          ]}
          onPress={confirmarExclusao}
          disabled={excluindo}
        >
          <Text style={styles.deleteButtonText}>
            {excluindo ? 'Excluindo...' : 'Excluir conta'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#EEF5F6',
  },
  card: {
    padding: 24,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  title: {
    color: '#1F2937',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 24,
    color: '#6B7280',
    textAlign: 'center',
  },
  label: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    marginTop: 3,
    color: '#1F2937',
    fontSize: 17,
  },
  logoutButton: {
    alignItems: 'center',
    marginTop: 28,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#1F6F78',
    borderRadius: 10,
  },
  primaryButton: {
    alignItems: 'center',
    marginTop: 28,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#1F6F78',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#DDEFF1',
  },
  secondaryButtonText: {
    color: '#1F6F78',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButtonText: {
    color: '#1F6F78',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#B42318',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loading: {
    color: '#4B5563',
    textAlign: 'center',
  },
});
