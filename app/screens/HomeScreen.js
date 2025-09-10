// тут импортируем хуки и компоненты для домашнего экрана
import { useMemo } from 'react';
// здесь импортируем компоненты реакт натива
import { View, StyleSheet, FlatList, Text, TouchableOpacity, Alert, Image } from 'react-native';
// подключаем контекст маршрутов
import { useRoutes } from '../contexts/RoutesContext';
// импортируем функции для оффлайн карт
import { deleteRegion, getDownloadedRegions } from '../services/offlineMaps';

// главный экран с маршрутами
export default function HomeScreen() {
  const { records, replaceRoutes } = useRoutes();

  // функция для удаления маршрута
  const onDeleteRoute = (id) => {
    Alert.alert('Удалить маршрут', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => replaceRoutes(records.filter(r => r.id !== id)) },
    ]);
  };

  // тут показываем скачанные регионы
  const showDownloadedRegions = async () => {
    const regs = await getDownloadedRegions();
    Alert.alert('Оффлайн регионы', `Найдено: ${regs.length}`, [{ text: 'OK' }]);
  };

  return (
    <View style={styles.container}>
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
              {item.photos && item.photos.length > 0 && (
                <FlatList
                  data={item.photos}
                  horizontal
                  keyExtractor={(photo, index) => `${item.id}-photo-${index}`}
                  renderItem={({ item: photo }) => (
                    <Image source={{ uri: photo }} style={styles.photo} />
                  )}
                  showsHorizontalScrollIndicator={false}
                  style={styles.photosList}
                />
              )}
              <View style={styles.row}>
                <TouchableOpacity onPress={() => Alert.alert('GPX', `Файл: ${item.localFile || 'Не найден'}`)} style={styles.btn}>
                  <Text style={styles.btnText}>GPX</Text>
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
    flex: 1,
    margin: 16,
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
  photosList: { marginTop: 8 },
  photo: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { backgroundColor: '#5b6eff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});
