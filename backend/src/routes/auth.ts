import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody } from "../lib/validation.js";
import { hashPassword, verifyPassword, signToken, requireAuth } from "../lib/auth.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
});

// POST /api/auth/register
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password } = parseBody(registerSchema, req.body);

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      const err = new Error("An account with this email already exists") as Error & { status?: number };
      err.status = 409;
      throw err;
    }

    const user = await prisma.user.create({
      data: { name: name ?? null, email: email.toLowerCase(), passwordHash: await hashPassword(password) },
    });

    const token = signToken(user.id);
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  })
);

// POST /api/auth/login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = parseBody(loginSchema, req.body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      const err = new Error("Invalid email or password") as Error & { status?: number };
      err.status = 401;
      throw err;
    }

    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  })
);

// GET /api/auth/me — returns the current user (requires a valid token)
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  })
);

export default router;
