import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../services/api';

export default function CadastroScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [ehVoluntario, setEhVoluntario] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function cadastrar() {
    try {
      setCarregando(true);

      const response = await api.post('/usuarios/cadastro', {
        nome,
        email,
        telefone,
        senha,
        confirmarSenha,
        eh_voluntario: ehVoluntario,
      });

      Alert.alert('Sucesso', response.data.mensagem);
      navigation.navigate('Login');
    } catch (error) {
      const mensagem =
        error.response?.data?.mensagem ||
        'Não foi possível conectar à API. Verifique a rede e tente novamente.';

      Alert.alert('Erro no cadastro', mensagem);
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
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Preencha seus dados para começar.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Nome completo"
            placeholderTextColor="#8A94A6"
            autoCapitalize="words"
          />

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

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            value={telefone}
            onChangeText={setTelefone}
            placeholder="(00) 00000-0000"
            placeholderTextColor="#8A94A6"
            keyboardType="phone-pad"
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

          <Text style={styles.label}>Confirmar senha</Text>
          <TextInput
            style={styles.input}
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
            placeholder="Digite a senha novamente"
            placeholderTextColor="#8A94A6"
            secureTextEntry
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Quero atuar como voluntário</Text>
            <Switch
              value={ehVoluntario}
              onValueChange={setEhVoluntario}
              trackColor={{ false: '#CBD5E1', true: '#A7C5FF' }}
              thumbColor={ehVoluntario ? '#2670F0' : '#F8FAFC'}
            />
          </View>

          <Pressable
            style={[
              styles.primaryButton,
              carregando && styles.primaryButtonDisabled,
            ]}
            onPress={cadastrar}
            disabled={carregando}
          >
            <Text style={styles.primaryButtonText}>
              {carregando ? 'Cadastrando...' : 'Cadastrar'}
            </Text>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Já tem uma conta? Voltar ao login</Text>
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
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    marginTop: 12,
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 24,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#E8F0FF',
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
    color: '#111827',
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
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
