import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { authClient } from "~/lib/auth-client";
import { Heading } from "~/components/heading";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "~/components/ui/item";
import { Button } from "~/components/ui/button";

export function ConnectedAccountsTab() {
  const [accounts, setAccounts] = useState<
    { id: string; providerId: string; accountId: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const fetcher = useFetcher<{ error?: string; toast?: string }>();

  useEffect(() => {
    authClient.listAccounts().then(({ data }) => {
      if (data) setAccounts(data);
      setLoading(false);
    });
  }, []);

  // Refresh accounts after disconnect
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.error) {
        toast.error(fetcher.data.error);
      } else if (fetcher.data.toast) {
        toast(fetcher.data.toast);
        authClient.listAccounts().then(({ data }) => {
          if (data) setAccounts(data);
        });
      }
    }
  }, [fetcher.state, fetcher.data]);

  const providers = [{ id: "google", name: "Google" }];

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <Heading title="Connected Accounts" description="Manage your social login connections." />

      <div className="space-y-3">
        {providers.map((provider) => {
          const connected = accounts.find((a) => a.providerId === provider.id);
          return (
            <Item key={provider.id} variant="outline" size="sm">
              <ItemContent>
                <ItemTitle>{provider.name}</ItemTitle>
                <ItemDescription>
                  {connected ? "Connected" : "Not connected"}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                {connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      fetcher.submit(
                        { intent: "unlink-social", providerId: provider.id },
                        { method: "post", action: "/account" },
                      )
                    }
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      authClient.linkSocial({
                        provider: provider.id as "google",
                        callbackURL: window.location.href,
                      })
                    }
                  >
                    Connect
                  </Button>
                )}
              </ItemActions>
            </Item>
          );
        })}
      </div>
    </div>
  );
}
