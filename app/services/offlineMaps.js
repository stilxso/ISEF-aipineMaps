import RNFS from 'react-native-fs';
import { CONFIG } from '../config/env';

// Папка для хранения оффлайн карт
const OFFLINE_MAPS_DIR = `${RNFS.DocumentDirectoryPath}/offline-maps`;

// Создаем директорию для оффлайн карт
export async function createOfflineMapsDirectory() {
  try {
    const exists = await RNFS.exists(OFFLINE_MAPS_DIR);
    if (!exists) {
      await RNFS.mkdir(OFFLINE_MAPS_DIR);
    }
    return true;
  } catch (error) {
    console.warn('Ошибка создания директории оффлайн карт:', error);
    return false;
  }
}

// Скачиваем карту для оффлайн использования
export async function downloadMapTile(zoom, x, y, style = 'satellite') {
  try {
    // Формируем URL для тайла MapBox
    const tileUrl = `https://api.mapbox.com/styles/v1/mapbox/${style}-v9/tiles/${zoom}/${x}/${y}@2x?access_token=${CONFIG.MAPBOX_ACCESS_TOKEN}`;

    // Локальный путь для сохранения тайла
    const localPath = `${OFFLINE_MAPS_DIR}/${style}/${zoom}/${x}/${y}.png`;

    // Создаем директорию для тайла
    const tileDir = localPath.substring(0, localPath.lastIndexOf('/'));
    await RNFS.mkdir(tileDir, { recursive: true });

    // Скачиваем тайл
    const result = await RNFS.downloadFile({
      fromUrl: tileUrl,
      toFile: localPath,
      background: true,
      discretionary: true,
    }).promise;

    if (result.statusCode === 200) {
      return localPath;
    } else {
      throw new Error(`HTTP ${result.statusCode}`);
    }
  } catch (error) {
    console.warn('Ошибка скачивания тайла:', error);
    return null;
  }
}

// Скачиваем регион карты для оффлайн использования
export async function downloadMapRegion(centerLat, centerLng, zoom, radiusKm = 10, style = 'satellite') {
  try {
    console.log(`Начинаем скачивание региона: ${centerLat}, ${centerLng}, радиус ${radiusKm}км`);

    // Вычисляем границы региона
    const bounds = calculateBounds(centerLat, centerLng, radiusKm);

    // Получаем все тайлы в регионе
    const tiles = getTilesInBounds(bounds, zoom);

    console.log(`Будет скачано ${tiles.length} тайлов`);

    const downloadedTiles = [];
    let successCount = 0;
    let errorCount = 0;

    // Скачиваем тайлы параллельно (не более 10 одновременно)
    const batchSize = 10;
    for (let i = 0; i < tiles.length; i += batchSize) {
      const batch = tiles.slice(i, i + batchSize);
      const promises = batch.map(async (tile) => {
        const result = await downloadMapTile(tile.zoom, tile.x, tile.y, style);
        if (result) {
          successCount++;
          downloadedTiles.push(result);
        } else {
          errorCount++;
        }
      });

      await Promise.all(promises);

      // Обновляем прогресс
      const progress = Math.round(((i + batch.length) / tiles.length) * 100);
      console.log(`Прогресс: ${progress}% (${successCount} успешно, ${errorCount} ошибок)`);
    }

    console.log(`Скачивание завершено: ${successCount} успешно, ${errorCount} ошибок`);

    // Сохраняем информацию о регионе
    await saveRegionInfo(centerLat, centerLng, zoom, radiusKm, style, downloadedTiles);

    return {
      success: true,
      downloaded: successCount,
      errors: errorCount,
      total: tiles.length
    };

  } catch (error) {
    console.error('Ошибка скачивания региона:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Вычисляем границы региона по центру и радиусу
function calculateBounds(centerLat, centerLng, radiusKm) {
  const latDelta = radiusKm / 111; // 1 градус ≈ 111 км
  const lngDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));

  return {
    north: centerLat + latDelta,
    south: centerLat - latDelta,
    east: centerLng + lngDelta,
    west: centerLng - lngDelta
  };
}

// Получаем все тайлы в заданных границах
function getTilesInBounds(bounds, zoom) {
  const tiles = [];

  // Конвертируем координаты в тайловые индексы
  const minTile = latLngToTile(bounds.south, bounds.west, zoom);
  const maxTile = latLngToTile(bounds.north, bounds.east, zoom);

  for (let x = minTile.x; x <= maxTile.x; x++) {
    for (let y = minTile.y; y <= maxTile.y; y++) {
      tiles.push({ zoom, x, y });
    }
  }

  return tiles;
}

// Конвертируем широту/долготу в тайловые координаты
function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);

  return { x, y };
}

