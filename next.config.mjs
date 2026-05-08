import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
    resolveAlias: {
      tailwindcss: path.join(__dirname, "node_modules", "tailwindcss"),
      "@tailwindcss/postcss": path.join(
        __dirname,
        "node_modules",
        "@tailwindcss",
        "postcss"
      ),
    },
  },
};

export default nextConfig;
