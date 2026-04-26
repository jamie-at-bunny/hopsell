import { useState, useEffect } from "react";
import { authClient, useSession } from "~/lib/auth-client";
import { getInitials } from "~/lib/utils";
import { Heading } from "~/components/heading";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";

interface AuditEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
  actorName: string;
  actorEmail: string;
  actorImage: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  "member.invited": "Invited a member",
  "member.removed": "Removed a member",
  "member.role_updated": "Updated a member's role",
  "member.joined_via_link": "Joined via invite link",
  "member.joined": "Joined the workspace",
  "member.left": "Left the workspace",
  "invitation.cancelled": "Cancelled an invitation",
  "invite_link.created": "Created an invite link",
  "invite_link.revoked": "Revoked an invite link",
  "workspace.updated": "Updated workspace settings",
  "workspace.deleted": "Deleted the workspace",
  "billing.email_updated": "Updated billing email",
  "billing.subscription_upgraded": "Upgraded to Pro",
  "billing.subscription_cancelled": "Cancelled subscription",
  "billing.subscription_restored": "Restored subscription",
  "sso.provider_added": "Added an SSO provider",
  "sso.provider_removed": "Removed an SSO provider",
};

function formatAction(action: string, metadata: string | null): string {
  const label = ACTION_LABELS[action];
  if (label) {
    if (metadata) {
      try {
        const meta = JSON.parse(metadata);
        if (meta.email) return `${label} (${meta.email})`;
        if (meta.name) return `${label} (${meta.name})`;
        if (meta.role) return `${label} as ${meta.role}`;
      } catch {
        // ignore
      }
    }
    return label;
  }
  return action;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function AuditTab() {
  const { data: activeOrg } = authClient.useActiveOrganization();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchEntries = async (offset = 0) => {
    if (!activeOrg?.id) return;
    const isLoadMore = offset > 0;
    if (isLoadMore) setLoadingMore(true);

    try {
      const res = await fetch("/api/audit-log", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          intent: "list",
          orgId: activeOrg.id,
          limit: "50",
          offset: String(offset),
        }),
        credentials: "include",
      });
      const data = await res.json();
      const newEntries = data.entries || [];

      if (isLoadMore) {
        setEntries((prev) => [...prev, ...newEntries]);
      } else {
        setEntries(newEntries);
      }
      setHasMore(newEntries.length === 50);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [activeOrg?.id]);

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <Heading
        title="Audit Log"
        description="Recent activity in this workspace."
      />

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">No activity yet.</p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-lg px-2 py-2.5"
            >
              <Avatar size="sm">
                {entry.actorImage && (
                  <AvatarImage src={entry.actorImage} alt={entry.actorName} />
                )}
                <AvatarFallback>
                  {getInitials(entry.actorName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{entry.actorName}</span>{" "}
                  <span className="text-muted-foreground">
                    {formatAction(entry.action, entry.metadata)}
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">
                  {timeAgo(entry.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchEntries(entries.length)}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading..." : "Load more"}
        </Button>
      )}
    </div>
  );
}
