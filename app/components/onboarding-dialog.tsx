import { useState, useEffect } from "react";
import { useNavigate, useFetcher } from "react-router";
import { toast } from "sonner";
import { authClient, useSession } from "~/lib/auth-client";
import { useSubscription } from "~/lib/use-subscription";
import { useFetcherToast } from "~/lib/use-fetcher-toast";
import { getGravatarUrl } from "~/lib/avatars";
import { AvatarUpload } from "~/components/avatar-upload";
import { FormField } from "~/components/form-field";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "~/components/ui/item";
import { StatusBadge } from "~/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";

type WorkspaceType = "personal" | "team";

interface OnboardingDialogProps {
  existingOrg: { slug: string } | null;
  stripeEnabled: boolean;
  returnedPlan: string | null;
}

export function OnboardingDialog({
  existingOrg,
  stripeEnabled,
  returnedPlan,
}: OnboardingDialogProps) {
  const navigate = useNavigate();
  const { data: session } = useSession();

  // If user already has an org and isn't mid-onboarding, redirect
  const [redirected] = useState(() => {
    if (existingOrg && !returnedPlan) return true;
    return false;
  });

  useEffect(() => {
    if (redirected && existingOrg) {
      navigate(`/${existingOrg.slug}`, { replace: true });
    }
  }, [redirected]);

  const [step, setStep] = useState(() => {
    if (returnedPlan) return "plan-confirm";
    return "type";
  });
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("personal");
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (returnedPlan) {
      setCreatedSlug(sessionStorage.getItem("onboarding_slug"));
      setCreatedOrgId(sessionStorage.getItem("onboarding_orgId"));
      sessionStorage.removeItem("onboarding_slug");
      sessionStorage.removeItem("onboarding_orgId");
    }
  }, []);

  const finish = (slug?: string) => {
    const target = slug || createdSlug;
    navigate(target ? `/${target}` : "/");
  };

  const handleWorkspaceCreated = (slug: string, orgId: string) => {
    setCreatedSlug(slug);
    setCreatedOrgId(orgId);
    setStep(stripeEnabled ? "plan" : "secure");
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">Get Started</DialogTitle>
        <DialogDescription className="sr-only">
          Set up your workspace
        </DialogDescription>

        {step === "type" && (
          <WorkspaceTypeStep
            onSelect={(type) => {
              setWorkspaceType(type);
              setStep(type === "personal" ? "personal" : "team");
            }}
          />
        )}

        {step === "personal" && (
          <PersonalSetupStep onNext={handleWorkspaceCreated} />
        )}

        {step === "team" && <TeamSetupStep onNext={handleWorkspaceCreated} />}

        {step === "plan" && createdOrgId && createdSlug && (
          <PlanSelectionStep
            orgId={createdOrgId}
            slug={createdSlug}
            onSelectFree={() => setStep("secure")}
          />
        )}

        {step === "plan-confirm" && (
          <PlanConfirmStep
            plan={returnedPlan || "cancelled"}
            onContinue={() => setStep("secure")}
          />
        )}

        {step === "secure" && <SecureStep onFinish={() => finish()} />}
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceTypeStep({
  onSelect,
}: {
  onSelect: (type: WorkspaceType) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold">How will you use LaunchMade?</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          You can always change this later
        </p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onSelect("personal")}
          className="border-border hover:border-primary hover:bg-accent w-full rounded-lg border p-4 text-left transition-colors"
        >
          <p className="font-medium">Personal</p>
          <p className="text-muted-foreground text-sm">
            A workspace just for you
          </p>
        </button>
        <button
          type="button"
          onClick={() => onSelect("team")}
          className="border-border hover:border-primary hover:bg-accent w-full rounded-lg border p-4 text-left transition-colors"
        >
          <p className="font-medium">Team</p>
          <p className="text-muted-foreground text-sm">
            Collaborate with others
          </p>
        </button>
      </div>
    </div>
  );
}

