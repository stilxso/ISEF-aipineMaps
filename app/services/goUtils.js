import RNFS from 'react-native-fs';
import Mapbox from '@rnmapbox/maps';
import { downloadParseAndSave } from './gpxNative';
import { API_BASE_URL } from '../config/api';


const GO_ROUTES_PATH = `${RNFS.DocumentDirectoryPath}/go_routes.json`;

export const getGoRoutes = async () => {
  try {
    const fileExists = await RNFS.exists(GO_ROUTES_PATH);
    if (!fileExists) {
      return []; 
    }
    const content = await RNFS.readFile(GO_ROUTES_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to get GO routes:', error);
    return [];
  }
};

export const sendRouteToGo = async (route) => {
  if (!route || !route.id) {
    return { success: false, message: 'Invalid route data provided.' };
  }

  try {
    
    try {
      const gpxUrl = route?.geojson?.features?.[0]?.properties?.gpx_download_url || route?.gpxUrl;
      if (gpxUrl) {
        const fullUrl = gpxUrl.startsWith('http') ? gpxUrl : `${API_BASE_URL}${gpxUrl}`;
        const safeName = (route.name || route.id).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${safeName}.gpx`;
        const parsed = await downloadParseAndSave(fullUrl, filename);
        if (parsed && parsed.geojson) {
          route.geojson = parsed.geojson;
          route.stats = parsed.stats || route.stats;
          route.gpxLocalPath = parsed.localFile || route.gpxLocalPath;
        }
      }
    } catch (err) {
      console.warn('sendRouteToGo: GPX download/parse skipped:', err?.message || err);
    }

    
    const existingRoutes = await getGoRoutes();
    const routeIndex = existingRoutes.findIndex(r => r.id === route.id);

    if (routeIndex > -1) {
      existingRoutes[routeIndex] = { ...existingRoutes[routeIndex], ...route, originalRouteId: route.id, offline: true };
    } else {
      existingRoutes.push({ ...route, originalRouteId: route.id, offline: true }); 
    }

    await RNFS.writeFile(GO_ROUTES_PATH, JSON.stringify(existingRoutes, null, 2), 'utf8');

    
    await downloadMapRegionForRoute(route);

    return { success: true, message: `Route "${route.name || route.id}" saved and map downloaded.` };
  } catch (error) {
    console.error('Failed in sendRouteToGo:', error);
    return { success: false, message: String(error.message || 'An unknown error occurred.') };
  }
};



const getBoundingBox = (coordinates) => {
  let minLon = coordinates[0][0];
  let maxLon = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];

  for (const coord of coordinates) {
    minLon = Math.min(minLon, coord[0]);
    maxLon = Math.max(maxLon, coord[0]);
    minLat = Math.min(minLat, coord[1]);
    maxLat = Math.max(maxLat, coord[1]);
  }

  
  const lonPadding = (maxLon - minLon) * 0.1;
  const latPadding = (maxLat - minLat) * 0.1;

  return [
    minLon - lonPadding,
    minLat - latPadding,
    maxLon + lonPadding,
    maxLat + latPadding,
  ];
};

const downloadMapRegionForRoute = (route) => {
  return new Promise(async (resolve, reject) => {
    const coords = route.geojson?.features?.[0]?.geometry?.coordinates;
    if (!coords || coords.length === 0) {
      return reject(new Error('Route has no coordinates to download.'));
    }

    const bounds = getBoundingBox(coords);
    const packName = `route-${route.id}`;

    
    const existingPacks = await Mapbox.offlineManager.getPacks();
    const oldPack = existingPacks.find(p => p.name === packName);
    if (oldPack) {
      await Mapbox.offlineManager.deletePack(packName);
    }
    
    
    const packOptions = {
      name: packName,
      styleURL: Mapbox.StyleURL.Outdoors, 
      bounds: [ [bounds[0], bounds[1]], [bounds[2], bounds[3]] ],
      minZoom: 10,
      maxZoom: 16, 
    };

    
    const pack = await Mapbox.offlineManager.createPack(packOptions);

    pack.subscribe(
      (p) => {
        if (p.state === 'complete') {
          console.log(`Offline pack "${p.name}" download complete.`);
          resolve();
        } else if (p.state === 'error') {
          console.error(`Offline pack "${p.name}" download error:`, p.error);
          reject(new Error(p.error));
        }
      },
      (err) => {
        console.error('Error subscribing to pack:', err);
        reject(err);
      }
    );
  });
};