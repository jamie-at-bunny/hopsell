import { redirect, Link } from "react-router";
import { eq, desc } from "drizzle-orm";
import type { Route } from "./+types/dashboard";
import { auth } from "~/lib/auth.server";
import { db } from "~/db/index.server";
import { products } from "~/db/marketplace-schema";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Dashboard" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw redirect("/login");

  const u = session.user as {
    id: string;
    email: string;
    chargesEnabled?: boolean;
    stripeAccountStatus?: string | null;
  };

  const myProducts = await db
    .select()
    .from(products)
    .where(eq(products.userId, u.id))
    .orderBy(desc(products.createdAt));

  return {
    user: {
      id: u.id,
      email: u.email,
      chargesEnabled: !!u.chargesEnabled,
      stripeAccountStatus: u.stripeAccountStatus ?? null,
    },
    products: myProducts,
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return (
    <main className="container mx-auto max-w-3xl px-4 pt-24 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your products</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as {loaderData.user.email}
          </p>
        </div>
        <Link to="/" className={cn(buttonVariants())}>
          + New product
        </Link>
      </div>

      {!loaderData.user.chargesEnabled && (
        <div className="border-border bg-card mt-6 rounded-lg border p-4">
          <p className="text-sm font-medium">Connect your bank to go live</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Your products are private until Stripe verifies your account.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {loaderData.products.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No products yet. Drop a file on the home page to get started.
          </p>
        ) : (
          loaderData.products.map((p) => (
            <div
              key={p.id}
              className="border-border bg-card flex items-center justify-between rounded-md border p-4"
            >
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-muted-foreground text-xs">
                  /{p.slug} · {p.status}
                </p>
              </div>
              <Link
                to={`/p/${p.slug}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                View
              </Link>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
