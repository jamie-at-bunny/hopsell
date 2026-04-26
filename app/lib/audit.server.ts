import { db } from "~/db/index.server";
import { auditLog } from "~/db/auth-schema";

export async function logAudit(params: {
  organizationId?: string;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  // Skip audit log for events without an organization context
  // (e.g. login, account linking) since the table requires a valid org FK
  if (!params.organizationId) {
    return;
  }

  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    organizationId: params.organizationId,
    actorId: params.actorId,
    action: params.action,
    targetType: params.targetType || null,
    targetId: params.targetId || null,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    ipAddress: params.ipAddress || null,
  });
}
