import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const TOKEN_TTL = "30d";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  console.warn("⚠️  JWT_SECRET is not set — using an insecure default. Set it in production!");
}

/** Hashes a plaintext password for storage. */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** Verifies a plaintext password against a stored hash. */
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Issues a signed JWT for a user id. */
export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

/**
 * Express middleware — requires a valid `Authorization: Bearer <token>` header.
 * On success it attaches `req.userId`; otherwise responds 401.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  // Prefer the Authorization header; fall back to a `?token=` query param so
  // browser-initiated file downloads (CSV/Excel via <a href>) can authenticate.
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : typeof req.query.token === "string"
      ? req.query.token
      : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
