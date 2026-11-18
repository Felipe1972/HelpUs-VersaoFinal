import {useCallback,useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Text,ActivityIndicator} from 'react-native';
import {Screen,Card,Button,ui} from '../components/UI';
import api from '../services/api';
import {sessionError} from './PedidosScreen';
export default function PerfilVoluntarioScreen({navigation,route}){
 const [perfil,setPerfil]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useFocusEffect(useCallback(()=>{const abort=new AbortController();setPerfil(null);setError('');api.get('/conversas/'+route.params.id_conversa+'/perfil-voluntario',{signal:abort.signal}).then(({data})=>{if(!abort.signal.aborted)setPerfil(data.perfil)}).catch(async e=>{if(!abort.signal.aborted&&!await sessionError(e,navigation))setError(e.response?.data?.mensagem||'Não foi possível carregar o perfil.');});return()=>{abort.abort();setPerfil(null)}},[route.params.id_conversa,attempt,navigation]));
 return <Screen title="Perfil do voluntário" navigation={navigation} back active="Perfil">{error?<Text style={ui.subtitle}>{error}</Text>:!perfil?<ActivityIndicator/>:<Card style={{gap:16}}><Text style={ui.title}>{perfil.primeiro_nome}</Text><Text style={ui.subtitle}>{perfil.avaliacoes?perfil.media.toFixed(1)+' / 5 · '+perfil.avaliacoes+' avaliações':'Ainda sem avaliações.'}</Text><Text style={ui.subtitle}>{perfil.atendimentos_concluidos} atendimento(s) concluído(s)</Text>{perfil.participa_desde&&<Text style={ui.subtitle}>Na comunidade desde {new Date(perfil.participa_desde).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</Text>}</Card>}<Button title="Atualizar perfil" tone="soft" onPress={()=>setAttempt(v=>v+1)}/></Screen>;
}
