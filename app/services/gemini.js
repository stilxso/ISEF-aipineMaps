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
      `Вы - умный помощник по подготовке к горным походам. Создавайте интерактивные чек-листы и задавайте вопросы о готовности.`,
      `МАРШРУТ: ${name}`,
      `СТАТИСТИКА: ${len} км, набор высоты ${gain} м`,
      `ПОГОДА: ${conditions}, ${temp}°C, ветер ${wind} м/с`,
      `ВАША ЗАДАЧА:`,
      `1. Создать персонализированный ЧЕК-ЛИСТ снаряжения`,
      `2. Задать вопросы о подготовке: количество человек, опыт, здоровье, контакты`,
      `3. Спросить разрешение сохранить данные для экстренных ситуаций`,
      `4. Дать практические рекомендации`,
      `ФОРМАТ ОТВЕТА:`,
      `### Чек-лист подготовки`,
      `- [ ] Предмет 1`,
      `- [ ] Предмет 2`,
      `### Вопросы для уточнения`,
      `1. Сколько человек в группе?`,
      `2. Какой уровень опыта у участников?`,
      `3. Есть ли медицинские особенности?`,
      `### Сохранение данных`,
      `Разрешить сохранить информацию для спасателей в случае ЧС? (да/нет)`,
    ].join('\n');
  }

  return [
    `You are a smart mountain hiking preparation assistant. Create interactive checklists and ask about readiness.`,
    `ROUTE: ${name}`,
    `STATS: ${len} km, elevation gain ${gain} m`,
    `WEATHER: ${conditions}, ${temp}°C, wind ${wind} m/s`,
    `YOUR TASK:`,
    `1. Create personalized GEAR CHECKLIST`,
    `2. Ask preparation questions: group size, experience, health, contacts`,
    `3. Ask permission to save data for emergencies`,
    `4. Give practical recommendations`,
    `RESPONSE FORMAT:`,
    `### Preparation Checklist`,
    `- [ ] Item 1`,
    `- [ ] Item 2`,
    `### Questions to Clarify`,
    `1. How many people in the group?`,
    `2. What experience level?`,
    `3. Any medical conditions?`,
    `### Data Storage`,
    `Allow saving info for rescuers in emergency? (yes/no)`,
  ].join('\n');
}


export async function generateAdviceWithGemini(route, weather, opts = {}) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in CONFIG');

  const model = opts.model || 'models/gemini-1.5-flash-latest';
  const language = opts.language || 'ru'; 
  const url = `${GEMINI_ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let prompt;
  if (opts.prompt) {
    prompt = opts.prompt;
  } else {
    prompt = buildPrompt(route, weather, language);
  }

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

  return text || 'Ответ не сгенерирован.';
}