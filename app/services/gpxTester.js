import RNFS from 'react-native-fs';
import { DOMParser } from 'xmldom';
import * as toGeoJSONModule from '@tmcw/togeojson';
import { CONFIG } from '../config/env';

const toGeoJSON = toGeoJSONModule.default || toGeoJSONModule;

const GPX_DIR = `${RNFS.DocumentDirectoryPath}/gpx`;
const BUNDLED_GPX = '../config/bap_prokhodnogo.gpx.js';

function parseGpxManually(doc) {
  const features = [];

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

