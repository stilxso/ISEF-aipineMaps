import React, { useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { CONFIG } from '../config/env';

MapboxGL.setAccessToken(CONFIG.MAPBOX_ACCESS_TOKEN);

const lineStyles = {
  lineJoin: 'round',
  lineCap: 'round'
};

const MapBoxMapView = ({
  routes = [],
  markers = [],
  centerCoordinate,
  zoomLevel = CONFIG.MAP_ZOOM_LEVEL,
  style = { flex: 1 },
  showUserLocation = false,
  userLocation = null,
  onMarkerPress,
  enable3D = false,
  terrainEnabled = false
}) => {
  const mapRef = useRef(null);

  const center = centerCoordinate
    ? [centerCoordinate[1] || centerCoordinate.longitude, centerCoordinate[0] || centerCoordinate.latitude]
    : [76.95, 43.25];

  const handleMapLoad = () => {};

  const handleMapError = (error) => {
    console.error('mapbox load error:', error);
    Alert.alert('map error', 'failed to load map. check internet.');
  };

  const renderRoutes = () => {
    return routes.map((route, idx) => {
      const id = route.id || `route-${idx}`;
      const feature = route.geojson?.features?.[0];

      if (!feature || feature.geometry.type !== 'LineString') return null;

      const coordinates = feature.geometry.coordinates.map(coord => [coord[0], coord[1]]);

      return (
        <MapboxGL.ShapeSource
          key={id}
          id={`route-source-${id}`}
          shape={{
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          }}
        >
          <MapboxGL.LineLayer
            id={`route-layer-${id}`}
            style={{
              lineColor: route.color || '#ef4444',
              lineWidth: route.width || 3,
              lineJoin: lineStyles.lineJoin,
              lineCap: lineStyles.lineCap
            }}
          />
        </MapboxGL.ShapeSource>
      );
    }).filter(Boolean);
  };

  const renderMarkers = () => {
    return markers.map((marker, idx) => {
      const id = marker.id || `marker-${idx}`;
      const coordinate = [
        marker.longitude ?? marker[0],
        marker.latitude ?? marker[1]
      ];

      return (
        <MapboxGL.PointAnnotation
          key={id}
          id={id}
          coordinate={coordinate}
          onSelected={() => onMarkerPress && onMarkerPress(marker.id)}
        >
          <View style={styles.markerContainer}>
            <View style={[styles.marker, { backgroundColor: getMarkerColor(marker.type) }]}>
              <View style={styles.markerIcon}>
                {getMarkerIcon(marker.type)}
              </View>
            </View>
          </View>
        </MapboxGL.PointAnnotation>
      );
    });
  };

  const getMarkerColor = (type) => {
    switch (type) {
      case 'spring': return '#3b82f6'; // spring - blue
      case 'peak': return '#ef4444';   // peak - red
      case 'pass': return '#f59e0b';   // pass - orange
      default: return '#6b7280';       // default - gray
    }
  };

  const getMarkerIcon = (type) => {
    switch (type) {
      case 'spring': return '💧'; // spring
      case 'peak': return '⛰️';   // peak
      case 'pass': return '🏔️';   // pass
      default: return '📍';       // default
    }
  };

  return (
    <View style={[styles.container, style]}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={enable3D ? MapboxGL.StyleURL.Satellite : MapboxGL.StyleURL.Street}
        centerCoordinate={center}
        zoomLevel={zoomLevel}
        pitch={enable3D ? 60 : 0}
        onDidFinishLoadingMap={handleMapLoad}
        onDidFailLoadingMap={handleMapError}
      >
        {/* 3D рельеф */}
        {terrainEnabled && (
          <MapboxGL.Terrain
            sourceID="terrain"
            exaggeration={1.5}
          />
        )}

        {/* Пользовательская локация */}
        {showUserLocation && userLocation && (
          <MapboxGL.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
          />
        )}

        {/* Рендерим маршруты */}
        {renderRoutes()}

        {/* Рендерим маркеры */}
        {renderMarkers()}

        {/* Камера для управления видом */}
        <MapboxGL.Camera
          centerCoordinate={center}
          zoomLevel={zoomLevel}
          pitch={enable3D ? 60 : 0}
          animationMode="flyTo"
          animationDuration={2000}
        />
      </MapboxGL.MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerIcon: {
    fontSize: 16,
  },
});

export default MapBoxMapView;