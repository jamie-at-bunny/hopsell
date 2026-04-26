import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { OTPVerify } from "~/components/otp-verify";
import { StatusBadge } from "~/components/status-badge";
import { Item, ItemContent, ItemTitle, ItemActions } from "~/components/ui/item";
import { ConfirmAction } from "~/components/confirm-action";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";

interface UserEmailRow {
  id: string;
  email: string;
  verified: boolean;
  primary: boolean;
}

export function EmailsSection() {
  const emailsFetcher = useFetcher<{ emails?: UserEmailRow[] }>();
  const mutationFetcher = useFetcher<{ id?: string; email?: string; error?: string; success?: boolean }>();
  const verifyFetcher = useFetcher<{ error?: string; success?: boolean }>();
  const [newEmail, setNewEmail] = useState("");
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  // Load emails on mount
  useEffect(() => {
    emailsFetcher.load("/api/emails");
  }, []);

  const emails = emailsFetcher.data?.emails ?? [];
  const loading = emailsFetcher.state === "loading" && !emailsFetcher.data;
  const adding = mutationFetcher.state !== "idle" && lastIntent === "add";

  // Handle mutation response
  useEffect(() => {
    if (mutationFetcher.state === "idle" && mutationFetcher.data) {
      const data = mutationFetcher.data;

      if (lastIntent === "add") {
        if (data.error) {
          toast.error(data.error);
        } else if (data.id) {
          setVerifyingId(data.id);
          setVerifyingEmail(newEmail);
          setNewEmail("");
          setAddOpen(false);
          emailsFetcher.load("/api/emails");
        }
      } else if (lastIntent === "set-primary") {
        if (data.error) {
          toast.error(data.error);
        } else {
          toast("Primary email updated");
          emailsFetcher.load("/api/emails");
        }
      } else if (lastIntent === "remove") {
        if (data.error) {
          toast.error(data.error);
        } else {
          toast("Email removed");
          emailsFetcher.load("/api/emails");
        }
      }
    }
  }, [mutationFetcher.state, mutationFetcher.data]);

  // Handle verify OTP response
  useEffect(() => {
    if (verifyFetcher.state === "idle" && verifyFetcher.data) {
      if (verifyFetcher.data.error) {
        // error shown inline via verifyFetcher.data.error
      } else if (verifyFetcher.data.success) {
        toast("Email verified");
        setVerifyingId(null);
        setVerifyingEmail("");
        emailsFetcher.load("/api/emails");
      }
    }
  }, [verifyFetcher.state, verifyFetcher.data]);

  const verifyError = verifyFetcher.data?.error ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label>Email addresses</Label>
        <Popover
          open={addOpen}
          onOpenChange={(v) => {
            setAddOpen(v);
            if (!v) setNewEmail("");
          }}
        >
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            Add
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newEmail) return;
                setLastIntent("add");
                mutationFetcher.submit(
                  { intent: "add", email: newEmail },
                  { action: "/api/emails", method: "post" },
                );
              }}
              className="flex flex-col gap-3"
            >
              <p className="text-xs font-medium">Add email address</p>
              <Input
                type="email"
                placeholder="you@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoFocus
              />
              <Button type="submit" size="sm" disabled={adding || !newEmail}>
                {adding ? "Adding..." : "Add email"}
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      </div>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : emails.length > 0 ? (
        <div className="space-y-2">
          {emails.map((em) => (
            <Item key={em.id} variant="outline" size="sm">
              <ItemContent>
                <ItemTitle>
                  {em.email}
                  {em.primary && (
                    <StatusBadge variant="primary">Primary</StatusBadge>
                  )}
                  {!em.verified && (
                    <StatusBadge>Unverified</StatusBadge>
                  )}
                </ItemTitle>
              </ItemContent>
              <ItemActions>
                {!em.verified && (
                  <Popover
                    open={verifyingId === em.id}
                    onOpenChange={(v) => {
                      if (v) {
                        setLastIntent("resend-otp");
                        mutationFetcher.submit(
                          { intent: "add", email: em.email },
                          { action: "/api/emails", method: "post" },
                        );
                        setVerifyingId(em.id);
                        setVerifyingEmail(em.email);
                      } else {
                        setVerifyingId(null);
                        setVerifyingEmail("");
                      }
                    }}
                  >
                    <PopoverTrigger
                      render={<Button variant="ghost" size="sm" />}
                    >
                      Verify
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72">
                      <OTPVerify
                        email={em.email}
                        error={verifyError}
                        onVerify={async (otp) => {
                          verifyFetcher.submit(
                            { intent: "verify", emailId: verifyingId || em.id, otp },
                            { action: "/api/emails", method: "post" },
                          );
                        }}
                        onBack={() => {
                          setVerifyingId(null);
                          setVerifyingEmail("");
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
                {em.verified && !em.primary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLastIntent("set-primary");
                      mutationFetcher.submit(
                        { intent: "set-primary", emailId: em.id },
                        { action: "/api/emails", method: "post" },
                      );
                    }}
                  >
                    Make primary
                  </Button>
                )}
                {!em.primary && (
                  <ConfirmAction
                    trigger={<HugeiconsIcon icon={Cancel01Icon} className="size-4" />}
                    variant="ghost"
                    size="icon-sm"
                    confirmText="Remove"
                    onConfirm={() => {
                      setLastIntent("remove");
                      mutationFetcher.submit(
                        { intent: "remove", emailId: em.id },
                        { action: "/api/emails", method: "post" },
                      );
                    }}
                  />
                )}
              </ItemActions>
            </Item>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No email addresses.</p>
      )}
    </div>
  );
}
