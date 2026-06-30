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
import { salvarSessao } from '../services/authStorage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    try {
      setCarregando(true);

      const response = await api.post('/usuarios/login', { email, senha });
      const { token, usuario } = response.data;

      await salvarSessao(token, usuario);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Perfil', params: { usuario } }],
      });
    } catch (error) {
      const mensagem =
        error.response?.data?.mensagem ||
        'Não foi possível conectar à API. Verifique a rede e tente novamente.';

      Alert.alert('Erro no login', mensagem);
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
        <Text style={styles.brand}>Help Us</Text>
        <Text style={styles.title}>Entrar</Text>
        <Text style={styles.subtitle}>Acesse sua conta para continuar.</Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          value={senha}
          onChangeText={setSenha}
          placeholder="Digite sua senha"
          secureTextEntry
        />

        <Pressable
          style={[
            styles.primaryButton,
            carregando && styles.primaryButtonDisabled,
          ]}
          onPress={entrar}
          disabled={carregando}
        >
          <Text style={styles.primaryButtonText}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Cadastro')}>
          <Text style={styles.link}>Ainda não tem conta? Cadastre-se</Text>
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
  brand: {
    marginBottom: 8,
    color: '#1F6F78',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  title: {
    color: '#1F2937',
    fontSize: 24,
    fontWeight: '700',
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  link: {
    marginTop: 20,
    color: '#1F6F78',
    fontWeight: '600',
    textAlign: 'center',
  },
});
