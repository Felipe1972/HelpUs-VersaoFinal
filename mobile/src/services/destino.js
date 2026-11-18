export function formatAddress(a){return a?[a.rua,a.sem_numero?'s/n':a.numero,a.complemento,a.bairro,a.cidade,a.estado,a.cep].filter(Boolean).join(', '):''}
export async function authorizedDestination(api,id,mode,platform,linking,clipboard){
 const {data}=await api.get('/ocorrencias/'+id+'/destino');
 if(!Number.isFinite(data.latitude)||!Number.isFinite(data.longitude))throw Error('Destino indisponível.');
 if(mode==='copy'){const text=formatAddress(data.endereco);if(!text)throw Error('Endereço estruturado não informado.');await clipboard.setStringAsync(text);return}
 const point=data.latitude+','+data.longitude;
 const native=platform==='ios'?'maps://?daddr='+point:'google.navigation:q='+point;
 const web=platform==='ios'?'https://maps.apple.com/?daddr='+point:'https://www.google.com/maps/dir/?api=1&destination='+point;
 try{if(await linking.canOpenURL(native)){await linking.openURL(native);return}}catch{/* Alternativa web sem depender de aplicativo instalado. */}
 await linking.openURL(web);
}
