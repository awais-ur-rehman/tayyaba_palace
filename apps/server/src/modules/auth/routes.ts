import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { loginSchema } from "@tayyaba/shared";
import { verifyCredentials } from "./service.js";
import { audit } from "../../lib/audit.js";
import { requireAuth } from "../../lib/require-auth.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";

// ponytail: single-process in-memory rate limit, not Redis — one kiosk laptop,
// one process. Revisit if this ever runs behind a load balancer.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/login", async (req, reply) => {
    if (rateLimited(req.ip)) {
      return reply.code(429).send({ error: "Too many attempts. Wait a minute." });
    }

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Email or password is incorrect." });
    }

    const user = await verifyCredentials(parsed.data.email, parsed.data.password);
    if (!user) {
      return reply.code(401).send({ error: "Email or password is incorrect." });
    }

    req.session.userId = user.id;
    audit({ userId: user.id, action: "LOGIN", entity: "user", entityId: user.id });
    return reply.send({ user });
  });

  app.post("/api/auth/logout", async (req, reply) => {
    const userId = req.session.userId;
    await req.session.destroy();
    if (userId) audit({ userId, action: "LOGOUT", entity: "user", entityId: userId });
    return reply.send({ ok: true });
  });

  app.get("/api/auth/me", async (req, reply) => {
    if (!req.session.userId) return reply.code(401).send({ error: "Not authenticated" });
    return reply.send({ userId: req.session.userId });
  });

  app.post("/api/auth/change-password", { preHandler: requireAuth }, async (req, reply) => {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return reply.code(400).send({ error: "New password must be at least 8 characters." });
    }

    const user = db.select().from(users).where(eq(users.id, req.session.userId!)).get();
    if (!user || !(await argon2.verify(user.passwordHash, currentPassword))) {
      return reply.code(401).send({ error: "Current password is incorrect." });
    }

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    db.update(users).set({ passwordHash }).where(eq(users.id, user.id)).run();
    audit({ userId: user.id, action: "CHANGE_PASSWORD", entity: "user", entityId: user.id });
    return reply.send({ ok: true });
  });
}
