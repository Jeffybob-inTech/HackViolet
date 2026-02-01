import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { handlePasscodeKeyPress } from "../../lib/passcodeEngine";

const SERVER_URL = "https://hackviolet.onrender.com";

type ButtonType = "number" | "action" | "operator";

export default function CalculatorScreen() {
  const router = useRouter();

  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [activeOp, setActiveOp] = useState<string | null>(null);

  /** rolling key buffer for passcodes */
  const keyBuffer = useRef<string[]>([]);

  /** number → message mapping (replace with Settings later) */

  const OP_MAP: Record<string, string> = {
    "÷": "/",
    "×": "*",
    "−": "-",
    "+": "+",
  };

  function resetPasscodeBuffer() {
    keyBuffer.current = [];
  }

  function pushKey(k: string) {
    keyBuffer.current.push(k);
    if (keyBuffer.current.length > 6) {
      keyBuffer.current.shift();
    }
  }

  async function maybeTriggerPasscode(key: string) {
  pushKey(key);
  const buf = keyBuffer.current.join("");

  // ---------- HARD-CODED NAV ----------
  if (buf.endsWith("===")) {
    resetPasscodeBuffer();
    router.push("/call");
    return true;
  }

  if (buf.endsWith("+++")) {
    resetPasscodeBuffer();
    router.push("/home");
    return true;
  }

  if (buf.endsWith("−−−")) {
    resetPasscodeBuffer();
    router.push("/settings");
    return true;
  }

  // ---------- SETTINGS-DRIVEN TEXT ----------
  // only numbers participate
  if (!/^[0-9]$/.test(key)) return false;

  const username =
    (await AsyncStorage.getItem("hv:username")) || "anonymous";

  // 🔑 DO NOT clear history here
  const fired = await handlePasscodeKeyPress({
    pressedKey: key,
    username,
  });

  if (!fired) return false;

  if (fired.kind === "text") {
    await fetch(`${SERVER_URL}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: username,
        text: fired.message,
      }),
    });

    resetPasscodeBuffer(); // OK: local buffer only
    return true;
  }

  return false;
}



  function pressCalculator(val: string) {
    // clear
    if (val === "AC") {
      setDisplay("0");
      setExpression("");
      setActiveOp(null);
      resetPasscodeBuffer();
      return;
    }

    // backspace
    if (val === "⌫") {
      if (!expression) {
        setDisplay("0");
        return;
      }
      const next = expression.slice(0, -1);
      setExpression(next);
      setDisplay(next || "0");
      setActiveOp(null);
      resetPasscodeBuffer();
      return;
    }

    // equals (math only)
    if (val === "=") {
      if (!expression || /[+\-*/.]$/.test(expression)) return;
      try {
        const result = Function(`"use strict"; return (${expression})`)();
        const out = String(result);
        setDisplay(out);
        setExpression(out);
      } catch {
        setDisplay("Error");
        setExpression("");
      }
      setActiveOp(null);
      return;
    }

    // operators
    if (OP_MAP[val]) {
      const op = OP_MAP[val];
      if (!expression) return;

      if (/[+\-*/]$/.test(expression)) {
        setExpression(expression.slice(0, -1) + op);
      } else {
        setExpression(expression + op);
      }

      setDisplay(expression + val);
      setActiveOp(val);
      return;
    }

    // numbers / dot
    setActiveOp(null);
    const next =
      display === "0" && val !== "."
        ? val
        : expression + val;

    setExpression(next);
    setDisplay(next);
  }

  async function handlePress(val: string) {
    // passcode logic first
    await maybeTriggerPasscode(val);

    // calculator always runs
    pressCalculator(val);
  }

  const Button = ({
    label,
    wide,
    type = "number",
  }: {
    label: string;
    wide?: boolean;
    type?: ButtonType;
  }) => {
    const isActive = type === "operator" && activeOp === label;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handlePress(label)}
        style={[
          styles.button,
          wide && styles.wide,
          type === "number" && styles.number,
          type === "action" && styles.action,
          type === "operator" && styles.operator,
          isActive && styles.operatorActive,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            type === "action" && styles.actionText,
            type === "operator" && styles.operatorText,
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
      <View style={styles.display}>
        <Text style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>
          {display}
        </Text>
      </View>

      <View style={styles.grid}>
        <Button label="⌫" type="action" />
        <Button label="AC" type="action" />
        <Button label="%" type="action" />
        <Button label="÷" type="operator" />

        <Button label="7" />
        <Button label="8" />
        <Button label="9" />
        <Button label="×" type="operator" />

        <Button label="4" />
        <Button label="5" />
        <Button label="6" />
        <Button label="−" type="operator" />

        <Button label="1" />
        <Button label="2" />
        <Button label="3" />
        <Button label="+" type="operator" />

        <Button label="0" wide />
        <Button label="." />
        <Button label="=" type="operator" />
      </View>
    </View>
  );
}

/* styles unchanged */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 12, justifyContent: "flex-end" },
  display: { height: 160, justifyContent: "flex-end", alignItems: "flex-end", paddingHorizontal: 20 },
  displayText: { color: "#fff", fontSize: 80, fontWeight: "400" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 18 },
  button: { width: "22%", height: 90, borderRadius: 138, justifyContent: "center", alignItems: "center" },
  wide: { width: "48%", alignItems: "flex-start", paddingLeft: 28 },
  number: { backgroundColor: "#303030" },
  action: { backgroundColor: "#807f7f" },
  operator: { backgroundColor: "#fc8f02" },
  buttonText: { fontSize: 42, fontWeight: "400", color: "#fff" },
  actionText: { color: "#fff" },
  operatorText: { fontWeight: "600" },
  operatorActive: { backgroundColor: "#FF9F0A" },
  operatorActiveText: { color: "#fff" },
});
