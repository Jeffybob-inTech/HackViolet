import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  TextInput,
  Alert,
} from 'react-native';
import uuid from 'react-native-uuid';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ================================
   Storage Keys
================================ */
const STORAGE_KEYS = {
  username: 'hv:username',
  rules: 'hv:passcode_rules_v1',
};

/* ================================
   Types
================================ */
type TextActionConfig = {
  toUser: string; // username/handle in your messaging system
  message: string; // what to send
};

type AICallActionConfig = {
  persona: string; // e.g. "Mom", "Roommate", "Uber Driver"
  prompt: string; // custom prompt
};

type PasscodeAction =
  | { type: 'text'; config: TextActionConfig }
  | { type: 'ai_call'; config: AICallActionConfig }
  | { type: 'none' };

type PasscodeRule = {
  id: string;
  trigger: { key: string; count: number };
  action: PasscodeAction;
};

export type FiredAction =
  | { kind: 'text'; fromUsername: string; toUsername: string; message: string }
  | { kind: 'ai_call'; fromUsername: string; persona: string; prompt: string };

export async function handlePasscodeKeyPress(params: {
  pressedKey: string;
  username: string;
}): Promise<FiredAction | null> {
  // Loads rules, checks if any matches “pressedKey repeated N times”.
  // You’ll call this from the calculator screen and then do the actual send/call.
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.rules);
  const rules: PasscodeRule[] = raw ? JSON.parse(raw) : [];

  // We need the recent key history; store it too.
  const histKey = 'hv:key_history';
  const histRaw = await AsyncStorage.getItem(histKey);
  const hist: string[] = histRaw ? JSON.parse(histRaw) : [];

  const next = [...hist, params.pressedKey].slice(-12);
  await AsyncStorage.setItem(histKey, JSON.stringify(next));

  // Find any rule whose trigger key is the last `count` presses AND all equal to trigger.key
  for (const rule of rules) {
    const { key, count } = rule.trigger;
    if (count <= 0) continue;
    if (next.length < count) continue;

    const tail = next.slice(-count);
    const match = tail.every(k => k === key);

    if (!match) continue;

    // Matched: clear history so it doesn’t immediately re-fire.
    await AsyncStorage.setItem(histKey, JSON.stringify([]));

    if (rule.action.type === 'text') {
      return {
        kind: 'text',
        fromUsername: params.username,
        toUsername: rule.action.config.toUser.trim(),
        message: rule.action.config.message,
      };
    }

    if (rule.action.type === 'ai_call') {
      return {
        kind: 'ai_call',
        fromUsername: params.username,
        persona: rule.action.config.persona.trim(),
        prompt: rule.action.config.prompt,
      };
    }

    return null;
  }

  return null;
}

/* ================================
   Animated Background
================================ */
function AnimatedBackground({ scrollY }: { scrollY: Animated.Value }) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 14000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 14000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  const drift = float.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] });
  const parallax = scrollY.interpolate({
    inputRange: [0, 400],
    outputRange: [0, -40],
    extrapolate: 'clamp',
  });

  return (
    <>
      <Animated.View
        style={[
          styles.aurora,
          {
            backgroundColor: '#6366F1',
            transform: [{ translateX: drift }, { translateY: parallax }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.aurora,
          {
            backgroundColor: '#22D3EE',
            bottom: -180,
            right: -120,
            transform: [{ translateX: drift }, { translateY: parallax }],
          },
        ]}
      />
    </>
  );
}

/* ================================
   Card Wrapper
================================ */
function AnimatedCard({ children, index }: { children: React.ReactNode; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay: index * 80,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
            },
            {
              scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }),
            },
          ],
        },
      ]}
    >
      <View style={styles.glow} />
      {children}
    </Animated.View>
  );
}

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      activeOpacity={0.85}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ================================
   Screen
