import { useFetcher } from "react-router";
import { authClient } from "~/lib/auth-client";
import { useFetcherToast } from "~/lib/use-fetcher-toast";
import { Heading } from "~/components/heading";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "~/components/ui/item";
import { ConfirmAction } from "~/components/confirm-action";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";

export function PasskeysSection() {
  const { data: passkeys, isPending } = authClient.useListPasskeys();
  const fetcher = useFetcher<{ error?: string; toast?: string }>();
  useFetcherToast(fetcher);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Heading as="h4" title="Passkeys" />
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            fetcher.submit(
              { intent: "add-passkey" },
              { method: "post", action: "/account" },
            )
          }
        >
          Add passkey
        </Button>
      </div>
      {isPending ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : passkeys && passkeys.length > 0 ? (
        <div className="space-y-2">
          {passkeys.map((pk) => (
            <Item key={pk.id} variant="outline" size="sm">
              <ItemContent>
                <ItemTitle>{pk.name || "Passkey"}</ItemTitle>
                <ItemDescription>
                  Added {new Date(pk.createdAt).toLocaleDateString()}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <ConfirmAction
                  trigger={<HugeiconsIcon icon={Cancel01Icon} className="size-4" />}
                  variant="ghost"
                  size="icon-sm"
                  confirmText="Remove"
                  onConfirm={() =>
                    fetcher.submit(
                      { intent: "delete-passkey", id: pk.id },
                      { method: "post", action: "/account" },
                    )
                  }
                />
              </ItemActions>
            </Item>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No passkeys registered.</p>
      )}
    </div>
  );
}
