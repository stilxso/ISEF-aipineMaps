import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Alert } from 'react-native';
import { useRoutes } from '../contexts/RoutesContext';
import { useWeather } from '../contexts/WeatherContext';
import { useSettings } from '../contexts/SettingsContext';
import { generateAdvice } from '../services/ai';
import { generateAdviceWithGemini } from '../services/gemini';
import { CONFIG } from '../config/env';
import { loadData, saveData } from '../services/storage';
import { getPeaks } from '../services/peaks';

function summarizeRoute(route) {
  if (!route) return 'No route selected.';
  const f = route?.geojson?.features?.[0];
  const name = route?.name || route?.id || 'route';
  const stats = route?.stats || {};
  const lengthKm = stats.length_km ?? (Array.isArray(f?.geometry?.coordinates) ? (f.geometry.coordinates.length / 1000).toFixed(1) : 'n/a');
  const gainM = stats.elevation_gain_m ?? 'n/a';
  return `Route "${name}" — length: ${lengthKm} km, elevation gain: ${gainM} m.`;
}

function summarizeWeather(weather) {
  if (!weather) return 'No weather.';
  const t = weather?.temperature ?? 'n/a';
  const w = weather?.windSpeed ?? 'n/a';
  const cond = [weather?.weather, weather?.description].filter(Boolean).join(', ') || 'n/a';
  return `Weather: ${cond}, temp: ${t}°C, wind: ${w} m/s.`;
}

function summarizeHistory(history) {
  if (!history || !Array.isArray(history) || history.length === 0) return 'No hiking history.';
  const recent = history.slice(-3).map(h => h.name || h.id).join(', ');
  return `Recent hikes: ${recent}.`;
}

function summarizePeaks(peaks) {
  if (!peaks || peaks.length === 0) return 'No nearby peaks.';
  const top = peaks.slice(0, 3).map(p => p.title).join(', ');
  return `Nearby peaks: ${top}.`;
}

