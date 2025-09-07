import * as turf from '@turf/turf';

// статистика маршрута из геоджейсона
export function routeStatsFromGeojson(geojson) {
  try {
    const feature =
      geojson?.features?.find((f) => f?.geometry?.type === 'LineString') ||
      geojson?.features?.[0];

    if (!feature?.geometry?.coordinates?.length) return null;

    const lengthKm = turf.length(feature, { units: 'kilometers' });

    let gain = 0;
    let prevElevation = null;
    for (const coord of feature.geometry.coordinates) {
      const elevation =
        coord && coord.length >= 3 && !isNaN(coord[2]) ? Number(coord[2]) : null;
      if (elevation !== null && prevElevation !== null) {
        const diff = elevation - prevElevation;
        if (diff > 0) gain += diff;
      }
      if (elevation !== null) prevElevation = elevation;
    }

    return {
      length_km: Number(lengthKm.toFixed(2)),
      elevation_gain_m: Math.round(gain),
    };
  } catch {
    return null;
  }
}

// генерим советы для похода
export function generateAdvice(route, ctx = {}) {
  const stats =
    route?.stats?.length_km
      ? route.stats
      : routeStatsFromGeojson(route?.geojson) || {};

  const lengthKm = stats.length_km || 0;
  const gainM = stats.elevation_gain_m || 0;

  const weather = ctx.weather || {};
  const wind = weather.windSpeed || 0;
  const temp = weather.temperature || 10;

  const riskScore =
    (lengthKm > 15 ? 1 : 0) +
    (gainM > 1200 ? 1 : 0) +
    (wind > 8 ? 1 : 0) +
    (temp < -5 ? 1 : 0);

  const distanceTag =
    lengthKm <= 8 ? 'Легкая дистанция' : lengthKm <= 15 ? 'Средняя дистанция' : 'Длинная дистанция';
  const ascentTag =
    gainM < 400 ? 'Низкий подъем' : gainM <= 1000 ? 'Средний подъем' : 'Высокий подъем';

  const conditions = [];
  if (temp < 0) conditions.push('Холодно будет');
  if (wind > 10) conditions.push('Сильный ветер');

  const waterLiters = Math.max(1, Math.round(lengthKm / 8));
  const foodUnits = Math.max(1, Math.round(lengthKm / 4));

  const pace = gainM > 1200 || lengthKm > 18 ? 'осторожно' : 'нормально';

  const flatHours = lengthKm / (ctx.avgSpeedKmh || 5);
  const ascentHours = gainM / (ctx.ascentMetersPerHour || 300);
  const totalHours = (flatHours + ascentHours).toFixed(1);

  const summary = `Дистанция ${lengthKm} км, подъем ${gainM} м, темп ${pace}.`;
  const tags = [distanceTag, ascentTag].concat(conditions);
  const timing = [`Время: ${totalHours} ч`];
  if (riskScore >= 2) timing.push('Выходи рано, думай про возврат');

  const checklist = [
    'Навигация: телефон + повербанк, оффлайн карта',
    `Вода: ${waterLiters}л всего`,
    `Еда: ${foodUnits} порций`,
    'Одежда: база, утепление, штормовка',
  ];
  if (temp <= 0) checklist.push('Теплые перчатки и шапка');
  if (wind > 10) checklist.push('Ветровка обязательна');

  const body = [
    summary,
    tags.join(', '),
    timing.join('. '),
    checklist.map((i) => `- ${i}`).join('\n'),
  ].join('\n');

  return body;
}