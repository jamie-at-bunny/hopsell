import { data } from "react-router";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "~/db/index.server";
import { auditLog, member, user } from "~/db/auth-schema";
import { getSession } from "~/lib/session.server";
import type { Route } from "./+types/api.audit-log";

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request);
  if (!session?.user) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent"));
  const orgId = String(formData.get("orgId"));

  if (!orgId) {
    return data({ error: "Organization ID is required" }, { status: 400 });
  }

  // Verify membership
  const [memberRecord] = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, orgId), eq(member.userId, session.user.id)));

  if (!memberRecord) {
    return data({ error: "Forbidden" }, { status: 403 });
  }

  if (intent === "list") {
    const limit = Math.min(Number(formData.get("limit")) || 50, 100);
    const offset = Number(formData.get("offset")) || 0;

    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.organizationId, orgId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch actor details for each entry
    const actorIds = [...new Set(rows.map((r) => r.actorId))];
    const actors = actorIds.length > 0
      ? await db.select().from(user).where(
          actorIds.length === 1
            ? eq(user.id, actorIds[0])
            : sql`${user.id} IN (${sql.join(actorIds.map((id) => sql`${id}`), sql`, `)})`,
        )
      : [];
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const entries = rows.map((r) => {
      const actor = actorMap.get(r.actorId);
      return {
        id: r.id,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        metadata: r.metadata,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt,
        actorName: actor?.name || "Unknown",
        actorEmail: actor?.email || "",
        actorImage: actor?.image || null,
      };
    });

    return { entries };
  }

  return data({ error: "Invalid intent" }, { status: 400 });
}
