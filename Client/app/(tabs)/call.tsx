import { View, Text, StyleSheet, TouchableOpacity, Vibration, Platform, Pressable } from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system'; // <--- NEW IMPORT
import { Ionicons, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function CallScreen() {
  const router = useRouter();
  const [callState, setCallState] = useState<'INCOMING' | 'CONNECTED'>('INCOMING');
  const [timer, setTimer] = useState(0);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const vibrationInterval = useRef<any>(null);

  const RINGTONE_URI = 'https://www.soundjay.com/phone/phone-ringing-1.mp3'; 

  // ⚠️ UPDATE THIS WITH YOUR RENDER URL or Local IP
  const SERVER_URL = 'https://hackviolet.onrender.com'; 

  // --- 1. PERMISSIONS ---
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') alert('Permission to access microphone is required!');
      })();
    }, [])
  );
  async function getAICallConfig() {
  try {
    const raw = await AsyncStorage.getItem("hv:passcode_rules_v1");
    if (!raw) throw new Error("No rules");

    const rules = JSON.parse(raw);

    const aiRule = rules.find(
      (r: any) => r.action?.type === "ai_call"
    );

    if (!aiRule) throw new Error("No AI rule");

    return {
      persona: aiRule.action.config.persona,
      prompt: aiRule.action.config.prompt,
    };
  } catch {
    // 🔒 hard fallback (never crash call UI)
    return {
      persona: "protective father named Jim",
      prompt: "Call and casually check in. Sound normal.",
    };
  }
}


