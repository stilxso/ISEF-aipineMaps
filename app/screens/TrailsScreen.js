import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, Button, Alert, FlatList, StyleSheet } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { loadData } from '../services/storage';
import { downloadParseAndSave } from '../services/gpxNative';
import TrailCard from '../components/TrailCard';
import { CONFIG } from '../config/env';

export default function TrailsScreen({ navigation }) {
  const [routes, setRoutes] = useState([]);
  const [url, setUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [progress, setProgress] = useState(null);
  const [center, setCenter] = useState([76.95, 43.25]);
  const [loading, setLoading] = useState(false);

  const mapCenter = useMemo(() => {
    if (routes.length > 0) {
      try {
        const f = routes[0].geojson.features[0];
        const c = f.geometry.type === 'LineString' ? f.geometry.coordinates[0] : f.geometry.coordinates;
        if (c && Array.isArray(c)) return c.slice(0, 2);
      } catch (e) {
        console.warn('Error calculating map center:', e);
      }
    }
    return center;
  }, [routes, center]);

  const mapRegion = useMemo(() => {
    return {
      latitude: mapCenter[1],
      longitude: mapCenter[0],
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [mapCenter]);

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        setLoading(true);
        const r = await loadData(CONFIG.STORAGE_KEYS.ROUTES);
        if (r && r.length > 0) {
          setRoutes(r);
        }
      } catch (e) {
        console.warn('Error loading routes:', e);
        Alert.alert('Ошибка', 'Не удалось загрузить маршруты');
      } finally {
        setLoading(false);
      }
    };
    
    loadRoutes();
  }, []);

  const handleDownload = useCallback(async () => {
    if (!url.trim()) { 
      Alert.alert('Ошибка', 'Вставьте URL GPX'); 
      return; 
    }
    
    const name = filename.trim() || `route_${Date.now()}.gpx`;
    setProgress(0);
    
    try {
      const entry = await downloadParseAndSave(
        url.trim(), 
        name, 
        p => setProgress(p),
        {
          avgSpeedKmh: CONFIG.DEFAULT_AVG_SPEED_KMH,
          ascentMetersPerHour: CONFIG.DEFAULT_ASCENT_METERS_PER_HOUR
        }
      );
      setRoutes(prev => [...(prev || []), entry]);
      Alert.alert('Готово', `Маршрут "${entry.name}" сохранён.`);
      setUrl(''); 
      setFilename('');
    } catch (e) {
      console.error('Download error:', e);
      Alert.alert('Ошибка загрузки', e.message || String(e));
    } finally {
      setProgress(null);
    }
  }, [url, filename]);

  const routeElements = useMemo(() => {
    return routes.map((r, idx) => {
      const id = r.id || `route-${idx}`;
      const f = r.geojson.features[0];
      
      if (!f || f.geometry.type !== 'LineString') return null;
      
      const coordinates = f.geometry.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
      
      return (
        <Polyline
          key={id}
          coordinates={coordinates}
          strokeColor="#ef4444"
          strokeWidth={3}
          lineCap="round"
          lineJoin="round"
        />
      );
    }).filter(Boolean);
  }, [routes]);

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.mapView}
        provider={PROVIDER_DEFAULT}
        region={mapRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings={false}
        showsIndoors={false}
        showsPointsOfInterest={false}
        showsTraffic={false}
        customMapStyle={[]}
      >
        {routeElements}
      </MapView>

      <View style={styles.downloadContainer}>
        <Text style={styles.downloadTitle}>Загрузить GPX по URL</Text>
        <TextInput 
          value={url} 
          onChangeText={setUrl} 
          placeholder="https://.../track.gpx" 
          style={styles.input} 
        />
        <TextInput 
          value={filename} 
          onChangeText={setFilename} 
          placeholder="имя файла.gpx" 
          style={styles.input} 
        />
        <Button 
          title={progress !== null ? `Загрузка ${progress}%` : 'Скачать и сохранить'} 
          onPress={handleDownload} 
          disabled={progress !== null} 
        />
      </View>

      <View style={styles.routesContainer}>
        <Text style={styles.routesTitle}>Локальные маршруты</Text>
        <FlatList
          data={routes}
          keyExtractor={(it) => it.id || `route-${it.name}`}
          renderItem={({item}) => (
            <TrailCard
              name={item.name}
              difficulty={item.stats?.difficulty || '—'}
              onPress={() => navigation.navigate('CO', { routeGeo: item.geojson.features[0], routeMeta: item })}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {loading ? 'Загрузка...' : 'Нет маршрутов'}
            </Text>
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 80,
            offset: 80 * index,
            index,
          })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapView: {
    flex: 1,
  },
  downloadContainer: {
    padding: 12,
    backgroundColor: 'white',
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1e293b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  routesContainer: {
    padding: 12,
    backgroundColor: '#f0f9ff',
    flex: 1,
  },
  routesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1e293b',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 14,
  },
});