"use client";

import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type PushNotificationSchema,
  type Token,
} from "@capacitor/push-notifications";
import { useEffect } from "react";

async function registerToken(token: Token) {
  await fetch("/api/notifications/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fcmToken: token.value }),
  });
}

export function NativePushBootstrap() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    const setup = async () => {
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") return;
      await PushNotifications.register();

      await PushNotifications.addListener("registration", async (token) => {
        if (!active) return;
        await registerToken(token);
      });

      await PushNotifications.addListener("registrationError", (error) => {
        console.error("Push registration error", error);
      });

      await PushNotifications.addListener(
        "pushNotificationReceived",
        (notification: PushNotificationSchema) => {
          console.log("Push notification received", notification);
        }
      );
    };

    void setup();

    return () => {
      active = false;
      void PushNotifications.removeAllListeners();
    };
  }, []);

  return null;
}

