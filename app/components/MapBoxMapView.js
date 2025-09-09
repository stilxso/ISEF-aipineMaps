import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { CONFIG } from '../config/env';
import { useLocation } from '../contexts/LocationContext';

const DEFAULT_CENTER = [76.8512, 43.2389];

// это компонент для карты Mapbox, будь осторожен с токеном, не забудь настроить
export default function MapBoxMapView({
  routes = [],
  markers = [],
  centerCoordinate,
  zoomLevel = CONFIG.MAP_ZOOM_LEVEL,
  style = { flex: 1 },
  showUserLocation = false,
  userLocation = null,
  onMarkerPress,
  enable3D = false,
  terrainEnabled = false,
}) {
  const { currentLocation } = useLocation();
  const [MapboxGL, setMapboxGL] = useState(null);
  const [mapboxError, setMapboxError] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
// здесь загружается Mapbox, проверяй токен
    let mounted = true;

    async function loadMapbox() {
      try {
        const mod = require('@rnmapbox/maps');
        if (!CONFIG.MAPBOX_ACCESS_TOKEN || CONFIG.MAPBOX_ACCESS_TOKEN.includes('YOUR_MAPBOX')) {
                     const msg = 'Mapbox access token is missing or invalid. Установите MAPBOX_ACCESS_TOKEN в app/config/env.js';
          if (mounted) setMapboxError(msg);
          return;
        }
        mod.setAccessToken(CONFIG.MAPBOX_ACCESS_TOKEN);
        if (mounted) setMapboxGL(mod);
      } catch (err) {
        if (mounted) setMapboxError(String(err?.message || err));
      }
    }

    loadMapbox();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
         if (MapboxGL && mapboxError && !mapboxError.includes('token')) {
      setMapboxError(null);
    }
  }, [MapboxGL]);

  const center = useMemo(() => {
    if (Array.isArray(centerCoordinate) && centerCoordinate.length >= 2) return centerCoordinate;
    if (userLocation?.longitude && userLocation?.latitude) return [userLocation.longitude, userLocation.latitude];
    if (currentLocation?.longitude && currentLocation?.latitude) return [currentLocation.longitude, currentLocation.latitude];
    return DEFAULT_CENTER;
  }, [centerCoordinate, userLocation, currentLocation]);

  const extractCoordinates = (route) => {
    const f = route?.geojson?.features?.[0];
    if (!f || f.geometry?.type !== 'LineString') return null;
    return f.geometry.coordinates;
  };

     if (!MapboxGL) {
    return (
      <View style={[styles.fallbackContainer, style]}>
// если Mapbox не загрузился, показываем ошибку
        <Text style={styles.fallbackTitle}>Карта недоступна</Text>
        <Text style={styles.fallbackText}>
          {mapboxError || 'Инициализация Mapbox...'}
        </Text>
        <Text style={styles.fallbackHint}>
          Если в консоли ошибка 401 — проверьте MAPBOX_ACCESS_TOKEN в app/config/env.js.
        </Text>
      </View>
    );
  }

     return (
    <View style={[styles.container, style]}>
      <MapboxGL.MapView
        ref={mapRef}
// рендерим карту
        style={styles.map}
        styleURL={enable3D ? MapboxGL.StyleURL?.Satellite ?? 'mapbox://styles/mapbox/satellite-v9' : MapboxGL.StyleURL?.Street ?? 'mapbox://styles/mapbox/streets-v11'}
        onDidFailLoadingMap={(e) => {
          const msg = e?.error?.message || JSON.stringify(e) || 'Map load failed';
                     if (String(msg).includes('401') || String(msg).toLowerCase().includes('unauthorized')) {
            setMapboxError('Ошибка 401: неавторизовано. Проверьте MAPBOX_ACCESS_TOKEN в app/config/env.js');
            Alert.alert('Ошибка карты', '401 — неверный Mapbox token. Проверьте конфигурацию.');
          } else {
            setMapboxError(String(msg));
            console.warn('Map load error', msg);
          }
        }}
      >
        {terrainEnabled && MapboxGL.RasterDemSource && MapboxGL.Terrain && (
          <>
            <MapboxGL.RasterDemSource id="dem" url="mapbox://mapbox.terrain-rgb" tileSize={512} />
            <MapboxGL.Terrain sourceID="dem" exaggeration={1.2} />
          </>
        )}

        {showUserLocation && MapboxGL.UserLocation && <MapboxGL.UserLocation visible showsUserHeadingIndicator androidRenderMode="compass" />}

        {routes.map((r, i) => {
          const coords = extractCoordinates(r);
          if (!coords) return null;
          const id = r.id || `route-${i}`;
          return (
            <MapboxGL.ShapeSource key={id} id={`src-${id}`} shape={{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } }}>
              <MapboxGL.LineLayer id={`layer-${id}`} style={{ lineColor: r.color || '#ef4444', lineWidth: r.width || 3, lineJoin: 'round', lineCap: 'round' }} />
            </MapboxGL.ShapeSource>
          );
        })}

        {markers.map((m, idx) => {
          const coord = [m.longitude ?? m[0], m.latitude ?? m[1]];
          const id = m.id ?? `marker-${idx}`;
          return (
            <MapboxGL.PointAnnotation key={id} id={id} coordinate={coord} onSelected={() => onMarkerPress && onMarkerPress(m)}>
              <View style={styles.marker}>
                <Text style={styles.markerIcon}>
                  {m.type === 'peak' ? '⛰️' : m.type === 'pass' ? '🏔️' : m.type === 'spring' ? '💧' : '📍'}
                </Text>
              </View>
            </MapboxGL.PointAnnotation>
          );
        })}

        {MapboxGL.Camera && <MapboxGL.Camera centerCoordinate={center} zoomLevel={zoomLevel} pitch={enable3D ? 45 : 0} animationMode="flyTo" animationDuration={800} />}
      </MapboxGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  marker: {
    width: 36,
    height: 36,
// стили для карты, не меняй цвета без причины
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerIcon: { fontSize: 16 },

  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0d12',
    padding: 18,
  },
  fallbackTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  fallbackText: { color: '#fff', textAlign: 'center', marginBottom: 6 },
  fallbackHint: { color: '#bfc7d6', fontSize: 12, textAlign: 'center' },
});
