import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
export default function usePollingRefresh(refresh){useFocusEffect(useCallback(()=>{
 const timer=setInterval(()=>{if(AppState.currentState==='active')refresh(v=>v+1)},15000);
 const listener=AppState.addEventListener('change',s=>{if(s==='active')refresh(v=>v+1)});
 return ()=>{clearInterval(timer);listener.remove()};
},[refresh]));}
