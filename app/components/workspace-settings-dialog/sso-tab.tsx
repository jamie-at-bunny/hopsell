import { useState, useEffect } from "react";
import { toast } from "sonner";
import { authClient, useSession } from "~/lib/auth-client";
import { Heading } from "~/components/heading";
import { FormField } from "~/components/form-field";
import { ConfirmAction } from "~/components/confirm-action";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "~/components/ui/item";
import { StatusBadge } from "~/components/status-badge";
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
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { canDo } from "~/components/workspace-settings-dialog/utils";

interface SsoProvider {
  id: string;
  issuer: string;
  domain: string;
  providerId: string;
  domainVerified?: boolean;
  organizationId?: string;
}

export function SsoTab() {
  const { data: session } = useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const myRole = (activeOrg as { members?: { userId: string; role: string }[] })
    ?.members?.find((m) => m.userId === session?.user.id)?.role;
  const canManage = canDo(myRole, { organization: ["update"] });

  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadProviders = async () => {
    if (!activeOrg?.id) return;
    try {
      const result = await (authClient as any).sso.listProviders({
        organizationId: activeOrg.id,
      });
      setProviders(result.data || []);
    } catch {
      // No providers configured yet
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, [activeOrg?.id]);

  const handleDelete = async (providerId: string) => {
    try {
      await (authClient as any).sso.deleteProvider({ id: providerId });
      toast("SSO provider removed");
      loadProviders();
    } catch {
      toast.error("Failed to remove provider");
    }
  };

  const handleVerifyDomain = async (providerId: string) => {
    try {
      await (authClient as any).sso.verifyDomain({ id: providerId });
      toast("Domain verified");
      loadProviders();
    } catch {
      toast.error("Domain verification failed. Check your DNS TXT record.");
    }
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <Heading
        title="Single Sign-On"
        description={
          canManage
            ? "Configure SSO to let team members sign in through your identity provider."
            : "SSO configuration for this workspace."
        }
      />

      {providers.length > 0 && (
        <div className="space-y-2">
          {providers.map((provider) => (
            <Item key={provider.id} variant="outline" size="sm">
              <ItemContent>
                <ItemTitle>{provider.domain}</ItemTitle>
                <ItemDescription>{provider.issuer}</ItemDescription>
              </ItemContent>
              <ItemActions>
                {provider.domainVerified ? (
                  <StatusBadge variant="success">Verified</StatusBadge>
                ) : canManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVerifyDomain(provider.id)}
                  >
                    Verify domain
                  </Button>
                ) : (
                  <StatusBadge>Unverified</StatusBadge>
                )}
                {canManage && (
                  <ConfirmAction
                    trigger={<HugeiconsIcon icon={Cancel01Icon} className="size-4" />}
                    variant="ghost"
                    size="icon-sm"
                    confirmText="Remove"
                    onConfirm={() => handleDelete(provider.id)}
                  />
                )}
              </ItemActions>
            </Item>
          ))}
        </div>
      )}

      {providers.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            No SSO providers configured.
          </p>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowForm(true)}
            >
              Add SSO provider
            </Button>
          )}
        </div>
      )}

      {providers.length > 0 && canManage && !showForm && (
        <>
          <Separator />
          <Button variant="outline" onClick={() => setShowForm(true)}>
            Add another provider
          </Button>
        </>
      )}

      {showForm && canManage && (
        <>
          <Separator />
          <AddProviderForm
            organizationId={activeOrg?.id || ""}
            onSuccess={() => {
              setShowForm(false);
              loadProviders();
            }}
            onCancel={() => setShowForm(false)}
          />
        </>
      )}
    </div>
  );
}

function AddProviderForm({
  organizationId,
  onSuccess,
  onCancel,
}: {
  organizationId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [providerType, setProviderType] = useState<"oidc" | "saml">("oidc");
  const [domain, setDomain] = useState("");
  const [issuer, setIssuer] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [entryPoint, setEntryPoint] = useState("");
  const [cert, setCert] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const providerId = domain.replace(/\./g, "-");
      const config: Record<string, unknown> = {
        providerId,
        domain,
        issuer,
        organizationId,
      };

      if (providerType === "oidc") {
        config.oidcConfig = {
          clientId,
          clientSecret,
        };
      } else {
        config.samlConfig = {
          entryPoint,
          cert,
          callbackUrl: `${window.location.origin}/api/auth/sso/callback/${providerId}`,
        };
      }

      await (authClient as any).sso.register(config);
      toast("SSO provider added");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add SSO provider");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Heading title="Add SSO provider" />

      <FormField label="Type" htmlFor="sso-type">
        <Select
          value={providerType}
          onValueChange={(v) => setProviderType(v as "oidc" | "saml")}
        >
          <SelectTrigger id="sso-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="oidc">OIDC (OpenID Connect)</SelectItem>
            <SelectItem value="saml">SAML</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Domain" htmlFor="sso-domain">
        <Input
          id="sso-domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="acme.com"
          required
        />
      </FormField>

      <FormField label="Issuer URL" htmlFor="sso-issuer">
        <Input
          id="sso-issuer"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          placeholder={
            providerType === "oidc"
              ? "https://accounts.google.com"
              : "https://idp.example.com"
          }
          required
        />
        {providerType === "oidc" && (
          <p className="text-muted-foreground text-xs">
            Most settings are auto-discovered from the issuer URL.
          </p>
        )}
      </FormField>

      {providerType === "oidc" ? (
        <>
          <FormField label="Client ID" htmlFor="sso-client-id">
            <Input
              id="sso-client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Client Secret" htmlFor="sso-client-secret">
            <Input
              id="sso-client-secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              type="password"
              required
            />
          </FormField>
        </>
      ) : (
        <>
          <FormField label="SSO URL (Entry Point)" htmlFor="sso-entry-point">
            <Input
              id="sso-entry-point"
              value={entryPoint}
              onChange={(e) => setEntryPoint(e.target.value)}
              placeholder="https://idp.example.com/sso/saml"
              required
            />
          </FormField>

          <FormField label="Certificate" htmlFor="sso-cert">
            <textarea
              id="sso-cert"
              value={cert}
              onChange={(e) => setCert(e.target.value)}
              placeholder="Paste IdP certificate (PEM format)"
              className="border-input bg-background placeholder:text-muted-foreground min-h-24 w-full rounded-md border px-3 py-2 font-mono text-xs"
              required
            />
          </FormField>
        </>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Add provider"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
