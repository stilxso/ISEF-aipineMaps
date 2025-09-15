
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Alert,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import MapBoxMapView from '../components/MapBoxMapView';
import SosButton from '../components/SosButton';
import { getGoRoutes } from '../services/goUtils';
import { useRecorder } from '../contexts/RecorderContext';
import { useLocation } from '../contexts/LocationContext';
import { useRoutes } from '../contexts/RoutesContext';
import { usePeaks } from '../contexts/PeaksContext';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { weatherNotificationService } from '../services/weatherNotifications';
import offlineHikeBuffer from '../services/offlineHikeBuffer';

function haversine(a, b) {
  if (!a || !b) return 0;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function getFirstCoordinateFromFeature(feature) {
  if (!feature) return null;
  
  if (feature.type === 'FeatureCollection' && Array.isArray(feature.features) && feature.features.length) {
    return getFirstCoordinateFromFeature(feature.features[0]);
  }
  const geom = feature.geometry || feature;
  if (!geom || !geom.type) return null;
  if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
    return { lon: Number(geom.coordinates[0]), lat: Number(geom.coordinates[1]) };
  }
  if (geom.type === 'LineString' && Array.isArray(geom.coordinates) && geom.coordinates.length) {
    const c = geom.coordinates[0];
    return { lon: Number(c[0]), lat: Number(c[1]) };
  }
  if (geom.type === 'MultiLineString' && Array.isArray(geom.coordinates) && geom.coordinates.length && geom.coordinates[0].length) {
    const c = geom.coordinates[0][0];
    return { lon: Number(c[0]), lat: Number(c[1]) };
  }
  return null;
}



