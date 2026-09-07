import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import path from "path";
import { loadEnvConfig } from "@next/env";

const cwd = process.cwd();
const envRoot = existsSync(path.join(cwd, ".env")) ? cwd : path.join(cwd, "..");
loadEnvConfig(envRoot);

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, ".."),
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
};

export default nextConfig;
