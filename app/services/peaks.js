import axios from 'axios';
import { CONFIG } from '../config/env';
import localPeaks from '../data/mountains.json';

// тут нормализуем пики из разных форматов
function normalize(peaks) {
  if (!Array.isArray(peaks)) return [];
  return peaks
    .map((p, i) => {
      const id = String(p.id ?? `peak_${i}`);
      const title = String(p.title ?? p.name ?? id);
      const latitude = Number(p.latitude ?? p.lat ?? (Array.isArray(p.coord) ? p.coord[1] : undefined));
      const longitude = Number(p.longitude ?? p.lon ?? (Array.isArray(p.coord) ? p.coord[0] : undefined));
      const gpxUrl = String(p.gpxUrl ?? p.gpx_url ?? p.url ?? '');

      // валидация координат
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
      if (!gpxUrl || gpxUrl.trim() === '') return null;

      return {
        id,
        title: title.trim(),
        latitude: Math.round(latitude * 1000000) / 1000000, // точность до 6 знаков
        longitude: Math.round(longitude * 1000000) / 1000000,
        gpxUrl: gpxUrl.trim()
      };
    })
    .filter(Boolean);
}

// тут получаем пики с сервера или из локальных данных
export async function getPeaks() {
  const source = CONFIG.MOUNTAINS_SOURCE || 'local';
  if (source === 'remote') {
    try {
      const url = CONFIG.MOUNTAINS_API_URL;
      if (!url) throw new Error('MOUNTAINS_API_URL не настроен');
      const res = await axios.get(url, { timeout: 15000 });
      const list = normalize(res.data);
      if (list.length) return list;
    } catch (_e) {
      // падаем на локальные
    }
  }
  return normalize(localPeaks);
}