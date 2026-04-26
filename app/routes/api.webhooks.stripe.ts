import { eq } from "drizzle-orm";
import { randomUUID, randomBytes } from "node:crypto";
import React from "react";
import type { Route } from "./+types/api.webhooks.stripe";
import type Stripe from "stripe";
import { stripe } from "~/lib/stripe.server";
import { db } from "~/db/index.server";
import { user as userTable } from "~/db/auth-schema";
import { products, orders } from "~/db/marketplace-schema";
import { sendEmail } from "~/lib/email.server";
import { config } from "~/lib/config";
import Purchase from "~/emails/purchase";
import Sale from "~/emails/sale";

const baseURL = () =>
  process.env.BETTER_AUTH_URL || "http://localhost:5173";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
) {
  if (!session.id) return;

  const existing = await db.query.orders.findFirst({
    where: eq(orders.stripeSessionId, session.id),
    columns: { id: true },
  });
  if (existing) return;

  const productId = session.metadata?.product_id;
  if (!productId) {
    if (event.livemode) {
      console.warn(
        `[stripe] live checkout.session.completed (${session.id}) missing product_id metadata — investigate`,
      );
    } else {
      console.debug(
        `[stripe] ignoring test event ${session.id} with no product_id (likely from stripe trigger)`,
      );
    }
    return;
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!product) {
    console.warn(`[stripe] product ${productId} not found for session ${session.id}`);
    return;
  }

  const seller = await db.query.user.findFirst({
    where: eq(userTable.id, product.userId),
  });
  if (!seller) return;

  const buyerEmail = (
    session.customer_details?.email ?? session.customer_email ?? ""
  ).toLowerCase().trim();
  if (!buyerEmail) {
    console.warn(`[stripe] no buyer email on session ${session.id}`);
    return;
  }

  let buyer = await db.query.user.findFirst({
    where: eq(userTable.email, buyerEmail),
  });
  if (!buyer) {
    const buyerId = randomUUID();
    await db.insert(userTable).values({
      id: buyerId,
      name: buyerEmail.split("@")[0] ?? "Buyer",
      email: buyerEmail,
      emailVerified: true,
      storagePrefix: randomUUID(),
    });
    buyer = await db.query.user.findFirst({
      where: eq(userTable.id, buyerId),
    });
  }
  if (!buyer) return;

  const amountCents = session.amount_total ?? product.priceCents;
  const applicationFeeCents = Math.floor(amountCents * 0.05);
  const downloadToken = randomBytes(32).toString("base64url");
  const downloadTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await db.insert(orders).values({
    id: randomUUID(),
    productId: product.id,
    buyerUserId: buyer.id,
    buyerEmail,
    stripeSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    amountCents,
    applicationFeeCents,
    currency: (session.currency ?? product.currency).toLowerCase(),
    status: "paid",
    downloadToken,
    downloadTokenExpiresAt,
    paidAt: new Date(),
  });

  const downloadUrl = `${baseURL()}/d/${downloadToken}`;
  const libraryUrl = `${baseURL()}/library`;
  const amountFormatted = formatMoney(amountCents, session.currency ?? product.currency);
  const netAmountFormatted = formatMoney(
    amountCents - applicationFeeCents,
    session.currency ?? product.currency,
  );

  void sendEmail({
    to: buyerEmail,
    subject: `Your download — ${product.title}`,
    react: React.createElement(Purchase, {
      productTitle: product.title,
      amountFormatted,
      downloadUrl,
      libraryUrl,
    }),
  });

  void sendEmail({
    to: seller.email,
    subject: `You made a sale on ${config.name}`,
    react: React.createElement(Sale, {
      productTitle: product.title,
      buyerEmail,
      netAmountFormatted,
    }),
  });
}

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
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          event,
        );
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        // ignore other events — Stripe pings will land here too
        break;
    }
  } catch (err) {
    console.error(`[stripe] handler for ${event.type} threw:`, err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
