import { useMemo } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, Alert } from 'react-native';
import MapBoxMapView from '../components/MapBoxMapView';
import { useRoutes } from '../contexts/RoutesContext';
import { deleteRegion, getDownloadedRegions } from '../services/offlineMaps';

export default function HomeScreen() {
  const { records, replaceRoutes } = useRoutes();

  const center = useMemo(() => {
    if (records?.length) {
      const f = records[records.length - 1]?.geojson?.features?.[0];
      const c = f?.geometry?.coordinates?.[0];
      if (c) return [c[0], c[1]];
    }
    return [76.8512, 43.2389];
  }, [records]);

  const onDeleteRoute = (id) => {
    Alert.alert('Удалить маршрут', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => replaceRoutes(records.filter(r => r.id !== id)) },
    ]);
  };

  const showDownloadedRegions = async () => {
    const regs = await getDownloadedRegions();
    Alert.alert('Оффлайн регионы', `Найдено: ${regs.length}`, [{ text: 'OK' }]);
  };

  return (
    <View style={styles.container}>
      <MapBoxMapView routes={records} markers={[]} centerCoordinate={center} enable3D zoomLevel={12} />
      <View style={styles.panel}>
        <Text style={styles.title}>Записанные маршруты</Text>
        <FlatList
          data={[...records].reverse()}
          keyExtractor={(it) => it.id}
          ListEmptyComponent={<Text style={styles.empty}>Нет маршрутов</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name || item.id}</Text>
              {!!item?.stats?.length_km && <Text style={styles.cardSub}>{item.stats.length_km} км</Text>}
              <View style={styles.row}>
                <TouchableOpacity onPress={() => Alert.alert('Просмотр', 'Открыть маршрут на карте')} style={styles.btn}>
                  <Text style={styles.btnText}>Открыть</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDeleteRoute(item.id)} style={[styles.btn, { backgroundColor: '#ef4444' }]}>
                  <Text style={styles.btnText}>Удалить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
        <View style={{ marginTop: 8 }}>
          <TouchableOpacity onPress={showDownloadedRegions} style={[styles.btn, { alignSelf: 'flex-start' }]}>
            <Text style={styles.btnText}>Оффлайн регионы</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d2a' },
  panel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(11,13,42,0.92)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 8 },
  empty: { color: '#93a4c8', padding: 12, textAlign: 'center' },
  card: { paddingVertical: 8 },
  cardTitle: { color: '#fff', fontWeight: '700' },
  cardSub: { color: '#93a4c8' },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { backgroundColor: '#5b6eff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});
