import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { authClient, useSession } from "~/lib/auth-client";
import { getInitials } from "~/lib/utils";
import { Heading } from "~/components/heading";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemMedia } from "~/components/ui/item";
import { ConfirmAction } from "~/components/confirm-action";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "~/components/ui/accordion";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { ROLES, canDo } from "~/components/workspace-settings-dialog/utils";

interface InviteLinkItem {
  id: string;
  token: string;
  role: string;
  name: string | null;
  expiresAt: string;
  usedCount: number;
}

interface MemberItem {
  id: string;
  userId: string;
  role: string;
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
}

interface InvitationItem {
  id: string;
  email: string;
  role: string | null;
  status?: string;
}

export function MembersTab() {
  const { data: session } = useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [inviteLinks, setInviteLinks] = useState<InviteLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [linkRole, setLinkRole] = useState<string>("member");
  const [linkName, setLinkName] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const fetcher = useFetcher<{ error?: string; toast?: string; left?: boolean }>();

  const fetchInviteLinks = async (orgId: string) => {
    try {
      const { data } = await (authClient as any).inviteLink.listInviteLinks({
        query: { organizationId: orgId },
      });
      setInviteLinks(data || []);
    } catch {
      // silent
    }
  };

  const handleCreateLink = async () => {
    if (!activeOrg?.id) return;
    setCreatingLink(true);
    try {
      const { data, error } = await (authClient as any).inviteLink.createInviteLink({
        organizationId: activeOrg.id,
        role: linkRole,
        ...(linkName.trim() ? { name: linkName.trim() } : {}),
      });
      if (error) {
        toast.error(error.message || "Failed to create invite link");
      } else if (data?.url) {
        await navigator.clipboard.writeText(data.url);
        toast("Invite link copied to clipboard");
        setLinkName("");
        setLinkOpen(false);
        fetchInviteLinks(activeOrg.id);
      }
    } catch {
      toast.error("Failed to create invite link");
    } finally {
      setCreatingLink(false);
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!activeOrg?.id) return;
    try {
      const { error } = await (authClient as any).inviteLink.revokeInviteLink({
        id: linkId,
        organizationId: activeOrg.id,
      });
      if (error) {
        toast.error(error.message || "Failed to revoke link");
      } else {
        toast("Invite link revoked");
        fetchInviteLinks(activeOrg.id);
      }
    } catch {
      toast.error("Failed to revoke link");
    }
  };

  const fetchData = async (orgId: string) => {
    const [membersRes, invitationsRes] = await Promise.all([
      authClient.organization.listMembers({
        query: { organizationId: orgId },
      }),
      authClient.organization.listInvitations({
        query: { organizationId: orgId },
      }),
    ]);

    if (membersRes.data) {
      const raw = membersRes.data as unknown;
      const membersList = Array.isArray(raw)
        ? raw
        : typeof raw === "object" && raw !== null && "data" in raw
          ? (raw as { data: unknown[] }).data
          : typeof raw === "object" && raw !== null && "members" in raw
            ? (raw as { members: unknown[] }).members
            : [];
      setMembers((Array.isArray(membersList) ? membersList : []) as MemberItem[]);
    }
    if (invitationsRes.data) {
      const raw = invitationsRes.data as unknown;
      const invitationsList = Array.isArray(raw)
        ? raw
        : typeof raw === "object" && raw !== null && "data" in raw
          ? (raw as { data: unknown[] }).data
          : [];
      setInvitations(
        ((Array.isArray(invitationsList) ? invitationsList : []) as InvitationItem[]).filter(
          (inv) => !inv.status || inv.status === "pending",
        ),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeOrg?.id) {
      fetchData(activeOrg.id);
      fetchInviteLinks(activeOrg.id);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.error) {
        toast.error(fetcher.data.error);
      } else if (fetcher.data.toast) {
        toast(fetcher.data.toast);
        if (activeOrg?.id) fetchData(activeOrg.id);
      }
      if (fetcher.data.left) {
        window.location.href = "/";
      }
    }
  }, [fetcher.state, fetcher.data]);

  const inviting = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "invite-member";

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  const myMember = members.find((m) => m.userId === session?.user.id);
  const myRole = myMember?.role;
  const canManage = canDo(myRole, { organization: ["update"] });

  return (
    <div className="space-y-6">
      <Heading
        title="Members"
        description={
          canManage
            ? "Manage who has access to this workspace."
            : "People who have access to this workspace."
        }
      />

      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!inviteEmail.trim()) return;
            fetcher.submit(
              { intent: "invite-member", email: inviteEmail, role: inviteRole, orgName: activeOrg?.name || "", orgSlug: (activeOrg as any)?.slug || "" },
              { method: "post" },
            );
            setInviteEmail("");
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1">
            <Input
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <Select value={inviteRole} onValueChange={(v) => v && setInviteRole(v)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.filter((r) => r !== "owner").map((role) => (
                <SelectItem key={role} value={role}>
                  <span className="capitalize">{role}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={inviting || !inviteEmail.trim()}>
            {inviting ? "Sending..." : "Invite"}
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {members.map((m) => {
          const isCurrentUser = m.userId === session?.user.id;
          return (
            <Item key={m.id} variant="outline" size="sm">
              <ItemMedia>
                <Avatar size="sm">
                  {m.user.image && (
                    <AvatarImage src={m.user.image} alt={m.user.name} />
                  )}
                  <AvatarFallback>{getInitials(m.user.name)}</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  {m.user.name}
                  {isCurrentUser && (
                    <span className="text-muted-foreground text-xs font-normal">
                      (you)
                    </span>
                  )}
                </ItemTitle>
                <ItemDescription>{m.user.email}</ItemDescription>
              </ItemContent>
              <ItemActions>
                {isCurrentUser ? (
                  <>
                    <span className="text-muted-foreground text-xs capitalize">
                      {m.role}
                    </span>
                    {m.role !== "owner" && (
                      <ConfirmAction
                        trigger="Leave"
                        confirmText="Leave"
                        variant="ghost"
                        size="sm"
                        onConfirm={() =>
                          fetcher.submit(
                            { intent: "leave-workspace", orgId: activeOrg?.id || "" },
                            { method: "post" },
                          )
                        }
                      />
                    )}
                  </>
                ) : canManage ? (
                  <>
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        v && fetcher.submit(
                          { intent: "update-member-role", memberId: m.id, role: v },
                          { method: "post" },
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            <span className="capitalize">{role}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ConfirmAction
                      trigger={<HugeiconsIcon icon={Cancel01Icon} className="size-4" />}
                      variant="ghost"
                      size="icon-sm"
                      confirmText="Remove"
                      onConfirm={() =>
                        fetcher.submit(
                          { intent: "remove-member", memberId: m.id, userId: m.userId, orgName: activeOrg?.name || "" },
                          { method: "post" },
                        )
                      }
                    />
                  </>
                ) : (
                  <span className="text-muted-foreground text-xs capitalize">
                    {m.role}
                  </span>
                )}
              </ItemActions>
            </Item>
          );
        })}
      </div>

      {canManage && invitations.length > 0 && (
        <>
          <Separator />
          <div>
            <Heading as="h4" title="Pending invitations" />
            <div className="mt-2 space-y-2">
              {invitations.map((inv) => (
                <Item key={inv.id} variant="outline" size="sm" className="border-dashed">
                  <ItemContent>
                    <ItemTitle>{inv.email}</ItemTitle>
                    <ItemDescription className="capitalize">{inv.role || "member"}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <ConfirmAction
                      trigger={<HugeiconsIcon icon={Cancel01Icon} className="size-4" />}
                      variant="ghost"
                      size="icon-sm"
                      confirmText="Revoke"
                      onConfirm={() =>
                        fetcher.submit(
                          { intent: "cancel-invitation", invitationId: inv.id },
                          { method: "post" },
                        )
                      }
                    />
                  </ItemActions>
                </Item>
              ))}
            </div>
          </div>
        </>
      )}

      {canManage && (
        <>
          <Separator />
          <div>
            <div className="flex items-center justify-between">
              <Heading as="h4" title="Invite link" description="Share a link for anyone to join." />
              <Popover
                open={linkOpen}
                onOpenChange={(v) => {
                  setLinkOpen(v);
                  if (!v) {
                    setLinkName("");
                    setLinkRole("member");
                  }
                }}
              >
                <PopoverTrigger render={<Button variant="outline" size="sm" />}>
                  Create link
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-medium">New invite link</p>
                    <Input
                      placeholder="Name or description (optional)"
                      value={linkName}
                      onChange={(e) => setLinkName(e.target.value)}
                      autoFocus
                    />
                    <Select value={linkRole} onValueChange={(v) => v && setLinkRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.filter((r) => r !== "owner").map((role) => (
                          <SelectItem key={role} value={role}>
                            <span className="capitalize">{role}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs">
                      Link expires after 36 hours.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleCreateLink}
                      disabled={creatingLink}
                    >
                      {creatingLink ? "Creating..." : "Create & copy link"}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {inviteLinks.length > 0 && (
              <Accordion className="mt-3 rounded-lg">
                <AccordionItem>
                  <AccordionTrigger className="px-3 py-2.5 text-xs">
                    Active links ({inviteLinks.length})
                  </AccordionTrigger>
                  <AccordionContent className="px-0">
                    <div className="space-y-2">
                      {inviteLinks.map((link) => {
                        const expiresIn = Math.max(
                          0,
                          Math.round(
                            (new Date(link.expiresAt).getTime() - Date.now()) /
                              (1000 * 60 * 60),
                          ),
                        );
                        return (
                          <Item key={link.id} variant="outline" size="sm" className="border-dashed">
                            <ItemContent>
                              <ItemTitle>
                                {link.name || <span className="capitalize">{link.role} link</span>}
                                {link.usedCount > 0 && (
                                  <span className="text-muted-foreground text-xs font-normal">
                                    ({link.usedCount} used)
                                  </span>
                                )}
                              </ItemTitle>
                              <ItemDescription>
                                <span className="capitalize">{link.role}</span>
                                {" · "}
                                Expires in {expiresIn}h
                              </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                              <ConfirmAction
                                trigger={<HugeiconsIcon icon={Cancel01Icon} className="size-4" />}
                                variant="ghost"
                                size="icon-sm"
                                confirmText="Revoke"
                                onConfirm={() => handleRevokeLink(link.id)}
                              />
                            </ItemActions>
                          </Item>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </>
      )}
    </div>
  );
}
