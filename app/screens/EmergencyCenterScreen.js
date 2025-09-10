import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import MapBoxMapView from '../components/MapBoxMapView';
import { useSos } from '../contexts/SosContext';

export default function EmergencyCenterScreen() {
  const { alertsHistory, pendingAlerts, clearHistory, clearPending } = useSos();

  // Combine and sort alerts by timestamp (newest first)
  const allAlerts = useMemo(() => {
    const combined = [
      ...alertsHistory.map(alert => ({ ...alert, status: 'sent' })),
      ...pendingAlerts.map(alert => ({ ...alert, status: 'pending' })),
    ];
    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [alertsHistory, pendingAlerts]);

  // Create markers for map
  const alertMarkers = useMemo(() => {
    return allAlerts
      .filter(alert => alert.location?.latitude && alert.location?.longitude)
      .map((alert, index) => ({
        id: `alert-${alert.id}`,
        type: alert.status === 'pending' ? 'pending' : 'alert',
        latitude: alert.location.latitude,
        longitude: alert.location.longitude,
        title: alert.status === 'pending' ? 'Pending Alert' : 'Sent Alert',
        timestamp: alert.timestamp,
      }));
  }, [allAlerts]);

  // Map center based on latest alert
  const mapCenter = useMemo(() => {
    if (alertMarkers.length > 0) {
      const latest = alertMarkers[0];
      return [latest.longitude, latest.latitude];
    }
    return [76.8512, 43.2389]; // Default center
  }, [alertMarkers]);

  const handleAlertPress = (alert) => {
    const date = new Date(alert.timestamp).toLocaleString();
    const location = alert.location
      ? `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`
      : 'Location not available';

    Alert.alert(
      `Alert ${alert.status === 'pending' ? '(Pending)' : '(Sent)'}`,
      `Time: ${date}\nLocation: ${location}\nRoute: ${alert.routeId || 'N/A'}`,
      [{ text: 'OK' }]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all sent alerts?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearHistory },
      ]
    );
  };

  const handleClearPending = () => {
    Alert.alert(
      'Clear Pending',
      'Are you sure you want to clear all pending alerts?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearPending },
      ]
    );
  };

  const renderAlertItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.alertItem, item.status === 'pending' && styles.pendingAlert]}
      onPress={() => handleAlertPress(item)}
    >
      <View style={styles.alertHeader}>
        <Text style={styles.alertTime}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
        <View style={[styles.statusBadge, item.status === 'pending' && styles.pendingBadge]}>
          <Text style={[styles.statusText, item.status === 'pending' && styles.pendingText]}>
            {item.status === 'pending' ? 'PENDING' : 'SENT'}
          </Text>
        </View>
      </View>

      <Text style={styles.alertLocation}>
        📍 {item.location
          ? `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`
          : 'Location not available'
        }
      </Text>

      {item.routeId && (
        <Text style={styles.alertRoute}>🗺️ Route: {item.routeId}</Text>
      )}

      {item.contacts && item.contacts.length > 0 && (
        <Text style={styles.alertContacts}>
          👥 Contacts: {item.contacts.length}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapBoxMapView
          routes={[]}
          markers={alertMarkers}
          centerCoordinate={mapCenter}
          zoomLevel={10}
          showUserLocation={false}
        />
      </View>

      {/* Alerts List */}
      <View style={styles.listContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Emergency Alerts</Text>
          <View style={styles.headerButtons}>
            {pendingAlerts.length > 0 && (
              <TouchableOpacity
                style={[styles.headerButton, styles.clearPendingButton]}
                onPress={handleClearPending}
              >
                <Text style={styles.headerButtonText}>
                  Clear Pending ({pendingAlerts.length})
                </Text>
              </TouchableOpacity>
            )}
            {alertsHistory.length > 0 && (
              <TouchableOpacity
                style={[styles.headerButton, styles.clearHistoryButton]}
                onPress={handleClearHistory}
              >
                <Text style={styles.headerButtonText}>
                  Clear History ({alertsHistory.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {allAlerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No emergency alerts yet</Text>
            <Text style={styles.emptySubtext}>
              Emergency alerts will appear here when sent
            </Text>
          </View>
        ) : (
          <FlatList
            data={allAlerts}
            keyExtractor={(item) => item.id}
            renderItem={renderAlertItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0d2a',
  },
  mapContainer: {
    height: 250,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2145',
  },
  listContainer: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2145',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearPendingButton: {
    backgroundColor: '#f59e0b',
  },
  clearHistoryButton: {
    backgroundColor: '#ef4444',
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#93a4c8',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  alertItem: {
    backgroundColor: 'rgba(11,13,42,0.92)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pendingAlert: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245,158,11,0.1)',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTime: {
    fontSize: 14,
    color: '#93a4c8',
  },
  statusBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#f59e0b',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pendingText: {
    color: '#1f2937',
  },
  alertLocation: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  alertRoute: {
    fontSize: 12,
    color: '#93a4c8',
    marginBottom: 2,
  },
  alertContacts: {
    fontSize: 12,
    color: '#93a4c8',
  },
});