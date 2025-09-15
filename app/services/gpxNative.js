
import RNFS from 'react-native-fs';
import axios from 'axios';
import { DOMParser } from 'xmldom';
import toGeoJSON from '@tmcw/togeojson';
import * as turf from '@turf/turf';
import { saveData, loadData } from './storage';
import { CONFIG } from '../config/env';

if (!RNFS.DocumentDirectoryPath) {
  console.error('RNFS.DocumentDirectoryPath is null or undefined');
  throw new Error('DocumentDirectoryPath not available for GPX operations');
}

const GPX_DIRECTORY = 'gpx';
const DOWNLOAD_TIMEOUT = 30000;

export async function downloadGpxToLocal(url, filename, onProgress) {
  const directory = RNFS.DocumentDirectoryPath;
  console.log('DEBUG gpxNative: directory:', directory);
  const localPath = `${directory}/${filename}`;

  try {
    const download = RNFS.downloadFile({
      fromUrl: url,
      toFile: localPath,
      progressDivider: 5,
      progress: (res) => {
        if (onProgress && res.contentLength > 0) {
          const percent = Math.round((res.bytesWritten / res.contentLength) * 100);
          onProgress(percent);
        }
      }
    });
    const result = await download.promise;
    if (result.statusCode >= 200 && result.statusCode < 300) {
      return localPath;
    } else {
      throw new Error(`HTTP status ${result.statusCode}`);
    }
  } catch (err) {
    
    try {
      const response = await axios.get(url, { responseType: 'text', timeout: DOWNLOAD_TIMEOUT });
      await RNFS.writeFile(localPath, response.data, 'utf8');
      if (onProgress) onProgress(100);
      return localPath;
    } catch (e) {
      throw new Error(`Failed to download GPX: ${e.message || e}`);
    }
  }
}

