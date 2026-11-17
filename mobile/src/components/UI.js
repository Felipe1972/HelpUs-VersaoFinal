import { Pressable, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';

export const colors = { blue: '#2876E7', ink: '#151B27', muted: '#63738C', pale: '#F5F8FD', red: '#EF3036', line: '#E6ECF3' };
export const ui = StyleSheet.create({
  title: { color: colors.ink, fontSize: 26, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: '#EFF2F6', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 15, minHeight: 52, color: colors.ink, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  center: { alignItems: 'center', gap: 20 },
  section: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.4, marginBottom: 14, marginTop: 8 },
});

export function goMain(navigation, name) {
  const exists = navigation.getState().routes.some((route) => route.name === name);
  if (exists) navigation.popTo(name);
  else navigation.navigate(name);
}

export function IconButton({ name, label, onPress, color = colors.blue, disabled = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.iconButton, (pressed || disabled) && s.pressed]}><Ionicons name={name} size={27} color={color} /></Pressable>;
}

export function Header({ title, navigation, back = false, auth = false }) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  return <View style={[s.header, { paddingTop: insets.top + 4, paddingLeft: Math.max(insets.left, 16), paddingRight: Math.max(insets.right, 16) }]}>
    {focused && <StatusBar style="light" />}
    <View style={s.headerRow}>
      {!auth || back ? <IconButton name={back ? 'arrow-back' : 'menu'} color="white" label={back ? 'Voltar' : 'Abrir menu'} onPress={() => back ? (navigation.canGoBack() ? navigation.goBack() : goMain(navigation, 'Home')) : navigation.navigate('Menu')} /> : null}
      <Text accessibilityRole="header" style={s.headerTitle}>{title}</Text>
    </View>
  </View>;
}

const tabs = [['Home', 'home-outline', 'Início'], ['Conversas', 'chatbubble-outline', 'Chat'], ['Notificacoes', 'notifications-outline', 'Avisos'], ['Perfil', 'person-outline', 'Perfil']];
export function BottomBar({ navigation, active }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 8) }]}>{tabs.map(([route, icon, label]) => <Pressable key={route} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active === route }} onPress={() => goMain(navigation, route)} style={({ pressed }) => [s.tab, pressed && s.pressed]}>
    <Ionicons name={icon} size={27} color={active === route ? colors.blue : colors.ink} />
    <Text style={[s.tabLabel, active === route && { color: colors.blue }]}>{label}</Text>
  </Pressable>)}</View>;
}

export function Screen({ title, navigation, active, back, auth, scroll = true, children, contentStyle }) {
  return <View style={s.screen}><Header {...{ title, navigation, back, auth }} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, contentStyle]}>{children}</ScrollView> : <View style={[{ flex: 1 }, contentStyle]}>{children}</View>}
    </KeyboardAvoidingView>
    {!auth && <BottomBar navigation={navigation} active={active} />}
  </View>;
}

export function Card({ children, style }) { return <View style={[s.card, style]}>{children}</View>; }
export function Button({ title, onPress, tone = 'blue', disabled, style }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, { backgroundColor: tone === 'red' ? colors.red : tone === 'soft' ? '#EAF2FF' : colors.blue }, style, (pressed || disabled) && s.pressed]}><Text style={[s.buttonText, tone === 'soft' && { color: colors.blue }]}>{title}</Text></Pressable>;
}
export function DemoNotice({ text = 'Demonstração • dados fictícios' }) { return <View style={s.demo}><Ionicons name="flask-outline" size={14} color={colors.muted} /><Text style={s.demoText}>{text}</Text></View>; }
export function ListRow({ icon, title, subtitle, onPress, color = colors.blue, trailing }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && s.pressed}><Card style={s.listRow}><View style={[s.avatar, { backgroundColor: `${color}15` }]}><Ionicons name={icon} color={color} size={25} /></View><View style={{ flex: 1, gap: 5 }}><Text style={s.rowTitle}>{title}</Text>{subtitle && <Text style={ui.subtitle}>{subtitle}</Text>}</View>{trailing || <Ionicons name="chevron-forward" color={colors.muted} size={20} />}</Card></Pressable>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { backgroundColor: colors.blue, paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 8 },
  headerTitle: { flex: 1, color: 'white', fontSize: 26, fontWeight: '800', textAlign: 'left', paddingVertical: 6, flexShrink: 1 },
  iconButton: { width: 48, height: 44, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 28, gap: 20, flexGrow: 1 },
  bottom: { flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderColor: colors.line, paddingTop: 8 },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  card: { backgroundColor: 'white', borderRadius: 22, padding: 22, shadowColor: '#172947', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 16, elevation: 3 },
  button: { minHeight: 52, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  pressed: { opacity: 0.6 },
  demo: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  demoText: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 88, padding: 18 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.ink, fontSize: 19, fontWeight: '700' },
});
