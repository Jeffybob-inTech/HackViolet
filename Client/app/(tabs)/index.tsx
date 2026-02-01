import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";




const SERVER_URL = "https://hackviolet.onrender.com";



export default function CalculatorScreen() {
  const router = useRouter();

  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);

  useEffect(() => {
    // read existing deviceId
    AsyncStorage.getItem("deviceId").then(id => {
      console.log("Loaded deviceId:", id);
      setMyDeviceId(id);
    });
  }, []);

  useEffect(() => {
    (async () => {
      let deviceId = await AsyncStorage.getItem("deviceId");

      if (!deviceId) {
        const token = (await Notifications.getExpoPushTokenAsync()).data;

        const res = await fetch(`${SERVER_URL}/devices/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pushToken: token }),
        });

        const json = await res.json();
        console.log("Register response:", json);

        if (json.deviceId) {
          await AsyncStorage.setItem("deviceId", json.deviceId);
          setMyDeviceId(json.deviceId); // 🔑 THIS WAS ALSO MISSING
        }
      }
    })();
  }, []);
  const [minusStreak, setMinusStreak] = useState(0);
  const [additionStreak, setAdditionStreak] = useState(0);
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
  async function sendPing() {
  if (!myDeviceId) return;

  await fetch("https://hackviolet.onrender.com/call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId: myDeviceId }),
  });
}

  const press = (val: string) => {
  // Clear
  if (val === 'AC') {
    setDisplay('0');
    setExpression('');
    setActiveOp(null);
    setEqualsStreak(0);
    return;
  }
  // Backspace
if (val === '⌫') {
  if (!expression) {
    setDisplay('0');
    return;
  }

  const next = expression.slice(0, -1);

  setExpression(next);
  setDisplay(next || '0');
  setActiveOp(null);
  setEqualsStreak(0);
  setMinusStreak(0);
  setAdditionStreak(0);
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
  // Operator
if (OP_MAP[val]) {
  const op = OP_MAP[val];

  // 🔒 Minus passcode: 3 taps → settings
  if (val === '−') {
    setMinusStreak(prev => {
      const next = prev + 1;
      if (next >= 3) {
        setMinusStreak(0);
        router.push('/settings');
        return 0;
      }
      return next;
    });
  } else {
    setMinusStreak(0);
  }
  // access homepage
  if (val === '+') {
    setAdditionStreak(prev => {
      const next = prev + 1;
      if (next >= 3) {
        setAdditionStreak(0);
        sendPing();
        router.push('/home');
        return 0;
      }
      return next;
    });
  } else {
    setAdditionStreak(0);
  }
  

  if (!expression) return;

  if (/[+\-*/]$/.test(expression)) {
    setExpression(expression.slice(0, -1) + op);
  } else {
    setExpression(expression + op);
  }
  if(op == "*"){
  setDisplay(expression + val);
  }else{
    setDisplay(expression + op);
  }
  setActiveOp(val);
  setEqualsStreak(0);
  setMinusStreak(0);
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
    router.push('/call');
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
  
  <Button label="⌫" type="action" />
  <Button label="AC" type="action" />
  <Button label="%" type="action" />
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
    marginBottom: 18,
  },

  /* BUTTON BASE */
  button: {
    width: '22%',
    height: 90,
    borderRadius: 138,
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
    backgroundColor: '#303030',
  },

  action: {
    backgroundColor: '#807f7f',
  },

  operator: {
    backgroundColor: '#fc8f02',
  },

  /* TEXT */
  buttonText: {
    fontSize: 42,
    fontWeight: '400',
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
  backgroundColor: '#FF9F0A',
},

operatorActiveText: {
  color: '#ffffff',
},

});
