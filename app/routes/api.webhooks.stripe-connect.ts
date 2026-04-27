import type { Route } from "./+types/api.webhooks.stripe-connect";
import type Stripe from "stripe";
import { stripe } from "~/lib/stripe.server";
import { reconcileConnectAccount } from "~/lib/stripe-connect.server";

export function loader() {
  return new Response("Method Not Allowed", { status: 405 });
}

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
    await reconcileConnectAccount(event.data.object as Stripe.Account);
  }

  return new Response(null, { status: 200 });
}
