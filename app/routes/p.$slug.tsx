import { Link, useFetcher, useSearchParams } from "react-router";
import { eq } from "drizzle-orm";
import type { Route } from "./+types/p.$slug";
import { auth } from "~/lib/auth.server";
import { db } from "~/db/index.server";
import { products } from "~/db/marketplace-schema";
import { Button } from "~/components/ui/button";
import { ShareBlock } from "~/components/share-block";
import { config } from "~/lib/config";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function meta({ data }: Route.MetaArgs) {
  if (!data?.product) return [{ title: `${config.name}` }];
  return [
    { title: `${data.product.title} — ${config.name}` },
    {
      name: "description",
      content:
        data.product.description ?? `Buy ${data.product.title} on ${config.name}`,
    },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const product = await db.query.products.findFirst({
    where: eq(products.slug, params.slug!),
  });
  if (!product) throw new Response("Not Found", { status: 404 });

  const session = await auth.api.getSession({ headers: request.headers });
  const viewerId = session?.user.id;
  const isOwner = !!viewerId && viewerId === product.userId;

  if (product.status !== "live" && !isOwner) {
    throw new Response("Not Found", { status: 404 });
  }

  const baseURL = process.env.BETTER_AUTH_URL || new URL(request.url).origin;
  const shareUrl = `${baseURL.replace(/\/$/, "")}/p/${product.slug}`;

  return {
    product: {
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      priceCents: product.priceCents,
      currency: product.currency,
      status: product.status,
    },
    isOwner,
    shareUrl,
  };
}

export default function ProductPage({ loaderData }: Route.ComponentProps) {
  const { product, isOwner, shareUrl } = loaderData;
  const connectFetcher = useFetcher<{ url?: string; error?: string }>();
  const [searchParams] = useSearchParams();
  const isPending = product.status === "pending_connect";
  const justReturnedFromStripe = searchParams.get("stripe") === "return";

  const banner = justReturnedFromStripe
    ? {
        eyebrow: "Almost there",
        title: "We're verifying your account.",
        body: "This usually takes a few seconds. Refresh in a moment, or jump back in if anything was missing.",
        cta: "Resume onboarding →",
      }
    : {
        eyebrow: "Pick up where you left off",
        title: "Finish setup to take this page live.",
        body: "We saved your draft. Continue setup (about 2 minutes) and your page publishes automatically.",
        cta: "Resume onboarding →",
      };

  return (
    <main className="text-hop-text mx-auto flex min-h-[80vh] max-w-md flex-col px-4 py-12">
      {isOwner && isPending && (
        <section className="bg-hop-surface border-hop-border mb-6 rounded-2xl border p-5">
          <div className="text-hop-muted mb-1.5 text-[10px] tracking-[0.18em] uppercase">
            {banner.eyebrow}
          </div>
          <h2 className="text-[1rem] font-semibold tracking-tight text-balance">
            {banner.title}
          </h2>
          <p className="text-hop-muted mt-2 text-[0.8125rem]">{banner.body}</p>
          <connectFetcher.Form
            method="post"
            action={`/api/products/${product.id}/connect`}
            className="mt-4"
          >
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={connectFetcher.state !== "idle"}
            >
              {connectFetcher.state !== "idle" ? "Redirecting…" : banner.cta}
            </Button>
          </connectFetcher.Form>
          {connectFetcher.data?.error && (
            <p className="text-destructive mt-3 text-[0.8125rem]">
              {connectFetcher.data.error}
            </p>
          )}
        </section>
      )}

      <section className="bg-hop-surface border-hop-border flex flex-1 flex-col items-center justify-center rounded-2xl border p-8 text-center">
        <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-balance">
          {product.title}
        </h1>
        {product.description && (
          <p className="text-hop-muted mt-3 max-w-[40ch] text-[0.875rem] whitespace-pre-wrap text-pretty">
            {product.description}
          </p>
        )}

        <p className="mt-8 text-[2.25rem] font-semibold tracking-tight tabular-nums">
          {formatPrice(product.priceCents, product.currency)}
        </p>

        {product.status === "live" && !isOwner ? (
          <form
            method="post"
            action={`/api/checkout/${product.id}`}
            className="mt-6 w-full"
          >
            <Button type="submit" className="w-full">
              Buy now
            </Button>
          </form>
        ) : (
          <Button type="button" disabled className="mt-6 w-full">
            {isOwner
              ? product.status === "live"
                ? "This is your product"
                : "Finish setup to enable"
              : "Unavailable"}
          </Button>
        )}

        <p className="text-hop-muted mt-4 text-[0.75rem]">
          {isOwner
            ? "Share this link to start selling."
            : "Secure payment · instant download"}
        </p>

        {product.status === "live" && (
          <div className="mt-6 w-full">
            <ShareBlock url={shareUrl} title={product.title} />
          </div>
        )}
      </section>

      {isOwner && (
        <Link
          to="/dashboard"
          className="text-hop-muted hover:text-hop-text mt-6 self-center text-[0.8125rem] transition-colors"
        >
          ← Back to dashboard
        </Link>
      )}
    </main>
  );
}
