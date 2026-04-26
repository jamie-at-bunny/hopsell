import { useState, useEffect } from "react";
import { useNavigate, useFetcher } from "react-router";
import { toast } from "sonner";
import { authClient, useSession } from "~/lib/auth-client";
import { AvatarUpload } from "~/components/avatar-upload";
import { Heading } from "~/components/heading";
import { FormField } from "~/components/form-field";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";
import { canDo } from "~/components/workspace-settings-dialog/utils";

export function GeneralTab() {
  const { data: session } = useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const navigate = useNavigate();
  const myRole = (activeOrg as { members?: { userId: string; role: string }[] })
    ?.members?.find((m) => m.userId === session?.user.id)?.role;
  const canManage = canDo(myRole, { organization: ["update"] });
  const [name, setName] = useState(activeOrg?.name || "");
  const fetcher = useFetcher<{ error?: string; toast?: string; deleted?: boolean }>();

  useEffect(() => {
    if (activeOrg) setName(activeOrg.name);
  }, [activeOrg]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.error) {
        toast.error(fetcher.data.error);
      } else if (fetcher.data.toast) {
        toast(fetcher.data.toast);
      }
      if (fetcher.data.deleted) {
        navigate("/");
      }
    }
  }, [fetcher.state, fetcher.data]);

  const saving = fetcher.state !== "idle";

  return (
    <div className="space-y-6">
      <Heading title="General" description="Manage your workspace settings." />

      <AvatarUpload
        src={activeOrg?.logo}
        name={activeOrg?.name || "W"}
        buttonLabel="Change logo"
        disabled={!canManage}
        onUpload={async (url) => {
          if (!activeOrg) return;
          await authClient.organization.update({
            data: { logo: url },
            organizationId: activeOrg.id,
          });
          toast("Logo updated");
        }}
      />

      <FormField label="Workspace name" htmlFor="ws-name">
        {canManage ? (
          <div className="flex gap-2">
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              onClick={() =>
                fetcher.submit(
                  { intent: "update-name", orgId: activeOrg?.id || "", name },
                  { method: "post" },
                )
              }
              disabled={saving || !name.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        ) : (
          <p className="text-sm">{activeOrg?.name}</p>
        )}
      </FormField>

      <FormField label="Workspace URL">
        <Input value={activeOrg?.slug || ""} readOnly className="bg-muted" />
      </FormField>

      {canDo(myRole, { organization: ["delete"] }) && (
        <DeleteWorkspaceSection
          orgName={activeOrg?.name || ""}
          onConfirm={() =>
            fetcher.submit(
              { intent: "delete-workspace", orgId: activeOrg?.id || "" },
              { method: "post" },
            )
          }
          loading={saving}
        />
      )}
    </div>
  );
}

function DeleteWorkspaceSection({
  orgName,
  onConfirm,
  loading,
}: {
  orgName: string;
  onConfirm: () => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Heading
            as="h4"
            title="Delete workspace"
            description="Permanently delete this workspace and all its data."
          />
          <Popover
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setInputValue("");
            }}
          >
            <PopoverTrigger render={<Button variant="destructive" size="sm" />}>
              Delete workspace
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">
                    This action cannot be undone.
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    This will permanently delete{" "}
                    <strong>{orgName}</strong>, including all members,
                    settings, and associated data.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="delete-ws-confirm" className="text-xs">
                    Type <strong>delete my workspace</strong> to confirm
                  </Label>
                  <Input
                    id="delete-ws-confirm"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="delete my workspace"
                    autoComplete="off"
                  />
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  disabled={loading || inputValue !== "delete my workspace"}
                  onClick={() => {
                    onConfirm();
                    setOpen(false);
                    setInputValue("");
                  }}
                >
                  {loading ? "Deleting..." : "Delete workspace"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  );
}
