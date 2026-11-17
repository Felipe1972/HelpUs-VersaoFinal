import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Button, ui } from './UI';
export default function SchedulePicker({ value, onChange, disabled }) {
 const [month,setMonth]=useState(()=>new Date());
 const start=new Date(month.getFullYear(),month.getMonth(),1), days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const selected=value.date;
 return <View style={{gap:12}}><Text style={ui.label}>Quando você precisa de ajuda?</Text>
 <ModeOption title="Agora" selected={value.mode==='agora'} disabled={disabled} onPress={()=>onChange({...value,mode:'agora'})}/>
 <ModeOption title="Agendar data e horário" selected={value.mode==='agendado'} disabled={disabled} onPress={()=>onChange({...value,mode:'agendado'})}/>
 {value.mode==='agendado'&&<><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Button title="‹" disabled={disabled} onPress={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}/><Text style={[ui.label,{flex:1,textAlign:'center'}]}>{month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</Text><Button title="›" disabled={disabled} onPress={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}/></View>
 <View style={{flexDirection:'row',flexWrap:'wrap'}}>{Array.from({length:start.getDay()},(_,i)=><View key={'empty'+i} style={{width:'14.28%'}}/>)}{Array.from({length:days},(_,i)=>{const d=new Date(month.getFullYear(),month.getMonth(),i+1),key=[d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');const past=d.getTime()<new Date().setHours(0,0,0,0);return <Pressable key={key} accessibilityRole="button" accessibilityLabel={d.toLocaleDateString('pt-BR')} disabled={disabled||past} onPress={()=>onChange({...value,date:key})} style={{width:'14.28%',minHeight:48,alignItems:'center',justifyContent:'center',backgroundColor:selected===key?'#DCEAFF':'white',opacity:past?0.3:1}}><Text>{i+1}</Text></Pressable>})}</View>
 <Text style={ui.subtitle}>Horário local · {selected||'Selecione uma data'}</Text><View style={{flexDirection:'row',gap:12}}>{['hour','minute'].map((field,i)=><View key={field} style={{flex:1}}><Text style={ui.label}>{i?'Minuto':'Hora'}</Text><TextInput accessibilityLabel={i?'Minuto':'Hora'} keyboardType="number-pad" maxLength={2} editable={!disabled} style={ui.input} value={value[field]} onChangeText={t=>onChange({...value,[field]:t.replace(/\D/g,'')})}/></View>)}</View></>}
 </View>;
}
export function schedulePayload(s){
 const fuso_horario=Intl.DateTimeFormat().resolvedOptions().timeZone;
 if(s.mode==='agora')return {modalidade_horario:'agora',fuso_horario};
 if(!s.date||!/^\d{1,2}$/.test(s.hour)||!/^\d{1,2}$/.test(s.minute)||Number(s.hour)>23||Number(s.minute)>59)throw Error('Selecione data e horário válidos.');
 const [y,m,d]=s.date.split('-').map(Number),dt=new Date(y,m-1,d,Number(s.hour),Number(s.minute));
 if(dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d||dt.getHours()!==Number(s.hour)||dt.getMinutes()!==Number(s.minute)||dt<=new Date())throw Error('Escolha um horário futuro válido no seu fuso.');
 return {modalidade_horario:'agendado',necessaria_em:dt.toISOString(),fuso_horario};
}

function ModeOption({title,selected,disabled,onPress}){return <Pressable accessibilityRole="radio" accessibilityState={{checked:selected,disabled}} disabled={disabled} onPress={onPress} style={{minHeight:48,padding:14,borderRadius:14,borderWidth:1,borderColor:selected?'#2876E7':'#E6ECF3',backgroundColor:selected?'#EAF2FF':'white',opacity:disabled?0.6:1}}><Text style={{color:'#151B27',fontSize:15,fontWeight:selected?'700':'500'}}>{title}</Text></Pressable>}
