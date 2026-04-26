import { eq, and } from "drizzle-orm";
import { db } from "~/db/index.server";
import { userEmail } from "~/db/user-email-schema";
import { user } from "~/db/auth-schema";

export async function getUserEmails(userId: string) {
  return db
    .select()
    .from(userEmail)
    .where(eq(userEmail.userId, userId))
    .orderBy(userEmail.createdAt);
}

export async function addUserEmail(userId: string, email: string) {
  const id = crypto.randomUUID();
  await db.insert(userEmail).values({
    id,
    userId,
    email,
    verified: false,
    primary: false,
  });
  return id;
}

export async function verifyUserEmail(id: string) {
  await db
    .update(userEmail)
    .set({ verified: true })
    .where(eq(userEmail.id, id));
}

export async function setPrimaryEmail(userId: string, emailId: string) {
  const target = await db
    .select()
    .from(userEmail)
    .where(and(eq(userEmail.id, emailId), eq(userEmail.userId, userId)))
    .then((rows) => rows[0]);

  if (!target || !target.verified) {
    throw new Error("Email must be verified before setting as primary");
  }

  // Unset current primary
  await db
    .update(userEmail)
    .set({ primary: false })
    .where(and(eq(userEmail.userId, userId), eq(userEmail.primary, true)));

  // Set new primary
  await db
    .update(userEmail)
    .set({ primary: true })
    .where(eq(userEmail.id, emailId));

  // Sync with Better Auth user.email
  await db
    .update(user)
    .set({ email: target.email })
    .where(eq(user.id, userId));
}

export async function removeUserEmail(id: string) {
  const target = await db
    .select()
    .from(userEmail)
    .where(eq(userEmail.id, id))
    .then((rows) => rows[0]);

  if (!target) throw new Error("Email not found");
  if (target.primary) throw new Error("Cannot remove primary email");

  await db.delete(userEmail).where(eq(userEmail.id, id));
}

export async function syncEmailVerified(userId: string, email: string) {
  await db
    .update(userEmail)
    .set({ verified: true })
    .where(and(eq(userEmail.userId, userId), eq(userEmail.email, email)));
}

export async function seedPrimaryEmail(userId: string, email: string) {
  const existing = await db
    .select()
    .from(userEmail)
    .where(and(eq(userEmail.userId, userId), eq(userEmail.email, email)))
    .then((rows) => rows[0]);

  if (existing) return;

  await db.insert(userEmail).values({
    id: crypto.randomUUID(),
    userId,
    email,
    verified: false,
    primary: true,
  });
}
