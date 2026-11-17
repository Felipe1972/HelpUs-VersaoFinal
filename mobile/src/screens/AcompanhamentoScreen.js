import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { obtainLocation } from '../services/pedidoLocation';
import { useCallback, useRef, useState, useEffect } from 'react';
import { Alert, Text, TextInput, View, ActivityIndicator, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import { Screen, Card, Button, ui } from '../components/UI';
import api from '../services/api';
import usePollingRefresh from '../hooks/usePollingRefresh';
import { sessionError, urgencyLabels, distanceLabel } from './PedidosScreen';

export default function AcompanhamentoScreen({ navigation, route }) {
  const id=route.params.id_ocorrencia;
  const [item,setItem]=useState(null),[error,setError]=useState(''),[tick,setTick]=useState(0),[busy,setBusy]=useState(false);
  const [nota,setNota]=useState(0),[comment,setComment]=useState('');const lock=useRef(false);
  const [position,setPosition]=useState(null);const map=useRef(null);
  useEffect(()=>{let alive=true;obtainLocation(Location).then(p=>{if(alive)setPosition(p)}).catch(()=>{});return()=>{alive=false}},[]);
  usePollingRefresh(setTick);
  useFocusEffect(useCallback(()=>{
    const abort=new AbortController();
    api.get('/ocorrencias/'+id,{signal:abort.signal}).then(({data})=>{if(!abort.signal.aborted){setItem(data.ocorrencia);setError('')}}).catch(async e=>{if(!abort.signal.aborted){setItem(null);if(!await sessionError(e,navigation))setError(e.response?.data?.mensagem||'Não foi possível confirmar o estado atual. Atualize para continuar.')}});
    return()=>{abort.abort();setItem(null)};
  },[id,tick,navigation]));
  async function act(kind,body={}){
    if(lock.current)return;lock.current=true;setBusy(true);
    try{await api.post('/ocorrencias/'+id+'/'+kind,body);setError('');setTick(t=>t+1)}catch(e){if(!await sessionError(e,navigation))setError(e.response?.data?.mensagem||'A confirmação não chegou. Atualize antes de repetir.')}finally{lock.current=false;setBusy(false)}
  }
  function confirm(kind,title,message,body={}){Alert.alert(title,message,[{text:'Voltar',style:'cancel'},{text:'Confirmar',onPress:()=>act(kind,body)}])}
  const a=item?.acompanhamento;
  const address=item?.endereco;
  return <Screen title="Acompanhar pedido" navigation={navigation} back active="Home">
    {!!error&&<Text accessibilityLiveRegion="polite" style={ui.subtitle}>{error}</Text>}
    {!item&&!error&&<ActivityIndicator/>}
    {item&&<>
      <Card style={{gap:12}}><Text style={ui.title}>{item.titulo}</Text><Text style={ui.label}>{item.status.replaceAll('_',' ')} · {urgencyLabels[item.nivel_urgencia]}</Text><Text style={ui.subtitle}>{item.descricao_publica}</Text><Text style={ui.subtitle}>{item.modalidade_horario==='agendado'?'Agendado':'Horário solicitado'}: {item.necessaria_em?new Date(item.necessaria_em).toLocaleString('pt-BR'):'Não informado'} (horário deste aparelho)</Text>
        {a?.responsavel&&<Text style={ui.label}>Responsável: {a.responsavel}</Text>}
        {a?.reputacao&&<Text style={ui.subtitle}>{a.reputacao.media.toFixed(1)} / 5 · {a.reputacao.quantidade} avaliação(ões)</Text>}
        {a?.ambiguo&&<Text style={ui.subtitle}>Este pedido antigo possui vínculos simultâneos. O histórico foi preservado; novas liberações de localização estão bloqueadas.</Text>}
        {a?.id_conversa&&<Button title="Abrir chat do atendimento" onPress={()=>navigation.navigate('Chat',{id_conversa:a.id_conversa})}/>}
        {!a?.id_conversa&&<Button title="Ver minhas conversas" tone="soft" onPress={()=>navigation.navigate('Conversas')}/>}
      </Card>
      <Card style={{gap:12}}><Text style={[ui.title,{fontSize:21}]}>Local do pedido</Text>
        <Text style={ui.subtitle}>{item.meu_pedido?'O endereço só será liberado ao responsável após sua autorização.':item.endereco_disponivel?'O solicitante autorizou o compartilhamento deste local.':'Aguardando autorização do solicitante. Posição exata, endereço e descrição privada estão protegidos.'}</Text>
        {item.endereco_disponivel&&<><Text style={ui.subtitle}>{item.descricao}</Text><Text style={ui.subtitle}>{address?[address.rua,address.sem_numero?'s/n':address.numero,address.complemento,address.bairro,address.cidade,address.estado,address.cep,address.referencia].filter(Boolean).join(' · '):item.endereco_referencia||'Endereço estruturado não informado neste pedido antigo.'}</Text>
          {Number.isFinite(item.latitude)&&Number.isFinite(item.longitude)&&<View style={{height:230,borderRadius:18,overflow:'hidden'}}><MapView ref={map} style={{flex:1}} initialRegion={{latitude:item.latitude,longitude:item.longitude,latitudeDelta:0.008,longitudeDelta:0.008}}><Marker coordinate={{latitude:item.latitude,longitude:item.longitude}} title="Local autorizado"/>{position&&<Marker coordinate={{latitude:position.latitude,longitude:position.longitude}} pinColor="#2876E7" title="Sua posição (somente neste aparelho)"/>}</MapView></View>}
          <Text style={ui.subtitle}>{distanceLabel(position,item)}</Text><Button title="Centralizar no destino" tone="soft" onPress={()=>map.current?.animateToRegion({latitude:item.latitude,longitude:item.longitude,latitudeDelta:0.008,longitudeDelta:0.008},400)}/>
        </>}
        {a?.pode_compartilhar&&<><Button disabled={busy} title={a.compartilhado?'Revogar compartilhamento':'Compartilhar localização com responsável'} tone={a.compartilhado?'soft':'blue'} onPress={()=>confirm(a.compartilhado?'revogar':'compartilhar',a.compartilhado?'Revogar acesso?':'Compartilhar com '+a.responsavel+'?', 'Isso inclui posição exata, endereço e descrição privada deste pedido. Você pode revogar. Informações já vistas ou capturadas não podem ser recuperadas.',{id_atendimento:a.id_atendimento})}/><Text style={ui.subtitle}>A autorização vale somente para este atendimento e este responsável.</Text></>}
      </Card>
      {a?.conclusao_solicitada&&<Text style={ui.label}>O voluntário informou que terminou. A confirmação cabe ao solicitante.</Text>}
      {a?.pode_solicitar_conclusao&&<Button title={a.conclusao_solicitada?'Conclusão aguardando confirmação':'Informar atendimento concluído'} disabled={busy||a.conclusao_solicitada} onPress={()=>confirm('solicitar-conclusao','Informar conclusão?','O solicitante deverá confirmar que recebeu a ajuda.')}/>}
      {a?.pode_finalizar&&<Button title="Confirmar conclusão" disabled={busy} onPress={()=>confirm('finalizar','Concluir atendimento?','Confirme apenas se a ajuda foi realizada. O chat ficará somente leitura e o acesso privado será encerrado.')}/>}
      {a?.pode_finalizar&&a.conclusao_solicitada&&<Button title="Ainda não foi concluído" tone="soft" disabled={busy} onPress={()=>act('rejeitar-conclusao')}/>}
      {a?.pode_desistir&&<Button title="Não poderei comparecer" tone="red" disabled={busy} onPress={()=>confirm('desistir','Desistir do atendimento?','O solicitante será avisado e seu acesso privado será encerrado. Esta conversa ficará somente leitura.')}/>}
      {a?.pode_reabrir&&<Card style={{gap:12}}><Text style={ui.subtitle}>O horário solicitado já passou. Confirme se ainda precisa de ajuda para reabrir a oportunidade. O horário original será preservado.</Text><Button title="Ainda preciso de ajuda: reabrir" disabled={busy} onPress={()=>confirm('reabrir','Reabrir pedido?','O pedido voltará a aparecer para outros voluntários.')}/></Card>}
      {a?.pode_cancelar&&<Button title="Cancelar pedido" tone="red" disabled={busy} onPress={()=>confirm('cancelar','Cancelar pedido?','O responsável será avisado, o compartilhamento encerrado e o histórico preservado.')}/>}
      {a?.pode_avaliar&&<Card style={{gap:12}}><Text style={ui.title}>Como foi a ajuda?</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[1,2,3,4,5].map(n=><Pressable key={n} accessibilityRole="radio" accessibilityLabel={n+' estrelas'} accessibilityState={{checked:nota===n,disabled:busy}} onPress={()=>setNota(n)} disabled={busy} style={{minWidth:44,minHeight:48,alignItems:'center',justifyContent:'center'}}><Ionicons name={nota>=n?'star':'star-outline'} size={30} color="#B47700"/></Pressable>)}</View><TextInput accessibilityLabel="Comentário da avaliação" style={ui.input} placeholder="Comentário opcional (privado)" value={comment} onChangeText={setComment} multiline maxLength={500}/><Button title="Enviar avaliação" disabled={!nota||busy} onPress={()=>act('avaliar',{nota,comentario:comment})}/></Card>}
      {!!a?.avaliacao&&<Text style={ui.subtitle}>Sua avaliação: {a.avaliacao.nota} / 5. Obrigado pelo retorno.</Text>}
    </>}
    <Button title="Atualizar atendimento" tone="soft" disabled={busy} onPress={()=>setTick(t=>t+1)}/>
  </Screen>;
}
