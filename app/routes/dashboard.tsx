import { redirect, Link, useFetcher } from "react-router";
import { eq, desc, and, inArray } from "drizzle-orm";
import type { Route } from "./+types/dashboard";
import { auth } from "~/lib/auth.server";
import { db } from "~/db/index.server";
import { products, orders } from "~/db/marketplace-schema";
import { user as userTable } from "~/db/auth-schema";
import { getConnectBalance } from "~/lib/stripe-connect.server";
import { Button, buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { EditProductDialog } from "~/components/edit-product-dialog";
import { ConfirmAction } from "~/components/confirm-action";

export function meta() {
  return [{ title: "Dashboard" }];
}

function formatPrice(cents: number, currency = "gbp"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw redirect("/");

  const u = await db.query.user.findFirst({
    where: eq(userTable.id, session.user.id),
    columns: {
      id: true,
      email: true,
      stripeAccountId: true,
      chargesEnabled: true,
      stripeAccountStatus: true,
    },
  });
  if (!u) throw redirect("/");

  const myProducts = await db
    .select()
    .from(products)
    .where(eq(products.userId, u.id))
    .orderBy(desc(products.createdAt));

  const productIds = myProducts.map((p) => p.id);
  const myOrders =
    productIds.length === 0
      ? []
      : await db
          .select()
          .from(orders)
          .where(
            and(
              inArray(orders.productId, productIds),
              eq(orders.status, "paid"),
            ),
          );

  const totalNetCents = myOrders.reduce(
    (acc, o) => acc + (o.amountCents - o.applicationFeeCents),
    0,
  );

  const balance =
    u.chargesEnabled && u.stripeAccountId
      ? await getConnectBalance(u.stripeAccountId)
      : null;

  return {
    user: {
      id: u.id,
      email: u.email,
      chargesEnabled: !!u.chargesEnabled,
      stripeAccountStatus: u.stripeAccountStatus ?? null,
    },
    products: myProducts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      priceCents: p.priceCents,
      currency: p.currency,
      status: p.status,
      fileExtension: p.fileExtension,
      fileSizeBytes: p.fileSizeBytes,
    })),
    stats: {
      salesCount: myOrders.length,
      totalNetCents,
      currency:
        myOrders[0]?.currency ?? balance?.currency ?? "gbp",
    },
    balance,
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user, products, stats, balance } = loaderData;

  return (
    <main className="container mx-auto max-w-3xl px-4 pt-24 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-hop-muted text-sm">{user.email}</p>
        </div>
        <Link to="/" className={cn(buttonVariants(), "w-fit")}>
          + New product
        </Link>
      </div>

      {!user.chargesEnabled && (
        <div className="border-hop-border bg-hop-surface mt-6 rounded-lg border p-4">
          <p className="text-sm font-medium">Connect your bank to go live</p>
          <p className="text-hop-muted mt-1 text-sm">
            Your products are private until Stripe verifies your account.
          </p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Net earnings" value={formatPrice(stats.totalNetCents, stats.currency)} />
        <Stat
          label="Sales"
          value={String(stats.salesCount)}
        />
        <Stat
          label="Available"
          value={
            balance
              ? formatPrice(balance.availableCents, balance.currency)
              : "—"
          }
          hint={balance ? undefined : "Activate Stripe to see"}
        />
        <Stat
          label="Pending payout"
          value={
            balance
              ? formatPrice(balance.pendingCents, balance.currency)
              : "—"
          }
          hint={balance ? undefined : "Activate Stripe to see"}
        />
      </div>

      {user.chargesEnabled && (
        <form method="post" action="/api/connect/dashboard" className="mt-4">
          <Button type="submit" variant="outline" size="sm">
            View payouts on Stripe →
          </Button>
        </form>
      )}

      <div className="mt-10 flex flex-col gap-3">
        <h2 className="text-hop-muted text-[0.6875rem] font-medium tracking-[0.18em] uppercase">
          Products
        </h2>
        {products.length === 0 ? (
          <p className="text-hop-muted text-sm">
            No products yet.{" "}
            <Link to="/" className="text-hop-text underline underline-offset-4">
              Drop a file
            </Link>{" "}
            to get started.
          </p>
        ) : (
          products.map((p) => <ProductRow key={p.id} product={p} />)
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-hop-surface border-hop-border rounded-lg border p-3">
      <div className="text-hop-muted text-[0.6875rem] tracking-[0.12em] uppercase">
        {label}
      </div>
      <div className="mt-1 text-[1.125rem] font-semibold tabular-nums">
        {value}
      </div>
      {hint && (
        <div className="text-hop-muted mt-1 text-[0.6875rem]">{hint}</div>
      )}
    </div>
  );
}

function ProductRow({
  product,
}: {
  product: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    priceCents: number;
    currency: string;
    status: string;
    fileExtension: string;
    fileSizeBytes: number;
  };
}) {
  const deleteFetcher = useFetcher<{ error?: string }>();
  const pauseFetcher = useFetcher();
  const isPaused = product.status === "paused";
  const deleteError =
    deleteFetcher.data && "error" in deleteFetcher.data
      ? deleteFetcher.data.error
      : null;

  return (
    <div className="border-hop-border bg-hop-surface flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{product.title}</p>
        <p className="text-hop-muted mt-0.5 text-xs tabular-nums">
          /{product.slug} · {product.status} ·{" "}
          {formatPrice(product.priceCents, product.currency)}
        </p>
        {deleteError && (
          <p className="text-destructive mt-2 text-[0.8125rem]">
            {deleteError}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/p/${product.slug}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          View
        </Link>

        <EditProductDialog
          product={product}
          trigger={
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Edit
            </button>
          }
        />

        <pauseFetcher.Form method="post" action={`/api/products/${product.id}`}>
          <input
            type="hidden"
            name="_action"
            value={isPaused ? "unpause" : "pause"}
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={pauseFetcher.state !== "idle"}
          >
            {isPaused ? "Unpause" : "Pause"}
          </Button>
        </pauseFetcher.Form>

        <ConfirmAction
          trigger="Delete"
          variant="destructive"
          size="sm"
          confirmText="Delete"
          onConfirm={() => {
            const fd = new FormData();
            fd.append("_action", "delete");
            deleteFetcher.submit(fd, {
              method: "post",
              action: `/api/products/${product.id}`,
            });
          }}
        />
      </div>
    </div>
  );
}
