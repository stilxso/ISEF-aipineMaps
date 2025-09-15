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
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen({ onAuthentication }) {
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true); // Start with login mode

    const { login } = useAuth();


  // Обработчик входа
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.AUTH.LOGIN}`, {
        email,
        password,
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      
      const { token, user } = response.data;
      await login(user, token);

      Alert.alert('Успех', 'Вход выполнен!', [
        { text: 'OK', onPress: () => onAuthentication() }
      ]);
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Не удалось войти. Проверьте email и пароль.';
      Alert.alert('Ошибка', message);
    } finally {
      setLoading(false);
    }
  };

  
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
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.AUTH.REGISTER}`, {
        name,
        email,
        password,
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      
      const { token, user } = response.data;
      await login(user, token);

      Alert.alert('Успех', 'Регистрация завершена!', [
        { text: 'OK', onPress: () => onAuthentication() }
      ]);
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || 'Не удалось зарегистрироваться. Попробуйте позже.';
      Alert.alert('Ошибка', message);
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
        {}
        <View style={styles.header}>
          <Text style={styles.title}>AlpineMaps</Text>
          <Text style={styles.subtitle}>
            {isLoginMode ? 'Вход в аккаунт' : 'Создание аккаунта'}
          </Text>
        </View>

        {}
        <View style={styles.form}>
          {}
          {!isLoginMode && (
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
          )}

          {}
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

          {}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Пароль</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={isLoginMode ? "Ваш пароль" : "Минимум 6 символов"}
              placeholderTextColor="#8da1c9"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {}
          {!isLoginMode && (
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
          )}

          {}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={isLoginMode ? handleLogin : handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Загрузка...' : (isLoginMode ? 'Войти' : 'Зарегистрироваться')}
            </Text>
          </TouchableOpacity>

          {}
          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsLoginMode(!isLoginMode);
              
              setName('');
              setConfirmPassword('');
            }}
          >
            <Text style={styles.switchText}>
              {isLoginMode ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </Text>
          </TouchableOpacity>

        </View>

        {/* Дополнительная информация */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isLoginMode ? 'Добро пожаловать обратно!' : 'Продолжая, вы соглашаетесь с условиями использования'}
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