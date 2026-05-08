import { GoogleAuth } from "google-auth-library";

type FCMPayload = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
};

export function isFcmConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

export async function sendFCMNotification(payload: FCMPayload) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn("[FCM] FIREBASE_SERVICE_ACCOUNT_JSON not set; skipping push.");
    return null;
  }

  const serviceAccount = JSON.parse(
    Buffer.from(raw, "base64").toString("utf-8")
  );

  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const accessToken = await auth.getAccessToken();
  const projectId = serviceAccount.project_id as string;

  const message = {
    message: {
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      android: {
        notification: {
          icon: "ic_stat_habit",
          color: "#EC5B13",
          channel_id: "habit_alerts",
          notification_priority: "PRIORITY_HIGH",
          visibility: "PUBLIC",
          ...(payload.badge !== undefined && {
            notification_count: payload.badge,
          }),
        },
        priority: "high",
      },
      data: {
        ...payload.data,
        badge: payload.badge?.toString() ?? "0",
      },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FCM error: ${err}`);
  }

  return res.json();
}
