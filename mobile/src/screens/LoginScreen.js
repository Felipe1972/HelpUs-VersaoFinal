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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.brand}>Help Us</Text>
          <Text style={styles.headerText}>Cuidado, apoio e segurança.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Acesse sua conta para continuar.</Text>

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            placeholderTextColor="#8A94A6"
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
            placeholderTextColor="#8A94A6"
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
      </ScrollView>
    </KeyboardAvoidingView>
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 28,
    borderRadius: 24,
    backgroundColor: '#2670F0',
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerText: {
    marginTop: 6,
    color: '#E8F0FF',
    fontWeight: '600',
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
    fontSize: 24,
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
    borderRadius: 14,
    backgroundColor: '#F8FAFF',
    color: '#111827',
  },
  primaryButton: {
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#2670F0',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  link: {
    marginTop: 20,
    color: '#1D4ED8',
    fontWeight: '700',
    textAlign: 'center',
  },
});
