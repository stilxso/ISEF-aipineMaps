import { View, StyleSheet } from 'react-native';
import OpenStreetMapView from '../components/OpenStreetMapView';

const MOCKED_ROUTE = {
  id: 'mock_trail_1',
  color: '#000',
  width: 3,
  geojson: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [76.92, 43.23],
            [76.93, 43.24],
            [76.92, 43.25],
            [76.93, 43.26],
            [76.94, 43.25],
          ],
        },
      },
    ],
  },
};

export default function GOScreen() {
  return (
    <View style={styles.container}>
      <OpenStreetMapView 
        routes={[MOCKED_ROUTE]}
        centerCoordinate={[76.93, 43.245]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
});