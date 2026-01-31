import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';

export default function CalculatorScreen() {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [equalsStreak, setEqualsStreak] = useState(0);
  const [activeOp, setActiveOp] = useState<string | null>(null);

  const OP_MAP: Record<string, string> = {
  '÷': '/',
  '×': '*',
  '−': '-',
  '+': '+',
  };

  const press = (val: string) => {
  // Clear
  if (val === 'AC') {
    setDisplay('0');
    setExpression('');
    setActiveOp(null);
    setEqualsStreak(0);
    return;
  }

  // Equals
  if (val === '=') {
    setEqualsStreak(s => {
      const n = s + 1;
      if (n >= 3) {
        triggerGhostCall();
        return 0;
      }
      return n;
    });

    if (!expression || /[+\-*/.]$/.test(expression)) return;

    try {
      const result = Function(`"use strict"; return (${expression})`)();
      const resultStr = String(result);
      setDisplay(resultStr);
      setExpression(resultStr);
    } catch {
      setDisplay('Error');
      setExpression('');
    }

    setActiveOp(null);
    return;
  }

  // Operator
  if (OP_MAP[val]) {
    const op = OP_MAP[val];

    if (!expression) return;
    if (/[+\-*/]$/.test(expression)) {
      // replace operator
      setExpression(expression.slice(0, -1) + op);
    } else {
      setExpression(expression + op);
    }

    setDisplay(expression + op);
    setActiveOp(val);
    setEqualsStreak(0);
    return;
  }

  // Number / dot
  setActiveOp(null);
  setEqualsStreak(0);

  const next =
    display === '0' && val !== '.'
      ? val
      : expression + val;

  setExpression(next);
  setDisplay(next);
};


  const triggerGhostCall = () => {
    Alert.alert('Incoming Call', 'Ghost call triggered (demo)', [
      { text: 'Dismiss' },
    ]);
  };


type ButtonType = 'number' | 'action' | 'operator';

const Button = ({
  label,
  wide,
  type = 'number',
}: {
  label: string;
  wide?: boolean;
  type?: ButtonType;
}) => {
  const isActive = type === 'operator' && activeOp === label;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => press(label)}
      style={[
        styles.button,
        wide && styles.wide,
        type === 'number' && styles.number,
        type === 'action' && styles.action,
        type === 'operator' && styles.operator,
        isActive && styles.operatorActive,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          type === 'action' && styles.actionText,
          type === 'operator' && styles.operatorText,
          isActive && styles.operatorActiveText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};



  return (
    <View style={styles.container}>
      {/* Display */}
      <View style={styles.display}>
        <Text
          style={styles.displayText}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {display}
        </Text>
      </View>

      {/* Keypad */}
      <View style={styles.grid}>
  {/* Row 1 */}
  <Button label="AC" type="action" />
  <Button label="%" type="action" />
  <Button label="±" type="action" />
  <Button label="÷" type="operator" />

  {/* Row 2 */}
  <Button label="7" />
  <Button label="8" />
  <Button label="9" />
  <Button label="×" type="operator" />

  {/* Row 3 */}
  <Button label="4" />
  <Button label="5" />
  <Button label="6" />
  <Button label="−" type="operator" />

  {/* Row 4 */}
  <Button label="1" />
  <Button label="2" />
  <Button label="3" />
  <Button label="+" type="operator" />

  {/* Row 5 */}
  <Button label="0" wide />
  <Button label="." />
  <Button label="=" type="operator" />
</View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 12,
    justifyContent: 'flex-end',
  },

  /* DISPLAY */
  display: {
    height: 160,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  displayText: {
    color: '#FFFFFF',
    fontSize: 80,
    fontWeight: '400', // this matters
  },

  /* GRID */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  /* BUTTON BASE */
  button: {
    width: '22%',
    height: 84,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },

  wide: {
    width: '48%',
    alignItems: 'flex-start',
    paddingLeft: 28,
  },

  /* BUTTON TYPES */
  number: {
    backgroundColor: '#3b3b3d',
  },

  action: {
    backgroundColor: '#807f7f',
  },

  operator: {
    backgroundColor: '#ffbb54',
  },

  /* TEXT */
  buttonText: {
    fontSize: 42,
    fontWeight: '200',
    color: '#FFFFFF',
  },

  actionText: {
    color: '#ffffff',
    fontWeight: 400,
  },

  operatorText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  operatorActive: {
  backgroundColor: '#FFFFFF',
},

operatorActiveText: {
  color: '#FF9F0A',
},

});
