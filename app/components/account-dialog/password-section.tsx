import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { Heading } from "~/components/heading";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";

export function PasswordSection() {
  const [open, setOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [revokeOthers, setRevokeOthers] = useState(false);
  const fetcher = useFetcher<{ error?: string; toast?: string; success?: boolean }>();

  const loading = fetcher.state !== "idle";
  const error = localError || fetcher.data?.error || null;

  // Close popover on success
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      toast(fetcher.data.toast || "Password changed");
      setConfirmPassword("");
      setRevokeOthers(false);
      setLocalError(null);
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Heading as="h4" title="Password" description="Change your account password." />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            Change password
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <fetcher.Form
              method="post"
              action="/account"
              onSubmit={(e) => {
                const form = e.currentTarget;
                const newPw = (form.elements.namedItem("newPassword") as HTMLInputElement)?.value;
                if (newPw !== confirmPassword) {
                  e.preventDefault();
                  setLocalError("Passwords do not match");
                  return;
                }
                setLocalError(null);
              }}
              className="flex flex-col gap-3"
            >
              <input type="hidden" name="intent" value="change-password" />
              <input type="hidden" name="revokeOthers" value={String(revokeOthers)} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="current-password" className="text-xs">
                  Current password
                </Label>
                <Input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-password" className="text-xs">
                  New password
                </Label>
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password" className="text-xs">
                  Confirm new password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={revokeOthers}
                  onCheckedChange={setRevokeOthers}
                  size="sm"
                />
                Sign out of all other devices
              </label>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <Button
                type="submit"
                size="sm"
                disabled={loading}
              >
                {loading ? "Changing..." : "Change password"}
              </Button>
            </fetcher.Form>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
