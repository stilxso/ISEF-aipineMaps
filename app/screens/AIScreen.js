import { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { generateAdviceWithGemini } from '../services/gemini';
import { getWeather } from '../services/weather';
import { useLocation } from '../contexts/LocationContext';

const initial = [{ id: 'sys', role: 'assistant', text: 'Привет! Я ИИ-помощник по горному туризму. Спрашивай про маршруты, погоду, снаряжение или безопасность в горах.' }];

export default function AIScreen() {
  const [messages, setMessages] = useState(initial);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [weather, setWeather] = useState(null);
  const { currentLocation, startWatching } = useLocation();

  useEffect(() => {
    startWatching();
  }, [startWatching]);

  useEffect(() => {
    if (currentLocation) {
      fetchWeather();
    }
  }, [currentLocation]);

  const fetchWeather = async () => {
    if (!currentLocation) return;
    try {
      const weatherData = await getWeather(currentLocation.latitude, currentLocation.longitude);
      setWeather({
        temperature: weatherData.main?.temp,
        weather: weatherData.weather?.[0]?.main,
        description: weatherData.weather?.[0]?.description,
        windSpeed: weatherData.wind?.speed,
      });
    } catch (error) {
      console.warn('Weather fetch error:', error);
    }
  };

  const onSend = async () => {
    const txt = input.trim();
    if (!txt || sending) return;
    setSending(true);
    setMessages(prev => [...prev, { id: `u_${Date.now()}`, role: 'user', text: txt }]);
    setInput('');

    try {
      // тут создаем промпт для Gemini с погодой и markdown
      const prompt = `Пользователь спросил: "${txt}"

Текущая погода: ${weather ? `температура ${weather.temperature}°C, ${weather.description}, ветер ${weather.windSpeed} м/с` : 'погода неизвестна'}

Ответь как ИИ-помощник по горному туризму на русском языке. Используй markdown форматирование для лучшей читаемости:
- **жирный текст** для важных моментов
- *курсив* для выделения
- - маркированные списки для перечислений
- 1. 2. 3. нумерованные списки для последовательностей
- ### Заголовки для разделов

Будь полезным, точным и основывайся только на достоверной информации.`;

      const response = await generateAdviceWithGemini(null, weather, { language: 'ru', prompt: prompt });
      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text: response, formatted: true }]);
    } catch (error) {
      console.warn('Gemini API error:', error);
      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text: 'Извините, произошла ошибка при обработке запроса.', formatted: false }]);
    } finally {
      setSending(false);
    }
  };

  const parseMarkdown = (text) => {
    const parts = [];
    const lines = text.split('\n');
    let key = 0;

    lines.forEach((line, index) => {
      // Заголовки
      if (line.startsWith('### ')) {
        parts.push(
          <Text key={key++} style={[styles.msgText, styles.header]}>
            {line.substring(4)}
          </Text>
        );
        return;
      }

      // Нумерованные списки
      if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s/, '');
        parts.push(
          <View key={key++} style={styles.listItem}>
            <Text style={[styles.msgText, styles.listBullet]}>• </Text>
            <Text style={styles.msgText}>{parseInlineMarkdown(content)}</Text>
          </View>
        );
        return;
      }

      // Маркированные списки
      if (line.startsWith('- ')) {
        parts.push(
          <View key={key++} style={styles.listItem}>
            <Text style={[styles.msgText, styles.listBullet]}>• </Text>
            <Text style={styles.msgText}>{parseInlineMarkdown(line.substring(2))}</Text>
          </View>
        );
        return;
      }

      // Обычный текст с inline форматированием
      if (line.trim()) {
        parts.push(
          <Text key={key++} style={styles.msgText}>
            {parseInlineMarkdown(line)}
          </Text>
        );
      }

      // Добавляем перенос строки, кроме последней строки
      if (index < lines.length - 1) {
        parts.push(<Text key={key++} style={styles.msgText}>{'\n'}</Text>);
      }
    });

    return parts;
  };

  const parseInlineMarkdown = (text) => {
    const parts = [];
    let lastIndex = 0;
    let key = 0;

    // Жирный текст **text**
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    while ((match = boldRegex.exec(text)) !== null) {
      // Текст до совпадения
      if (match.index > lastIndex) {
        parts.push(
          <Text key={key++} style={styles.msgText}>
            {text.substring(lastIndex, match.index)}
          </Text>
        );
      }

      // Жирный текст
      parts.push(
        <Text key={key++} style={[styles.msgText, styles.bold]}>
          {match[1]}
        </Text>
      );

      lastIndex = match.index + match[0].length;
    }

    // Курсив *text*
    const italicRegex = /\*(.*?)\*/g;
    let italicParts = [];
    if (parts.length === 0) {
      italicParts = [text];
    } else {
      // Обрабатываем оставшийся текст
      if (lastIndex < text.length) {
        italicParts = [text.substring(lastIndex)];
      }
    }

    italicParts.forEach(part => {
      let italicLastIndex = 0;
      let italicKey = key;

      let italicMatch;
      while ((italicMatch = italicRegex.exec(part)) !== null) {
        // Текст до совпадения
        if (italicMatch.index > italicLastIndex) {
          parts.push(
            <Text key={italicKey++} style={styles.msgText}>
              {part.substring(italicLastIndex, italicMatch.index)}
            </Text>
          );
        }

        // Курсив
        parts.push(
          <Text key={italicKey++} style={[styles.msgText, styles.italic]}>
            {italicMatch[1]}
          </Text>
        );

        italicLastIndex = italicMatch.index + italicMatch[0].length;
      }

      // Оставшийся текст
      if (italicLastIndex < part.length) {
        parts.push(
          <Text key={italicKey++} style={styles.msgText}>
            {part.substring(italicLastIndex)}
          </Text>
        );
      }

      key = italicKey;
    });

    return parts.length > 0 ? parts : text;
  };

  const renderItem = ({ item }) => (
    <View style={[styles.msg, item.role === 'user' ? styles.user : styles.assistant]}>
      {item.formatted ? parseMarkdown(item.text) : <Text style={styles.msgText}>{item.text}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList data={messages} keyExtractor={m => m.id} renderItem={renderItem} contentContainerStyle={{ padding: 12 }} />
        <View style={styles.inputRow}>
          <TextInput value={input} onChangeText={setInput} style={styles.input} placeholder="Спросите что-нибудь про поход..." placeholderTextColor="#93a4c8" onSubmitEditing={onSend} />
          <TouchableOpacity onPress={onSend} style={[styles.sendBtn, sending && { opacity: 0.6 }]}>
            <Text style={styles.sendText}>{sending ? '...' : 'Отправить'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b0d2a' },
  container: { flex: 1, backgroundColor: '#0b0d2a' },
  msg: { padding: 12, borderRadius: 12, marginVertical: 6, maxWidth: '85%' },
  user: { backgroundColor: '#5b6eff', alignSelf: 'flex-end' },
  assistant: { backgroundColor: '#1a2145', alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  msgText: { color: '#fff', lineHeight: 20 },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
  header: { fontSize: 16, fontWeight: 'bold', marginTop: 8, marginBottom: 4, color: '#5b6eff' },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2 },
  listBullet: { marginRight: 8, color: '#5b6eff' },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    paddingBottom: Platform.OS === 'ios' ? 104 : 92, // Учитываем высоту tab bar + safe area
  },
  input: { flex: 1, backgroundColor: '#141a3a', borderRadius: 10, paddingHorizontal: 12, color: '#fff' },
  sendBtn: { backgroundColor: '#5b6eff', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
});
