import { useCallback,useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen,Button,ListRow,ui } from '../components/UI';
import api from '../services/api';
import usePollingRefresh from '../hooks/usePollingRefresh';
import { sessionError } from './PedidosScreen';
export default function NotificacoesReaisScreen({navigation}){
  const[items,setItems]=useState([]),[error,setError]=useState(''),[tick,setTick]=useState(0);
  usePollingRefresh(setTick);
  useFocusEffect(useCallback(()=>{const abort=new AbortController();api.get('/notificacoes',{signal:abort.signal}).then(({data})=>{if(!abort.signal.aborted){setItems(data.notificacoes);setError('')}}).catch(async e=>{if(!abort.signal.aborted&&!await sessionError(e,navigation)){setItems([]);setError('Não foi possível carregar seus avisos.')}});return()=>{abort.abort();setItems([])}},[tick,navigation]));
  async function open(n){try{await api.post('/notificacoes/'+n.id_notificacao+'/lida');navigation.navigate(n.tipo==='conversa'?'Conversas':'Acompanhamento',{id_ocorrencia:n.id_ocorrencia})}catch(e){if(!await sessionError(e,navigation))setError('Não foi possível abrir o aviso. Tente novamente.')}}
  return <Screen title="Seus avisos" navigation={navigation} active="Notificacoes"><Text style={ui.subtitle}>{error||(!items.length?'Nenhum aviso por enquanto.':'Atualizados enquanto o aplicativo está aberto.')}</Text>{items.map(n=><ListRow key={n.id_notificacao} icon={n.lida_em?'notifications-outline':'notifications'} title={n.titulo} subtitle={(n.lida_em?'Lido':'Novo')+' · Pedido #'+n.id_ocorrencia+' · '+new Date(n.criada_em).toLocaleString('pt-BR')} onPress={()=>open(n)}/>)}<Button title="Atualizar avisos" tone="soft" onPress={()=>setTick(t=>t+1)}/></Screen>;
}
