import { redirect } from "react-router";
import { eq } from "drizzle-orm";
import type { Route } from "./+types/api.connect.dashboard";
import { auth } from "~/lib/auth.server";
import { db } from "~/db/index.server";
import { user as userTable } from "~/db/auth-schema";
import { createExpressDashboardLink } from "~/lib/stripe-connect.server";

export async function action({ request }: Route.ActionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const u = await db.query.user.findFirst({
    where: eq(userTable.id, session.user.id),
    columns: { stripeAccountId: true, chargesEnabled: true },
  });
  if (!u?.stripeAccountId || !u.chargesEnabled) {
    return Response.json(
      { error: "Connect account not active yet" },
      { status: 409 },
    );
  }

  const url = await createExpressDashboardLink(u.stripeAccountId);
  if (!url) {
    return Response.json(
      { error: "Could not generate dashboard link" },
      { status: 502 },
    );
  }
  throw redirect(url, 303);
}
