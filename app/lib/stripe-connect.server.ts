import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "~/db/index.server";
import { user as userTable } from "~/db/auth-schema";
import { products } from "~/db/marketplace-schema";
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

export async function reconcileConnectAccount(
  account: Stripe.Account,
): Promise<void> {
  const isReady =
    !!account.charges_enabled &&
    !!account.payouts_enabled &&
    !!account.details_submitted;

  const updated = await db
    .update(userTable)
    .set({
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
      stripeAccountStatus: isReady ? "active" : "pending",
    })
    .where(eq(userTable.stripeAccountId, account.id))
    .returning();

  const owner = updated[0];
  if (!isReady || !owner) return;

  await db
    .update(products)
    .set({ status: "live" })
    .where(
      and(
        eq(products.userId, owner.id),
        eq(products.status, "pending_connect"),
      ),
    );
}

export async function reconcileConnectAccountById(
  stripeAccountId: string,
): Promise<void> {
  try {
    const account = await stripe().accounts.retrieve(stripeAccountId);
    await reconcileConnectAccount(account);
  } catch (err) {
    console.error("[stripe-connect] reconcile failed:", err);
  }
}

export interface ConnectBalanceSummary {
  currency: string;
  availableCents: number;
  pendingCents: number;
}

export async function getConnectBalance(
  stripeAccountId: string,
): Promise<ConnectBalanceSummary | null> {
  try {
    const balance = await stripe().balance.retrieve({
      stripeAccount: stripeAccountId,
    });
    // Sum across all currencies; Hopsell is GBP-only so this is essentially
    // the GBP figure. If multi-currency is added later, group by currency.
    const sum = (
      arr: Array<{ amount: number; currency: string }>,
    ): { amount: number; currency: string } => {
      const total = arr.reduce((acc, b) => acc + b.amount, 0);
      return { amount: total, currency: arr[0]?.currency ?? "gbp" };
    };
    const available = sum(balance.available ?? []);
    const pending = sum(balance.pending ?? []);
    return {
      currency: available.currency || pending.currency,
      availableCents: available.amount,
      pendingCents: pending.amount,
    };
  } catch (err) {
    console.error("[stripe-connect] balance fetch failed:", err);
    return null;
  }
}

export async function createExpressDashboardLink(
  stripeAccountId: string,
): Promise<string | null> {
  try {
    const link = await stripe().accounts.createLoginLink(stripeAccountId);
    return link.url;
  } catch (err) {
    console.error("[stripe-connect] login link failed:", err);
    return null;
  }
}