================================ */
export default function SettingsScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [stealth, setStealth] = useState(false);
  const [username, setUsername] = useState('');
  const [rules, setRules] = useState<PasscodeRule[]>([
    {
      id: String(uuid.v4()),
      trigger: { key: '=', count: 3 },
      action: {
        type: 'ai_call',
        config: { persona: 'Friend', prompt: 'Call me with an excuse to leave ASAP.' },
      },
    },
  ]);

  // Load persisted
  useEffect(() => {
    (async () => {
      try {
        const [u, r] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.username),
          AsyncStorage.getItem(STORAGE_KEYS.rules),
        ]);
        if (u) setUsername(u);
        if (r) setRules(JSON.parse(r));
      } catch (e) {
        console.log('Settings load error', e);
      }
    })();
  }, []);

  // Save persisted
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.username, username).catch(() => {});
  }, [username]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.rules, JSON.stringify(rules)).catch(() => {});
  }, [rules]);

  const addRule = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRules(r => [
      ...r,
      {
        id: String(uuid.v4()),
        trigger: { key: '=', count: 2 },
        action: { type: 'none' },
      },
    ]);
  };

  const patchRule = (id: string, patch: Partial<PasscodeRule>) => {
    setRules(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const setRuleTriggerKey = (id: string, key: string) => {
    patchRule(id, { trigger: { ...(rules.find(r => r.id === id)!.trigger), key } });
  };

  const incCount = (id: string, delta: number) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    const next = Math.max(2, Math.min(8, rule.trigger.count + delta));
    patchRule(id, { trigger: { ...rule.trigger, count: next } });
  };

  const setActionType = (id: string, type: PasscodeAction['type']) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;

    if (type === 'none') {
      patchRule(id, { action: { type: 'none' } });
      return;
    }

    if (type === 'text') {
      patchRule(id, {
        action: {
          type: 'text',
          config: {
            toUser: '',
            message: 'Hey — call me. Emergency.',
          },
        },
      });
      return;
    }

    patchRule(id, {
      action: {
        type: 'ai_call',
        config: {
          persona: 'Friend',
          prompt: 'Call me and help me leave. Be believable.',
        },
      },
    });
  };

  const deleteRule = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const actionLabel = useMemo(() => {
    return (a: PasscodeAction) => {
      if (a.type === 'none') return 'No action';
      if (a.type === 'text') return `Text → ${a.config.toUser || '(choose user)'}`;
      return `AI call → ${a.config.persona || '(choose persona)'}`;
    };
  }, []);

  const testFire = async (rule: PasscodeRule) => {
    if (!username.trim()) {
      Alert.alert('Set your username first', 'Add a username so actions have a sender.');
      return;
    }

    // Simulate pressing key N times
    await AsyncStorage.setItem('hv:key_history', JSON.stringify([]));
    let fired: FiredAction | null = null;
    for (let i = 0; i < rule.trigger.count; i++) {
      fired = await handlePasscodeKeyPress({
        pressedKey: rule.trigger.key,
        username: username.trim(),
      });
    }

    if (!fired) {
      Alert.alert('Not fired', 'Rule did not fire. That means your matching logic is broken.');
      return;
    }

    // This is where you would actually POST to server.
    // For now, show what would happen.
    if (fired.kind === 'text') {
      Alert.alert('Would send text', `From: ${fired.fromUsername}\nTo: ${fired.toUsername}\n\n${fired.message}`);
    } else {
      Alert.alert('Would start AI call', `From: ${fired.fromUsername}\nPersona: ${fired.persona}\n\nPrompt:\n${fired.prompt}`);
    }
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground scrollY={scrollY} />

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <Text style={styles.header}>Passcode Actions</Text>
        <Text style={styles.sub}>Configure triggers that silently do something useful.</Text>

        <TouchableOpacity onPress={() => router.push('/')} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Calculator</Text>
        </TouchableOpacity>

        {/* Username */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Messaging Username</Text>
          <Text style={styles.sectionSub}>Used as “from” when sending actions.</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="your_handle"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>

        {/* Stealth Mode */}
        <TouchableOpacity
          style={[styles.stealthToggle, stealth && styles.stealthActive]}
          onPress={() => {
            Haptics.selectionAsync();
            setStealth(s => !s);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.stealthText}>{stealth ? 'Stealth Mode ON' : 'Stealth Mode OFF'}</Text>
        </TouchableOpacity>

        {rules.map((rule, i) => (
          <AnimatedCard key={rule.id} index={i}>
            <Text style={styles.preview}>
              Trigger: press <Text style={{ color: '#E5E7EB' }}>{rule.trigger.key}</Text> {rule.trigger.count}×
              {'  •  '}
              <Text style={{ color: '#A5B4FC' }}>{actionLabel(rule.action)}</Text>
            </Text>

            {/* Trigger controls */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Trigger Key</Text>
                <View style={styles.keyRow}>
                  {['=', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => (
                    <Pill
                      key={k}
                      label={k}
                      active={rule.trigger.key === k}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setRuleTriggerKey(rule.id, k);
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.row, { marginTop: 10 }]}>
              <Text style={styles.label}>Count</Text>
              <View style={styles.countControls}>
                <TouchableOpacity
                  style={styles.countBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    incCount(rule.id, -1);
                  }}
                >
                  <Text style={styles.countBtnText}>–</Text>
                </TouchableOpacity>
                <Text style={styles.countValue}>{rule.trigger.count}</Text>
                <TouchableOpacity
                  style={styles.countBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    incCount(rule.id, +1);
                  }}
                >
                  <Text style={styles.countBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action selector */}
            <Text style={[styles.label, { marginTop: 14 }]}>Action</Text>
            <View style={styles.pills}>
              <Pill
                label="None"
                active={rule.action.type === 'none'}
                onPress={() => setActionType(rule.id, 'none')}
              />
              <Pill
                label="Text"
                active={rule.action.type === 'text'}
                onPress={() => setActionType(rule.id, 'text')}
              />
              <Pill
                label="AI Call"
                active={rule.action.type === 'ai_call'}
                onPress={() => setActionType(rule.id, 'ai_call')}
              />
            </View>

            {/* Action config */}
            {rule.action.type === 'text' && (() => {
  const config = rule.action.config;

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.smallLabel}>Message</Text>
      <TextInput
        value={config.message}
        onChangeText={v =>
          patchRule(rule.id, {
            action: {
              type: 'text',
              config: { ...config, message: v },
            },
          })
        }
        placeholder="What should it send?"
        placeholderTextColor="#6B7280"
        multiline
        style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
      />
    </View>
  );
})()}


            {rule.action.type === 'ai_call' && (() => {
  const config = rule.action.config;

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.smallLabel}>AI Persona</Text>
      <TextInput
        value={config.persona}
        onChangeText={v =>
          patchRule(rule.id, {
            action: {
              type: 'ai_call',
              config: { ...config, persona: v },
            },
          })
        }
        placeholder="Friend / Mom / Roommate"
        placeholderTextColor="#6B7280"
        style={styles.input}
      />

      <Text style={styles.smallLabel}>Custom Prompt</Text>
      <TextInput
        value={config.prompt}
        onChangeText={v =>
          patchRule(rule.id, {
            action: {
              type: 'ai_call',
              config: { ...config, prompt: v },
            },
          })
        }
        placeholder="Tell the AI what to do/say."
        placeholderTextColor="#6B7280"
        multiline
        style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]}
      />
    </View>
  );
})()}


            {/* Footer actions */}
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={styles.testBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  testFire(rule);
                }}
              >
                <Text style={styles.testBtnText}>Test</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => deleteRule(rule.id)}
                style={styles.deleteBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        ))}

        <TouchableOpacity style={styles.add} onPress={addRule}>
          <Text style={styles.addText}>＋ Add Passcode</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      {stealth && <View style={styles.stealthOverlay} />}
    </View>
  );
}

