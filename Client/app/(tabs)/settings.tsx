import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import uuid from 'react-native-uuid';
import { useRouter } from 'expo-router';


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

export default function SettingsScreen() {
  const router = useRouter();
  const TRIGGER_KEYS = ['=', '−', '+', '0', '1', '2', '3'];
const incrementCount = (rule: PasscodeRule, delta: number) => {
  const next = Math.max(1, Math.min(9, rule.trigger.count + delta));

  updateRule(rule.id, {
    trigger: { ...rule.trigger, count: next },
  });
};

  const cycleTriggerKey = (rule: PasscodeRule) => {
  const idx = TRIGGER_KEYS.indexOf(rule.trigger.key);
  const nextKey = TRIGGER_KEYS[(idx + 1) % TRIGGER_KEYS.length];

  updateRule(rule.id, {
    trigger: { ...rule.trigger, key: nextKey },
  });
};

  const [rules, setRules] = useState<PasscodeRule[]>([
    {
      id: String(uuid.v4()),
      trigger: { key: '=', count: 3 },
      action: { type: 'ai_call' },
    },
  ]);

  const updateRule = (id: string, patch: Partial<PasscodeRule>) => {
    setRules(r => r.map(rule => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  const updateAction = (id: string, action: PasscodeAction) => {
    setRules(r => r.map(rule => (rule.id === id ? { ...rule, action } : rule)));
  };
function ActionPill({
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
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

  const addRule = () => {
    setRules(r => [
      ...r,
      {
        id: String(uuid.v4()),
        trigger: { key: '=', count: 2 },
        action: { type: 'none' },
      },
    ]);
  };

  const removeRule = (id: string) => {
    setRules(r => r.filter(rule => rule.id !== id));
  };

  return (
  <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>

    <Text style={styles.header}>Passcode Actions</Text>
    <Text style={styles.sub}>
      Configure discreet input patterns that trigger actions.
    </Text>
    <TouchableOpacity
  onPress={() => router.push('/')}
  style={styles.backBtn}
  activeOpacity={0.7}
>
  <Text style={styles.backText}>‹ Calculator</Text>
</TouchableOpacity>

    {rules.map(rule => {
      const actionLabel =
        rule.action.type === 'ai_call'
          ? 'Call AI Assistant'
          : rule.action.type === 'text'
          ? `Send text to ${rule.action.to}`
          : 'No action';

      return (
        <View key={rule.id} style={styles.card}>
          {/* Gradient Accent */}
          <View style={styles.accent} />

          <View style={styles.triggerBlock}>
  {/* Key (tap to cycle) */}
  <TouchableOpacity onPress={() => cycleTriggerKey(rule)}>
    <Text style={styles.triggerKey}>{rule.trigger.key}</Text>
  </TouchableOpacity>

  {/* Count controls */}
  <View style={styles.countControls}>
    <TouchableOpacity
      onPress={() => incrementCount(rule, -1)}
      style={styles.countBtn}
    >
      <Text style={styles.countBtnText}>−</Text>
    </TouchableOpacity>

    <Text style={styles.triggerTimes}>{rule.trigger.count}</Text>

    <TouchableOpacity
      onPress={() => incrementCount(rule, +1)}
      style={styles.countBtn}
    >
      <Text style={styles.countBtnText}>+</Text>
    </TouchableOpacity>
  </View>
</View>


          <Text style={styles.preview}>
            When pressed {rule.trigger.count} times → {actionLabel}
          </Text>

          {/* Action Pills */}
          <View style={styles.pills}>
            <ActionPill
              label="AI Assistant"
              active={rule.action.type === 'ai_call'}
              onPress={() => updateAction(rule.id, { type: 'ai_call' })}
            />
            <ActionPill
              label="Send Text"
              active={rule.action.type === 'text'}
              onPress={() =>
                updateAction(rule.id, {
                  type: 'text',
                  to: '123-456-7890',
                  message: 'Emergency check-in',
                })
              }
            />
            <ActionPill
              label="None"
              active={rule.action.type === 'none'}
              onPress={() => updateAction(rule.id, { type: 'none' })}
            />
          </View>

          {/* Delete */}
          <TouchableOpacity style={styles.delete} onPress={() => removeRule(rule.id)}>
            <Text style={styles.deleteText}>Remove</Text>
          </TouchableOpacity>
        </View>
      );
    })}

    <TouchableOpacity style={styles.add} onPress={addRule}>
      <Text style={styles.addText}>＋ Add Passcode</Text>
    </TouchableOpacity>
  </ScrollView>
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
