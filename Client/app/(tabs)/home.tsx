import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Animated } from 'react-native';
import { useState, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,

    // NEW (replaces shouldShowAlert)
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
type PingPayload = {
  type: "PING";
  lat: number;
  lng: number;
  accuracy?: number;
  from?: string;
};



type Member = {
  id: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  status: 'safe' | 'alert';
};
function AnimatedBackground() {
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1, { toValue: 1, duration: 18000, useNativeDriver: true }),
        Animated.timing(orb1, { toValue: 0, duration: 18000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2, { toValue: 1, duration: 24000, useNativeDriver: true }),
        Animated.timing(orb2, { toValue: 0, duration: 24000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.bgOrb,
          {
            backgroundColor: "#6366F1",
            transform: [
              {
                translateX: orb1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-120, 120],
                }),
              },
              {
                translateY: orb1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-80, 60],
                }),
              },
              {
                scale: orb1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.15],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.bgOrb,
          {
            backgroundColor: "#8B5CF6",
            top: 320,
            left: -160,
            transform: [
              {
                translateX: orb2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [140, -140],
                }),
              },
              {
                scale: orb2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.1, 0.95],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

export default function HomeScreen() {
  const pingAnim = useRef(new Animated.Value(0)).current;
type LocationRow = {
  device_id: number;
  lat: number;
  lng: number;
  accuracy: number | null;
};
type GroupMessage = {
  id: number;
  device_id: number;
  city: string;
  text: string;
  created_at: string;
};

const SERVER_URL = "https://hackviolet.onrender.com";

const [myDeviceId, setMyDeviceId] = useState<number | null>(null);

const [messages, setMessages] = useState<GroupMessage[]>([]);
const [msgText, setMsgText] = useState("");
const [msgErr, setMsgErr] = useState<string | null>(null);
const [sending, setSending] = useState(false);

const [liveLocations, setLiveLocations] = useState<LocationRow[]>([]);
const [pingMarkers, setPingMarkers] = useState<Member[]>([]);
async function updateMyLocation(deviceId: number) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return;

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude: lat, longitude: lng, accuracy } = pos.coords;

  let city: string | null = null;
  try {
    const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    city =
      res[0]?.city ||
      res[0]?.subregion ||
      res[0]?.region ||
      null;
  } catch {}

  await fetch(`${SERVER_URL}/location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      lat,
      lng,
      accuracy,
      city,
    }),
  });
}

function triggerPing() {
  pingAnim.setValue(0);
  Animated.sequence([
    Animated.timing(pingAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }),
    Animated.timing(pingAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }),
  ]).start();
}

useEffect(() => {
  let alive = true;

  ensureDeviceId()
    .then(async id => {
      if (!alive) return;
      setMyDeviceId(id);
      await updateMyLocation(id); // 🔑 THIS is where city gets stored
    })
    .catch(console.error);

  return () => {
    alive = false;
  };
}, []);

async function getCity(lat: number, lng: number) {
  try {
    const res = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });

    const place = res[0];
    if (!place) return null;

    // prefer city, fall back sensibly
    return (
      place.city ||
      place.subregion ||
      place.region ||
      null
    );
  } catch {
    return null;
  }
}
async function loadMessages() {
  try {
    const res = await fetch(`${SERVER_URL}/messages`);
    const data = await res.json();
    if (Array.isArray(data)) setMessages(data);
  } catch (e) {
    // don't spam console
  }
}

useEffect(() => {
  let alive = true;

  const tick = async () => {
    if (!alive) return;
    await loadMessages();
  };

  tick();
  const id = setInterval(tick, 4000);

  return () => {
    alive = false;
    clearInterval(id);
  };
}, []);



useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as Partial<PingPayload>;

    if (data?.type === "PING" && typeof data.lat === "number" && typeof data.lng === "number") {
      triggerPing();
      handlePing(data.lat, data.lng);
    }
  });

  return () => sub.remove();
}, []);


useEffect(() => {
  let alive = true;

  const loadLocations = async () => {
    try {
      const res = await fetch("https://hackviolet.onrender.com/locations");
      const data = await res.json();
      if (alive) setLiveLocations(data);
    } catch (e) {
      console.error("Failed to load locations", e);
    }
  };

  loadLocations();
  const id = setInterval(loadLocations, 10_000); // poll

  return () => {
    alive = false;
    clearInterval(id);
  };
}, []);
useEffect(() => {
  let alive = true;

  ensureDeviceId()
    .then(id => {
      if (alive) setMyDeviceId(id);
    })
    .catch(err => {
      console.error("Device registration failed", err);
    });

  return () => {
    alive = false;
  };
}, []);


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
async function ensureDeviceId() {
  const stored = await AsyncStorage.getItem("deviceId");
  if (stored) return Number(stored);

  // get push token FIRST
  const token = (await Notifications.getExpoPushTokenAsync()).data;

  const res = await fetch("https://hackviolet.onrender.com/devices/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pushToken: token }),
  });

  if (!res.ok) {
    throw new Error("Failed to register device");
  }

  const { deviceId } = await res.json();
  await AsyncStorage.setItem("deviceId", String(deviceId));
  return deviceId;
}

async function sendPing() {
  if (!myDeviceId) {
    console.warn("No deviceId yet");
    return;
  }

  try {
    const res = await fetch("https://hackviolet.onrender.com/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: myDeviceId }),
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
  const [username, setUsername] = useState<string | null>(null);
const [stealth, setStealth] = useState(false);

useEffect(() => {
  (async () => {
    const u = await AsyncStorage.getItem("hv:username");
    const s = await AsyncStorage.getItem("hv:stealth");
    setUsername(u);
    setStealth(s === "true");
  })();
}, []);
async function sendMessage() {
  setMsgErr(null);

  if (!myDeviceId) {
    //setMsgErr("Device not ready yet");
    //return;
  }

  const cleaned = msgText.trim();
  if (!cleaned) return;

  setSending(true);
  try {
    const res = await fetch(`${SERVER_URL}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: username,
        text: cleaned,
      }),
    });

    if (!res.ok) {
      setMsgErr(await res.text());
      return;
    }

    setMsgText("");
    await loadMessages();
  } catch {
    setMsgErr("Network request failed");
  } finally {
    setSending(false);
  }
}
  

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

