import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';

const initial = [{ id: 'sys', role: 'assistant', text: 'Привет! Спрашивай про маршруты, погоду, снаряжение или безопасность в горах.' }];

export default function AIScreen() {
  const [messages, setMessages] = useState(initial);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const replyTo = useCallback((text) => {
    const lower = text.toLowerCase();
    if (/(погода|weather|ветер|температ|осадки)/.test(lower)) {
      return 'Похоже, вы спрашиваете про погоду. Перед походом проверьте прогноз и учтите порывы ветра и осадки.';
    }
    if (/(снаряжение|рюкзак|пал(к|ка)|спальник|экипиров)/.test(lower)) {
      return 'Рекомендации по снаряжению: ботинки, тёплая одежда, дождевик, аптечка, запас воды и еды, карта/компас/GPS.';
    }
    if (/(маршрут|время|скорость|дистанци)/.test(lower)) {
      return 'Для оценки времени учитывайте профиль трека и набор высоты. Рассчитывайте 300–500 м подъёма = +1 час на сложный рельеф.';
    }
    // если не по теме
    return 'Давайте поговорим о походах, маршрутах, погоде или снаряжении. Пожалуйста, уточните вопрос.';
  }, []);

  const onSend = async () => {
    const txt = input.trim();
    if (!txt || sending) return;
    setSending(true);
    setMessages(prev => [...prev, { id: `u_${Date.now()}`, role: 'user', text: txt }]);
    setInput('');

    setTimeout(() => {
      const r = replyTo(txt);
      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text: r }]);
      setSending(false);
    }, 500);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.msg, item.role === 'user' ? styles.user : styles.assistant]}>
      <Text style={styles.msgText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList data={messages} keyExtractor={m => m.id} renderItem={renderItem} contentContainerStyle={{ padding: 12 }} />
      <View style={styles.inputRow}>
        <TextInput value={input} onChangeText={setInput} style={styles.input} placeholder="Спросите что-нибудь про поход..." placeholderTextColor="#93a4c8" onSubmitEditing={onSend} />
        <TouchableOpacity onPress={onSend} style={[styles.sendBtn, sending && { opacity: 0.6 }]}>
          <Text style={styles.sendText}>{sending ? '...' : 'Отправить'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d2a' },
  msg: { padding: 12, borderRadius: 12, marginVertical: 6, maxWidth: '85%' },
  user: { backgroundColor: '#5b6eff', alignSelf: 'flex-end' },
  assistant: { backgroundColor: '#1a2145', alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  msgText: { color: '#fff' },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  input: { flex: 1, backgroundColor: '#141a3a', borderRadius: 10, paddingHorizontal: 12, color: '#fff' },
  sendBtn: { backgroundColor: '#5b6eff', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
});
