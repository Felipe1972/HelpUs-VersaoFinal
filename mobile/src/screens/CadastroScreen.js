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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Preencha seus dados para começar.</Text>

        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Nome completo"
          autoCapitalize="words"
        />

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

        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={styles.input}
          value={telefone}
          onChangeText={setTelefone}
          placeholder="(00) 00000-0000"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          value={senha}
          onChangeText={setSenha}
          placeholder="Digite sua senha"
          secureTextEntry
        />

        <Text style={styles.label}>Confirmar senha</Text>
        <TextInput
          style={styles.input}
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          placeholder="Digite a senha novamente"
          secureTextEntry
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Quero atuar como voluntário</Text>
          <Switch
            value={ehVoluntario}
            onValueChange={setEhVoluntario}
            trackColor={{ false: '#CBD5E1', true: '#81B7BC' }}
            thumbColor={ehVoluntario ? '#1F6F78' : '#F8FAFC'}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF5F6',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    marginTop: 12,
    color: '#1F2937',
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
    color: '#374151',
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
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
