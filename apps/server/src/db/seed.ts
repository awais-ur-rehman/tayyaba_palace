import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { db } from "./index.js";
import { users } from "./schema.js";
import { runMigrations } from "./migrate.js";
import { eq } from "drizzle-orm";

async function seed() {
  runMigrations();

  const existing = db.select().from(users).where(eq(users.email, config.seedAdminEmail)).get();
  if (existing) {
    console.log("Admin user already seeded.");
    return;
  }

  if (!config.seedAdminPassword) {
    if (config.isProduction) {
      throw new Error("SEED_ADMIN_PASSWORD must be set before seeding in production.");
    }
    console.warn("SEED_ADMIN_PASSWORD not set — using dev default 'changeme123'.");
  }
  const password = config.seedAdminPassword ?? "changeme123";
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  db.insert(users)
    .values({
      id: randomUUID(),
      email: config.seedAdminEmail,
      passwordHash,
      name: "Admin",
      createdAt: new Date().toISOString(),
    })
    .run();

  console.log(`Seeded admin user: ${config.seedAdminEmail}`);
}

seed();
