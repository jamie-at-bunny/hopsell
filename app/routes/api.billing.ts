import { data } from "react-router";
import { eq } from "drizzle-orm";
import { db } from "~/db/index.server";
import { organization, subscription } from "~/db/auth-schema";
import { getSession } from "~/lib/session.server";
import { stripeClient } from "~/lib/auth.server";
import { logAudit } from "~/lib/audit.server";
import { requireOrgRole, requireOrgMember } from "~/lib/authorization.server";
import type { Route } from "./+types/api.billing";

export async function action({ request }: Route.ActionArgs) {
  if (!stripeClient) {
    return data({ error: "Billing is not configured" }, { status: 501 });
  }

  const session = await getSession(request);
  if (!session?.user) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  switch (intent) {
    case "update-billing-email": {
      const orgId = String(formData.get("orgId"));
      const email = String(formData.get("email"));

      if (!email.trim()) {
        return data({ error: "Email is required" }, { status: 400 });
      }

      await requireOrgRole(session.user.id, orgId, ["owner", "admin"]);

      // Get the organization's Stripe customer ID
      const [org] = await db
        .select()
        .from(organization)
        .where(eq(organization.id, orgId));

      if (!org) {
        return data({ error: "Organization not found" }, { status: 404 });
      }

      if (!org.stripeCustomerId) {
        return data({ error: "No billing account found for this workspace" }, { status: 400 });
      }

      try {
        await stripeClient.customers.update(org.stripeCustomerId, { email });
        await logAudit({
          organizationId: orgId,
          actorId: session.user.id,
          action: "billing.email_updated",
          targetType: "billing",
          metadata: { email },
        });
        return { toast: "Billing email updated" };
      } catch (err) {
        return data(
          { error: err instanceof Error ? err.message : "Failed to update billing email" },
          { status: 500 },
        );
      }
    }

    case "get-billing-email": {
      const orgId = String(formData.get("orgId"));

      await requireOrgRole(session.user.id, orgId, ["owner", "admin"]);

      const [org] = await db
        .select()
        .from(organization)
        .where(eq(organization.id, orgId));

      if (!org) {
        return data({ error: "Organization not found" }, { status: 404 });
      }

      if (!org.stripeCustomerId) {
        return { email: null };
      }

      try {
        const customer = await stripeClient.customers.retrieve(org.stripeCustomerId);
        if (customer.deleted) {
          return { email: null };
        }
        return { email: customer.email };
      } catch {
        return { email: null };
      }
    }

    case "get-invoices": {
      const orgId = String(formData.get("orgId"));

      await requireOrgRole(session.user.id, orgId, ["owner", "admin"]);

      const [org] = await db
        .select()
        .from(organization)
        .where(eq(organization.id, orgId));

      if (!org?.stripeCustomerId) {
        return Response.json({ invoices: [] });
      }

      try {
        const stripeInvoices = await stripeClient.invoices.list({
          customer: org.stripeCustomerId,
          limit: 10,
        });

        const invoices = stripeInvoices.data.map((inv: any) => ({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          amount: inv.amount_due ?? inv.total,
          currency: inv.currency,
          created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
          hostedUrl: inv.hosted_invoice_url,
          pdfUrl: inv.invoice_pdf,
        }));

        return Response.json({ invoices });
      } catch {
        return Response.json({ invoices: [] });
      }
    }

    case "get-plan-details": {
      const orgId = String(formData.get("orgId"));

      await requireOrgMember(session.user.id, orgId);

      const [sub] = await db
        .select()
        .from(subscription)
        .where(eq(subscription.referenceId, orgId));

      if (!sub?.stripeSubscriptionId) {
        return Response.json({ plan: sub?.plan || "free", price: null, currency: null, interval: null, nextBillingDate: null });
      }

      try {
        const stripeSub = await stripeClient!.subscriptions.retrieve(sub.stripeSubscriptionId) as any;
        const item = stripeSub.items?.data?.[0];
        const price = item?.price?.unit_amount ?? null;
        const currency = item?.price?.currency ?? "usd";
        const interval = item?.price?.recurring?.interval ?? null;
        const nextBillingDate = stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000).toISOString()
          : null;

        return Response.json({
          plan: sub.plan,
          price,
          currency,
          interval,
          nextBillingDate,
        });
      } catch {
        return Response.json({ plan: sub.plan, price: null, currency: null, interval: null, nextBillingDate: null });
      }
    }

    case "sync-subscription": {
      const orgId = String(formData.get("orgId"));

      await requireOrgRole(session.user.id, orgId, ["owner", "admin"]);

      // Find the subscription record for this org
      const [sub] = await db
        .select()
        .from(subscription)
        .where(eq(subscription.referenceId, orgId));

      if (!sub?.stripeSubscriptionId) {
        return { synced: true };
      }

      try {
        const stripeSub = await stripeClient.subscriptions.retrieve(sub.stripeSubscriptionId) as any;
        console.log("[sync] stripe sub keys:", Object.keys(stripeSub));
        console.log("[sync] period fields:", {
          current_period_start: stripeSub.current_period_start,
          current_period_end: stripeSub.current_period_end,
          cancel_at: stripeSub.cancel_at,
          cancel_at_period_end: stripeSub.cancel_at_period_end,
        });

        await db
          .update(subscription)
          .set({
            status: stripeSub.status,
            cancelAtPeriodEnd: !!stripeSub.cancel_at_period_end,
            cancelAt: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000) : null,
            canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
            periodStart: stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000) : null,
            periodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
          })
          .where(eq(subscription.id, sub.id));

        return { synced: true };
      } catch {
        return { synced: true };
      }
    }

    default:
      return data({ error: "Invalid intent" }, { status: 400 });
  }
}
