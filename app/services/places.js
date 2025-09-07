import axios from 'axios';
import { CONFIG } from '../config/env';

// Типы мест для условных обозначений
export const PLACE_TYPES = {
  SPRING: 'spring',     // Родник
  PEAK: 'peak',         // Пик/вершина
  PASS: 'pass',         // Перевал
  CAMP: 'camp',         // Лагерь
  SHELTER: 'shelter',   // Укрытие
  VIEWPOINT: 'viewpoint' // Смотровая площадка
};

// Получаем список мест с сервера
export async function getPlaces() {
  try {
    // Имитация API вызова - в реальном приложении здесь будет настоящий API
    const response = await axios.get(CONFIG.MOUNTAINS_API_URL, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    return response.data || [];
  } catch (error) {
    console.warn('Ошибка загрузки мест:', error);

    // Возвращаем демо-данные если API недоступен
    return getDemoPlaces();
  }
}

// Демо-данные для тестирования
function getDemoPlaces() {
  return [
    {
      id: 'spring_1',
      type: PLACE_TYPES.SPRING,
      name: 'Родник "Чистый"',
      description: 'Чистый горный родник с питьевой водой',
      latitude: 43.25,
      longitude: 76.95,
      altitude: 1800,
      difficulty: 'easy',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'peak_1',
      type: PLACE_TYPES.PEAK,
      name: 'Пик Медео',
      description: 'Популярная вершина для восхождения',
      latitude: 43.15,
      longitude: 77.05,
      altitude: 3200,
      difficulty: 'hard',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'pass_1',
      type: PLACE_TYPES.PASS,
      name: 'Перевал Заилийский',
      description: 'Высокогорный перевал с потрясающими видами',
      latitude: 43.35,
      longitude: 77.15,
      altitude: 3500,
      difficulty: 'medium',
      lastUpdated: new Date().toISOString()
    }
  ];
}

// Получаем цвет для типа места
export function getPlaceColor(type) {
  switch (type) {
    case PLACE_TYPES.SPRING:
      return '#3b82f6'; // Синий для родников
    case PLACE_TYPES.PEAK:
      return '#ef4444'; // Красный для пиков
    case PLACE_TYPES.PASS:
      return '#f59e0b'; // Оранжевый для перевалов
    case PLACE_TYPES.CAMP:
      return '#10b981'; // Зеленый для лагерей
    case PLACE_TYPES.SHELTER:
      return '#8b5cf6'; // Фиолетовый для укрытий
    case PLACE_TYPES.VIEWPOINT:
      return '#06b6d4'; // Бирюзовый для смотровых площадок
    default:
      return '#6b7280'; // Серый по умолчанию
  }
}

// Получаем иконку для типа места
export function getPlaceIcon(type) {
  switch (type) {
    case PLACE_TYPES.SPRING:
      return '💧'; // Родник
    case PLACE_TYPES.PEAK:
      return '⛰️';  // Пик
    case PLACE_TYPES.PASS:
      return '🏔️';  // Перевал
    case PLACE_TYPES.CAMP:
      return '⛺';  // Лагерь
    case PLACE_TYPES.SHELTER:
      return '🏠'; // Укрытие
    case PLACE_TYPES.VIEWPOINT:
      return '👁️'; // Смотровая площадка
    default:
      return '📍'; // По умолчанию
  }
}

// Получаем описание типа места
export function getPlaceTypeDescription(type) {
  switch (type) {
    case PLACE_TYPES.SPRING:
      return 'Родник';
    case PLACE_TYPES.PEAK:
      return 'Пик/Вершина';
    case PLACE_TYPES.PASS:
      return 'Перевал';
    case PLACE_TYPES.CAMP:
      return 'Лагерь';
    case PLACE_TYPES.SHELTER:
      return 'Укрытие';
    case PLACE_TYPES.VIEWPOINT:
      return 'Смотровая площадка';
    default:
      return 'Место';
  }
}

// Фильтруем места по типу
export function filterPlacesByType(places, type) {
  if (!type) return places;
  return places.filter(place => place.type === type);
}

// Ищем ближайшие места
export function findNearbyPlaces(places, userLocation, radiusKm = 10) {
  if (!userLocation || !places.length) return [];

  return places.filter(place => {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      place.latitude,
      place.longitude
    );
    return distance <= radiusKm;
  });
}

// Вычисляем расстояние между двумя точками (в километрах)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Радиус Земли в километрах
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Получаем уровень сложности места
export function getDifficultyLevel(difficulty) {
  switch (difficulty) {
    case 'easy':
      return { level: 'Легкий', color: '#10b981' };
    case 'medium':
      return { level: 'Средний', color: '#f59e0b' };
    case 'hard':
      return { level: 'Сложный', color: '#ef4444' };
    case 'expert':
      return { level: 'Эксперт', color: '#dc2626' };
    default:
      return { level: 'Неизвестно', color: '#6b7280' };
  }
}