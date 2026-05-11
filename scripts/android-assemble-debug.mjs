/**
 * Cross-platform: Windows cmd does not treat ./gradlew as a command.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureAndroidSdk } from "./ensure-android-sdk.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.join(__dirname, "..", "android");
const isWin = process.platform === "win32";
const gradlew = isWin ? "gradlew.bat" : "./gradlew";

await ensureAndroidSdk();

const r = spawnSync(gradlew, ["assembleDebug", "--no-daemon"], {
  cwd: androidDir,
  stdio: "inherit",
  shell: isWin,
  env: process.env,
});

process.exit(r.status ?? 1);