export default function GoScreen() { 




  const { recording, current, start, stop, save, discard } = useRecorder();
  const { currentLocation, speed, heading } = useLocation();
  const { } = useRoutes();
  const { peaks } = usePeaks();


  const [hikingMode, setHikingMode] = useState(false);
  const [routeId, setRouteId] = useState(null);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [viewingMode, setViewingMode] = useState(false);
  const [routeMode, setRouteMode] = useState(false);
  const [routeStartTime, setRouteStartTime] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(14);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showSafetyChecklist, setShowSafetyChecklist] = useState(false);
  const [safetyData, setSafetyData] = useState({
    weatherChecked: false,
    fitnessLevel: null,
    emergencyContacts: '',
    gearPrepared: false
  });
  const [controlTime, setControlTime] = useState(''); // ISO or HH:MM local
  const [offlineRoutes, setOfflineRoutes] = useState([]);
  const [currentHikeSession, setCurrentHikeSession] = useState(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ pendingUpdates: 0, isOnline: true });

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

    useEffect(() => {
      const loadOfflineData = async () => {
        const routes = await getGoRoutes();
        setOfflineRoutes(routes);
    };
    
    loadOfflineData();
  }, []);

  useEffect(() => {
    console.log("GoScreen: Peaks from context:", peaks);
    console.log("GoScreen: Selected trail:", selectedTrail);
    console.log("GoScreen: Markers array after useMemo:", allMarkers);
    if (peaks && peaks.length > 0) {
      console.log("GoScreen: Sample peak structure:", peaks[0]);
    }
  }, [peaks, selectedTrail, allMarkers]);

  // Periodic location updates during hiking
  useEffect(() => {
    let intervalId = null;

    if (hikingMode && currentHikeSession && currentLocation) {
      intervalId = setInterval(async () => {
        if (currentLocation && currentHikeSession) {
          const locationData = {
            location: [currentLocation.longitude, currentLocation.latitude],
            altitude: currentLocation.altitude,
            distancePassed: totalDistance,
            speed: speed,
            timestamp: new Date().toISOString()
          };

          const result = await offlineHikeBuffer.sendRealtimeUpdate(currentHikeSession._id, locationData);

          if (result.success) {
            setLastLocationUpdate(new Date());
            console.log('Location update sent successfully');
          } else if (result.offline) {
            console.log('Location update stored offline');
          }
        }
      }, 30000); 
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [hikingMode, currentHikeSession, currentLocation, totalDistance, speed]);

  
  useEffect(() => {
    return () => {
      weatherNotificationService.stopMonitoring();
    };
  }, []);

  
  useEffect(() => {
    const checkSyncStatus = async () => {
      const status = await offlineHikeBuffer.getPendingSyncCount();
      setSyncStatus({
        pendingUpdates: status.totalUpdates,
        isOnline: true 
      });
    };

    
    checkSyncStatus();
    const intervalId = setInterval(checkSyncStatus, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const liveRoute = useMemo(() => {
    if (!current?.points?.length) return null;
    const coordinates = current.points.map((p) => [Number(p.longitude), Number(p.latitude), p.altitude ?? null]);
    return {
      id: 'live',
      color: '#22c55e',
      width: 5,
      geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }] },
    };
  }, [current]);


  const selectedTrailRoute = useMemo(() => {
    if (!selectedTrail) return null;
    return {
      id: 'selected-trail',
      color: '#3b82f6',
      width: 4,
      geojson: { type: 'FeatureCollection', features: [selectedTrail] },
    };
  }, [selectedTrail]);


  const center = useMemo(() => {
    let c;
    if (routeMode && currentLocation) c = [Number(currentLocation.longitude), Number(currentLocation.latitude)];
    else if (current?.points?.length) {
      const last = current.points[current.points.length - 1];
      c = [Number(last.longitude), Number(last.latitude)];
    }
    else if (selectedTrail && viewingMode) {
      const fc = getFirstCoordinateFromFeature(selectedTrail);
      if (fc) c = [fc.lon, fc.lat];
    }
    else if (currentLocation) c = [Number(currentLocation.longitude), Number(currentLocation.latitude)];
    
    else c = [76.8512, 43.2389];
    return c;
  }, [current, currentLocation, selectedTrail, viewingMode, routeMode]);

  const totalDistance = useMemo(() => {
    const pts = current?.points || [];
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
    return d;
  }, [current]);

  const altitude = currentLocation?.altitude ? Math.round(currentLocation.altitude) : null;
  const kmh = speed ? Math.max(0, Math.round(speed * 3.6)) : 0;

  const peakMetrics = useMemo(() => {
    if (!hikingMode || !selectedMarker || !currentLocation) return null;
    const distanceToPeak = haversine(currentLocation, selectedMarker);
    const estimatedTime = kmh > 0 ? Math.round((distanceToPeak / kmh) * 60) : 0; 
    return {
      distanceToPeak: Math.round(distanceToPeak * 100) / 100,
      estimatedTime,
      peakName: selectedMarker.title || 'Peak',
    };
  }, [hikingMode, selectedMarker, currentLocation, kmh]);


  const trailProgress = useMemo(() => {
    if (!selectedTrail || !currentLocation || !hikingMode) return null;
    const trailCoords = selectedTrail.geometry.coordinates;
    let minDistance = Infinity;
    let closestIndex = 0;
    for (let i = 0; i < trailCoords.length; i++) {
      const coord = trailCoords[i];
      const distance = haversine({ latitude: coord[1], longitude: coord[0] }, currentLocation);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    const progressPercent = Math.round((closestIndex / Math.max(1, trailCoords.length - 1)) * 100);
    return {
      percent: progressPercent,
      distanceToTrail: Math.round(minDistance),
      nextPoint: closestIndex < trailCoords.length - 1 ? trailCoords[closestIndex + 1] : null,
    };
  }, [selectedTrail, currentLocation, hikingMode]);

  const elevationProfile = useMemo(() => {
    if (!selectedTrail) return null;
    const coords = selectedTrail.geometry.coordinates;
    const elevations = [];
    let totalDistance = 0;
    let previousCoord = null;

    coords.forEach((coord, index) => {
      const elevation = coord[2] || 0;
      if (previousCoord) {
        const distance = haversine({ latitude: previousCoord[1], longitude: previousCoord[0] }, { latitude: coord[1], longitude: coord[0] });
        totalDistance += distance;
      }
      elevations.push({
        distance: totalDistance,
        elevation: elevation,
        index: index
      });
      previousCoord = coord;
    });

    return {
      elevations,
      maxElevation: Math.max(...elevations.map(e => e.elevation)),
      minElevation: Math.min(...elevations.map(e => e.elevation)),
      totalDistance: totalDistance
    };
  }, [selectedTrail]);

  const personalizedRecommendations = useMemo(() => {
    const recs = [];
    if (hikingMode && currentLocation) {
      
      if (altitude > 2000) {
        recs.push("Высокогорье: следите за признаками горной болезни");
      }
      if (kmh < 2) {
        recs.push("Низкая скорость: возможно, стоит увеличить темп");
      }
      if (totalDistance > 10000) {
        recs.push("Длинный маршрут: не забудьте про перерывы на отдых");
      }
      
      const currentHour = new Date().getHours();
      if (currentHour > 18) {
        recs.push("Позднее время: планируйте возвращение до темноты");
      }
      
      if (trailProgress && trailProgress.percent > 80) {
        recs.push("Финиш близко: сохраняйте силы для последнего участка");
      }
    }
    return recs;
  }, [hikingMode, currentLocation, altitude, kmh, totalDistance, trailProgress]);

  const arrowMarker = useMemo(() => {
    if ((!hikingMode && !routeMode) || !currentLocation || heading == null) {
      console.log('DEBUG GoScreen: arrowMarker conditions not met:', {
        hikingMode,
        routeMode,
        hasCurrentLocation: !!currentLocation,
        hasHeading: heading != null,
        heading
      });
      return null;
    }
    const marker = {
      id: 'user-arrow',
      type: 'arrow',
      latitude: Number(currentLocation.latitude),
      longitude: Number(currentLocation.longitude),
      heading: Number(heading),
    };
    console.log('DEBUG GoScreen: Created arrowMarker:', marker);
    return marker;
  }, [hikingMode, routeMode, currentLocation, heading]);

  

  const selectedTrailStartMarker = useMemo(() => {
    if (!selectedTrail) return null;
    const coord = getFirstCoordinateFromFeature(selectedTrail);
    if (!coord) return null;
    return { id: 'trail-start', type: 'route-start', latitude: coord.lat, longitude: coord.lon };
  }, [selectedTrail]);

  const waypointMarkers = useMemo(() => {
    if (!waypoints.length) return [];
    return waypoints.map((wp, idx) => ({
      id: `waypoint-${wp.id}`,
      type: 'waypoint',
      latitude: wp.latitude,
      longitude: wp.longitude,
      title: wp.name || `Точка ${idx + 1}`,
    }));
  }, [waypoints]);

  const checkpointMarkers = useMemo(() => {
    if (!routeMode || !Array.isArray(checkpoints) || !checkpoints.length) {
      console.log('DEBUG GoScreen: checkpointMarkers conditions not met:', { routeMode, checkpointsLength: checkpoints?.length });
      return [];
    }
    const markers = checkpoints.map((c, idx) => ({
      id: `cp-${c.id}`,
      type: 'checkpoint',
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
      title: `КВ ${idx + 1}`,
      subtitle: new Date(c.timestamp).toLocaleTimeString(),
    }));
    console.log('DEBUG GoScreen: Created checkpointMarkers:', markers);
    return markers;
  }, [routeMode, checkpoints]);

  const peaksMarkers = useMemo(() => {
    if (!peaks || !peaks.length) {
      console.log('DEBUG GoScreen: peaksMarkers conditions not met:', { peaksLength: peaks?.length });
      return [];
    }
    const markers = peaks.map(peak => {
      if (!peak.latitude || !peak.longitude) {
        console.log('DEBUG GoScreen: Missing lat/lon for peak:', peak.id);
        return null;
      }
      return {
        id: `peak-${peak.id}`,
        name: peak.name,
        type: 'peak',
        latitude: Number(peak.latitude),
        longitude: Number(peak.longitude),
      };
    }).filter(m => m);
    console.log('DEBUG GoScreen: Created peaksMarkers:', markers);
    return markers;
  }, [peaks]);

  
const allMarkers = useMemo(() => {
  const markers = [
    ...(arrowMarker ? [arrowMarker] : []),
    ...(selectedTrailStartMarker ? [selectedTrailStartMarker] : []),
    ...(trailProgress?.nextPoint ? [{ id: 'next-point', type: 'waypoint', latitude: Number(trailProgress.nextPoint[1]), longitude: Number(trailProgress.nextPoint[0]) }] : []),
    ...(selectedMarker ? [selectedMarker] : []),
    ...(currentZoom >= 15 ? checkpointMarkers : []),
    ...waypointMarkers,
    ...peaksMarkers,
  ].filter(m => m);

    console.log('DEBUG GoScreen: Final markers array:', markers, 'Count:', markers.length);
    console.log('DEBUG GoScreen: Marker sources:', {
      arrowMarker: !!arrowMarker,
      selectedTrailStartMarker: !!selectedTrailStartMarker,
      trailProgressNextPoint: !!trailProgress?.nextPoint,
      selectedMarker: !!selectedMarker,
      checkpointMarkersCount: checkpointMarkers.length,
      peaksMarkersCount: peaksMarkers.length,
      currentZoom
    });

    return markers;
  }, [arrowMarker, selectedTrailStartMarker, trailProgress, selectedMarker, checkpointMarkers, waypointMarkers, peaksMarkers, currentZoom]);






  return (
    <View style={styles.container}>
      <MapBoxMapView
        routes={[
          ...(liveRoute ? [liveRoute] : []),
          ...(selectedTrailRoute ? [selectedTrailRoute] : []),
        ]}
        markers={allMarkers}
        centerCoordinate={center}
        zoomLevel={14}
        showUserLocation={!hikingMode && !routeMode}
        onRegionChange={(region) => { if (region?.zoomLevel) setCurrentZoom(region.zoomLevel); }}
        onMarkerPress={(marker) => {
          setSelectedMarker(marker);
        }}
      />

      {}
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 28, backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
        <Text style={{ color: '#fff', fontWeight: '800', marginBottom: 8 }}>Скачанные маршруты (GO)</Text>
        {offlineRoutes.length === 0 ? (
          <Text style={{ color: '#93a4c8' }}>Пока пусто. Добавьте из Trails.</Text>
        ) : (
          offlineRoutes.slice(0, 5).map(r => (
            <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{r.name || r.id}</Text>
              <Text style={{ color: r.offline ? '#10b981' : '#f59e0b', fontWeight: '800' }}>{r.offline ? 'Офлайн' : '—'}</Text>
            </View>
          ))
        )}

        {}
        {syncStatus.pendingUpdates > 0 && (
          <View style={{ marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
            <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '600' }}>
              ⏳ {syncStatus.pendingUpdates} обновлений ждут синхронизации
            </Text>
          </View>
        )}
      </View>


      <View style={styles.overlayTop}>
        <View style={styles.round}>
          <Text style={styles.bigText}>{kmh}</Text>
          <Text style={styles.sub}>km/h</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Altitude</Text>
            <Text style={styles.statValue}>{altitude || '--'}m</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{Math.round(totalDistance)}m</Text>
          </View>
          {hikingMode && peakMetrics && (
            <>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>To {peakMetrics.peakName}</Text>
                <Text style={styles.statValue}>{peakMetrics.distanceToPeak}km</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>ETA</Text>
                <Text style={styles.statValue}>{peakMetrics.estimatedTime}min</Text>
              </View>
            </>
          )}
        </View>
        {hikingMode && personalizedRecommendations.length > 0 && (
          <View style={styles.recommendations}>
            <Text style={styles.recTitle}>Рекомендации:</Text>
            {personalizedRecommendations.slice(0, 2).map((rec, idx) => (
              <Text key={idx} style={styles.recText}>• {rec}</Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.overlayBottom}>
        {}
        {!recording ? (
          <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={start}>
            <Text style={styles.btnText}>Запись</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={stop}>
            <Text style={styles.btnText}>Стоп</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={async () => { const r = await save(); if (r) Alert.alert('Сохранено', r.name || r.id); }} disabled={!current?.points?.length}>
          <Text style={styles.btnText}>Сохранить</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={discard}>
          <Text style={styles.btnText}>Сброс</Text>
        </TouchableOpacity>

        {}
        <TouchableOpacity style={[styles.btn, styles.btnRoute]} onPress={() => setRouteMode(v => !v)}>
          <Text style={styles.btnText}>{routeMode ? 'Маршрут: ВКЛ' : 'Маршрут: ВЫКЛ'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSelect]} onPress={() => setViewingMode(v => !v)}>
          <Text style={styles.btnText}>{viewingMode ? 'Обзор: ВКЛ' : 'Обзор: ВЫКЛ'}</Text>
        </TouchableOpacity>

        {}
        <TouchableOpacity
          style={[styles.btn, styles.btnCheckpoint]}
          onPress={() => {
            if (!currentLocation) {
              Alert.alert('Нет местоположения', 'Текущее местоположение недоступно');
              return;
            }
            const wp = {
              id: Date.now(),
              latitude: Number(currentLocation.latitude),
              longitude: Number(currentLocation.longitude),
              name: 'Точка',
            };
            setWaypoints(prev => [...prev, wp]);
          }}
        >
          <Text style={styles.btnText}>Точка+</Text>
        </TouchableOpacity>

        {}
        {selectedMarker && !hikingMode && (
          <TouchableOpacity
            style={styles.btnHike}
            onPress={() => setShowSafetyChecklist(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnHikeText}>🚶 HIKE</Text>
          </TouchableOpacity>
        )}

        {}
        {hikingMode && currentHikeSession && (
          <TouchableOpacity
            style={styles.btnFinish}
            onPress={async () => {
              Alert.alert(
                'Завершить поход',
                'Вы уверены, что хотите завершить поход?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Завершить',
                    onPress: async () => {
                      try {
                        const completionData = {
                          endTime: new Date().toISOString(),
                          endLocation: currentLocation ? {
                            latitude: currentLocation.latitude,
                            longitude: currentLocation.longitude,
                            altitude: currentLocation.altitude
                          } : null,
                          totalDistance: Math.round(totalDistance),
                          totalTime: Math.round((Date.now() - routeStartTime) / 1000)
                        };

                        const result = await offlineHikeBuffer.completeHike(currentHikeSession._id, completionData);

                        if (result.success) {
                          Alert.alert(
                            'Поход завершён!',
                            result.offline
                              ? 'Данные сохранены локально и будут синхронизированы при подключении к интернету.'
                              : 'Результаты сохранены на сервере.'
                          );

                          
                          setHikingMode(false);
                          setCurrentHikeSession(null);
                          setRouteStartTime(null);
                          setSelectedMarker(null);
                          setRouteId(null);

                          
                          weatherNotificationService.stopMonitoring();
                        } else {
                          Alert.alert('Ошибка', 'Не удалось завершить поход. Попробуйте ещё раз.');
                        }
                      } catch (error) {
                        console.error('Error finishing hike:', error);
                        Alert.alert('Ошибка', 'Произошла ошибка при завершении похода.');
                      }
                    }
                  }
                ]
              );
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.btnFinishText}>🏁 FINISH</Text>
          </TouchableOpacity>
        )}
      </View>

      {}
      {trailProgress && (
        <View style={[styles.recommendations, { bottom: 200 }]}> 
          <Text style={styles.recTitle}>Прогресс маршрута</Text>
          <Text style={styles.recText}>Завершено: {trailProgress.percent}%</Text>
          <Text style={styles.recText}>До трека: {trailProgress.distanceToTrail} м</Text>
        </View>
      )}

      {hikingMode && (
        <View style={styles.sosContainer}>
          <SosButton size="small" routeId={routeId} contacts={[]} />
        </View>
      )}




      {}
      <Modal visible={showSafetyChecklist} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Чек-лист безопасности</Text>

            <View style={styles.checklistItem}>
              <Text style={styles.checklistText}>Проверили погоду?</Text>
              <Switch
                value={safetyData.weatherChecked}
                onValueChange={(value) => setSafetyData(prev => ({ ...prev, weatherChecked: value }))}
              />
            </View>

            <View style={styles.checklistItem}>
              <Text style={styles.checklistText}>Уровень подготовки:</Text>
              <View style={styles.fitnessOptions}>
                {['beginner', 'intermediate', 'expert'].map(level => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.fitnessBtn, safetyData.fitnessLevel === level && styles.fitnessBtnActive]}
                    onPress={() => setSafetyData(prev => ({ ...prev, fitnessLevel: level }))}
                  >
                    <Text style={styles.fitnessText}>{level === 'beginner' ? 'Новичок' : level === 'intermediate' ? 'Средний' : 'Эксперт'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.checklistItem}>
              <Text style={styles.checklistText}>Экстренные контакты:</Text>
              <TextInput
                style={styles.contactsInput}
                placeholder="Телефон для экстренных случаев"
                value={safetyData.emergencyContacts}
                onChangeText={(text) => setSafetyData(prev => ({ ...prev, emergencyContacts: text }))}
              />
            </View>

            <View style={styles.checklistItem}>
              <Text style={styles.checklistText}>Снаряжение подготовлено?</Text>
              <Switch
                value={safetyData.gearPrepared}
                onValueChange={(value) => setSafetyData(prev => ({ ...prev, gearPrepared: value }))}
              />
            </View>

            <View style={styles.checklistItem}>
              <Text style={styles.checklistText}>Контрольное время возвращения (HH:MM)</Text>
              <TextInput
                style={styles.contactsInput}
                placeholder="Например, 18:30"
                value={controlTime}
                onChangeText={setControlTime}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowSafetyChecklist(false)}
              >
                <Text style={styles.cancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.startBtn, (!safetyData.weatherChecked || !safetyData.fitnessLevel || !safetyData.emergencyContacts || !safetyData.gearPrepared) && styles.startBtnDisabled]}
                onPress={async () => {
                  if (safetyData.weatherChecked && safetyData.fitnessLevel && safetyData.emergencyContacts && safetyData.gearPrepared) {
                    setShowSafetyChecklist(false);
                    setHikingMode(true);
                    setRouteId(selectedMarker ? selectedMarker.id : routeId);
                    setRouteStartTime(Date.now());

                    
                    console.log('DEBUG GoScreen: Starting weather monitoring service with location:', currentLocation);
                    weatherNotificationService.startMonitoring(currentLocation);

                    
                    try {
                      const hikeData = {
                        routeId: selectedMarker ? selectedMarker.id : routeId,
                        routeName: selectedMarker ? selectedMarker.title : 'Unknown Route',
                        startTime: new Date().toISOString(),
                        controlTime: (() => {
                          
                          try {
                            if (!controlTime || !/^[0-2]?\d:[0-5]\d$/.test(controlTime)) return null;
                            const [hh, mm] = controlTime.split(':').map(Number);
                            const now = new Date();
                            const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
                            return dt.toISOString();
                          } catch { return null; }
                        })(),
                        startLocation: currentLocation ? {
                          latitude: currentLocation.latitude,
                          longitude: currentLocation.longitude,
                          altitude: currentLocation.altitude
                        } : null,
                        weather: null, 
                        userId: null 
                      };

                      console.log('DEBUG GoScreen: Sending hike data to server:', {
                        url: `${API_BASE_URL}/api/hike/start`,
                        hikeData
                      });

                      const response = await axios.post(`${API_BASE_URL}/api/hike/start`, hikeData);
                      console.log('DEBUG GoScreen: Hike session started successfully:', response.data);

                      
                      if (response.data.success && response.data.hikeSession) {
                        setCurrentHikeSession(response.data.hikeSession);
                      }
                    } catch (error) {
                      console.warn('DEBUG GoScreen: Failed to send hike data to server:', {
                        message: error.message,
                        code: error.code,
                        response: error.response?.data,
                        url: `${API_BASE_URL}/api/hike/start`
                      });

                      
                      let errorMessage = 'Unable to connect to server. Hike will continue offline.';
                      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                        errorMessage = 'Server is not available. Please check your connection.';
                      } else if (error.response) {
                        errorMessage = `Server error: ${error.response.status}`;
                      }

                      
                      Alert.alert(
                        'Connection Issue',
                        errorMessage,
                        [{ text: 'OK' }]
                      );
                    }
                  }
                }}
              >
                <Text style={styles.startText}>Начать поход</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d2a' },
  overlayTop: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row' },
  round: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(91,110,255,0.95)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  bigText: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 30 },
  sub: { color: '#e5e7eb', fontSize: 12, marginTop: 2 },
  stats: { flex: 1, backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  stat: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { color: '#93a4c8' },
  statValue: { color: '#fff', fontWeight: '800' },

  routeStats: { flexDirection: 'row', justifyContent: 'space-between' },
  routeStat: { flex: 1, height: 70, marginHorizontal: 6, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.95)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' },
  routeStatValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
  routeStatLabel: { color: '#e5e7eb', fontSize: 11, marginTop: 4, textAlign: 'center' },

  hikingStats: { flexDirection: 'row', justifyContent: 'space-between' },
  hikingStat: { width: 90, height: 90, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.95)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' },
  hikingStatValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
  hikingStatLabel: { color: '#e5e7eb', fontSize: 11, marginTop: 4 },

  overlayBottom: { position: 'absolute', bottom: 120, left: 16, right: 16, flexDirection: 'row', justifyContent: 'center', zIndex: 1500 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 6 },
  btnText: { color: '#fff', fontWeight: '800' },
  btnStart: { backgroundColor: '#5b6eff' },
  btnStop: { backgroundColor: '#ef4444' },
  btnSave: { backgroundColor: '#16a34a' },
  btnGhost: { backgroundColor: '#1a2145', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  btnHiking: { backgroundColor: '#22c55e' },
  btnHike: {
    backgroundColor: '#22c55e',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnHikeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  btnFinish: {
    backgroundColor: '#10b981',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFinishText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  btnSelect: { backgroundColor: '#3b82f6' },
  btnLoad: { backgroundColor: '#f59e0b' },
  btnRoute: { backgroundColor: '#8b5cf6' },
  btnCheckpoint: { backgroundColor: '#f59e0b' },
  btnExport: { backgroundColor: '#06b6d4' },

  sosContainer: { position: 'absolute', bottom: 110, right: 20, zIndex: 1000 },

  controlTimePanel: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  controlTimeBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 4 },
  controlTimeBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  recommendations: { position: 'absolute', bottom: 120, left: 16, right: 16, backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  recTitle: { color: '#fff', fontWeight: '800', fontSize: 14, marginBottom: 8 },
  recText: { color: '#93a4c8', fontSize: 12, marginBottom: 4 },
  checklistItem: { backgroundColor: '#1a2145', padding: 12, borderRadius: 8, marginBottom: 12 },
  checklistText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  fitnessOptions: { flexDirection: 'row', justifyContent: 'space-around' },
  fitnessBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#374151' },
  fitnessBtnActive: { backgroundColor: '#22c55e' },
  fitnessText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  contactsInput: { backgroundColor: '#374151', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 14 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: { backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, flex: 1, marginRight: 10, alignItems: 'center' },
  cancelText: { color: '#fff', fontWeight: '700' },
  startBtn: { backgroundColor: '#22c55e', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, flex: 1, marginLeft: 10, alignItems: 'center' },
  startBtnDisabled: { backgroundColor: '#6b7280' },
  startText: { color: '#fff', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#0b0d2a', borderRadius: 12, padding: 20, width: '90%', maxHeight: '70%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  trailItem: { backgroundColor: '#1a2145', padding: 12, borderRadius: 8, marginBottom: 8 },
  trailName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  trailDetails: { color: '#93a4c8', fontSize: 12, marginTop: 4 },
  emptyText: { color: '#93a4c8', textAlign: 'center', padding: 20 },
  closeBtn: { backgroundColor: '#ef4444', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: '#fff', fontWeight: '700' },

  trailInfo: { backgroundColor: 'rgba(11,13,42,0.92)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  trailInfoName: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  trailStats: { flexDirection: 'row', justifyContent: 'space-around' },
  trailStat: { alignItems: 'center' },
  trailStatLabel: { color: '#93a4c8', fontSize: 12 },
  trailStatValue: { color: '#fff', fontSize: 16, fontWeight: '700' },

});
