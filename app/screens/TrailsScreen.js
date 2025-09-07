import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import OSMWebView from '../components/OSMWebView';
import { useRoutes } from '../contexts/RoutesContext';
import { downloadParseAndSave } from '../services/gpxNative';
import { getPeaks } from '../services/peaks';

export default function TrailsScreen() {
  const { addRoute } = useRoutes();
  const [peaks, setPeaks] = useState([]);
  const [loadingPeaks, setLoadingPeaks] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeTitle, setActiveTitle] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingPeaks(true);
        const list = await getPeaks();
        if (!cancelled) setPeaks(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) setPeaks([]);
      } finally {
        if (!cancelled) setLoadingPeaks(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onMarkerPress = useCallback(async (id) => {
    if (downloading) return;
    const m = peaks.find(x => x.id === id);
    if (!m) return;
    try {
      setActiveTitle(m.title || m.id);
      setDownloading(true);
      const fileName = `${m.id}.gpx`;
      const entry = await downloadParseAndSave(m.gpxUrl, fileName, () => {}, {});
      addRoute(entry);
      Alert.alert('Installed', activeTitle || m.id);
    } catch (e) {
      Alert.alert('Download failed', String(e?.message || e));
    } finally {
      setDownloading(false);
      setActiveTitle('');
    }
  }, [downloading, peaks, addRoute, activeTitle]);

  const center = useMemo(() => {
    if (peaks.length > 0) {
      const p = peaks[0];
      return [p.longitude, p.latitude];
    }
    return [76.95, 43.25];
  }, [peaks]);

  return (
    <View style={styles.container}>
      <OSMWebView
        routes={[]}
        markers={peaks}
        centerCoordinate={center}
        zoom={11}
        onMarkerPress={onMarkerPress}
        style={styles.map}
      />
      {(loadingPeaks || downloading) && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.overlayText}>
            {loadingPeaks ? 'Loading peaks...' : `Installing ${activeTitle}...`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d2a' },
  map: { flex: 1 },
  overlay: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  overlayText: { color: '#ffffff', fontSize: 16, fontWeight: '600', backgroundColor: 'rgba(11,13,42,0.8)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }
});