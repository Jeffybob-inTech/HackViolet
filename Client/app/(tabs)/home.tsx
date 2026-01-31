import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

type Member = {
  id: string;
  name: string;
  phone: string;
  status: 'safe' | 'alert';
  lastSeen: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [members, setMembers] = useState<Member[]>([
    {
      id: '1',
      name: 'Alex',
      phone: '123-456-7890',
      status: 'safe',
      lastSeen: '5 min ago',
    },
  ]);

  const addMember = () => {
    if (!phone) return;

    setMembers(m => [
      ...m,
      {
        id: crypto.randomUUID(),
        name: 'New Member',
        phone,
        status: 'safe',
        lastSeen: 'Just added',
      },
    ]);

    setPhone('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Home</Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Text style={styles.settings}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Add Member */}
      <View style={styles.addCard}>
        <Text style={styles.sectionTitle}>Add a member</Text>
        <Text style={styles.sub}>
          Enter a phone number to share location and alerts.
        </Text>

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

      {/* Members */}
      <Text style={styles.sectionTitle}>Members</Text>

      {members.map(member => (
        <View key={member.id} style={styles.memberCard}>
          <View>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberSub}>
              {member.phone} • {member.lastSeen}
            </Text>
          </View>

          <View
            style={[
              styles.statusDot,
              member.status === 'safe' ? styles.safe : styles.alert,
            ]}
          />
        </View>
      ))}

      {/* Activity */}
      <Text style={styles.sectionTitle}>Recent activity</Text>

      <View style={styles.activityCard}>
        <Text style={styles.activityText}>
          No recent alerts. All members are safe.
        </Text>
      </View>
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
    marginBottom: 24,
    paddingTop: 50,
  },

  header: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  settings: {
    color: '#818CF8',
    fontSize: 16,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 20,
  },

  sub: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 12,
  },

  addCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
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
    fontSize: 15,
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
    fontSize: 15,
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

  activityCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    marginTop: 4,
  },

  activityText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
