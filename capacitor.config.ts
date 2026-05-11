import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell loads your deployed Next.js app from `server.url`.
 * Run `pnpm exec cap sync` after dependency changes; open Xcode / Android Studio from there.
 *
 * Push notifications (FCM):
 * - Server (Vercel): set FIREBASE_SERVICE_ACCOUNT_JSON (base64 service account JSON).
 * - Android: add Firebase `google-services.json` under `android/app/` (same Firebase project).
 * - iOS: add `GoogleService-Info.plist` + APNs key in Firebase console.
 */
const config: CapacitorConfig = {
  appId: "com.loopingbinary.habit",
  appName: "Habit",
  /** Static assets copied into native projects; runtime loads `server.url`. */
  webDir: "public",
  server: {
    url: "https://habit.loopingbinary.com",
    cleartext: false,
    androidScheme: "https",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
