
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList, Alert, Switch, Linking, Platform, Modal } from 'react-native';
import RNFS from 'react-native-fs';
import MapBoxMapView from '../components/MapBoxMapView';
import SimpleMapView from '../components/SimpleMapView';
import RoutePlannerModal from '../components/RoutePlannerModal';
import { useRoutes } from '../contexts/RoutesContext';
import { useRecorder } from '../contexts/RecorderContext';
import { useLocation } from '../contexts/LocationContext';
import { usePeaks } from '../contexts/PeaksContext';
import { API_BASE_URL } from '../config/api';
import apiClient from '../services/apiClient';
import { sendRouteToGo, getGoRoutes } from '../services/goUtils';
import { getWeather } from '../services/weather';
import { downloadParseAndSave } from '../services/gpxNative';
import { useNavigation } from '@react-navigation/native';

export default function MapScreen() {
  const { records, addRoute } = useRoutes();
  const { recording, current, start, stop, save, discard } = useRecorder();
  const { currentLocation } = useLocation();
  const { peaks } = usePeaks();

  const [enable3D, setEnable3D] = useState(false);
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true); 
  const [showRoutePlanner, setShowRoutePlanner] = useState(false); 
  const [goRoutes, setGoRoutes] = useState(new Set()); 
  const [useSimpleMap, setUseSimpleMap] = useState(false); 
  const [currentZoom, setCurrentZoom] = useState(13); 
  const [mapZoomLevel, setMapZoomLevel] = useState(13);
  const [mapCenter, setMapCenter] = useState(null);
  const [weather, setWeather] = useState(null);
  const [showWeather, setShowWeather] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadGoRoutes();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      fetchWeather();
    }
  }, [currentLocation]);

  const loadGoRoutes = async () => {
    try {
      const goRoutesList = await getGoRoutes();
      const routeIds = new Set(goRoutesList.map(route => route.originalRouteId));
      setGoRoutes(routeIds);
    } catch (error) {
      console.error('Error loading GO routes:', error);
    }
  };

  const fetchWeather = async () => {
    if (!currentLocation) return;
    try {
      const weatherData = await getWeather(currentLocation.latitude, currentLocation.longitude);
      setWeather({
        temperature: weatherData.main?.temp,
        weather: weatherData.weather?.[0]?.main,
        description: weatherData.weather?.[0]?.description,
        windSpeed: weatherData.wind?.speed,
      });
    } catch (error) {
      console.warn('Weather fetch error:', error);
    }
  };

