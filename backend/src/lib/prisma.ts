import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

function loadRootEnv() {
  const cwd = process.cwd();
  const envRoot = existsSync(path.join(cwd, ".env"))
    ? cwd
    : path.join(cwd, "..");

  loadEnvConfig(envRoot);
}

loadRootEnv();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
