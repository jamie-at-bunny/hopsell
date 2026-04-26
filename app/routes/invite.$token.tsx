import { redirect, data } from "react-router";
import { auth } from "~/lib/auth.server";
import { logAudit } from "~/lib/audit.server";
import { sendNotification } from "~/lib/plugins/notification";
import type { Route } from "./+types/invite.$token";

export async function loader({ request, params }: Route.LoaderArgs) {
  const token = params.token;

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw redirect(`/login?redirect=/invite/${token}`);
  }

  // Use the invite-link plugin endpoint to accept the link
  let result: any;
  try {
    const response = await (auth.api as any).acceptInviteLink({
      headers: request.headers,
      body: { token },
    });
    // auth.api may return the data directly or wrapped in a body/json property
    result = response?.body ?? response;
  } catch (err: any) {
    console.error("[invite] acceptInviteLink error:", err);
    const message = err?.message || "This invite link has expired or is invalid.";
    throw data(message, { status: 404 });
  }

  if (!result?.slug) {
    console.error("[invite] No slug in result:", result);
    throw data("Workspace not found.", { status: 404 });
  }

  // If the user has no orgs yet (fresh signup via invite), auto-create a personal workspace
  const existingOrgs = await auth.api.listOrganizations({
    headers: request.headers,
  });

  const onlyHasInvitedOrg =
    !existingOrgs ||
    existingOrgs.length === 0 ||
    (existingOrgs.length === 1 && existingOrgs[0].id === result.organizationId);

  if (onlyHasInvitedOrg) {
    const slug = session.user.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const personalOrg = await auth.api.createOrganization({
      headers: request.headers,
      body: { name: session.user.name, slug },
    });

    if (personalOrg?.id) {
      await auth.api.updateUser({
        headers: request.headers,
        body: { defaultOrganizationId: personalOrg.id } as Record<string, unknown>,
      });
    }
  }

  // Set as active org
  await auth.api.setActiveOrganization({
    headers: request.headers,
    body: { organizationId: result.organizationId },
  });

  if (!result.alreadyMember) {
    await logAudit({
      organizationId: result.organizationId,
      actorId: session.user.id,
      action: "member.joined_via_link",
      targetType: "member",
      targetId: session.user.id,
      metadata: { role: result.role },
    });

    if (result.createdBy) {
      await sendNotification({
        userId: result.createdBy,
        organizationId: result.organizationId,
        type: "member.joined",
        title: "New member joined",
        body: `${session.user.name} joined via invite link`,
        link: `/${result.slug}/settings?tab=members`,
      });
    }
  }

  throw redirect(`/${result.slug}`);
}

export default function InvitePage() {
  return null;
}
