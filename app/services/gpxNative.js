import RNFS from 'react-native-fs';
import axios from 'axios';
import { DOMParser } from 'xmldom';
import toGeoJSON from '@tmcw/togeojson';
import * as turf from '@turf/turf';
import { saveData, loadData } from './storage';
import { CONFIG } from '../config/env';

export async function downloadGpxToLocal(url, filename, onProgress) {
  const dir = `${RNFS.DocumentDirectoryPath}/gpx`;
  await RNFS.mkdir(dir).catch(() => {});
  const localPath = `${dir}/${filename}`;

  try {
    const dl = RNFS.downloadFile({
      fromUrl: url,
      toFile: localPath,
      progressDivider: 5,
      progress: res => {
        if (onProgress && res.contentLength > 0) {
          const percent = Math.round((res.bytesWritten / res.contentLength) * 100);
          onProgress(percent);
        }
      }
    });
    const result = await dl.promise;
    if (result.statusCode >= 200 && result.statusCode < 300) {
      return localPath;
    } else {
      throw new Error('HTTP status ' + result.statusCode);
    }
  } catch (e) {
    try {
      const resp = await axios.get(url, { responseType: 'text' });
      await RNFS.writeFile(localPath, resp.data, 'utf8');
      if (onProgress) onProgress(100);
      return localPath;
    } catch (err) {
      throw new Error('Не удалось скачать GPX: ' + (err.message || err));
    }
  }
}

export async function parseGpxFileAndSave(localPath, options = {}) {
  const defaults = { 
    avgSpeedKmh: CONFIG.DEFAULT_AVG_SPEED_KMH, 
    ascentMetersPerHour: CONFIG.DEFAULT_ASCENT_METERS_PER_HOUR 
  };
  const cfg = { ...defaults, ...options };

  let gpxString;
  try {
    gpxString = await RNFS.readFile(localPath, 'utf8');
  } catch (e) {
    throw new Error('Не удалось прочитать локальный GPX: ' + (e.message || e));
  }

  let geojson;
  try {
    const doc = new DOMParser().parseFromString(gpxString, 'text/xml');
    geojson = toGeoJSON.gpx(doc);
  } catch (e) {
    throw new Error('Ошибка парсинга GPX -> GeoJSON: ' + (e.message || e));
  }

  let stats = {};
  if (geojson && Array.isArray(geojson.features) && geojson.features.length > 0) {
    const f = geojson.features.find(fe => fe.geometry && fe.geometry.type === 'LineString') || geojson.features[0];
    if (f && f.geometry && f.geometry.coordinates) {
      const coords = f.geometry.coordinates;
      const lengthKm = turf.length(f, { units: 'kilometers' });
      
      let gain = 0;
      let prevEle = null;
      for (let i = 0; i < coords.length; i++) {
        const c = coords[i];
        const ele = (c && c.length >= 3 && !isNaN(c[2])) ? Number(c[2]) : null;
        if (ele !== null && prevEle !== null) {
          const d = ele - prevEle;
          if (d > 0) gain += d;
        }
        if (ele !== null) prevEle = ele;
      }

      const cumulative = [];
      let cumDist = 0;
      for (let i = 0; i < coords.length; i++) {
        const [lon, lat, eleRaw] = coords[i];
        const ele = (eleRaw !== undefined && !isNaN(eleRaw)) ? Number(eleRaw) : undefined;
        if (i > 0) {
          const prev = coords[i - 1];
          const from = turf.point([prev[0], prev[1]]);
          const to = turf.point([lon, lat]);
          const segKm = turf.distance(from, to, { units: 'kilometers' });
          cumDist += segKm;
        }
        const horizontalHours = cumDist / cfg.avgSpeedKmh;
        
        let localGain = 0;
        let prevE = null;
        for (let j = 0; j <= i; j++) {
          const er = coords[j][2];
          const eVal = (er !== undefined && !isNaN(er)) ? Number(er) : null;
          if (prevE !== null && eVal !== null) {
            const dd = eVal - prevE;
            if (dd > 0) localGain += dd;
          }
          if (eVal !== null) prevE = eVal;
        }
        const ascentHours = localGain / cfg.ascentMetersPerHour;
        const cumTimeMin = Math.round((horizontalHours + ascentHours) * 60);

        cumulative.push({
          lat,
          lon,
          elev: ele,
          cumDistKm: Number(cumDist.toFixed(4)),
          cumTimeMin
        });
      }

      const predictedHours = (lengthKm / cfg.avgSpeedKmh) + (gain / cfg.ascentMetersPerHour);

      stats = {
        length_km: Number(lengthKm.toFixed(3)),
        elevation_gain_m: Math.round(gain),
        predicted_time_h: Number(predictedHours.toFixed(2)),
        cumulative
      };

      if (!f.properties) f.properties = {};
      f.properties.computed = { 
        ...stats, 
        imported_at: new Date().toISOString(), 
        source: 'native-download', 
        sourcePath: localPath 
      };
    }
  }

  const id = 'route_' + Date.now();
  const name = (geojson.features && geojson.features[0] && (geojson.features[0].properties?.name || geojson.features[0].properties?.title)) || localPath.split('/').pop();
  const routeEntry = {
    id,
    name,
    localFile: localPath,
    geojson,
    stats
  };

  const existing = await loadData(CONFIG.STORAGE_KEYS.ROUTES) || [];
  existing.push(routeEntry);
  await saveData(CONFIG.STORAGE_KEYS.ROUTES, existing);

  return routeEntry;
}

export async function downloadParseAndSave(url, filename, onProgress, options) {
  const localPath = await downloadGpxToLocal(url, filename, onProgress);
  const entry = await parseGpxFileAndSave(localPath, options);
  return entry;
}