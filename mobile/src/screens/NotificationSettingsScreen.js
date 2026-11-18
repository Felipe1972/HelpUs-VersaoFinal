import { useCallback, useState } from 'react';
import { AppState, Linking, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Button, ui } from '../components/UI';
import { notificationPermission } from '../context/NotificationsContext';
// Renderiza a tela NotificationSettings.
export default function NotificationSettingsScreen({ navigation }) {
  const [status, setStatus] = useState('Consultando…');
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const update = () =>
        notificationPermission()
          .then((s) => {
            if (active) setStatus(s);
          })
          .catch(() => {
            if (active) setStatus('Não foi possível consultar a permissão.');
          });
      void update();
      const listener = AppState.addEventListener('change', (next) => {
        if (next === 'active') void update();
      });
      return () => {
        active = false;
        listener.remove();
      };
    }, []),
  );
  return (
    <Screen title="Notificações" navigation={navigation} back active="Perfil">
      <Text style={ui.subtitle}>{status}</Text>
      <Text style={ui.subtitle}>
        Os avisos ficam disponíveis no sino mesmo sem permissão. No Expo Go, novos avisos
        locais são apresentados enquanto o aplicativo está aberto e ativo. Com ele
        fechado, consulte seus avisos ao voltar.
      </Text>
      <Button
        title="Abrir ajustes do aparelho"
        onPress={() =>
          Linking.openSettings().catch(() =>
            setStatus('Abra os ajustes do aparelho e procure o Expo Go.'),
          )
        }
      />
    </Screen>
  );
}
