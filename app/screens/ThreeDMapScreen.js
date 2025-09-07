import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocation } from '../contexts/LocationContext';

export default function ThreeDMapScreen() {
  const { currentLocation, isLocationAvailable } = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const center = useMemo(() => {
    if (isLocationAvailable && currentLocation) {
      return [currentLocation.longitude, currentLocation.latitude];
    }
    return [76.95, 43.25]; // Алматы по умолчанию
  }, [currentLocation, isLocationAvailable]);

  const html = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.css" rel="stylesheet">
  <style>
    html, body, #map {
      height: 100%;
      margin: 0;
      padding: 0;
      background: #0b0d2a;
      font-family: 'Arial', sans-serif;
    }

    .maplibregl-ctrl {
      background: rgba(11, 13, 42, 0.9);
      border-radius: 8px;
      border: 1px solid rgba(91, 110, 255, 0.3);
    }

    .maplibregl-ctrl button {
      background: #5b6eff;
      color: #fff;
      border: none;
      border-radius: 4px;
      margin: 2px;
    }

    .maplibregl-ctrl button:hover {
      background: #4a5fd9;
    }

    .maplibregl-ctrl-attrib {
      display: none;
    }

    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #5b6eff;
      font-size: 16px;
      z-index: 1000;
    }

    .user-location {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #5b6eff;
      border: 3px solid #fff;
      box-shadow: 0 0 0 4px rgba(91, 110, 255, 0.3);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(91, 110, 255, 0.4); }
      70% { box-shadow: 0 0 0 12px rgba(91, 110, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(91, 110, 255, 0); }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="loading" class="loading">Загрузка 3D карты...</div>

  <script src="https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.js"></script>
  <script>
    const center = ${JSON.stringify(center)};
    let map;
    let userMarker;

    function initMap() {
      try {
        // Используем темный стиль карты
        const style = {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [{
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }]
        };

        map = new maplibregl.Map({
          container: 'map',
          style: style,
          center: center,
          zoom: 13,
          pitch: 60,
          bearing: 20,
          antialias: true,
          maxZoom: 18,
          minZoom: 3
        });

        // Добавляем контролы
        map.addControl(new maplibregl.NavigationControl({
          visualizePitch: true,
          showCompass: true,
          showZoom: true
        }), 'top-right');

        map.addControl(new maplibregl.ScaleControl({
          maxWidth: 100,
          unit: 'metric'
        }), 'bottom-left');

        // Скрываем загрузку
        document.getElementById('loading').style.display = 'none';

        // Добавляем пользовательскую локацию
        addUserLocation();

        // Сообщаем React Native что карта готова
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapReady'
          }));
        }

      } catch (error) {
        console.error('Ошибка инициализации карты:', error);
        document.getElementById('loading').innerHTML = 'Ошибка загрузки карты';
      }
    }

    function addUserLocation() {
      if (!map) return;

      // Удаляем старую метку если есть
      if (userMarker) {
        userMarker.remove();
      }

      // Создаем иконку для пользователя
      const userIcon = document.createElement('div');
      userIcon.className = 'user-location';

      userMarker = new maplibregl.Marker({
        element: userIcon,
        anchor: 'center'
      })
      .setLngLat(center)
      .addTo(map);

      // Центрируем карту на пользователе
      map.flyTo({
        center: center,
        zoom: 15,
        pitch: 60,
        bearing: 20,
        duration: 2000
      });
    }

    // Инициализируем карту при загрузке
    initMap();

    // Обработка сообщений от React Native
    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'updateLocation' && data.location) {
          const newCenter = [data.location.longitude, data.location.latitude];
          if (userMarker) {
            userMarker.setLngLat(newCenter);
          }
          map.setCenter(newCenter);
        }
      } catch (e) {
        console.warn('Ошибка обработки сообщения:', e);
      }
    });
  </script>
</body>
</html>`;
  }, [center]);

  useEffect(() => {
    if (currentLocation && mapReady) {
      // Отправляем обновление локации в WebView
      const message = {
        type: 'updateLocation',
        location: currentLocation
      };

      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify(message));
      }
    }
  }, [currentLocation, mapReady]);

  const webViewRef = React.useRef(null);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapReady') {
        setMapReady(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.warn('Ошибка обработки сообщения от WebView:', error);
    }
  };

  const handleError = () => {
    setIsLoading(false);
    Alert.alert(
      'Ошибка',
      'Не удалось загрузить 3D карту. Проверьте подключение к интернету.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Загрузка 3D карты...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        onError={handleError}
        onLoadEnd={() => setIsLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        mixedContentMode="always"
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
      />

      {/* Кнопки управления */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                if (map) {
                  map.setPitch(map.getPitch() + 10);
                }
              `);
            }
          }}
        >
          <Text style={styles.controlText}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                if (map) {
                  map.setPitch(Math.max(0, map.getPitch() - 10));
                }
              `);
            }
          }}
        >
          <Text style={styles.controlText}>-</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0d2a',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 13, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#5b6eff',
    fontSize: 18,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    gap: 8,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(91, 110, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5b6eff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  controlText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});