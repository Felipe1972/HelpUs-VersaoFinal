import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../services/api';
import { Screen } from '../components/UI';
import { limparSessao } from '../services/authStorage';

export default function TrocarSenhaScreen({ navigation }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function trocarSenha() {
    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      Alert.alert('Atenção', 'As novas senhas não coincidem.');
      return;
    }

    try {
      setCarregando(true);

      const response = await api.put('/usuarios/me/senha', {
        senhaAtual,
        novaSenha,
        confirmarNovaSenha,
      });

      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarNovaSenha('');

      Alert.alert('Sucesso', response.data.mensagem, [
        { text: 'Voltar ao perfil', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const status = error.response?.status;
      const mensagem = error.response?.data?.mensagem;

      if (status === 401 && mensagem !== 'Senha atual incorreta') {
        await limparSessao();
        Alert.alert('Sessão encerrada', 'Entre novamente para continuar.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      Alert.alert(
        'Erro ao trocar senha',
        mensagem || 'Não foi possível alterar a senha.',
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Screen title="Trocar senha" navigation={navigation} back active="Perfil">
        <View style={styles.card}>
          <Text style={styles.title}>Trocar senha</Text>
          <Text style={styles.subtitle}>Informe sua senha atual e a nova.</Text>

          <Text style={styles.label}>Senha atual</Text>
          <TextInput
            style={styles.input}
            value={senhaAtual}
            onChangeText={setSenhaAtual}
            placeholder="Digite a senha atual"
            placeholderTextColor="#8A94A6"
            secureTextEntry
          />

          <Text style={styles.label}>Nova senha</Text>
          <TextInput
            style={styles.input}
            value={novaSenha}
            onChangeText={setNovaSenha}
            placeholder="Digite a nova senha"
            placeholderTextColor="#8A94A6"
            secureTextEntry
          />

          <Text style={styles.label}>Confirmar nova senha</Text>
          <TextInput
            style={styles.input}
            value={confirmarNovaSenha}
            onChangeText={setConfirmarNovaSenha}
            placeholder="Digite a nova senha novamente"
            placeholderTextColor="#8A94A6"
            secureTextEntry
          />

          <Pressable
            style={[
              styles.primaryButton,
              carregando && styles.primaryButtonDisabled,
            ]}
            onPress={trocarSenha}
            disabled={carregando}
          >
            <Text style={styles.primaryButtonText}>
              {carregando ? 'Alterando...' : 'Alterar senha'}
            </Text>
          </Pressable>
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  title: {
    color: '#111827',
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
    marginBottom: 6,
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    height: 52,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    borderRadius: 24,
    backgroundColor: '#F8FAFF',
    color: '#111827',
  },
  primaryButton: {
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#2876E7',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