function PersonalSetupStep({
  onNext,
}: {
  onNext: (slug: string, orgId: string) => void;
}) {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user.name || "");
  const [workspaceName, setWorkspaceName] = useState(session?.user.name || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fetcher = useFetcher<{
    slug?: string;
    orgId?: string;
    error?: string;
  }>();

  const loading = fetcher.state !== "idle";
  const error = fetcher.data?.error ?? null;

  // Fetch Gravatar on mount
  useEffect(() => {
    if (session?.user.email) {
      getGravatarUrl(session.user.email).then(setAvatarUrl);
    }
  }, [session?.user.email]);

  // Navigate on success
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.slug && fetcher.data?.orgId) {
      onNext(fetcher.data.slug, fetcher.data.orgId);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Set up your profile</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Personalize your workspace
        </p>
      </div>

      {/* Avatar */}
      <AvatarUpload
        src={avatarUrl}
        name={name || "U"}
        buttonLabel="Upload photo"
        hint="Or we'll use your Gravatar"
        onUpload={async (url) => {
          setAvatarUrl(url);
          await authClient.updateUser({ image: url });
        }}
      />

      <FormField label="Your name" htmlFor="onboard-name">
        <Input
          id="onboard-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>

      <FormField label="Workspace name" htmlFor="onboard-workspace">
        <Input
          id="onboard-workspace"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="My Workspace"
        />
      </FormField>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button
        onClick={() =>
          fetcher.submit(
            {
              intent: "create-personal-workspace",
              userName: name,
              name: session?.user.name || "",
              workspaceName,
              avatarUrl: avatarUrl || "",
            },
            { method: "post" },
          )
        }
        disabled={loading || !workspaceName.trim()}
      >
        {loading ? "Creating..." : "Continue"}
      </Button>
    </div>
  );
}

function TeamSetupStep({
  onNext,
}: {
  onNext: (slug: string, orgId: string) => void;
}) {
  const [teamName, setTeamName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fetcher = useFetcher<{
    slug?: string;
    orgId?: string;
    error?: string;
  }>();

  const loading = fetcher.state !== "idle";
  const error = fetcher.data?.error ?? null;

  // Navigate on success
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.slug && fetcher.data?.orgId) {
      onNext(fetcher.data.slug, fetcher.data.orgId);
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

      {/* Logo */}
      <AvatarUpload
        src={logoUrl}
        name={teamName || "T"}
        buttonLabel="Upload logo"
        onUpload={(url) => setLogoUrl(url)}
      />

      <FormField label="Team name" htmlFor="onboard-team-name">
        <Input
          id="onboard-team-name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
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
              teamName,
              logoUrl: logoUrl || "",
            },
            { method: "post" },
          )
        }
        disabled={loading || !teamName.trim()}
      >
        {loading ? "Creating..." : "Continue"}
      </Button>
    </div>
  );
}

