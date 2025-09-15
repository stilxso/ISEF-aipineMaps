import { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, Modal } from 'react-native';
import { sendAiChat } from '../services/aiBackend';
import { getWeather } from '../services/weather';
import { useLocation } from '../contexts/LocationContext';
import { usePeaks } from '../contexts/PeaksContext';
import { updateUserPreparation, getAuthToken } from '../services/user';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import axios from 'axios';

import { loadData, saveData } from '../services/storage';

const initial = [{ id: 'sys', role: 'assistant', text: 'Привет! Я ИИ-помощник по горному туризму. Спрашивай про маршруты, погоду, снаряжение или безопасность в горах.' }];

export default function AIScreen() {
  const [messages, setMessages] = useState(initial);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [weather, setWeather] = useState(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [preparationData, setPreparationData] = useState(null);
  const [isChecklistActive, setIsChecklistActive] = useState(false);
  const [chats, setChats] = useState([{ id: 'default', name: 'Основной чат', messages: initial }]);
  const [currentChatId, setCurrentChatId] = useState('default');
  const [showChatModal, setShowChatModal] = useState(false);
  const { currentLocation, startWatching } = useLocation();
  const { peaks } = usePeaks();

  useEffect(() => {
    startWatching();
  }, [startWatching]);

  

  useEffect(() => {
    loadChatsFromStorage();
  }, []);

  const loadChatsFromStorage = async () => {
    const savedChats = await loadData('ai_chats');
    if (savedChats) {
      setChats(savedChats);
    }
  };

  const saveChatsToStorage = async (chatsToSave) => {
    await saveData('ai_chats', chatsToSave);
  };

  const createNewChat = () => {
    const newChatId = `chat_${Date.now()}`;
    const newChat = {
      id: newChatId,
      name: `Чат ${chats.length + 1}`,
      messages: [{ id: 'sys', role: 'assistant', text: 'Привет! Я ИИ-помощник по горному туризму. Спрашивай про маршруты, погоду, снаряжение или безопасность в горах.' }]
    };
    const updatedChats = [...chats, newChat];
    setChats(updatedChats);
    setCurrentChatId(newChatId);
    setMessages(newChat.messages);
    saveChatsToStorage(updatedChats);
  };

  const switchChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
    }
  };

  const currentChat = chats.find(c => c.id === currentChatId);

  const sendAIInteraction = async (message, response, important = false) => {
    try {
      await axios.post(`${API_BASE_URL}/api/hike/ai-interaction`, {
        message,
        response,
        timestamp: new Date().toISOString(),
        important,
        location: currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        } : null
      });
    } catch (error) {
      console.warn('Failed to send AI interaction data:', error);
    }
  };

  

  const startAIChecklist = async (peakId, routeName) => {
    setIsChecklistActive(true);
    setPreparationData({
      peakId,
      routeName,
      groupSize: null,
      experienceLevel: null,
      medicalConditions: null,
      emergencyContacts: [],
      equipment: [],
      dataConsent: null,
      timestamp: new Date().toISOString(),
    });

    setSending(true);
    setMessages(prev => [...prev, { id: `u_${Date.now()}`, role: 'user', text: `Подготовка к маршруту: ${routeName}` }]);

    try {
      
      const gpxUrl = `${API_BASE_URL}${ENDPOINTS.PEAKS.GPX}/${peakId}`;
      console.log('Attempting to fetch GPX from:', gpxUrl);
      const token = await getAuthToken();
      const gpxResponse = await axios.get(gpxUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const gpxContent = gpxResponse.data;

      const prompt = `Создай чек-лист подготовки для маршрута "${routeName}". GPX данные: ${gpxContent}

Текущая погода: ${weather ? `температура ${weather.temperature}°C, ${weather.description}, ветер ${weather.windSpeed} м/с` : 'погода неизвестна'}

Создай интерактивный чек-лист и задай вопросы о:
- Количестве участников
- Уровне опыта группы
- Медицинских особенностях
- Экипировке для каждого участника (рюкзак, обувь, одежда, аптечка и т.д.)
- Контактах для экстренных случаев
- Разрешении сохранить данные для спасателей

Используй формат с чекбоксами и нумерованными вопросами.`;

      const reply = await sendAiChat({
        messages: [
          { role: 'system', content: 'Помощник по горному туризму' },
          { role: 'user', content: `Подготовка к маршруту: ${routeName}` }
        ],
        routeIds: [peakId]
      });
      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text: reply?.answer || '—', formatted: true }]);
    } catch (error) {
      console.warn('Error in startAIChecklist:', error);
      console.warn('Error message:', error.message);
      console.warn('Error code:', error.code);
      if (error.response) {
        console.warn('Error response status:', error.response.status);
        console.warn('Error response data:', error.response.data);
      }
      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text: 'Ошибка при создании чек-листа.', formatted: false }]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (currentLocation) {
      fetchWeather();
    }
  }, [currentLocation, fetchWeather]);

  const fetchWeather = useCallback(async () => {
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
  }, [currentLocation]);

  const parsePreparationResponse = (text) => {
    const lowerText = text.toLowerCase();
    const updates = {};

    if (lowerText.includes('человек') || /\d+/.test(text)) {
      const match = text.match(/(\d+)/);
      if (match) updates.groupSize = parseInt(match[1]);
    }

    if (lowerText.includes('опыт') || lowerText.includes('уровень')) {
      if (lowerText.includes('новичок') || lowerText.includes('начин')) updates.experienceLevel = 'beginner';
      else if (lowerText.includes('средний') || lowerText.includes('опытный')) updates.experienceLevel = 'intermediate';
      else if (lowerText.includes('профессионал') || lowerText.includes('эксперт')) updates.experienceLevel = 'expert';
    }

    if (lowerText.includes('медицин') || lowerText.includes('здоровье') || lowerText.includes('аллерг')) {
      updates.medicalConditions = text;
    }

    if (lowerText.includes('экипировк') || lowerText.includes('рюкзак') || lowerText.includes('обувь') || lowerText.includes('одежда') || lowerText.includes('аптечка')) {
      updates.equipment = text;
    }

    if (lowerText.includes('контакт') || lowerText.includes('телефон') || /\+\d+/.test(text)) {
      updates.emergencyContacts = [text];
    }

    if (lowerText.includes('да') || lowerText.includes('соглас') || lowerText.includes('разреш')) {
      updates.dataConsent = true;
    } else if (lowerText.includes('нет') || lowerText.includes('отказ')) {
      updates.dataConsent = false;
    }

    return updates;
  };

  const savePreparationData = async (data) => {
    if (!data.dataConsent) return;

    try {
      await updateUserPreparation({
        hikeSession: {
          peakId: data.peakId,
          routeName: data.routeName,
          groupSize: data.groupSize,
          experienceLevel: data.experienceLevel,
          medicalConditions: data.medicalConditions,
          equipment: data.equipment,
          emergencyContacts: data.emergencyContacts,
          timestamp: data.timestamp,
        },
        dataRetentionConsent: true,
      });
      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text: '✅ Данные сохранены для экстренных случаев. Спасатели смогут получить доступ к вашей информации при необходимости.', formatted: false }]);
    } catch (error) {
      console.warn('Error saving preparation data:', error);
      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text: '⚠️ Не удалось сохранить данные. Проверьте подключение к интернету.', formatted: false }]);
    }
  };

  const onSend = async () => {
    const txt = input.trim();
    if (!txt || sending) return;
    setSending(true);
    const userMessage = { id: `u_${Date.now()}`, role: 'user', text: txt };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');

    try {
      if (isChecklistActive && preparationData) {
        const updates = parsePreparationResponse(txt);
        if (Object.keys(updates).length > 0) {
          setPreparationData(prev => ({ ...prev, ...updates }));

          if (updates.dataConsent === true) {
            await savePreparationData({ ...preparationData, ...updates });
            setIsChecklistActive(false);
            setPreparationData(null);
            return;
          } else if (updates.dataConsent === false) {
            const assistantMessage = { id: `a_${Date.now()}`, role: 'assistant', text: 'Понятно, данные не будут сохранены. Чек-лист готов к использованию!', formatted: false };
            const finalMessages = [...updatedMessages, assistantMessage];
            setMessages(finalMessages);
            updateCurrentChat(finalMessages);
            setIsChecklistActive(false);
            setPreparationData(null);
            return;
          }
        }
      }

      const prompt = `Пользователь спросил: "${txt}"

Текущая погода: ${weather ? `температура ${weather.temperature}°C, ${weather.description}, ветер ${weather.windSpeed} м/с` : 'погода неизвестна'}

Ответь как ИИ-помощник по горному туризму на русском языке. Используй markdown форматирование для лучшей читаемости:
- **жирный текст** для важных моментов
- *курсив* для выделения
- - маркированные списки для перечислений
- 1. 2. 3. нумерованные списки для последовательностей
- ### Заголовки для разделов

Будь полезным, точным и основывайся только на достоверной информации.`;

      const reply = await sendAiChat({
        messages: [
          { role: 'system', content: 'Помощник по горному туризму' },
          ...updatedMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
        ]
      });
      const assistantMessage = { id: `a_${Date.now()}`, role: 'assistant', text: reply?.answer || '—', formatted: true };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      updateCurrentChat(finalMessages);

      
      const important = response.includes('безопасность') || response.includes('риск') || response.includes('экстренн') ||
                        response.includes('погода') || response.includes('температура') || response.includes('ветер');
      if (important) {
        await sendAIInteraction(txt, response, true);
      }
    } catch (error) {
      console.warn('Gemini API error:', error);
      const errorMessage = { id: `a_${Date.now()}`, role: 'assistant', text: 'Извините, произошла ошибка при обработке запроса.', formatted: false };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      updateCurrentChat(finalMessages);
    } finally {
      setSending(false);
    }
  };

  const updateCurrentChat = (newMessages) => {
    const updatedChats = chats.map(chat =>
      chat.id === currentChatId ? { ...chat, messages: newMessages } : chat
    );
    setChats(updatedChats);
    saveChatsToStorage(updatedChats);
  };

  const parseMarkdown = (text) => {
    const parts = [];
    const lines = text.split('\n');
    let key = 0;

    lines.forEach((line, index) => {
      if (line.startsWith('### ')) {
        parts.push(
          <Text key={key++} style={[styles.msgText, styles.header]}>
            {line.substring(4)}
          </Text>
        );
        return;
      }

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

      if (line.startsWith('- ')) {
        parts.push(
          <View key={key++} style={styles.listItem}>
            <Text style={[styles.msgText, styles.listBullet]}>• </Text>
            <Text style={styles.msgText}>{parseInlineMarkdown(line.substring(2))}</Text>
          </View>
        );
        return;
      }

      if (line.trim()) {
        parts.push(
          <Text key={key++} style={styles.msgText}>
            {parseInlineMarkdown(line)}
          </Text>
        );
      }

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

    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <Text key={key++} style={styles.msgText}>
            {text.substring(lastIndex, match.index)}
          </Text>
        );
      }

      parts.push(
        <Text key={key++} style={[styles.msgText, styles.bold]}>
          {match[1]}
        </Text>
      );

      lastIndex = match.index + match[0].length;
    }

    const italicRegex = /\*(.*?)\*/g;
    let italicParts = [];
    if (parts.length === 0) {
      italicParts = [text];
    } else {
      if (lastIndex < text.length) {
        italicParts = [text.substring(lastIndex)];
      }
    }

    italicParts.forEach(part => {
      let italicLastIndex = 0;
      let italicKey = key;

      let italicMatch;
      while ((italicMatch = italicRegex.exec(part)) !== null) {
        if (italicMatch.index > italicLastIndex) {
          parts.push(
            <Text key={italicKey++} style={styles.msgText}>
              {part.substring(italicLastIndex, italicMatch.index)}
            </Text>
          );
        }

        parts.push(
          <Text key={italicKey++} style={[styles.msgText, styles.italic]}>
            {italicMatch[1]}
          </Text>
        );

        italicLastIndex = italicMatch.index + italicMatch[0].length;
      }

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
          <TouchableOpacity onPress={() => setShowChatModal(true)} style={styles.chatBtn}>
            <Text style={styles.chatText}>Чаты</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowRouteModal(true)} style={styles.routeBtn}>
            <Text style={styles.routeText}>Выбрать маршрут</Text>
          </TouchableOpacity>
          <TextInput value={input} onChangeText={setInput} style={styles.input} placeholder="Спросите что-нибудь про поход..." placeholderTextColor="#93a4c8" onSubmitEditing={onSend} />
          <TouchableOpacity onPress={onSend} style={[styles.sendBtn, sending && { opacity: 0.6 }]}>
            <Text style={styles.sendText}>{sending ? '...' : 'Отправить'}</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showRouteModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Выберите маршрут</Text>
              <FlatList
                data={peaks}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      startAIChecklist(item.id, item.title);
                      setShowRouteModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.title}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>Нет доступных маршрутов</Text>}
              />
              <TouchableOpacity onPress={() => setShowRouteModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeText}>Закрыть</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>


        <Modal visible={showChatModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Чаты</Text>
              <TouchableOpacity style={styles.newChatBtn} onPress={() => { createNewChat(); setShowChatModal(false); }}>
                <Text style={styles.newChatText}>+ Новый чат</Text>
              </TouchableOpacity>
              <FlatList
                data={chats}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, item.id === currentChatId && styles.modalItemActive]}
                    onPress={() => { switchChat(item.id); setShowChatModal(false); }}
                  >
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    <Text style={styles.modalItemSub}>{item.messages.length - 1} сообщений</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>Нет чатов</Text>}
              />
              <TouchableOpacity onPress={() => setShowChatModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeText}>Закрыть</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    paddingBottom: Platform.OS === 'ios' ? 104 : 92,
  },
  input: { flex: 1, backgroundColor: '#141a3a', borderRadius: 10, paddingHorizontal: 12, color: '#fff' },
  sendBtn: { backgroundColor: '#5b6eff', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
  routeBtn: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', marginRight: 8 },
  routeText: { color: '#fff', fontWeight: '700' },
  chatBtn: { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', marginRight: 8 },
  chatText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#0b0d2a', borderRadius: 14, padding: 20, width: '80%', maxHeight: '60%' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  newChatBtn: { backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 12, marginBottom: 16, alignItems: 'center' },
  newChatText: { color: '#fff', fontWeight: '700' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalItemActive: { backgroundColor: 'rgba(99,102,241,0.2)' },
  modalItemText: { color: '#fff', fontSize: 16 },
  modalItemSub: { color: '#93a4c8', fontSize: 12, marginTop: 4 },
  closeBtn: { backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 12, marginTop: 16, alignItems: 'center' },
  closeText: { color: '#fff', fontWeight: '700' },
});
