import { useEffect } from "react";
import { useNavigate, useParams, useLoaderData, data, redirect } from "react-router";
import { toast } from "sonner";
import { authClient } from "~/lib/auth-client";
import { auth, stripeEnabled } from "~/lib/auth.server";
import { WorkspaceSettingsDialog } from "~/components/workspace-settings-dialog";
import type { Route } from "./+types/workspace-settings";

export function meta() {
  return [{ title: "Workspace Settings" }];
}

export function shouldRevalidate({ formAction }: { formAction?: string }) {
  if (formAction === "/") return false;
  return true;
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw redirect("/login");
  }

  const url = new URL(request.url);
  const tab = url.searchParams.get("tab");
  const upgraded = url.searchParams.get("upgraded") === "true";
  return { stripeEnabled, tab, upgraded };
}

function audit(orgId: string, action: string, extra?: Record<string, string>) {
  const body = new URLSearchParams({ orgId, action, ...extra });
  fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    credentials: "include",
  }).catch(() => {});
}

function notify(params: Record<string, string>) {
  (authClient as any).notification.sendNotification(params).catch(() => {});
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "update-name") {
    const orgId = String(formData.get("orgId"));
    const name = String(formData.get("name"));
    const { error } = await authClient.organization.update({
      data: { name },
      organizationId: orgId,
    });
    if (error) return data({ error: String(error.message) }, { status: 400 });
    audit(orgId, "workspace.updated", { metadata: JSON.stringify({ name }) });
    return { toast: "Workspace name updated" };
  }

  if (intent === "delete-workspace") {
    const orgId = String(formData.get("orgId"));
    const { error } = await authClient.organization.delete({ organizationId: orgId });
    if (error) return data({ error: String(error.message) }, { status: 400 });
    audit(orgId, "workspace.deleted");
    return { toast: "Workspace deleted", deleted: true };
  }

  if (intent === "invite-member") {
    const email = String(formData.get("email"));
    const role = String(formData.get("role")) as "admin" | "member" | "owner";
    const { error } = await authClient.organization.inviteMember({ email, role });
    if (error) return data({ error: String(error.message || "Failed to send invite") }, { status: 400 });
    const session = await authClient.getSession();
    const activeOrgId = (session.data?.session as any)?.activeOrganizationId;
    if (activeOrgId) {
      const orgName = formData.get("orgName") as string || "a workspace";
      const orgSlug = formData.get("orgSlug") as string || "";
      audit(activeOrgId, "member.invited", {
        targetType: "invitation",
        metadata: JSON.stringify({ email, role }),
      });
      notify({
        email,
        orgId: activeOrgId,
        type: "invitation.received",
        title: `You've been invited to ${orgName}`,
        body: `You were invited as ${role}`,
        link: orgSlug ? `/${orgSlug}/settings?tab=members` : "",
      });
    }
    return { toast: `Invitation sent to ${email}` };
  }

  if (intent === "update-member-role") {
    const memberId = String(formData.get("memberId"));
    const role = String(formData.get("role")) as "admin" | "member" | "owner";
    const { error } = await authClient.organization.updateMemberRole({ memberId, role });
    if (error) return data({ error: String(error.message || "Failed to update role") }, { status: 400 });
    const sess = await authClient.getSession();
    const aOrgId = (sess.data?.session as any)?.activeOrganizationId;
    if (aOrgId) {
      audit(aOrgId, "member.role_updated", {
        targetType: "member",
        targetId: memberId,
        metadata: JSON.stringify({ role }),
      });
    }
    return { toast: "Role updated" };
  }

  if (intent === "remove-member") {
    const memberId = String(formData.get("memberId"));
    const removedUserId = formData.get("userId") as string || "";
    const { error } = await authClient.organization.removeMember({ memberIdOrEmail: memberId });
    if (error) return data({ error: String(error.message || "Failed to remove member") }, { status: 400 });
    const sess = await authClient.getSession();
    const aOrgId = (sess.data?.session as any)?.activeOrganizationId;
    if (aOrgId) {
      const orgName = formData.get("orgName") as string || "a workspace";
      audit(aOrgId, "member.removed", {
        targetType: "member",
        targetId: memberId,
      });
      if (removedUserId) {
        notify({
          userId: removedUserId,
          orgId: aOrgId,
          type: "member.removed",
          title: `You were removed from ${orgName}`,
          body: "You no longer have access to this workspace",
        });
      }
    }
    return { toast: "Member removed" };
  }

  if (intent === "cancel-invitation") {
    const invitationId = String(formData.get("invitationId"));
    const { error } = await authClient.organization.cancelInvitation({ invitationId });
    if (error) return data({ error: String(error.message || "Failed to revoke invitation") }, { status: 400 });
    const sess = await authClient.getSession();
    const aOrgId = (sess.data?.session as any)?.activeOrganizationId;
    if (aOrgId) {
      audit(aOrgId, "invitation.cancelled", {
        targetType: "invitation",
        targetId: invitationId,
      });
    }
    return { toast: "Invitation revoked" };
  }

  if (intent === "leave-workspace") {
    const orgId = String(formData.get("orgId"));
    audit(orgId, "member.left");
    const { error } = await authClient.organization.leave({ organizationId: orgId });
    if (error) return data({ error: String(error.message || "Failed to leave workspace") }, { status: 400 });
    return { toast: "Left workspace", left: true };
  }

  return data({ error: "Invalid intent" }, { status: 400 });
}

export default function WorkspaceSettingsPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { stripeEnabled, tab, upgraded } = useLoaderData<typeof loader>();

  useEffect(() => {
    if (upgraded) {
      toast("You've been upgraded to Pro!");
    }
  }, []);

  return (
    <WorkspaceSettingsDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate(`/${slug}`);
      }}
      stripeEnabled={stripeEnabled}
      defaultTab={tab}
    />
  );
}
