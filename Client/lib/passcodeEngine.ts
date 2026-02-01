import AsyncStorage from "@react-native-async-storage/async-storage";

/* ================================
   Storage Keys
================================ */
export const STORAGE_KEYS = {
  username: "hv:username",
  rules: "hv:passcode_rules_v1",
  history: "hv:key_history",
};

/* ================================
   Types
================================ */
type TextActionConfig = {
  toUser: string;
  message: string;
};

type AICallActionConfig = {
  persona: string;
  prompt: string;
};

type PasscodeAction =
  | { type: "text"; config: TextActionConfig }
  | { type: "ai_call"; config: AICallActionConfig }
  | { type: "none" };

type PasscodeRule = {
  id: string;
  trigger: { key: string; count: number };
  action: PasscodeAction;
};

export type FiredAction =
  | {
      kind: "text";
      fromUsername: string;
      toUsername: string;
      message: string;
    }
  | {
      kind: "ai_call";
      fromUsername: string;
      persona: string;
      prompt: string;
    };

/* ================================
   Engine
================================ */
export async function handlePasscodeKeyPress(params: {
  pressedKey: string;
  username: string;
}): Promise<FiredAction | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.rules);
  const rules: PasscodeRule[] = raw ? JSON.parse(raw) : [];

  const histRaw = await AsyncStorage.getItem(STORAGE_KEYS.history);
  const hist: string[] = histRaw ? JSON.parse(histRaw) : [];

  const next = [...hist, params.pressedKey].slice(-12);
  await AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify(next));

  for (const rule of rules) {
    const { key, count } = rule.trigger;
    if (count <= 0 || next.length < count) continue;

    const tail = next.slice(-count);
    if (!tail.every(k => k === key)) continue;

    // clear history so it doesn't refire
    await AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify([]));

    if (rule.action.type === "text") {
      return {
        kind: "text",
        fromUsername: params.username,
        toUsername: rule.action.config.toUser.trim(),
        message: rule.action.config.message,
      };
    }

    if (rule.action.type === "ai_call") {
      return {
        kind: "ai_call",
        fromUsername: params.username,
        persona: rule.action.config.persona.trim(),
        prompt: rule.action.config.prompt,
      };
    }

    return null;
  }

  return null;
}
