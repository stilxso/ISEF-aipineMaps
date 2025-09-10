// тут импортируем AsyncStorage для работы с хранилищем
import AsyncStorage from '@react-native-async-storage/async-storage';

// функция для загрузки данных из хранилища
export async function loadData(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('storage.loadData error', e);
    return null;
  }
}

// функция для сохранения данных в хранилище
export async function saveData(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('storage.saveData error', e);
    return false;
  }
}

// функция для удаления данных из хранилища
export async function removeData(key) {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn('storage.removeData error', e);
    return false;
  }
}