function PlanSelectionStep({
  orgId,
  slug,
  onSelectFree,
}: {
  orgId: string;
  slug: string;
  onSelectFree: () => void;
}) {
  const { subscription } = useSubscription(orgId);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPro = async () => {
    setLoading("pro");
    sessionStorage.setItem("onboarding_orgId", orgId);
    sessionStorage.setItem("onboarding_slug", slug);

    const upgradeParams: Record<string, unknown> = {
      plan: "pro",
      referenceId: orgId,
      customerType: "organization",
      successUrl: `${window.location.origin}/onboarding?plan=pro`,
      cancelUrl: `${window.location.origin}/onboarding?plan=cancelled`,
    };
    if (subscription?.stripeSubscriptionId) {
      upgradeParams.subscriptionId = subscription.stripeSubscriptionId;
    }
    const { error } = await (authClient as any).subscription.upgrade(
      upgradeParams,
    );

    if (error) {
      toast.error(String(error.message || "Failed to start checkout"));
      setLoading(null);
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
          disabled={!!loading}
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
          disabled={!!loading}
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

function PlanConfirmStep({
  plan,
  onContinue,
}: {
  plan: string;
  onContinue: () => void;
}) {
  const isPro = plan === "pro";
  const isFree = plan === "free";
  const cancelled = !isPro && !isFree;

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold">
          {isPro
            ? "You're on Pro!"
            : isFree
              ? "You're on Free"
              : "Plan selection"}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {isPro
            ? "Your Pro subscription is now active."
            : isFree
              ? "Your Free plan is active. You can upgrade anytime."
              : "You can upgrade to Pro anytime from workspace settings."}
        </p>
      </div>
      <Button onClick={onContinue}>Continue</Button>
    </div>
  );
}

function SecureStep({ onFinish }: { onFinish: () => void }) {
  const [passkeyAdded, setPasskeyAdded] = useState(false);
  const [totpStep, setTotpStep] = useState<
    "idle" | "password" | "qr" | "verify" | "done"
  >("idle");
  const [code, setCode] = useState("");

  const passkeyFetcher = useFetcher<{ error?: string; toast?: string }>();
  const enableFetcher = useFetcher<{
    error?: string;
    totpURI?: string;
    backupCodes?: string[];
  }>();
  const verifyFetcher = useFetcher<{
    error?: string;
    toast?: string;
    totpVerified?: boolean;
  }>();

  // Handle passkey response
  useEffect(() => {
    if (passkeyFetcher.state === "idle" && passkeyFetcher.data) {
      if (passkeyFetcher.data.error) {
        toast.error(passkeyFetcher.data.error);
      } else if (passkeyFetcher.data.toast) {
        toast(passkeyFetcher.data.toast);
        setPasskeyAdded(true);
      }
    }
  }, [passkeyFetcher.state, passkeyFetcher.data]);

  // Move to QR step when enable succeeds
  useEffect(() => {
    if (enableFetcher.state === "idle" && enableFetcher.data?.totpURI) {
      setTotpStep("qr");
    } else if (enableFetcher.state === "idle" && enableFetcher.data?.error) {
      // stay on password step so user can retry
    }
  }, [enableFetcher.state, enableFetcher.data]);

  // Handle verify response
  useEffect(() => {
    if (verifyFetcher.state === "idle" && verifyFetcher.data) {
      if (verifyFetcher.data.totpVerified) {
        toast(verifyFetcher.data.toast || "Two-factor authentication enabled");
        setTotpStep("done");
        setCode("");
      }
    }
  }, [verifyFetcher.state, verifyFetcher.data]);

  const totpURI = enableFetcher.data?.totpURI ?? null;
  const totpEnabled = totpStep === "done";

  // Show inline 2FA setup flow
  if (totpStep === "password") {
    return (
      <div className="flex flex-col gap-5">
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            Set up two-factor authentication
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter your password to get started
          </p>
        </div>

        <enableFetcher.Form method="post" className="flex flex-col gap-4">
          <input type="hidden" name="intent" value="enable-2fa" />
          <Input
            name="password"
            type="password"
            placeholder="Your password"
            autoFocus
          />
          {enableFetcher.data?.error && (
            <p className="text-destructive text-sm">
              {enableFetcher.data.error}
            </p>
          )}
          <Button type="submit" disabled={enableFetcher.state !== "idle"}>
            {enableFetcher.state !== "idle" ? "Setting up..." : "Continue"}
          </Button>
          <button
            type="button"
            onClick={() => setTotpStep("idle")}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            Back
          </button>
        </enableFetcher.Form>
      </div>
    );
  }

  if (totpStep === "qr" && totpURI) {
    return (
      <div className="flex flex-col gap-5">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Scan QR code</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Scan this with your authenticator app
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 text-center">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpURI)}`}
            alt="TOTP QR Code"
            className="mx-auto"
            width={180}
            height={180}
          />
        </div>

        <Button onClick={() => setTotpStep("verify")}>
          I&apos;ve scanned it
        </Button>
      </div>
    );
  }

  if (totpStep === "verify") {
    return (
      <div className="flex flex-col gap-5">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Verify code</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <verifyFetcher.Form method="post" className="flex flex-col gap-4">
          <input type="hidden" name="intent" value="verify-totp" />
          <Input
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            autoFocus
            maxLength={6}
          />
          {verifyFetcher.data?.error && (
            <p className="text-destructive text-sm">
              {verifyFetcher.data.error}
            </p>
          )}
          <Button
            type="submit"
            disabled={verifyFetcher.state !== "idle" || code.length < 6}
          >
            {verifyFetcher.state !== "idle"
              ? "Verifying..."
              : "Verify & enable"}
          </Button>
          <button
            type="button"
            onClick={() => setTotpStep("qr")}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            Back to QR code
          </button>
        </verifyFetcher.Form>
      </div>
    );
  }

  // Default: show security options list
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Secure your account</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Add extra security to protect your account
        </p>
      </div>

      <div className="space-y-3">
        <Item variant="outline" size="sm">
          <ItemContent>
            <ItemTitle>Passkey</ItemTitle>
            <ItemDescription>Sign in with fingerprint or face</ItemDescription>
          </ItemContent>
          <ItemActions>
            {passkeyAdded ? (
              <StatusBadge variant="success">Added</StatusBadge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  passkeyFetcher.submit(
                    { intent: "add-passkey" },
                    { method: "post" },
                  )
                }
                disabled={passkeyFetcher.state !== "idle"}
              >
                Add
              </Button>
            )}
          </ItemActions>
        </Item>

        <Item variant="outline" size="sm">
          <ItemContent>
            <ItemTitle>Two-factor authentication</ItemTitle>
            <ItemDescription>Use an authenticator app</ItemDescription>
          </ItemContent>
          <ItemActions>
            {totpEnabled ? (
              <StatusBadge variant="success">Enabled</StatusBadge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTotpStep("password")}
              >
                Set up
              </Button>
            )}
          </ItemActions>
        </Item>
      </div>

      <Separator />

      <Button onClick={onFinish}>
        {passkeyAdded || totpEnabled ? "Finish" : "Skip & finish"}
      </Button>
    </div>
  );
}
