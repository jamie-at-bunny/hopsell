import { eq, and } from "drizzle-orm";
import { db } from "~/db/index.server";
import { member, organization } from "~/db/auth-schema";

export class Forbidden extends Response {
  constructor(message = "Forbidden") {
    super(JSON.stringify({ error: message }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verify that a user is a member of an organization with one of the given roles.
 * Throws a 403 Forbidden response if the check fails.
 */
export async function requireOrgRole(
  userId: string,
  organizationId: string,
  roles: string[],
) {
  const [memberRecord] = await db
    .select()
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.userId, userId),
      ),
    );

  if (!memberRecord || !roles.includes(memberRecord.role)) {
    throw new Forbidden();
  }

  return memberRecord;
}

/**
 * Resolve an org slug to an ID and verify role in one step.
 * Useful in child routes where you have the slug from params but not the org ID.
 * Throws 404 if slug not found, 403 if role check fails.
 */
export async function requireOrgRoleBySlug(
  userId: string,
  slug: string,
  roles: string[],
) {
  const [org] = await (db as any)
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug));

  if (!org) {
    throw new Response("Not Found", { status: 404 });
  }

  return requireOrgRole(userId, org.id, roles);
}

/**
 * Verify that a user is a member of an organization (any role).
 * Throws a 403 Forbidden response if the check fails.
 */
export async function requireOrgMember(
  userId: string,
  organizationId: string,
) {
  const [memberRecord] = await db
    .select()
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.userId, userId),
      ),
    );

  if (!memberRecord) {
    throw new Forbidden();
  }

  return memberRecord;
}
