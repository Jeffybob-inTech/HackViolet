import fetch from "node-fetch";

export async function sendPush(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, any>
) {
  await fetch("http://192.168.1.23:8080/v1/ping", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: pushToken,
      sound: "default",
      title,
      body,
      data, // THIS IS CRITICAL
    }),
  });
}
