/**
 * App icon pipeline:
 * 1) Prefer, in order: public/habit(1024x1024px).png, public/Habit (1024 x 1024 px).png, public/app_icon.png
 * 2) Else resources/icon.png if present.
 * 3) Else generate a default “H” mark.
 *
 * Writes normalized resources/icon.png + Android mipmap launcher PNGs.
 * Run: pnpm cap:icon   (or pnpm cap:prep)
 */
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const androidRes = path.join(root, "android", "app", "src", "main", "res");
const outMaster = path.join(root, "resources", "icon.png");
/** Tried in order — first existing file wins */
const USER_ICON_CANDIDATES = [
  path.join(root, "public", "habit(1024x1024px).png"),
  path.join(root, "public", "Habit (1024 x 1024 px).png"),
  path.join(root, "public", "app_icon.png"),
];

const W = 1024;
const ORANGE = { r: 236, g: 91, b: 19, alpha: 1 };

const FOREGROUND_SIZES = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432,
};

const LEGACY_LAUNCHER = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

async function writeDefaultMasterPng() {
  const bar = 72;
  const span = 480;
  const leftX = (W - span) / 2;
  const rightX = leftX + span - bar;
  const topY = 200;
  const botY = 824;
  const midY = (topY + botY) / 2 - bar / 2;

  const svg = `<svg width="${W}" height="${W}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${leftX}" y="${topY}" width="${bar}" height="${botY - topY}" fill="white" rx="18"/>
  <rect x="${rightX}" y="${topY}" width="${bar}" height="${botY - topY}" fill="white" rx="18"/>
  <rect x="${leftX}" y="${midY}" width="${span}" height="${bar}" fill="white" rx="14"/>
</svg>`;

  const base = await sharp({
    create: { width: W, height: W, channels: 4, background: ORANGE },
  })
    .png()
    .toBuffer();

  const overlay = await sharp(Buffer.from(svg))
    .resize(W, W)
    .png()
    .toBuffer();

  await sharp(base)
    .composite([{ input: overlay, blend: "over" }])
    .png()
    .toFile(outMaster);

  console.log("[generate-app-icon] created default", outMaster);
}

/**
 * Ensures resources/icon.png exists; returns buffer of that file.
 */
async function resolveUserIconPath() {
  for (const p of USER_ICON_CANDIDATES) {
    try {
      await access(p, fsConstants.R_OK);
      return p;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function ensureMasterPngBuffer() {
  await mkdir(path.dirname(outMaster), { recursive: true });

  const userPath = await resolveUserIconPath();
  if (userPath) {
    const raw = await readFile(userPath);
    await sharp(raw)
      .resize(W, W, { fit: "cover", position: "center" })
      .png()
      .toFile(outMaster);
    console.log("[generate-app-icon] using user icon →", userPath);
    return readFile(outMaster);
  }

  try {
    const buf = await readFile(outMaster);
    console.log("[generate-app-icon] using existing", outMaster);
    return buf;
  } catch {
    await writeDefaultMasterPng();
    return readFile(outMaster);
  }
}

async function exportAndroid(srcBuf) {
  for (const [folder, px] of Object.entries(FOREGROUND_SIZES)) {
    const dir = path.join(androidRes, folder);
    await mkdir(dir, { recursive: true });
    const target = path.join(dir, "ic_launcher_foreground.png");
    await sharp(srcBuf)
      .resize(px, px, { fit: "cover", position: "center" })
      .png()
      .toFile(target);
  }

  for (const [folder, px] of Object.entries(LEGACY_LAUNCHER)) {
    const dir = path.join(androidRes, folder);
    await mkdir(dir, { recursive: true });
    for (const name of ["ic_launcher.png", "ic_launcher_round.png"]) {
      const target = path.join(dir, name);
      await sharp(srcBuf)
        .resize(px, px, { fit: "cover", position: "center" })
        .png()
        .toFile(target);
    }
  }

  console.log("[generate-app-icon] Android mipmaps updated");
}

async function main() {
  const srcBuf = await ensureMasterPngBuffer();
  await exportAndroid(srcBuf);

  const bgPath = path.join(androidRes, "values", "ic_launcher_background.xml");
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#EC5B13</color>
</resources>
`;
  await mkdir(path.dirname(bgPath), { recursive: true });
  await writeFile(bgPath, bgXml, "utf8");
  console.log("[generate-app-icon] Launcher background color → brand orange");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
