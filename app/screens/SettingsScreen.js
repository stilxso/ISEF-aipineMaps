import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';

export default function SettingsScreen() {
  const { settings, updateSetting } = useSettings();
  const items = useMemo(() => ([
    { key: 'language', label: 'Язык / Language', value: settings.language === 'ru' ? 'Русский' : 'English', next: settings.language === 'ru' ? 'en' : 'ru' },
    { key: 'theme', label: 'Тема / Theme', value: settings.theme, next: settings.theme === 'dark' ? 'light' : 'dark' },
    { key: 'units', label: 'Единицы / Units', value: settings.units, next: settings.units === 'metric' ? 'imperial' : 'metric' },
    { key: 'mapProvider', label: 'Карта / Map Provider', value: settings.mapProvider, next: settings.mapProvider === 'default' ? 'osm' : 'default' },
    { key: 'locationEnabled', label: 'Локация / Location', value: String(settings.locationEnabled), next: String(!settings.locationEnabled) },
    { key: 'notificationsEnabled', label: 'Уведомления / Notifications', value: String(settings.notificationsEnabled), next: String(!settings.notificationsEnabled) },
    { key: 'autoSave', label: 'Автосохранение / Auto Save', value: String(settings.autoSave), next: String(!settings.autoSave) },
  ]), [settings]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Настройки / Settings</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {items.map(item => (
          <View key={item.key} style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => {
                const v = item.next;
                if (item.key === 'locationEnabled' || item.key === 'notificationsEnabled' || item.key === 'autoSave') {
                  updateSetting(item.key, v === 'true');
                } else {
                  updateSetting(item.key, v);
                }
              }}
            >
              <Text style={styles.btnText}>Переключить / Toggle</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E1E', padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  list: { gap: 10 },
  row: { backgroundColor: '#2a2a2a', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { gap: 6 },
  label: { color: '#fff', fontSize: 16, fontWeight: '700' },
  value: { color: '#bbb', fontSize: 14 },
  btn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' }
});