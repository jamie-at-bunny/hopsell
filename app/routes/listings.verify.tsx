import { Link, isRouteErrorResponse } from "react-router";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Route } from "./+types/listings.verify";
import { db } from "~/db/index.server";
import { user as userTable } from "~/db/auth-schema";
import { products, pendingListings } from "~/db/marketplace-schema";
import { generateSlug, uniqueSlug } from "~/lib/slug.server";
import { createOnboardingLink } from "~/lib/stripe-connect.server";
import {
  createSessionResponseForEmail,
  redirectWithSession,
} from "~/lib/auth-actions.server";
import { config } from "~/lib/config";

export function meta() {
  return [{ title: `Confirm listing — ${config.name}` }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    throw new Response("Missing token", { status: 400 });
  }

  const pending = await db.query.pendingListings.findFirst({
    where: eq(pendingListings.token, token),
  });
  if (!pending) {
    throw new Response("Link is invalid or already used", { status: 404 });
  }
  if (pending.expiresAt.getTime() < Date.now()) {
    await db
      .delete(pendingListings)
      .where(eq(pendingListings.id, pending.id));
    throw new Response("Link expired", { status: 410 });
  }

  const owner = await db.query.user.findFirst({
    where: eq(userTable.email, pending.email),
  });
  if (!owner) {
    throw new Response("Account no longer exists", { status: 404 });
  }

  const slug = await uniqueSlug(generateSlug(pending.title));
  const productId = randomUUID();
  await db.insert(products).values({
    id: productId,
    userId: owner.id,
    slug,
    title: pending.title,
    description: pending.description ?? null,
    priceCents: pending.priceCents,
    currency: pending.currency,
    status: owner.chargesEnabled ? "live" : "pending_connect",
    fileId: pending.fileId,
    fileSizeBytes: pending.fileSizeBytes,
    fileMimeType: pending.fileMimeType,
    fileExtension: pending.fileExtension,
    originalFilename: pending.originalFilename,
    storagePath: pending.storagePath,
  });

  await db.delete(pendingListings).where(eq(pendingListings.id, pending.id));

  let destination = `/p/${slug}`;
  if (!owner.chargesEnabled && process.env.STRIPE_SECRET_KEY) {
    try {
      destination = await createOnboardingLink({
        seller: {
          id: owner.id,
          email: owner.email,
          stripeAccountId: owner.stripeAccountId ?? null,
        },
        returnUrl: `/p/${slug}?stripe=return`,
        refreshUrl: `/p/${slug}?stripe=refresh`,
      });
    } catch (err) {
      console.error("[verify-listing] Stripe onboarding link failed:", err);
    }
  }

  const sessionResponse = await createSessionResponseForEmail({
    email: owner.email,
    name: owner.name,
    callbackURL: `/p/${slug}`,
  });

  return redirectWithSession(destination, sessionResponse);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Link unavailable";
  let detail = "Something went wrong with this confirmation link.";
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Link not found";
      detail = "This confirmation link is invalid or already used.";
    } else if (error.status === 410) {
      title = "Link expired";
      detail = "Confirmation links expire after 24 hours.";
    }
  }

  return (
    <main className="container mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-hop-muted mt-3 text-[0.9375rem]">{detail}</p>
      <p className="text-hop-muted mt-6 text-[0.875rem]">
        <Link to="/" className="text-hop-text underline">
          Start over
        </Link>{" "}
        from the homepage.
      </p>
    </main>
  );
}

export default function ListingVerify() {
  return null;
}
