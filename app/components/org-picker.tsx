import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { authClient, useSession } from "~/lib/auth-client";
import { useSubscription } from "~/lib/use-subscription";
import { getInitials } from "~/lib/utils";
import { StatusBadge } from "~/components/status-badge";
import { Button } from "~/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
} from "~/components/ui/avatar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import { CreateWorkspaceDialog } from "~/components/create-workspace-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  Settings01Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons";

interface PendingInvitation {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationLogo?: string | null;
  role: string | null;
}

export function OrgPicker({ stripeEnabled }: { stripeEnabled: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const { data: sessionOrg, isPending: orgPending } =
    authClient.useActiveOrganization();
  const { data: orgs, isPending: orgsPending } =
    authClient.useListOrganizations();
  const { slug } = useParams();

  // Derive active org from URL slug (immediate) rather than session cache (delayed)
  const activeOrg =
    (slug && orgs?.find((o) => o.slug === slug)) || sessionOrg;
  const { subscription } = useSubscription(activeOrg?.id);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchInvitations = () => {
    authClient.organization.listUserInvitations().then(({ data }) => {
      if (data && Array.isArray(data)) {
        setInvitations(
          data
            .filter(
              (inv: Record<string, unknown>) => inv.status === "pending",
            )
            .map((inv: Record<string, unknown>) => ({
              id: inv.id as string,
              organizationId: inv.organizationId as string,
              organizationName: inv.organizationName as string,
              organizationSlug: inv.organizationSlug as string,
              organizationLogo:
                (inv.organizationLogo as string | null) || null,
              role: inv.role as string | null,
            })),
        );
      }
    });
  };

  // Fetch on mount so badge shows immediately
  useEffect(() => {
    if (session) fetchInvitations();
  }, [session]);

  // Refresh when popover opens
  useEffect(() => {
    if (open && session) fetchInvitations();
  }, [open]);

  const handleAccept = async (invitationId: string) => {
    setAccepting(invitationId);
    const { error } = await authClient.organization.acceptInvitation({
      invitationId,
    });
    if (error) {
      toast.error(String(error.message || "Failed to accept invitation"));
    } else {
      toast("Invitation accepted");
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    }
    setAccepting(null);
  };

  const hasInvitations = invitations.length > 0;

  if (orgPending || orgsPending) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1">
        <div className="bg-muted size-6 animate-pulse rounded-full" />
        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      </div>
    );
  }

  if (!orgs || orgs.length === 0) {
    if (!hasInvitations) return null;
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="relative flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium transition-colors hover:bg-accent"
            />
          }
        >
          {activeOrg ? (
            <>
              <Avatar size="sm">
                {activeOrg.logo && (
                  <AvatarImage src={activeOrg.logo} alt={activeOrg.name} />
                )}
                <AvatarFallback>{getInitials(activeOrg.name)}</AvatarFallback>
                {hasInvitations && <AvatarBadge />}
              </Avatar>
              {activeOrg.name}
              {subscription?.plan === "pro" && (
                <StatusBadge variant="primary">Pro</StatusBadge>
              )}
            </>
          ) : (
            "Select workspace"
          )}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="size-3.5 opacity-50"
          />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 gap-0 p-0">
          {/* Workspace list */}
          {orgs && orgs.length > 0 && (
            <div className="p-2">
              <p className="text-muted-foreground px-2 py-1 text-xs font-medium">
                Workspaces
              </p>
              {orgs.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    window.location.href = `/${org.slug}`;
                  }}
                  className="hover:bg-accent flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors"
                >
                  <Avatar size="sm">
                    {org.logo && (
                      <AvatarImage src={org.logo} alt={org.name} />
                    )}
                    <AvatarFallback>{getInitials(org.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {org.name}
                  </span>
                  {activeOrg?.id === org.id && (
                    <span className="bg-primary/10 text-primary shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Pending invitations */}
          {hasInvitations && (
            <>
              <Separator />
              <div className="p-2">
                <p className="text-muted-foreground px-2 py-1 text-xs font-medium">
                  Invitations
                </p>
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2.5 rounded-xl px-2 py-1.5"
                  >
                    <Avatar size="sm">
                      {inv.organizationLogo && (
                        <AvatarImage
                          src={inv.organizationLogo}
                          alt={inv.organizationName}
                        />
                      )}
                      <AvatarFallback>
                        {getInitials(inv.organizationName)}
                      </AvatarFallback>
                      <AvatarBadge />
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {inv.organizationName}
                      </p>
                      <p className="text-muted-foreground text-xs capitalize">
                        {inv.role || "member"}
                      </p>
                    </div>
                    <Button
                      size="xs"
                      onClick={() => handleAccept(inv.id)}
                      disabled={accepting === inv.id}
                    >
                      {accepting === inv.id ? "..." : "Accept"}
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCreateOpen(true);
              }}
              className="hover:bg-accent flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors"
            >
              <HugeiconsIcon icon={Add01Icon} className="size-4 opacity-60" />
              Create workspace
            </button>
            {activeOrg && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  window.location.href = `/${activeOrg.slug}/settings`;
                }}
                className="hover:bg-accent flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors"
              >
                <HugeiconsIcon
                  icon={Settings01Icon}
                  className="size-4 opacity-60"
                />
                Workspace settings
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(slug) => {
          window.location.href = `/${slug}`;
        }}
        stripeEnabled={stripeEnabled}
      />
    </>
  );
}
