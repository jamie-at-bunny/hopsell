import { eq, and } from "drizzle-orm";
import type { Route } from "./+types/api.webhooks.stripe-connect";
import type Stripe from "stripe";
import { stripe } from "~/lib/stripe.server";
import { db } from "~/db/index.server";
import { user as userTable } from "~/db/auth-schema";
import { products } from "~/db/marketplace-schema";

export async function action({ request }: Route.ActionArgs) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook not configured", { status: 500 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "bad signature";
    return new Response(`Webhook error: ${msg}`, { status: 400 });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const isReady =
      !!account.charges_enabled &&
      !!account.payouts_enabled &&
      !!account.details_submitted;

    const updated = await db
      .update(userTable)
      .set({
        chargesEnabled: !!account.charges_enabled,
        payoutsEnabled: !!account.payouts_enabled,
        stripeAccountStatus: isReady ? "active" : "pending",
      })
      .where(eq(userTable.stripeAccountId, account.id))
      .returning();

    const owner = updated[0];
    if (isReady && owner) {
      await db
        .update(products)
        .set({ status: "live" })
        .where(
          and(
            eq(products.userId, owner.id),
            eq(products.status, "pending_connect"),
          ),
        );
    }
  }

  return new Response(null, { status: 200 });
}
