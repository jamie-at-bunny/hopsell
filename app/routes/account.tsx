import { redirect, data } from "react-router";
import { getSession } from "~/lib/session.server";
import { authClient } from "~/lib/auth-client";
import { AccountDialog } from "~/components/account-dialog";
import { useNavigate } from "react-router";
import type { Route } from "./+types/account";

export function meta() {
  return [{ title: "Account Settings" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (!session) {
    throw redirect("/login");
  }
  return null;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  switch (intent) {
    case "update-name": {
      const name = String(formData.get("name"));
      const { error } = await authClient.updateUser({ name });
      if (error) return data({ error: String(error.message) }, { status: 400 });
      return { toast: "Name updated" };
    }

    case "update-appearance": {
      const appearance = String(formData.get("appearance"));
      const { error } = await authClient.updateUser({ appearance } as Record<string, unknown>);
      if (error) return data({ error: String(error.message) }, { status: 400 });
      return { toast: `Appearance set to ${appearance}` };
    }

    case "update-timezone": {
      const timezone = String(formData.get("timezone"));
      const { error } = await authClient.updateUser({ timezone } as Record<string, unknown>);
      if (error) return data({ error: String(error.message) }, { status: 400 });
      return { toast: `Timezone set to ${timezone}` };
    }

    case "update-default-org": {
      const orgId = String(formData.get("orgId"));
      const orgName = String(formData.get("orgName"));
      const { error } = await authClient.updateUser({ defaultOrganizationId: orgId } as Record<string, unknown>);
      if (error) return data({ error: String(error.message) }, { status: 400 });
      return { toast: `Default workspace set to ${orgName || "selected"}` };
    }

    case "update-notification-preferences": {
      const notifyInApp = formData.get("notifyInApp") === "true";
      const notifyEmail = formData.get("notifyEmail") === "true";
      const { error } = await authClient.updateUser({ notifyInApp, notifyEmail } as Record<string, unknown>);
      if (error) return data({ error: String(error.message) }, { status: 400 });
      return { toast: "Notification preferences updated" };
    }

    case "change-password": {
      const currentPassword = String(formData.get("currentPassword"));
      const newPassword = String(formData.get("newPassword"));
      const revokeOthers = formData.get("revokeOthers") === "true";
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: revokeOthers,
      });
      if (error) return data({ error: String(error.message || "Failed to change password") }, { status: 400 });
      return { toast: "Password changed", success: true };
    }

    case "add-passkey": {
      const result = await authClient.passkey.addPasskey();
      if (result.error) return data({ error: String(result.error.message || "Passkey registration failed") }, { status: 400 });
      return { toast: "Passkey added" };
    }

    case "delete-passkey": {
      const id = String(formData.get("id"));
      await authClient.passkey.deletePasskey({ id });
      return { toast: "Passkey removed" };
    }

    case "enable-2fa": {
      const password = String(formData.get("password"));
      const { data: result, error } = await authClient.twoFactor.enable({ password });
      if (error) return data({ error: String(error.message || "Failed to enable 2FA") }, { status: 400 });
      return { totpURI: result?.totpURI, backupCodes: result?.backupCodes };
    }

    case "verify-totp": {
      const code = String(formData.get("code"));
      const { error } = await authClient.twoFactor.verifyTotp({ code });
      if (error) return data({ error: String(error.message || "Invalid code") }, { status: 400 });
      return { toast: "Two-step verification enabled", success: true };
    }

    case "disable-2fa": {
      const password = String(formData.get("password"));
      const { error } = await authClient.twoFactor.disable({ password });
      if (error) return data({ error: String(error.message || "Failed to disable 2FA") }, { status: 400 });
      return { toast: "Two-step verification disabled", success: true };
    }

    case "generate-backup-codes": {
      const password = String(formData.get("password"));
      const { data: result, error } = await authClient.twoFactor.generateBackupCodes({ password });
      if (error) return data({ error: String(error.message || "Failed to generate codes") }, { status: 400 });
      return { toast: "New backup codes generated", backupCodes: result?.backupCodes };
    }

    case "revoke-session": {
      const token = String(formData.get("token"));
      await authClient.revokeSession({ token });
      return { toast: "Session revoked" };
    }

    case "revoke-other-sessions": {
      await authClient.revokeOtherSessions();
      return { toast: "All other sessions revoked" };
    }

    case "delete-account": {
      await authClient.deleteUser();
      return { toast: "Account deleted", deleted: true };
    }

    case "unlink-social": {
      const providerId = String(formData.get("providerId"));
      await authClient.unlinkAccount({ providerId });
      return { toast: "Account disconnected" };
    }

    default:
      return data({ error: "Invalid intent" }, { status: 400 });
  }
}

export default function AccountPage() {
  const navigate = useNavigate();

  return (
    <AccountDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate("/");
      }}
    />
  );
}
