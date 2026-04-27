import { eq } from "drizzle-orm";
import type { Route } from "./+types/api.webhooks.stripe";
import type Stripe from "stripe";
import { stripe } from "~/lib/stripe.server";
import { db } from "~/db/index.server";
import { orders } from "~/db/marketplace-schema";
import { reconcileCheckoutSession } from "~/lib/stripe-checkout.server";

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);
  if (!paymentIntentId) return;

  await db
    .update(orders)
    .set({ status: "refunded" })
    .where(eq(orders.stripePaymentIntentId, paymentIntentId));
}

export async function action({ request }: Route.ActionArgs) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET not set");
    return new Response("Webhook not configured", { status: 500 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "bad signature";
    console.error(`[stripe] webhook signature failed: ${msg}`);
    return new Response(`Webhook error: ${msg}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await reconcileCheckoutSession(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        // ignore other events; Stripe pings will land here too
        break;
    }
  } catch (err) {
    console.error(`[stripe] handler for ${event.type} threw:`, err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
