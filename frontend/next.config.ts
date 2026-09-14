import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import path from "path";
import { loadEnvConfig } from "@next/env";

const cwd = process.cwd();
const envRoot = existsSync(path.join(cwd, ".env")) ? cwd : path.join(cwd, "..");
loadEnvConfig(envRoot);

const monorepoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  // Trace files from the repo root so API routes can import `backend/src`.
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  experimental: {
    externalDir: true,
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
