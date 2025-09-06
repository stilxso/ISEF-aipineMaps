import { View, Text, StyleSheet } from 'react-native';
import OpenStreetMapView from '../components/OpenStreetMapView';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AlpineMaps</Text>
      <OpenStreetMapView style={styles.map} />
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
  map: {
    flex: 1,
    borderRadius: 12,
  },
});