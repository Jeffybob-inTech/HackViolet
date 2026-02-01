const { Expo } = require("expo-server-sdk");

const expo = new Expo();

async function sendPush(token, title, body, data) {
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

module.exports = { sendPush };
