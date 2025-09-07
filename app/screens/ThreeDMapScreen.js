import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import MapBoxMapView from '../components/MapBoxMapView'; // using native mapbox component
import { useLocation } from '../contexts/LocationContext';

export default function ThreeDMapScreen() {
  const { currentLocation, isLocationAvailable } = useLocation();

  const center = useMemo(() => {
    if (isLocationAvailable && currentLocation) {
      return [currentLocation.longitude, currentLocation.latitude];
    }
    return [76.95, 43.25];
  }, [currentLocation, isLocationAvailable]);

  const routes = [];
  const markers = [];

  return (
    <View style={styles.container}>
      <MapBoxMapView
        routes={routes}
        markers={markers}
        centerCoordinate={center}
        zoomLevel={13}
        showUserLocation={true}
        userLocation={currentLocation}
        enable3D={true}
        terrainEnabled={true}
        style={styles.map}
      />

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            Alert.alert('info', '3d view controls will be added later');
          }}
        >
          <Text style={styles.controlText}>3D</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0d2a',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 13, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#5b6eff',
    fontSize: 18,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    gap: 8,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(91, 110, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5b6eff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  controlText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});