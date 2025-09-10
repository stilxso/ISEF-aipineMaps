import * as turf from '@turf/turf';

const DEFAULT_AVG_SPEED_KMH = 5;
// тут функция для расчета статистики маршрута из GeoJSON
const DEFAULT_ASCENT_METERS_PER_HOUR = 300;

export function routeStatsFromGeojson(geojson) {
  try {
         const feature =
      geojson?.features?.find((f) => f?.geometry?.type === 'LineString') ||
      geojson?.features?.[0];

    if (!feature?.geometry?.coordinates?.length) return null;
    // тут рассчитываем длину и подъем

          const lengthKm = turf.length(feature, { units: 'kilometers' });

         let elevationGain = 0;
    let previousElevation = null;
    for (const coordinate of feature.geometry.coordinates) {
      const elevation =
        coordinate && coordinate.length >= 3 && !isNaN(coordinate[2])
          ? Number(coordinate[2])
          : null;

      if (elevation !== null && previousElevation !== null) {
        const elevationDiff = elevation - previousElevation;
        if (elevationDiff > 0) elevationGain += elevationDiff;
      }

      if (elevation !== null) previousElevation = elevation;
    }

    return {
      length_km: Number(lengthKm.toFixed(2)),
      elevation_gain_m: Math.round(elevationGain),
    };
  } catch (error) {
    console.warn('Error calculating route stats:', error.message);
    return null;
  }
}

export function generateAdvice(route, ctx = {}) {
     const stats = route?.stats?.length_km
    ? route.stats
    : routeStatsFromGeojson(route?.geojson) || {};

  const lengthKm = stats.length_km || 0;
  const elevationGainM = stats.elevation_gain_m || 0;

// тут генерирует советы для похода с учетом погоды
      const weather = ctx.weather || {};
  const windSpeed = weather.windSpeed || 0;
  const temperature = weather.temperature || 10;

     const riskScore =
    (lengthKm > 15 ? 1 : 0) +
    (elevationGainM > 1200 ? 1 : 0) +
    (windSpeed > 8 ? 1 : 0) +
    (temperature < -5 ? 1 : 0);

     const distanceTag = lengthKm <= 8 ? 'Easy distance' : lengthKm <= 15 ? 'Medium distance' : 'Long distance';
  const ascentTag = elevationGainM < 400 ? 'Low elevation' : elevationGainM <= 1000 ? 'Medium elevation' : 'High elevation';

     const conditions = [];
  if (temperature < 0) conditions.push('Cold weather');
  if (windSpeed > 10) conditions.push('Strong wind');

     const waterLiters = Math.max(1, Math.round(lengthKm / 8));
  const foodUnits = Math.max(1, Math.round(lengthKm / 4));

     const pace = elevationGainM > 1200 || lengthKm > 18 ? 'cautiously' : 'normally';

     const flatTimeHours = lengthKm / (ctx.avgSpeedKmh || DEFAULT_AVG_SPEED_KMH);
  const ascentTimeHours = elevationGainM / (ctx.ascentMetersPerHour || DEFAULT_ASCENT_METERS_PER_HOUR);
  const totalHours = (flatTimeHours + ascentTimeHours).toFixed(1);

     const summary = `Distance ${lengthKm} km, elevation ${elevationGainM} m, pace ${pace}.`;
  const tags = [distanceTag, ascentTag, ...conditions];
  const timing = [`Time: ${totalHours} h`];
  if (riskScore >= 2) timing.push('Start early, plan for return');

  const checklist = [
    'Navigation: phone + power bank, offline map',
    `Water: ${waterLiters}L total`,
    `Food: ${foodUnits} portions`,
    'Clothing: base layer, insulation, rain jacket',
  ];
  if (temperature <= 0) checklist.push('Warm gloves and hat');
  if (windSpeed > 10) checklist.push('Wind jacket required');

     const adviceText = [
    summary,
    tags.join(', '),
    timing.join('. '),
    checklist.map(item => `- ${item}`).join('\n'),
  ].join('\n');

  return adviceText;
}
  // тут возвращаем готовый текст с советами