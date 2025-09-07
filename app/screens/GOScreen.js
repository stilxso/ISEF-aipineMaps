import { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import OSMWebView from '../components/OSMWebView';
import { useRoutes } from '../contexts/RoutesContext';

export default function GOScreen() {
  const { routes } = useRoutes();

  const latest = useMemo(() => {
    if (!routes || routes.length === 0) return null;
    return routes[routes.length - 1];
  }, [routes]);

  const center = useMemo(() => {
    const f = latest?.geojson?.features?.[0];
    const c = f?.geometry?.coordinates?.[0];
    if (c) return [c[0], c[1]];
    return [76.95, 43.25];
  }, [latest]);

  return (
    <View style={styles.container}>
      {latest ? (
        <OSMWebView routes={[latest]} centerCoordinate={center} zoom={14} />
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No route selected. Record on Home or install on Trails.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d2a' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#93a4c8', fontSize: 18, textAlign: 'center', lineHeight: 24 }
});