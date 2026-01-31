import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Animated } from 'react-native';
import { useState, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,

    // NEW (replaces shouldShowAlert)
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


type Member = {
  id: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  status: 'safe' | 'alert';
};

export default function HomeScreen() {
const deviceToken = "...";
const circleId = "...";
const [members, setMembers] = useState<Member[]>([
    {
      id: '1',
      name: 'Alex',
      phone: '123-456-7890',
      lat: 37.7749,
      lng: -122.4194,
      status: 'safe',
    },
  ]);

async function sendPing() {
  try {
    const res = await fetch("https://YOUR_API_URL/v1/ping", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deviceToken}`, // REAL value
      },
      body: JSON.stringify({
        circleId, // REAL value
      }),
    });

    if (!res.ok) {
      console.warn("Ping failed", await res.text());
    }
  } catch (e) {
    console.error("Ping error", e);
  }
}

  const router = useRouter();
  const [phone, setPhone] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  

  const addMember = () => {
  if (!phone) return;

  setMembers(m => [
    ...m,
    {
      id: Date.now().toString(),
      name: 'New Member',
      phone,
      lat: 0,
      lng: 0,
      status: 'safe',
    },
  ]);

  setPhone('');
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 600,
    useNativeDriver: true,
  }).start();
};



function handlePing(lat: number, lng: number) {
  const pingId = `ping-${Date.now()}`;

  setMembers(m => [
    ...m,
    {
      id: pingId,
      name: "Ping",
      phone: "",
      lat,
      lng,
      status: "alert",
    },
  ]);

  setTimeout(() => {
    setMembers(m => m.filter(x => x.id !== pingId));
  }, 60_000);
}
useEffect(() => {
  const sub = Notifications.addNotificationReceivedListener(notification => {
    const data = notification.request.content.data as any;

    if (data?.type === "PING") {
      const lat = Number(data.lat);
      const lng = Number(data.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn("Invalid ping payload", data);
        return;
      }

      handlePing(lat, lng);
    }
  });

  return () => sub.remove();
}, []);
useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as any;

    if (data?.type === "PING") {
      handlePing(Number(data.lat), Number(data.lng));
    }
  });

  return () => sub.remove();
}, []);


  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Home</Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Text style={styles.settings}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Gradient Hero */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>Connected Circle</Text>
        <Text style={styles.heroSub}>
          See where your people are. Get alerts when it matters.
        </Text>
      </LinearGradient>

      {/* Add Member */}
      <View style={styles.addCard}>
        <Text style={styles.sectionTitle}>Add member</Text>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Phone number"
            placeholderTextColor="#6B7280"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addMember}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <Text style={styles.sectionTitle}>Live locations</Text>

      <View style={styles.mapCard}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: members[0]?.lat ?? 37.7749,
            longitude: members[0]?.lng ?? -122.4194,
            latitudeDelta: 20,
            longitudeDelta: 20,
          }}
        >
          {members.map(m => (
            <Marker
              key={m.id}
              coordinate={{ latitude: m.lat, longitude: m.lng }}
              title={m.name}
              pinColor={m.status === 'safe' ? '#22C55E' : '#EF4444'}
            />
          ))}
        </MapView>
      </View>

      {/* Members List */}
      <Text style={styles.sectionTitle}>Members</Text>

      {members.map(m => (
        <Animated.View key={m.id} style={[styles.memberCard, { opacity: fadeAnim }]}>
          <View>
            <Text style={styles.memberName}>{m.name}</Text>
            <Text style={styles.memberSub}>{m.phone}</Text>
            <TouchableOpacity
  onPress={() => sendPing()}
  style={{ marginTop: 8 }}
>
  <Text style={{ color: "#A5B4FC" }}>Ping</Text>
</TouchableOpacity>
          </View>

          <View
            style={[
              styles.statusDot,
              m.status === 'safe' ? styles.safe : styles.alert,
            ]}
          />
        </Animated.View>
        

      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
    padding: 16,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    marginBottom: 16,
  },

  header: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  settings: {
    color: '#A5B4FC',
    fontSize: 16,
  },

  hero: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },

  heroTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  heroSub: {
    marginTop: 6,
    color: '#E0E7FF',
    fontSize: 14,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 10,
    marginTop: 20,
  },

  addCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#FFFFFF',
  },

  addBtn: {
    marginLeft: 10,
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
  },

  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },

  mapCard: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },

  memberCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  memberName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },

  memberSub: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },

  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  safe: {
    backgroundColor: '#22C55E',
  },

  alert: {
    backgroundColor: '#EF4444',
  },
});