const mapRef = useRef<MapView>(null);

useEffect(() => {
  if (!liveLocations.length) return;

  mapRef.current?.animateToRegion({
    latitude: liveLocations[0].lat,
    longitude: liveLocations[0].lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }, 500);
}, [liveLocations]);


function handlePing(lat: number, lng: number) {
  const pingId = `ping-${Date.now()}`;

  setPingMarkers(p => [
    ...p,
    { id: pingId, name: "Ping", phone: "", lat, lng, status: "alert" },
  ]);

  setTimeout(() => {
    setPingMarkers(p => p.filter(x => x.id !== pingId));
  }, 60000);
}

useEffect(() => {
  const handlePingNotification = (data: any) => {
    if (data?.type !== "PING") return;

    const lat = Number(data.lat);
    const lng = Number(data.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn("Invalid ping payload", data);
      return;
    }

    // 1️⃣ animate banner
    triggerPing();

    // 2️⃣ add map marker
    handlePing(lat, lng);
  };

  const receivedSub = Notifications.addNotificationReceivedListener(n => {
    handlePingNotification(n.request.content.data);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener(r => {
    handlePingNotification(r.notification.request.content.data);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}, []);



  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Header */}
      <AnimatedBackground />
      <View style={styles.headerRow}>
        <Text style={styles.header}>Home</Text>
        <View style={{ flexDirection: "row", gap: 16 }}>
  <TouchableOpacity onPress={() => router.push('/settings')}>
    <Text style={styles.settings}>Settings</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => router.push('/')}>
    <Text style={styles.settings}>Calculator</Text>
  </TouchableOpacity>
</View>

      </View>
    <Animated.View
  style={{
    opacity: pingAnim,
    transform: [{
      scale: pingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.9, 1.05],
      }),
    }],
    backgroundColor: "#ff4444",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  }}
>
  {!stealth && (
  <Animated.View
    style={{
      opacity: pingAnim,
      transform: [{
        scale: pingAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1.05],
        }),
      }],
      backgroundColor: "#ff4444",
      padding: 14,
      borderRadius: 12,
      marginBottom: 12,
    }}
  >
    <Text style={{ color: "white", fontWeight: "700" }}>
      🚨 Incoming Ping
    </Text>
  </Animated.View>
)}
</Animated.View>


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
<Text style={styles.sectionTitle}>Group messages</Text>

