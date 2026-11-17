import { useState } from 'react';
import { Alert,Text } from 'react-native';
import * as Location from 'expo-location';
import AddressEditor,{addressPayload,addressReady} from '../components/AddressEditor';
import { Screen,Button,ui } from '../components/UI';
import api from '../services/api';
import { obtainLocation } from '../services/pedidoLocation';
import { sessionError } from './PedidosScreen';
export default function MeuEnderecoScreen({navigation}){
  const[value,setValue]=useState(null),[position,setPosition]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  async function locate(){setBusy(true);try{setPosition(await obtainLocation(Location));setNotice('')}catch(e){setNotice(e.message)}finally{setBusy(false)}}
  async function save(){if(busy||!addressReady(value))return;setBusy(true);try{await api.put('/meu-endereco',addressPayload(value));setNotice('Endereço salvo. Pedidos anteriores continuam com o endereço registrado na criação.')}catch(e){if(!await sessionError(e,navigation))setNotice(e.response?.data?.mensagem||'Não foi possível salvar.')}finally{setBusy(false)}}
  async function remove(){setBusy(true);try{await api.delete('/meu-endereco');setValue(null);setNotice('Endereço removido do uso no perfil. Os pedidos anteriores foram preservados.')}catch(e){if(!await sessionError(e,navigation))setNotice('Não foi possível remover.')}finally{setBusy(false)}}
  return <Screen title="Meu endereço" navigation={navigation} back active="Perfil"><Text style={ui.subtitle}>Seu endereço é privado. Salvar aqui não o compartilha com voluntários.</Text><Button title="Usar minha localização atual" disabled={busy} onPress={locate}/><AddressEditor position={position} value={value} onChange={setValue} disabled={busy}/>{!!notice&&<Text accessibilityLiveRegion="polite" style={ui.subtitle}>{notice}</Text>}<Button title="Salvar meu endereço" disabled={busy||!addressReady(value)} onPress={save}/><Button title="Remover endereço salvo" tone="soft" disabled={busy} onPress={()=>Alert.alert('Remover endereço do perfil?','Endereços já registrados em pedidos serão preservados.',[{text:'Voltar',style:'cancel'},{text:'Remover',onPress:remove}])}/></Screen>;
}
