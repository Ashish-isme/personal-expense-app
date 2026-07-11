import { PrismaClient } from "@prisma/client";

/**
 * A single shared PrismaClient instance for the whole process.
 * Re-using one client avoids exhausting database connections.
 */
export const prisma = new PrismaClient();
