import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { authClient, useSession } from "~/lib/auth-client";
import { Heading } from "~/components/heading";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "~/components/ui/item";
import { ConfirmAction } from "~/components/confirm-action";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

export function SessionsSection() {
  const [sessions, setSessions] = useState<
    {
      token: string;
      userAgent?: string | null;
      ipAddress?: string | null;
      createdAt: Date;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const { data: currentSession } = useSession();
  const fetcher = useFetcher<{ error?: string; toast?: string }>();

  const refreshSessions = () => {
    authClient.listSessions().then(({ data }) => {
      if (data) setSessions(data);
    });
  };

  useEffect(() => {
    authClient.listSessions().then(({ data }) => {
      if (data) setSessions(data);
      setLoading(false);
    });
  }, []);

  // Handle fetcher response
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.error) {
        toast.error(fetcher.data.error);
      } else if (fetcher.data.toast) {
        toast(fetcher.data.toast);
        refreshSessions();
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Heading as="h4" title="Active Sessions" />
        {sessions.length > 1 && (
          <ConfirmAction
            trigger="Sign out all other devices"
            variant="outline"
            size="sm"
            onConfirm={() =>
              fetcher.submit(
                { intent: "revoke-other-sessions" },
                { method: "post", action: "/account" },
              )
            }
          />
        )}
      </div>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : sessions.length > 0 ? (
        <div className="space-y-2">
          {sessions.map((s) => {
            const isCurrent = s.token === currentSession?.session.token;
            return (
              <Item key={s.token} variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>
                    {s.userAgent
                      ? s.userAgent.slice(0, 50) +
                        (s.userAgent.length > 50 ? "..." : "")
                      : "Unknown device"}
                    {isCurrent && (
                      <span className="text-muted-foreground text-xs font-normal">
                        (this device)
                      </span>
                    )}
                  </ItemTitle>
                  <ItemDescription>
                    {s.ipAddress || "Unknown IP"} &middot; Since{" "}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </ItemDescription>
                </ItemContent>
                {!isCurrent && (
                  <ItemActions>
                    <ConfirmAction
                      trigger={<HugeiconsIcon icon={Cancel01Icon} className="size-4" />}
                      variant="ghost"
                      size="icon-sm"
                      confirmText="Revoke"
                      onConfirm={() =>
                        fetcher.submit(
                          { intent: "revoke-session", token: s.token },
                          { method: "post", action: "/account" },
                        )
                      }
                    />
                  </ItemActions>
                )}
              </Item>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No active sessions.</p>
      )}
    </div>
  );
}
