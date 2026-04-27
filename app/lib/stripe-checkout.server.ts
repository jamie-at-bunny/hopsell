import { eq } from "drizzle-orm";
import { randomUUID, randomBytes } from "node:crypto";
import React from "react";
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

export async function reconcileCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (!session.id) return;

  const existing = await db.query.orders.findFirst({
    where: eq(orders.stripeSessionId, session.id),
    columns: { id: true },
  });
  if (existing) return;

  const productId = session.metadata?.product_id;
  if (!productId) {
    console.warn(
      `[stripe-checkout] session ${session.id} missing product_id metadata`,
    );
    return;
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!product) {
    console.warn(
      `[stripe-checkout] product ${productId} not found for session ${session.id}`,
    );
    return;
  }

  const seller = await db.query.user.findFirst({
    where: eq(userTable.id, product.userId),
  });
  if (!seller) return;

  const buyerEmail = (
    session.customer_details?.email ?? session.customer_email ?? ""
  )
    .toLowerCase()
    .trim();
  if (!buyerEmail) {
    console.warn(`[stripe-checkout] no buyer email on session ${session.id}`);
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
  const downloadTokenExpiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  );

  try {
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
  } catch (err) {
    // Concurrent reconcile (webhook + thanks page hitting at once) loses the
    // race on the unique stripeSessionId. Treat as success if the row now
    // exists.
    const after = await db.query.orders.findFirst({
      where: eq(orders.stripeSessionId, session.id),
      columns: { id: true },
    });
    if (after) return;
    throw err;
  }

  const downloadUrl = `${baseURL()}/d/${downloadToken}`;
  const libraryUrl = `${baseURL()}/library`;
  const amountFormatted = formatMoney(
    amountCents,
    session.currency ?? product.currency,
  );
  const netAmountFormatted = formatMoney(
    amountCents - applicationFeeCents,
    session.currency ?? product.currency,
  );

  void sendEmail({
    to: buyerEmail,
    subject: `Your download · ${product.title}`,
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

export async function reconcileCheckoutSessionById(
  sessionId: string,
): Promise<void> {
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return;
    await reconcileCheckoutSession(session);
  } catch (err) {
    console.error("[stripe-checkout] reconcile failed:", err);
  }
}
