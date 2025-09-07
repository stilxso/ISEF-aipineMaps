import axios from 'axios';
import { CONFIG } from '../config/env';
import { routeStatsFromGeojson } from './ai';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';


function buildPrompt(route, weather, language = 'ru') {
  const stats = route?.stats?.length_km ? route.stats : routeStatsFromGeojson(route?.geojson) || {};
  const name = route?.name || route?.id || 'маршрут';
  const len = stats.length_km ?? 0;
  const gain = stats.elevation_gain_m ?? 0;

  const w = weather || {};
  const temp = w.temperature ?? 'н/д';
  const wind = w.windSpeed ?? 'н/д';
  const conditions = [w.weather, w.description].filter(Boolean).join(', ') || 'н/д';

  if (language === 'ru') {
    return [
      `Вы - помощник по горному туризму. Предоставьте четкие, практические рекомендации.`,
      `Маршрут: ${name}`,
      `Расстояние: ${len} км`,
      `Набор высоты: ${gain} м`,
      `Погода: ${conditions}, температура: ${temp}°C, ветер: ${wind} м/с`,
      `Ответьте на русском языке в формате:`,
      `1) Краткое описание (1-2 строки)`,
      `2) Риски`,
      `3) Список снаряжения (маркированный список)`,
      `4) Рекомендации по воде/еде`,
      `5) Предполагаемое время в часах`,
      `Если нужно, добавьте CHECKLIST: предмет1, предмет2, предмет3 и т.д.`,
    ].join('\n');
  }

  return [
    `You are a mountain hiking assistant. Provide clear, actionable guidance.`,
    `Route: ${name}`,
    `Distance: ${len} km`,
    `Elevation gain: ${gain} m`,
    `Weather: ${conditions}, temp: ${temp}°C, wind: ${wind} m/s`,
    `Respond with:`,
    `1) Summary (1-2 lines)`,
    `2) Risks`,
    `3) Gear checklist (bulleted)`,
    `4) Water/Food recommendations`,
    `5) Estimated time in hours`,
  ].join('\n');
}


export async function generateAdviceWithGemini(route, weather, opts = {}) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in CONFIG');

  const model = opts.model || 'models/gemini-1.5-flash-latest';
  const language = opts.language || 'ru'; // Default to Russian
  const url = `${GEMINI_ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = buildPrompt(route, weather, language);

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 512,
      topK: 40,
      topP: 0.95,
    },
  };

  const res = await axios.post(url, payload, { timeout: 20000 });
  const candidates = res?.data?.candidates || [];
  const parts = candidates[0]?.content?.parts || [];
  const text = parts.map((p) => p?.text).filter(Boolean).join('\n').trim();

  return text || 'Совет не сгенерирован.';
}