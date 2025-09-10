// экран похода с картой и SOS
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import RNFS from 'react-native-fs';
import MapBoxMapView from '../components/MapBoxMapView';
import SosButton from '../components/SosButton';
import ControlTimeModal from '../components/ControlTimeModal';
import { useRecorder } from '../contexts/RecorderContext';
import { useLocation } from '../contexts/LocationContext';
import { useRoutes } from '../contexts/RoutesContext';
import { startLocationSending, stopLocationSending } from '../services/locationSender';
import { parseGpxFileAndSave, saveRouteAsGpx } from '../services/gpxNative';
import { loadData } from '../services/storage';
import { CONFIG } from '../config/env';
import trailsData from '../data/trails.json';
import { testLoadDummyGpx } from '../services/gpxTester';


let gpxContent = '';
try {
  gpxContent = require('../config/bap_prokhodnogo.gpx.js');
  if (typeof gpxContent !== 'string') gpxContent = String(gpxContent);
  console.log('GPX content loaded, length:', gpxContent.length);
} catch (e) {
  gpxContent = '';
  console.warn('Failed to load GPX content:', e.message);
}




function haversine(a, b) {
  if (!a || !b) return 0;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function getFirstCoordinateFromFeature(feature) {
  if (!feature) return null;
  // feature can be FeatureCollection, Feature or geometry
  if (feature.type === 'FeatureCollection' && Array.isArray(feature.features) && feature.features.length) {
    return getFirstCoordinateFromFeature(feature.features[0]);
  }
  const geom = feature.geometry || feature;
  if (!geom || !geom.type) return null;
  if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
    return { lon: Number(geom.coordinates[0]), lat: Number(geom.coordinates[1]) };
  }
  if (geom.type === 'LineString' && Array.isArray(geom.coordinates) && geom.coordinates.length) {
    const c = geom.coordinates[0];
    return { lon: Number(c[0]), lat: Number(c[1]) };
  }
  if (geom.type === 'MultiLineString' && Array.isArray(geom.coordinates) && geom.coordinates.length && geom.coordinates[0].length) {
    const c = geom.coordinates[0][0];
    return { lon: Number(c[0]), lat: Number(c[1]) };
  }
  return null;
}

