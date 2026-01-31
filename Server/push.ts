import { Expo } from "expo-server-sdk";

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN || undefined
});

export async function sendPush(to: string, title: string, body: string, data: Record<string, any> = {}) {
  if (!to) return;

  if (!Expo.isExpoPushToken(to)) {
    // Don’t crash; just ignore bad tokens
    return;
  }

  const messages = [{
    to,
    sound: "default",
    title,
    body,
    data,
    priority: "high" as const
  }];

  // Chunk + send
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch {
      // Intentionally swallow — you’ll add logging later
    }
  }
}
