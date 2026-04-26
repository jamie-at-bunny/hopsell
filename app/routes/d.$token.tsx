import { Link, isRouteErrorResponse } from "react-router";
import { eq, sql } from "drizzle-orm";
import type { Route } from "./+types/d.$token";
import { db } from "~/db/index.server";
import { orders, products } from "~/db/marketplace-schema";
import { getDownloadUrl } from "~/lib/bunny-download.server";
import { config } from "~/lib/config";

export function meta() {
  return [{ title: `Download — ${config.name}` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.downloadToken, params.token!),
  });
  if (!order) {
    throw new Response("Download link not found", { status: 404 });
  }
  if (order.status !== "paid") {
    throw new Response("This order is no longer downloadable", {
      status: 410,
    });
  }
  if (
    order.downloadTokenExpiresAt &&
    order.downloadTokenExpiresAt.getTime() < Date.now()
  ) {
    throw new Response("This download link has expired", { status: 410 });
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, order.productId),
  });
  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  await db
    .update(orders)
    .set({ downloadCount: sql`${orders.downloadCount} + 1` })
    .where(eq(orders.id, order.id));

  const url = await getDownloadUrl({
    storagePath: product.storagePath,
    originalFilename: product.originalFilename,
    expiresInSeconds: 60,
  });

  return Response.redirect(url, 302);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Download unavailable";
  let detail = "Something went wrong.";
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Link not found";
      detail = "This download link doesn't exist.";
    } else if (error.status === 410) {
      title = "Link expired";
      detail =
        typeof error.data === "string"
          ? error.data
          : "This download link has expired or been refunded.";
    }
  }

  return (
    <main className="container mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-hop-muted mt-3 text-[0.9375rem]">{detail}</p>
      <p className="text-hop-muted mt-6 text-[0.875rem]">
        If you bought this, you can sign in and re-download from{" "}
        <Link to="/library" className="text-hop-text underline">
          your library
        </Link>
        .
      </p>
    </main>
  );
}

export default function DownloadRoute() {
  return null;
}
