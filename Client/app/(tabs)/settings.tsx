import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import uuid from 'react-native-uuid';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';



type PasscodeAction =
  | { type: 'text'; to: string; message: string }
  | { type: 'ai_call' }
  | { type: 'none' };

type PasscodeRule = {
  id: string;
  trigger: {
    key: string;
    count: number;
  };
  action: PasscodeAction;
};
function AnimatedBackground({ scrollY }: { scrollY: Animated.Value }) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
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
    ).start();
  }, []);

  const drift = float.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60],
  });

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

export default function SettingsScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [stealth, setStealth] = useState(false);
  const [rules, setRules] = useState<PasscodeRule[]>([
    {
      id: String(uuid.v4()),
      trigger: { key: '=', count: 3 },
      action: { type: 'ai_call' },
    },
  ]);

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


  return (
    <View style={styles.container}>
      <AnimatedBackground scrollY={scrollY} />

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <Text style={styles.header}>Passcode Actions</Text>
        <Text style={styles.sub}>Discreet triggers. Zero attention.</Text>

        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={styles.backText}>‹ Calculator</Text>
        </TouchableOpacity>

        {/* Stealth Mode */}
        <TouchableOpacity
          style={[styles.stealthToggle, stealth && styles.stealthActive]}
          onPress={() => {
            Haptics.selectionAsync();
            setStealth(s => !s);
          }}
        >
          <Text style={styles.stealthText}>
            {stealth ? 'Stealth Mode ON' : 'Stealth Mode OFF'}
          </Text>
        </TouchableOpacity>

        {rules.map((rule, i) => (
          <AnimatedCard key={rule.id} index={i}>
            <Text style={styles.preview}>
              Press {rule.trigger.key} {rule.trigger.count}×
            </Text>
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
function AnimatedCard({
  children,
  index,
}: {
  children: ReactNode;
  index: number;
}) {

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay: index * 80,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1],
              }),
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


/* ------------------ */
/* Action Row */
/* ------------------ */

function ActionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[]}
    >
      <Text style={[]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
    padding: 16,
  },

  header: {
    fontSize: 30,
    paddingTop: 60,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
aurora: {
  position: 'absolute',
  width: 340,
  height: 340,
  borderRadius: 170,
  opacity: 0.18,
  top: -120,
  left: -80,
},

stealthToggle: {
  marginVertical: 12,
  padding: 12,
  borderRadius: 14,
  backgroundColor: '#111827',
},

stealthActive: {
  backgroundColor: '#020617',
  borderWidth: 1,
  borderColor: '#22D3EE',
},

stealthText: {
  color: '#E5E7EB',
  textAlign: 'center',
  fontWeight: '500',
},

stealthOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: '#000',
  opacity: 0.15,
  pointerEvents: 'none',
},

  sub: {
    color: '#9CA3AF',
    marginBottom: 6,
    fontSize: 14,
  },
  countControls: {
  flexDirection: 'row',
  alignItems: 'center',
  marginLeft: 12,
},

countBtn: {
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: '#1F2937',
  alignItems: 'center',
  justifyContent: 'center',
},

countBtnText: {
  color: '#E5E7EB',
  fontSize: 16,
  fontWeight: '600',
},

  card: {
    position: 'relative',
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  backBtn: {
  marginTop: 12,
  marginBottom: 8,
},

backText: {
  color: '#9CA3AF',
  fontSize: 24,
  marginBottom: 28,
  fontWeight: '500',
},

  accent: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#6366F1',
    opacity: 0.25,
  },

  triggerBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },

  triggerKey: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },

  triggerTimes: {
    fontSize: 22,
    color: '#A5B4FC',
  },

  preview: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 16,
  },

  pills: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#1F2937',
  },

  pillActive: {
    backgroundColor: '#6366F1',
  },

  pillText: {
    color: '#D1D5DB',
    fontSize: 14,
  },

  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },

  delete: {
    marginTop: 4,
  },

  deleteText: {
    color: '#F87171',
    fontSize: 13,
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

  add: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 16,
  },

  addText: {
    color: '#818CF8',
    fontSize: 17,
    fontWeight: '500',
  },
});
