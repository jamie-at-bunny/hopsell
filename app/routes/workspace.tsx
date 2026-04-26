import { useEffect } from "react";
import { Outlet, redirect, useLoaderData } from "react-router";
import { auth } from "~/lib/auth.server";
import { authClient } from "~/lib/auth-client";
import type { Route } from "./+types/workspace";

export function shouldRevalidate({ formAction }: { formAction?: string }) {
  // Don't revalidate when switching accounts from the root route —
  // the page will do a full navigation to "/" immediately after.
  if (formAction === "/") return false;
  return true;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw redirect("/login");
  }

  const slug = params.slug;

  // Set active organization by slug (also verifies membership)
  let result;
  try {
    result = await auth.api.setActiveOrganization({
      headers: request.headers,
      body: { organizationSlug: slug },
    });
  } catch {
    throw new Response("Not Found", { status: 404 });
  }

  if (!result) {
    throw new Response("Not Found", { status: 404 });
  }

  return {
    organization: result,
  };
}

export default function WorkspaceLayout() {
  const { organization } = useLoaderData<typeof loader>();

  // Sync the active org on the client so the cookie cache stays current.
  // The server loader already set it, but the client cookie doesn't know yet.
  useEffect(() => {
    if (organization?.id) {
      authClient.organization.setActive({
        organizationId: organization.id,
      });
    }
  }, [organization?.id]);

  return <Outlet context={{ organization }} />;
}
