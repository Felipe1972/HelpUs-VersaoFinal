import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Help Us</Text>
      <Text style={styles.message}>Aplicativo iniciado com sucesso!</Text>
      <Text style={styles.description}>
        A navegação inicial está configurada e pronta para as próximas telas.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F7FAFC',
  },
  title: {
    marginBottom: 12,
    color: '#1F4E5F',
    fontSize: 32,
    fontWeight: '700',
  },
  message: {
    marginBottom: 8,
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});

