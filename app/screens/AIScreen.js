import { View, Text, StyleSheet, TextInput } from 'react-native';

export default function AIScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Assistant</Text>
      <View style={styles.assistantOutput}>
        <Text style={styles.assistantText}>...</Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Ask for advice..."
        placeholderTextColor="#888"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  assistantOutput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  assistantText: {
    color: '#fff',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
  },
});