import { useState, useEffect, useCallback } from "react";
import { authClient } from "~/lib/auth-client";

export interface Subscription {
  id: string;
  plan: string;
  status: string;
  referenceId: string;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean | null;
  cancelAt: string | null;
  periodEnd: string | null;
}

export function useSubscription(orgId: string | undefined, { sync = false }: { sync?: boolean } = {}) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!orgId) {
      setSubscription(null);
      return;
    }

    setLoading(true);

    // Sync from Stripe first (client-side only)
    if (sync && typeof window !== "undefined") {
      try {
        const res = await fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ intent: "sync-subscription", orgId }),
          credentials: "include",
        });
        await res.json();
      } catch {
      }
    }

    try {
      const { data } = await (authClient as any).subscription.list({
        query: { referenceId: orgId },
      });
      const subs = data as Subscription[] | null;
      const active = subs?.find(
        (s) => s.status === "active" || s.status === "trialing",
      );
      setSubscription(active || subs?.[0] || null);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, sync]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return { subscription, loading, refresh: fetchSubscription };
}
