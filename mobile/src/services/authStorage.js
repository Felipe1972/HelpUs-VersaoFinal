import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@helpus:token';
const USUARIO_KEY = '@helpus:usuario';

export async function salvarSessao(token, usuario) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USUARIO_KEY, JSON.stringify(usuario)],
  ]);
}

export async function buscarUsuarioSalvo() {
  const usuario = await AsyncStorage.getItem(USUARIO_KEY);
  return usuario ? JSON.parse(usuario) : null;
}

export async function limparSessao() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USUARIO_KEY]);
}

export { TOKEN_KEY, USUARIO_KEY };

