import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import * as turf from '@turf/turf';
import { CONFIG } from '../config/env';

export default function COScreen({ route }) {
  const { routeGeo, routeMeta } = route.params || {};
  const [userPos, setUserPos] = useState(null);
  const [nearest, setNearest] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const lastUpdateRef = useRef(0);

  const routeLine = useMemo(() => {
    if (!routeGeo?.geometry?.coordinates) return null;
    return turf.lineString(routeGeo.geometry.coordinates);
  }, [routeGeo]);

  const routeCoordinates = useMemo(() => {
    if (!routeGeo?.geometry?.coordinates) return [];
    return routeGeo.geometry.coordinates.map(coord => ({
      latitude: coord[1],
      longitude: coord[0]
    }));
  }, [routeGeo]);

  const handleLocationUpdate = useCallback((location) => {
    if (!location) return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < CONFIG.LOCATION_UPDATE_INTERVAL) return;
    lastUpdateRef.current = now;

    const { latitude, longitude } = location.coords;
    const newPos = [longitude, latitude];
    setUserPos(newPos);

    if (routeLine) {
      const p = turf.point(newPos);
      const snapped = turf.nearestPointOnLine(routeLine, p);
      setNearest(snapped);
    }
  }, [routeLine]);

  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Ошибка', 'Разрешение на доступ к местоположению необходимо для работы приложения');
          return;
        }
        setLocationPermission(true);
      } catch (error) {
        console.warn('Location permission error:', error);
      }
    };

    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (!locationPermission) return;

    const startLocationTracking = async () => {
      try {
        const location = await Location.getCurrentPositionAsync({});
        handleLocationUpdate(location);
      } catch (error) {
        console.warn('Location error:', error);
      }
    };

    startLocationTracking();
    
    const interval = setInterval(async () => {
      try {
        const location = await Location.getCurrentPositionAsync({});
        handleLocationUpdate(location);
      } catch (error) {
        console.warn('Location error:', error);
      }
    }, CONFIG.LOCATION_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [locationPermission, handleLocationUpdate]);

  const progressPercentage = useMemo(() => {
    if (!nearest?.properties?.location) return 0;
    return Math.round(nearest.properties.location * 100);
  }, [nearest]);

  const mapRegion = useMemo(() => {
    if (userPos) {
      return {
        latitude: userPos[1],
        longitude: userPos[0],
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    if (routeCoordinates.length > 0) {
      return {
        latitude: routeCoordinates[0].latitude,
        longitude: routeCoordinates[0].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return {
      latitude: 43.25,
      longitude: 76.95,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [userPos, routeCoordinates]);

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.mapView}
        provider={PROVIDER_DEFAULT}
        region={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings={false}
        showsIndoors={false}
        showsPointsOfInterest={false}
        showsTraffic={false}
        customMapStyle={[]}
      >
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#2563eb"
            strokeWidth={3}
            lineCap="round"
            lineJoin="round"
          />
        )}
        {nearest && (
          <Marker
            coordinate={{
              latitude: nearest.geometry.coordinates[1],
              longitude: nearest.geometry.coordinates[0]
            }}
            title="Ближайшая точка на маршруте"
            pinColor="green"
          />
        )}
      </MapView>
      <View style={styles.infoContainer}>
        <Text style={styles.routeName}>{routeMeta?.name || 'Маршрут'}</Text>
        {nearest && (
          <Text style={styles.progressText}>
            Пройдено: {progressPercentage}% пути
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapView: {
    flex: 1,
  },
  infoContainer: {
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  routeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  progressText: {
    color: '#6b7280',
    marginTop: 4,
    fontSize: 14,
  },
});