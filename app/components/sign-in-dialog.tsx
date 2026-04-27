import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth-client";

interface SignInDialogProps {
  trigger: React.ReactElement;
  callbackURL?: string;
}

export function SignInDialog({
  trigger,
  callbackURL = "/dashboard",
}: SignInDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setEmail("");
    setSent(null);
    setError(null);
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Wait for the close animation to finish before wiping fields so the
      // dialog doesn't visibly flash back to the empty state.
      setTimeout(reset, 150);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Email required");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: authError } = await authClient.signIn.magicLink({
      email: trimmed,
      callbackURL,
    });
    setSubmitting(false);
    if (authError) {
      setError(authError.message || "Failed to send sign-in link");
      return;
    }
    setSent(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>Check your email</DialogTitle>
              <DialogDescription>
                We sent a sign-in link to{" "}
                <span className="text-hop-text font-medium">{sent}</span>.
                Click it to finish signing in.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Sign in</DialogTitle>
              <DialogDescription>
                Enter your email and we&apos;ll send you a sign-in link.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-destructive text-[0.8125rem]">{error}</p>
              )}
              <div className="mt-1 flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Sending…" : "Send sign-in link"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
