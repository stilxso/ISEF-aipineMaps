
import RNFS from 'react-native-fs';
import { CONFIG } from '../config/env';

const OFFLINE_MAPS_DIR = `${RNFS.DocumentDirectoryPath}/offline-maps`;


export async function createOfflineMapsDirectory() {
  try {
    const exists = await RNFS.exists(OFFLINE_MAPS_DIR);
    if (!exists) {
      await RNFS.mkdir(OFFLINE_MAPS_DIR);
    }
    return true;
  } catch (error) {
    console.warn('createOfflineMapsDirectory error', error);
    return false;
  }
}

export async function downloadMapTile(zoom, x, y, style = 'satellite') {
  try {
    if (!CONFIG.MAPBOX_DOWNLOADS_TOKEN) throw new Error('Missing MAPBOX_DOWNLOADS_TOKEN');

    const tileUrl = `https://api.mapbox.com/styles/v1/mapbox/${style}-v9/tiles/${zoom}/${x}/${y}@2x?access_token=${CONFIG.MAPBOX_DOWNLOADS_TOKEN}`;
    const localPath = `${OFFLINE_MAPS_DIR}/${style}/${zoom}/${x}/${y}.png`;
    const tileDir = localPath.substring(0, localPath.lastIndexOf('/'));

    const dirExists = await RNFS.exists(tileDir);
    if (!dirExists) await RNFS.mkdir(tileDir, { recursive: true });

    const res = await RNFS.downloadFile({
      fromUrl: tileUrl,
      toFile: localPath,
      background: false,
      discretionary: false,
    }).promise;

    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
      return localPath;
    } else {
      // cleanup failed file if created
      try { await RNFS.unlink(localPath); } catch (_) {}
      throw new Error(`Tile HTTP ${res.statusCode}`);
    }
  } catch (err) {
    console.warn('downloadMapTile error', err.message || err);
    return null;
  }
}

/**
 * тут вычисляем индексы тайлов для покрытия границ
 */
function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

function calculateBounds(centerLat, centerLng, radiusKm) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));
  return {
    north: centerLat + latDelta,
    south: centerLat - latDelta,
    east: centerLng + lngDelta,
    west: centerLng - lngDelta,
  };
}

function getTilesInBounds(bounds, zoom) {
  const tiles = [];
  const minTile = latLngToTile(bounds.south, bounds.west, zoom);
  const maxTile = latLngToTile(bounds.north, bounds.east, zoom);

  for (let x = minTile.x; x <= maxTile.x; x++) {
    for (let y = minTile.y; y <= maxTile.y; y++) {
      tiles.push({ zoom, x, y });
    }
  }
  return tiles;
}

/**
 * тут сохраняем метаданные региона и пути к тайлам
 */
async function saveRegionInfo(centerLat, centerLng, zoom, radiusKm, style, tilePaths) {
  try {
    const meta = {
      id: `region_${Date.now()}`,
      center: { lat: centerLat, lng: centerLng },
      zoom,
      radiusKm,
      style,
      tiles: tilePaths.length,
      downloadedAt: new Date().toISOString(),
      tilePaths,
    };

    const path = `${OFFLINE_MAPS_DIR}/regions.json`;
    let regions = [];
    try {
      const exists = await RNFS.exists(path);
      if (exists) {
        const raw = await RNFS.readFile(path);
        regions = JSON.parse(raw);
      }
    } catch (e) {
      regions = [];
    }

    regions.push(meta);
    await RNFS.writeFile(path, JSON.stringify(regions, null, 2), 'utf8');
    return meta;
  } catch (err) {
    console.warn('saveRegionInfo error', err);
    return null;
  }
}

/**
 * публичная функция: скачиваем регион, возвращаем детали прогресса
 */
export async function downloadMapRegion(centerLat, centerLng, zoom, radiusKm = 5, style = 'satellite', onProgress = () => {}) {
  try {
    await createOfflineMapsDirectory();
    const bounds = calculateBounds(centerLat, centerLng, radiusKm);
    const tiles = getTilesInBounds(bounds, zoom);

    if (!tiles.length) {
      return { success: true, downloaded: 0, errors: 0, total: 0 };
    }

    const tilePaths = [];
    let successCount = 0;
    let errorCount = 0;

    const batchSize = 8;
    for (let i = 0; i < tiles.length; i += batchSize) {
      const batch = tiles.slice(i, i + batchSize);
      await Promise.all(batch.map(async (t) => {
        const p = await downloadMapTile(t.zoom, t.x, t.y, style);
        if (p) { tilePaths.push(p); successCount++; } else { errorCount++; }
      }));
      const progress = Math.round(((i + batch.length) / tiles.length) * 100);
      onProgress({ progress, successCount, errorCount, total: tiles.length });
    }

    const region = await saveRegionInfo(centerLat, centerLng, zoom, radiusKm, style, tilePaths);

    return { success: true, downloaded: successCount, errors: errorCount, total: tiles.length, region };
  } catch (err) {
    console.error('downloadMapRegion error', err);
    return { success: false, error: err.message || String(err) };
  }
}

export async function getDownloadedRegions() {
  try {
    const path = `${OFFLINE_MAPS_DIR}/regions.json`;
    const exists = await RNFS.exists(path);
    if (!exists) return [];
    const raw = await RNFS.readFile(path, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

export async function deleteRegion(regionId) {
  try {
    const regions = await getDownloadedRegions();
    const region = regions.find(r => r.id === regionId);
    if (!region) return false;

    for (const tilePath of region.tilePaths) {
      try { await RNFS.unlink(tilePath); } catch (_) {}
    }

    const updated = regions.filter(r => r.id !== regionId);
    await RNFS.writeFile(`${OFFLINE_MAPS_DIR}/regions.json`, JSON.stringify(updated, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.warn('deleteRegion error', e);
    return false;
  }
}

export async function getOfflineTilePath(zoom, x, y, style = 'satellite') {
  try {
    const localPath = `${OFFLINE_MAPS_DIR}/${style}/${zoom}/${x}/${y}.png`;
    const exists = await RNFS.exists(localPath);
    return exists ? localPath : null;
  } catch (e) {
    return null;
  }
}

export async function clearAllOfflineMaps() {
  try {
    const exists = await RNFS.exists(OFFLINE_MAPS_DIR);
    if (exists) await RNFS.unlink(OFFLINE_MAPS_DIR);
    await createOfflineMapsDirectory();
    return true;
  } catch (e) {
    console.warn('clearAllOfflineMaps error', e);
    return false;
  }
}
