// тут тестер для GPX файлов
import RNFS from 'react-native-fs';
import { DOMParser } from 'xmldom';
import * as toGeoJSONModule from '@tmcw/togeojson';
import { CONFIG } from '../config/env';

const toGeoJSON = toGeoJSONModule.default || toGeoJSONModule;

const GPX_DIR = `${RNFS.DocumentDirectoryPath}/gpx`;
const BUNDLED_GPX = '../config/bap_prokhodnogo.gpx.js';

// Fallback GPX parser
function parseGpxManually(doc) {
  const features = [];

  // Parse waypoints
  const waypoints = doc.getElementsByTagName('wpt');
  for (let i = 0; i < waypoints.length; i++) {
    const wpt = waypoints[i];
    const lat = parseFloat(wpt.getAttribute('lat'));
    const lon = parseFloat(wpt.getAttribute('lon'));
    const name = wpt.getElementsByTagName('name')[0]?.textContent || '';
    const desc = wpt.getElementsByTagName('desc')[0]?.textContent || '';

    if (!isNaN(lat) && !isNaN(lon)) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        properties: {
          name,
          desc
        }
      });
    }
  }

  // Parse track points
  const trackPoints = doc.getElementsByTagName('trkpt');
  const coordinates = [];
  for (let i = 0; i < trackPoints.length; i++) {
    const trkpt = trackPoints[i];
    const lat = parseFloat(trkpt.getAttribute('lat'));
    const lon = parseFloat(trkpt.getAttribute('lon'));
    const ele = trkpt.getElementsByTagName('ele')[0]?.textContent;
    const elevation = ele ? parseFloat(ele) : null;

    if (!isNaN(lat) && !isNaN(lon)) {
      coordinates.push([lon, lat, elevation].filter(x => x !== null));
    }
  }

  if (coordinates.length > 0) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates
      },
      properties: {}
    });
  }

  return {
    type: 'FeatureCollection',
    features
  };
}

export async function testLoadDummyGpx() {
  const localPath = `${GPX_DIR}/dummy_bap.gpx`; // Define localPath

  let bundled = '';
  try {
    // require JS module that exports GPX string
    // eslint-disable-next-line global-require
    bundled = require(BUNDLED_GPX);
    if (typeof bundled !== 'string') bundled = String(bundled);
    console.log('Bundled GPX loaded, length:', bundled.length);
  } catch (e) {
    bundled = '';
    console.warn('Failed to require bundled GPX:', e.message);
  }

  if (!bundled || bundled.trim().length === 0) {
    return { success: false, error: 'Bundled GPX is empty', localPath: null, markers: [] };
  }

  try {
    const content = bundled;

    let xml = content;
    if (!xml.startsWith('<?xml')) xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
    xml = xml.replace(/^\uFEFF/, '');

    console.log('Parsing XML, length:', xml.length);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const parserError = doc.getElementsByTagName('parsererror');
    if (parserError && parserError.length) {
      const text = parserError[0].textContent || 'XML parse error';
      console.warn('XML parse error:', text);
      return { success: false, error: `XML parse error: ${text}`, localPath: null, markers: [] };
    }
    console.log('XML parsed successfully');

    let geojson;
    try {
      geojson = toGeoJSON.gpx(doc);
      console.log('GeoJSON features count:', geojson?.features?.length || 0);
    } catch (geojsonError) {
      console.warn('toGeoJSON failed, trying fallback parser:', geojsonError.message);
      // Fallback: simple GPX parser
      geojson = parseGpxManually(doc);
    }

    if (!geojson || !Array.isArray(geojson.features) || geojson.features.length === 0) {
      return { success: false, error: 'Converted GeoJSON is empty or invalid', localPath: null, markers: [] };
    }

    const markers = [];
    console.log('DEBUG: Processing GeoJSON features for markers');
    geojson.features.forEach((f, idx) => {
      console.log('DEBUG: Feature', idx, f.geometry?.type, f.properties);
      if (f.geometry && f.geometry.type === 'Point') {
        const c = f.geometry.coordinates;
        if (Array.isArray(c) && c.length >= 2) {
          const marker = {
            id: `wpt_${idx}`,
            type: 'waypoint',
            latitude: Number(c[1]),
            longitude: Number(c[0]),
            title: (f.properties && (f.properties.name || f.properties.desc)) || `WPT ${idx + 1}`,
          };
          console.log('DEBUG: Created marker:', marker);
          markers.push(marker);
        }
      }
    });
    console.log('DEBUG: Total markers created:', markers.length);

    const line = geojson.features.find((f) => f.geometry && f.geometry.type === 'LineString');
    console.log('DEBUG: Found LineString feature:', !!line);
    if (line && Array.isArray(line.geometry.coordinates) && line.geometry.coordinates.length) {
      const s = line.geometry.coordinates[0];
      const e = line.geometry.coordinates[line.geometry.coordinates.length - 1];
      console.log('DEBUG: LineString coordinates count:', line.geometry.coordinates.length);
      console.log('DEBUG: Start coordinates:', s);
      console.log('DEBUG: End coordinates:', e);
      if (s && s.length >= 2) {
        const startMarker = { id: 'start', type: 'route-start', latitude: Number(s[1]), longitude: Number(s[0]), title: 'Start' };
        console.log('DEBUG: Created start marker:', startMarker);
        markers.unshift(startMarker);
      }
      if (e && e.length >= 2) {
        const endMarker = { id: 'end', type: 'route-end', latitude: Number(e[1]), longitude: Number(e[0]), title: 'End' };
        console.log('DEBUG: Created end marker:', endMarker);
        markers.push(endMarker);
      }
    }

    // Create a single BAP marker instead of individual waypoints
    const bapMarker = {
      id: 'bap-route',
      type: 'route-main',
      latitude: 43.058, // Approximate center of BAP route
      longitude: 76.966,
      title: 'БАП - Большой Алматинский Пик',
      subtitle: 'Маршрут на вершину',
      routeData: geojson, // Store the full route data
    };

    console.log('DEBUG: Created BAP marker:', bapMarker);
    return { success: true, markers: [bapMarker], localPath, geojson };
  } catch (error) {
    return { success: false, error: String(error?.message || error), localPath: null, markers: [] };
  }
}
