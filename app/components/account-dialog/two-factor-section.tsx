import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { useSession } from "~/lib/auth-client";
import { Heading } from "~/components/heading";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon } from "@hugeicons/core-free-icons";

function BackupCodesDisplay({ codes }: { codes: string[] }) {
  const codesText = codes.join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(codesText);
    toast("Backup codes copied");
  };

  const handleDownload = () => {
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quickburrow-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup codes downloaded");
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium">Backup codes</p>
      <p className="text-muted-foreground text-[11px]">
        Save these somewhere safe. Each can be used once if you lose access to
        your authenticator.
      </p>
      <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-2 font-mono text-[11px]">
        {codes.map((c) => (
          <div key={c}>{c}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <HugeiconsIcon icon={Copy01Icon} className="size-3.5" />
          Copy
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          Download
        </Button>
      </div>
    </div>
  );
}

export function TwoFactorSection() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"password" | "qr" | "verify">("password");
  const [showManualKey, setShowManualKey] = useState(false);
  const [code, setCode] = useState("");
  const [disableOpen, setDisableOpen] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);

  const enableFetcher = useFetcher<{ error?: string; totpURI?: string; backupCodes?: string[] }>();
  const verifyFetcher = useFetcher<{ error?: string; toast?: string; success?: boolean }>();
  const disableFetcher = useFetcher<{ error?: string; toast?: string; success?: boolean }>();
  const codesFetcher = useFetcher<{ error?: string; toast?: string; backupCodes?: string[] }>();

  const isTwoFactorEnabled = (session?.user as Record<string, unknown>)
    ?.twoFactorEnabled as boolean | undefined;

  const totpURI = enableFetcher.data?.totpURI ?? null;
  const backupCodes = enableFetcher.data?.backupCodes ?? [];
  const totpSecret = totpURI
    ? new URLSearchParams(totpURI.split("?")[1] || "").get("secret")
    : null;

  const loading = enableFetcher.state !== "idle" || verifyFetcher.state !== "idle";

  useEffect(() => {
    if (enableFetcher.state === "idle" && enableFetcher.data?.totpURI) {
      setStep("qr");
    }
  }, [enableFetcher.state, enableFetcher.data]);

  useEffect(() => {
    if (verifyFetcher.state === "idle" && verifyFetcher.data?.success) {
      toast(verifyFetcher.data.toast || "Two-step verification enabled");
      setStep("password");
      setShowManualKey(false);
      setCode("");
      setOpen(false);
    }
  }, [verifyFetcher.state, verifyFetcher.data]);

  useEffect(() => {
    if (disableFetcher.state === "idle" && disableFetcher.data) {
      if (disableFetcher.data.error) {
        // error shown inline
      } else if (disableFetcher.data.toast) {
        toast(disableFetcher.data.toast);
        setDisableOpen(false);
      }
    }
  }, [disableFetcher.state, disableFetcher.data]);

  useEffect(() => {
    if (codesFetcher.state === "idle" && codesFetcher.data) {
      if (codesFetcher.data.toast) {
        toast(codesFetcher.data.toast);
      }
    }
  }, [codesFetcher.state, codesFetcher.data]);

  const viewCodes = codesFetcher.data?.backupCodes ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Heading
          as="h4"
          title="Two-Step Verification"
          description={
            isTwoFactorEnabled
              ? "Enabled \u2014 your account is extra secure."
              : "Add an extra layer of security."
          }
        />
        {isTwoFactorEnabled ? (
          <div className="flex gap-2">
            <Popover
              open={codesOpen}
              onOpenChange={(v) => {
                setCodesOpen(v);
              }}
            >
              <PopoverTrigger render={<Button variant="outline" size="sm" />}>
                Backup codes
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                {viewCodes.length > 0 ? (
                  <BackupCodesDisplay codes={viewCodes} />
                ) : (
                  <codesFetcher.Form
                    method="post"
                    action="/account"
                    className="flex flex-col gap-3"
                  >
                    <input type="hidden" name="intent" value="generate-backup-codes" />
                    <p className="text-xs font-medium">
                      Regenerate backup codes
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      This will invalidate your previous backup codes and
                      generate new ones.
                    </p>
                    <Input
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      autoFocus
                    />
                    {codesFetcher.data?.error && (
                      <p className="text-destructive text-xs">{codesFetcher.data.error}</p>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={codesFetcher.state !== "idle"}
                    >
                      {codesFetcher.state !== "idle" ? "Generating..." : "Generate new codes"}
                    </Button>
                  </codesFetcher.Form>
                )}
              </PopoverContent>
            </Popover>
            <Popover open={disableOpen} onOpenChange={setDisableOpen}>
              <PopoverTrigger render={<Button variant="outline" size="sm" />}>
                Disable
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <disableFetcher.Form method="post" action="/account" className="flex flex-col gap-3">
                  <input type="hidden" name="intent" value="disable-2fa" />
                  <p className="text-xs font-medium">
                    Enter your password to disable 2FA
                  </p>
                  <Input
                    name="password"
                    type="password"
                    placeholder="Password"
                  />
                  {disableFetcher.data?.error && (
                    <p className="text-destructive text-xs">{disableFetcher.data.error}</p>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    variant="destructive"
                    disabled={disableFetcher.state !== "idle"}
                  >
                    {disableFetcher.state !== "idle" ? "Disabling..." : "Disable 2FA"}
                  </Button>
                </disableFetcher.Form>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <Popover
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setStep("password");
                setShowManualKey(false);
                setCode("");
              }
            }}
          >
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              Enable
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              {step === "password" && (
                <enableFetcher.Form method="post" action="/account" className="flex flex-col gap-3">
                  <input type="hidden" name="intent" value="enable-2fa" />
                  <p className="text-xs font-medium">
                    Enter your password to get started
                  </p>
                  <Input
                    name="password"
                    type="password"
                    placeholder="Password"
                    autoFocus
                  />
                  {enableFetcher.data?.error && (
                    <p className="text-destructive text-xs">{enableFetcher.data.error}</p>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={enableFetcher.state !== "idle"}
                  >
                    {enableFetcher.state !== "idle" ? "Setting up..." : "Continue"}
                  </Button>
                </enableFetcher.Form>
              )}

              {step === "qr" && totpURI && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-medium">
                    Scan this QR code with your authenticator app
                  </p>
                  <div className="rounded-lg border bg-white p-3 text-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpURI)}`}
                      alt="TOTP QR Code"
                      className="mx-auto"
                      width={180}
                      height={180}
                    />
                  </div>

                  {showManualKey && totpSecret ? (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-muted-foreground text-xs">
                        Enter this key manually in your authenticator app:
                      </p>
                      <div className="flex gap-1.5">
                        <Input
                          readOnly
                          value={totpSecret}
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => {
                            navigator.clipboard.writeText(totpSecret);
                            toast("Copied to clipboard");
                          }}
                        >
                          <HugeiconsIcon
                            icon={Copy01Icon}
                            className="size-3.5"
                          />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowManualKey(true)}
                      className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                    >
                      Can&apos;t scan? Enter key manually
                    </button>
                  )}

                  <Button size="sm" onClick={() => setStep("verify")}>
                    I&apos;ve scanned it
                  </Button>
                </div>
              )}

              {step === "verify" && (
                <verifyFetcher.Form method="post" action="/account" className="flex flex-col gap-3">
                  <input type="hidden" name="intent" value="verify-totp" />
                  <p className="text-xs font-medium">
                    Enter the 6-digit code from your authenticator app
                  </p>
                  <Input
                    name="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    autoFocus
                    maxLength={6}
                  />
                  {verifyFetcher.data?.error && (
                    <p className="text-destructive text-xs">{verifyFetcher.data.error}</p>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={verifyFetcher.state !== "idle" || code.length < 6}
                  >
                    {verifyFetcher.state !== "idle" ? "Verifying..." : "Verify & enable"}
                  </Button>

                  {backupCodes.length > 0 && (
                    <div className="border-t pt-3">
                      <BackupCodesDisplay codes={backupCodes} />
                    </div>
                  )}
                </verifyFetcher.Form>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
