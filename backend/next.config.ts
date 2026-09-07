import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import path from "path";
import { loadEnvConfig } from "@next/env";

const cwd = process.cwd();
const envRoot = existsSync(path.join(cwd, ".env")) ? cwd : path.join(cwd, "..");
loadEnvConfig(envRoot);

const nextConfig: NextConfig = {};

export default nextConfig;
