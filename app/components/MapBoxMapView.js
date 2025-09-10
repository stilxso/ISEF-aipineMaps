// компонент карты MapBox
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CONFIG } from '../config/env';

const DEFAULT_CENTER = [76.8512, 43.2389];

export default function MapBoxMapView({
  routes = [],              // [{ id, color, width, geojson }]
  markers = [],             // [{ id, type, latitude, longitude, heading, title, subtitle, altitude }]
  centerCoordinate,
  zoomLevel = CONFIG?.MAP_ZOOM_LEVEL ?? 13,
  style = { flex: 1 },
  showUserLocation = false,
  userLocation = null,
  onMarkerPress,
  enable3D = false,
  terrainEnabled = false,
  onRegionChange = () => {},
}) {
  const [MapboxGL, setMapboxGL] = useState(null);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const mod = require('@rnmapbox/maps'); // ensure package installed
        const token = CONFIG?.MAPBOX_ACCESS_TOKEN;
        if (!token || token.includes('YOUR_MAPBOX')) {
          const msg = 'Mapbox token missing or placeholder. Add CONFIG.MAPBOX_ACCESS_TOKEN in app/config/env.js';
          if (mounted) setError(msg);
          return;
        }
        if (typeof mod.setAccessToken === 'function') {
          mod.setAccessToken(token);
        } else if (mod.default && typeof mod.default.setAccessToken === 'function') {
          mod.default.setAccessToken(token);
        }
        if (mounted) setMapboxGL(mod);
      } catch (e) {
        if (mounted) setError(String(e?.message || e));
      }
    })();

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (MapboxGL && error && !String(error).toLowerCase().includes('token')) {
      setError(null);
    }
  }, [MapboxGL]);

  const center = useMemo(() => {
    if (Array.isArray(centerCoordinate) && centerCoordinate.length >= 2) return centerCoordinate;
    if (userLocation && userLocation.longitude && userLocation.latitude) return [userLocation.longitude, userLocation.latitude];
    return DEFAULT_CENTER;
  }, [centerCoordinate, userLocation]);

  const ensureFeatureCollection = (geojson) => {
    if (!geojson) return { type: 'FeatureCollection', features: [] };
    if (geojson.type === 'FeatureCollection') return geojson;
    if (geojson.type === 'Feature') return { type: 'FeatureCollection', features: [geojson] };
    // fallback: assume it's geometry
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: geojson }] };
  };

  const extractLineCoordinates = (route) => {
    const gf = route?.geojson && ensureFeatureCollection(route.geojson);
    if (!gf || !Array.isArray(gf.features)) return null;
    const lineFeature = gf.features.find(f => f.geometry && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'));
    if (!lineFeature) return null;
    if (lineFeature.geometry.type === 'LineString') return lineFeature.geometry.coordinates;
    if (lineFeature.geometry.type === 'MultiLineString' && lineFeature.geometry.coordinates.length) return lineFeature.geometry.coordinates[0];
    return null;
  };

  const renderRouteLayer = (r, idx) => {
    const coords = extractLineCoordinates(r);
    if (!coords || !coords.length) return null;
    const id = r.id ?? `route-${idx}`;
    const shape = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: r.geojson?.properties || {} };
    const LineLayerId = `line-layer-${id}`;
    const SourceId = `src-${id}`;

    return (
      <MapboxGL.ShapeSource key={SourceId} id={SourceId} shape={shape}>
        <MapboxGL.LineLayer
          id={LineLayerId}
          style={{
            lineColor: r.color || '#3b82f6',
            lineWidth: r.width ?? 3,
            lineJoin: 'round',
            lineCap: 'round',
            lineOpacity: 0.98,
          }}
        />
      </MapboxGL.ShapeSource>
    );
  };

  const normalizeMarker = (m, idx) => {
    // accept [lon,lat] arrays or objects
    const lon = (typeof m.longitude === 'number') ? m.longitude : (Array.isArray(m) ? m[0] : m.lon ?? m.lng ?? m[0]);
    const lat = (typeof m.latitude === 'number') ? m.latitude : (Array.isArray(m) ? m[1] : m.lat ?? m[1]);
    return { ...m, longitude: lon, latitude: lat, id: m.id ?? `marker-${idx}` };
  };

  const renderMarkerView = (m) => {
    const type = m.type || 'pin';
    switch (type) {
      case 'arrow':
      case 'user-arrow':
        return (
          <View style={[styles.arrowWrap, { transform: [{ rotate: `${m.heading ?? 0}deg` }] }]}>
            <View style={styles.arrowTriangle} />
          </View>
        );
      case 'start':
      case 'route-start':
        return (
          <View style={styles.startMarker}>
            <View style={styles.startInner} />
          </View>
        );
      case 'end':
        return (
          <View style={styles.endMarker}>
            <View style={styles.endInner} />
          </View>
        );
      case 'checkpoint':
        return (
          <View style={styles.checkpointMarker}>
            <Text style={styles.checkpointText}>{m.title ? m.title.replace(/\D/g, '') || 'K' : 'K'}</Text>
          </View>
        );
      case 'peak':
        return (
          <View style={styles.peakMarker}>
            <Text style={styles.peakText}>⛰️</Text>
          </View>
        );
      case 'route-main':
        return (
          <View style={styles.routeMainMarker}>
            <Text style={styles.routeMainText}>🏔️</Text>
          </View>
        );
      default:
        return (
          <View style={styles.defaultMarker}>
            <View style={styles.defaultInner} />
          </View>
        );
    }
  };

  if (!MapboxGL) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Text style={styles.fallbackTitle}>Карта недоступна</Text>
        <Text style={styles.fallbackText}>{error || 'Инициализация Mapbox...'}</Text>
        <Text style={styles.fallbackHint}>Если видите 401 — проверьте MAPBOX_ACCESS_TOKEN в app/config/env.js</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={enable3D ? (MapboxGL.StyleURL?.Satellite ?? 'mapbox://styles/mapbox/satellite-v9') : (MapboxGL.StyleURL?.Street ?? 'mapbox://styles/mapbox/streets-v11')}
        pitchEnabled={enable3D}
        rotateEnabled
        zoomEnabled
        onDidFailLoadingMap={(e) => {
          const msg = e?.error?.message || JSON.stringify(e) || 'Map load failed';
          if (String(msg).includes('401') || String(msg).toLowerCase().includes('unauthorized')) {
            setError('Ошибка 401: неверный Mapbox token. Проверьте app/config/env.js');
            Alert.alert('Ошибка карты', '401 — неверный Mapbox token. Проверьте конфигурацию.');
          } else {
            setError(String(msg));
            console.warn('Map load error', msg);
          }
        }}
        onRegionDidChange={(e) => {
          const props = e?.properties || {};
          onRegionChange(props);
        }}
      >
        {terrainEnabled && MapboxGL.RasterDemSource && MapboxGL.Terrain && (
          <>
            <MapboxGL.RasterDemSource id="mapbox-dem" url="mapbox://mapbox.terrain-rgb" tileSize={512} />
            <MapboxGL.Terrain sourceID="mapbox-dem" exaggeration={1.0} />
          </>
        )}

        {showUserLocation && MapboxGL.UserLocation && (
          <MapboxGL.UserLocation visible showsUserHeadingIndicator androidRenderMode="compass" />
        )}

        {Array.isArray(routes) && routes.map((r, i) => renderRouteLayer(r, i))}

        {Array.isArray(markers) && markers.map((raw, idx) => {
          const m = normalizeMarker(raw, idx);
          console.log('DEBUG: Processing marker', idx, m);
          if (typeof m.latitude !== 'number' || typeof m.longitude !== 'number') {
            console.log('DEBUG: Invalid marker coordinates', m);
            return null;
          }
          const coord = [m.longitude, m.latitude];
          const id = String(m.id);
          console.log('DEBUG: Rendering marker', id, 'at', coord);
          return (
            <MapboxGL.PointAnnotation
              key={id}
              id={id}
              coordinate={coord}
              onSelected={() => onMarkerPress && onMarkerPress(m)}
            >
              {renderMarkerView(m)}
              { (m.title || m.subtitle) && (
                <MapboxGL.Callout title={`${m.title ?? ''}${m.subtitle ? `\n${m.subtitle}` : ''}`} />
              )}
            </MapboxGL.PointAnnotation>
          );
        })}

        {MapboxGL.Camera && (
          <MapboxGL.Camera
            centerCoordinate={center}
            zoomLevel={zoomLevel}
            pitch={enable3D ? 45 : 0}
            animationMode="flyTo"
            animationDuration={650}
          />
        )}
      </MapboxGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  defaultMarker: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(91,110,255,0.7)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  defaultInner: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' },

  startMarker: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#16a34a',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  startInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },

  endMarker: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  endInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },

  checkpointMarker: {
    width: 46, height: 28, borderRadius: 14, backgroundColor: 'rgba(107,114,128,0.95)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  checkpointText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  peakMarker: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: '#f97316',
    alignItems: 'center', justifyContent: 'center',
  },
  peakText: { fontSize: 16 },

  routeMainMarker: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff',
  },
  routeMainText: { fontSize: 18 },

  arrowWrap: {
    width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
  },
  arrowTriangle: {
    width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 16,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#5b6eff',
  },

  fallbackContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0d12', padding: 18,
  },
  fallbackTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  fallbackText: { color: '#fff', textAlign: 'center', marginBottom: 6 },
  fallbackHint: { color: '#bfc7d6', fontSize: 12, textAlign: 'center' },
});
