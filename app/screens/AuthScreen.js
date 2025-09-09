import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { saveData } from '../services/storage';

export default function AuthScreen({ onAuthentication }) {
   // Состояния для формы
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [name, setName] = useState('');
   const [loading, setLoading] = useState(false);


  // Обработчик регистрации
  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !name) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      // Имитация API вызова
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Сохраняем данные пользователя
      await saveData('user', { email, name, registeredAt: new Date().toISOString() });

      Alert.alert('Успех', 'Регистрация завершена!', [
        { text: 'OK', onPress: () => onAuthentication() }
      ]);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось зарегистрироваться. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={styles.title}>AlpineMaps</Text>
          <Text style={styles.subtitle}>
            Создание аккаунта
          </Text>
        </View>

        {/* Форма */}
        <View style={styles.form}>
          {/* Поле имени */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Имя</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ваше имя"
              placeholderTextColor="#8da1c9"
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#8da1c9"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Пароль */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Пароль</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Минимум 6 символов"
              placeholderTextColor="#8da1c9"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {/* Подтверждение пароля */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Подтвердите пароль</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Повторите пароль"
              placeholderTextColor="#8da1c9"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {/* Кнопка действия */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Загрузка...' : 'Зарегистрироваться'}
            </Text>
          </TouchableOpacity>

        </View>

        {/* Дополнительная информация */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Продолжая, вы соглашаетесь с условиями использования
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0d2a',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#93a4c8',
    textAlign: 'center',
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a2145',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    backgroundColor: '#5b6eff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#5b6eff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  switchText: {
    color: '#5b6eff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    color: '#93a4c8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});