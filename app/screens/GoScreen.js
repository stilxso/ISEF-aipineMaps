import { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Animated, TextInput, Alert } from 'react-native';
import MapBoxMapView from '../components/MapBoxMapView';
import { useRecorder } from '../contexts/RecorderContext';
import { useLocation } from '../contexts/LocationContext';

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

export default function GoScreen() {
  const { recording, current, start, stop, save, discard } = useRecorder();
  const { currentLocation, speed } = useLocation();

  const [etaTarget, setEtaTarget] = useState('');
  const [destination, setDestination] = useState(null);

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

  const liveRoute = useMemo(() => {
    if (!current?.points?.length) return null;
    const coordinates = current.points.map((p) => [p.longitude, p.latitude, p.altitude ?? null]);
    return {
      id: 'live', color: '#22c55e', width: 5,
      geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }] },
    };
  }, [current]);

  const center = useMemo(() => {
    if (current?.points?.length) {
      const last = current.points[current.points.length - 1];
      return [last.longitude, last.latitude];
    }
    if (currentLocation) return [currentLocation.longitude, currentLocation.latitude];
    return [76.8512, 43.2389];
  }, [current, currentLocation]);

  const totalDistance = useMemo(() => {
    const pts = current?.points || [];
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
    return d;
  }, [current]);

  const distanceToDest = useMemo(() => {
    if (!destination || !currentLocation) return 0;
    return haversine(currentLocation, destination);
  }, [destination, currentLocation]);

  const altitude = currentLocation?.altitude ? Math.round(currentLocation.altitude) : null;
  const kmh = speed ? Math.max(0, Math.round(speed * 3.6)) : 0;

  return (
    <View style={styles.container}>
      <MapBoxMapView
        routes={liveRoute ? [liveRoute] : []}
        markers={destination ? [{ id: 'dest', type: 'peak', latitude: destination.latitude, longitude: destination.longitude }] : []}
        centerCoordinate={center}
        zoomLevel={14}
        showUserLocation
      />

      <View style={styles.overlayTop}>
        <Animated.View style={[styles.round, { transform: [{ scale: pulse }] }]}>
          <Text style={styles.bigText}>{kmh}</Text>
          <Text style={styles.sub}>км/ч</Text>
        </Animated.View>

        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statLabel}>Высота</Text><Text style={styles.statValue}>{altitude ? `${altitude} м` : '--'}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>Пройдено</Text><Text style={styles.statValue}>{(totalDistance/1000).toFixed(2)} км</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>До точки</Text><Text style={styles.statValue}>{(distanceToDest/1000).toFixed(2)} км</Text></View>
        </View>
      </View>

      <View style={styles.overlayBottom}>
        {!recording ? (
          <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={start}>
            <Text style={styles.btnText}>Старт</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={stop}>
            <Text style={styles.btnText}>Стоп</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={async () => {
          const r = await save();
          if (r) Alert.alert('Сохранено', r.name || r.id);
        }} disabled={!current?.points?.length}>
          <Text style={styles.btnText}>Сохранить</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={discard}>
          <Text style={styles.btnText}>Сброс</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.etaPanel}>
        <Text style={styles.etaTitle}>Контрольное время (чч:мм)</Text>
        <TextInput value={etaTarget} onChangeText={setEtaTarget} placeholder="03:30" placeholderTextColor="#93a4c8" style={styles.etaInput} />
        <TouchableOpacity style={[styles.btn, { marginTop: 8 }]} onPress={() => Alert.alert('Сохранено', 'Контрольное время установлено')}>
          <Text style={styles.btnText}>Сохранить КВ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d2a' },
  overlayTop: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', gap: 12 },
  round: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(91,110,255,0.95)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff',
  },
  bigText: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 30 },
  sub: { color: '#e5e7eb', fontSize: 12, marginTop: 2 },
  stats: { flex: 1, backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  stat: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { color: '#93a4c8' }, statValue: { color: '#fff', fontWeight: '800' },
  overlayBottom: { position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  btnStart: { backgroundColor: '#5b6eff' }, btnStop: { backgroundColor: '#ef4444' }, btnSave: { backgroundColor: '#16a34a' }, btnGhost: { backgroundColor: '#1a2145', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  etaPanel: { position: 'absolute', left: 16, right: 16, bottom: 86, backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  etaTitle: { color: '#fff', fontWeight: '700', marginBottom: 6 }, etaInput: { backgroundColor: '#0b0d2a', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }
});
