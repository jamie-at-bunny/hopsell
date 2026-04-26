import { redirect } from "react-router";
import { auth } from "~/lib/auth.server";
import { Welcome } from "../welcome/welcome";
import type { Route } from "./+types/home";

export function meta() {
  return [
    { title: "LaunchMade" },
    { name: "description", content: "Welcome to LaunchMade" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return null;
  }

  // Fetch user's organizations
  const orgs = await auth.api.listOrganizations({
    headers: request.headers,
  });

  if (!orgs || orgs.length === 0) {
    // If the user has a pending invite link redirect, skip onboarding
    // — the invite acceptance route will auto-create a personal workspace
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get("redirect");
    if (redirectTo?.startsWith("/invite/")) {
      throw redirect(redirectTo);
    }

    throw redirect("/onboarding");
  }

  // Redirect priority: default workspace > active org > first org
  const user = session.user as Record<string, unknown>;
  const defaultOrgId = user.defaultOrganizationId as string | undefined;
  const activeOrgId = session.session.activeOrganizationId;

  const defaultOrg = defaultOrgId
    ? orgs.find((o) => o.id === defaultOrgId)
    : null;
  const activeOrg = activeOrgId
    ? orgs.find((o) => o.id === activeOrgId)
    : null;
  const targetOrg = defaultOrg || activeOrg || orgs[0];

  throw redirect(`/${targetOrg.slug}`);
}

export default function Home() {
  return <Welcome />;
}
