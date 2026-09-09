import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";

export async function verifyCredentials(email: string, password: string) {
  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user) return null;
  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) return null;
  return { id: user.id, email: user.email, name: user.name };
}