const handleSendToGo = async (route) => {
  if (goRoutes.has(route.id)) {
    Alert.alert('Информация', 'Этот маршрут уже добавлен в GO.');
    return;
  }

  setDownloading(true); 
  Alert.alert('Загрузка', 'Начинаем загрузку маршрута и карты для офлайн-доступа...');

  try {
    const result = await sendRouteToGo(route);
    
    if (result.success) {
      setGoRoutes(prev => new Set(prev).add(route.id));
      Alert.alert('Успех!', result.message);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error sending route to GO:', error);
    Alert.alert('Ошибка', `Не удалось загрузить маршрут: ${error.message}`);
  } finally {
    setDownloading(false); 
  }
};

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

    
    if (peaks && peaks.length > 0) {
      peaks.forEach((peak, index) => {
        if (peak.coordinates && peak.coordinates.length > 0) {
          list.push({
            id: `gpx-route-${peak.id}`,
            color: '#3b82f6',
            width: 3,
            geojson: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: peak.coordinates
              },
              properties: {
                name: peak.title,
                difficulty: peak.difficulty,
                elevation_gain: peak.elevation_gain,
                length_km: peak.length_km,
                description: peak.description,
                source: peak.source,
                gpx_download_url: peak.gpx_download_url
              }
            },
            name: peak.title,
            difficulty: peak.difficulty,
            type: 'gpx-route'
          });
        }
      });
    }

    
    if (liveRoute) list.push(liveRoute);

    
    if (selected) list.push(selected);

    
    if (!liveRoute && !selected) list.push(...records);

    return list;
  }, [liveRoute, selected, records, peaks]);

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

  const peakMarkers = useMemo(() => {
    if (!Array.isArray(peaks) || peaks.length === 0) return [];

    
    const gridKey = (lat, lon, precision) => `${lat.toFixed(precision)}:${lon.toFixed(precision)}`;

    
    
    
    
    if (currentZoom >= 13) {
      return peaks.map(peak => ({
        id: peak.id,
        title: peak.title,
        latitude: peak.latitude,
        longitude: peak.longitude,
        gpxUrl: peak.gpx_download_url,
        type: 'peak'
      }));
    }

    const precision = currentZoom < 10 ? 1 : 2; 
    const buckets = new Map();

    for (const p of peaks) {
      if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') continue;
      const key = gridKey(p.latitude, p.longitude, precision);
      const entry = buckets.get(key) || { count: 0, latSum: 0, lonSum: 0, samples: [] };
      entry.count += 1;
      entry.latSum += p.latitude;
      entry.lonSum += p.longitude;
      if (entry.samples.length < 3) entry.samples.push(p);
      buckets.set(key, entry);
    }

    const clusters = [];
    let idx = 0;
    for (const [key, val] of buckets.entries()) {
      const lat = val.latSum / val.count;
      const lon = val.lonSum / val.count;
      clusters.push({
        id: `cluster_${precision}_${idx++}`,
        title: `${val.count} пиков`,
        latitude: lat,
        longitude: lon,
        type: 'cluster',
        count: val.count,
        samples: val.samples,
      });
    }

    return clusters;
  }, [peaks, currentZoom]);


  const onMarkerPress = async (marker) => {
    console.log('DEBUG: Marker pressed', marker);

    const title = marker?.title || marker?.id || 'Место';
    const gpxUrl = marker?.gpxUrl;

    
    if (marker?.type === 'cluster') {
      const nextZoom = Math.min(Math.max(Math.floor(currentZoom) + 2, 10), 18);
      setMapCenter([marker.longitude, marker.latitude]);
      setMapZoomLevel(nextZoom);
      return;
    }

    console.log('DEBUG: GPX URL', gpxUrl);

    const buttons = [];
    if (gpxUrl) {
      buttons.push({ text: 'Скачать GPX', onPress: async () => {
        setDownloading(true);
        try {
          const fullUrl = gpxUrl.startsWith('http') ? gpxUrl : `${API_BASE_URL}${gpxUrl}`;
          console.log('DEBUG: Starting GPX download from', fullUrl);
          const response = await apiClient.get(fullUrl, { responseType: 'text' });
          console.log('DEBUG: Response status', response.status);

          const gpxContent = response.data;
          console.log('DEBUG: GPX content length', gpxContent.length);

          const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.gpx`;
          const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
          await RNFS.writeFile(filePath, gpxContent, 'utf8');

          console.log('DEBUG: File saved to', filePath);
          Alert.alert('Скачано', `GPX файл сохранен: ${fileName}`);

          
          if (Platform.OS === 'android') {
            const intentUrl = `content://com.android.externalstorage.documents/document/primary%3ADownload%2F${fileName}`;
            Linking.openURL(intentUrl).catch(() => {
              Alert.alert('Ошибка', 'Не удалось открыть файл в GO');
            });
          }
        } catch (e) {
          console.error('DEBUG: Download error', e);
          Alert.alert('Ошибка', `Не удалось скачать GPX: ${String(e?.message || e)}`);
        } finally {
          setDownloading(false);
        }
      }});

      
      buttons.push({ text: 'Добавить в GO', onPress: async () => {
        console.log('DEBUG: GO button pressed for peak marker:', marker);
        try {
          
          const routeToSend = {
            id: marker.id || `peak_${Date.now()}`,
            name: title,
            geojson: {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [[marker.longitude, marker.latitude]]
                },
                properties: {
                  name: title,
                  gpx_download_url: gpxUrl
                }
              }]
            },
            difficulty: 'unknown',
            stats: {
              length_km: 0
            }
          };

          console.log('DEBUG: Sending peak route to GO:', routeToSend);
          const result = await sendRouteToGo(routeToSend);
          console.log('DEBUG: GO result:', result);

          if (result.success) {
            Alert.alert('Успех', `Пик "${title}" добавлен в GO`);
          }
        } catch (error) {
          console.error('Error sending peak to GO:', error);
          Alert.alert('Ошибка', 'Не удалось добавить в GO');
        }
      }});
      
      buttons.push({ text: 'Обсудить с AI', onPress: async () => {
        try {
          
          if (navigation?.navigate) {
            navigation.navigate('AI', { peakId: marker.id, peakTitle: title });
          }
        } catch (e) {
          console.error('AI discuss error:', e);
        }
      }});
    } else {
      console.log('DEBUG: No GPX URL found for marker');
    }

    buttons.push({ text: 'Закрыть', style: 'cancel' });

    Alert.alert(title, 'Действие:', buttons);
  };

  return (
    <View style={styles.container}>
      {useSimpleMap ? (
        <SimpleMapView
          routes={allRoutes}
          markers={showMarkers ? peakMarkers : []}
          centerCoordinate={center}
          onMarkerPress={onMarkerPress}
        />
      ) : (
        <MapBoxMapView
          routes={allRoutes}
          markers={showMarkers ? peakMarkers : []}
          centerCoordinate={center}
          zoomLevel={13}
          enable3D={enable3D}
          terrainEnabled={enable3D}
          showUserLocation
          onMarkerPress={onMarkerPress}
          onRegionChange={(region) => { if (region?.zoomLevel) setCurrentZoom(region.zoomLevel); }}
        />
      )}
 
      {}
      <TouchableOpacity style={styles.weatherBtn} onPress={() => setShowWeather(true)}>
        <Text style={styles.weatherText}>🌤️</Text>
      </TouchableOpacity>
 
      {}
      {showWeather && (
        <View style={styles.weatherOverlay}>
          <View style={styles.weatherContent}>
            <Text style={styles.weatherTitle}>Погода</Text>
            {weather ? (
              <View>
                <Text style={styles.weatherTemp}>{weather.temperature}°C</Text>
                <Text style={styles.weatherDesc}>{weather.description}</Text>
                <Text style={styles.weatherWind}>Ветер: {weather.windSpeed} м/с</Text>
              </View>
            ) : (
              <Text style={styles.weatherLoading}>Загрузка...</Text>
            )}
            <TouchableOpacity style={styles.weatherClose} onPress={() => setShowWeather(false)}>
              <Text style={styles.weatherCloseText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
 
      {}
      <View style={[styles.debugInfo, { top: 60 }]}>
        <Text style={styles.debugText}>
          Routes: {allRoutes.length} | Markers: {showMarkers ? peakMarkers.length : 0} | Zoom: {currentZoom.toFixed(1)}
        </Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.row}>
          <Text style={styles.tLabel}>3D</Text>
          <Switch value={enable3D} onValueChange={setEnable3D} />
        </View>

        <TouchableOpacity style={[styles.btn, showMarkers ? styles.btnActive : styles.btnInactive]} onPress={() => setShowMarkers(!showMarkers)}>
          <Text style={styles.btnText}>{showMarkers ? 'Скрыть' : 'Показать'} метки</Text>
        </TouchableOpacity>


        <TouchableOpacity style={[styles.btn, useSimpleMap ? styles.btnSimple : styles.btnMap]} onPress={() => setUseSimpleMap(!useSimpleMap)}>
          <Text style={styles.btnText}>{useSimpleMap ? 'Mapbox' : 'Список'}</Text>
        </TouchableOpacity>


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
              <View style={styles.cardContent}>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{item.name || item.id}</Text>
                  {!!item?.stats?.length_km && <Text style={styles.cardSub}>{item.stats.length_km} км</Text>}
                </View>
                <TouchableOpacity
                  onPress={() => handleSendToGo(item)}
                  style={[styles.cardBtn, goRoutes.has(item.id) ? styles.cardBtnGoActive : styles.cardBtnGo]}
                >
                  <Text style={styles.cardBtnText}>
                    {goRoutes.has(item.id) ? '✓ GO' : 'GO'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Нет сохранённых</Text>}
        />
      </View>

      <RoutePlannerModal
        visible={showRoutePlanner}
        onClose={() => setShowRoutePlanner(false)}
        onRouteCreated={(route) => {
          console.log('Route created:', route);
          
          setSelected(route);
        }}
      />

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
  btnActive: { backgroundColor: '#16a34a' },
  btnInactive: { backgroundColor: '#6b7280' },
  btnPlan: { backgroundColor: '#8b5cf6' },
  btnMap: { backgroundColor: '#06b6d4' },
  btnSimple: { backgroundColor: '#f59e0b' },
  listWrap: {
    position: 'absolute', bottom: 100, left: 16, right: 16,
    backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  title: { color: '#fff', fontWeight: '800', marginBottom: 8 },
  card: { backgroundColor: '#1a2145', padding: 12, borderRadius: 12, marginRight: 10 },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardText: { flex: 1 },
  cardTitle: { color: '#fff', fontWeight: '700' },
  cardSub: { color: '#93a4c8' },
  cardBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cardBtnGo: { backgroundColor: '#10b981' },
  cardBtnGoActive: { backgroundColor: '#059669' },
  cardBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { color: '#93a4c8' },
  debugInfo: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  debugText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  weatherBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(11,13,42,0.9)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  weatherText: { fontSize: 20 },

  weatherOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherContent: {
    backgroundColor: '#0b0d2a',
    borderRadius: 14,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  weatherTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  weatherTemp: { color: '#fff', fontSize: 24, fontWeight: '700' },
  weatherDesc: { color: '#93a4c8', fontSize: 16, marginVertical: 8 },
  weatherWind: { color: '#93a4c8', fontSize: 14 },
  weatherLoading: { color: '#93a4c8' },
  weatherClose: { marginTop: 20, backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  weatherCloseText: { color: '#fff', fontWeight: '700' },

  trailItem: { backgroundColor: '#1a2145', padding: 12, borderRadius: 8, marginBottom: 8 },
  trailName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  colorOptions: { flexDirection: 'row', justifyContent: 'space-around' },
  colorBtn: { width: 30, height: 30, borderRadius: 15, borderColor: '#fff' },
});
