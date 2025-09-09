import RNFS from 'react-native-fs';
import axios from 'axios';
import { DOMParser } from 'xmldom';
import toGeoJSON from '@tmcw/togeojson';
import * as turf from '@turf/turf';
import { saveData, loadData } from './storage';
import { CONFIG } from '../config/env';

// Constants
const GPX_DIRECTORY = 'gpx';
const DOWNLOAD_TIMEOUT = 30000;
const PROGRESS_DIVIDER = 5;

/**
 * Download GPX file to local storage
 * @param {string} url - URL of the GPX file
 * @param {string} filename - Name for the local file
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} Local file path
 * @throws {Error} If download fails
 */
export async function downloadGpxToLocal(url, filename, onProgress) {
  const directory = `${RNFS.DocumentDirectoryPath}/${GPX_DIRECTORY}`;
  await RNFS.mkdir(directory).catch(() => {});
  const localPath = `${directory}/${filename}`;

  try {
    // Try RNFS download first
    const download = RNFS.downloadFile({
      fromUrl: url,
      toFile: localPath,
      progressDivider: PROGRESS_DIVIDER,
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
  } catch (error) {
    // Fallback to axios
    try {
      const response = await axios.get(url, {
        responseType: 'text',
        timeout: DOWNLOAD_TIMEOUT
      });
      await RNFS.writeFile(localPath, response.data, 'utf8');
      if (onProgress) onProgress(100);
      return localPath;
    } catch (fallbackError) {
      throw new Error(`Failed to download GPX: ${fallbackError.message || fallbackError}`);
    }
  }
}

/**
 * Parse GPX file and save route data
 * @param {string} localPath - Path to local GPX file
 * @param {Object} options - Parsing options
 * @returns {Promise<Object>} Route entry with stats and geojson
 * @throws {Error} If parsing fails
 */
export async function parseGpxFileAndSave(localPath, options = {}) {
  const defaults = {
    avgSpeedKmh: CONFIG.DEFAULT_AVG_SPEED_KMH,
    ascentMetersPerHour: CONFIG.DEFAULT_ASCENT_METERS_PER_HOUR
  };
  const config = { ...defaults, ...options };

  let gpxContent;
  try {
    gpxContent = await RNFS.readFile(localPath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read local GPX file: ${error.message || error}`);
  }

  let geojson;
  try {
    const xmlDoc = new DOMParser().parseFromString(gpxContent, 'text/xml');
    geojson = toGeoJSON.gpx(xmlDoc);
  } catch (error) {
    throw new Error(`Error parsing GPX to GeoJSON: ${error.message || error}`);
  }

  let stats = {};
  if (geojson && Array.isArray(geojson.features) && geojson.features.length > 0) {
    // Find the main LineString feature
    const mainFeature = geojson.features.find(feature =>
      feature.geometry && feature.geometry.type === 'LineString'
    ) || geojson.features[0];

    if (mainFeature && mainFeature.geometry && mainFeature.geometry.coordinates) {
      const coordinates = mainFeature.geometry.coordinates;
      const lengthKm = turf.length(mainFeature, { units: 'kilometers' });

      // Calculate total elevation gain
      let elevationGain = 0;
      let previousElevation = null;
      for (let i = 0; i < coordinates.length; i++) {
        const coord = coordinates[i];
        const elevation = (coord && coord.length >= 3 && !isNaN(coord[2])) ? Number(coord[2]) : null;
        if (elevation !== null && previousElevation !== null) {
          const elevationDiff = elevation - previousElevation;
          if (elevationDiff > 0) elevationGain += elevationDiff;
        }
        if (elevation !== null) previousElevation = elevation;
      }

      // Calculate cumulative data
      const cumulative = [];
      let cumulativeDistance = 0;
      for (let i = 0; i < coordinates.length; i++) {
        const [lon, lat, elevationRaw] = coordinates[i];
        const elevation = (elevationRaw !== undefined && !isNaN(elevationRaw)) ? Number(elevationRaw) : undefined;

        if (i > 0) {
          const previousCoord = coordinates[i - 1];
          const from = turf.point([previousCoord[0], previousCoord[1]]);
          const to = turf.point([lon, lat]);
          const segmentKm = turf.distance(from, to, { units: 'kilometers' });
          cumulativeDistance += segmentKm;
        }

        const horizontalHours = cumulativeDistance / config.avgSpeedKmh;

        // Calculate local elevation gain up to this point
        let localElevationGain = 0;
        let previousElevationLocal = null;
        for (let j = 0; j <= i; j++) {
          const elevationValue = coordinates[j][2];
          const elevationNumber = (elevationValue !== undefined && !isNaN(elevationValue)) ? Number(elevationValue) : null;
          if (previousElevationLocal !== null && elevationNumber !== null) {
            const elevationDiff = elevationNumber - previousElevationLocal;
            if (elevationDiff > 0) localElevationGain += elevationDiff;
          }
          if (elevationNumber !== null) previousElevationLocal = elevationNumber;
        }

        const ascentHours = localElevationGain / config.ascentMetersPerHour;
        const cumulativeTimeMin = Math.round((horizontalHours + ascentHours) * 60);

        cumulative.push({
          lat,
          lon,
          elev: elevation,
          cumDistKm: Number(cumulativeDistance.toFixed(4)),
          cumTimeMin: cumulativeTimeMin
        });
      }

      // Calculate predicted total time
      const predictedHours = (lengthKm / config.avgSpeedKmh) + (elevationGain / config.ascentMetersPerHour);

      stats = {
        length_km: Number(lengthKm.toFixed(3)),
        elevation_gain_m: Math.round(elevationGain),
        predicted_time_h: Number(predictedHours.toFixed(2)),
        cumulative
      };

      // Add computed properties to the feature
      if (!mainFeature.properties) mainFeature.properties = {};
      mainFeature.properties.computed = {
        ...stats,
        imported_at: new Date().toISOString(),
        source: 'native-download',
        sourcePath: localPath
      };
    }
  }

  // Create route entry
  const routeId = `route_${Date.now()}`;
  const routeName = (geojson.features && geojson.features[0] &&
    (geojson.features[0].properties?.name || geojson.features[0].properties?.title)) ||
    localPath.split('/').pop();

  const routeEntry = {
    id: routeId,
    name: routeName,
    localFile: localPath,
    geojson,
    stats
  };

  // Save to storage
  const existingRoutes = await loadData(CONFIG.STORAGE_KEYS.ROUTES) || [];
  existingRoutes.push(routeEntry);
  await saveData(CONFIG.STORAGE_KEYS.ROUTES, existingRoutes);

  return routeEntry;
}

/**
 * Download, parse, and save GPX route in one operation
 * @param {string} url - URL of the GPX file
 * @param {string} filename - Name for the local file
 * @param {Function} onProgress - Progress callback function
 * @param {Object} options - Parsing options
 * @returns {Promise<Object>} Route entry
 */
export async function downloadParseAndSave(url, filename, onProgress, options) {
  const localPath = await downloadGpxToLocal(url, filename, onProgress);
  const routeEntry = await parseGpxFileAndSave(localPath, options);
  return routeEntry;
}