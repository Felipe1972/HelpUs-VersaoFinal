import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Button, ListRow, goMain, colors, ui } from '../components/UI';
import api from '../services/api';
import { limparSessao } from '../services/authStorage';

export default function PerfilScreen({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let telaAtiva = true;

    async function carregarPerfil() {
      setCarregando(true);
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
  }, [navigation, tentativa]);

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
      'Esta ação é permanente. Sua conta e os dados vinculados, incluindo ocorrências, atendimentos e mensagens relacionados, serão excluídos. Não poderá ser desfeita.',
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

  return (
    <Screen title="Meu perfil" navigation={navigation} active="Perfil">
      <Button title="Ir para a Home" onPress={() => goMain(navigation, 'Home')} />
      {carregando ? <Card><ActivityIndicator color={colors.blue} /><Text style={[ui.subtitle, { textAlign: 'center', marginTop: 12 }]}>Carregando perfil...</Text></Card> : usuario ? <Card style={{ gap: 18 }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="person-outline" size={38} color={colors.blue} /></View>
          <Text style={[ui.title, { textAlign: 'center' }]}>Olá, {usuario.nome}!</Text>
          <Text style={ui.subtitle}>Que bom ter você na comunidade.</Text>
        </View>
        {[['E-mail', usuario.email], ['Telefone', usuario.telefone || 'Não informado'], ['Voluntário', usuario.eh_voluntario ? 'Sim' : 'Não'], ['Status', usuario.status_verificacao]].map(([label, value]) => <View key={label} style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 14 }}><Text style={ui.label}>{label}</Text><Text selectable style={ui.subtitle}>{value}</Text></View>)}
        {usuario.eh_voluntario&&<Text style={ui.subtitle}>{usuario.reputacao?usuario.reputacao.media.toFixed(1)+' / 5 · '+usuario.reputacao.quantidade+' avaliações':'Ainda sem avaliações recebidas'}</Text>}
      </Card> : <Card><Text style={ui.subtitle}>Não foi possível carregar seu perfil. Verifique sua conexão e tente novamente.</Text><Button style={{ marginTop: 16 }} title="Tentar novamente" onPress={() => setTentativa(value => value + 1)} /></Card>}
      <Text style={ui.section}>MINHA CONTA</Text><ListRow icon="location-outline" title="Meu endereço" onPress={()=>navigation.navigate('MeuEndereco')} />
      <ListRow icon="people-outline" title="Ver usuários" onPress={() => navigation.navigate('Usuarios')} />
      <ListRow icon="lock-closed-outline" title="Trocar senha" onPress={() => navigation.navigate('TrocarSenha')} />
      <Button title="Sair da conta" tone="soft" onPress={sair} />
      <Button title={excluindo ? 'Excluindo...' : 'Excluir conta'} tone="red" disabled={excluindo} onPress={confirmarExclusao} />
    </Screen>
  );
}
