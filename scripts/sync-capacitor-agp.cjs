/**
 * Aligns AGP in Capacitor Android packages with habit/android/build.gradle.
 * pnpm stores packages under node_modules/.pnpm; each Capacitor plugin ships its own
 * buildscript classpath. Run via package.json "postinstall".
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ANDROID_BUILD = path.join(ROOT, "android", "build.gradle");
const PNPM_STORE = path.join(ROOT, "node_modules", ".pnpm");

function readAgpVersion() {
  const text = fs.readFileSync(ANDROID_BUILD, "utf8");
  const m = text.match(
    /classpath\s+['"]com\.android\.tools\.build:gradle:([^'"]+)['"]/
  );
  if (!m) {
    throw new Error(`Could not parse AGP version from ${ANDROID_BUILD}`);
  }
  return m[1];
}

function findCapacitorBuildGradleFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      findCapacitorBuildGradleFiles(full, acc);
    } else if (
      e.name === "build.gradle" &&
      full.replace(/\\/g, "/").includes("@capacitor")
    ) {
      acc.push(full);
    }
  }
  return acc;
}

function main() {
  if (!fs.existsSync(ANDROID_BUILD)) {
    return;
  }
  const version = readAgpVersion();
  const needle = /classpath\s+(['"])com\.android\.tools\.build:gradle:[^'"]+\1/g;
  const files = findCapacitorBuildGradleFiles(PNPM_STORE);
  let n = 0;
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes("com.android.tools.build:gradle:")) continue;
    const next = src.replace(
      needle,
      `classpath $1com.android.tools.build:gradle:${version}$1`
    );
    if (next !== src) {
      fs.writeFileSync(file, next);
      n += 1;
    }
  }
  if (n > 0) {
    console.log(
      `[sync-capacitor-agp] Updated AGP to ${version} in ${n} Capacitor build.gradle file(s).`
    );
  }
}

main();
