import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { authClient, useSession } from "~/lib/auth-client";
import { useSubscription } from "~/lib/use-subscription";
import { Heading } from "~/components/heading";
import { FormField } from "~/components/form-field";
import { StatusBadge } from "~/components/status-badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "~/components/ui/item";
import { canDo } from "~/components/workspace-settings-dialog/utils";

export function BillingTab() {
  const { data: session } = useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const myRole = (activeOrg as { members?: { userId: string; role: string }[] })
    ?.members?.find((m) => m.userId === session?.user.id)?.role;
  const canManage = canDo(myRole, { organization: ["update"] });

  const { subscription, loading: subLoading, refresh: refreshSubscription } = useSubscription(activeOrg?.id, { sync: true });
  const [processing, setProcessing] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  const [email, setEmail] = useState("");
  const [loaded, setLoaded] = useState(false);

  interface Invoice {
    id: string;
    number: string | null;
    status: string;
    amount: number;
    currency: string;
    created: string | null;
    hostedUrl: string | null;
    pdfUrl: string | null;
  }

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  interface PlanDetails {
    plan: string;
    price: number | null;
    currency: string | null;
    interval: string | null;
    nextBillingDate: string | null;
  }
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);

  const loadFetcher = useFetcher<{ email?: string | null; error?: string }>();
  const saveFetcher = useFetcher<{ error?: string; toast?: string }>();

  useEffect(() => {
    if (activeOrg?.id) {
      loadFetcher.submit(
        { intent: "get-billing-email", orgId: activeOrg.id },
        { action: "/api/billing", method: "post" },
      );

      // Fetch invoices
      fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ intent: "get-invoices", orgId: activeOrg.id }),
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => setInvoices(data.invoices || []))
        .catch(() => {});

      // Fetch plan details (price, interval, next billing date)
      fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ intent: "get-plan-details", orgId: activeOrg.id }),
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => setPlanDetails(data))
        .catch(() => {});
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    if (loadFetcher.state === "idle" && loadFetcher.data) {
      if (!loadFetcher.data.error) {
        setEmail(loadFetcher.data.email || "");
        setLoaded(true);
      }
    }
  }, [loadFetcher.state, loadFetcher.data]);

  useEffect(() => {
    if (saveFetcher.state === "idle" && saveFetcher.data) {
      if (saveFetcher.data.error) {
        toast.error(saveFetcher.data.error);
      } else if (saveFetcher.data.toast) {
        toast(saveFetcher.data.toast);
      }
    }
  }, [saveFetcher.state, saveFetcher.data]);

  const saving = saveFetcher.state !== "idle";
  const loading = (loadFetcher.state !== "idle" && !loaded) || subLoading;

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";
  const isCancelling = isPro && (subscription?.cancelAtPeriodEnd || !!subscription?.cancelAt);
  const planLabel = subscription?.plan === "pro" ? "Pro" : "Free";
  const slug = (activeOrg as any)?.slug;

  const cancelDate = subscription?.cancelAt || subscription?.periodEnd;
  const cancelDateFormatted = cancelDate
    ? new Date(cancelDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const handleUpgrade = async () => {
    if (!activeOrg?.id || (isPro && !isCancelling)) return;
    setProcessing(true);

    if (isCancelling) {
      // Resubscribe — restore the cancelled subscription
      const { error } = await (authClient as any).subscription.restore({
        referenceId: activeOrg.id,
      });
      if (error) {
        toast.error(String(error.message || "Failed to restore subscription"));
      } else {
        toast("Subscription restored!");
        refreshSubscription();
      }
      setProcessing(false);
      return;
    }

    // Upgrade to pro — redirect to Stripe Checkout
    const upgradeParams: Record<string, unknown> = {
      plan: "pro",
      referenceId: activeOrg.id,
      customerType: "organization",
      successUrl: `${window.location.origin}/${slug}/settings?tab=billing&upgraded=true`,
      cancelUrl: `${window.location.origin}/${slug}/settings?tab=billing`,
    };
    if (subscription?.stripeSubscriptionId) {
      upgradeParams.subscriptionId = subscription.stripeSubscriptionId;
    }
    const { error } = await (authClient as any).subscription.upgrade(upgradeParams);
    if (error) {
      toast.error(String(error.message || "Failed to start checkout"));
    }
    setProcessing(false);
  };

  // Cancel redirects to Stripe Billing Portal where user confirms
  const handleCancel = async () => {
    if (!activeOrg?.id) return;
    setProcessing(true);

    const { error } = await (authClient as any).subscription.cancel({
      referenceId: activeOrg.id,
      returnUrl: `${window.location.origin}/${slug}/settings?tab=billing`,
    });
    if (error) {
      toast.error(String(error.message || "Failed to open cancellation portal"));
      setProcessing(false);
    }
    // Stripe portal handles the redirect — no need to setProcessing(false)
  };

  return (
    <div className="space-y-6">
      <Heading
        title="Billing"
        description={
          canManage
            ? "Manage billing settings for this workspace."
            : "Billing settings for this workspace."
        }
      />

      <FormField label="Plan">
      <Item variant="outline" size="sm">
        <ItemContent>
          <ItemTitle>
            {planLabel}
            {isCancelling ? (
              <StatusBadge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Ending soon
              </StatusBadge>
            ) : (
              <StatusBadge variant={isPro ? "primary" : "default"}>
                {isPro ? "Active" : "Free"}
              </StatusBadge>
            )}
          </ItemTitle>
          {planDetails?.price != null && planDetails.currency && planDetails.interval && (
            <ItemDescription>
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: planDetails.currency,
              }).format(planDetails.price / 100)}
              /{planDetails.interval}
            </ItemDescription>
          )}
          {isCancelling && cancelDateFormatted ? (
            <ItemDescription>Active until {cancelDateFormatted}</ItemDescription>
          ) : isPro && planDetails?.nextBillingDate ? (
            <ItemDescription>
              Next billing date:{" "}
              {new Date(planDetails.nextBillingDate).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </ItemDescription>
          ) : isPro && cancelDateFormatted ? (
            <ItemDescription>Renews {cancelDateFormatted}</ItemDescription>
          ) : null}
        </ItemContent>
        {canManage && (
          <ItemActions>
            {isPro && !isCancelling && (
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={processing}>
                {processing ? "Processing..." : "Cancel plan"}
              </Button>
            )}
            {isCancelling && (
              <Button size="sm" onClick={handleUpgrade} disabled={processing}>
                {processing ? "Processing..." : "Resubscribe"}
              </Button>
            )}
            {!isPro && (
              <Button size="sm" onClick={handleUpgrade} disabled={processing}>
                {processing ? "Processing..." : "Upgrade to Pro"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={openingPortal}
              onClick={async () => {
                if (!activeOrg?.id) return;
                setOpeningPortal(true);
                const { error } = await (authClient as any).subscription.billingPortal({
                  referenceId: activeOrg.id,
                  customerType: "organization",
                  returnUrl: `${window.location.origin}/${slug}/settings?tab=billing`,
                });
                if (error) {
                  toast.error(String(error.message || "Failed to open billing portal"));
                }
                setOpeningPortal(false);
              }}
            >
              {openingPortal ? "Opening..." : "Manage"}
            </Button>
          </ItemActions>
        )}
      </Item>
      </FormField>

      <Separator />

      <FormField label="Billing email" htmlFor="billing-email">
        {canManage ? (
          <div className="flex gap-2">
            <Input
              id="billing-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="billing@company.com"
            />
            <Button
              onClick={() =>
                saveFetcher.submit(
                  { intent: "update-billing-email", orgId: activeOrg?.id || "", email },
                  { action: "/api/billing", method: "post" },
                )
              }
              disabled={saving || !email.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Contact a workspace admin to update billing details.
          </p>
        )}
      </FormField>

      {canManage && (
        <>
          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">Invoices</p>
            {invoices.length > 0 ? (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <Item key={inv.id} variant="outline" size="sm">
                    <ItemContent>
                      <ItemTitle>{inv.number || inv.id}</ItemTitle>
                      <ItemDescription>
                        {inv.created
                          ? new Date(inv.created).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                        {" · "}
                        {new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: inv.currency,
                        }).format(inv.amount / 100)}
                        {inv.status === "paid" && " · Paid"}
                        {inv.status === "open" && " · Open"}
                        {inv.status === "draft" && " · Draft"}
                      </ItemDescription>
                    </ItemContent>
                    {inv.hostedUrl && (
                      <ItemActions>
                        <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">View</Button>
                        </a>
                      </ItemActions>
                    )}
                  </Item>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">No invoices yet.</p>
            )}
          </div>

        </>
      )}
    </div>
  );
}
