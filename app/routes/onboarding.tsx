import { redirect, useLoaderData, data } from "react-router";
import { auth, stripeEnabled } from "~/lib/auth.server";
import { authClient } from "~/lib/auth-client";
import { OnboardingDialog } from "~/components/onboarding-dialog";
import type { Route } from "./+types/onboarding";

export function meta() {
  return [{ title: "Get Started" }];
}

export function shouldRevalidate() {
  // Don't re-run the loader after clientAction — the component manages its own flow
  return false;
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw redirect("/login");
  }

  const url = new URL(request.url);
  const returnedPlan = url.searchParams.get("plan");

  const orgs = await auth.api.listOrganizations({
    headers: request.headers,
  });

  return {
    existingOrg: orgs && orgs.length > 0 ? { slug: orgs[0].slug } : null,
    stripeEnabled,
    returnedPlan,
  };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "create-personal-workspace") {
    const name = String(formData.get("name"));
    const workspaceName = String(formData.get("workspaceName"));
    const avatarUrl = formData.get("avatarUrl") as string | null;
    const userName = String(formData.get("userName"));

    if (userName !== name) {
      await authClient.updateUser({ name: userName });
    }
    if (avatarUrl) {
      await authClient.updateUser({ image: avatarUrl });
    }

    const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data: org, error } = await authClient.organization.create({ name: workspaceName, slug });

    if (error) return data({ error: error.message || "Failed to create workspace" }, { status: 400 });

    if (org?.id) {
      await authClient.updateUser({ defaultOrganizationId: org.id } as Record<string, unknown>);
    }

    return { slug, orgId: org?.id };
  }

  if (intent === "create-team-workspace") {
    const teamName = String(formData.get("teamName"));
    const logoUrl = formData.get("logoUrl") as string || "";

    const slug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const { data: org, error } = await authClient.organization.create({
      name: teamName,
      slug,
      logo: logoUrl || undefined,
    });

    if (error) return data({ error: error.message || "Failed to create team" }, { status: 400 });

    if (org?.id) {
      await authClient.updateUser({ defaultOrganizationId: org.id } as Record<string, unknown>);
    }

    return { slug, orgId: org?.id };
  }

  if (intent === "add-passkey") {
    const result = await authClient.passkey.addPasskey();
    if (result.error) return data({ error: String(result.error.message || "Passkey registration failed") }, { status: 400 });
    return { toast: "Passkey added" };
  }

  if (intent === "enable-2fa") {
    const password = String(formData.get("password"));
    const { data: result, error } = await authClient.twoFactor.enable({ password });
    if (error) return data({ error: String(error.message || "Failed to enable 2FA") }, { status: 400 });
    return { totpURI: result?.totpURI, backupCodes: result?.backupCodes };
  }

  if (intent === "verify-totp") {
    const code = String(formData.get("code"));
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    if (error) return data({ error: String(error.message || "Invalid code") }, { status: 400 });
    return { toast: "Two-factor authentication enabled", totpVerified: true };
  }

  return data({ error: "Invalid intent" }, { status: 400 });
}

export default function OnboardingPage() {
  const { existingOrg, stripeEnabled, returnedPlan } = useLoaderData<typeof loader>();

  return (
    <OnboardingDialog
      existingOrg={existingOrg}
      stripeEnabled={stripeEnabled}
      returnedPlan={returnedPlan}
    />
  );
}
