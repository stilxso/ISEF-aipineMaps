import { View, Text, StyleSheet } from 'react-native';

export default function AIScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Guide</Text>
      <Text style={styles.subtitle}>Здесь будут советы: снаряжение, погода, сложность</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});