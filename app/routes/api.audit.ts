import { data } from "react-router";
import { eq, and } from "drizzle-orm";
import { db } from "~/db/index.server";
import { member } from "~/db/auth-schema";
import { getSession } from "~/lib/session.server";
import { logAudit } from "~/lib/audit.server";
import type { Route } from "./+types/api.audit";

/**
 * Server-side audit logging endpoint.
 * Used by client-side actions to record audit events.
 */
export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request);
  if (!session?.user) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const orgId = String(formData.get("orgId"));
  const action = String(formData.get("action"));

  if (!orgId || !action) {
    return data({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify membership
  const [memberRecord] = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, orgId), eq(member.userId, session.user.id)));

  if (!memberRecord) {
    return data({ error: "Forbidden" }, { status: 403 });
  }

  let metadata: Record<string, unknown> | undefined;
  const metaStr = formData.get("metadata") as string | null;
  if (metaStr) {
    try {
      metadata = JSON.parse(metaStr);
    } catch {
      // ignore
    }
  }

  await logAudit({
    organizationId: orgId,
    actorId: session.user.id,
    action,
    targetType: (formData.get("targetType") as string) || undefined,
    targetId: (formData.get("targetId") as string) || undefined,
    metadata,
    ipAddress: request.headers.get("x-forwarded-for") || undefined,
  });

  return { success: true };
}
