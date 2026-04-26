/**
 * Cleanup script — run on a cron schedule to remove stale data.
 *
 * Usage:
 *   npx tsx scripts/cleanup.ts
 *
 * Cron example (every hour):
 *   0 * * * * cd /app && npx tsx scripts/cleanup.ts
 *
 * Requires DATABASE_URL to be set.
 */

import "dotenv/config";
import { lt, and, eq, count } from "drizzle-orm";
import { db } from "~/db/index.server";
import {
  inviteLink,
  verification,
  session,
  user,
  account,
  member,
} from "~/db/auth-schema";
import { config } from "~/lib/config";

const now = new Date();

async function expireInviteLinks() {
  const [{ total }] = await (db as any)
    .select({ total: count() })
    .from(inviteLink)
    .where(lt(inviteLink.expiresAt, now));

  if (total > 0) {
    await db.delete(inviteLink).where(lt(inviteLink.expiresAt, now));
  }

  console.log(`[cleanup] Deleted ${total} expired invite links`);
}

async function expireVerificationTokens() {
  const [{ total }] = await (db as any)
    .select({ total: count() })
    .from(verification)
    .where(lt(verification.expiresAt, now));

  if (total > 0) {
    await db.delete(verification).where(lt(verification.expiresAt, now));
  }

  console.log(`[cleanup] Deleted ${total} expired verification tokens`);
}

async function expireSessions() {
  const [{ total }] = await (db as any)
    .select({ total: count() })
    .from(session)
    .where(lt(session.expiresAt, now));

  if (total > 0) {
    await db.delete(session).where(lt(session.expiresAt, now));
  }

  console.log(`[cleanup] Deleted ${total} expired sessions`);
}

async function cleanupUnverifiedAccounts() {
  const cutoff = new Date(now.getTime() - config.cleanup.unverifiedAccountMaxAge);

  const staleUsers: { id: string }[] = await (db as any)
    .select({ id: user.id })
    .from(user)
    .where(
      and(
        eq(user.emailVerified, false),
        lt(user.createdAt, cutoff),
      ),
    );

  if (staleUsers.length === 0) {
    console.log("[cleanup] No unverified accounts to clean up");
    return;
  }

  for (const { id: userId } of staleUsers) {
    await db.delete(session).where(eq(session.userId, userId));
    await db.delete(account).where(eq(account.userId, userId));
    await db.delete(member).where(eq(member.userId, userId));
    await db.delete(user).where(eq(user.id, userId));
  }

  console.log(
    `[cleanup] Deleted ${staleUsers.length} unverified accounts older than 7 days`,
  );
}

async function main() {
  console.log(`[cleanup] Starting at ${now.toISOString()}`);

  await expireInviteLinks();
  await expireVerificationTokens();
  await expireSessions();
  await cleanupUnverifiedAccounts();

  console.log("[cleanup] Done");
}

main().catch((err) => {
  console.error("[cleanup] Fatal error:", err);
  process.exit(1);
});
