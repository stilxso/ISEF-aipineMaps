
import AsyncStorage from '@react-native-async-storage/async-storage';


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


export async function saveData(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('storage.saveData error', e);
    return false;
  }
}


export async function removeData(key) {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn('storage.removeData error', e);
    return false;
  }
}
