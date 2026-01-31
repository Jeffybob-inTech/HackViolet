import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import uuid from 'react-native-uuid';

type PasscodeAction =
  | { type: 'text'; to: string; message: string }
  | { type: 'ai_call' }
  | { type: 'none' };

type PasscodeRule = {
  id: string;
  trigger: {
    key: string;      // '=', '0', etc
    count: number;    // how many times
  };
  action: PasscodeAction;
};

export default function SettingsScreen() {
  const [rules, setRules] = useState<PasscodeRule[]>([
    {
      id: String(uuid.v4()),
      trigger: { key: '=', count: 3 },
      action: { type: 'ai_call' },
    },
  ]);

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

  const updateRule = (id: string, patch: Partial<PasscodeRule>) => {
    setRules(r =>
      r.map(rule => (rule.id === id ? { ...rule, ...patch } : rule))
    );
  };

  const updateAction = (id: string, action: PasscodeAction) => {
    setRules(r =>
      r.map(rule => (rule.id === id ? { ...rule, action } : rule))
    );
  };

  const removeRule = (id: string) => {
    setRules(r => r.filter(rule => rule.id !== id));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Passcode Actions</Text>
      <Text style={styles.sub}>
        Configure calculator inputs to trigger actions.
      </Text>

      {rules.map(rule => (
        <View key={rule.id} style={styles.card}>
          {/* Trigger */}
          <Text style={styles.label}>Trigger</Text>
          <View style={styles.row}>
            <TextInput
              value={rule.trigger.key}
              onChangeText={v =>
                updateRule(rule.id, {
                  trigger: { ...rule.trigger, key: v },
                })
              }
              style={styles.inputSmall}
              maxLength={1}
            />
            <Text style={styles.x}>×</Text>
            <TextInput
              value={String(rule.trigger.count)}
              onChangeText={v =>
                updateRule(rule.id, {
                  trigger: { ...rule.trigger, count: Number(v) || 1 },
                })
              }
              style={styles.inputSmall}
              keyboardType="number-pad"
            />
          </View>

          {/* Action */}
          <Text style={styles.label}>Action</Text>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              updateAction(rule.id, { type: 'ai_call' })
            }
          >
            <Text style={styles.actionText}>Call AI Assistant</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              updateAction(rule.id, {
                type: 'text',
                to: '123-456-7890',
                message: 'Emergency check-in',
              })
            }
          >
            <Text style={styles.actionText}>Send Text</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.delete}
            onPress={() => removeRule(rule.id)}
          >
            <Text style={styles.deleteText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.add} onPress={addRule}>
        <Text style={styles.addText}>Add Passcode</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },

  header: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 6,
  },

  sub: {
    color: '#9CA3AF',
    marginBottom: 20,
  },

  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },

  label: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 6,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  inputSmall: {
    width: 48,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    textAlign: 'center',
    fontSize: 18,
  },

  x: {
    color: '#FFF',
    marginHorizontal: 10,
    fontSize: 18,
  },

  actionBtn: {
    paddingVertical: 10,
  },

  actionText: {
    color: '#FFF',
    fontSize: 16,
  },

  delete: {
    marginTop: 8,
  },

  deleteText: {
    color: '#EF4444',
  },

  add: {
    paddingVertical: 14,
    alignItems: 'center',
  },

  addText: {
    color: '#0A84FF',
    fontSize: 16,
  },
});
