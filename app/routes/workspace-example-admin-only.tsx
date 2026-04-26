import { redirect, useOutletContext } from "react-router";
import { auth } from "~/lib/auth.server";
import { requireOrgRoleBySlug } from "~/lib/authorization.server";
import type { Route } from "./+types/workspace-example-admin-only";

export function meta() {
  return [{ title: "Admin" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw redirect("/login");
  }

  await requireOrgRoleBySlug(session.user.id, params.slug, ["owner", "admin"]);

  return null;
}

export default function WorkspaceAdmin() {
  const { organization } = useOutletContext<{
    organization: { name: string; slug: string };
  }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        This page is restricted to <strong>owners</strong> and{" "}
        <strong>admins</strong> of <strong>{organization.name}</strong>.
      </p>
      <p className="text-muted-foreground mt-4 text-sm">
        Members with the <code>member</code> role will receive a 403 error.
        Replace this with billing management, danger zone actions, or workspace
        configuration.
      </p>
    </div>
  );
}
