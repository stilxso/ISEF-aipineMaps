// app/screens/MapScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList, Alert, Switch } from 'react-native';
import MapBoxMapView from '../components/MapBoxMapView';
import { useRoutes } from '../contexts/RoutesContext';
import { useRecorder } from '../contexts/RecorderContext';
import { useLocation } from '../contexts/LocationContext';

export default function MapScreen() {
  const { records, addRoute } = useRoutes();
  const { recording, current, start, stop, save, discard } = useRecorder();
  const { currentLocation } = useLocation();

  const [enable3D, setEnable3D] = useState(false);
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const liveRoute = useMemo(() => {
    if (!current?.points?.length) return null;
    const coordinates = current.points.map((p) => [p.longitude, p.latitude, p.altitude ?? null]);
    return {
      id: 'live', color: '#22c55e', width: 5,
      geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }] },
    };
  }, [current]);

  const allRoutes = useMemo(() => {
    const list = [];
    if (liveRoute) list.push(liveRoute);
    if (selected) list.push(selected);
    if (!liveRoute && !selected) list.push(...records);
    return list;
  }, [liveRoute, selected, records]);

  const center = useMemo(() => {
    if (current?.points?.length) {
      const last = current.points[current.points.length - 1];
      return [last.longitude, last.latitude];
    }
    if (selected) {
      const c = selected?.geojson?.features?.[0]?.geometry?.coordinates?.[0];
      if (c) return [c[0], c[1]];
    }
    return [currentLocation?.longitude || 76.8512, currentLocation?.latitude || 43.2389];
  }, [current, selected, currentLocation]);

  useEffect(() => {
    // placeholder for peaks/places load if needed
  }, []);

  const onMarkerPress = async (marker) => {
    // marker could be object with id/gpxUrl
    const title = marker?.title || marker?.id || 'Место';
    const gpxUrl = marker?.gpxUrl;
    const buttons = [];
    if (gpxUrl) {
      buttons.push({ text: 'Скачать', onPress: async () => {
        setDownloading(true);
        try {
          // example: fetch and parse gpX then addRoute
          // for now create a dummy route (as fallback)
          const entry = {
            id: `srv_${Date.now()}`,
            name: title,
            geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[76.85, 43.24],[76.86,43.25]] } }] },
            stats: { length_km: '1.2' },
            color: '#3b82f6',
            width: 3,
          };
          addRoute(entry);
          Alert.alert('Скачано', `Маршрут ${title} добавлен`);
        } catch (e) {
          Alert.alert('Ошибка', String(e?.message || e));
        } finally {
          setDownloading(false);
        }
      }});
    }
    buttons.push({ text: 'Закрыть', style: 'cancel' });
    Alert.alert(title, 'Действие:', buttons);
  };

  return (
    <View style={styles.container}>
      <MapBoxMapView
        routes={allRoutes}
        markers={[]}
        centerCoordinate={center}
        zoomLevel={13}
        enable3D={enable3D}
        terrainEnabled={enable3D}
        showUserLocation
        onMarkerPress={onMarkerPress}
      />

      <View style={styles.toolbar}>
        <View style={styles.row}>
          <Text style={styles.tLabel}>3D</Text>
          <Switch value={enable3D} onValueChange={setEnable3D} />
        </View>

        {!recording ? (
          <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={start}>
            <Text style={styles.btnText}>Запись</Text>
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

      <View style={styles.listWrap}>
        <Text style={styles.title}>Маршруты</Text>
        <FlatList
          data={[...records].reverse()}
          keyExtractor={(it) => it.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
              <Text style={styles.cardTitle}>{item.name || item.id}</Text>
              {!!item?.stats?.length_km && <Text style={styles.cardSub}>{item.stats.length_km} км</Text>}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Нет сохранённых</Text>}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d2a' },
  toolbar: {
    position: 'absolute', left: 16, right: 16, top: 16,
    backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tLabel: { color: '#fff', fontWeight: '700' },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '800' },
  btnStart: { backgroundColor: '#5b6eff' },
  btnStop: { backgroundColor: '#ef4444' },
  btnSave: { backgroundColor: '#16a34a' },
  btnGhost: { backgroundColor: '#1a2145', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  listWrap: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  title: { color: '#fff', fontWeight: '800', marginBottom: 8 },
  card: { backgroundColor: '#1a2145', padding: 12, borderRadius: 12, marginRight: 10 },
  cardTitle: { color: '#fff', fontWeight: '700' },
  cardSub: { color: '#93a4c8' },
  empty: { color: '#93a4c8' },
});
