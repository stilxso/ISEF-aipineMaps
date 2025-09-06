import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { loadData } from '../services/storage';
import TrailCard from '../components/TrailCard';
import { CONFIG } from '../config/env';

export default function HomeScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const h = await loadData(CONFIG.STORAGE_KEYS.HISTORY);
        setHistory(h || []);
      } catch (e) {
        console.warn('Error loading history:', e);
      } finally {
        setLoading(false);
      }
    };
    
    loadHistory();
  }, []);

  const renderTrailCard = useCallback(({ item }) => (
    <TrailCard
      name={item.name}
      difficulty={item.difficulty || '—'}
      onPress={() => {}}
    />
  ), []);

  const keyExtractor = useCallback((item, idx) => 
    item.id ? String(item.id) : String(idx), []
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Пройденные маршруты</Text>

      <FlatList
        data={history}
        keyExtractor={keyExtractor}
        renderItem={renderTrailCard}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? 'Загрузка...' : 'Пока нет походов'}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1e293b',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 16,
  },
});