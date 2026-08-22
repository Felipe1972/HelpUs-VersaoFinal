import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import PerfilScreen from '../screens/PerfilScreen';
import UsuariosScreen from '../screens/UsuariosScreen';
import TrocarSenhaScreen from '../screens/TrocarSenhaScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2670F0',
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
          options={{ title: 'Cadastro', headerBackTitle: 'Login' }}
        />
        <Stack.Screen
          name="Perfil"
          component={PerfilScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Usuarios"
          component={UsuariosScreen}
          options={{ title: 'Usuários' }}
        />
        <Stack.Screen
          name="TrocarSenha"
          component={TrocarSenhaScreen}
          options={{ title: 'Trocar senha' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
