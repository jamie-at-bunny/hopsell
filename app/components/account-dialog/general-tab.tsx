import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { authClient, useSession } from "~/lib/auth-client";
import { useFetcherToast } from "~/lib/use-fetcher-toast";
import { cn } from "~/lib/utils";
import { AvatarUpload } from "~/components/avatar-upload";
import { Heading } from "~/components/heading";
import { FormField } from "~/components/form-field";
import { EmailsSection } from "~/components/account-dialog/emails-section";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function GeneralTab() {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user.name || "");
  const [appearance, setAppearance] = useState<string>(
    ((session?.user as Record<string, unknown>)?.appearance as string) ||
      "system",
  );
  const [timezone, setTimezone] = useState<string>(
    ((session?.user as Record<string, unknown>)?.timezone as string) || "UTC",
  );
  const [defaultOrgId, setDefaultOrgId] = useState<string>(
    ((session?.user as Record<string, unknown>)
      ?.defaultOrganizationId as string) || "",
  );
  const { data: orgs } = authClient.useListOrganizations();
  const fetcher = useFetcher<{ error?: string; toast?: string }>();
  useFetcherToast(fetcher);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name);
      const user = session.user as Record<string, unknown>;
      if (user.appearance) setAppearance(user.appearance as string);
      if (user.timezone) setTimezone(user.timezone as string);
      if (user.defaultOrganizationId)
        setDefaultOrgId(user.defaultOrganizationId as string);
    }
  }, [session?.user]);

  const saving = fetcher.state !== "idle";

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];

  return (
    <div className="space-y-6">
      <Heading title="Profile" description="Manage your personal information." />

      {/* Photo */}
      <AvatarUpload
        src={session?.user.image}
        name={session?.user.name || "U"}
        onUpload={async (url) => {
          await authClient.updateUser({ image: url });
          toast("Photo updated");
        }}
      />

      {/* Name */}
      <FormField label="Name" htmlFor="account-name">
        <div className="flex gap-2">
          <Input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            onClick={() =>
              fetcher.submit(
                { intent: "update-name", name },
                { method: "post", action: "/account" },
              )
            }
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </FormField>

      {/* Emails */}
      <EmailsSection />

      <Separator />

      {/* Appearance */}
      <FormField label="Appearance">
        <div className="flex gap-2">
          {["light", "dark", "system"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setAppearance(mode);
                fetcher.submit(
                  { intent: "update-appearance", appearance: mode },
                  { method: "post", action: "/account" },
                );
              }}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm capitalize transition-colors",
                appearance === mode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary",
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </FormField>

      {/* Timezone */}
      <FormField label="Timezone">
        <Select
          value={timezone}
          onValueChange={(v) => {
            if (!v) return;
            setTimezone(v);
            fetcher.submit(
              { intent: "update-timezone", timezone: v },
              { method: "post", action: "/account" },
            );
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {/* Default Workspace — only show if user has multiple */}
      {orgs && orgs.length > 1 && (
        <FormField label="Default workspace">
          <Select
            value={defaultOrgId}
            onValueChange={(v) => {
              if (!v) return;
              setDefaultOrgId(v);
              const orgName = orgs?.find((o) => o.id === v)?.name;
              fetcher.submit(
                { intent: "update-default-org", orgId: v, orgName: orgName || "selected" },
                { method: "post", action: "/account" },
              );
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(() => {
                  const selected = orgs?.find((o) => o.id === defaultOrgId);
                  if (!selected) return "Select a workspace";
                  const isPersonal = selected.name === session?.user.name;
                  return isPersonal ? `${selected.name} (Personal)` : selected.name;
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {orgs.map((org) => {
                const isPersonal = org.name === session?.user.name;
                return (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                    {isPersonal && (
                      <span className="text-muted-foreground ml-1">
                        (Personal)
                      </span>
                    )}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            The workspace you'll be taken to when you log in.
          </p>
        </FormField>
      )}
    </div>
  );
}
