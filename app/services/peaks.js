import apiClient from './apiClient';
import { CONFIG } from '../config/env';
import localPeaks from '../config/mbs.json';


function normalize(data) {
  
  if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    return data.features
      .map((feature, i) => {
        const props = feature.properties || {};
        const geometry = feature.geometry || {};

        const id = String(props.id ?? props.peak_id ?? `peak_${i}`);
        const title = String(props.name ?? props.title ?? id);
        const latitude = Number(props.latitude ?? props.lat);
        const longitude = Number(props.longitude ?? props.lon);

        
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

        return {
          id,
          title: title.trim(),
          latitude: Math.round(latitude * 1000000) / 1000000, 
          longitude: Math.round(longitude * 1000000) / 1000000,
          elevation: props.elevation ?? props.peak_height,
          difficulty: props.difficulty,
          region: props.region,
          description: props.description,
          elevation_gain: props.elevation_gain,
          length_km: props.length_km,
          route_type: props.route_type,
          estimated_time: props.estimated_time,
          season: props.season,
          gpx_download_url: props.gpx_download_url,
          coordinates: geometry.coordinates, 
          source: props.source,
          uploadedAt: props.uploadedAt,
          type: 'peak'
        };
      })
      .filter(Boolean);
  }

  
  if (!Array.isArray(data)) return [];
  return data
    .map((p, i) => {
      const id = String(p.id ?? p._id ?? `peak_${i}`);
      const title = String(p.title ?? p.name ?? id);
      const latitude = Number(p.latitude ?? p.lat ?? (Array.isArray(p.coord) ? p.coord[1] : undefined));
      const longitude = Number(p.longitude ?? p.lon ?? (Array.isArray(p.coord) ? p.coord[0] : undefined));

      
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

      return {
        id,
        title: title.trim(),
        latitude: Math.round(latitude * 1000000) / 1000000, 
        longitude: Math.round(longitude * 1000000) / 1000000,
        elevation: p.elevation,
        difficulty: p.difficulty ?? p.diffGrade,
        region: p.region,
        description: p.description,
        gpx_download_url: p.gpx_download_url,
        source: p.source,
        uploadedAt: p.uploadedAt ?? p.createdAt,
        type: 'peak'
      };
    })
    .filter(Boolean);
}


export async function getPeaks() {
  try {
    const url = CONFIG.MOUNTAINS_API_URL;
    const startedAt = Date.now();
    console.log('[Peaks] ▶️ Fetch start. Source =', CONFIG.MOUNTAINS_SOURCE, 'URL =', url);
    if (!url) throw new Error('MOUNTAINS_API_URL не настроен');

    if (CONFIG.MOUNTAINS_SOURCE === 'local') {
      const list = normalize(localPeaks);
      const took = Date.now() - startedAt;
      console.log('[Peaks] ✅ Using local peaks. Count =', list.length, 'in', `${took}ms`);
      return list;
    }

    console.log('[Peaks] HTTP GET', url);
    const res = await apiClient.get(url);

    console.log('[Peaks] HTTP status =', res.status);
    console.log('[Peaks] Data type =', Array.isArray(res.data) ? 'array' : typeof res.data);
    console.log('[Peaks] Raw length =', res.data ? (Array.isArray(res.data) ? res.data.length : (typeof res.data === 'object' ? Object.keys(res.data).length : String(res.data).length)) : 'N/A');

    const list = normalize(res.data);
    const took = Date.now() - startedAt;
    console.log('[Peaks] ✅ Normalized peaks. Count =', list.length, 'in', `${took}ms`);
    return list;
  } catch (e) {
    console.error('[Peaks] ❌ Error fetching peaks:', e.message);
    if (e.response) {
      console.error('[Peaks] Error status:', e.response.status);
      console.error('[Peaks] Error data:', e.response.data);
    }
    
    if (__DEV__) {
      const list = normalize(localPeaks);
      console.log('[Peaks] 🔁 Fallback to local peaks. Count =', list.length);
      return list;
    }
    return [];
  }
}