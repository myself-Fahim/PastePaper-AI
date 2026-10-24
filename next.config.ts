import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Keep native PDF/OCR dependencies out of Turbopack's ESM chunks.
  serverExternalPackages: ["@napi-rs/canvas", "tesseract.js"],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
