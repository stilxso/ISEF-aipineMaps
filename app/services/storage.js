import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveData(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('storage save error', e);
    return false;
  }
}

export async function loadData(key) {
  try {
    const s = await AsyncStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    console.warn('storage load error', e);
    return null;
  }
}
