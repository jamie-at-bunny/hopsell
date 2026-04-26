import { eq } from "drizzle-orm";
import { db } from "~/db/index.server";
import { user as userTable } from "~/db/auth-schema";
import { stripe } from "~/lib/stripe.server";

const baseURL = () =>
  process.env.BETTER_AUTH_URL || "http://localhost:5173";

function absolute(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const slash = path.startsWith("/") ? "" : "/";
  return `${baseURL()}${slash}${path}`;
}

export async function createOnboardingLink(opts: {
  seller: { id: string; email: string; stripeAccountId: string | null };
  returnUrl?: string;
  refreshUrl?: string;
}): Promise<string> {
  let accountId = opts.seller.stripeAccountId;

  if (!accountId) {
    const account = await stripe().accounts.create({
      type: "express",
      country: "GB",
      email: opts.seller.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
    });
    accountId = account.id;
    await db
      .update(userTable)
      .set({ stripeAccountId: accountId })
      .where(eq(userTable.id, opts.seller.id));
  }

  const link = await stripe().accountLinks.create({
    account: accountId,
    refresh_url: absolute(opts.refreshUrl ?? "/dashboard?stripe=refresh"),
    return_url: absolute(opts.returnUrl ?? "/dashboard?stripe=return"),
    type: "account_onboarding",
  });

  return link.url;
}