/* ================================
   Styles
================================ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A', padding: 16 },

  header: {
    fontSize: 30,
    paddingTop: 60,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  sub: { color: '#9CA3AF', marginBottom: 10, fontSize: 14 },

  aurora: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    opacity: 0.18,
    top: -120,
    left: -80,
  },

  backBtn: { marginTop: 8, marginBottom: 10 },
  backText: { color: '#9CA3AF', fontSize: 22, marginBottom: 10, fontWeight: '500' },

  section: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: { color: '#E5E7EB', fontSize: 14, fontWeight: '600' },
  sectionSub: { color: '#9CA3AF', fontSize: 12, marginTop: 4, marginBottom: 10 },

  input: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#E5E7EB',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },

  stealthToggle: {
    marginVertical: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#111827',
  },
  stealthActive: { backgroundColor: '#020617', borderWidth: 1, borderColor: '#22D3EE' },
  stealthText: { color: '#E5E7EB', textAlign: 'center', fontWeight: '500' },
  stealthOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    opacity: 0.15,
    pointerEvents: 'none',
  },

  card: {
    position: 'relative',
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    opacity: 0.12,
  },

  preview: { color: '#9CA3AF', fontSize: 13, marginBottom: 10 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  label: { color: '#D1D5DB', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  smallLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },

  keyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  pills: { flexDirection: 'row', gap: 10, marginBottom: 12, marginTop: 6 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#1F2937' },
  pillActive: { backgroundColor: '#6366F1' },
  pillText: { color: '#D1D5DB', fontSize: 14 },
  pillTextActive: { color: '#FFFFFF', fontWeight: '600' },

  countControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBtnText: { color: '#E5E7EB', fontSize: 18, fontWeight: '700' },
  countValue: { color: '#E5E7EB', fontSize: 16, fontWeight: '700', minWidth: 18, textAlign: 'center' },

  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  testBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
  },
  testBtnText: { color: '#67E8F9', fontWeight: '700' },

  deleteBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  deleteText: { color: '#F87171', fontSize: 13, fontWeight: '700' },

  add: { marginTop: 8, alignItems: 'center', paddingVertical: 16 },
  addText: { color: '#818CF8', fontSize: 17, fontWeight: '600' },
});
