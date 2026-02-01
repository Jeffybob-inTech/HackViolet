import { Expo } from "expo-server-sdk";

const expo = new Expo();

export async function sendPush(
  token: string,
  title: string,
  body: string,
  data: any
) {
  if (!Expo.isExpoPushToken(token)) return;

  await expo.sendPushNotificationsAsync([
    {
      to: token,
      sound: "default",
      title,
      body,
      data
    }
  ]);
}
