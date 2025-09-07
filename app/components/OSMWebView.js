import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const OSMWebView = memo(({
  routes = [],
  markers = [],
  centerCoordinate,
  zoom = 14,
  tileTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  style = { flex: 1 },
  onMarkerPress,
  userLocation = null,
  followUser = true,
  showUserDot = true,
}) => {
  const html = useMemo(() => {
    // базовый центр (props в формате [lon, lat] или объект)
    const baseCenter = centerCoordinate
      ? [centerCoordinate[1] || centerCoordinate.latitude, centerCoordinate[0] || centerCoordinate.longitude]
      : [43.25, 76.95];

    // если есть локация пользователя и следование включено, центрируем на пользователе
    const user = userLocation
      ? {
          lat: userLocation[1] || userLocation.latitude,
          lon: userLocation[0] || userLocation.longitude,
          accuracy: userLocation.accuracy ?? 20,
          heading: userLocation.heading ?? 0,
        }
      : null;

    const initialCenter = (followUser && user)
      ? [user.lat, user.lon]
      : baseCenter;

    const lines = routes
      .map((r, i) => {
        const f = r?.geojson?.features?.[0];
        if (!f || f.geometry?.type !== 'LineString') return null;
        const coords = f.geometry.coordinates.map(c => [c[1], c[0]]);
        return { id: r.id || `r${i}`, coords, color: r.color || '#ef4444', width: r.width || 3 };
      })
      .filter(Boolean);

    const points = markers
      .map((m, i) => ({
        id: m.id || `m${i}`,
        title: m.title || '',
        coord: [m.latitude ?? m[1], m.longitude ?? m[0]]
      }))
      .filter(p => Array.isArray(p.coord) && p.coord.length === 2 && Number.isFinite(p.coord[0]) && Number.isFinite(p.coord[1]));

    const htmlString = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body, #map {
      height: 100%;
      margin: 0;
      padding: 0;
      background: #0b0d2a;
      font-family: 'Arial', sans-serif;
    }

    /* Темная тема для Leaflet контролов */
    .leaflet-control-container .leaflet-routing-container-hide {
      display: none;
    }

    .leaflet-control {
      background: rgba(11, 13, 42, 0.9) !important;
      border: 1px solid rgba(91, 110, 255, 0.3) !important;
      border-radius: 8px !important;
    }

    .leaflet-control a {
      background: #5b6eff !important;
      color: #fff !important;
      border: none !important;
      border-radius: 4px !important;
    }

    .leaflet-control a:hover {
      background: #4a5fd9 !important;
    }

    .leaflet-control-attribution {
      display: none !important;
    }

    /* Стиль для пользовательской локации */
    .user-location-marker {
      width: 24px !important;
      height: 24px !important;
      border-radius: 50% !important;
      background: #5b6eff !important;
      border: 3px solid #fff !important;
      box-shadow: 0 0 0 8px rgba(91, 110, 255, 0.3) !important;
      animation: userPulse 2s infinite !important;
    }

    @keyframes userPulse {
      0% { box-shadow: 0 0 0 0 rgba(91, 110, 255, 0.4); }
      70% { box-shadow: 0 0 0 16px rgba(91, 110, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(91, 110, 255, 0); }
    }

    /* Стиль для маркеров пиков */
    .peak-marker {
      width: 20px !important;
      height: 20px !important;
      border-radius: 50% !important;
      background: #ef4444 !important;
      border: 2px solid #fff !important;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.6) !important;
    }

    /* Темный popup */
    .leaflet-popup-content-wrapper {
      background: rgba(11, 13, 42, 0.95) !important;
      color: #fff !important;
      border: 1px solid rgba(91, 110, 255, 0.3) !important;
      border-radius: 8px !important;
    }

    .leaflet-popup-tip {
      background: rgba(11, 13, 42, 0.95) !important;
    }

    .leaflet-popup-content {
      margin: 8px !important;
      font-size: 14px !important;
    }

    /* Темная тема для маршрутов */
    .leaflet-interactive {
      stroke-opacity: 0.8 !important;
    }

    /* Индикатор высоты и скорости */
    .info-panel {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(11, 13, 42, 0.9);
      padding: 12px;
      border-radius: 8px;
      border: 1px solid rgba(91, 110, 255, 0.3);
      color: #fff;
      font-size: 12px;
      z-index: 1000;
      min-width: 120px;
    }

    .info-item {
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }

    .info-label {
      opacity: 0.8;
    }

    .info-value {
      font-weight: bold;
      color: #5b6eff;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="info-panel" class="info-panel" style="display: none;">
    <div class="info-item">
      <span class="info-label">Высота:</span>
      <span class="info-value" id="altitude">--</span>
    </div>
    <div class="info-item">
      <span class="info-label">Скорость:</span>
      <span class="info-value" id="speed">--</span>
    </div>
    <div class="info-item">
      <span class="info-label">Точность:</span>
      <span class="info-value" id="accuracy">--</span>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const center = ${JSON.stringify(initialCenter)};
    const lines = ${JSON.stringify(lines)};
    const markers = ${JSON.stringify(points)};
    const user = ${JSON.stringify(user)};
    const followUser = ${JSON.stringify(!!followUser)};
    const showUserDot = ${JSON.stringify(!!showUserDot)};

    // Создаем темную карту
    const map = L.map('map', {
      zoomControl: true,
      zoomControlOptions: { position: 'topright' },
      attributionControl: false
    }).setView(center, ${JSON.stringify(zoom)});

    // Темный тайл слой (OpenStreetMap - бесплатный)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Добавляем масштаб
    L.control.scale({
      position: 'bottomleft',
      metric: true,
      imperial: false,
      maxWidth: 100
    }).addTo(map);

    let userMarker = null;
    let userCircle = null;

    // Функция для обновления пользовательской локации
    function updateUserLocation(newUser) {
      if (!newUser || !Number.isFinite(newUser.lat) || !Number.isFinite(newUser.lon)) return;

      // Удаляем старую метку и круг
      if (userMarker) map.removeLayer(userMarker);
      if (userCircle) map.removeLayer(userCircle);

      // Создаем новую метку пользователя
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      userMarker = L.marker([newUser.lat, newUser.lon], {
        icon: userIcon,
        interactive: false
      }).addTo(map);

      // Добавляем круг точности
      if (Number.isFinite(newUser.accuracy) && newUser.accuracy > 0) {
        userCircle = L.circle([newUser.lat, newUser.lon], {
          radius: Math.min(Math.max(newUser.accuracy, 5), 200),
          color: '#5b6eff',
          weight: 2,
          opacity: 0.6,
          fillColor: '#5b6eff',
          fillOpacity: 0.1
        }).addTo(map);
      }

      // Обновляем информационную панель
      updateInfoPanel(newUser);

      // Центрируем карту если нужно
      if (followUser) {
        map.setView([newUser.lat, newUser.lon], map.getZoom());
      }
    }

    // Функция для обновления информационной панели
    function updateInfoPanel(userData) {
      const panel = document.getElementById('info-panel');
      if (!userData) {
        panel.style.display = 'none';
        return;
      }

      panel.style.display = 'block';

      const altitudeEl = document.getElementById('altitude');
      const speedEl = document.getElementById('speed');
      const accuracyEl = document.getElementById('accuracy');

      altitudeEl.textContent = userData.altitude ? Math.round(userData.altitude) + 'м' : '--';
      speedEl.textContent = userData.speed ? Math.round(userData.speed * 3.6) + 'км/ч' : '--';
      accuracyEl.textContent = userData.accuracy ? Math.round(userData.accuracy) + 'м' : '--';
    }

    // Добавляем маршруты
    lines.forEach(r => {
      L.polyline(r.coords, {
        color: r.color,
        weight: r.width,
        lineJoin: 'round',
        lineCap: 'round',
        opacity: 0.8
      }).addTo(map);
    });

    // Добавляем маркеры пиков
    markers.forEach(m => {
      const peakIcon = L.divIcon({
        className: 'peak-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker(m.coord, { icon: peakIcon }).addTo(map);

      if (m.title) {
        marker.bindPopup('<b>' + m.title + '</b><br>Нажмите для скачивания маршрута', {
          closeButton: false,
          className: 'dark-popup'
        });
      }

      marker.on('click', () => {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'marker',
            id: m.id
          }));
        }
      });
    });

    // Инициализируем пользовательскую локацию
    if (showUserDot && user) {
      updateUserLocation(user);
    }

    // Подстраиваем границы если не следим за пользователем
    const boundsPoints = [
      ...lines.flatMap(r => r.coords),
      ...markers.map(m => m.coord)
    ];

    if (!followUser && boundsPoints.length > 0) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [20, 20] });
    }

    // Обработка сообщений от React Native
    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'updateLocation' && data.location) {
          updateUserLocation(data.location);
        }
      } catch (e) {
        console.warn('Ошибка обработки сообщения:', e);
      }
    });
  </script>
</body>
</html>`;

    return htmlString;
  }, [routes, markers, centerCoordinate, zoom, userLocation, followUser, showUserDot]);

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={[styles.web, style]}
      onMessage={e => {
        try {
          const msg = JSON.parse(e.nativeEvent.data || '{}');
          if (msg?.type === 'marker' && onMarkerPress) onMarkerPress(msg.id);
        } catch {}
      }}
    />
  );
});

const styles = StyleSheet.create({ web: { flex: 1 } });

export default OSMWebView;