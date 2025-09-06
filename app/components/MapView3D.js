import { memo, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { CONFIG } from '../config/env';

const MapView3D = memo(({ 
  routes = [], 
  centerCoordinate, 
  zoomLevel = CONFIG.MAP_ZOOM_LEVEL,
  onPress,
  style = { flex: 1 },
  showUserLocation = false,
  userLocation = null
}) => {
  const routeElements = useMemo(() => {
    return routes.map((route, idx) => {
      const id = route.id || `route-${idx}`;
      const feature = route.geojson?.features?.[0];
      
      if (!feature || feature.geometry.type !== 'LineString') return null;
      
      const coordinates = feature.geometry.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
      
      return (
        <Polyline
          key={id}
          coordinates={coordinates}
          strokeColor={route.color || '#ef4444'}
          strokeWidth={route.width || 3}
          lineCap="round"
          lineJoin="round"
        />
      );
    }).filter(Boolean);
  }, [routes]);

  const handlePress = useCallback((event) => {
    if (onPress) {
      onPress(event);
    }
  }, [onPress]);

  const region = useMemo(() => {
    if (centerCoordinate) {
      return {
        latitude: centerCoordinate[1] || centerCoordinate.latitude,
        longitude: centerCoordinate[0] || centerCoordinate.longitude,
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
  }, [centerCoordinate]);

  return (
    <MapView 
      style={[styles.mapView, style]}
      onPress={handlePress}
      provider={PROVIDER_GOOGLE}
      region={region}
      mapType="hybrid"
      googleMapId={CONFIG.GOOGLE_MAP_ID}
      showsUserLocation={showUserLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      showsScale={false}
      showsBuildings={false}
      showsIndoors={false}
      showsPointsOfInterest={false}
      showsTraffic={false}
    >
      {routeElements}
      {userLocation && (
        <Marker
          coordinate={{
            latitude: userLocation[1] || userLocation.latitude,
            longitude: userLocation[0] || userLocation.longitude
          }}
          title="Ваше местоположение"
        />
      )}
    </MapView>
  );
});

const styles = StyleSheet.create({
  mapView: {
    flex: 1
  }
});

MapView3D.displayName = 'MapView3D';

export default MapView3D;