const wakeUpDad = async () => {
  try {
    console.log("Waking up AI caller...");

    const { persona, prompt } = await getAICallConfig();

    const response = await fetch(`${SERVER_URL}/api/wake-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona, prompt }),
    });

    if (!response.ok) throw new Error("Wake up failed");

    const blob = await response.blob();
    const reader = new FileReader();
    reader.readAsDataURL(blob);

    reader.onloadend = async () => {
      const base64Uri = reader.result as string;

      if (soundRef.current) {
        try { await soundRef.current.unloadAsync(); } catch {}
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: base64Uri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
    };
  } catch (e) {
    console.error("Wake up error:", e);
  }
};


  // --- 3. UPLOAD & PLAY RESPONSE (SECURE) ---
  const uploadAudio = async (uri: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const { persona, prompt } = await getAICallConfig();

      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/m4a', 
        name: 'upload.m4a',
      } as any);

      const response = await fetch(`${SERVER_URL}/api/talk-audio`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.ok) throw new Error(`Server Error: ${response.status}`);

      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        const base64Uri = reader.result as string;
        
        if (soundRef.current) {
          try { await soundRef.current.unloadAsync(); } catch (e) {}
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: base64Uri },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      };

    } catch (error) {
      console.error("Upload failed:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      // --- 🔐 SECURITY: DELETE FROM PHONE ---
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        console.log('🔒 Secure delete: Phone cache cleared.');
      } catch (e) {
        console.log('Error deleting temp file:', e);
      }
    }
  };

  // --- 4. RECORDING LOGIC ---
  const startRecording = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsRecording(true);
      if (soundRef.current) {
         try { await soundRef.current.stopAsync(); } catch (e) {}
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
    } catch (err) { console.error('Failed to start recording', err); }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (!recordingRef.current) return;
    
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI(); 
    recordingRef.current = null;
    
    if (uri) await uploadAudio(uri);
  };

  // --- 5. CALL CONTROL LOGIC ---
  useFocusEffect(
    useCallback(() => {
      setCallState('INCOMING');
      setTimer(0);
      setIsMuted(false);
      setIsSpeaker(false);
      setShowKeypad(false);

      const startRinging = async () => {
        try {
          await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
          const { sound } = await Audio.Sound.createAsync(
            { uri: RINGTONE_URI },
            { shouldPlay: true, isLooping: true }
          );
          soundRef.current = sound;
        } catch (e) {}
        
        const triggerVibration = () => {
             const duration = Platform.OS === 'ios' ? 400 : 1000; 
             Vibration.vibrate(duration);
        };
        triggerVibration();
        vibrationInterval.current = setInterval(triggerVibration, 1200);
      };

      startRinging();
      return () => { stopRinging(); };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let interval: any;
      if (callState === 'CONNECTED') {
        interval = setInterval(() => { setTimer((t) => t + 1); }, 1000);
      }
      return () => clearInterval(interval);
    }, [callState])
  );

  const stopRinging = async () => {
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch (e) {}
    }
    if (vibrationInterval.current) {
      clearInterval(vibrationInterval.current);
      vibrationInterval.current = null;
    }
    Vibration.cancel();
  };

  const handleAccept = async () => {
    await stopRinging();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCallState('CONNECTED');
    wakeUpDad(); 
  };

  const handleDecline = async () => {
    await stopRinging();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const Keypad = () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    return (
      <View style={styles.keypadContainer}>
        <View style={styles.keypadGrid}>
          {keys.map((k) => (
             <TouchableOpacity key={k} style={styles.keypadButton} onPress={() => Haptics.selectionAsync()}>
                <Text style={styles.keypadText}>{k}</Text>
             </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setShowKeypad(false)} style={styles.hideKeypadBtn}>
            <Text style={styles.hideKeypadText}>Hide</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (callState === 'INCOMING') {
    return (
      <View style={styles.background}>
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="filter-circle-outline" size={26} color="rgba(255,255,255,0.6)" />
                <Ionicons name="information-circle-outline" size={28} color="rgba(255,255,255,0.6)" />
            </View>
            <View style={styles.contentIncoming}>
                <Text style={styles.sharedNameText}>Dad</Text>
                <Text style={styles.statusText}>Mobile...</Text>
            </View>
            <View style={styles.controlsAreaIncoming}>
                <View style={styles.controlColumn}>
                    <TouchableOpacity style={styles.auxButton}>
                        <View style={styles.auxIconCircle}>
                            <Ionicons name="chatbubble-sharp" size={22} color="#FFF" />
                        </View>
                        <Text style={styles.auxText}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDecline} style={styles.mainButtonDecline}>
                        <Ionicons name="call" size={36} color="#FFF" style={styles.phoneIconDown} />
                    </TouchableOpacity>
                    <Text style={styles.mainButtonLabel}>Decline</Text>
                </View>
                <View style={styles.controlColumn}>
                    <TouchableOpacity style={styles.auxButton}>
                        <View style={styles.auxIconCircle}>
                             <Entypo name="voicemail" size={24} color="#FFF" />
                        </View>
                        <Text style={styles.auxText}>Voicemail</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAccept} style={styles.mainButtonAccept}>
                        <Ionicons name="call" size={36} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.mainButtonLabel}>Accept</Text>
                </View>
            </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <Pressable style={styles.background} onPressIn={startRecording} onPressOut={stopRecording}>
      <SafeAreaView style={styles.container}>
        <View style={styles.contentConnected}>
            <View style={styles.dynamicIslandSpacer} /> 
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                {isRecording && <View style={styles.recordingDot} />}
                <Text style={styles.timerText}>{formatTimer(timer)}</Text>
            </View>
            <Text style={styles.sharedNameText}>Dad</Text>
        </View>

        {showKeypad ? (
            <Keypad />
        ) : (
            <View style={styles.gridContainer}>
                <View style={styles.gridRow}>
                    <GridButton icon="volume-high" label="Audio" isActive={isSpeaker} onPress={() => setIsSpeaker(!isSpeaker)} />
                    <GridButton icon="videocam" label="FaceTime" />
                    <GridButton icon="mic-off" label="Mute" isActive={isMuted} onPress={() => setIsMuted(!isMuted)} />
                </View>
                <View style={styles.gridRow}>
                    <GridButton icon="person-add" label="Add" />
                    <View style={styles.gridItem}>
                        <TouchableOpacity onPress={handleDecline} style={styles.endCallButton} onPressIn={(e) => e.stopPropagation()}>
                             <Ionicons name="call" size={32} color="#FFF" style={styles.phoneIconDown} />
                        </TouchableOpacity>
                        <Text style={styles.gridLabel}>End</Text>
                    </View>
                    <GridButton icon="keypad" label="Keypad" onPress={() => setShowKeypad(true)} />
                </View>
            </View>
        )}
      </SafeAreaView>
    </Pressable>
  );
}

const GridButton = ({ icon, label, isActive = false, onPress }: { icon: any, label: string, isActive?: boolean, onPress?: () => void }) => (
    <View style={styles.gridItem}>
        <TouchableOpacity style={[styles.gridIconCircle, isActive && styles.gridIconCircleActive]} onPress={(e) => { e.stopPropagation(); Haptics.selectionAsync(); if (onPress) onPress(); }}>
            <Ionicons name={icon} size={35} color={isActive ? "#000" : "#FFF"} />
        </TouchableOpacity>
        <Text style={styles.gridLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1C1C1E' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 15 },
  contentIncoming: { marginTop: 50, alignItems: 'center' },
  sharedNameText: { fontSize: 40, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 8 },
  statusText: { fontSize: 20, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  controlsAreaIncoming: { position: 'absolute', bottom: 50, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  contentConnected: { marginTop: 20, alignItems: 'center' },
  dynamicIslandSpacer: { height: 40 },
  timerText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: 4 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },
  gridContainer: { position: 'absolute', bottom: 50, left: 20, right: 20, gap: 20 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-around' },
  gridItem: { alignItems: 'center', width: 80 },
  gridIconCircle: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  gridIconCircleActive: { backgroundColor: '#FFFFFF' },
  endCallButton: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  gridLabel: { color: '#FFF', fontSize: 13, fontWeight: '500' },
  keypadContainer: { position: 'absolute', bottom: 40, left: 30, right: 30, alignItems: 'center' },
  keypadGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20, marginBottom: 20 },
  keypadButton: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginHorizontal: 10 },
  keypadText: { color: '#FFF', fontSize: 32, fontWeight: '500' },
  hideKeypadBtn: { marginTop: 10, padding: 10 },
  hideKeypadText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  controlColumn: { alignItems: 'center', gap: 30 },
  auxButton: { alignItems: 'center', gap: 8 },
  auxIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  auxText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  mainButtonDecline: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center' },
  mainButtonAccept: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#30D158', justifyContent: 'center', alignItems: 'center' },
  phoneIconDown: { transform: [{ rotate: '135deg' }] },
  mainButtonLabel: { color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 8 }
});