import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View, Pressable } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Button, ui, colors } from './UI';
import api from '../services/api';

export const emptyAddress = {
  rua: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  complemento: '',
  referencia: '',
  sem_numero: false,
};
// Confere o endereço e a confirmação explícita do ponto antes do envio.
export function addressReady(a) {
  return !!(
    a?.confirmed &&
    a.rua?.trim() &&
    a.bairro?.trim() &&
    a.cidade?.trim() &&
    /^[A-Z]{2}$/.test(a.estado) &&
    (a.sem_numero ? a.referencia?.trim() : a.numero?.trim()) &&
    Number.isFinite(a.latitude) &&
    Number.isFinite(a.longitude)
  );
}
// Prepara somente os campos de endereço aceitos pela API.
export function addressPayload(a) {
  const { confirmed, ...data } = a;
  return data;
}
export default function AddressEditor({
  position,
  value,
  onChange,
  disabled = false,
  allowSaved = true,
}) {
  const [notice, setNotice] = useState(''),
    [geocoding, setGeocoding] = useState(false);
  const request = useRef(0),
    current = useRef(value);
  current.current = value;
  useEffect(() => {
    if (!position) return;
    const id = ++request.current;
    let alive = true;
    setGeocoding(true);
    setNotice('Buscando o endereço. Confira todos os campos antes de confirmar.');
    const coordinates = { latitude: position.latitude, longitude: position.longitude };
    onChange({ ...emptyAddress, ...coordinates, confirmed: false });
    let timer;
    Promise.race([
      Location.reverseGeocodeAsync(coordinates),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error()), 12000);
      }),
    ])
      .then((rows) => {
        if (!alive || id !== request.current) return;
        const r = rows[0];
        // Never trust an inferred house number. Preserve text typed while geocoding.
        onChange({
          ...emptyAddress,
          rua: r?.street || '',
          bairro: r?.district || r?.subregion || '',
          cidade: r?.city || '',
          estado: (r?.region?.length === 2 ? r.region : '').toUpperCase(),
          cep: r?.postalCode || '',
          ...Object.fromEntries(
            Object.entries(current.current || {}).filter(
              ([k, v]) => v && k !== 'confirmed',
            ),
          ),
          ...coordinates,
          confirmed: false,
        });
        setNotice(
          r
            ? 'Endereço sugerido pelo GPS. Confira a UF, informe o número e confirme o ponto.'
            : 'Preencha o endereço manualmente e confirme o ponto.',
        );
      })
      .catch(() => {
        if (alive)
          setNotice(
            'O endereço automático está indisponível. Preencha manualmente; a posição obtida continua válida.',
          );
      })
      .finally(() => {
        clearTimeout(timer);
        if (alive) setGeocoding(false);
      });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [position?.latitude, position?.longitude]);
  function change(key, v) {
    request.current++;
    onChange({ ...value, [key]: v, confirmed: false });
  }
  async function saved() {
    request.current++;
    setGeocoding(false);
    try {
      const { data } = await api.get('/meu-endereco');
      if (!data.endereco) {
        setNotice('Você ainda não salvou um endereço no perfil.');
        return;
      }
      onChange({ ...emptyAddress, ...data.endereco, confirmed: false });
      setNotice('Endereço salvo carregado. Confira e confirme o ponto deste pedido.');
    } catch {
      setNotice('Não foi possível carregar seu endereço salvo.');
    }
  }
  const point =
    value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)
      ? { latitude: value.latitude, longitude: value.longitude }
      : null;
  return (
    <View style={{ gap: 10 }}>
      <Text style={[ui.title, { fontSize: 21 }]}>Onde será a ajuda?</Text>
      {allowSaved && (
        <Button
          title="Usar meu endereço salvo"
          tone="soft"
          disabled={disabled}
          onPress={saved}
        />
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={ui.subtitle}>
          {notice}
        </Text>
      )}
      {[
        ['rua', 'Rua', 150],
        ['numero', 'Número', 20],
        ['bairro', 'Bairro', 100],
        ['cidade', 'Cidade', 100],
        ['estado', 'UF (ex.: RS)', 2],
        ['cep', 'CEP (opcional)', 9],
        ['complemento', 'Complemento (opcional)', 100],
        [
          'referencia',
          value?.sem_numero ? 'Referência obrigatória' : 'Referência (opcional)',
          255,
        ],
      ].map(([key, label, max]) => (
        <View key={key}>
          <Text style={ui.label}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            style={ui.input}
            value={value?.[key] || ''}
            maxLength={max}
            editable={!disabled && !(key === 'numero' && value?.sem_numero)}
            autoCapitalize={key === 'estado' ? 'characters' : 'sentences'}
            onChangeText={(v) => change(key, key === 'estado' ? v.toUpperCase() : v)}
          />
        </View>
      ))}
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: !!value?.sem_numero, disabled }}
        disabled={disabled}
        onPress={() =>
          onChange({
            ...value,
            sem_numero: !value?.sem_numero,
            numero: '',
            confirmed: false,
          })
        }
        style={{
          minHeight: 48,
          padding: 12,
          borderWidth: 1,
          borderColor: value?.sem_numero ? colors.blue : colors.line,
          borderRadius: 12,
          backgroundColor: value?.sem_numero ? '#EAF2FF' : 'white',
        }}
      >
        <Text>Endereço sem número: {value?.sem_numero ? 'Sim' : 'Não'}</Text>
      </Pressable>
      <Text style={ui.subtitle}>
        Se o endereço for de outro local, toque no mapa ou arraste o marcador para esse
        local. Alterar o texto exige uma nova confirmação do ponto.
      </Text>
      {point ? (
        <>
          <View style={{ height: 220, overflow: 'hidden', borderRadius: 16 }}>
            <MapView
              style={{ flex: 1 }}
              region={{ ...point, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
              onPress={(e) => {
                if (!disabled)
                  onChange({ ...value, ...e.nativeEvent.coordinate, confirmed: false });
              }}
            >
              <Marker
                coordinate={point}
                draggable={!disabled}
                onDragEnd={(e) =>
                  onChange({ ...value, ...e.nativeEvent.coordinate, confirmed: false })
                }
                title="Local do endereço"
              />
            </MapView>
          </View>
          <Button
            title={
              value.confirmed ? 'Local confirmado' : 'Confirmar endereço e ponto no mapa'
            }
            tone={value.confirmed ? 'soft' : 'blue'}
            disabled={disabled || geocoding}
            onPress={() => onChange({ ...value, confirmed: true })}
          />
        </>
      ) : (
        <Text style={ui.subtitle}>
          Obtenha a localização ou escolha um endereço salvo com posição válida.
        </Text>
      )}
    </View>
  );
}
