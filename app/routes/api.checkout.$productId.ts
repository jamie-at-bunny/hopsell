import { redirect } from "react-router";
import { eq } from "drizzle-orm";
import type { Route } from "./+types/api.checkout.$productId";
import { auth } from "~/lib/auth.server";
import { db } from "~/db/index.server";
import { products } from "~/db/marketplace-schema";
import { user as userTable } from "~/db/auth-schema";
import { stripe } from "~/lib/stripe.server";
import { serverConfig } from "~/lib/server-config.server";

const baseURL = () =>
  process.env.BETTER_AUTH_URL || "http://localhost:5173";

export async function action({ request, params }: Route.ActionArgs) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, params.productId!),
  });
  if (!product) {
    throw new Response("Not Found", { status: 404 });
  }
  if (product.status !== "live") {
    throw new Response("Product not available", { status: 400 });
  }

  const seller = await db.query.user.findFirst({
    where: eq(userTable.id, product.userId),
  });
  if (!seller?.stripeAccountId || !seller.chargesEnabled) {
    throw new Response("Seller cannot accept payments yet", { status: 400 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const buyerEmail = session?.user.email?.toLowerCase().trim();
  if (buyerEmail && buyerEmail === seller.email.toLowerCase().trim()) {
    throw new Response("You can't buy your own product", { status: 400 });
  }

  const feeBps = serverConfig.platformFeeBps;
  const applicationFeeAmount = Math.floor((product.priceCents * feeBps) / 10_000);

  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: product.currency,
          product_data: { name: product.title },
          unit_amount: product.priceCents,
        },
        quantity: 1,
      },
    ],
    customer_email: buyerEmail || undefined,
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: { destination: seller.stripeAccountId },
    },
    success_url: `${baseURL()}/p/${product.slug}/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseURL()}/p/${product.slug}`,
    metadata: { product_id: product.id, seller_id: seller.id },
  });

  if (!checkout.url) {
    throw new Response("Stripe Checkout URL missing", { status: 500 });
  }

  throw redirect(checkout.url, 303);
}

export function loader() {
  return new Response("Method Not Allowed", { status: 405 });
}