export async function parseGpxFileAndSave(localPath, options = {}) {
  const defaults = {
    avgSpeedKmh: CONFIG.DEFAULT_AVG_SPEED_KMH || 3,
    ascentMetersPerHour: CONFIG.DEFAULT_ASCENT_METERS_PER_HOUR || 600,
  };
  const config = { ...defaults, ...options };

  let gpxContent;
  try {
    gpxContent = await RNFS.readFile(localPath, 'utf8');

    if (!gpxContent || gpxContent.trim().length === 0) {
      throw new Error('GPX file empty');
    }

    if (gpxContent.length > 20 * 1024 * 1024) {
      throw new Error('GPX file too large (>20MB)');
    }

    
    if (!gpxContent.startsWith('<?xml')) {
      gpxContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + gpxContent;
    }
    gpxContent = gpxContent.replace(/^\uFEFF/, '');

  } catch (error) {
    throw new Error(`Failed read GPX: ${error.message || error}`);
  }

  let geojson;
  try {
    const xmlDoc = new DOMParser().parseFromString(gpxContent, 'text/xml');
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError && parserError.length) {
      const txt = parserError[0].textContent || 'XML parse error';
      throw new Error(txt);
    }
    geojson = toGeoJSON.gpx(xmlDoc);
    if (!geojson || geojson.type !== 'FeatureCollection') {
      throw new Error('Converted GeoJSON is invalid');
    }
  } catch (error) {
    throw new Error(`GPX -> GeoJSON failed: ${error.message || error}`);
  }

  
  const features = Array.isArray(geojson.features) ? geojson.features : [];
  
  const lineFeature = features.find(f => f.geometry && f.geometry.type === 'LineString');
  const markers = [];

  if (lineFeature && Array.isArray(lineFeature.geometry.coordinates) && lineFeature.geometry.coordinates.length) {
    const coords = lineFeature.geometry.coordinates;
    
    const start = coords[0];
    if (start && start.length >= 2) {
      markers.push({
        id: `start_${Date.now()}`,
        type: 'route-start',
        latitude: Number(start[1]),
        longitude: Number(start[0]),
        title: 'Start',
      });
    }
    
    const end = coords[coords.length - 1];
    if (end && end.length >= 2) {
      markers.push({
        id: `end_${Date.now()}`,
        type: 'route-end',
        latitude: Number(end[1]),
        longitude: Number(end[0]),
        title: 'End',
      });
    }
  }

  
  features.forEach((f, idx) => {
    if (f.geometry && f.geometry.type === 'Point') {
      const c = f.geometry.coordinates;
      if (Array.isArray(c) && c.length >= 2) {
        markers.push({
          id: `wpt_${idx}_${Date.now()}`,
          type: 'waypoint',
          latitude: Number(c[1]),
          longitude: Number(c[0]),
          title: (f.properties && (f.properties.name || f.properties.desc)) || `WPT ${idx + 1}`,
        });
      }
    }
  });

  
  let stats = {};
  if (lineFeature) {
    try {
      const lengthKm = turf.length(lineFeature, { units: 'kilometers' });
      let elevationGain = 0;
      let prevElev = null;
      const coords = lineFeature.geometry.coordinates;
      for (let i = 0; i < coords.length; i++) {
        const elev = (coords[i] && coords[i].length >= 3 && !isNaN(coords[i][2])) ? Number(coords[i][2]) : null;
        if (elev !== null && prevElev !== null) {
          const diff = elev - prevElev;
          if (diff > 0) elevationGain += diff;
        }
        if (elev !== null) prevElev = elev;
      }

      
      let cumulativeDistance = 0;
      const cumulative = [];
      for (let i = 0; i < coords.length; i++) {
        const [lon, lat, elevRaw] = coords[i];
        const elev = (elevRaw !== undefined && !isNaN(elevRaw)) ? Number(elevRaw) : undefined;
        if (i > 0) {
          const prev = coords[i - 1];
          const seg = turf.distance(turf.point([prev[0], prev[1]]), turf.point([lon, lat]), { units: 'kilometers' });
          cumulativeDistance += seg;
        }
        const horizontalHours = cumulativeDistance / config.avgSpeedKmh;
        
        cumulative.push({
          lat: Number(lat),
          lon: Number(lon),
          elev,
          cumDistKm: Number(cumulativeDistance.toFixed(4)),
        });
      }

      const predictedHours = (lengthKm / config.avgSpeedKmh) + (elevationGain / config.ascentMetersPerHour);

      stats = {
        length_km: Number(lengthKm.toFixed(3)),
        elevation_gain_m: Math.round(elevationGain),
        predicted_time_h: Number(predictedHours.toFixed(2)),
        cumulative,
      };

      if (!lineFeature.properties) lineFeature.properties = {};
      lineFeature.properties.computed = {
        ...stats,
        imported_at: new Date().toISOString(),
        sourcePath: localPath,
      };
    } catch (err) {
      
      console.warn('Stats calculation failed', err);
    }
  }

  
  const routeId = `route_${Date.now()}`;
  const routeName = (features[0] && features[0].properties && (features[0].properties.name || features[0].properties.title)) || (localPath ? localPath.split('/').pop() : routeId);

  const routeEntry = {
    id: routeId,
    name: routeName,
    localFile: localPath,
    geojson,
    stats,
    markers, 
    addedAt: new Date().toISOString(),
  };

  
  try {
    const existingRoutes = await loadData(CONFIG.STORAGE_KEYS.ROUTES) || [];
    existingRoutes.push(routeEntry);
    await saveData(CONFIG.STORAGE_KEYS.ROUTES, existingRoutes);
  } catch (err) {
    console.warn('Failed to save route to storage', err);
  }

  return routeEntry;
}

export function generateGpxContent(routeData) {
  const { points, name = 'Generated Route', description = '' } = routeData;
  if (!points || !Array.isArray(points) || points.length === 0) {
    throw new Error('No points to generate GPX');
  }
  const now = new Date().toISOString();
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AiPine Maps" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${name}</name><desc>${description}</desc><time>${now}</time></metadata>
  <trk><name>${name}</name><trkseg>\n`;
  points.forEach((p) => {
    const t = p.timestamp ? new Date(p.timestamp).toISOString() : now;
    gpx += `    <trkpt lat="${p.latitude}" lon="${p.longitude}"><ele>${p.altitude || 0}</ele><time>${t}</time></trkpt>\n`;
  });
  gpx += `  </trkseg></trk>\n</gpx>`;
  return gpx;
}

export async function saveRouteAsGpx(routeData, filename = null) {
  const directory = RNFS.DocumentDirectoryPath;
  console.log('DEBUG gpxNative saveRouteAsGpx: directory:', directory);
  const fileName = filename || `route_${Date.now()}.gpx`;
  const localPath = `${directory}/${fileName}`;
  const gpxContent = generateGpxContent(routeData);
  await RNFS.writeFile(localPath, gpxContent, 'utf8');
  return localPath;
}

export async function downloadParseAndSave(url, filename, onProgress, options) {
  const localPath = await downloadGpxToLocal(url, filename, onProgress);
  return await parseGpxFileAndSave(localPath, options);
}
