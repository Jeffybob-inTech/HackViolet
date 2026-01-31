import { View, Text, StyleSheet, TouchableOpacity, Image, Vibration, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons'; // Built into Expo

export default function CallScreen() {
  const router = useRouter();
  const [callState, setCallState] = useState<'INCOMING' | 'CONNECTED'>('INCOMING');
  const [timer, setTimer] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // --- ASSETS (Replace these with real URLs or local requires later) ---
  // For demo, we use a generic ringtone URL if you don't have a file yet
  const RINGTONE_URI = 'https://www.soundjay.com/phone/phone-ringing-1.mp3'; 

  // --- 1. SETUP INCOMING CALL (Ringing + Vibration) ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startRinging = async () => {
      // Setup Audio Mode to play even if switch is on silent (iOS)
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Load & Loop Ringtone
      const { sound } = await Audio.Sound.createAsync(
        { uri: RINGTONE_URI },
        { shouldPlay: true, isLooping: true }
      );
      soundRef.current = sound;

      // Vibration Pattern (0.5s on, 1s off)
      const VIBE_PATTERN = [0, 500, 1000]; 
      Vibration.vibrate(VIBE_PATTERN, true); // true = loop
    };

    startRinging();

    return () => {
      stopRinging();
    };
  }, []);

  // --- 2. TIMER LOGIC (Once Connected) ---
  useEffect(() => {
    let interval: any;
    if (callState === 'CONNECTED') {
      interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // --- HELPER FUNCTIONS ---
  const stopRinging = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
    }
    Vibration.cancel();
  };

  const handleAccept = async () => {
    await stopRinging();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCallState('CONNECTED');
    
    // TODO: HERE IS WHERE WE WILL TRIGGER THE "DAD" VOICE API LATER
    // playDadIntro(); 
  };

  const handleDecline = async () => {
    await stopRinging();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    router.replace('/'); // Go back to Calculator
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- RENDER: INCOMING STATE ---
  if (callState === 'INCOMING') {
    return (
      <View style={styles.container}>
        <View style={styles.topContainer}>
          <View style={styles.avatarPlaceholder}>
             <Ionicons name="person" size={60} color="#FFF" />
          </View>
          <Text style={styles.contactName}>Dad</Text>
          <Text style={styles.contactStatus}>Mobile...</Text>
        </View>

        <View style={styles.bottomContainer}>
          <View style={styles.actionRow}>
            {/* DECLINE BUTTON */}
            <TouchableOpacity onPress={handleDecline} style={[styles.actionBtn, styles.declineBtn]}>
              <Ionicons name="call" size={32} color="#FFF" />
              <Text style={styles.btnLabel}>Decline</Text>
            </TouchableOpacity>

            {/* ACCEPT BUTTON */}
            <TouchableOpacity onPress={handleAccept} style={[styles.actionBtn, styles.acceptBtn]}>
              <Ionicons name="call" size={32} color="#FFF" />
              <Text style={styles.btnLabel}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // --- RENDER: CONNECTED STATE ---
  return (
    <View style={styles.container}>
      <View style={styles.topContainer}>
        <View style={styles.avatarPlaceholderSmall}>
           <Ionicons name="person" size={40} color="#FFF" />
        </View>
        <Text style={styles.contactName}>Dad</Text>
        <Text style={styles.timer}>{formatTime(timer)}</Text>
      </View>

      {/* FAKE CALL CONTROLS */}
      <View style={styles.gridContainer}>
        <ControlIcon icon="mic-off" label="mute" />
        <ControlIcon icon="keypad" label="keypad" />
        <ControlIcon icon="volume-high" label="speaker" />
        <ControlIcon icon="add" label="add call" />
        <ControlIcon icon="videocam" label="FaceTime" />
        <ControlIcon icon="person-circle" label="contacts" />
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity onPress={handleDecline} style={[styles.actionBtn, styles.declineBtn, { width: 80 }]}>
           <Ionicons name="call" size={32} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Dumb Component for the Fake Buttons
const ControlIcon = ({ icon, label }: { icon: any, label: string }) => (
  <View style={styles.gridItem}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={32} color="#FFF" />
    </View>
    <Text style={styles.gridLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1215', // Dark grey/black background like iOS
    paddingTop: 80,
    paddingBottom: 40,
  },
  topContainer: {
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPlaceholderSmall: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactName: {
    fontSize: 36,
    color: '#FFF',
    fontWeight: '400',
  },
  contactStatus: {
    fontSize: 20,
    color: '#FFF',
    marginTop: 10,
    opacity: 0.8,
  },
  timer: {
    fontSize: 20,
    color: '#FFF',
    marginTop: 10,
  },
  bottomContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionBtn: {
    width: 75,
    height: 75,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  acceptBtn: {
    backgroundColor: '#30D158', // iOS Green
  },
  declineBtn: {
    backgroundColor: '#FF3B30', // iOS Red
  },
  btnLabel: {
    color: '#FFF',
    marginTop: 85, // Push text below button
    position: 'absolute',
    fontSize: 14,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  gridItem: {
    width: '33%',
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(255,255,255,0.1)', // Optional glassy look
  },
  gridLabel: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 5,
  },
});