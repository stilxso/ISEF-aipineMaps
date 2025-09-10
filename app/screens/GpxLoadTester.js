// app/screens/GpxLoadTester.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { testLoadDummyGpx } from '../services/gpxTester';

export default function GpxLoadTester() {
  const [status, setStatus] = useState('idle');
  const [markers, setMarkers] = useState([]);
  const [localPath, setLocalPath] = useState(null);
  const [error, setError] = useState(null);

  const runTest = async () => {
    setStatus('loading');
    setMarkers([]);
    setError(null);
    try {
      const res = await testLoadDummyGpx();
      if (res.success) {
        setStatus('ok');
        setMarkers(res.markers || []);
        setLocalPath(res.localPath || null);
      } else {
        setStatus('error');
        setError(res.error || 'unknown');
      }
    } catch (e) {
      setStatus('error');
      setError(String(e?.message || e));
    }
  };

  useEffect(() => { runTest(); }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GPX Load Tester</Text>
      <Text style={styles.line}>Status: <Text style={[styles.badge, status === 'ok' ? styles.ok : status === 'loading' ? styles.loading : styles.err]}>{status}</Text></Text>
      {localPath ? <Text style={styles.small}>Local: {localPath.split('/').pop()}</Text> : null}
      {error ? <Text style={styles.errText}>{error}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={runTest}><Text style={styles.btnText}>Run test</Text></TouchableOpacity>
      <ScrollView style={styles.list} contentContainerStyle={{ padding: 12 }}>
        {markers.length === 0 ? <Text style={styles.empty}>No markers found</Text> : markers.map((m) => (
          <View key={m.id} style={styles.item}>
            <Text style={styles.itemTitle}>{m.title || m.type || m.id}</Text>
            <Text style={styles.itemText}>{m.type} — {m.latitude}, {m.longitude}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ /* стили как выше — скопируйте из предыдущего сообщения */ container:{flex:1,backgroundColor:'#0b0d2a',padding:16}, title:{color:'#fff',fontSize:20,fontWeight:'800',marginBottom:8}, line:{color:'#93a4c8',marginBottom:6}, small:{color:'#bfc7d6',marginBottom:8}, badge:{fontWeight:'800'}, ok:{color:'#22c55e'}, loading:{color:'#f59e0b'}, err:{color:'#ef4444'}, errText:{color:'#ef4444',marginBottom:8}, btn:{backgroundColor:'#5b6eff',padding:12,borderRadius:8,alignItems:'center',marginBottom:12}, btnText:{color:'#fff',fontWeight:'800'}, list:{flex:1,marginTop:8}, empty:{color:'#93a4c8',textAlign:'center',marginTop:24}, item:{backgroundColor:'#1a2145',padding:10,borderRadius:8,marginBottom:10}, itemTitle:{color:'#fff',fontWeight:'800'}, itemText:{color:'#bfc7d6',marginTop:4} });
