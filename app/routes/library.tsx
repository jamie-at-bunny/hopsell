import { redirect, useFetcher } from "react-router";
import { eq, desc } from "drizzle-orm";
import type { Route } from "./+types/library";
import { auth } from "~/lib/auth.server";
import { db } from "~/db/index.server";
import { orders, products } from "~/db/marketplace-schema";
import { getDownloadUrl } from "~/lib/bunny-download.server";
import { Button } from "~/components/ui/button";
import { config } from "~/lib/config";

export function meta() {
  return [{ title: `Library · ${config.name}` }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw redirect("/");

  const myOrders = await db.query.orders.findMany({
    where: eq(orders.buyerUserId, session.user.id),
    orderBy: [desc(orders.paidAt)],
    with: { product: true },
  });

  return {
    items: myOrders.map((o) => ({
      orderId: o.id,
      productTitle: o.product.title,
      originalFilename: o.product.originalFilename,
      fileSizeBytes: o.product.fileSizeBytes,
      paidAt: o.paidAt,
      status: o.status,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const formData = await request.formData();
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) {
    return Response.json({ error: "Missing orderId" }, { status: 400 });
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order || order.buyerUserId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (order.status !== "paid") {
    return Response.json({ error: "Refunded" }, { status: 410 });
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, order.productId),
  });
  if (!product) {
    return Response.json({ error: "Product missing" }, { status: 404 });
  }

  const url = await getDownloadUrl({
    storagePath: product.storagePath,
    originalFilename: product.originalFilename,
    expiresInSeconds: 60,
  });

  return Response.redirect(url, 302);
}

function formatBytes(bytes: number): string {
  if (!bytes) return "·";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(d: Date | null) {
  if (!d) return "·";
  return new Date(d).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Library({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();

  return (
    <main className="container mx-auto max-w-3xl px-4 pt-24 pb-12">
      <h1 className="text-2xl font-semibold tracking-tight">Your library</h1>
      <p className="text-hop-muted mt-1 text-sm">
        Everything you&apos;ve bought on {config.name}.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {loaderData.items.length === 0 ? (
          <p className="text-hop-muted text-sm">No purchases yet.</p>
        ) : (
          loaderData.items.map((item) => {
            const isRefunded = item.status === "refunded";
            return (
              <div
                key={item.orderId}
                className="bg-hop-surface border-hop-border flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[0.9375rem] font-medium">
                    {item.productTitle}
                  </p>
                  <p className="text-hop-muted truncate text-[0.75rem] tabular-nums">
                    {item.originalFilename} · {formatBytes(item.fileSizeBytes)}{" "}
                    · bought {formatDate(item.paidAt)}
                  </p>
                </div>
                {isRefunded ? (
                  <span className="text-hop-muted shrink-0 text-[0.75rem] tracking-wider uppercase">
                    Refunded
                  </span>
                ) : (
                  <fetcher.Form method="post" className="shrink-0">
                    <input type="hidden" name="orderId" value={item.orderId} />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={fetcher.state !== "idle"}
                    >
                      {fetcher.state !== "idle" ? "Preparing…" : "Download"}
                    </Button>
                  </fetcher.Form>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
