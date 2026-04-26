import { redirect } from "react-router";
import { eq } from "drizzle-orm";
import type { Route } from "./+types/api.products.$id.connect";
import { auth } from "~/lib/auth.server";
import { db } from "~/db/index.server";
import { products } from "~/db/marketplace-schema";
import { user as userTable } from "~/db/auth-schema";
import { createOnboardingLink } from "~/lib/stripe-connect.server";

export async function action({ request, params }: Route.ActionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, params.id!),
  });
  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const seller = await db.query.user.findFirst({
    where: eq(userTable.id, session.user.id),
  });
  if (!seller) {
    return Response.json({ error: "User missing" }, { status: 500 });
  }

  try {
    const url = await createOnboardingLink({
      seller: {
        id: seller.id,
        email: seller.email,
        stripeAccountId: seller.stripeAccountId ?? null,
      },
      returnUrl: `/p/${product.slug}?stripe=return`,
      refreshUrl: `/p/${product.slug}?stripe=refresh`,
    });
    throw redirect(url, 303);
  } catch (err) {
    if (err instanceof Response) throw err;
    const message =
      err instanceof Error ? err.message : "Stripe onboarding failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

export function loader() {
  return new Response("Method Not Allowed", { status: 405 });
}
