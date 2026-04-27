import { Link } from "react-router";
import { eq, and } from "drizzle-orm";
import type { Route } from "./+types/p.$slug.thanks";
import { db } from "~/db/index.server";
import { products, orders } from "~/db/marketplace-schema";
import { reconcileCheckoutSessionById } from "~/lib/stripe-checkout.server";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { config } from "~/lib/config";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function meta() {
  return [{ title: `Thanks · ${config.name}` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    throw new Response("Missing session", { status: 400 });
  }

  const product = await db.query.products.findFirst({
    where: eq(products.slug, params.slug!),
  });
  if (!product) {
    throw new Response("Not Found", { status: 404 });
  }

  let order = await db.query.orders.findFirst({
    where: and(
      eq(orders.stripeSessionId, sessionId),
      eq(orders.productId, product.id),
    ),
  });

  if (!order) {
    await reconcileCheckoutSessionById(sessionId);
    order = await db.query.orders.findFirst({
      where: and(
        eq(orders.stripeSessionId, sessionId),
        eq(orders.productId, product.id),
      ),
    });
  }

  return {
    product: {
      title: product.title,
      description: product.description,
      priceCents: product.priceCents,
      currency: product.currency,
      originalFilename: product.originalFilename,
    },
    order: order
      ? {
          downloadToken: order.downloadToken,
          buyerEmail: order.buyerEmail,
        }
      : null,
  };
}

export default function ThanksPage({ loaderData }: Route.ComponentProps) {
  const { product, order } = loaderData;

  return (
    <main className="text-hop-text mx-auto flex min-h-[80vh] max-w-md flex-col px-4 pt-24 pb-12">
      <section className="bg-hop-surface border-hop-border flex flex-1 flex-col items-center justify-center rounded-2xl border p-8 text-center">
        <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-balance">
          {product.title}
        </h1>

        <span className="bg-hop-hover text-hop-text mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wider uppercase">
          <span className="bg-hop-text size-1.5 rounded-full" />
          Paid
        </span>

        <p className="mt-6 text-[2.25rem] font-semibold tracking-tight tabular-nums">
          {formatPrice(product.priceCents, product.currency)}
        </p>

        {order ? (
          <a
            href={`/d/${order.downloadToken}`}
            download={product.originalFilename}
            className={cn(buttonVariants(), "mt-6 w-full")}
          >
            Download {product.originalFilename}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={cn(buttonVariants({ variant: "outline" }), "mt-6 w-full")}
          >
            Refresh
          </button>
        )}

        <p className="text-hop-muted mt-4 text-[0.75rem]">
          {order ? (
            <>Receipt sent to {order.buyerEmail}</>
          ) : (
            <>Finalising your order. Refresh in a few seconds.</>
          )}
        </p>
      </section>

      <Link
        to="/library"
        className="text-hop-muted hover:text-hop-text mt-6 self-center text-[0.8125rem] transition-colors"
      >
        ← Re-download anytime from your library
      </Link>
    </main>
  );
}
