import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import path from "path";
import { loadEnvConfig } from "@next/env";

const cwd = process.cwd();
const envRoot = existsSync(path.join(cwd, ".env")) ? cwd : path.join(cwd, "..");
loadEnvConfig(envRoot);

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  experimental: {
    externalDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
