// экран профиля с настройками
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { loadData, saveData } from '../services/storage';
import { CONFIG } from '../config/env';

export default function ProfileScreen() {
  const { settings, updateSetting } = useSettings();
  const [user, setUser] = useState({ name: 'Explorer', email: '' });

  const toggle = (key, next) => {
    updateSetting(key, next);
  };

  const onSignOut = async () => {
    await saveData(CONFIG.STORAGE_KEYS.USER, null);
    Alert.alert('Выход', 'Вы вышли из аккаунта (демо).');
    setUser({ name: 'Explorer', email: '' });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.header}>
        <Image source={{ uri: 'https://i.pravatar.cc/200' }} style={styles.avatar} />
        <Text style={styles.name}>{user.name}</Text>
        {!!user.email && <Text style={styles.email}>{user.email}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Настройки</Text>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Язык</Text>
            <Text style={styles.value}>{settings.language}</Text>
          </View>
          <TouchableOpacity style={styles.btnSmall} onPress={() => updateSetting('language', settings.language === 'ru' ? 'en' : 'ru')}>
            <Text style={styles.btnText}>Сменить</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Тема</Text>
            <Text style={styles.value}>{settings.theme}</Text>
          </View>
          <TouchableOpacity style={styles.btnSmall} onPress={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}>
            <Text style={styles.btnText}>Сменить</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Оффлайн карты</Text>
            <Text style={styles.value}>Управление и скачивание</Text>
          </View>
          <TouchableOpacity style={styles.btnSmall} onPress={() => Alert.alert('Оффлайн карты', 'Откройте раздел "Карта" и нажмите на точку, чтобы скачать регион.')}>
            <Text style={styles.btnText}>Открыть</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={styles.label}>Локация</Text>
          <Switch value={settings.locationEnabled} onValueChange={(v) => toggle('locationEnabled', v)} />
        </View>

        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={styles.label}>Автосохранение</Text>
          <Switch value={settings.autoSave} onValueChange={(v) => toggle('autoSave', v)} />
        </View>
      </View>

      <TouchableOpacity style={styles.signout} onPress={onSignOut}>
        <Text style={styles.signoutText}>Выйти</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d2a' },
  header: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  name: { color: '#fff', fontSize: 20, fontWeight: '800' },
  email: { color: '#93a4c8' },

  section: { backgroundColor: '#1a2145', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  sectionTitle: { color: '#fff', fontWeight: '800', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.02)' },
  label: { color: '#fff', fontWeight: '700' },
  value: { color: '#93a4c8', marginTop: 4 },
  btnSmall: { backgroundColor: '#5b6eff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '800' },

  signout: { marginTop: 24, backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  signoutText: { color: '#fff', fontWeight: '800' },
});
