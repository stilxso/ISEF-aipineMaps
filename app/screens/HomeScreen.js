import { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Animated, ScrollView } from 'react-native';
import MapBoxMapView from '../components/MapBoxMapView'; // Заменяем OSMWebView на MapBox
import { useRecorder } from '../contexts/RecorderContext';
import { useRoutes } from '../contexts/RoutesContext';
import { useLocation } from '../contexts/LocationContext';
import { useSettings } from '../contexts/SettingsContext';
import { getPlaces } from '../services/places'; // Добавляем сервис мест

export default function HomeScreen() {
  // Получаем данные из контекстов для работы с картой и маршрутами
  const { recording, current, records, start, stop, save, discard } = useRecorder();
  const { addRoute } = useRoutes();
  const { currentLocation, heading, speed, accuracy, watching, startWatching } = useLocation();
  const { settings, updateSetting } = useSettings();

  // Локальное состояние компонента
  const [saving, setSaving] = useState(false); // Флаг сохранения маршрута
  const [showStats] = useState(true); // Показывать ли статистику (компас, высота, скорость)
  const [showSettings, setShowSettings] = useState(false); // Показывать ли панель настроек
  const [places, setPlaces] = useState([]); // Список интересных мест (родники, пики, перевалы)
  const startScale = useRef(new Animated.Value(1)).current;
  const stopScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const discardScale = useRef(new Animated.Value(1)).current;
  const compassRotation = useRef(new Animated.Value(0)).current;
  const settingsOpacity = useRef(new Animated.Value(0)).current;

  // обновляем компас при изменении heading
  useEffect(() => {
    Animated.timing(compassRotation, {
      toValue: heading || 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [heading, compassRotation]);

  // запускаем слежку за локацией для компаса
  useEffect(() => {
    let cleanupFunction = null;

    const startCompass = async () => {
      try {
        if (!watching) {
          cleanupFunction = await startWatching();
        }
      } catch (error) {
        console.warn('Не удалось запустить компас:', error);
      }
    };

    startCompass();

    return () => {
      if (cleanupFunction) {
        cleanupFunction();
      }
    };
  }, [startWatching, watching]);

  // Загружаем список мест при монтировании компонента
  useEffect(() => {
    const loadPlacesData = async () => {
      try {
        const placesData = await getPlaces();
        setPlaces(placesData);
      } catch (error) {
        console.warn('Ошибка загрузки мест:', error);
        // В случае ошибки оставляем пустой массив
        setPlaces([]);
      }
    };

    loadPlacesData();
  }, []);

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

  // переключить настройки
  const toggleSettings = () => {
    const toValue = showSettings ? 0 : 1;
    Animated.timing(settingsOpacity, {
      toValue,
      duration: 300,
      useNativeDriver: true
    }).start();
    setShowSettings(!showSettings);
  };

  // настройки элементы
  const settingsItems = useMemo(() => ([
    { key: 'language', label: 'Язык / Language', value: settings.language === 'ru' ? 'Русский' : 'English', next: settings.language === 'ru' ? 'en' : 'ru' },
    { key: 'theme', label: 'Тема / Theme', value: settings.theme, next: settings.theme === 'dark' ? 'light' : 'dark' },
    { key: 'units', label: 'Единицы / Units', value: settings.units, next: settings.units === 'metric' ? 'imperial' : 'metric' },
    { key: 'mapProvider', label: 'Карта / Map Provider', value: settings.mapProvider, next: settings.mapProvider === 'default' ? 'osm' : 'default' },
    { key: 'locationEnabled', label: 'Локация / Location', value: String(settings.locationEnabled), next: String(!settings.locationEnabled) },
    { key: 'notificationsEnabled', label: 'Уведомления / Notifications', value: String(settings.notificationsEnabled), next: String(!settings.notificationsEnabled) },
    { key: 'autoSave', label: 'Автосохранение / Auto Save', value: String(settings.autoSave), next: String(!settings.autoSave) },
  ]), [settings]);

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
      <View style={styles.header}>
        <Text style={styles.title}>AlpineMaps</Text>
        <TouchableOpacity onPress={toggleSettings} style={styles.settingsBtn}>
          <Text style={styles.settingsBtnText}>{showSettings ? 'Скрыть' : 'Больше'}</Text>
        </TouchableOpacity>
      </View>

      {showSettings && (
        <Animated.View style={[styles.settingsPanel, { opacity: settingsOpacity }]}>
          <ScrollView contentContainerStyle={styles.settingsList}>
            {settingsItems.map(item => (
              <View key={item.key} style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingValue}>{item.value}</Text>
                </View>
                <TouchableOpacity
                  style={styles.settingBtn}
                  onPress={() => {
                    const v = item.next;
                    if (item.key === 'locationEnabled' || item.key === 'notificationsEnabled' || item.key === 'autoSave') {
                      updateSetting(item.key, v === 'true');
                    } else {
                      updateSetting(item.key, v);
                    }
                  }}
                >
                  <Text style={styles.settingBtnText}>Изменить</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>О нас</Text>
              <Text style={styles.aboutText}>
                AlpineMaps - ваше приложение для горных походов.{'\n'}
                Функции: навигация, запись маршрутов, ИИ-помощник,{'\n'}
                3D-карты и многое другое.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      )}

      <View style={styles.mapWrap}>
        {/* Основная карта MapBox с маршрутами и местами */}
        <MapBoxMapView
          routes={allRoutes} // Передаем маршруты для отображения
          markers={places} // Передаем места (родники, пики, перевалы)
          centerCoordinate={center} // Центр карты
          zoomLevel={14} // Уровень масштабирования
          showUserLocation={true} // Показывать локацию пользователя
          userLocation={currentLocation} // Текущая локация пользователя
          enable3D={settings.mapProvider === 'satellite'} // Включаем 3D режим для спутникового вида
          terrainEnabled={settings.mapProvider === 'satellite'} // Включаем рельеф для 3D
          onMarkerPress={(markerId) => {
            // Обработчик нажатия на маркер места
            const place = places.find(p => p.id === markerId);
            if (place) {
              Alert.alert(
                place.name,
                `${place.description}\nВысота: ${place.altitude}м\nСложность: ${place.difficulty}`,
                [{ text: 'OK' }]
              );
            }
          }}
        />

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  settingsBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#5b6eff', borderRadius: 8 },
  settingsBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  settingsPanel: { backgroundColor: '#1a2145', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  settingsList: { gap: 12 },
  settingRow: { backgroundColor: '#2a2a2a', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLeft: { gap: 6 },
  settingLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  settingValue: { color: '#bbb', fontSize: 14 },
  settingBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  settingBtnText: { color: '#fff', fontWeight: '700' },
  aboutSection: { backgroundColor: '#2a2a2a', padding: 16, borderRadius: 12, marginTop: 8 },
  aboutTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  aboutText: { color: '#93a4c8', fontSize: 14, lineHeight: 20 },
  mapWrap: { flex: 1, borderRadius: 16, overflow: 'hidden', position: 'relative', shadowColor: '#5b6eff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  controls: { position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', gap: 12, justifyContent: 'center' },
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