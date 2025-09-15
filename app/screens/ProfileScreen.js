
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Switch, Alert, ScrollView, TextInput } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { loadData, saveData } from '../services/storage';
import { CONFIG } from '../config/env';

export default function ProfileScreen() {
  const { settings, updateSetting } = useSettings();
  const { user, logout } = useAuth();

  const [phone, setPhone] = useState(user?.phone || '');
  const [trustedContacts, setTrustedContacts] = useState(user?.trustedContacts || []);

  const toggle = (key, next) => {
    updateSetting(key, next);
  };

  const onSignOut = async () => {
    Alert.alert(
      'Выход',
      'Вы действительно хотите выйти из аккаунта?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert('Выход', 'Вы успешно вышли из аккаунта.');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.header}>
        <Image source={{ uri: 'https://i.pravatar.cc/200' }} style={styles.avatar} />
        <Text style={styles.name}>{user?.name || 'Пользователь'}</Text>
        {!!user?.email && <Text style={styles.email}>{user.email}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Личная информация</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Телефон</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Введите номер телефона" placeholderTextColor="#93a4c8" />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Доверенные контакты</Text>
          <TextInput style={styles.input} value={trustedContacts.join(', ')} onChangeText={(text) => setTrustedContacts(text.split(', ').filter(c => c))} placeholder="Номера через запятую" placeholderTextColor="#93a4c8" />
        </View>

        <TouchableOpacity style={styles.btnSmall} onPress={() => Alert.alert('Сохранено', 'Личная информация сохранена')}>
          <Text style={styles.btnText}>Сохранить</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Настройки</Text>


        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Оффлайн карты</Text>
            <Text style={styles.value}>Управление и скачивание</Text>
          </View>
          <TouchableOpacity style={styles.btnSmall} onPress={() => Alert.alert('Оффлайн карты', 'Откройте раздел "Карта" и нажмите на точку, чтобы скачать регион.')}>
            <Text style={styles.btnText}>Открыть</Text>
          </TouchableOpacity>
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
  input: { backgroundColor: '#1a2145', borderRadius: 8, padding: 10, color: '#fff', marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  signout: { marginTop: 24, backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  signoutText: { color: '#fff', fontWeight: '800' },
});
