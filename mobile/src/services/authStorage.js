import AsyncStorage from '@react-native-async-storage/async-storage';

const sessionListeners=new Set();
export function subscribeSession(listener){sessionListeners.add(listener);return()=>sessionListeners.delete(listener)}
function announce(user,reason){sessionListeners.forEach(fn=>fn(user,reason))}

const TOKEN_KEY = '@helpus:token';
const USUARIO_KEY = '@helpus:usuario';

export async function salvarSessao(token, usuario) {
  announce(null,'changing');
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USUARIO_KEY, JSON.stringify(usuario)],
  ]);
  announce(usuario);
}

export async function buscarUsuarioSalvo() {
  const usuario = await AsyncStorage.getItem(USUARIO_KEY);
  return usuario ? JSON.parse(usuario) : null;
}

export async function limparSessao() {
  announce(null,'logout');
  await AsyncStorage.multiRemove([TOKEN_KEY, USUARIO_KEY]);
}

export { TOKEN_KEY, USUARIO_KEY };


export async function atualizarUsuarioSalvo(usuario){const atual=await buscarUsuarioSalvo();if(atual?.id_usuario===usuario.id_usuario)await AsyncStorage.setItem(USUARIO_KEY,JSON.stringify(usuario));}