// Сохраняем информацию о скачанном регионе
async function saveRegionInfo(centerLat, centerLng, zoom, radiusKm, style, tiles) {
  try {
    const regionInfo = {
      id: `region_${Date.now()}`,
      center: { lat: centerLat, lng: centerLng },
      zoom,
      radiusKm,
      style,
      tiles: tiles.length,
      downloadedAt: new Date().toISOString(),
      tilePaths: tiles
    };

    const regionsPath = `${OFFLINE_MAPS_DIR}/regions.json`;
    let regions = [];

    // Читаем существующие регионы
    try {
      const existingData = await RNFS.readFile(regionsPath);
      regions = JSON.parse(existingData);
    } catch (error) {
      // Файл не существует, создаем новый
    }

    // Добавляем новый регион
    regions.push(regionInfo);

    // Сохраняем обновленный список
    await RNFS.writeFile(regionsPath, JSON.stringify(regions, null, 2));

  } catch (error) {
    console.warn('Ошибка сохранения информации о регионе:', error);
  }
}

// Получаем список скачанных регионов
export async function getDownloadedRegions() {
  try {
    const regionsPath = `${OFFLINE_MAPS_DIR}/regions.json`;
    const data = await RNFS.readFile(regionsPath);
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Удаляем скачанный регион
export async function deleteRegion(regionId) {
  try {
    // Читаем список регионов
    const regions = await getDownloadedRegions();

    // Находим регион для удаления
    const region = regions.find(r => r.id === regionId);
    if (!region) {
      throw new Error('Регион не найден');
    }

    // Удаляем тайлы региона
    for (const tilePath of region.tilePaths) {
      try {
        await RNFS.unlink(tilePath);
      } catch (error) {
        console.warn('Ошибка удаления тайла:', tilePath, error);
      }
    }

    // Удаляем информацию о регионе
    const updatedRegions = regions.filter(r => r.id !== regionId);
    const regionsPath = `${OFFLINE_MAPS_DIR}/regions.json`;
    await RNFS.writeFile(regionsPath, JSON.stringify(updatedRegions, null, 2));

    return true;
  } catch (error) {
    console.error('Ошибка удаления региона:', error);
    return false;
  }
}

// Проверяем доступность оффлайн тайла
export async function getOfflineTilePath(zoom, x, y, style = 'satellite') {
  const localPath = `${OFFLINE_MAPS_DIR}/${style}/${zoom}/${x}/${y}.png`;

  try {
    const exists = await RNFS.exists(localPath);
    return exists ? localPath : null;
  } catch (error) {
    return null;
  }
}

// Получаем размер скачанных карт
export async function getOfflineMapsSize() {
  try {
    const regions = await getDownloadedRegions();
    let totalSize = 0;

    for (const region of regions) {
      for (const tilePath of region.tilePaths) {
        try {
          const stats = await RNFS.stat(tilePath);
          totalSize += stats.size;
        } catch (error) {
          // Тайл может быть удален
        }
      }
    }

    return totalSize;
  } catch (error) {
    return 0;
  }
}

// Очищаем все оффлайн карты
export async function clearAllOfflineMaps() {
  try {
    await RNFS.unlink(OFFLINE_MAPS_DIR);
    await createOfflineMapsDirectory();
    return true;
  } catch (error) {
    console.error('Ошибка очистки оффлайн карт:', error);
    return false;
  }
}