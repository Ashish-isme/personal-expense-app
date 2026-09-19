import { PrismaClient } from "@prisma/client";

/**
 * Serverless Postgres (e.g. Neon) suspends its compute when idle, and the first
 * connection after that has to wait for it to wake. Prisma's default 5s connect
 * timeout is sometimes too short for that, which surfaced as random failed
 * logins. Give it more headroom unless the connection string sets its own.
 */
function databaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "20");
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * A single shared PrismaClient instance for the whole process.
 * Re-using one client avoids exhausting database connections.
 */
export const prisma = new PrismaClient({ datasourceUrl: databaseUrl() });
