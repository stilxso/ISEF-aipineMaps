import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity } from 'react-native';
import news from '../config/mbs.json';

export default function HomeScreen() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    
    const mapped = (Array.isArray(news) ? news : [])
      .slice(0, 10)
      .map((n, i) => ({ id: n.id || `news_${i}`, title: n.name || n.title || 'Новость', body: n.description || '—' }));
    setItems(mapped);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Новости приложения</Text>
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          ListEmptyComponent={<Text style={styles.empty}>Пока нет новостей</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.body}</Text>
              <TouchableOpacity style={[styles.btn, { alignSelf: 'flex-start', marginTop: 8 }]}>
                <Text style={styles.btnText}>Подробнее</Text>
              </TouchableOpacity>
            </View>
          )}
        />
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
  btn: { backgroundColor: '#5b6eff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});
