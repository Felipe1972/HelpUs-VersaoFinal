import SOSScreen from '../screens/SOSScreen';
import ContaComplementosScreen from '../screens/ContaComplementosScreen';
import PerfilVoluntarioScreen from '../screens/PerfilVoluntarioScreen';
import {
  NotificationsProvider,
  notificationNavigation,
  notificationNavigationChanged,
} from '../context/NotificationsContext';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import AcompanhamentoScreen from '../screens/AcompanhamentoScreen';
import MeuEnderecoScreen from '../screens/MeuEnderecoScreen';
import NotificacoesReaisScreen from '../screens/NotificacoesReaisScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import PerfilScreen from '../screens/PerfilScreen';
import TrocarSenhaScreen from '../screens/TrocarSenhaScreen';
import HomeScreen from '../screens/HomeScreen';
import PedidosScreen, { MeusPedidosScreen } from '../screens/PedidosScreen';
import { DemoProvider } from '../context/DemoContext';
import { ConversasScreen, ChatScreen } from '../screens/ChatScreens';
import {
  AvisoScreen,
  AlertaEmergenciaScreen,
  OcorrenciaMapaScreen,
  OcorrenciaDetalhesScreen,
  MenuScreen,
} from '../screens/CommunityScreens';

const Stack = createNativeStackNavigator();

// Registra as telas e envolve a navegação nos provedores compartilhados.
export default function AppNavigator() {
  return (
    <DemoProvider>
      <NotificationsProvider>
        <NavigationContainer
          ref={notificationNavigation}
          onReady={notificationNavigationChanged}
          onStateChange={notificationNavigationChanged}
        >
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#2876E7',
              },
              headerTintColor: '#FFFFFF',
              headerTitleStyle: {
                fontWeight: '800',
              },
              contentStyle: {
                backgroundColor: '#F5F8FF',
              },
            }}
          >
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Cadastro"
              component={CadastroScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Perfil"
              component={PerfilScreen}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="TrocarSenha"
              component={TrocarSenhaScreen}
              options={{ headerShown: false }}
            />
            {Object.entries({
              EditarPerfil: ContaComplementosScreen,
              ContatosEmergencia: ContaComplementosScreen,
              PerfilVoluntario: PerfilVoluntarioScreen,
              NotificationSettings: NotificationSettingsScreen,
              Conversas: ConversasScreen,
              Chat: ChatScreen,
              Acompanhamento: AcompanhamentoScreen,
              MeuEndereco: MeuEnderecoScreen,
              Notificacoes: NotificacoesReaisScreen,
              Aviso: AvisoScreen,
              AlertaEmergencia: AlertaEmergenciaScreen,
              OcorrenciaMapa: OcorrenciaMapaScreen,
              OcorrenciaDetalhes: OcorrenciaDetalhesScreen,
              Menu: MenuScreen,
              SOS: SOSScreen,
              SolicitarAjuda: PedidosScreen,
              MeusPedidos: MeusPedidosScreen,
            }).map(([name, component]) => (
              <Stack.Screen
                key={name}
                name={name}
                component={component}
                options={{ headerShown: false }}
              />
            ))}
          </Stack.Navigator>
        </NavigationContainer>
      </NotificationsProvider>
    </DemoProvider>
  );
}