export default function GoScreen() {

  const [gpxMarkers, setGpxMarkers] = useState([]);
const [gpxLoadStatus, setGpxLoadStatus] = useState('idle');


useEffect(() => {
  let mounted = true;
  (async () => {
    setGpxLoadStatus('loading');
    try {
      const res = await testLoadDummyGpx();
      if (!mounted) return;
      if (res.success) {
        setGpxMarkers(res.markers || []);
        setGpxLoadStatus('ok');
        console.log('GPX loaded successfully, markers count:', res.markers?.length || 0);
        console.log('GPX markers:', res.markers);
        console.log('First marker sample:', res.markers?.[0]);
      } else {
        setGpxLoadStatus('error');
        console.warn('GPX load error:', res.error);
      }
    } catch (e) {
      if (!mounted) return;
      setGpxLoadStatus('error');
      console.warn('GPX load exception', e);
    }
  })();
  return () => { mounted = false; };
}, []);

  const { recording, current, start, stop, save, discard } = useRecorder();
  const { currentLocation, speed, heading } = useLocation();
  const { records } = useRoutes();

  const [hikingMode, setHikingMode] = useState(false);
  const [showControlTimeModal, setShowControlTimeModal] = useState(false);
  const [routeId, setRouteId] = useState(null);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [showTrailSelector, setShowTrailSelector] = useState(false);
  const [viewingMode, setViewingMode] = useState(false);
  const [routeMode, setRouteMode] = useState(false);
  const [selectedBapRoute, setSelectedBapRoute] = useState(null);
  const [routeStartTime, setRouteStartTime] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [currentZoom, setCurrentZoom] = useState(14);
  const [selectedMarker, setSelectedMarker] = useState(null);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    const loadDummyRoute = async () => {
      try {
        if (!gpxContent || typeof gpxContent !== 'string' || gpxContent.length === 0) return;
        const directory = `${RNFS.DocumentDirectoryPath}/gpx`;
        await RNFS.mkdir(directory).catch(() => {});
        const localPath = `${directory}/dummy_bap.gpx`;
        const fileExists = await RNFS.exists(localPath);
        if (!fileExists) await RNFS.writeFile(localPath, gpxContent, 'utf8');
        const existingRoutes = await loadData(CONFIG.STORAGE_KEYS.ROUTES) || [];
        const alreadyParsed = existingRoutes.some((r) => r.localFile === localPath);
        if (!alreadyParsed) await parseGpxFileAndSave(localPath);
      } catch (error) {
        console.warn('Failed to load dummy route:', error);
      }
    };
    loadDummyRoute();
  }, []);

  const liveRoute = useMemo(() => {
    if (!current?.points?.length) return null;
    const coordinates = current.points.map((p) => [Number(p.longitude), Number(p.latitude), p.altitude ?? null]);
    return {
      id: 'live',
      color: '#22c55e',
      width: 5,
      geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }] },
    };
  }, [current]);

  const dummyRoute = useMemo(() => {
    if (!records || !records.length) return null;
    const found = records.find((r) => {
      if (r.localFile && typeof r.localFile === 'string') {
        return r.localFile.toLowerCase().includes('bap') || r.localFile.toLowerCase().includes('prokhodn');
      }
      if (r.name && typeof r.name === 'string') {
        return /бап|bap|проходн|prokhodn/i.test(r.name);
      }
      return false;
    });
    if (!found || !found.geojson) return null;
    // keep route entry as-is, markers may exist in found.markers
    return {
      id: found.id || `route_${Math.random()}`,
      color: '#ef4444',
      width: 3,
      geojson: found.geojson,
      _sourceRoute: found,
    };
  }, [records]);

  const selectedTrailRoute = useMemo(() => {
    if (!selectedTrail) return null;
    return {
      id: 'selected-trail',
      color: '#3b82f6',
      width: 4,
      geojson: { type: 'FeatureCollection', features: [selectedTrail] },
    };
  }, [selectedTrail]);

  const bapRoute = useMemo(() => {
    if (!selectedBapRoute) return null;
    return {
      id: 'bap-route',
      color: '#ef4444',
      width: 4,
      geojson: selectedBapRoute,
    };
  }, [selectedBapRoute]);

  const center = useMemo(() => {
    let c;
    if (routeMode && currentLocation) c = [Number(currentLocation.longitude), Number(currentLocation.latitude)];
    else if (current?.points?.length) {
      const last = current.points[current.points.length - 1];
      c = [Number(last.longitude), Number(last.latitude)];
    }
    else if (selectedTrail && viewingMode) {
      const fc = getFirstCoordinateFromFeature(selectedTrail);
      if (fc) c = [fc.lon, fc.lat];
    }
    else if (currentLocation) c = [Number(currentLocation.longitude), Number(currentLocation.latitude)];
    // Default to BAP area if no location
    else if (gpxMarkers && gpxMarkers.length) {
      const first = gpxMarkers[0];
      c = [first.longitude, first.latitude];
    }
    else c = [76.8512, 43.2389];
    console.log('Map center:', c);
    return c;
  }, [current, currentLocation, selectedTrail, viewingMode, routeMode, gpxMarkers]);

  const totalDistance = useMemo(() => {
    const pts = current?.points || [];
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
    return d;
  }, [current]);

  const altitude = currentLocation?.altitude ? Math.round(currentLocation.altitude) : null;
  const kmh = speed ? Math.max(0, Math.round(speed * 3.6)) : 0;

  const peakMetrics = useMemo(() => {
    if (!hikingMode || !selectedMarker || !currentLocation) return null;
    const distanceToPeak = haversine(currentLocation, selectedMarker);
    const estimatedTime = kmh > 0 ? Math.round((distanceToPeak / kmh) * 60) : 0; // minutes
    return {
      distanceToPeak: Math.round(distanceToPeak * 100) / 100,
      estimatedTime,
      peakName: selectedMarker.title || 'Peak',
    };
  }, [hikingMode, selectedMarker, currentLocation, kmh]);

  const routeMetrics = useMemo(() => {
    if (!routeMode || !selectedTrail || !currentLocation) return null;
    const trailCoords = selectedTrail.geometry.coordinates;
    let closestIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < trailCoords.length; i++) {
      const coord = trailCoords[i];
      const distance = haversine({ latitude: coord[1], longitude: coord[0] }, currentLocation);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    let remainingDistance = 0;
    for (let i = closestIndex; i < trailCoords.length - 1; i++) {
      remainingDistance += haversine(
        { latitude: trailCoords[i][1], longitude: trailCoords[i][0] },
        { latitude: trailCoords[i + 1][1], longitude: trailCoords[i + 1][0] }
      );
    }
    const timeOnRoute = routeStartTime ? (Date.now() - routeStartTime) / 1000 / 60 : 0;
    const avgSpeedKmh = 3;
    const estimatedRemainingTime = remainingDistance / avgSpeedKmh * 60;
    return {
      remainingDistance: Math.round(remainingDistance * 100) / 100,
      timeOnRoute: Math.round(timeOnRoute),
      estimatedRemainingTime: Math.round(estimatedRemainingTime),
      progressPercent: Math.round((closestIndex / Math.max(1, trailCoords.length - 1)) * 100),
      nextCheckpoint: closestIndex < trailCoords.length - 1 ? trailCoords[closestIndex + 1] : null,
    };
  }, [routeMode, selectedTrail, currentLocation, routeStartTime]);

  const trailProgress = useMemo(() => {
    if (!selectedTrail || !currentLocation || !hikingMode) return null;
    const trailCoords = selectedTrail.geometry.coordinates;
    let minDistance = Infinity;
    let closestIndex = 0;
    for (let i = 0; i < trailCoords.length; i++) {
      const coord = trailCoords[i];
      const distance = haversine({ latitude: coord[1], longitude: coord[0] }, currentLocation);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    const progressPercent = Math.round((closestIndex / Math.max(1, trailCoords.length - 1)) * 100);
    return {
      percent: progressPercent,
      distanceToTrail: Math.round(minDistance),
      nextPoint: closestIndex < trailCoords.length - 1 ? trailCoords[closestIndex + 1] : null,
    };
  }, [selectedTrail, currentLocation, hikingMode]);

  const arrowMarker = useMemo(() => {
    if ((!hikingMode && !routeMode) || !currentLocation || heading == null) return null;
    return {
      id: 'user-arrow',
      type: 'arrow',
      latitude: Number(currentLocation.latitude),
      longitude: Number(currentLocation.longitude),
      heading: Number(heading),
    };
  }, [hikingMode, routeMode, currentLocation, heading]);

  // build markers: prefer route.markers (saved by parser) -> else fallback to geojson start point
  const dummyStartMarker = useMemo(() => {
    if (!dummyRoute) return null;
    const src = dummyRoute._sourceRoute || {};
    if (Array.isArray(src.markers) && src.markers.length) {
      const start = src.markers.find(m => m.type === 'route-start') || src.markers[0];
      if (start && start.latitude != null && start.longitude != null) {
        return {
          id: start.id || 'dummy-start',
          type: start.type || 'route-start',
          latitude: Number(start.latitude),
          longitude: Number(start.longitude),
          title: start.title || 'Start',
        };
      }
    }
    // fallback: inspect geojson features for Point or LineString
    if (dummyRoute.geojson && Array.isArray(dummyRoute.geojson.features) && dummyRoute.geojson.features.length) {
      // try to find Point feature
      const pointFeature = dummyRoute.geojson.features.find(f => f.geometry && f.geometry.type === 'Point');
      if (pointFeature) {
        const c = pointFeature.geometry.coordinates;
        if (Array.isArray(c) && c.length >= 2) {
          return { id: 'dummy-start', type: 'route-start', latitude: Number(c[1]), longitude: Number(c[0]) };
        }
      }
      // else get first coordinate from first LineString
      const line = dummyRoute.geojson.features.find(f => f.geometry && f.geometry.type === 'LineString');
      if (line && Array.isArray(line.geometry.coordinates) && line.geometry.coordinates.length) {
        const s = line.geometry.coordinates[0];
        return { id: 'dummy-start', type: 'route-start', latitude: Number(s[1]), longitude: Number(s[0]) };
      }
    }
    return null;
  }, [dummyRoute]);

  const selectedTrailStartMarker = useMemo(() => {
    if (!selectedTrail) return null;
    const coord = getFirstCoordinateFromFeature(selectedTrail);
    if (!coord) return null;
    return { id: 'trail-start', type: 'route-start', latitude: coord.lat, longitude: coord.lon };
  }, [selectedTrail]);

  const checkpointMarkers = useMemo(() => {
    if (!routeMode || !Array.isArray(checkpoints) || !checkpoints.length) return [];
    return checkpoints.map((c, idx) => ({
      id: `cp-${c.id}`,
      type: 'checkpoint',
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
      title: `КВ ${idx + 1}`,
      subtitle: new Date(c.timestamp).toLocaleTimeString(),
    }));
  }, [routeMode, checkpoints]);

  const handleStartHiking = async () => {
    if (!current) { Alert.alert('Ошибка', 'Сначала начните запись маршрута'); return; }
    setHikingMode(true);
    setRouteId(current.id);
    try { await startLocationSending(current.id); Alert.alert('Режим похода', 'Автопередача каждые 5 минут включена'); } catch (e) { console.warn(e); }
  };

  const handleStopHiking = async () => {
    setHikingMode(false);
    setSelectedTrail(null);
    setSelectedMarker(null);
    try { await stopLocationSending(); } catch (e) { console.warn(e); }
  };

  const addCheckpoint = () => {
    if (!routeMode || !currentLocation) return;
    const cp = { id: Date.now(), latitude: Number(currentLocation.latitude), longitude: Number(currentLocation.longitude), altitude: currentLocation.altitude, timestamp: Date.now(), speed: kmh };
    setCheckpoints(prev => [...prev, cp]);
    Alert.alert('Контрольная точка', `Добавлена точка ${checkpoints.length + 1}`);
  };

  const handleSetControlTime = () => {
    if (!routeId) { Alert.alert('Ошибка', 'Сначала начните режим похода'); return; }
    setShowControlTimeModal(true);
  };

  return (
    <View style={styles.container}>
      <MapBoxMapView
        routes={[
          ...(dummyRoute ? [dummyRoute] : []),
          ...(liveRoute ? [liveRoute] : []),
          ...(selectedTrailRoute ? [selectedTrailRoute] : []),
          ...(bapRoute ? [bapRoute] : []),
        ]}
        markers={[
          ...(arrowMarker ? [arrowMarker] : []),
          ...(dummyStartMarker ? [dummyStartMarker] : []),
          ...(selectedTrailStartMarker ? [selectedTrailStartMarker] : []),
          ...(trailProgress?.nextPoint ? [{ id: 'next-point', type: 'waypoint', latitude: Number(trailProgress.nextPoint[1]), longitude: Number(trailProgress.nextPoint[0]) }] : []),
          ...(currentZoom >= 15 ? checkpointMarkers : []),
          ...(gpxMarkers || []),
        ].filter(m => m)} // Filter out null/undefined markers
        centerCoordinate={center}
        zoomLevel={14}
        showUserLocation={!hikingMode && !routeMode}
        onRegionChange={(region) => { if (region?.zoomLevel) setCurrentZoom(region.zoomLevel); }}
        onMarkerPress={(marker) => {
          console.log('DEBUG: Marker pressed:', marker);
          console.log('DEBUG: Marker type:', marker.type);
          console.log('DEBUG: Has routeData:', !!marker.routeData);
          setSelectedMarker(marker);

          // Handle BAP marker selection
          if (marker.type === 'route-main' && marker.routeData) {
            console.log('DEBUG: BAP marker selected, showing route');
            setSelectedBapRoute(marker.routeData);
            setViewingMode(true);
          }
        }}
      />

      <View style={styles.overlayTop}>
        <View style={styles.round}>
          <Text style={styles.bigText}>{kmh}</Text>
          <Text style={styles.sub}>km/h</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Altitude</Text>
            <Text style={styles.statValue}>{altitude || '--'}m</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{Math.round(totalDistance)}m</Text>
          </View>
          {hikingMode && peakMetrics && (
            <>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>To {peakMetrics.peakName}</Text>
                <Text style={styles.statValue}>{peakMetrics.distanceToPeak}km</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>ETA</Text>
                <Text style={styles.statValue}>{peakMetrics.estimatedTime}min</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.overlayBottom}>
        {/* Keep existing bottom buttons - unchanged */}
        {(() => {
          console.log('DEBUG: HIKE button condition check:', {
            hasSelectedMarker: !!selectedMarker,
            selectedMarkerType: selectedMarker?.type,
            isHikingMode: hikingMode,
            shouldShowHIKE: selectedMarker && !hikingMode
          });
          const shouldShow = selectedMarker && !hikingMode;
          console.log('DEBUG: Should show HIKE button:', shouldShow);
          if (shouldShow) {
            console.log('DEBUG: Rendering HIKE button');
            return (
              <TouchableOpacity
                style={styles.btnHike}
                onPress={() => {
                  console.log('DEBUG: HIKE button pressed for marker:', selectedMarker);
                  console.log('DEBUG: Setting showControlTimeModal to true');
                  setShowControlTimeModal(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.btnHikeText}>🚶 HIKE</Text>
              </TouchableOpacity>
            );
          }
          return null;
        })()}
      </View>

      {hikingMode && (
        <View style={styles.sosContainer}>
          <SosButton size="small" routeId={routeId} contacts={[]} />
        </View>
      )}

      {(() => {
        console.log('DEBUG: ControlTimeModal visibility:', showControlTimeModal);
        return (
          <ControlTimeModal
            visible={showControlTimeModal}
            onClose={() => {
              console.log('DEBUG: ControlTimeModal onClose triggered');
              setShowControlTimeModal(false);
            }}
            routeId={selectedMarker ? selectedMarker.id : routeId}
            onSave={() => {
              console.log('DEBUG: ControlTimeModal onSave triggered');
              setHikingMode(true);
              setRouteId(selectedMarker ? selectedMarker.id : routeId);
              setRouteStartTime(Date.now());

              // If BAP marker is selected, set it as the selected trail for route metrics
              if (selectedMarker && selectedMarker.type === 'route-main') {
                console.log('DEBUG: Setting BAP route as selected trail for metrics');
                // Create a mock trail feature from the BAP route data
                const mockTrail = {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: selectedBapRoute?.features?.find(f => f.geometry?.type === 'LineString')?.geometry?.coordinates || []
                  },
                  properties: {
                    name: selectedMarker.title || 'BAP Route'
                  }
                };
                setSelectedTrail(mockTrail);
                setRouteMode(true);
              }
            }}
          />
        );
      })()}

      <Modal visible={showTrailSelector} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите маршрут</Text>
            <FlatList
              data={(trailsData?.features) || []}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.trailItem} onPress={() => { setSelectedTrail(item); setShowTrailSelector(false); setViewingMode(true); }}>
                  <Text style={styles.trailName}>{item.properties?.name}</Text>
                  <Text style={styles.trailDetails}>Сложность: {item.properties?.difficulty || '--'} | Набор высоты: {item.properties?.elevation_gain || '--'}м</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Нет доступных маршрутов</Text>}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowTrailSelector(false)}>
              <Text style={styles.closeBtnText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {recording && hikingMode && (
        <View style={styles.controlTimePanel}>
          <TouchableOpacity style={styles.controlTimeBtn} onPress={handleSetControlTime}>
            <Text style={styles.controlTimeBtnText}>Установить КВ</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d2a' },
  overlayTop: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row' },
  round: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(91,110,255,0.95)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  bigText: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 30 },
  sub: { color: '#e5e7eb', fontSize: 12, marginTop: 2 },
  stats: { flex: 1, backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  stat: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { color: '#93a4c8' },
  statValue: { color: '#fff', fontWeight: '800' },

  routeStats: { flexDirection: 'row', justifyContent: 'space-between' },
  routeStat: { flex: 1, height: 70, marginHorizontal: 6, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.95)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' },
  routeStatValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
  routeStatLabel: { color: '#e5e7eb', fontSize: 11, marginTop: 4, textAlign: 'center' },

  hikingStats: { flexDirection: 'row', justifyContent: 'space-between' },
  hikingStat: { width: 90, height: 90, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.95)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' },
  hikingStatValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
  hikingStatLabel: { color: '#e5e7eb', fontSize: 11, marginTop: 4 },

  overlayBottom: { position: 'absolute', bottom: 120, left: 16, right: 16, flexDirection: 'row', justifyContent: 'center', zIndex: 1500 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 6 },
  btnText: { color: '#fff', fontWeight: '800' },
  btnStart: { backgroundColor: '#5b6eff' },
  btnStop: { backgroundColor: '#ef4444' },
  btnSave: { backgroundColor: '#16a34a' },
  btnGhost: { backgroundColor: '#1a2145', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  btnHiking: { backgroundColor: '#22c55e' },
  btnHike: {
    backgroundColor: '#22c55e',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnHikeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  btnSelect: { backgroundColor: '#3b82f6' },
  btnLoad: { backgroundColor: '#f59e0b' },
  btnRoute: { backgroundColor: '#8b5cf6' },
  btnCheckpoint: { backgroundColor: '#f59e0b' },
  btnExport: { backgroundColor: '#06b6d4' },

  sosContainer: { position: 'absolute', bottom: 110, right: 20, zIndex: 1000 },

  controlTimePanel: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  controlTimeBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  controlTimeBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#0b0d2a', borderRadius: 12, padding: 20, width: '90%', maxHeight: '70%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  trailItem: { backgroundColor: '#1a2145', padding: 12, borderRadius: 8, marginBottom: 8 },
  trailName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  trailDetails: { color: '#93a4c8', fontSize: 12, marginTop: 4 },
  emptyText: { color: '#93a4c8', textAlign: 'center', padding: 20 },
  closeBtn: { backgroundColor: '#ef4444', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: '#fff', fontWeight: '700' },

  trailInfo: { backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  trailInfoName: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  trailStats: { flexDirection: 'row', justifyContent: 'space-around' },
  trailStat: { alignItems: 'center' },
  trailStatLabel: { color: '#93a4c8', fontSize: 12 },
  trailStatValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