export default function AIScreen() {
  const { routes } = useRoutes();
  const { weatherData } = useWeather();
  const { settings } = useSettings();

  // State declarations first
  const [history, setHistory] = useState([]);
  const [peaks, setPeaks] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    { id: 'sys1', role: 'assistant', text: 'Привет! Я горный ассистент. Задайте вопрос про маршрут, погоду, риски, снаряжение и время в пути.' }
  ]);
  const [checklist, setChecklist] = useState([]);
  const [showChecklist, setShowChecklist] = useState(false);

  // Refs
  const listRef = useRef(null);
  const sendScale = useRef(new Animated.Value(1)).current;
  const checklistOpacity = useRef(new Animated.Value(0)).current;

  // последний маршрут
  const latest = useMemo(() => {
    return routes && routes.length ? routes[routes.length - 1] : null;
  }, [routes]);

  // сохранить чеклист
  const saveChecklist = useCallback(async (newChecklist) => {
    await saveData('checklist', newChecklist);
  }, []);

  // переключить чекбокс
  const toggleChecklistItem = useCallback((id) => {
    setChecklist(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      saveChecklist(updated);
      return updated;
    });
  }, [saveChecklist]);

  // добавить элемент
  const addChecklistItem = useCallback((text) => {
    if (!text.trim()) return;
    const newItem = {
      id: `item_${Date.now()}`,
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    setChecklist(prev => {
      const updated = [...prev, newItem];
      saveChecklist(updated);
      return updated;
    });
  }, [saveChecklist]);

  // удалить элемент
  const deleteChecklistItem = useCallback((id) => {
    setChecklist(prev => {
      const updated = prev.filter(item => item.id !== id);
      saveChecklist(updated);
      return updated;
    });
  }, [saveChecklist]);

  // показать чеклист
  const toggleChecklist = useCallback(() => {
    const toValue = showChecklist ? 0 : 1;
    Animated.timing(checklistOpacity, {
      toValue,
      duration: 300,
      useNativeDriver: true
    }).start();
    setShowChecklist(!showChecklist);
  }, [showChecklist, checklistOpacity]);

  useEffect(() => {
    (async () => {
      const h = await loadData(CONFIG.STORAGE_KEYS.HISTORY);
      setHistory(h || []);
      const p = await getPeaks();
      setPeaks(p || []);
      const c = await loadData('checklist');
      setChecklist(c || []);
    })();
  }, []);
  // скролл вниз
  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    scrollToEnd();
  }, [messages.length]);

  const buildUserPrompt = useCallback((userText) => {
    const r = summarizeRoute(latest);
    const w = summarizeWeather(weatherData);
    const h = summarizeHistory(history);
    const p = summarizePeaks(peaks);
    return [
      'You are a helpful mountain hiking assistant. Use all provided context to answer accurately.',
      r,
      w,
      h,
      p,
      'User question:',
      userText
    ].join('\n');
  }, [latest, weatherData, history, peaks]);

  const askLLM = useCallback(async (userText) => {
    let response = '';
    if (CONFIG.GEMINI_API_KEY) {
      try {
        const contextText = buildUserPrompt(userText);
        const enhancedPrompt = `${contextText}\n\nIf the user is asking about equipment, gear, preparation, or risks for hiking, suggest a checklist of items they should prepare. Format checklist suggestions as: CHECKLIST: item1, item2, item3, etc.`;
        const res = await generateAdviceWithGemini(
          latest ? { ...latest, name: latest?.name || latest?.id || 'route' } : null,
          weatherData,
          { model: 'models/gemini-1.5-flash-latest', extra: enhancedPrompt, language: settings.language }
        );
        response = res;
      } catch (e) {
        console.warn('Gemini error:', e);
      }
    }

    if (!response) {
      const base = generateAdvice(latest, { weather: weatherData });
      response = [base, '', 'Дополнительно по вопросу:', userText].join('\n');
    }

    // ищем чеклист в ответе
    const checklistMatch = response.match(/CHECKLIST:\s*(.+)/i);
    if (checklistMatch) {
      const items = checklistMatch[1].split(',').map(item => item.trim()).filter(item => item);
      items.forEach(item => addChecklistItem(item));
      // убираем чеклист из текста
      response = response.replace(/CHECKLIST:\s*.+/i, '').trim();
    }

    return response;
  }, [latest, weatherData, buildUserPrompt, addChecklistItem, settings.language]);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    // анимация кнопки
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(sendScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setSending(true);
    const userMsg = { id: `u_${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    try {
      const reply = await askLLM(text);
      const assistantMsg = { id: `a_${Date.now()}`, role: 'assistant', text: String(reply || 'Нет ответа.') };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text: 'Ошибка генерации ответа.' }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, askLLM, sendScale]);

  // рендер сообщения
  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
        <Text style={styles.bubbleText}>{item.text}</Text>
      </View>
    );
  };

  // рендер элемента чеклиста
  const renderChecklistItem = ({ item }) => (
    <Animated.View style={[styles.checklistItem, { opacity: checklistOpacity }]}>
      <TouchableOpacity
        onPress={() => toggleChecklistItem(item.id)}
        style={styles.checkbox}
      >
        <View style={[styles.checkboxBox, item.completed && styles.checkboxChecked]}>
          {item.completed && <Text style={styles.checkboxCheck}>✓</Text>}
        </View>
      </TouchableOpacity>
      <Text style={[styles.checklistText, item.completed && styles.completedText]}>
        {item.text}
      </Text>
      <TouchableOpacity
        onPress={() => deleteChecklistItem(item.id)}
        style={styles.deleteBtn}
      >
        <Text style={styles.deleteText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // прогресс чеклиста
  const progress = useMemo(() => {
    if (checklist.length === 0) return 0;
    const completed = checklist.filter(item => item.completed).length;
    return Math.round((completed / checklist.length) * 100);
  }, [checklist]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Assistant</Text>
        <TouchableOpacity onPress={toggleChecklist} style={styles.checklistToggle}>
          <Text style={styles.toggleText}>
            {showChecklist ? 'Hide' : 'Show'} Checklist ({checklist.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      {showChecklist && (
        <Animated.View style={[styles.checklistContainer, { opacity: checklistOpacity }]}>
          <View style={styles.checklistHeader}>
            <Text style={styles.checklistTitle}>Preparation Checklist</Text>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{progress}% Complete</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          </View>

          <FlatList
            data={checklist}
            keyExtractor={(item) => item.id}
            renderItem={renderChecklistItem}
            style={styles.checklistList}
            ListEmptyComponent={
              <Text style={styles.emptyChecklist}>No items yet. Ask about equipment or preparation!</Text>
            }
          />

          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={() => {
              Alert.prompt('Add Item', 'Enter checklist item:', (text) => {
                if (text) addChecklistItem(text);
              });
            }}
          >
            <Text style={styles.addItemText}>+ Add Item</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Спросите про маршрут, риски, снаряжение..."
          placeholderTextColor="#8da1c9"
          editable={!sending}
          autoFocus={true}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={onSend}
        />
        <Animated.View style={{ transform: [{ scale: sendScale }] }}>
          <TouchableOpacity style={[styles.sendBtn, sending && styles.sendBtnDisabled]} onPress={onSend} disabled={sending}>
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Send</Text>}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d2a', padding: 16, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  checklistToggle: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#5b6eff', borderRadius: 8 },
  toggleText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  list: { paddingVertical: 8, gap: 12 },
  bubble: {
    padding: 16,
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: '#5b6eff',
  },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a2145',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bubbleText: { color: '#ffffff', fontSize: 16, lineHeight: 22 },
  checklistContainer: {
    backgroundColor: '#1a2145',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  checklistHeader: { marginBottom: 12 },
  checklistTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  progressContainer: { gap: 4 },
  progressText: { fontSize: 14, color: '#93a4c8' },
  progressBar: { height: 6, backgroundColor: '#141a3a', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#5b6eff', borderRadius: 3 },
  checklistList: { maxHeight: 200 },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  checkbox: {
    padding: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#93a4c8',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#5b6eff',
    borderColor: '#5b6eff',
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checklistText: { flex: 1, color: '#ffffff', fontSize: 16, marginLeft: 8 },
  completedText: { textDecorationLine: 'line-through', color: '#93a4c8' },
  deleteBtn: { padding: 4 },
  deleteText: { color: '#ef4444', fontSize: 20, fontWeight: 'bold' },
  emptyChecklist: { color: '#93a4c8', textAlign: 'center', paddingVertical: 20, fontSize: 14 },
  addItemBtn: {
    backgroundColor: '#5b6eff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  addItemText: { color: '#fff', fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    backgroundColor: '#141a3a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    fontSize: 16,
  },
  sendBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5b6eff',
    shadowColor: '#5b6eff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
  sendText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});