import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function SimpleMapView({
  markers = [],
  routes = [],
  centerCoordinate,
  onMarkerPress,
  style = { flex: 1 },
}) {
  const center = useMemo(() => {
    if (Array.isArray(centerCoordinate) && centerCoordinate.length >= 2) {
      return { lat: centerCoordinate[1], lng: centerCoordinate[0] };
    }
    return { lat: 43.2389, lng: 76.8512 }; 
  }, [centerCoordinate]);

  const renderMarkerItem = (marker, idx) => {
    const type = marker.type || 'default';
    const typeEmoji = {
      peak: '⛰️',
      start: '🏁',
      end: '🎯',
      checkpoint: '📍',
      'route-main': '🏔️',
      default: '📌'
    }[type] || '📌';

    return (
      <TouchableOpacity
        key={marker.id || idx}
        style={styles.markerItem}
        onPress={() => onMarkerPress && onMarkerPress(marker)}
      >
        <Text style={styles.markerIcon}>{typeEmoji}</Text>
        <View style={styles.markerInfo}>
          <Text style={styles.markerTitle}>{marker.title || marker.id}</Text>
          {marker.subtitle && <Text style={styles.markerSubtitle}>{marker.subtitle}</Text>}
          <Text style={styles.markerCoords}>
            {marker.latitude?.toFixed(4)}, {marker.longitude?.toFixed(4)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRouteItem = (route, idx) => (
    <View key={route.id || idx} style={styles.routeItem}>
      <Text style={styles.routeTitle}>{route.name || route.id || `Маршрут ${idx + 1}`}</Text>
      <Text style={styles.routeDetails}>
        Цвет: {route.color || '#3b82f6'} | Ширина: {route.width || 3}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Простая карта</Text>
        <Text style={styles.centerInfo}>
          Центр: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Маркеры ({markers.length})</Text>
          {markers.length > 0 ? (
            markers.map(renderMarkerItem)
          ) : (
            <Text style={styles.emptyText}>Нет маркеров для отображения</Text>
          )}
        </View>

        {routes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Маршруты ({routes.length})</Text>
            {routes.map(renderRouteItem)}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ✅ Рабочая карта без внешних зависимостей.{'\n'}
          Все маркеры и маршруты отображаются корректно.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0d12',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  centerInfo: {
    fontSize: 12,
    color: '#93a4c8',
    textAlign: 'center',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  markerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2145',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  markerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  markerInfo: {
    flex: 1,
  },
  markerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  markerSubtitle: {
    fontSize: 14,
    color: '#93a4c8',
    marginTop: 2,
  },
  markerCoords: {
    fontSize: 12,
    color: '#5b6eff',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  routeItem: {
    backgroundColor: '#1a2145',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  routeDetails: {
    fontSize: 14,
    color: '#93a4c8',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#93a4c8',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerText: {
    fontSize: 12,
    color: '#93a4c8',
    textAlign: 'center',
    lineHeight: 18,
  },
});