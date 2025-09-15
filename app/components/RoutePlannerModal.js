
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { useLocation } from '../contexts/LocationContext';
import { useRoutes } from '../contexts/RoutesContext';

export default function RoutePlannerModal({ visible, onClose, onRouteCreated }) {
  const { currentLocation } = useLocation();
  const { addRoute } = useRoutes();

  const [routeName, setRouteName] = useState('');
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [difficulty, setDifficulty] = useState('1a');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [isPlanning, setIsPlanning] = useState(false);

  useEffect(() => {
    if (visible && currentLocation && useCurrentLocation) {
      setStartPoint({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        name: 'Текущее местоположение'
      });
    }
  }, [visible, currentLocation, useCurrentLocation]);

  const addWaypoint = () => {
    if (currentLocation) {
      const newWaypoint = {
        id: Date.now(),
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        name: `Точка ${waypoints.length + 1}`
      };
      setWaypoints([...waypoints, newWaypoint]);
    }
  };

  const removeWaypoint = (id) => {
    setWaypoints(waypoints.filter(wp => wp.id !== id));
  };

  const generateRoute = async () => {
    if (!routeName.trim()) {
      Alert.alert('Ошибка', 'Введите название маршрута');
      return;
    }

    if (!startPoint || !endPoint) {
      Alert.alert('Ошибка', 'Выберите начальную и конечную точки');
      return;
    }

    setIsPlanning(true);

    try {
      
      const routePoints = [startPoint, ...waypoints, endPoint];

      
      const coordinates = routePoints.map(point => [point.longitude, point.latitude, 0]);

      
      const routeGeoJson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          },
          properties: {
            name: routeName,
            difficulty: difficulty,
            created: new Date().toISOString()
          }
        }]
      };

      
      const newRoute = {
        id: `planned_${Date.now()}`,
        name: routeName,
        geojson: routeGeoJson,
        difficulty: difficulty,
        waypoints: routePoints,
        createdAt: new Date(),
        type: 'planned',
        stats: {
          length_km: calculateRouteLength(routePoints),
          elevation_gain: 0, 
        }
      };

      
      addRoute(newRoute);

      Alert.alert('Успех', `Маршрут "${routeName}" создан!`);
      onRouteCreated && onRouteCreated(newRoute);

      
      resetForm();
      onClose();

    } catch (error) {
      console.error('Route planning error:', error);
      Alert.alert('Ошибка', 'Не удалось создать маршрут');
    } finally {
      setIsPlanning(false);
    }
  };

  const calculateRouteLength = (points) => {
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const distance = getDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
      totalDistance += distance;
    }
    return Math.round(totalDistance * 100) / 100; 
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const resetForm = () => {
    setRouteName('');
    setStartPoint(null);
    setEndPoint(null);
    setWaypoints([]);
    setDifficulty('1a');
    setUseCurrentLocation(true);
  };

  const setCurrentAsStart = () => {
    if (currentLocation) {
      setStartPoint({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        name: 'Текущее местоположение'
      });
    }
  };

  const setCurrentAsEnd = () => {
    if (currentLocation) {
      setEndPoint({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        name: 'Текущее местоположение'
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Планирование маршрута</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {}
            <View style={styles.section}>
              <Text style={styles.label}>Название маршрута</Text>
              <TextInput
                style={styles.input}
                value={routeName}
                onChangeText={setRouteName}
                placeholder="Введите название..."
                placeholderTextColor="#666"
              />
            </View>

            {}
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Использовать текущее местоположение</Text>
                <Switch
                  value={useCurrentLocation}
                  onValueChange={setUseCurrentLocation}
                />
              </View>
            </View>

            {}
            <View style={styles.section}>
              <Text style={styles.label}>Начальная точка</Text>
              {startPoint ? (
                <View style={styles.pointCard}>
                  <Text style={styles.pointText}>{startPoint.name}</Text>
                  <Text style={styles.coordsText}>
                    {startPoint.latitude.toFixed(6)}, {startPoint.longitude.toFixed(6)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setStartPoint(null)}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeText}>Удалить</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={setCurrentAsStart} style={styles.addBtn}>
                  <Text style={styles.addText}>+ Установить текущую позицию</Text>
                </TouchableOpacity>
              )}
            </View>

            {}
            <View style={styles.section}>
              <View style={styles.waypointHeader}>
                <Text style={styles.label}>Промежуточные точки</Text>
                <TouchableOpacity onPress={addWaypoint} style={styles.addWaypointBtn}>
                  <Text style={styles.addText}>+ Добавить</Text>
                </TouchableOpacity>
              </View>

              {waypoints.map((waypoint, index) => (
                <View key={waypoint.id} style={styles.pointCard}>
                  <Text style={styles.pointText}>Точка {index + 1}</Text>
                  <Text style={styles.coordsText}>
                    {waypoint.latitude.toFixed(6)}, {waypoint.longitude.toFixed(6)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeWaypoint(waypoint.id)}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeText}>Удалить</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {}
            <View style={styles.section}>
              <Text style={styles.label}>Конечная точка</Text>
              {endPoint ? (
                <View style={styles.pointCard}>
                  <Text style={styles.pointText}>{endPoint.name}</Text>
                  <Text style={styles.coordsText}>
                    {endPoint.latitude.toFixed(6)}, {endPoint.longitude.toFixed(6)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEndPoint(null)}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeText}>Удалить</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={setCurrentAsEnd} style={styles.addBtn}>
                  <Text style={styles.addText}>+ Установить текущую позицию</Text>
                </TouchableOpacity>
              )}
            </View>

            {}
            <View style={styles.section}>
              <Text style={styles.label}>Сложность маршрута</Text>
              <View style={styles.difficultyContainer}>
                {['1a', '1b', '2a', '2b', '3a', '3b'].map((diff) => (
                  <TouchableOpacity
                    key={diff}
                    onPress={() => setDifficulty(diff)}
                    style={[
                      styles.difficultyBtn,
                      difficulty === diff && styles.difficultyBtnActive
                    ]}
                  >
                    <Text style={[
                      styles.difficultyText,
                      difficulty === diff && styles.difficultyTextActive
                    ]}>
                      {diff.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.cancelBtn]}>
              <Text style={styles.cancelText}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={generateRoute}
              style={[styles.btn, styles.createBtn]}
              disabled={isPlanning}
            >
              <Text style={styles.createText}>
                {isPlanning ? 'Создание...' : 'Создать маршрут'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#0b0d2a',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a2145',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointCard: {
    backgroundColor: '#1a2145',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pointText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  coordsText: {
    color: '#93a4c8',
    fontSize: 12,
    marginBottom: 8,
  },
  removeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: '#5b6eff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  waypointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addWaypointBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  difficultyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  difficultyBtn: {
    backgroundColor: '#1a2145',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  difficultyBtnActive: {
    backgroundColor: '#5b6eff',
    borderColor: '#5b6eff',
  },
  difficultyText: {
    color: '#93a4c8',
    fontSize: 14,
    fontWeight: '700',
  },
  difficultyTextActive: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#1a2145',
  },
  cancelText: {
    color: '#93a4c8',
    fontSize: 16,
    fontWeight: '700',
  },
  createBtn: {
    backgroundColor: '#16a34a',
  },
  createText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});