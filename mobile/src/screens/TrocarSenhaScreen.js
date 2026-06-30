import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../services/api';
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Trocar senha</Text>
        <Text style={styles.subtitle}>Informe sua senha atual e a nova.</Text>

        <Text style={styles.label}>Senha atual</Text>
        <TextInput
          style={styles.input}
          value={senhaAtual}
          onChangeText={setSenhaAtual}
          placeholder="Digite a senha atual"
          secureTextEntry
        />

        <Text style={styles.label}>Nova senha</Text>
        <TextInput
          style={styles.input}
          value={novaSenha}
          onChangeText={setNovaSenha}
          placeholder="Digite a nova senha"
          secureTextEntry
        />

        <Text style={styles.label}>Confirmar nova senha</Text>
        <TextInput
          style={styles.input}
          value={confirmarNovaSenha}
          onChangeText={setConfirmarNovaSenha}
          placeholder="Digite a nova senha novamente"
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
    </KeyboardAvoidingView>
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
    marginBottom: 6,
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    height: 48,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  primaryButton: {
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1F6F78',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

