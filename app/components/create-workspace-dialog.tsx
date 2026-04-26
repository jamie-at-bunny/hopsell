import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { authClient, useSession } from "~/lib/auth-client";
import { useSubscription } from "~/lib/use-subscription";
import { AvatarUpload } from "~/components/avatar-upload";
import { FormField } from "~/components/form-field";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (slug: string) => void;
  stripeEnabled?: boolean;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onCreated,
  stripeEnabled,
}: CreateWorkspaceDialogProps) {
  const [step, setStep] = useState<"setup" | "plan">("setup");
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep("setup");
      setCreatedSlug(null);
      setCreatedOrgId(null);
    }
  }, [open]);

  const handleCreated = (slug: string, orgId: string) => {
    setCreatedSlug(slug);
    setCreatedOrgId(orgId);
    if (stripeEnabled) {
      setStep("plan");
    } else {
      onOpenChange(false);
      onCreated(slug);
    }
  };

  const handlePlanDone = () => {
    if (createdSlug) {
      onOpenChange(false);
      onCreated(createdSlug);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="sr-only">Create Workspace</DialogTitle>
        <DialogDescription className="sr-only">
          Create a new workspace
        </DialogDescription>

        {step === "setup" && (
          <SetupStep onCreated={handleCreated} />
        )}

        {step === "plan" && createdOrgId && createdSlug && (
          <PlanStep
            orgId={createdOrgId}
            slug={createdSlug}
            onSelectFree={handlePlanDone}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SetupStep({
  onCreated,
}: {
  onCreated: (slug: string, orgId: string) => void;
}) {
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fetcher = useFetcher<{ slug?: string; orgId?: string; error?: string }>();

  const loading = fetcher.state !== "idle";
  const error = fetcher.data?.error ?? null;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.slug && fetcher.data?.orgId) {
      toast("Workspace created");
      onCreated(fetcher.data.slug, fetcher.data.orgId);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Set up your team</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Create a workspace for your team
        </p>
      </div>

      <AvatarUpload
        src={logoUrl}
        name={name || "T"}
        buttonLabel="Upload logo"
        onUpload={(url) => setLogoUrl(url)}
      />

      <FormField label="Team name" htmlFor="cw-name">
        <Input
          id="cw-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Inc."
          autoFocus
        />
      </FormField>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button
        onClick={() =>
          fetcher.submit(
            {
              intent: "create-team-workspace",
              teamName: name,
              logoUrl: logoUrl || "",
            },
            { method: "post", action: "/onboarding" },
          )
        }
        disabled={loading || !name.trim()}
        className="w-full"
      >
        {loading ? "Creating..." : "Create workspace"}
      </Button>
    </div>
  );
}

function PlanStep({
  orgId,
  slug,
  onSelectFree,
}: {
  orgId: string;
  slug: string;
  onSelectFree: () => void;
}) {
  const { subscription } = useSubscription(orgId);
  const [loading, setLoading] = useState(false);

  const handleSelectPro = async () => {
    setLoading(true);
    sessionStorage.setItem("onboarding_orgId", orgId);
    sessionStorage.setItem("onboarding_slug", slug);

    const upgradeParams: Record<string, unknown> = {
      plan: "pro",
      referenceId: orgId,
      customerType: "organization",
      successUrl: `${window.location.origin}/${slug}`,
      cancelUrl: `${window.location.origin}/${slug}`,
    };
    if (subscription?.stripeSubscriptionId) {
      upgradeParams.subscriptionId = subscription.stripeSubscriptionId;
    }
    const { error } = await (authClient as any).subscription.upgrade(upgradeParams);

    if (error) {
      toast.error(String(error.message || "Failed to start checkout"));
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Choose your plan</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          You can upgrade or downgrade anytime
        </p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={onSelectFree}
          disabled={loading}
          className="border-border hover:border-primary hover:bg-accent w-full rounded-lg border p-4 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Free</p>
              <p className="text-muted-foreground text-sm">
                Get started with the basics
              </p>
            </div>
            <p className="text-muted-foreground text-sm">$0/mo</p>
          </div>
        </button>
        <button
          type="button"
          onClick={handleSelectPro}
          disabled={loading}
          className="border-border hover:border-primary hover:bg-accent w-full rounded-lg border p-4 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Pro</p>
              <p className="text-muted-foreground text-sm">
                Unlock all features
              </p>
            </div>
            <p className="text-sm font-medium">$20/mo</p>
          </div>
        </button>
      </div>
    </div>
  );
}
