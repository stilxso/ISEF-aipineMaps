import { View, Text, StyleSheet } from 'react-native';
import MapView3D from '../components/MapView3D';

export default function TrailsScreen() {
  return (
    <View style={styles.container}>
      <MapView3D style={styles.map} />
      <View style={styles.peakContainer}>
        <Text style={styles.peakText}>PEAK</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  map: {
    flex: 1,
  },
  peakContainer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  peakText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});