<View style={styles.chatCard}>
  <View style={styles.chatList}>
    <ScrollView>
      {messages.slice().reverse().map(m => {
        
        const mine = myDeviceId != null && m.device_id === myDeviceId;
const label = mine
  ? username ?? "You"
  : m.city ?? "Unknown";
        return (
          <View key={m.id} style={[styles.chatBubble, mine ? styles.chatMine : styles.chatOther]}>
            <Text style={styles.chatMeta}>{label}:</Text>
            <Text style={styles.chatText}>{m.text}</Text>
          </View>
        );
      })}
      {messages.length === 0 && (
        <Text style={{ color: "#9CA3AF" }}>No messages in the last 2 hours.</Text>
      )}
    </ScrollView>
  </View>

  {msgErr && <Text style={{ color: "#FCA5A5", marginTop: 8 }}>{msgErr}</Text>}

  <View style={styles.chatInputRow}>
    <TextInput
      value={msgText}
      onChangeText={setMsgText}
      placeholder="Message the group…"
      placeholderTextColor="#6B7280"
      style={styles.chatInput}
      maxLength={280}
    />
    <TouchableOpacity
      onPress={sendMessage}
      disabled={sending || !msgText.trim()}
      style={[styles.chatSendBtn, (sending || !msgText.trim()) && { opacity: 0.6 }]}
    >
      <Text style={styles.chatSendText}>{sending ? "..." : "Send"}</Text>
    </TouchableOpacity>
  </View>
</View>

      {/* Map */}
      <Text style={styles.sectionTitle}>Live locations</Text>

      <View style={styles.mapCard}>
        <MapView style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: members[0]?.lat ?? 37.7749,
            longitude: members[0]?.lng ?? -122.4194,
            latitudeDelta: 20,
            longitudeDelta: 20,
          }}>
  {liveLocations.map(l => (
    <Marker
      key={`live-${l.device_id}`}
      coordinate={{
        latitude: l.lat,
        longitude: l.lng,
      }}
      pinColor="#3B82F6"
      title={`Device ${l.device_id}`}
    />
  ))}

  {pingMarkers.map(p => (
    <Marker
      key={p.id}
      coordinate={{ latitude: p.lat, longitude: p.lng }}
      pinColor="#EF4444"
      title="Incoming Ping"
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
  container: {
    flex: 1,
    backgroundColor: "#070A14",
    padding: 18,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 54,
    marginBottom: 18,
  },

  header: {
    fontSize: 34,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  settings: {
    color: "#A5B4FC",
    fontSize: 16,
    fontWeight: "500",
  },

  /* ===== Hero ===== */
  hero: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 22,
    shadowColor: "#6366F1",
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 12,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  heroSub: {
    marginTop: 8,
    color: "#E0E7FF",
    fontSize: 14,
    lineHeight: 20,
  },

  /* ===== Chat ===== */
  chatCard: {
    backgroundColor: "rgba(17,24,39,0.85)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  chatList: {
    maxHeight: 190,
    backgroundColor: "#070A14",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 10,
  },

  chatBubble: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    maxWidth: "88%",
  },

  chatMine: {
    alignSelf: "flex-end",
    backgroundColor: "#312E81",
    borderWidth: 1,
    borderColor: "#4F46E5",
  },

  chatOther: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  chatMeta: {
    color: "#A5B4FC",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.3,
  },

  chatText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 19,
  },

  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  chatInput: {
    flex: 1,
    height: 46,
    backgroundColor: "#1F2937",
    borderRadius: 14,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 14,
  },

  chatSendBtn: {
    marginLeft: 10,
    backgroundColor: "#6366F1",
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 18,
    justifyContent: "center",
    shadowColor: "#6366F1",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },

  chatSendText: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  /* ===== Sections ===== */
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 24,
  },

  /* ===== Map ===== */
  mapCard: {
    height: 240,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },

  /* ===== Members (if still used) ===== */
  memberCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },

  memberName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  memberSub: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 2,
  },

  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  safe: {
    backgroundColor: "#22C55E",
  },

  alert: {
    backgroundColor: "#EF4444",
  },
  bgOrb: {
  position: "absolute",
  width: 520,
  height: 520,
  borderRadius: 260,
  opacity: 0.18,
  top: -200,
  left: -120,
},

});
