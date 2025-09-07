import { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Animated } from 'react-native';
import OSMWebView from '../components/OSMWebView';
import { useRecorder } from '../contexts/RecorderContext';
import { useRoutes } from '../contexts/RoutesContext';
import { useLocation } from '../contexts/LocationContext';

export default function HomeScreen() {
  const { recording, current, records, start, stop, save, discard } = useRecorder();
  const { addRoute } = useRoutes();
  const { currentLocation, heading, speed, accuracy } = useLocation();
  const [saving, setSaving] = useState(false);
  const [showStats] = useState(true);
  const startScale = useRef(new Animated.Value(1)).current;
  const stopScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const discardScale = useRef(new Animated.Value(1)).current;
  const compassRotation = useRef(new Animated.Value(0)).current;

  // обновляем компас при изменении heading
  useEffect(() => {
    if (heading !== 0) {
      Animated.timing(compassRotation, {
        toValue: heading,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [heading, compassRotation]);

  // живой маршрут строим
  const liveRoute = useMemo(() => {
    if (!current?.points?.length) return null;
    const coordinates = current.points.map(p => [p.longitude, p.latitude, p.altitude ?? null]).filter(c => c[0] && c[1]);
    return {
      id: 'live',
      color: '#22c55e',
      width: 4,
      geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }] }
    };
  }, [current]);

  // центр карты считаем
  const center = useMemo(() => {
    if (current?.points?.length) {
      const last = current.points[current.points.length - 1];
      return [last.longitude, last.latitude];
    }
    if (records?.length) {
      const f = records[records.length - 1]?.geojson?.features?.[0];
      const c = f?.geometry?.coordinates?.[0];
      if (c) return [c[0], c[1]];
    }
    return [76.95, 43.25];
  }, [current, records]);

  // все маршруты собираем
  const allRoutes = useMemo(() => {
    const list = [];
    if (liveRoute) list.push(liveRoute);
    if (records?.length) {
      for (const r of records) list.push(r);
    }
    return list;
  }, [liveRoute, records]);

  // сохраняем трек
  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const entry = await save();
      if (entry) {
        addRoute(entry);
        Alert.alert('Сохранено', entry.name || entry.id);
      } else {
        Alert.alert('Нечего сохранять', 'Трек слишком короткий');
      }
    } catch (e) {
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }) => {
    const name = item.name || item.id;
    const len = item?.stats?.length_km ? `${item.stats.length_km} km` : '';
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{name}</Text>
        {!!len && <Text style={styles.cardSub}>{len}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AlpineMaps</Text>
      <View style={styles.mapWrap}>
        <OSMWebView routes={allRoutes} centerCoordinate={center} zoom={14} />

        {/* Экспериментальные фичи: Компас и статистика */}
        {showStats && (
          <View style={styles.statsOverlay}>
            {/* Компас */}
            <View style={styles.compassContainer}>
              <Animated.View
                style={[
                  styles.compass,
                  { transform: [{ rotate: compassRotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg']
                  }) }] }
                ]}
              >
                <View style={styles.compassNeedle} />
                <Text style={styles.compassText}>N</Text>
              </Animated.View>
              <Text style={styles.compassLabel}>
                {Math.round(heading)}°
              </Text>
            </View>

            {/* Статистика */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Высота</Text>
                <Text style={styles.statValue}>
                  {currentLocation?.altitude ? Math.round(currentLocation.altitude) + 'м' : '--'}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Скорость</Text>
                <Text style={styles.statValue}>
                  {speed ? Math.round(speed * 3.6) + 'км/ч' : '--'}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Точность</Text>
                <Text style={styles.statValue}>
                  {accuracy ? Math.round(accuracy) + 'м' : '--'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.controls}>
          {!recording ? (
            <Animated.View style={{ transform: [{ scale: startScale }] }}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={() => {
                  Animated.sequence([
                    Animated.timing(startScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
                    Animated.timing(startScale, { toValue: 1, duration: 100, useNativeDriver: true }),
                  ]).start();
                  start();
                }}
              >
                <Text style={styles.btnText}>Старт</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View style={{ transform: [{ scale: stopScale }] }}>
              <TouchableOpacity
                style={[styles.btn, styles.btnWarn]}
                onPress={() => {
                  Animated.sequence([
                    Animated.timing(stopScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
                    Animated.timing(stopScale, { toValue: 1, duration: 100, useNativeDriver: true }),
                  ]).start();
                  stop();
                }}
              >
                <Text style={styles.btnText}>Стоп</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
          <Animated.View style={{ transform: [{ scale: saveScale }] }}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSave]}
              onPress={() => {
                Animated.sequence([
                  Animated.timing(saveScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
                  Animated.timing(saveScale, { toValue: 1, duration: 100, useNativeDriver: true }),
                ]).start();
                onSave();
              }}
              disabled={saving || !current?.points?.length}
            >
              <Text style={styles.btnText}>Сохранить</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: discardScale }] }}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={() => {
                Animated.sequence([
                  Animated.timing(discardScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
                  Animated.timing(discardScale, { toValue: 1, duration: 100, useNativeDriver: true }),
                ]).start();
                discard();
              }}
            >
              <Text style={styles.btnText}>Отменить</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
      <Text style={styles.section}>Записанные</Text>
      <FlatList data={[...records].reverse()} renderItem={renderItem} keyExtractor={it => it.id} contentContainerStyle={styles.listPad} ListEmptyComponent={<Text style={styles.empty}>Нет записанных маршрутов</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d2a', padding: 16, gap: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  mapWrap: { flex: 1, borderRadius: 16, overflow: 'hidden', position: 'relative', shadowColor: '#5b6eff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  controls: { position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3 },
  btnPrimary: { backgroundColor: '#5b6eff' },
  btnWarn: { backgroundColor: '#ef4444' },
  btnSave: { backgroundColor: '#16a34a' },
  btnGhost: { backgroundColor: '#1a2145', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  section: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginTop: 8 },
  listPad: { paddingBottom: 20, gap: 12 },
  card: { backgroundColor: '#1a2145', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  cardSub: { color: '#93a4c8', marginTop: 4, fontSize: 14 },
  empty: { color: '#93a4c8', textAlign: 'center', paddingVertical: 24, fontSize: 16 },

  // Экспериментальные фичи
  statsOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 12,
  },
  compassContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 13, 42, 0.9)',
    borderRadius: 50,
    padding: 12,
    borderWidth: 2,
    borderColor: 'rgba(91, 110, 255, 0.3)',
  },
  compass: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1a2145',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#5b6eff',
  },
  compassNeedle: {
    width: 2,
    height: 25,
    backgroundColor: '#5b6eff',
    position: 'absolute',
    top: 5,
  },
  compassText: {
    color: '#5b6eff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  compassLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: 'rgba(11, 13, 42, 0.9)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(91, 110, 255, 0.3)',
    minWidth: 120,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    color: '#93a4c8',
    fontSize: 12,
  },
  statValue: {
    color: '#5b6eff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});